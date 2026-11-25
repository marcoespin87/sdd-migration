#!/usr/bin/env node
/*
 * Orquestador local del visualizador de migración SDD.
 *   node server.js [puerto]        (por defecto 4173)
 *
 * - Sirve index.html.
 * - Lee un repositorio git local (ramas, commits con trailers SDD-*, planes, specs).
 * - Ejecuta Claude Code en modo headless (claude -p) dentro del repo elegido,
 *   con las skills SDD, y retransmite lo que hace (texto, herramientas, skills) por SSE.
 * - Los gates humanos detienen al agente; la página los muestra como botones y,
 *   al pulsarlos, reanuda la misma sesión con la decisión.
 *
 * Seguridad: escucha solo en 127.0.0.1, valida Host y Origin, no usa shell,
 * y bloquea push/pull/fetch/remote/gh para el agente. Sin dependencias.
 */
'use strict';
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');

const VERSION = 6; // súbelo cuando cambien las rutas del servidor; la página avisa si el servidor en marcha es más viejo
const PORT = Number(process.argv[2]) || 4173;
const HOST = '127.0.0.1';
const HERE = __dirname;
const OWN_SKILLS = path.resolve(HERE, '..', '.claude', 'skills');

/* ------------------------------------------------------------------ estado */
const S = {
  repo: null,          // ruta absoluta del repo elegido
  run: null,           // { proc, sessionId, mode, startedAt }
  status: 'idle',      // idle | running | waiting-gate | waiting-input | done | error
  gate: null,          // { name, what }
  phase: null,         // paso del ciclo detectado por la skill invocada
  history: [],         // últimos eventos (para quien se conecta tarde)
  approvals: [],       // decisiones tomadas desde la página
  edited: new Set(),   // archivos que la persona editó a mano desde el último mensaje al agente
  lastStateJson: '',
};
const clients = new Set();
let evId = 0;

function emit(type, data) {
  const ev = { id: ++evId, t: Date.now(), type, data };
  if (type !== 'state') { S.history.push(ev); if (S.history.length > 600) S.history.shift(); }
  const line = `id: ${ev.id}\nevent: ${type}\ndata: ${JSON.stringify(ev)}\n\n`;
  for (const c of clients) c.write(line);
}
function setStatus(status, extra = {}) {
  S.status = status;
  emit('status', { status, gate: S.gate, phase: S.phase, ...extra });
}

/* --------------------------------------------------------------------- git */
function git(args, cwd = S.repo) {
  return new Promise((resolve) => {
    execFile('git', ['-C', cwd, ...args], { maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout) =>
      resolve(err ? null : stdout));
  });
}
async function isGitRepo(p) {
  if (!p || !path.isAbsolute(p)) return false;
  try { if (!fs.statSync(p).isDirectory()) return false; } catch { return false; }
  const out = await git(['rev-parse', '--show-toplevel'], p);
  return !!out;
}
function readMaybe(f) { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } }

async function repoState() {
  if (!S.repo) return { repo: null };
  const [branchOut, curOut, logOut, statusOut] = await Promise.all([
    git(['branch', '--format=%(refname:short)']),
    git(['rev-parse', '--abbrev-ref', 'HEAD']),
    git(['log', '--all', '--max-count=120', '--date=format:%Y-%m-%d %H:%M',
      '--format=%h%x1f%ad%x1f%an%x1f%s%x1f%D%x1f%b%x1e']),
    git(['status', '--short']),
  ]);
  const commits = (logOut || '').split('\x1e').map((r) => r.trim()).filter(Boolean).map((r) => {
    const [hash, date, author, subject, refs, body] = r.split('\x1f');
    const trailers = {};
    for (const l of (body || '').split('\n')) {
      const m = /^(SDD-[A-Za-z]+):\s*(.+)$/.exec(l.trim());
      if (m) trailers[m[1]] = m[2];
    }
    return { hash, date, author, subject, refs: refs || '', trailers, isMerge: /^merge/i.test(subject) };
  });

  // planes y specs
  const docs = path.join(S.repo, 'docs');
  const plans = [], specs = [];
  try {
    for (const f of fs.readdirSync(docs)) {
      if (/^plan-.*\.md$/.test(f)) {
        const t = readMaybe(path.join(docs, f)) || '';
        const caIds = new Set(t.match(/\*\*CA-\d+\*\*/g) || []);
        const traza = t.split('\n').filter((l) => /^\|\s*CA-\d+\s*\|/.test(l));
        const caOk = traza.filter((l) => /✅/.test(l)).length;
        plans.push({
          file: f,
          estado: (/\*\*Estado:\*\*\s*([^\n·]+)/.exec(t) || [])[1]?.trim() || null,
          caso: (/\*\*Caso:\*\*\s*([^\n·]+)/.exec(t) || [])[1]?.trim() || null,
          tasksDone: (t.match(/^- \[x\]/gim) || []).length,
          tasksTotal: (t.match(/^- \[[ x]\]/gim) || []).length,
          caTotal: Math.max(caIds.size, traza.length), caOk,
        });
      }
    }
    const sd = path.join(docs, 'specs');
    for (const f of fs.readdirSync(sd)) {
      if (/^spec-.*\.md$/.test(f)) {
        const t = readMaybe(path.join(sd, f)) || '';
        specs.push({ file: f, estado: (/\*\*Estado:\*\*\s*([^·\n]+)/.exec(t) || [])[1]?.trim() || null });
      }
    }
  } catch { /* sin docs/ todavía */ }

  const hasSkills = fs.existsSync(path.join(S.repo, '.claude', 'skills', 'sdd-exploracion', 'SKILL.md'));
  return {
    repo: S.repo,
    current: (curOut || '').trim(),
    branches: (branchOut || '').split('\n').map((s) => s.trim()).filter(Boolean),
    dirty: (statusOut || '').split('\n').filter(Boolean).length,
    commits, plans, specs, hasSkills,
  };
}

/* ----------------------------------------------------------- agente (claude) */
// Se usa la sesión iniciada con "claude auth login" (suscripción). Se quitan las claves de API del entorno
// para que Claude Code no cobre contra una API key por accidente.
function claudeEnv() { const e = { ...process.env }; delete e.ANTHROPIC_API_KEY; delete e.ANTHROPIC_AUTH_TOKEN; delete e.OPENAI_API_KEY; return e; }
function claudeStatus() {
  return new Promise((resolve) => {
    if (process.env.CLAUDE_BIN) return resolve({ installed: true, loggedIn: true, authMethod: 'prueba' });
    execFile('claude', ['auth', 'status'], { timeout: 20000, windowsHide: true, env: claudeEnv() }, (err, so) => {
      if (err && err.code === 'ENOENT') return resolve({ installed: false, loggedIn: false });
      let j = null; try { j = JSON.parse(String(so || '')); } catch { /* texto */ }
      resolve({ installed: true, loggedIn: !!(j && j.loggedIn), authMethod: (j && j.authMethod) || null,
        plan: (j && (j.subscriptionType || j.plan)) || null });
    });
  });
}
const SKILL_TO_PHASE = {
  'sdd-estado': 'estado', 'sdd-exploracion': 'expl', 'sdd-propuesta': 'prop', 'sdd-aplicacion': 'apl',
  'sdd-verificacion': 'ver', 'sdd-entrega': 'ent', 'sdd-hotfix': 'ver', 'sdd-arquitectura': 'prop', 'sdd-ramas': 'prop',
};

const PROTOCOL = `
PROTOCOLO DEL VISUALIZADOR (obligatorio):
- Trabajas únicamente en el repositorio local. Nunca git push/pull/fetch/remote ni gh.
- Usa las skills SDD de .claude/skills (sdd-estado, sdd-exploracion, sdd-propuesta, sdd-aplicacion, sdd-verificacion) en ese orden.
- Un humano aprueba en una página web. Cuando llegues a un gate humano (confirmar Caso y alcance, Gate 1 de propuesta, ajuste de spec, Gate 2 de verificación, cualquier merge, tag o acción destructiva), DETÉN tu turno: termina tu mensaje con UNA última línea exacta con este formato y no continúes hasta recibir la decisión:
GATE|<nombre corto del gate>|<qué se pide aprobar, en una frase>
- Antes del gate, muestra en el mensaje el diff del spec, los criterios o el reporte que se aprueba.
- Cuando recibas "APROBADO: <comentario>", continúa y cita esa aprobación en el trailer --aprobado de sdd-git.sh.
- Cuando recibas "CAMBIOS SOLICITADOS: <texto>", NO avances: aplica los cambios, actualiza el spec (docs/specs), los criterios CA-NN y el plan (docs/plan-*) para que sean coherentes, y vuelve a presentar el MISMO gate con una línea GATE|… al final.
- Cuando recibas "RECHAZADO: <motivo>", descarta lo propuesto, corrige según el motivo y vuelve a pedir el gate.
- Si el mensaje dice que la persona editó archivos a mano, léelos de nuevo y respeta sus cambios.
- NO simules resultados: ejecuta los comandos de verdad. Si un comando falla, muestra el error tal cual y corrígelo. Para ver el estado ejecuta: bash .claude/skills/_shared/scripts/sdd-estado.sh
- Si pides un gate, NO escribas FIN en el mismo mensaje. Al terminar toda la tarea sin más gates, termina con la línea: FIN|<resumen de una frase>.
`;

const ALLOWED = [
  'Read', 'Glob', 'Grep', 'Skill', 'Edit', 'Write',
  'Bash(git:*)', 'Bash(bash:*)', 'Bash(sh:*)', 'Bash(node:*)', 'Bash(npm:*)', 'Bash(npx:*)', 'Bash(ng:*)',
  'Bash(ls:*)', 'Bash(cat:*)', 'Bash(grep:*)', 'Bash(head:*)', 'Bash(mkdir:*)', 'Bash(.claude/skills/_shared/scripts/*)',
];
const DENIED = [
  'Bash(git push:*)', 'Bash(git pull:*)', 'Bash(git fetch:*)', 'Bash(git remote:*)', 'Bash(git clone:*)',
  'Bash(git reset --hard:*)', 'Bash(git clean:*)', 'Bash(gh:*)', 'Bash(curl:*)', 'Bash(wget:*)', 'Bash(rm -rf:*)',
];

function summarizeTool(name, input) {
  input = input || {};
  switch (name) {
    case 'Bash': return String(input.command || '').slice(0, 300);
    case 'Read': case 'Edit': case 'Write': return String(input.file_path || '');
    case 'Glob': return String(input.pattern || '');
    case 'Grep': return String(input.pattern || '');
    case 'Skill': return String(input.skill || '');
    default: return JSON.stringify(input).slice(0, 200);
  }
}

function runClaude(prompt, { mode, resume, model }) {
  const args = ['-p', '--output-format', 'stream-json', '--verbose',
    '--permission-mode', mode === 'plan' ? 'plan' : 'acceptEdits',
    '--append-system-prompt', PROTOCOL,
    '--allowedTools', ...ALLOWED, '--disallowedTools', ...DENIED];
  if (resume) args.push('--resume', resume);
  if (model) args.push('--model', model);

  const bin = process.env.CLAUDE_BIN || 'claude';
  const pre = process.env.CLAUDE_PREFIX ? [process.env.CLAUDE_PREFIX] : []; // solo para pruebas
  const proc = spawn(bin, [...pre, ...args], { cwd: S.repo, env: claudeEnv(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  S.run = { proc, sessionId: resume || null, mode, model, provider: 'claude', startedAt: Date.now() };
  proc.stdin.end(prompt);

  let buf = '', lastText = '', stderr = '';
  const toolNames = new Map(); // tool_use_id -> nombre
  const onLine = (line) => {
    let m; try { m = JSON.parse(line); } catch { return; }
    if (m.session_id && S.run) S.run.sessionId = m.session_id;
    if (m.type === 'system' && m.subtype === 'init') {
      emit('agent', { kind: 'init', model: m.model, tools: (m.tools || []).length, sessionId: m.session_id });
    } else if (m.type === 'assistant') {
      for (const b of (m.message && m.message.content) || []) {
        if (b.type === 'text' && b.text && b.text.trim()) {
          lastText = b.text;
          emit('agent', { kind: 'text', text: b.text });
        } else if (b.type === 'tool_use') {
          toolNames.set(b.id, b.name);
          if (b.name === 'Skill' && b.input && SKILL_TO_PHASE[b.input.skill]) {
            S.phase = SKILL_TO_PHASE[b.input.skill];
            emit('status', { status: S.status, gate: S.gate, phase: S.phase, skill: b.input.skill });
          }
          emit('agent', { kind: 'tool', id: b.id, name: b.name, summary: summarizeTool(b.name, b.input) });
        }
      }
    } else if (m.type === 'user') {
      for (const b of (m.message && m.message.content) || []) {
        if (b.type === 'tool_result') {
          let out = b.content;
          if (Array.isArray(out)) out = out.map((x) => x.text || '').join('\n');
          emit('agent', { kind: 'tool_result', id: b.tool_use_id, name: toolNames.get(b.tool_use_id) || '',
            isError: !!b.is_error, output: String(out || '').slice(0, 2500) });
        }
      }
    } else if (m.type === 'result') {
      emit('agent', { kind: 'result', ok: !m.is_error, turns: m.num_turns, cost: m.total_cost_usd,
        ms: m.duration_ms });
    }
  };
  proc.stdout.on('data', (d) => {
    buf += d.toString('utf8');
    let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) onLine(l); }
  });
  proc.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
  proc.on('error', (e) => {
    S.run = null; setStatus('error', { message: `No se pudo iniciar "claude": ${e.message}` });
  });
  proc.on('close', (code, signal) => {
    if (buf.trim()) onLine(buf.trim());
    const killed = signal || S.status === 'idle';
    S.run = S.run && S.run.sessionId ? { ...S.run, proc: null } : null;
    if (killed && S.status === 'idle') return;
    if (code !== 0 && !lastText) {
      return setStatus('error', { message: (stderr || `claude terminó con código ${code}`).slice(0, 600) });
    }
    finishTurn(lastText);
  });
}

/* Fin de turno (común a los dos proveedores): decide si hay gate, fin o espera. */
function finishTurn(lastText) {
  const lines = String(lastText || '').trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const tail = lines.slice(-8).reverse();
  // Un GATE siempre gana sobre un FIN: si el modelo escribe los dos, hay algo por aprobar.
  const gl = tail.find((l) => /^GATE\|/.test(l));
  const fl = tail.find((l) => /^FIN\|/.test(l));
  const clean = (s) => String(s).replace(/[>"'`]+$/, '').trim();
  if (gl) {
    const parts = gl.split('|');
    S.gate = { name: clean(parts[1] || 'Aprobación'), what: clean(parts.slice(2).join('|') || 'Revisa lo que propone el agente y decide.') };
    setStatus('waiting-gate');
  } else if (fl) {
    S.gate = null; setStatus('done', { summary: clean(fl.slice(4)) });
  } else {
    S.gate = null; setStatus('waiting-input');
  }
  refreshState(true);
}
const busy = () => !!(S.run && (S.run.proc || S.run.busy));

/* ------------------------------------------- agente con API compatible con OpenAI */
// La clave vive solo en memoria (S.run.cfg); nunca se emite al navegador ni se escribe a disco.
function endpointFor(baseUrl) {
  const u = new URL(baseUrl);
  if (!/\/chat\/completions\/?$/.test(u.pathname)) u.pathname = u.pathname.replace(/\/+$/, '') + '/chat/completions';
  return u;
}
function validateCfg(c) {
  if (!c || !c.apiKey) throw new Error('Falta la API key (en la página o en la variable OPENAI_API_KEY).');
  if (!c.model) throw new Error('Falta el modelo.');
  let u; try { u = endpointFor(c.baseUrl); } catch { throw new Error('La URL del endpoint no es válida.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) {
    throw new Error('El endpoint debe ser https (http solo se permite en localhost).');
  }
  return u;
}
const TLS12_HOSTS = new Set();
function postJson(u, headers, bodyStr, signal, tls12) {
  return new Promise((resolve, reject) => {
    const lib = u.protocol === 'https:' ? https : http;
    const opts = { method: 'POST', hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search,
      headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) }, timeout: 300000 };
    if (tls12 && u.protocol === 'https:') opts.maxVersion = 'TLSv1.2';
    const q = lib.request(opts, (r) => {
      const ch = []; r.on('data', (d) => ch.push(d));
      r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, text: Buffer.concat(ch).toString('utf8') }));
      r.on('error', reject);
    });
    q.on('error', reject);
    q.on('timeout', () => q.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    if (signal) {
      const onAbort = () => q.destroy(Object.assign(new Error('abortado'), { name: 'AbortError' }));
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }
    q.end(bodyStr);
  });
}
function explainNet(e, u) {
  const code = e.code || '';
  const hint = {
    ENOTFOUND: 'el nombre del host no se resuelve (revisa la URL, la VPN o el DNS)',
    ECONNREFUSED: 'el servidor rechazó la conexión (revisa host y puerto)',
    ETIMEDOUT: 'tiempo de espera agotado (firewall, VPN o proxy corporativo)',
    ECONNRESET: 'la conexión fue cortada, incluso con TLS 1.2 (firewall o proxy corporativo; ¿hace falta VPN o una IP autorizada en el recurso de Azure?)',
    EPROTO: 'falló el handshake TLS',
    CERT_HAS_EXPIRED: 'certificado vencido', DEPTH_ZERO_SELF_SIGNED_CERT: 'certificado autofirmado (proxy con inspección TLS: inicia con node --use-system-ca o define NODE_EXTRA_CA_CERTS)',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'certificado no confiable (proxy con inspección TLS: inicia con node --use-system-ca o define NODE_EXTRA_CA_CERTS)',
    SELF_SIGNED_CERT_IN_CHAIN: 'certificado no confiable (proxy con inspección TLS: inicia con node --use-system-ca o define NODE_EXTRA_CA_CERTS)',
  }[code] || e.message;
  return `No se pudo conectar a ${u.hostname} (${code || 'error'}): ${hint}.`;
}

const sleepMs = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  if (signal) signal.addEventListener('abort', () => { clearTimeout(t); rej(Object.assign(new Error('abortado'), { name: 'AbortError' })); }, { once: true });
});
async function oaiChat(c, body, signal, onRetry) {
  const u = validateCfg(c);
  const headers = { 'Content-Type': 'application/json' };
  if (/azure/i.test(u.hostname)) headers['api-key'] = c.apiKey; else headers.Authorization = `Bearer ${c.apiKey}`;
  const payload = JSON.stringify({ model: c.model, ...body });
  let res;
  for (let attempt = 0; ; attempt++) {
  try {
    // Algunas redes/firewalls cortan TLS 1.3 hacia ciertos hosts (ECONNRESET). Se recuerda el host y se reintenta en TLS 1.2.
    try { res = await postJson(u, headers, payload, signal, TLS12_HOSTS.has(u.hostname)); }
    catch (e) {
      if (e.name === 'AbortError' || u.protocol !== 'https:' || TLS12_HOSTS.has(u.hostname) || !/^(ECONNRESET|EPROTO|ECONNABORTED)$/.test(e.code || '')) throw e;
      res = await postJson(u, headers, payload, signal, true); TLS12_HOSTS.add(u.hostname);
    }
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error(explainNet(e, u));
  }
    // Límite de tokens/solicitudes del proveedor: se espera y se reintenta en vez de abortar la migración.
    if ((res.status === 429 || res.status === 503) && onRetry && attempt < 6) {
      const h = res.headers || {};
      let wait = Number(h['retry-after-ms']) / 1000 || Number(h['retry-after']) || 0;
      if (!wait) { const m = /retry after (\d+)/i.exec(res.text); wait = m ? Number(m[1]) : 20 * (attempt + 1); }
      wait = Math.min(Math.max(Math.ceil(wait), 5), 90);
      onRetry(wait, res.status, attempt + 1);
      await sleepMs(wait * 1000, signal);
      continue;
    }
    break;
  }
  const txt = res.text;
  let j = null; try { j = JSON.parse(txt); } catch { /* no JSON */ }
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}: ${((j && j.error && j.error.message) || txt).slice(0, 400)}`);
  if (!j || !j.choices || !j.choices[0]) throw new Error('Respuesta inesperada del endpoint (sin "choices").');
  return j;
}

const SYS_OPENAI = PROTOCOL + `
HERRAMIENTAS (tú no tienes Skills nativas, usa estas):
- skill(name): carga las instrucciones de una skill SDD (p. ej. sdd-estado, sdd-exploracion, sdd-propuesta, sdd-aplicacion, sdd-verificacion). Léelas y síguelas al pie de la letra. Sus archivos de apoyo están en .claude/skills/<skill>/references/ y .claude/skills/_shared/ (léelos con read_file).
- read_file, list_files, grep: leer el repo. write_file: crear o reemplazar un archivo completo.
- run_command(command, args[]): git, node, npm, npx, ng, y bash/sh solo para scripts de .claude/skills/_shared/scripts/. Sin shell: pasa cada argumento por separado. Toda escritura en git del ciclo SDD se hace con .claude/skills/_shared/scripts/sdd-git.sh.
- Haz una tarea a la vez y verifica la salida de cada comando antes de seguir.
`;

function toolDefs(mode) {
  const f = (name, description, properties, required) => ({ type: 'function', function: { name, description,
    parameters: { type: 'object', properties, required, additionalProperties: false } } });
  const defs = [
    f('skill', 'Carga las instrucciones de una skill SDD.', { name: { type: 'string' } }, ['name']),
    f('read_file', 'Lee un archivo de texto del repositorio.', { path: { type: 'string' } }, ['path']),
    f('list_files', 'Lista archivos del repositorio (recursivo, hasta 4 niveles).', { dir: { type: 'string' } }, []),
    f('grep', 'Busca una expresión regular en los archivos del repositorio.', { pattern: { type: 'string' }, dir: { type: 'string' } }, ['pattern']),
    f('run_command', 'Ejecuta un comando permitido sin shell.', { command: { type: 'string' }, args: { type: 'array', items: { type: 'string' } } }, ['command']),
  ];
  if (mode !== 'plan') defs.push(f('write_file', 'Crea o reemplaza un archivo completo.', { path: { type: 'string' }, content: { type: 'string' } }, ['path', 'content']));
  return defs;
}

function inRepo(p) {
  const abs = path.resolve(S.repo, String(p || '.'));
  const rel = path.relative(S.repo, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Ruta fuera del repositorio.');
  if (rel.split(path.sep)[0] === '.git') throw new Error('No se permite acceder a .git directamente.');
  return abs;
}
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.angular', 'target', 'build', '.next']);
function walk(dir, depth, out, cap = 400) {
  if (depth < 0 || out.length >= cap) return;
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (out.length >= cap) return;
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), depth - 1, out, cap); }
    else out.push(path.relative(S.repo, path.join(dir, e.name)).split(path.sep).join('/'));
  }
}
const GIT_READONLY = new Set(['status', 'log', 'diff', 'show', 'branch', 'rev-parse', 'ls-files', 'blame', 'shortlog']);
const GIT_DENY = new Set(['push', 'pull', 'fetch', 'remote', 'clone', 'clean', 'gc', 'filter-branch', 'update-ref', 'submodule', 'config', 'worktree']);
const SAFE_ARG = /^[\w@./:=+,\\-]+$/;

let BASH_CACHE = null;
async function resolveBash() {
  if (BASH_CACHE) return BASH_CACHE;
  const c = [];
  const ep = ((await git(['--exec-path'], process.cwd())) || '').trim();
  if (ep) c.push(path.resolve(ep, '..', '..', '..', 'bin', 'bash.exe'), path.resolve(ep, '..', '..', '..', 'usr', 'bin', 'bash.exe'));
  c.push('C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files (x86)\\Git\\bin\\bash.exe', 'C:\\Program Files\\Git\\usr\\bin\\bash.exe');
  BASH_CACHE = c.find((p) => fs.existsSync(p)) || 'bash';
  return BASH_CACHE;
}
async function runCommand(command, args, mode) {
  const bash = process.platform === 'win32' ? await resolveBash() : 'bash';
  return runCommandInner(command, args, mode, bash);
}
function runCommandInner(command, args, mode, bashBin) {
  return new Promise((resolve) => {
    args = Array.isArray(args) ? args.map(String) : [];
    // Tolerancia: algunos modelos mandan toda la línea en "command" ("bash ./x.sh"). Se separa y se valida igual.
    if (/\s/.test(command.trim()) && !args.length) {
      const parts = command.trim().match(/"[^"]*"|'[^']*'|\S+/g) || [];
      command = parts[0]; args = parts.slice(1).map((s) => s.replace(/^["']|["']$/g, ''));
    }
    // Tolerancia: pasar solo la ruta del script ("./.claude/.../sdd-estado.sh") equivale a "bash <ruta>".
    if (/\.sh$/.test(command) && !args.length) { args = [command]; command = 'bash'; }
    if (command === 'sh') command = 'bash';
    const fail = (m) => resolve({ isError: true, out: m });
    if (!['git', 'node', 'npm', 'npx', 'ng', 'bash', 'sh'].includes(command)) return fail(`Comando no permitido: ${command}`);
    if (command === 'git') {
      const sub = args.find((a) => !a.startsWith('-')) || '';
      if (GIT_DENY.has(sub)) return fail(`git ${sub} no está permitido (el ciclo SDD es solo local).`);
      if (sub === 'reset' && args.includes('--hard')) return fail('git reset --hard no está permitido.');
      if (mode === 'plan' && !GIT_READONLY.has(sub)) return fail('En modo solo lectura únicamente git de consulta.');
    } else if (command === 'bash' || command === 'sh') {
      const script = args[0] ? path.relative(S.repo, path.resolve(S.repo, args[0])).split(path.sep).join('/') : '';
      if (!script.startsWith('.claude/skills/_shared/scripts/') || script.includes('..')) return fail('bash/sh solo ejecuta scripts de .claude/skills/_shared/scripts/.');
      if (mode === 'plan' && !/sdd-(estado|lint)\.sh$/.test(script)) return fail('En modo solo lectura solo se permiten sdd-estado.sh y sdd-lint.sh.');
    } else {
      if (mode === 'plan') return fail('En modo solo lectura no se ejecutan node/npm/npx/ng.');
      if (command === 'npm' && /^(publish|login|adduser|token|owner|access)$/.test(args[0] || '')) return fail(`npm ${args[0]} no está permitido.`);
    }
    // En Windows npm/npx/ng son .cmd y necesitan shell: solo con argumentos sin metacaracteres.
    const needShell = process.platform === 'win32' && ['npm', 'npx', 'ng'].includes(command);
    if (needShell && !args.every((a) => SAFE_ARG.test(a))) return fail('Argumento con caracteres no permitidos para npm/npx/ng en Windows (sin espacios ni comillas).');
    const env = { ...process.env }; delete env.OPENAI_API_KEY; delete env.ANTHROPIC_API_KEY;
    const proc = spawn(command === 'bash' ? bashBin : command, args, { cwd: S.repo, env, windowsHide: true, shell: needShell });
    let out = ''; const add = (d) => { out += d.toString('utf8'); if (out.length > 60000) out = out.slice(-30000); };
    proc.stdout.on('data', add); proc.stderr.on('data', add);
    const to = setTimeout(() => proc.kill(), 300000);
    S.run && (S.run.child = proc);
    proc.on('error', (e) => { clearTimeout(to); fail(`No se pudo ejecutar ${command}: ${e.message}`); });
    proc.on('close', (code) => { clearTimeout(to); resolve({ isError: code !== 0, out: `${out.trim() || '(sin salida)'}\n[código de salida ${code}]` }); });
  });
}

async function execTool(name, a, mode) {
  try {
    if (name === 'skill') {
      const n = String(a.name || '');
      if (!/^sdd-[a-z-]+$/.test(n)) throw new Error('Nombre de skill inválido.');
      const p = inRepo(`.claude/skills/${n}/SKILL.md`);
      if (!fs.existsSync(p)) throw new Error(`No existe la skill ${n} en este repo (¿copiaste las skills SDD?).`);
      return { out: fs.readFileSync(p, 'utf8').slice(0, 30000) };
    }
    if (name === 'read_file') {
      const p = inRepo(a.path); const st = fs.statSync(p);
      if (!st.isFile()) throw new Error('No es un archivo.');
      return { out: fs.readFileSync(p, 'utf8').slice(0, 24000) + (st.size > 24000 ? '\n[… truncado]' : '') };
    }
    if (name === 'list_files') { const out = []; walk(inRepo(a.dir || '.'), 4, out); return { out: out.join('\n') || '(vacío)' }; }
    if (name === 'grep') {
      let re; try { re = new RegExp(String(a.pattern), 'i'); } catch { throw new Error('Expresión regular inválida.'); }
      const files = []; walk(inRepo(a.dir || '.'), 6, files, 2000); const hits = [];
      for (const rel of files) {
        if (hits.length >= 80) break;
        let t; try { const ab = path.join(S.repo, rel); if (fs.statSync(ab).size > 300000) continue; t = fs.readFileSync(ab, 'utf8'); } catch { continue; }
        t.split('\n').forEach((l, i) => { if (hits.length < 80 && re.test(l)) hits.push(`${rel}:${i + 1}: ${l.trim().slice(0, 200)}`); });
      }
      return { out: hits.join('\n') || '(sin coincidencias)' };
    }
    if (name === 'write_file') {
      if (mode === 'plan') throw new Error('Modo solo lectura: no se puede escribir.');
      const p = inRepo(a.path); fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, String(a.content ?? ''), 'utf8'); return { out: `Escrito ${a.path} (${String(a.content ?? '').length} caracteres).` };
    }
    if (name === 'run_command') return await runCommand(String(a.command || ''), a.args, mode);
    throw new Error(`Herramienta desconocida: ${name}`);
  } catch (e) { return { isError: true, out: e.message }; }
}

// Cada llamada reenvía todo el historial; se recortan las salidas de herramientas viejas para no agotar el cupo de tokens.
function compactHistory(msgs) {
  const keepFrom = Math.max(0, msgs.length - 8);
  for (let i = 0; i < keepFrom; i++) {
    const m = msgs[i];
    if (m.role === 'tool' && typeof m.content === 'string' && m.content.length > 1200) {
      m.content = m.content.slice(0, 1200) + '\n[… recortado para ahorrar tokens; vuelve a leer el archivo o a cargar la skill si lo necesitas]';
    }
  }
}
async function runOpenAI(userMsg) {
  const run = S.run; run.busy = true; run.abort = new AbortController();
  run.messages.push({ role: 'user', content: userMsg });
  let lastText = '', turns = 0;
  try {
    for (let i = 0; i < 80; i++) {
      compactHistory(run.messages);
      const r = await oaiChat(run.cfg, { messages: run.messages, tools: toolDefs(run.mode), tool_choice: 'auto' }, run.abort.signal,
        (sec, code, n) => emit('agent', { kind: 'note', text: `El proveedor devolvió ${code} (límite de tokens o solicitudes). Reintento ${n} en ${sec} s…` }));
      turns++; run.tokens = (run.tokens || 0) + ((r.usage && r.usage.total_tokens) || 0);
      const msg = r.choices[0].message || {};
      run.messages.push({ role: 'assistant', content: msg.content ?? null, ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}) });
      if (msg.content && msg.content.trim()) { lastText = msg.content; emit('agent', { kind: 'text', text: msg.content }); }
      if (!msg.tool_calls || !msg.tool_calls.length) break;
      for (const tc of msg.tool_calls) {
        let args = {}; try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* args vacíos */ }
        const name = tc.function.name;
        if (name === 'skill' && SKILL_TO_PHASE[args.name]) {
          S.phase = SKILL_TO_PHASE[args.name];
          emit('status', { status: S.status, gate: S.gate, phase: S.phase, skill: args.name });
        }
        const summary = name === 'run_command' ? `${args.command || ''} ${(args.args || []).join(' ')}`.trim()
          : name === 'skill' ? String(args.name || '') : String(args.path || args.pattern || args.dir || '');
        emit('agent', { kind: 'tool', id: tc.id, name: name === 'skill' ? 'Skill' : name === 'run_command' ? 'Bash' : name, summary: summary.slice(0, 300) });
        const res = await execTool(name, args, run.mode);
        if (run.abort.signal.aborted) throw Object.assign(new Error('abort'), { name: 'AbortError' });
        run.messages.push({ role: 'tool', tool_call_id: tc.id, content: String(res.out).slice(0, 8000) });
        emit('agent', { kind: 'tool_result', id: tc.id, name, isError: !!res.isError, output: String(res.out).slice(0, 2500) });
      }
    }
    emit('agent', { kind: 'result', ok: true, turns, cost: null, ms: null, tokens: run.tokens });
  } catch (e) {
    run.busy = false;
    if (S.status === 'idle' || (e && e.name === 'AbortError')) return;
    return setStatus('error', { message: String(e.message || e).slice(0, 600) });
  }
  run.busy = false;
  finishTurn(lastText);
}

/* --------------------------------------------------------------- refresco */
async function refreshState(force) {
  if (!S.repo) return;
  const st = await repoState();
  const json = JSON.stringify(st);
  if (force || json !== S.lastStateJson) { S.lastStateJson = json; emit('state', st); }
}
setInterval(() => { if (clients.size && S.repo) refreshState(false); }, 2000);

/* -------------------------------------------------------------------- http */
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = ''; req.on('data', (c) => { d += c; if (d.length > 1e6) { reject(new Error('cuerpo muy grande')); req.destroy(); } });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
  });
}
function hostOk(req) {
  const h = (req.headers.host || '').toLowerCase();
  return h === `127.0.0.1:${PORT}` || h === `localhost:${PORT}`;
}
function originOk(req) {
  const o = req.headers.origin;
  return !o || o === `http://127.0.0.1:${PORT}` || o === `http://localhost:${PORT}`;
}

async function trunkName() {
  const cfg = ((await git(['config', 'sdd.tronco'])) || '').trim();
  for (const b of [cfg, 'main', 'master', 'develop']) {
    if (b && (await git(['rev-parse', '--verify', '--quiet', b]))) return b;
  }
  return '';
}
async function reviewFiles() {
  const map = new Map();
  const trunk = await trunkName();
  const cur = ((await git(['rev-parse', '--abbrev-ref', 'HEAD'])) || '').trim();
  // commits de la rama del cambio respecto al tronco
  if (trunk && cur && cur !== trunk) {
    for (const l of ((await git(['diff', '--name-status', `${trunk}...HEAD`])) || '').split('\n').filter(Boolean)) {
      const [st, ...rest] = l.split('\t'); const f = rest[rest.length - 1];
      if (f && !f.startsWith('.claude/')) map.set(f, st[0] === 'A' ? 'nuevo' : st[0] === 'D' ? 'borrado' : 'modificado');
    }
  }
  // cambios sin commitear
  const st = (await git(['status', '--porcelain', '-z', '-uall'])) || '';
  for (const e of st.split('\0').filter(Boolean)) {
    const code = e.slice(0, 2), f = e.slice(3);
    if (!f || f.startsWith('.claude/')) continue;
    map.set(f, code.includes('?') || code.includes('A') ? 'nuevo' : code.includes('D') ? 'borrado' : 'modificado');
  }
  // documentos de docs/ (specs, plan, ADR, arquitectura)
  const docs = []; walk(path.join(S.repo, 'docs'), 3, docs, 200);
  for (const f of docs) if (/\.md$/i.test(f) && !map.has(f)) map.set(f, 'doc');
  const rank = { nuevo: 0, modificado: 1, doc: 2, borrado: 3 };
  return [...map.entries()].map(([p, kind]) => ({ path: p, kind, exists: fs.existsSync(path.join(S.repo, p)) }))
    .sort((a, b) => rank[a.kind] - rank[b.kind] || a.path.localeCompare(b.path)).slice(0, 150);
}

// Agrega ".claude/" a .git/info/exclude (archivo local, nunca se versiona) cuando las skills están copiadas
// pero no forman parte del repo. Devuelve true si escribió la regla.
async function ensureClaudeIgnored() {
  try {
    if (!S.repo || !fs.existsSync(path.join(S.repo, '.claude'))) return false;
    if (((await git(['ls-files', '--', '.claude'])) || '').trim()) return false; // ya está versionado: es del proyecto
    const ex = path.join(S.repo, '.git', 'info', 'exclude');
    const cur = readMaybe(ex) || '';
    if (/^\/?\.claude\/?\s*$/m.test(cur)) return false;
    fs.mkdirSync(path.dirname(ex), { recursive: true });
    fs.appendFileSync(ex, (cur && !cur.endsWith('\n') ? '\n' : '') + '.claude/\n');
    return true;
  } catch { return false; }
}

async function connectRepo(p) {
  S.repo = path.resolve(p); S.history = []; S.approvals = []; S.gate = null; S.phase = null; S.status = 'idle';
  S.run = null; S.lastStateJson = ''; S.edited.clear();
  emit('reset', { repo: S.repo });
  await refreshState(true);
}

function listDirs(p) {
  const win = process.platform === 'win32';
  if (!p) {
    const home = require('node:os').homedir();
    const drives = win ? 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => `${l}:\\`).filter((d) => fs.existsSync(d)) : ['/'];
    return { path: '', parent: null, home, drives, dirs: [] };
  }
  const abs = path.resolve(p);
  let ents;
  try { ents = fs.readdirSync(abs, { withFileTypes: true }); } catch (e) { return { path: abs, parent: path.dirname(abs), error: 'No se puede leer esta carpeta.', dirs: [] }; }
  const dirs = ents.filter((e) => e.isDirectory() && !e.name.startsWith('$') && e.name !== 'node_modules')
    .map((e) => ({ name: e.name, isGit: fs.existsSync(path.join(abs, e.name, '.git')) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const parent = path.dirname(abs) === abs ? '' : path.dirname(abs);
  return { path: abs, parent, isGit: fs.existsSync(path.join(abs, '.git')), dirs };
}

function runGit(args, cwd, extra = {}) {
  return new Promise((resolve) => execFile('git', args, { cwd, maxBuffer: 32 * 1024 * 1024, timeout: 600000, windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...extra } },
  (err, so, se) => resolve({ ok: !err, out: String(so || ''), err: String(se || (err && err.message) || '') })));
}
const isGitUrl = (s) => /^(https:\/\/|ssh:\/\/|git@[\w.-]+:)/.test(s);
const within = (child, parent) => { const r = path.relative(parent, child); return !r.startsWith('..') && !path.isAbsolute(r); };

async function prepareCopy({ source, destParent, destName }) {
  source = String(source || '').trim(); destParent = String(destParent || '').trim(); destName = String(destName || '').trim();
  if (!source) throw new Error('Indica el origen (carpeta local o URL de git).');
  if (!destParent || !path.isAbsolute(destParent)) throw new Error('Elige la carpeta destino (ruta absoluta).');
  if (!fs.existsSync(destParent) || !fs.statSync(destParent).isDirectory()) throw new Error('La carpeta destino no existe.');
  if (!/^[\w][\w .-]{0,80}$/.test(destName)) throw new Error('El nombre de la carpeta solo puede tener letras, números, espacios, punto, guion y guion bajo.');
  const dest = path.join(destParent, destName);
  if (fs.existsSync(dest) && (!fs.statSync(dest).isDirectory() || fs.readdirSync(dest).length)) {
    throw new Error(`"${dest}" ya existe y no está vacía. Elige otro nombre.`);
  }
  if (isGitUrl(source)) {
    const r = await runGit(['clone', '--', source, dest], destParent);
    if (!r.ok) throw new Error(`No se pudo clonar: ${r.err.trim().slice(-400)}`);
  } else {
    if (!path.isAbsolute(source) || !fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      throw new Error('El origen debe ser una URL (https:// o git@…) o una carpeta local existente con ruta absoluta.');
    }
    const src = path.resolve(source);
    if (within(dest, src) || within(src, dest)) throw new Error('El destino no puede estar dentro del origen ni al revés.');
    if (await isGitRepo(src)) {
      const r = await runGit(['clone', '--no-hardlinks', '--', src, dest], destParent);
      if (!r.ok) throw new Error(`No se pudo copiar el repo: ${r.err.trim().slice(-400)}`);
    } else {
      fs.cpSync(src, dest, { recursive: true, filter: (s) => !/[\\/](node_modules|\.git|dist|\.angular)([\\/]|$)/.test(s) });
      const ident = (await runGit(['config', 'user.name'], dest)).out.trim() ? [] : ['-c', 'user.name=SDD Visualizador', '-c', 'user.email=sdd@localhost'];
      for (const a of [['init', '-q'], ['add', '-A'], [...ident, 'commit', '-q', '-m', 'chore: importar origen para migrar']]) {
        const r = await runGit(a, dest); if (!r.ok) throw new Error(`git ${a.filter((x) => !x.startsWith('-') && !x.includes('=') && x !== 'user.name' && x !== 'user.email').join(' ')} falló: ${r.err.trim().slice(-300)}`);
      }
    }
  }
  await runGit(['remote', 'remove', 'origin'], dest); // la copia no queda enlazada al origen
  return dest;
}

// Combina lo que manda la página con las variables de entorno (OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL).
function resolveOpenAI(o) {
  o = o || {};
  return {
    baseUrl: String(o.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim(),
    apiKey: String(o.apiKey || process.env.OPENAI_API_KEY || '').trim(),
    model: String(o.model || process.env.OPENAI_MODEL || 'gpt-5-nano').trim(),
  };
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else if (!fs.existsSync(d)) fs.copyFileSync(s, d);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (!hostOk(req) || !originOk(req)) return send(res, 403, { error: 'origen no permitido' });
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return send(res, 200, fs.readFileSync(path.join(HERE, 'index.html')), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/ping') {
      return send(res, 200, { ok: true, version: VERSION, repo: S.repo, status: S.status, hasClaude: true, ownSkills: fs.existsSync(OWN_SKILLS),
        openai: { envKey: !!process.env.OPENAI_API_KEY, baseUrl: process.env.OPENAI_BASE_URL || '', model: process.env.OPENAI_MODEL || '' } });
    }
    if (req.method === 'GET' && url.pathname === '/api/claude-status') {
      return send(res, 200, await claudeStatus());
    }
    if (req.method === 'POST' && url.pathname === '/api/test-provider') {
      const b = await readBody(req);
      const cfg = resolveOpenAI(b.openai);
      try {
        const j = await oaiChat(cfg, { messages: [{ role: 'user', content: 'Responde solo: ok' }] });
        return send(res, 200, { ok: true, model: j.model || cfg.model, tokens: (j.usage && j.usage.total_tokens) || null });
      } catch (e) { return send(res, 400, { error: String(e.message || e).slice(0, 500) }); }
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 2000\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      emit('hello', { history: S.history.slice(-300).filter((e) => e.type !== 'hello'), status: S.status, gate: S.gate,
        phase: S.phase, repo: S.repo, approvals: S.approvals });
      if (S.repo) refreshState(true);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/repo') {
      const { path: p } = await readBody(req);
      if (busy()) return send(res, 409, { error: 'hay una ejecución en curso' });
      if (!(await isGitRepo(p))) return send(res, 400, { error: 'La ruta debe ser absoluta y ser un repositorio git existente.' });
      await connectRepo(p);
      return send(res, 200, { ok: true, repo: S.repo });
    }
    // Explorador de carpetas del servidor (solo nombres de carpetas, nunca contenido de archivos).
    if (req.method === 'GET' && url.pathname === '/api/fs') {
      return send(res, 200, listDirs(url.searchParams.get('path') || ''));
    }
    // Archivos que el agente creó o cambió + documentos de docs/, para revisarlos y editarlos desde la página.
    if (req.method === 'GET' && url.pathname === '/api/docs') {
      if (!S.repo) return send(res, 200, { files: [] });
      return send(res, 200, { files: await reviewFiles() });
    }
    if (req.method === 'GET' && url.pathname === '/api/file') {
      if (!S.repo) return send(res, 400, { error: 'elige un repo primero' });
      try {
        const rel = String(url.searchParams.get('path') || '');
        const abs = inRepo(rel);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return send(res, 404, { error: 'No existe ese archivo.' });
        if (fs.statSync(abs).size > 400000) return send(res, 400, { error: 'Archivo demasiado grande para editarlo aquí.' });
        const content = fs.readFileSync(abs, 'utf8');
        if (content.includes('\u0000')) return send(res, 400, { error: 'Archivo binario.' });
        const trunk = await trunkName(); const cur = ((await git(['rev-parse', '--abbrev-ref', 'HEAD'])) || '').trim();
        const relUnix = rel.split(path.sep).join('/');
        let diff = (await git(['diff', 'HEAD', '--', relUnix])) || '';
        if (!diff && trunk && cur && cur !== trunk) diff = (await git(['diff', `${trunk}...HEAD`, '--', relUnix])) || '';
        return send(res, 200, { path: relUnix, content, diff });
      } catch (e) { return send(res, 400, { error: e.message }); }
    }
    if (req.method === 'POST' && url.pathname === '/api/file') {
      if (!S.repo) return send(res, 400, { error: 'elige un repo primero' });
      const { path: rel, content } = await readBody(req);
      try {
        if (typeof content !== 'string' || content.length > 1000000) throw new Error('Contenido inválido o demasiado grande.');
        const abs = inRepo(rel);
        if (!fs.existsSync(abs)) throw new Error('Solo se pueden editar archivos que ya existen.');
        fs.writeFileSync(abs, content, 'utf8');
        const relUnix = String(rel).split(path.sep).join('/');
        S.edited.add(relUnix);
        const rec = { t: Date.now(), gate: 'Edición manual', decision: 'edit', comment: relUnix }; S.approvals.push(rec); emit('approval', rec);
        refreshState(true);
        return send(res, 200, { ok: true });
      } catch (e) { return send(res, 400, { error: e.message }); }
    }
    if (req.method === 'POST' && url.pathname === '/api/mkdir') {
      const { parent, name } = await readBody(req);
      if (!path.isAbsolute(String(parent || '')) || !fs.existsSync(parent)) return send(res, 400, { error: 'Carpeta base inválida.' });
      if (!/^[\w][\w .-]{0,80}$/.test(String(name || ''))) return send(res, 400, { error: 'Nombre inválido (letras, números, espacios, punto, guion).' });
      const d = path.join(parent, name);
      if (fs.existsSync(d)) return send(res, 400, { error: 'Ya existe.' });
      fs.mkdirSync(d); return send(res, 200, { ok: true, path: d });
    }
    // Crea la copia de trabajo (origen -> destino) y la conecta. El origen no se modifica.
    if (req.method === 'POST' && url.pathname === '/api/prepare') {
      if (busy()) return send(res, 409, { error: 'hay una ejecución en curso' });
      const b = await readBody(req);
      try {
        emit('agent', { kind: 'note', text: 'Preparando la copia de trabajo…' });
        const dest = await prepareCopy(b);
        await connectRepo(dest);
        emit('agent', { kind: 'note', text: `Copia de trabajo lista en ${dest}. El origen no se modificó y la copia no queda enlazada a él.` });
        return send(res, 200, { ok: true, repo: S.repo });
      } catch (e) { return send(res, 400, { error: String(e.message || e).slice(0, 600) }); }
    }
    if (req.method === 'POST' && url.pathname === '/api/install-skills') {
      if (!S.repo) return send(res, 400, { error: 'elige un repo primero' });
      if (!fs.existsSync(OWN_SKILLS)) return send(res, 404, { error: 'no encuentro las skills de este proyecto' });
      copyDir(OWN_SKILLS, path.join(S.repo, '.claude', 'skills'));
      const ign = await ensureClaudeIgnored();
      emit('agent', { kind: 'note', text: 'Skills SDD copiadas a .claude/skills del repo (sin sobrescribir archivos existentes).' + (ign ? ' Se agregó .claude/ a .git/info/exclude para que no ensucien git (regla local, no se versiona).' : '') });
      await refreshState(true);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/start') {
      const { goal, mode, provider, openai, claude } = await readBody(req);
      if (!S.repo) return send(res, 400, { error: 'elige un repo primero' });
      if (busy()) return send(res, 409, { error: 'ya hay una ejecución en curso' });
      if (!goal || !String(goal).trim()) return send(res, 400, { error: 'describe el objetivo de la migración' });
      const m = mode === 'plan' ? 'plan' : 'edit';
      let cfg = null;
      if (provider === 'openai') {
        cfg = resolveOpenAI(openai);
        try { validateCfg(cfg); } catch (e) { return send(res, 400, { error: e.message }); }
        if (!fs.existsSync(path.join(S.repo, '.claude', 'skills', 'sdd-exploracion', 'SKILL.md'))) {
          return send(res, 400, { error: 'El repo no tiene las skills SDD (.claude/skills). Usa el botón "Copiar skills SDD al repo".' });
        }
      }
      const claudeModel = /^[\w.\-\[\]]{1,60}$/.test(String((claude && claude.model) || '')) ? claude.model : '';
      if (provider !== 'openai') {
        const cs = await claudeStatus();
        if (!cs.installed) return send(res, 400, { error: 'No encuentro el comando "claude". Instala Claude Code y reinicia este servidor.' });
        if (!cs.loggedIn) return send(res, 400, { error: 'Claude Code no tiene sesión iniciada. En una terminal ejecuta: claude auth login' });
      }
      // El agente no puede escribir en .git (Claude Code lo bloquea); lo hace el servidor, una sola vez y solo si .claude/ no es parte del proyecto.
      await ensureClaudeIgnored();
      S.history = S.history.filter((e) => e.type === 'reset'); S.gate = null; S.phase = null; S.approvals = [];
      const prompt = `Objetivo: ${String(goal).trim()}\n\nEmpieza con sdd-estado y luego sdd-exploracion. Sigue el protocolo del visualizador.`;
      emit('agent', { kind: 'note', text: `Inicio con ${cfg ? `API OpenAI-compatible (${cfg.model})` : `Claude Code (tu sesión${claudeModel ? ', modelo ' + claudeModel : ''})`} · ${m === 'plan' ? 'solo lectura y propuestas' : 'ejecución en rama con gates'}: ${String(goal).trim()}` });
      setStatus('running');
      if (cfg) {
        S.run = { provider: 'openai', mode: m, cfg, sessionId: 'openai', busy: false, startedAt: Date.now(),
          messages: [{ role: 'system', content: SYS_OPENAI }] };
        emit('agent', { kind: 'init', model: cfg.model, tools: toolDefs(m).length });
        runOpenAI(prompt);
      } else runClaude(prompt, { mode: m, model: claudeModel });
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/decide') {
      const { decision, comment } = await readBody(req);
      if (!S.run || !S.run.sessionId || busy()) return send(res, 409, { error: 'no hay un turno esperando respuesta' });
      if (!['waiting-gate', 'waiting-input', 'done'].includes(S.status)) return send(res, 409, { error: 'no hay gate pendiente' });
      const text = String(comment || '').trim();
      let msg;
      if (decision === 'approve') msg = `APROBADO: ${text || 'sin comentario'}`;
      else if (decision === 'reject') msg = `RECHAZADO: ${text || 'sin motivo'}`;
      else if (decision === 'changes') {
        if (!text) return send(res, 400, { error: 'Escribe qué cambios quieres.' });
        msg = `CAMBIOS SOLICITADOS: ${text}\nActualiza el spec, los criterios CA-NN y el plan para reflejarlos, rehaz lo necesario y vuelve a presentar este mismo gate (línea GATE|… al final).`;
      } else msg = text;
      if (!msg) return send(res, 400, { error: 'mensaje vacío' });
      if (S.edited.size) {
        msg += `\n\n[La persona editó a mano estos archivos: ${[...S.edited].join(', ')}. Léelos de nuevo antes de seguir, respeta sus cambios y deja spec, criterios CA-NN y plan coherentes con ellos.]`;
        S.edited.clear();
      }
      const rec = { t: Date.now(), gate: S.gate ? S.gate.name : '(mensaje libre)', decision: decision || 'message', comment: text };
      S.approvals.push(rec); emit('approval', rec);
      const mode = S.run.mode, sid = S.run.sessionId;
      S.gate = null; setStatus('running');
      if (S.run.provider === 'openai') runOpenAI(msg); else runClaude(msg, { mode, resume: sid, model: S.run.model });
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/stop') {
      if (S.run && S.run.proc) { S.status = 'idle'; S.run.proc.kill(); }
      if (S.run && S.run.abort) { S.status = 'idle'; S.run.abort.abort(); if (S.run.child) S.run.child.kill(); }
      S.gate = null; setStatus('idle', { message: 'Detenido por el usuario' });
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'no encontrado' });
  } catch (e) {
    return send(res, 500, { error: String(e && e.message || e) });
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`El puerto ${PORT} ya está en uso. Cierra el otro servidor o usa otro: node server.js ${PORT + 1}`);
  else console.error('Error del servidor:', e.message);
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  console.log(`Visualizador de migración SDD → http://${HOST}:${PORT}`);
  console.log('Solo escucha en localhost. Ctrl+C para salir.');
});
process.on('SIGINT', () => { if (S.run && S.run.proc) S.run.proc.kill(); process.exit(0); });
