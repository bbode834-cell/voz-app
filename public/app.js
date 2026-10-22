// King Launcher — cliente
// WebRTC em malha (cada participante conecta direto com os outros).
// Ideal para grupos pequenos (até 6) com uma transmissão de tela por vez.

const $ = (s) => document.querySelector(s);

// ---------- Abertura (logo + fone caindo na coroa) ----------
(function intro() {
  const el = document.getElementById('intro');
  if (!el) return;
  const end = () => { el.classList.add('out'); setTimeout(() => el.remove(), 450); };
  const t = setTimeout(end, 2100);
  el.addEventListener('click', () => { clearTimeout(t); end(); });
})();
// Só conecta depois do login (o servidor confere o "crachá" de acesso)
let authToken = null;
const socket = io({ autoConnect: false, auth: (cb) => cb({ token: authToken }) });

// ---------- Ícones ----------
const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4"/>'),
  micOff: svg('<path d="M2 2l20 20"/><path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7"/><path d="M19 10v1a7 7 0 0 1-1.1 3.8M5 10v1a7 7 0 0 0 11 5.7M12 18v4"/>'),
  head: svg('<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="5" height="7" rx="2"/><rect x="16" y="14" width="5" height="7" rx="2"/>'),
  headOff: svg('<path d="M2 2l20 20"/><path d="M3 14v-2a9 9 0 0 1 2.6-6.4M8.5 3.7A9 9 0 0 1 21 12v2"/><rect x="3" y="14" width="5" height="7" rx="2"/><path d="M16 16v3a2 2 0 0 0 2 2h1"/>'),
  speaker: svg('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
  speakerOff: svg('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>'),
  screen: svg('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  hang: svg('<path d="M10.7 13.3a16 16 0 0 0 3.4 2.6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L7.9 9.9"/><path d="M22 2 2 22"/>'),
  full: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
  chat: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  cam: svg('<path d="M23 7l-7 5 7 5z"/><rect x="1" y="5" width="15" height="14" rx="2"/>'),
  camOff: svg('<path d="M2 2l20 20"/><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5 0h4a2 2 0 0 1 2 2v3.3l1 1L23 7v10"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  exitFull: svg('<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>'),
  pencil: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
};

// ---------- Armazenamento local (fica salvo neste navegador) ----------
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---------- Estado ----------
let config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], maxPerChannel: 6 };
let myName = '';
let myAvatar = '';
let me = null;            // minha conta { id, username, name, avatar, role }
let loggedIn = false;
let modMuted = false;     // um moderador fechou meu microfone
authToken = store.get('voz-token', null);
let selfId = null;
let currentChannel = null; // id do canal (c1, c2...)
let channelsState = [];
let botInfo = null; // { id, name, avatar, room } (vem com a lista de canais)
let localStream = null;   // microfone
let screenStream = null;  // minha tela (quando eu transmito)
let camStream = null;     // minha câmera (quando ligada)
// Transmitindo a tela: a câmera vira uma janelinha flutuante na MINHA tela
// (por cima de tudo, entra na transmissão), igual ao quadradinho do celular
let camFloating = false;
let floatWin = null;      // janelinha (Document PiP) ou o <video> em PiP
let closingFloat = false;
const watching = new Set(); // transmissões que estou assistindo (ids)
let muted = false;
let deafened = false;
let joining = false;
const volumes = store.get('voz-volumes', {});            // nome do amigo -> 0..1
const screenVolumes = store.get('voz-volume-telas', {});  // nome de quem transmite -> 0..1
let lowLatency = store.get('voz-baixo-atraso', true);      // ⚡ mostra cada quadro assim que chega
let avatarList = [];

// id -> { pc, polite, makingOffer, ignoreOffer, screenSenders, audioEls, micEl, screenStream, watchingMe }
const peers = new Map();
const speaking = new Set();

// ---------- Utilidades ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initial = (n) => ((n || '').trim()[0] || '?').toUpperCase();
function colorFor(name) {
  let h = 0;
  for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 55% 45%)`;
}
function avatarSrc(a) {
  if (!a) return '';
  if (a.startsWith('p:')) return `avatars/${a.slice(2)}.svg`;
  if (a.startsWith('data:image/')) return a;
  return '';
}
// Preenche um elemento .avatar com a foto (ou a inicial do nome)
function fillAvatar(el, name, avatar) {
  const src = avatarSrc(avatar);
  el.style.background = src ? 'transparent' : colorFor(name);
  el.innerHTML = src ? `<img src="${esc(src)}" alt="">` : esc(initial(name));
}
const avatarHTML = (u, cls = '') => {
  const src = avatarSrc(u.avatar);
  return src
    ? `<span class="avatar ${cls}"><img src="${esc(src)}" alt=""></span>`
    : `<span class="avatar ${cls}" style="background:${colorFor(u.name)}">${esc(initial(u.name))}</span>`;
};
function findUser(id) {
  for (const ch of channelsState) {
    const u = ch.users.find((x) => x.id === id);
    if (u) return u;
  }
  return null;
}
const nameOf = (id) => findUser(id)?.name || 'Alguém';
const channelName = (id) => channelsState.find((c) => c.id === id)?.name || '';
const currentCh = () => channelsState.find((c) => c.id === currentChannel);
// Quem está transmitindo no meu canal agora
const sharersNow = () => {
  const ch = currentCh();
  if (!ch) return [];
  return ch.sharers || (ch.sharer ? [ch.sharer] : []);
};
const isSharing = (id) => sharersNow().includes(id);
// Versão 1.0.2 do app não sabe pedir para assistir: recebe a primeira transmissão direto
const isLegacy = (id) => (findUser(id)?.proto || 1) < 2;
// Versões que sabem mostrar câmera (as antigas achariam que é uma tela)
const seesCams = (id) => (findUser(id)?.proto || 1) >= 3;
// Câmera de alguém (ou a minha), se estiver chegando imagem
function camOf(id) {
  const st = id === selfId ? (camFloating ? null : camStream) : peers.get(id)?.camStream;
  return st && st.getVideoTracks().some((t) => t.readyState === 'live') ? st : null;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
const emitAck = (ev, data) => new Promise((resolve) => socket.emit(ev, data, resolve));
const sendSignal = (to, data) => socket.emit('signal', { to, data });

// ---------- Efeitos sonoros ----------
const SONS = ['entrou', 'saiu', 'mic-on', 'mic-off', 'fone-on', 'fone-off', 'transmissao', 'mensagem', 'tomate', 'toctoc', 'vidro', 'isqueiro'];
const soundBuffers = {};
let soundsLoaded = false;

async function loadSounds() {
  if (soundsLoaded || !audioCtx) return;
  soundsLoaded = true;
  await Promise.all(SONS.map(async (n) => {
    try {
      const r = await fetch(['tomate', 'toctoc', 'vidro', 'isqueiro'].includes(n) ? `fx/${n}.wav` : `sons/${n}.wav`);
      soundBuffers[n] = await audioCtx.decodeAudioData(await r.arrayBuffer());
    } catch {}
  }));
}

// force = toca mesmo com o fone desligado (ex.: o som de desligar o fone)
function playSound(name, force = false) {
  if ((deafened && !force) || !audioCtx) return;
  ensureAudioCtx();
  const buf = soundBuffers[name];
  if (!buf) return;
  const src = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  src.buffer = buf;
  gain.gain.value = 0.6;
  src.connect(gain).connect(audioCtx.destination);
  src.start();
}
const soundJoin = () => playSound('entrou');
const soundLeave = () => playSound('saiu');

// ---------- Cargos ----------
const RANK = { member: 0, mod: 1, owner: 2 };
const ROLE_LABEL = { owner: 'Dono', mod: 'Moderador', member: 'Membro' };
const isMod = () => RANK[me?.role] >= RANK.mod;
// Posso moderar essa pessoa? (só quem tem cargo menor que o meu)
const canModerate = (u) => !!u && u.id !== selfId && isMod() && RANK[me.role] > (RANK[u.role] ?? 0);
const roleBadge = (role) =>
  role === 'owner' ? '<span class="role-badge owner" title="Dono">👑</span>'
  : role === 'mod' ? '<span class="role-badge mod" title="Moderador">🛡️</span>' : '';

// ---------- Cores do layout ----------
// Cada pessoa escolhe a sua; fica salvo neste navegador
const THEMES = [
  { id: 'cinza', nome: 'Cinza', cor: '#5865f2', amostra: '#313338' },
  { id: 'preto', nome: 'Preto', cor: '#5865f2', amostra: '#000000' },
  { id: 'branco', nome: 'Branco', cor: '#5865f2', amostra: '#ffffff' },
  { id: 'roxo', nome: 'Roxo', cor: '#9b59ff' },
  { id: 'rosa', nome: 'Rosa', cor: '#ff4fa3' },
  { id: 'verde', nome: 'Verde', cor: '#23c55e' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#ef4444' },
  { id: 'azul', nome: 'Azul', cor: '#3b82f6' },
  { id: 'laranja', nome: 'Laranja', cor: '#f97316' },
];
const BASE_DARK = {
  bg: '#1e1f22', panel: '#2b2d31', 'panel-2': '#313338', 'panel-3': '#383a40', hover: '#35373c',
  'hover-strong': '#42444b', 'btn-hover': '#45474e', text: '#dbdee1', 'text-strong': '#f2f3f5', muted: '#949ba4',
  line: '#1f2023', 'line-strong': '#111', userbar: '#232428', pop: '#111214', stage: '#000', link: '#7aa7ff',
  accent: '#5865f2', 'accent-hover': '#4752c4',
};
function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return [235, 86, 65];
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
function paletteFor(theme) {
  if (theme.id === 'cinza') return { ...BASE_DARK };
  if (theme.id === 'preto') {
    return { ...BASE_DARK, bg: '#000000', panel: '#0c0c0e', 'panel-2': '#111113', 'panel-3': '#1c1c20', hover: '#18181b',
      'hover-strong': '#232327', 'btn-hover': '#2a2a2f', line: '#000', 'line-strong': '#000', userbar: '#060607', pop: '#0c0c0e' };
  }
  if (theme.id === 'branco') {
    return { bg: '#e3e5e8', panel: '#f2f3f5', 'panel-2': '#ffffff', 'panel-3': '#ebedef', hover: '#e3e5e8',
      'hover-strong': '#d7d9dc', 'btn-hover': '#d7d9dc', text: '#313338', 'text-strong': '#060607', muted: '#5c5e66',
      line: '#d4d7dc', 'line-strong': '#c4c9ce', userbar: '#ebedef', pop: '#ffffff', stage: '#f2f3f5', link: '#0068e0',
      accent: '#5865f2', 'accent-hover': '#4752c4' };
  }
  // Cor escolhida: fundo escuro puxado para essa cor + destaque nela
  const [h, sRaw, l] = hexToHsl(theme.cor);
  const s = Math.max(sRaw, 10);
  const t = (sat, lig) => `hsl(${h} ${Math.round(s * sat)}% ${lig}%)`;
  const accentL = Math.min(Math.max(l, 45), 62);
  return {
    bg: t(0.28, 8), panel: t(0.26, 12), 'panel-2': t(0.24, 15), 'panel-3': t(0.24, 20), hover: t(0.24, 18),
    'hover-strong': t(0.26, 24), 'btn-hover': t(0.28, 27), text: t(0.15, 86), 'text-strong': t(0.1, 96),
    muted: t(0.14, 64), line: t(0.3, 7), 'line-strong': t(0.3, 5), userbar: t(0.28, 10), pop: t(0.3, 7),
    stage: t(0.35, 4), link: `hsl(${h} 90% 75%)`,
    accent: `hsl(${h} ${Math.min(s, 85)}% ${accentL}%)`, 'accent-hover': `hsl(${h} ${Math.min(s, 85)}% ${accentL - 9}%)`,
  };
}
let themeChoice = store.get('voz-tema', { id: 'cinza' });
function applyTheme(choice) {
  themeChoice = choice;
  const base = THEMES.find((t) => t.id === choice.id) || { id: 'custom', cor: choice.cor };
  const pal = paletteFor(base.id === 'custom' ? { id: 'custom', cor: choice.cor } : base);
  for (const [k, v] of Object.entries(pal)) document.documentElement.style.setProperty(`--${k}`, v);
  document.documentElement.dataset.theme = base.id === 'branco' ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pal.panel);
}
function renderThemeGrid() {
  const grid = $('#theme-grid');
  grid.innerHTML = '';
  THEMES.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-opt' + (themeChoice.id === t.id ? ' selected' : '');
    b.innerHTML = `<span class="swatch" style="background:${t.amostra || t.cor}"></span><span>${t.nome}</span>`;
    b.onclick = () => { applyTheme({ id: t.id }); store.set('voz-tema', themeChoice); renderThemeGrid(); };
    grid.appendChild(b);
  });
  $('.custom-color').classList.toggle('selected', themeChoice.id === 'custom');
  if (themeChoice.id === 'custom') $('#theme-custom').value = themeChoice.cor;
}
$('#theme-custom').addEventListener('input', (e) => {
  applyTheme({ id: 'custom', cor: e.target.value });
  store.set('voz-tema', themeChoice);
  renderThemeGrid();
});
applyTheme(themeChoice);

// ---------- Entrar / criar conta ----------
if (!window.isSecureContext) $('#secure-warning').hidden = false;
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === mode));
  $('#auth-name-row').hidden = mode !== 'register';
  $('#auth-submit').textContent = mode === 'register' ? 'Criar conta' : 'Entrar';
  $('#auth-pass').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  $('#auth-hint').innerHTML = mode === 'register'
    ? 'Depois de criar, o dono precisa <b>aprovar</b> sua conta. Aí é só entrar.'
    : 'Ainda não tem conta? Toque em <b>Criar conta</b>. O dono precisa aprovar antes do primeiro acesso.';
  authMsg('');
}
document.querySelectorAll('.auth-tabs button').forEach((b) => (b.onclick = () => setAuthMode(b.dataset.tab)));

function authMsg(text, kind = 'error') {
  const el = $('#auth-msg');
  el.hidden = !text;
  el.textContent = text;
  el.className = 'auth-msg ' + kind;
}

// "Lembrar usuário e senha" (fica guardado só neste navegador)
function fillRemembered() {
  const saved = store.get('voz-lembrar', null);
  $('#auth-remember').checked = !!saved;
  if (saved) {
    if (!$('#auth-user').value) $('#auth-user').value = saved.u || '';
    if (!$('#auth-pass').value && $('#auth-user').value === saved.u) $('#auth-pass').value = saved.p || '';
  }
}
function showAuth(msg, kind) {
  fillRemembered();
  $('#auth').hidden = false;
  $('#settings').hidden = true;
  if (msg) authMsg(msg, kind);
  setTimeout(() => $('#auth-user').focus(), 50);
}

async function api(path, body) {
  const r = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await r.json(); } catch {}
  return { status: r.status, ...data, httpStatus: r.status };
}

$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#auth-user').value.trim();
  const password = $('#auth-pass').value;
  const btn = $('#auth-submit');
  btn.disabled = true;
  try {
    if (authMode === 'register') {
      const r = await api('/api/register', { username, password, name: $('#auth-name').value.trim() });
      if (r.error) return authMsg(r.error);
      if (r.token) return startSession(r.token, r.user, true); // primeira conta = dono
      setAuthMode('login');
      authMsg('Conta criada! Agora é só esperar o dono aprovar. Depois entre com seu usuário e senha.', 'ok');
    } else {
      const r = await api('/api/login', { username, password });
      if (r.error) return authMsg(r.error, r.httpStatus === 403 ? 'wait' : 'error');
      store.set('voz-lembrar', $('#auth-remember').checked ? { u: username, p: password } : null);
      startSession(r.token, r.user, false);
    }
  } catch {
    authMsg('Não consegui falar com o servidor. Se ninguém usou nos últimos minutos, ele pode levar até 1 minuto para acordar. Tente de novo.');
  } finally {
    btn.disabled = false;
  }
});

async function startSession(token, user, firstTime) {
  authToken = token;
  store.set('voz-token', token);
  me = user;
  myName = user.name;
  myAvatar = user.avatar || '';
  loggedIn = true;
  $('#auth').hidden = true;
  $('#auth-pass').value = '';
  try { config = await (await fetch('/config')).json(); } catch {}
  if (config?.versao && !siteVersion) siteVersion = config.versao;
  ensureAudioCtx();
  loadSounds();
  socket.connect();
  renderAll();
  // Só abre o menu sozinho para conta nova (ainda sem foto) e uma única vez
  if (!myAvatar && !store.get('voz-menu-visto', false)) {
    store.set('voz-menu-visto', true);
    openSettings('perfil');
  }
}

function logout(msg, kind) {
  if (currentChannel) leaveChannel();
  if (dmOpen) setDmOpen(false);
  dmContacts = []; dmUnread = {}; updateDmBadge();
  socket.disconnect();
  authToken = null;
  store.set('voz-token', null);
  me = null;
  loggedIn = false;
  renderAll();
  showAuth(msg, kind);
}

// O servidor recusou a conexão (conta não aprovada, banida ou login vencido)
socket.on('connect_error', (err) => {
  const m = err?.message;
  if (m === 'login') logout('Entre de novo com seu usuário e senha.');
  else if (m === 'pending') logout('Sua conta ainda está esperando a aprovação do dono.', 'wait');
  else if (m === 'banned') logout('Esta conta foi banida.');
});

socket.on('me', (u) => {
  me = { ...me, ...u };
  myName = me.name;
  myAvatar = me.avatar || '';
  renderAll();
  renderSettings();
});

// Ao abrir: se já entrou antes, continua logado
(async function boot() {
  if (!authToken) return showAuth();
  // Só pede login de novo se o servidor disser que o acesso acabou.
  // Servidor acordando ou internet caindo: espera e tenta de novo sozinho.
  for (let i = 0; ; i++) {
    try {
      const r = await api('/api/me');
      if (r.user) return startSession(authToken, r.user, false);
      if (r.httpStatus === 401 || r.httpStatus === 403) {
        authToken = null;
        store.set('voz-token', null);
        return showAuth(r.error, r.status === 'pending' ? 'wait' : 'error');
      }
    } catch {}
    if (i === 0) toast('Conectando ao servidor… (se ninguém usou nos últimos minutos, leva até 1 minuto)');
    await new Promise((ok) => setTimeout(ok, 4000));
  }
})();

// ---------- Menu de configurações ----------
let draftAvatar = '';
let settingsSec = 'tema';

async function loadAvatarList() {
  try { avatarList = await (await fetch('avatars/lista.json')).json(); } catch { avatarList = []; }
  renderAvatarGrid();
}

function renderAvatarGrid() {
  const grid = $('#avatar-grid');
  grid.innerHTML = '';
  avatarList.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'avatar-opt' + (draftAvatar === `p:${a.id}` ? ' selected' : '');
    b.title = a.nome;
    b.innerHTML = `<img src="avatars/${a.id}.svg" alt="${esc(a.nome)}">`;
    b.onclick = () => { draftAvatar = `p:${a.id}`; renderAvatarGrid(); updatePreview(); };
    grid.appendChild(b);
  });
}

function updatePreview() {
  fillAvatar($('#avatar-preview'), $('#name-input').value.trim() || '?', draftAvatar);
}

function openSettings(sec) {
  if (!loggedIn) return;
  draftAvatar = myAvatar;
  $('#name-input').value = myName;
  renderAvatarGrid();
  updatePreview();
  renderThemeGrid();
  $('#settings').hidden = false;
  showSettingsSec(sec || settingsSec);
}

function showSettingsSec(sec) {
  if (sec === 'mod' && !isMod()) sec = 'tema';
  settingsSec = sec;
  document.querySelectorAll('.settings-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.sec === sec));
  document.querySelectorAll('.settings-body section').forEach((el) => (el.hidden = el.dataset.sec !== sec));
  renderSettings();
  if (sec === 'mod') loadAccounts();
}
document.querySelectorAll('.settings-tabs button').forEach((b) => (b.onclick = () => showSettingsSec(b.dataset.sec)));
$('#settings-close').onclick = () => ($('#settings').hidden = true);
$('#settings').addEventListener('pointerdown', (e) => { if (e.target.id === 'settings') $('#settings').hidden = true; });

function renderSettings() {
  $('#tab-mod').hidden = !isMod();
  $('#acc-username').textContent = me ? `@${me.username}` : '';
  $('#acc-role').textContent = me ? ROLE_LABEL[me.role] || '' : '';
  $('#ns-toggle').checked = nsOn;
  $('#ns-status').textContent = nsStatusText();
  updatePendingBadges();
}

$('#name-input').addEventListener('input', updatePreview);
$('#btn-upload').onclick = () => $('#file-input').click();
$('#file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const out = await cropImage(file);
    if (!out) return;
    draftAvatar = out;
    renderAvatarGrid();
    updatePreview();
    toast('Foto pronta! Clique em "Salvar nome e avatar".');
  } catch {
    toast('Não consegui abrir essa imagem. Tente uma foto JPG ou PNG.');
  }
});

// Recorte da foto de perfil: arraste para posicionar e use a barra (ou a rodinha) para aproximar
function cropImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const box = $('#crop'), cv = $('#crop-cv'), zoom = $('#crop-zoom');
      const S = cv.width; // área de recorte (quadrada), o círculo mostra como vai ficar
      const base = S / Math.min(img.width, img.height);
      let z = 1, cx = img.width / 2, cy = img.height / 2; // centro da foto que fica no meio
      zoom.value = '1';
      const clamp = () => {
        const half = S / 2 / (base * z);
        cx = Math.min(img.width - half, Math.max(half, cx));
        cy = Math.min(img.height - half, Math.max(half, cy));
      };
      const paint = (g, size) => {
        const k = (base * z * size) / S;
        g.drawImage(img, size / 2 - cx * k, size / 2 - cy * k, img.width * k, img.height * k);
      };
      const draw = () => {
        clamp();
        const g = cv.getContext('2d');
        g.clearRect(0, 0, S, S);
        paint(g, S);
        g.fillStyle = 'rgba(0,0,0,.55)';
        g.beginPath();
        g.rect(0, 0, S, S);
        g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2, true);
        g.fill('evenodd');
        g.strokeStyle = 'rgba(255,255,255,.9)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
        g.stroke();
      };
      let drag = null;
      cv.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); };
      cv.onpointermove = (e) => {
        if (!drag) return;
        const r = cv.getBoundingClientRect(), k = (S / r.width) / (base * z);
        cx -= (e.clientX - drag.x) * k;
        cy -= (e.clientY - drag.y) * k;
        drag = { x: e.clientX, y: e.clientY };
        draw();
      };
      cv.onpointerup = cv.onpointercancel = () => { drag = null; };
      cv.onwheel = (e) => {
        e.preventDefault();
        z = Math.min(4, Math.max(1, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
        zoom.value = String(z);
        draw();
      };
      zoom.oninput = () => { z = Number(zoom.value); draw(); };
      const close = (val) => { box.hidden = true; resolve(val); };
      $('#crop-cancel').onclick = () => close(null);
      $('#crop-ok').onclick = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, 128, 128);
        paint(g, 128);
        let q = 0.88, out = c.toDataURL('image/jpeg', q);
        while (out.length > 38000 && q > 0.3) { q -= 0.12; out = c.toDataURL('image/jpeg', q); }
        close(out);
      };
      box.hidden = false;
      draw();
    };
    img.src = url;
  });
}

$('#profile-save').onclick = async () => {
  const name = $('#name-input').value.trim().slice(0, 24) || myName;
  const res = await emitAck('profile', { name, avatar: draftAvatar });
  if (res?.error) return toast(res.error);
  myName = name;
  myAvatar = draftAvatar;
  toast('Nome e avatar salvos!');
  renderAll();
};

$('#pass-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await api('/api/password', { old: $('#pass-old').value, password: $('#pass-new').value });
  if (r.error) return toast(r.error);
  $('#pass-old').value = $('#pass-new').value = '';
  toast('Senha trocada!');
});
$('#btn-logout').onclick = () => logout('Você saiu da conta.', 'ok');

// ---------- Moderação: contas ----------
let pendingCount = 0;
let accounts = [];

function updatePendingBadges() {
  const show = isMod() && pendingCount > 0;
  for (const id of ['#gear-badge', '#mod-badge']) {
    const b = $(id);
    b.hidden = !show;
    b.textContent = String(pendingCount);
  }
}

socket.on('pending', ({ count }) => {
  if (count > pendingCount && loggedIn) {
    toast(`🛡️ ${count === 1 ? 'Uma conta nova está' : `${count} contas estão`} esperando sua aprovação (menu ⚙).`);
    playSound('mensagem', true);
    notifyIfHidden('🛡️ Conta nova esperando aprovação', 'Abra o menu ⚙ > Moderação para aprovar.');
    flashTitle('🛡️ Conta nova para aprovar');
  }
  pendingCount = count;
  updatePendingBadges();
  if (!$('#settings').hidden && settingsSec === 'mod') loadAccounts();
});

async function loadAccounts() {
  const r = await emitAck('admin-users', {});
  if (r?.error) return;
  accounts = r.users || [];
  renderAccounts();
}

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return ''; } };

function renderAccounts() {
  const pend = accounts.filter((u) => u.status === 'pending');
  const rest = accounts.filter((u) => u.status !== 'pending');
  const row = (u, buttons) => `
    <div class="acc" data-id="${u.id}">
      ${avatarHTML(u)}
      <div class="acc-info"><strong>${esc(u.name)} ${roleBadge(u.role)}</strong>
        <small>@${esc(u.username)} · ${u.status === 'banned' ? '<b class="ban">banido</b>' : u.status === 'pending' ? 'esperando' : ROLE_LABEL[u.role]} · desde ${fmtDate(u.createdAt)}</small></div>
      <div class="acc-actions">${buttons}</div>
    </div>`;
  const btn = (act, label, cls = '') => `<button class="btn small ${cls}" data-act="${act}">${label}</button>`;
  $('#mod-pending').innerHTML = pend.length
    ? pend.map((u) => row(u, btn('approve', '✔ Aprovar', 'ok') + btn('reject', '✖ Recusar', 'danger'))).join('')
    : '<p class="sec-hint">Ninguém esperando agora.</p>';
  const souDono = me?.role === 'owner';
  $('#mod-users').innerHTML = rest.map((u) => {
    if (u.id === me?.id || RANK[u.role] >= RANK[me?.role]) return row(u, '');
    let b = '';
    if (u.status === 'approved') b += btn('reset-pass', '🔑 Nova senha');
    if (souDono && u.status === 'approved') b += u.role === 'mod' ? btn('make-member', 'Tirar moderador') : btn('make-mod', '🛡️ Tornar moderador');
    b += u.status === 'banned' ? btn('unban', 'Desbanir', 'ok') : btn('ban', 'Banir', 'danger');
    if (souDono) b += btn('delete', 'Apagar', 'danger');
    return row(u, b);
  }).join('');
}

const ACT_CONFIRM = {
  reject: 'Recusar o pedido de {n}?',
  ban: 'Banir {n}? A pessoa sai na hora e não consegue mais entrar.',
  delete: 'Apagar a conta de {n}? Ela some para sempre.',
};
$('.settings-body section[data-sec="mod"]').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = Number(b.closest('.acc').dataset.id);
  const u = accounts.find((x) => x.id === id);
  const q = ACT_CONFIRM[b.dataset.act];
  if (q && !confirm(q.replace('{n}', u?.name || 'essa pessoa'))) return;
  if (b.dataset.act === 'reset-pass' && !confirm(`Criar uma senha nova para ${u?.name}? A senha antiga deixa de funcionar.`)) return;
  const r = await emitAck('admin-set', { userId: id, action: b.dataset.act });
  if (r?.error) toast(r.error);
  if (r?.password) {
    prompt(`Senha nova de ${u?.name} (@${u?.username}). Copie e mande pra ele — depois ele pode trocar em ⚙ > Conta:`, r.password);
  }
  loadAccounts();
});

loadAvatarList();

// ---------- Botões ----------
$('#btn-mute').onclick = toggleMute;
$('#btn-settings').onclick = () => openSettings();
$('#btn-settings').insertAdjacentHTML('afterbegin', ICON.gear);
$('#btn-profile').onclick = () => openSettings('perfil');
$('#settings-close').innerHTML = ICON.close;
$('#btn-deafen').onclick = toggleDeafen;
$('#btn-share').onclick = toggleShare;
$('#btn-cam').onclick = toggleCam;
$('#btn-leave').onclick = () => leaveChannel();
$('#btn-leave .ico').innerHTML = ICON.hang;
$('#btn-share .ico').innerHTML = ICON.screen;


// ---------- Nomes dos canais ----------
// O servidor grátis "dorme" e volta com os nomes padrão; quem lembra dos
// nomes novos manda de volta para ele assim que conecta.
// ---------- Atualização automática ----------
// Quando sai uma versão nova do site (o servidor reinicia), a página percebe ao reconectar:
// fora de chamada recarrega sozinha; em chamada mostra um aviso para atualizar.
let siteVersion = null;
async function checkSiteVersion() {
  try {
    const c = await (await fetch('/config', { cache: 'no-store' })).json();
    if (!c?.versao) return;
    if (!siteVersion) { siteVersion = c.versao; return; }
    if (c.versao === siteVersion) return;
    if (!currentChannel && !screenStream && !camStream) return location.reload();
    $('#update-bar').hidden = false;
  } catch {}
}
$('#update-bar').onclick = () => location.reload();

socket.on('connect', () => {
  checkSiteVersion();
  if (isMod()) socket.emit('admin-users', {}, (r) => { if (r?.users) { accounts = r.users; pendingCount = accounts.filter((u) => u.status === 'pending').length; updatePendingBadges(); } });
  const saved = store.get('voz-canais', null);
  if (saved?.version) socket.emit('sync-names', saved);
});

async function createChannel() {
  const nome = prompt('Nome da nova sala:', '');
  if (nome === null) return;
  const res = await emitAck('create-channel', { name: nome });
  if (res?.error) toast(res.error); else toast(`Sala "${nome.trim()}" criada!`);
}

async function deleteChannel(ch) {
  const n = ch.users.length;
  if (!confirm(`Apagar a sala "${ch.name}"?${n ? ` ${n} pessoa(s) vão sair da chamada.` : ''}`)) return;
  const res = await emitAck('delete-channel', { id: ch.id });
  if (res?.error) toast(res.error); else toast(`Sala "${ch.name}" apagada.`);
}

async function renameChannel(ch) {
  const novo = prompt(`Novo nome para o canal "${ch.name}":`, ch.name);
  if (novo === null) return;
  const res = await emitAck('rename-channel', { id: ch.id, name: novo });
  if (res?.error) toast(res.error);
}

// ---------- Entrar / sair do canal ----------
async function joinChannel(id) {
  if (joining || id === currentChannel || !loggedIn) return;
  joining = true;
  try {
    if (currentChannel) leaveChannel(true);

    if (!localStream) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        console.warn(err);
        toast('Microfone indisponível — você vai entrar só ouvindo.');
      }
    }
    applyMicState();
    ensureAudioCtx();

    await setupMicPipeline();
    const res = await emitAck('join', { channel: id, proto: 3 });
    if (res.error) {
      toast(res.error);
      stopMic();
      return;
    }

    currentChannel = id;
    selfId = res.selfId;
    setTimeout(() => { syncDjAudio(); renderDj(); }, 0);
    modMuted = !!res.modMuted;
    if (modMuted) { muted = true; applyMicState(); }
    chatMsgs = Array.isArray(res.chat) ? res.chat.slice() : [];
    chatUnread = 0;
    renderChat(true);
    watching.clear();
    if (localStream) watchSpeaking(selfId, localStream);
    socket.emit('mute', { muted: muted || deafened || !localStream });

    res.peers.forEach((p) => createPeer(p.id, true));
    soundJoin();
    renderAll();
    // Quem já está transmitindo aparece com o botão "Assistir" (não abre sozinho)
  } finally {
    joining = false;
  }
}

function leaveChannel(switching = false) {
  if (!currentChannel) return;
  stopShare();
  stopCam();
  stopMusic();
  [...peers.keys()].forEach(closePeer);
  socket.emit('leave');
  if (!switching) { stopMic(); soundLeave(); }
  unwatchSpeaking(selfId);
  currentChannel = null;
  setTimeout(() => { syncDjAudio(); renderDj(); }, 0);
  watching.clear();
  renderScreens();
  closeVolume();
  chatMsgs = []; chatUnread = 0; setChatOpen(false);
  renderAll();
}

function stopMic() {
  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  localStream = null;
  teardownNs();
}

// ---------- Supressor de ruído (como o do Discord) ----------
// O som do microfone passa por uma inteligência artificial (RNNoise) que tira
// o barulho de fundo antes de ir para os amigos. Roda no próprio navegador.
let nsOn = store.get('voz-supressor', true);
let nsState = 'off'; // 'off' | 'loading' | 'on' | 'error'
let nsLib = null, nsWasm = null, nsCtx = null;
let nsGraph = null; // { src, node, dest, track }

const nsStatusText = () => !nsOn ? 'Desligado: o som vai como o microfone capta (com a redução básica do navegador).'
  : nsState === 'on' ? '✅ Ligado e funcionando.'
  : nsState === 'error' ? '⚠ Seu navegador não conseguiu ligar o supressor. Use o Chrome ou o Edge atualizados.'
  : 'Ligado: começa a funcionar quando você entrar num canal.';

// O som que vai para os amigos: com supressor (se ligado) ou direto do microfone
const micSendTrack = () => (nsOn && nsGraph?.track) || localStream?.getAudioTracks()[0] || null;

async function setupMicPipeline() {
  if (!localStream || !nsOn) return teardownNs();
  if (nsGraph) return;
  nsState = 'loading';
  try {
    if (!nsLib) {
      nsLib = await import('./vendor/supressor/supressor.js');
      nsWasm = await nsLib.loadRnnoise({ url: 'vendor/supressor/rnnoise.wasm', simdUrl: 'vendor/supressor/rnnoise_simd.wasm' });
    }
    if (!nsCtx) {
      nsCtx = new AudioContext({ sampleRate: 48000 }); // a IA trabalha em 48 kHz
      await nsCtx.audioWorklet.addModule('vendor/supressor/rnnoise-worklet.js');
    }
    if (nsCtx.state === 'suspended') nsCtx.resume().catch(() => {});
    const src = nsCtx.createMediaStreamSource(localStream);
    const node = new nsLib.RnnoiseWorkletNode(nsCtx, { wasmBinary: nsWasm, maxChannels: 1 });
    const dest = nsCtx.createMediaStreamDestination();
    src.connect(node).connect(dest);
    nsGraph = { src, node, dest, track: dest.stream.getAudioTracks()[0] };
    nsState = 'on';
  } catch (err) {
    console.warn('supressor:', err);
    nsState = 'error';
    teardownNs(true);
  }
  if (!$('#settings').hidden) renderSettings();
}

function teardownNs(keepState = false) {
  if (nsGraph) {
    try { nsGraph.src.disconnect(); nsGraph.node.disconnect(); nsGraph.node.destroy?.(); } catch {}
    nsGraph.track?.stop();
    nsGraph = null;
  }
  if (!keepState) nsState = 'off';
}

// Troca o som enviado na hora, sem desligar a chamada
function swapMicSenders() {
  const t = micSendTrack();
  peers.forEach((peer) => {
    if (peer.micSender && t && peer.micSender.track !== t) peer.micSender.replaceTrack(t).catch(() => {});
  });
}

$('#ns-toggle').addEventListener('change', async (e) => {
  nsOn = e.target.checked;
  store.set('voz-supressor', nsOn);
  if (nsOn) await setupMicPipeline();
  swapMicSenders();
  if (!nsOn) teardownNs();
  renderSettings();
  toast(nsOn ? 'Supressor de ruído ligado.' : 'Supressor de ruído desligado.');
});

// ---------- WebRTC (negociação "perfeita") ----------
// Quem acabou de entrar (initiator) faz a primeira oferta; quem já estava
// no canal só adiciona seu áudio/tela ao responder. Isso evita "colisão"
// de ofertas, que às vezes deixava uma conexão travada.
function createPeer(id, initiator = false) {
  if (peers.has(id)) return peers.get(id);
  const pc = new RTCPeerConnection({ iceServers: config.iceServers });
  const peer = {
    id,
    pc,
    polite: selfId > id,
    makingOffer: false,
    ignoreOffer: false,
    settingRemoteAnswer: false,
    tracksAdded: false,
    screenSenders: [],
    audioEls: new Map(),
    micEl: null,
    screenStream: null,
    watchingMe: false,
    camSenders: [],
    musicSenders: [],
    musicStreamId: null, // qual som que chega dessa pessoa é a música (DJ)
    camStreamId: null, // qual "stream" que chega dessa pessoa é a câmera
    camStream: null,
  };
  peers.set(id, peer);

  if (initiator) {
    addLocalTracks(peer);
    // Sem microfone: ainda assim pede para receber o áudio dos outros
    if (!localStream) pc.addTransceiver('audio', { direction: 'recvonly' });
  }

  // Segurança extra: se não conectar em alguns segundos, reinicia o ICE
  let checks = 0;
  peer.watchdog = setInterval(() => {
    const s = pc.connectionState;
    if (s === 'connected' || s === 'closed' || ++checks > 4) return clearInterval(peer.watchdog);
    if (pc.signalingState === 'stable' && pc.remoteDescription) pc.restartIce();
  }, 6000);

  pc.onnegotiationneeded = async () => {
    try {
      peer.makingOffer = true;
      await pc.setLocalDescription();
      sendSignal(id, { description: pc.localDescription });
    } catch (err) {
      console.error(err);
    } finally {
      peer.makingOffer = false;
    }
  };

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) sendSignal(id, { candidate });
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') pc.restartIce();
    if (pc.connectionState === 'connected') { tuneScreenSenders(peer); tuneCamSenders(peer); }
  };

  pc.ontrack = ({ track, streams }) => {
    const stream = streams[0] || new MediaStream([track]);
    if (track.kind === 'video') {
      if (stream.id === peer.camStreamId || (findUser(id)?.cam && !isSharing(id))) {
        peer.camStream = stream;
        track.onunmute = () => renderCams();
        renderCams();
        return;
      }
      peer.screenStream = stream;
      // Chegou vídeo de quem está transmitindo: mostra (o app 1.0.2 envia sem pedirmos)
      if (isSharing(id) && !watching.has(id)) watching.add(id);
      renderScreens();
      return;
    }
    // Áudio: pode ser o microfone, o som da tela transmitida ou a música (DJ)
    if (!peer.audioEls.has(stream.id)) {
      const el = new Audio();
      el.autoplay = true;
      el.srcObject = stream;
      el.dataset.kind = stream.id === peer.musicStreamId ? 'music' : stream.getVideoTracks().length > 0 ? 'screen' : 'mic';
      if (el.dataset.kind === 'music') { track.onended = () => renderMusicBar(); setTimeout(renderMusicBar, 0); }
      $('#audio-sink').appendChild(el);
      peer.audioEls.set(stream.id, el);
      if (el.dataset.kind === 'mic') {
        peer.micEl = el;
        watchSpeaking(id, stream);
      }
      applyVolumes();
      el.play().catch(() => {});
    }
  };

  return peer;
}

function addLocalTracks(peer) {
  if (peer.tracksAdded) return;
  peer.tracksAdded = true;
  const mic = micSendTrack();
  if (mic) peer.micSender = peer.pc.addTrack(mic, localStream);
  if (screenStream && shouldSendTo(peer.id)) {
    peer.screenSenders = addScreenTracks(peer.pc, screenStream);
  }
  if (camStream && !camFloating && seesCams(peer.id)) addCamTracks(peer);
  if (musicStream && seesCams(peer.id)) addMusicTracks(peer);
}

// ---------- Câmera ----------
// A câmera vai para todo mundo do canal (é leve: ~0,5 Mbps por amigo)
function addCamTracks(peer) {
  sendSignal(peer.id, { cam: camStream.id }); // avisa antes: "esse vídeo é a câmera"
  peer.camSenders = camStream.getVideoTracks().map((t) => peer.pc.addTrack(t, camStream));
  tuneCamSenders(peer);
}

function syncCamSenders() {
  peers.forEach((peer, id) => {
    if (!peer.tracksAdded) return;
    const want = !!camStream && !camFloating && seesCams(id);
    const has = peer.camSenders.length > 0;
    if (want && !has) addCamTracks(peer);
    else if (!want && has) {
      peer.camSenders.forEach((sd) => { try { peer.pc.removeTrack(sd); } catch {} });
      peer.camSenders = [];
      sendSignal(id, { cam: null });
    }
  });
}

async function tuneCamSenders(peer) {
  for (const sender of peer.camSenders) {
    try {
      const p = sender.getParameters();
      if (!p.encodings || !p.encodings.length) continue;
      p.encodings[0].maxBitrate = 600_000;
      p.encodings[0].maxFramerate = 24;
      await sender.setParameters(p);
    } catch {}
  }
}

async function toggleCam() {
  if (camStream) return stopCam();
  if (!currentChannel) return;
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' },
      audio: false,
    });
  } catch {
    return toast('Não consegui abrir a câmera (sem câmera ou sem permissão).');
  }
  if (!currentChannel) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; return; }
  camStream.getVideoTracks()[0].onended = () => stopCam();
  // A câmera vai separada da tela: não fica na frente do seu jogo, e quem assiste
  // vê ela dentro da transmissão e coloca onde quiser
  socket.emit('cam', { on: true });
  syncCamSenders();
  renderCams();
  renderControls();
}

function stopCam() {
  if (!camStream) return;
  closeFloatingCam();
  const st = camStream;
  camStream = null;
  syncCamSenders();
  st.getTracks().forEach((t) => t.stop());
  socket.emit('cam', { on: false });
  renderCams();
  renderControls();
}

// ---------- 🎵 Música (DJ) ----------
// Quem está no computador escolhe uma aba do navegador (YouTube, Spotify...) e o som dela
// vai para a chamada como uma faixa separada: todo mundo ouve (celular também), cada um
// com o seu próprio volume da música. Não passa pelo servidor.
let musicStream = null;
let musicVolume = store.get('voz-musica-vol', 0.6);
async function startMusic() {
  if (musicStream) return stopMusic();
  if (!currentChannel) return;
  if (!navigator.mediaDevices?.getDisplayMedia) return toast('Esse navegador não deixa compartilhar o som de uma aba. Use o Chrome ou o Edge no computador.');
  let st;
  try {
    st = await navigator.mediaDevices.getDisplayMedia({
      video: true, // o navegador exige; o vídeo é descartado logo abaixo
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      selfBrowserSurface: 'exclude',
      systemAudio: 'include',
    });
  } catch {
    return;
  }
  st.getVideoTracks().forEach((t) => t.stop());
  const at = st.getAudioTracks()[0];
  if (!at) return toast('Marque "Compartilhar áudio da guia" na janelinha do navegador e tente de novo.');
  if ('contentHint' in at) at.contentHint = 'music';
  musicStream = new MediaStream([at]);
  at.onended = () => stopMusic();
  socket.emit('music', { on: true });
  syncMusicSenders();
  renderControls();
  renderMusicBar();
  toast('🎵 Música ligada! Todo mundo na chamada está ouvindo o som dessa aba.');
}
function stopMusic() {
  if (!musicStream) return;
  const st = musicStream;
  musicStream = null;
  syncMusicSenders();
  st.getTracks().forEach((t) => t.stop());
  socket.emit('music', { on: false });
  renderControls();
  renderMusicBar();
}
function addMusicTracks(peer) {
  sendSignal(peer.id, { music: musicStream.id }); // avisa antes: "esse som é a música"
  peer.musicSenders = musicStream.getAudioTracks().map((t) => peer.pc.addTrack(t, musicStream));
  // qualidade de música (e não de voz)
  peer.musicSenders.forEach(async (sd) => {
    try {
      const p = sd.getParameters();
      if (!p.encodings?.length) p.encodings = [{}];
      p.encodings[0].maxBitrate = 128000;
      await sd.setParameters(p);
    } catch {}
  });
}
function syncMusicSenders() {
  peers.forEach((peer, id) => {
    if (!peer.tracksAdded) return;
    const want = !!musicStream && seesCams(id);
    const has = peer.musicSenders.length > 0;
    if (want && !has) addMusicTracks(peer);
    else if (!want && has) {
      peer.musicSenders.forEach((sd) => { try { peer.pc.removeTrack(sd); } catch {} });
      peer.musicSenders = [];
      sendSignal(id, { music: null });
    }
  });
}
// Quem está tocando música agora (eu ou alguém da chamada)
function musicDjs() {
  const out = [];
  if (musicStream) out.push({ id: selfId, name: myName, me: true });
  peers.forEach((p, id) => { if ([...p.audioEls.values()].some((el) => el.dataset.kind === 'music')) out.push({ id, name: nameOf(id), me: false }); });
  return out;
}
function renderMusicBar() {
  const bar = $('#music-bar');
  const djs = musicDjs();
  bar.hidden = !djs.length;
  if (!djs.length) return;
  const mine = djs.some((d) => d.me);
  $('#music-who').textContent = mine ? 'Você está tocando música para a chamada' : `Música de ${djs.map((d) => d.name).join(', ')}`;
  $('#music-vol').value = Math.round(musicVolume * 100);
  $('#music-vol').parentElement.hidden = mine && djs.length === 1;
  $('#music-stop').hidden = !mine;
}
$('#music-vol').addEventListener('input', (e) => {
  musicVolume = Number(e.target.value) / 100;
  store.set('voz-musica-vol', musicVolume);
  applyVolumes();
});
$('#music-stop').onclick = stopMusic;
$('#btn-music').onclick = startMusic;

// ---------- Câmera flutuante (enquanto transmite a tela) ----------
// Janelinha que fica por cima de todos os programas (até do jogo em modo
// janela/sem bordas). Dá para arrastar e mudar o tamanho. Como fica na sua
// tela, aparece na transmissão quando você compartilha a "Tela inteira".
const canFloat = () => 'documentPictureInPicture' in window || !!document.pictureInPictureEnabled;

async function openFloatingCam() {
  if (!camStream || camFloating || !canFloat()) return false;
  try {
    if ('documentPictureInPicture' in window) {
      const win = await documentPictureInPicture.requestWindow({ width: 260, height: 195 });
      const d = win.document;
      d.title = 'Câmera — King Launcher';
      d.body.style.cssText = 'margin:0;background:#000;overflow:hidden;height:100vh';
      const v = d.createElement('video');
      v.autoplay = true; v.muted = true; v.playsInline = true;
      v.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block;' +
        'box-sizing:border-box;border:3px solid #f5b82e;border-radius:10px;background:#000';
      v.srcObject = camStream;
      d.body.appendChild(v);
      v.play().catch(() => {});
      win.addEventListener('pagehide', onFloatClosed);
      floatWin = win;
    } else {
      // Navegadores sem a janelinha nova: usa o "vídeo flutuante" comum
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.srcObject = camStream;
      await v.play();
      await v.requestPictureInPicture();
      v.addEventListener('leavepictureinpicture', onFloatClosed);
      floatWin = v;
    }
  } catch (err) {
    console.warn('janelinha da câmera:', err);
    floatWin = null;
    return false;
  }
  camFloating = true;
  socket.emit('cam', { on: false });
  syncCamSenders(); // para de mandar a câmera separada (já vai dentro da tela)
  toast('Câmera flutuante aberta! Arraste e mude o tamanho à vontade. Ela aparece na transmissão quando você compartilha a Tela inteira.');
  renderCams();
  renderControls();
  return true;
}

// Fecha a janelinha (quando paramos de transmitir ou desligamos a câmera)
function closeFloatingCam() {
  if (!camFloating) return;
  closingFloat = true;
  try {
    if (floatWin instanceof HTMLVideoElement) {
      if (document.pictureInPictureElement === floatWin) document.exitPictureInPicture().catch(() => {});
      floatWin.srcObject = null;
    } else floatWin?.close();
  } catch {}
  floatWin = null;
  camFloating = false;
  closingFloat = false;
}

// A pessoa fechou a janelinha no X: desliga a câmera (igual ao ✕ do celular)
function onFloatClosed() {
  if (closingFloat || !camFloating) return;
  floatWin = null;
  camFloating = false;
  stopCam();
}

// Parou de transmitir: a câmera volta a ir direto para os amigos
function camFromFloating() {
  if (!camFloating) return;
  closeFloatingCam();
  if (camStream) {
    socket.emit('cam', { on: true });
    syncCamSenders();
  }
  renderCams();
  renderControls();
}

// Vídeos da câmera ficam guardados para não piscar quando a tela é redesenhada
const camVideos = new Map(); // id -> <video>
// ---------- Espelhar a câmera ----------
// Sua própria câmera aparece espelhada (como num espelho); a dos outros, normal.
// O botão ⇄ inverte isso para cada pessoa, e a escolha fica guardada neste navegador.
let mirrorPref = store.get('voz-espelhar', {}) || {};
function mirrorKey(id) { return id === selfId ? 'eu' : String(findUser(id)?.uid || id); }
function isMirrored(id) { return (id === selfId) !== !!mirrorPref[mirrorKey(id)]; }
function toggleMirror(id) {
  const k = mirrorKey(id);
  mirrorPref[k] = !mirrorPref[k];
  store.set('voz-espelhar', mirrorPref);
  renderCams();
  document.querySelectorAll('.cam-pip').forEach((p) => p.querySelector('video').classList.toggle('mirror', isMirrored(p.dataset.id)));
}
const MIRROR_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M8 8l-5 4 5 4"/><path d="M16 8l5 4-5 4"/></svg>';
function mirrorButton(id) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mirror-btn';
  b.title = 'Espelhar a câmera';
  b.innerHTML = MIRROR_SVG;
  b.onclick = (e) => { e.stopPropagation(); toggleMirror(id); };
  b.onpointerdown = (e) => e.stopPropagation();
  return b;
}

function camVideoFor(id, stream) {
  let v = camVideos.get(id);
  if (!v) {
    v = document.createElement('video');
    v.autoplay = true; v.playsInline = true; v.muted = true;
    v.className = 'cam-video';
    camVideos.set(id, v);
  }
  if (v.srcObject !== stream) v.srcObject = stream;
  v.classList.toggle('mirror', isMirrored(id));
  return v;
}

function renderCams() {
  camVideos.forEach((v, id) => { if (!camOf(id)) { v.srcObject = null; v.remove(); camVideos.delete(id); } });
  renderMain();
  renderScreens();
}

// Só envio minha tela para quem está assistindo (economiza internet e processador)
function shouldSendTo(id) {
  const peer = peers.get(id);
  if (!screenStream || !peer) return false;
  if (peer.watchingMe) return true;
  return isLegacy(id) && currentCh()?.sharer === selfId;
}

function syncScreenSenders() {
  peers.forEach((peer, id) => {
    if (!peer.tracksAdded) return; // recebe ao negociar
    const want = shouldSendTo(id);
    const has = peer.screenSenders.length > 0;
    if (want && !has) {
      peer.screenSenders = addScreenTracks(peer.pc, screenStream);
    } else if (!want && has) {
      peer.screenSenders.forEach((sd) => { try { peer.pc.removeTrack(sd); } catch {} });
      peer.screenSenders = [];
    }
  });
}

// Adiciona a tela numa conexão, preferindo H.264 (usa a placa de vídeo do PC,
// deixa 1080p/60 FPS mais leve). Se o navegador não tiver, usa o padrão.
function addScreenTracks(pc, stream) {
  return stream.getTracks().map((t) => {
    const sender = pc.addTrack(t, stream);
    if (t.kind === 'video') {
      try {
        const tr = pc.getTransceivers().find((x) => x.sender === sender);
        const caps = RTCRtpReceiver.getCapabilities?.('video')?.codecs || [];
        const h264 = caps.filter((c) => c.mimeType === 'video/H264');
        if (tr?.setCodecPreferences && h264.length) {
          tr.setCodecPreferences([...h264, ...caps.filter((c) => c.mimeType !== 'video/H264')]);
        }
      } catch {}
    }
    return sender;
  });
}

// Faz o vídeo já começar com velocidade alta (em vez de subir aos poucos a
// partir de ~0,3 Mbps). Sem isso a imagem fica borrada nos primeiros segundos.
const START_KBPS = 2500;
function fastStart(sdp) {
  if (!sdp || sdp.includes('x-google-start-bitrate')) return sdp;
  const lines = sdp.split('\r\n');
  const out = [];
  let inVideo = false;
  const hasFmtp = new Set();
  lines.forEach((l) => { const m = l.match(/^a=fmtp:(\d+) /); if (m) hasFmtp.add(m[1]); });
  for (const l of lines) {
    if (l.startsWith('m=')) inVideo = l.startsWith('m=video');
    if (inVideo) {
      const fm = l.match(/^a=fmtp:(\d+) (.*)$/);
      const rm = l.match(/^a=rtpmap:(\d+) (VP8|VP9|H264|AV1)\//i);
      if (fm && !/apt=/.test(fm[2])) { out.push(`${l};x-google-start-bitrate=${START_KBPS}`); continue; }
      out.push(l);
      if (rm && !hasFmtp.has(rm[1])) out.push(`a=fmtp:${rm[1]} x-google-start-bitrate=${START_KBPS}`);
      continue;
    }
    out.push(l);
  }
  return out.join('\r\n');
}

socket.on('signal', async ({ from, data }) => {
  if (!currentChannel) return;
  const peer = peers.get(from) || createPeer(from);
  const { pc } = peer;
  try {
    if (data.description) {
      const d = data.description;
      const readyForOffer = !peer.makingOffer &&
        (pc.signalingState === 'stable' || peer.settingRemoteAnswer);
      const collision = d.type === 'offer' && !readyForOffer;
      peer.ignoreOffer = !peer.polite && collision;
      if (peer.ignoreOffer) return;
      peer.settingRemoteAnswer = d.type === 'answer';
      try {
        await pc.setRemoteDescription({ type: d.type, sdp: fastStart(d.sdp) });
      } finally {
        peer.settingRemoteAnswer = false;
      }
      if (d.type === 'offer') {
        addLocalTracks(peer); // reaproveita as faixas da oferta, sem nova negociação
        await pc.setLocalDescription();
        sendSignal(from, { description: pc.localDescription });
      }
      tuneScreenSenders(peer);
    } else if ('cam' in data) {
      // Essa pessoa avisou qual vídeo é a câmera (ou que desligou)
      peer.camStreamId = data.cam || null;
      if (!data.cam) { peer.camStream = null; renderCams(); }
    } else if ('music' in data) {
      // Essa pessoa avisou qual som é a música (ou que parou)
      peer.musicStreamId = data.music || null;
      if (!data.music) {
        peer.audioEls.forEach((el, sid) => { if (el.dataset.kind === 'music') { el.srcObject = null; el.remove(); peer.audioEls.delete(sid); } });
      }
      renderMusicBar();
    } else if (data.stats) {
      // Diagnóstico enviado por quem transmite (como está saindo do lado dele)
      peer.remoteStats = { ...data.stats, at: Date.now() };
    } else if (data.candidate) {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (err) {
        if (!peer.ignoreOffer) console.warn(err);
      }
    }
  } catch (err) {
    console.error(err);
  }
});

function closePeer(id) {
  const peer = peers.get(id);
  if (!peer) return;
  clearInterval(peer.watchdog);
  peer.pc.close();
  peer.audioEls.forEach((el) => { el.srcObject = null; el.remove(); });
  peer.camStream = null;
  peers.delete(id);
  const cv = camVideos.get(id);
  if (cv) { cv.srcObject = null; cv.remove(); camVideos.delete(id); }
  unwatchSpeaking(id);
  setTimeout(renderMusicBar, 0);
}

// ---------- Qualidade da transmissão ----------
// bitrate = quanto de internet (upload) vai para CADA amigo assistindo
const QUALITY = {
  // 'motion' = codificador otimizado para movimento (jogos)
  leve:   { w: 1280, h: 720,  fps: 30, bitrate: 2_000_000, hint: 'motion' },
  padrao: { w: 1920, h: 1080, fps: 30, bitrate: 4_000_000, hint: 'motion' },
  max:    { w: 1920, h: 1080, fps: 60, bitrate: 6_000_000, hint: 'motion' },
};
let qualityKey = store.get('voz-qualidade', 'padrao');
if (!QUALITY[qualityKey]) qualityKey = 'padrao';
const q = () => QUALITY[qualityKey];

$('#quality').value = qualityKey;
$('#quality').addEventListener('change', async (e) => {
  qualityKey = e.target.value;
  store.set('voz-qualidade', qualityKey);
  if (qualityKey === 'max') {
    toast('60 FPS precisa de internet boa: cerca de 6 Mbps de upload por amigo assistindo.');
  }
  // Se já estiver transmitindo, muda na hora
  if (screenStream) {
    const vt = screenStream.getVideoTracks()[0];
    try {
      await vt.applyConstraints({
        frameRate: { ideal: q().fps, max: q().fps },
        width: { ideal: q().w, max: q().w },
        height: { ideal: q().h, max: q().h },
      });
    } catch {}
    if ('contentHint' in vt) vt.contentHint = q().hint;
    peers.forEach(tuneScreenSenders);
  }
});

// Ajusta o envio da tela para cada amigo conforme a qualidade escolhida
async function tuneScreenSenders(peer) {
  for (const sender of peer.screenSenders) {
    if (!sender.track || sender.track.kind !== 'video') continue;
    try {
      const p = sender.getParameters();
      if (!p.encodings || !p.encodings.length) continue;
      p.encodings[0].maxBitrate = q().bitrate;
      p.encodings[0].maxFramerate = q().fps;
      // Jogo: quando a internet/PC aperta, diminui a nitidez mas mantém a fluidez
      p.degradationPreference = 'maintain-framerate';
      await sender.setParameters(p);
    } catch {}
  }
}

// ---------- Eventos do servidor ----------
socket.on('channels', (data) => {
  channelsState = data.channels;
  botInfo = data.bot || botInfo;
  const saved = store.get('voz-canais', null);
  if (data.namesVersion > 0 && (!saved || data.namesVersion >= saved.version)) {
    store.set('voz-canais', {
      version: data.namesVersion,
      names: data.channels.map((c) => ({ id: c.id, name: c.name })),
    });
  }
  // Para de mostrar quem parou de transmitir ou saiu
  [...watching].forEach((id) => { if (!isSharing(id)) watching.delete(id); });
  peers.forEach((p, id) => { if (p.camStream && !findUser(id)?.cam) p.camStream = null; });
  const meEntry = currentChannel && findUser(selfId);
  if (meEntry) modMuted = !!meEntry.modMuted;
  // Janelinha de um amigo aberta: atualiza os botões de moderação
  if (volTarget && !$('#vol-pop').hidden) { const vu = findUser(volTarget); if (vu) renderModTools(vu); else closeVolume(); }
  syncScreenSenders();
  syncCamSenders();
  camVideos.forEach((v, id) => { if (!camOf(id)) { v.srcObject = null; v.remove(); camVideos.delete(id); } });
  applyVolumes();
  renderAll();
  renderScreens();
});

socket.on('peer-joined', ({ id }) => {
  if (!currentChannel) return;
  createPeer(id);
  soundJoin();
});

socket.on('peer-left', ({ id }) => {
  if (!peers.has(id)) return;
  closePeer(id);
  watching.delete(id);
  renderScreens();
  if (volTarget === id) closeVolume();
  soundLeave();
});

socket.on('share-started', ({ id }) => {
  if (id === selfId || !currentChannel) return;
  toast(`${nameOf(id)} começou a transmitir a tela. Clique em "Assistir" para ver.`);
  playSound('transmissao');
  renderAll();
});

socket.on('share-stopped', ({ id }) => {
  const p = peers.get(id);
  if (p) {
    p.screenStream = null;
    // remove o áudio da tela que estava tocando
    p.audioEls.forEach((el, sid) => {
      if (el.dataset.kind === 'screen') { el.srcObject = null; el.remove(); p.audioEls.delete(sid); }
    });
  }
  watching.delete(id);
  renderScreens();
  renderAll();
});

// Alguém começou/parou de assistir a minha transmissão
socket.on('watch-request', ({ from, on }) => {
  const peer = peers.get(from);
  if (!peer) return;
  peer.watchingMe = !!on;
  syncScreenSenders();
});

function watch(id) {
  if (!currentChannel || id === selfId) return;
  watching.add(id);
  socket.emit('watch', { id, on: true });
  renderScreens();
  renderMain();
}

function unwatch(id) {
  watching.delete(id);
  socket.emit('watch', { id, on: false });
  renderScreens();
  renderMain();
}

// ---------- Ações de moderadores em mim ----------
socket.on('kicked', ({ by, motivo }) => {
  leaveChannel();
  toast(motivo === 'sala-apagada' ? `🚪 ${by} apagou a sala. Escolha outra para continuar.` : `🚪 ${by} tirou você da chamada.`);
});
socket.on('banned', ({ by, motivo }) => {
  logout(motivo === 'apagada' ? 'Sua conta foi apagada.' : `Sua conta foi banida por ${by}.`);
});
socket.on('mod-muted', ({ on, by }) => {
  modMuted = on;
  if (on) {
    muted = true;
    applyMicState();
    socket.emit('mute', { muted: true });
    toast(`🔇 ${by} fechou seu microfone.`);
  } else {
    toast(`🎙️ ${by} liberou seu microfone. Clique no microfone para falar.`);
  }
  renderControls();
});
socket.on('mod-stop-share', ({ by }) => {
  if (screenStream) { stopShare(); toast(`⏹ ${by} parou a sua transmissão.`); }
});
socket.on('mod-stop-cam', ({ by }) => {
  if (camStream) { stopCam(); toast(`📷 ${by} desligou a sua câmera.`); }
});
socket.on('mod-stop-music', ({ by }) => {
  if (musicStream) { stopMusic(); toast(`🎵 ${by} parou a sua música.`); }
});

socket.on('disconnect', () => {
  if (currentChannel) {
    toast('Conexão com o servidor perdida.');
    stopShare();
    stopCam();
    [...peers.keys()].forEach(closePeer);
    stopMic();
    currentChannel = null;
    setTimeout(() => { syncDjAudio(); renderDj(); }, 0);
    watching.clear();
    renderScreens();
    closeVolume();
    renderAll();
  }
});

// ---------- Compartilhar tela ----------
async function toggleShare() {
  if (screenStream) return stopShare();
  if (!currentChannel) return;
  if (!navigator.mediaDevices?.getDisplayMedia) return toast('Seu navegador não permite compartilhar a tela.');

  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: q().fps, max: q().fps },
        width: { ideal: q().w, max: q().w },
        height: { ideal: q().h, max: q().h },
      },
      audio: true,
    });
  } catch {
    return; // usuário cancelou
  }

  const res = await emitAck('share-start', {});
  if (res.error) {
    stream.getTracks().forEach((t) => t.stop());
    return toast(res.error);
  }

  screenStream = stream;
  const vt = stream.getVideoTracks()[0];
  if (vt && 'contentHint' in vt) vt.contentHint = q().hint;
  if (vt) vt.onended = () => stopShare(); // botão "Parar compartilhamento" do navegador

  syncScreenSenders(); // envia para quem já pediu para assistir
  renderScreens();
  renderAll();
  renderScreens();
}

function stopShare() {
  if (!screenStream) return;
  peers.forEach((peer) => {
    peer.screenSenders.forEach((s) => { try { peer.pc.removeTrack(s); } catch {} });
    peer.screenSenders = [];
  });
  screenStream.getTracks().forEach((t) => t.stop());
  screenStream = null;
  socket.emit('share-stop');
  camFromFloating();
  renderScreens();
  renderAll();
}

// ---------- Baixo atraso ----------
// Por padrão o navegador guarda alguns quadros para a imagem ficar mais lisa
// (isso aumenta o atraso). No modo ⚡ ele mostra cada quadro assim que chega.
function applyLatencyMode() {
  watching.forEach((id) => {
    const peer = peers.get(id);
    if (!peer) return;
    peer.pc.getReceivers().forEach((r) => {
      if (!r.track) return;
      // só o vídeo e o som da TELA (o microfone fica como está)
      const isScreenAudio = r.track.kind === 'audio' && peer.screenStream?.getAudioTracks().some((t) => t.id === r.track.id);
      if (r.track.kind !== 'video' && !isScreenAudio) return;
      try { r.playoutDelayHint = lowLatency ? 0 : null; } catch {}
      try { r.jitterBufferTarget = lowLatency ? 0 : null; } catch {}
    });
  });
}

function toggleLatency() {
  lowLatency = !lowLatency;
  store.set('voz-baixo-atraso', lowLatency);
  applyLatencyMode();
  screenCards.forEach((el) => updateLatencyButton(el));
  toast(lowLatency
    ? '⚡ Baixo atraso: a imagem chega mais rápido.'
    : 'Mais liso: um pouco mais de atraso, menos engasgos se a internet oscilar.');
}

function updateLatencyButton(el) {
  const b = el.querySelector('.lat');
  if (!b) return;
  b.textContent = lowLatency ? '⚡ Baixo atraso' : 'Mais liso';
  b.classList.toggle('on', lowLatency);
  b.title = lowLatency ? 'Clique para priorizar imagem mais lisa' : 'Clique para priorizar menos atraso';
}

// ---------- Grade de transmissões ----------
const screenCards = new Map(); // id -> elemento do cartão

function renderScreens() {
  const box = $('#screens');
  const list = [];
  if (screenStream && currentChannel) list.push(selfId);
  watching.forEach((id) => { if (isSharing(id) && id !== selfId) list.push(id); });

  // remove cartões que não estão mais na lista
  screenCards.forEach((el, id) => {
    if (!list.includes(id)) {
      if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {});
      el.querySelector('video').srcObject = null;
      el.remove();
      screenCards.delete(id);
    }
  });

  list.forEach((id) => {
    let el = screenCards.get(id);
    const mine = id === selfId;
    if (!el) {
      el = document.createElement('div');
      el.className = 'screen-card';
      el.innerHTML = `
        <video autoplay playsinline muted></video>
        <div class="screen-waiting">Conectando à transmissão…</div>
        <div class="screen-label"><span class="live">AO VIVO</span><span class="owner"></span></div>
        <div class="screen-stats" title="Qualidade da transmissão agora"></div>
        <div class="screen-sender"></div>
        <div class="screen-tools">
          ${mine ? '' : `<label class="screen-vol" title="Volume do som desta transmissão">
            <span class="ico">${ICON.speaker}</span><input type="range" min="0" max="100"></label>`}
          ${mine ? '' : '<button class="lat"></button>'}

          <button class="icon-btn fs" title="Tela cheia">${ICON.full}</button>
          <button class="icon-btn close" title="${mine ? 'Parar de transmitir' : 'Parar de assistir'}">${ICON.close}</button>
        </div>
        <div class="fs-bar">
          <button class="fs-btn fs-mic" title="Microfone"></button>
          <button class="fs-btn fs-deaf" title="Ouvir"></button>
          ${mine ? '' : `<label class="fs-vol" title="Volume desta transmissão"><span class="ico">${ICON.speaker}</span>
            <input type="range" min="0" max="100"><span class="fs-vol-val"></span></label>`}
          <button class="fs-btn fs-exit" title="Sair da tela cheia">${ICON.exitFull}</button>
        </div>`;
      el.querySelector('.fs-mic').onclick = toggleMute;
      el.querySelector('.fs-deaf').onclick = toggleDeafen;
      el.querySelector('.fs-exit').onclick = () => document.exitFullscreen?.();
      // Controles aparecem ao mexer o mouse/tocar e somem sozinhos
      const wake = () => {
        el.classList.remove('idle');
        clearTimeout(el._idle);
        el._idle = setTimeout(() => { if (document.fullscreenElement === el) el.classList.add('idle'); }, 3000);
      };
      el.addEventListener('pointermove', wake);
      el.addEventListener('pointerdown', wake);
      el.addEventListener('fullscreenchange', () => { el.classList.remove('idle'); if (document.fullscreenElement === el) wake(); });
      el.querySelector('.fs').onclick = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else el.requestFullscreen?.();
      };
      el.querySelector('.close').onclick = () => (mine ? stopShare() : unwatch(id));
      const fc = el.querySelector('.float-cam');
      if (fc) fc.onclick = async () => {
        if (!(await openFloatingCam())) toast('Seu navegador não abriu a janelinha. Use o Chrome ou o Edge atualizados.');
        renderScreens();
      };
      const lat = el.querySelector('.lat');
      if (lat) { lat.onclick = toggleLatency; updateLatencyButton(el); }
      // Volume da transmissão: a barra de cima e a da tela cheia andam juntas
      const ranges = el.querySelectorAll('.screen-vol input, .fs-vol input');
      const showVol = (v) => {
        ranges.forEach((r) => { r.value = Math.round(v * 100); });
        el.querySelectorAll('.screen-vol .ico, .fs-vol .ico').forEach((i) => { i.innerHTML = v > 0 ? ICON.speaker : ICON.speakerOff; });
        const t = el.querySelector('.fs-vol-val');
        if (t) t.textContent = `${Math.round(v * 100)}%`;
      };
      showVol(screenVolumeOf(nameOf(id)));
      ranges.forEach((range) => range.addEventListener('input', (e) => {
        const name = nameOf(id);
        const v = e.target.value / 100;
        if (v === 1) delete screenVolumes[name]; else screenVolumes[name] = v;
        store.set('voz-volume-telas', screenVolumes);
        showVol(v);
        applyVolumes();
      }));
      screenCards.set(id, el);
      box.appendChild(el);
      setTimeout(renderControls, 0);
    }
    const stream = mine ? screenStream : peers.get(id)?.screenStream;
    const live = !!stream && stream.getVideoTracks().some((t) => t.readyState === 'live');
    const v = el.querySelector('video');
    if (live && v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); }
    if (!live && v.srcObject) v.srcObject = null;
    el.querySelector('.screen-waiting').hidden = live;
    el.querySelector('.owner').textContent = mine ? 'Sua tela' : `Tela de ${nameOf(id)}`;
    updateCamPip(el, id);
    const fc = el.querySelector('.float-cam');
    if (fc) fc.hidden = !(camStream && !camFloating && canFloat());
  });

  applyLatencyMode();
  box.dataset.count = String(list.length);
  box.hidden = list.length === 0;
  $('#stage').classList.toggle('sharing', list.length > 0);
  // Marca d'água some quando tem transmissão na tela (não atrapalha a imagem)
  document.body.classList.toggle('has-stream', list.length > 0);
}

// Quadradinho da câmera por cima da tela de quem transmite (dá para arrastar
// e mudar o tamanho puxando o canto)
function updateCamPip(card, id) {
  const st = camOf(id);
  let pip = card.querySelector('.cam-pip');
  if (!st) { if (pip) { pip.querySelector('video').srcObject = null; pip.remove(); } return; }
  if (!pip) {
    pip = document.createElement('div');
    pip.className = 'cam-pip';
    pip.title = 'Arraste para mover · puxe o canto para mudar o tamanho';
    pip.innerHTML = '<video autoplay playsinline muted></video>';
    pip.appendChild(mirrorButton(id));
    card.appendChild(pip);
    let drag = null;
    pip.addEventListener('pointerdown', (e) => {
      const r = pip.getBoundingClientRect();
      // canto de baixo à direita = mudar tamanho (fica com o navegador)
      if (e.clientX > r.right - 18 && e.clientY > r.bottom - 18) return;
      const c = card.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, c };
      pip.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    pip.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const { c } = drag;
      const x = Math.max(0, Math.min(e.clientX - c.left - drag.dx, c.width - pip.offsetWidth));
      const y = Math.max(0, Math.min(e.clientY - c.top - drag.dy, c.height - pip.offsetHeight));
      pip.style.left = `${x}px`; pip.style.top = `${y}px`;
      pip.style.right = 'auto'; pip.style.bottom = 'auto';
    });
    // guarda onde você deixou (e o tamanho), em % da tela, para as próximas vezes
    const save = () => {
      const c = card.getBoundingClientRect(), r = pip.getBoundingClientRect();
      if (!c.width || !r.width) return;
      store.set('voz-campip', { x: (r.left - c.left) / c.width, y: (r.top - c.top) / c.height, w: r.width / c.width });
    };
    const end = () => { if (drag) save(); drag = null; };
    pip.addEventListener('pointerup', end);
    pip.addEventListener('pointercancel', end);
    new ResizeObserver(() => { if (!drag && pip.dataset.placed) save(); }).observe(pip);
    // volta para onde você deixou da última vez
    requestAnimationFrame(() => {
      const sv = store.get('voz-campip', null);
      const c = card.getBoundingClientRect();
      if (sv && c.width) {
        pip.style.width = `${Math.max(90, sv.w * c.width)}px`;
        pip.style.left = `${Math.max(0, Math.min(sv.x, 0.95)) * c.width}px`;
        pip.style.top = `${Math.max(0, Math.min(sv.y, 0.95)) * c.height}px`;
        pip.style.right = 'auto'; pip.style.bottom = 'auto';
      }
      pip.dataset.placed = '1';
    });
  }
  pip.dataset.id = id;
  const v = pip.querySelector('video');
  if (v.srcObject !== st) { v.srcObject = st; v.play().catch(() => {}); }
  v.classList.toggle('mirror', isMirrored(id));
}

// ---------- 🤖 DJ King (bot de música) ----------
// O servidor diz o que está tocando e desde quando; cada aparelho toca por conta própria,
// no mesmo ponto. Quem está na chamada com o DJ controla a fila.
let dj = null; // estado completo vindo do servidor
let djClock = 0; // diferença entre o relógio daqui e o do servidor
let djVolume = store.get('voz-dj-vol', 0.5);
const djAudio = new Audio();
djAudio.preload = 'auto';
$('#audio-sink').appendChild(djAudio);
djAudio.addEventListener('ended', () => { if (dj?.now) socket.emit('dj-ended', { key: dj.now.key }); });
djAudio.addEventListener('error', () => {
  if (!dj?.now || !djAudio.src || djAudio.dataset.key !== dj.now.key) return;
  socket.emit('dj-ended', { key: dj.now.key, error: true });
});
const djHere = () => !!(dj && currentChannel && dj.room === currentChannel);
const djPos = () => (dj?.now ? Math.max(0, ((dj.now.pausedAt || (Date.now() - djClock)) - dj.now.startedAt) / 1000) : 0);
const djUrl = (t) => (t.url.startsWith('/') ? location.origin + t.url : t.url);
const fmtDur = (s) => (s == null || !isFinite(s) ? '' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);

socket.on('dj', (st) => {
  dj = st;
  djClock = Date.now() - (st.serverNow || Date.now());
  syncDjAudio();
  renderDj();
  renderChannels();
});
socket.on('dj-info', ({ text }) => toast(text));

// Deixa o som do DJ igual ao estado do servidor (tocando/pausado/no ponto certo)
function syncDjAudio() {
  const n = dj?.now;
  const unloadAudio = () => { if (djAudio.src) { djAudio.pause(); djAudio.removeAttribute('src'); djAudio.load(); djAudio.dataset.key = ''; } };
  if (!djHere() || !n) {
    unloadAudio();
    ytStop();
    return;
  }
  if (n.kind === 'yt') {
    unloadAudio();
    syncYt(n);
    return;
  }
  ytStop();
  const url = djUrl(n);
  if (djAudio.dataset.key !== n.key) {
    djAudio.dataset.key = n.key;
    djAudio.src = url;
    djAudio.load();
  }
  djAudio.volume = djVolume;
  djAudio.muted = deafened;
  if (n.pausedAt) { djAudio.pause(); return; }
  if (!n.live) {
    const want = djPos();
    const seek = () => { try { if (Math.abs(djAudio.currentTime - want) > 2.5 && want > 1) djAudio.currentTime = want; } catch {} };
    if (djAudio.readyState >= 1) seek(); else djAudio.addEventListener('loadedmetadata', seek, { once: true });
  }
  djAudio.play().catch(() => {});
}
// De tempos em tempos confere se não desgarrou do ponto certo
setInterval(() => {
  if (!djHere() || !dj?.now || dj.now.pausedAt) return;
  if (dj.now.kind === 'yt') { syncYt(dj.now); renderDjProgress(); return; }
  if (djAudio.paused && djAudio.src) djAudio.play().catch(() => {});
  if (!dj.now.live) {
    const want = djPos();
    if (djAudio.readyState >= 2 && Math.abs(djAudio.currentTime - want) > 4) { try { djAudio.currentTime = want; } catch {} }
  }
  renderDjProgress();
}, 1000);

// ----- ▶ YouTube: player oficial do YouTube dentro do painel (o vídeo fica visível, como o YouTube pede) -----
let ytPlayer = null;
let ytReady = false;
let ytLoading = false;
let ytKey = ''; // faixa carregada no player
let ytLoadedAt = 0;
let ytLastMeta = '';
let ytErrors = 0;
let ytPlayingSeen = false; // o vídeo atual chegou a tocar?
const YT_MINI = 'voz-dj-yt-mini';
function loadYtApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (!loadYtApi.p) {
    loadYtApi.p = new Promise((ok) => {
      window.onYouTubeIframeAPIReady = ok;
      const sc = document.createElement('script');
      sc.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(sc);
    });
  }
  return loadYtApi.p;
}
async function ensureYt() {
  if (ytPlayer || ytLoading) return;
  ytLoading = true;
  try {
    await loadYtApi();
    ytPlayer = new YT.Player('dj-yt', {
      width: '100%',
      height: '100%',
      playerVars: { playsinline: 1, controls: 0, rel: 0, iv_load_policy: 3, hl: 'pt', origin: location.origin, enablejsapi: 1 },
      events: {
        onReady: () => { ytReady = true; ytLoading = false; syncDjAudio(); },
        onStateChange: (e) => onYtState(e.data),
        onError: (e) => onYtError(e.data),
      },
    });
  } catch (e) {
    ytLoading = false;
    console.warn('youtube:', e);
  }
}
function ytStop() {
  const wrap = $('#dj-yt-wrap');
  if (wrap && !wrap.hidden) wrap.hidden = true;
  if (ytPlayer && ytKey) {
    ytKey = '';
    try { ytPlayer.stopVideo(); } catch {}
  }
}
function ytIdx() {
  try {
    const pl = ytPlayer.getPlaylist?.();
    return pl && pl.length ? ytPlayer.getPlaylistIndex() : 0;
  } catch { return 0; }
}
function syncYt(n) {
  const wrap = $('#dj-yt-wrap');
  wrap.hidden = false;
  wrap.classList.toggle('mini', !!store.get(YT_MINI, false));
  if (!ytPlayer || !ytReady) { ensureYt(); return; }
  const p = ytPlayer;
  try {
    if (ytKey !== n.key) {
      ytKey = n.key;
      ytLoadedAt = Date.now();
      ytLastMeta = '';
      ytErrors = 0;
      ytPlayingSeen = false;
      const start = Math.max(0, Math.floor(djPos()));
      if (n.list) p.loadPlaylist({ listType: 'playlist', list: n.list, index: n.index, startSeconds: start });
      else p.loadVideoById({ videoId: n.video, startSeconds: start });
      p.setVolume(Math.round(djVolume * 100));
      if (deafened) p.mute(); else p.unMute();
      return;
    }
    const st = p.getPlayerState();
    const carregando = Date.now() - ytLoadedAt < 4000;
    // Playlist: o servidor mandou outro vídeo dela
    if (n.list && !carregando) {
      const pl = p.getPlaylist?.() || [];
      if (pl.length && p.getPlaylistIndex() !== n.index && n.index < pl.length) {
        ytLoadedAt = Date.now();
        ytLastMeta = '';
        ytPlayingSeen = false;
        p.playVideoAt(n.index);
        return;
      }
    }
    // Vídeo que não quis tocar em 20 s (bloqueado, sem erro avisado): pede para pular
    if (!ytPlayingSeen && !n.pausedAt && Date.now() - ytLoadedAt > 20000) {
      ytLoadedAt = Date.now();
      ytErrors += 1;
      socket.emit('dj-ended', { key: n.key, index: n.index, error: true, last: ytErrors >= 6 || !n.list });
      return;
    }
    p.setVolume(Math.round(djVolume * 100));
    if (deafened) p.mute(); else p.unMute();
    if (n.pausedAt) {
      if (st === YT.PlayerState.PLAYING || st === YT.PlayerState.BUFFERING) p.pauseVideo();
      return;
    }
    if (!carregando && ytPlayingSeen) {
      const want = djPos();
      const dur = p.getDuration() || 0;
      if (Math.abs(p.getCurrentTime() - want) > 3 && (!dur || want < dur - 1)) p.seekTo(want, true);
    }
    if (st !== YT.PlayerState.PLAYING && st !== YT.PlayerState.BUFFERING) p.playVideo();
  } catch (e) {
    console.warn('youtube sync:', e);
  }
}
function onYtState(st) {
  const n = dj?.now;
  if (!n || n.kind !== 'yt' || n.key !== ytKey || !ytPlayer) return;
  if (st === YT.PlayerState.PLAYING) {
    ytErrors = 0;
    ytPlayingSeen = true;
    const d = ytPlayer.getVideoData?.() || {};
    const pl = ytPlayer.getPlaylist?.() || null;
    const idx = pl && pl.length ? ytPlayer.getPlaylistIndex() : 0;
    // O player passou sozinho para o próximo vídeo da playlist: avisa que o anterior acabou
    if (n.list && idx === n.index + 1 && Date.now() - ytLoadedAt > 4000) socket.emit('dj-ended', { key: n.key, index: n.index });
    const meta = JSON.stringify([idx, d.video_id, pl ? pl.length : 1]);
    if (meta !== ytLastMeta) {
      ytLastMeta = meta;
      socket.emit('dj-yt-meta', { key: n.key, index: idx, count: pl && pl.length ? pl.length : 1, title: d.title || '', author: d.author || '', video: d.video_id || '' });
    }
    if (n.pausedAt) ytPlayer.pauseVideo();
    renderDj();
  } else if (st === YT.PlayerState.ENDED) {
    const pl = ytPlayer.getPlaylist?.() || null;
    const idx = pl && pl.length ? ytPlayer.getPlaylistIndex() : 0;
    socket.emit('dj-ended', { key: n.key, index: idx, last: !pl || !pl.length || idx >= pl.length - 1 });
  }
}
function onYtError(code) {
  const n = dj?.now;
  if (!n || n.kind !== 'yt' || n.key !== ytKey) return;
  ytErrors += 1;
  const pl = ytPlayer?.getPlaylist?.() || null;
  const idx = pl && pl.length ? ytPlayer.getPlaylistIndex() : n.index;
  // Muitos erros seguidos: desiste da playlist inteira
  setTimeout(() => {
    if (dj?.now?.key !== n.key) return;
    socket.emit('dj-ended', { key: n.key, index: idx, error: true, last: ytErrors >= 6 || !n.list });
  }, 800);
  console.warn('youtube erro', code);
}
$('#dj-yt-size').onclick = () => {
  const mini = !store.get(YT_MINI, false);
  store.set(YT_MINI, mini);
  $('#dj-yt-wrap').classList.toggle('mini', mini);
  $('#dj-yt-size').textContent = mini ? '⤢ Vídeo' : '⤡ Vídeo';
  $('#dj-yt-size').title = mini ? 'Vídeo maior' : 'Vídeo menor';
};
// O navegador só libera som depois de um clique: ao primeiro clique, tenta de novo
document.addEventListener('click', () => { if (dj?.now?.kind === 'yt' && djHere()) syncYt(dj.now); }, { capture: true });

async function djMove(to) {
  if (!to) return toast('Entre numa sala primeiro, depois chame o DJ.');
  const r = await emitAck('dj-move', { to });
  if (r?.error) toast(r.error);
}
async function djCtrl(action, key) {
  const r = await emitAck('dj-ctrl', { action, key });
  if (r?.error) toast(r.error);
}
async function djAdd(item) {
  const r = await emitAck('dj-add', item);
  if (r?.error) return toast(r.error);
  toast(`🎵 "${item.title}" entrou na fila (${r.position}º).`);
}

function renderDjProgress() {
  const n = dj?.now;
  const bar = $('#dj-prog');
  if (!n || !bar) return;
  const pos = n.live ? 0 : djPos();
  let dur = n.duration || (djAudio.duration > 0 && isFinite(djAudio.duration) ? djAudio.duration : 0);
  if (n.kind === 'yt') { try { dur = (ytReady && ytKey === n.key && ytPlayer.getDuration()) || 0; } catch { dur = 0; } }
  $('#dj-time').textContent = n.live ? '● AO VIVO' : `${fmtDur(pos)}${dur ? ' / ' + fmtDur(dur) : ''}`;
  bar.style.width = n.live ? '100%' : dur ? `${Math.min(100, (pos / dur) * 100)}%` : '0%';
}

function renderDj() {
  const panel = $('#dj-panel');
  const call = $('#btn-dj');
  if (!dj || !currentChannel) { panel.hidden = true; call.hidden = true; return; }
  const here = djHere();
  call.hidden = here;
  call.title = dj.room ? `O DJ King está na sala ${channelsState.find((c) => c.id === dj.room)?.name || ''} — clique para trazer para cá` : 'Chamar o DJ King para esta chamada';
  panel.hidden = !here;
  if (!here) return;
  const n = dj.now;
  const art = (t) => (t.art ? `<img class="dj-art" src="${esc(t.art)}" alt="">` : `<span class="dj-art dj-art-empty">${t.kind === 'radio' ? '📻' : '🎵'}</span>`);
  const titulo = n && n.kind === 'yt' ? (n.nowTitle || n.title) : n?.title;
  let sub = n ? (n.artist || (n.kind === 'file' ? 'enviada por ' + (n.by || '') : '')) : '';
  if (n && n.kind === 'yt') sub = `▶ YouTube${n.list ? ` · ${esc(n.title)} · vídeo ${n.index + 1}${n.count ? '/' + n.count : ''}` : n.artist ? ' · ' + esc(n.artist) : ''}`;
  else sub = esc(sub);
  const capa = n && n.kind === 'yt' && n.nowVideo ? { ...n, art: `https://i.ytimg.com/vi/${n.nowVideo}/mqdefault.jpg` } : n;
  $('#dj-skip-all').hidden = !(n && n.kind === 'yt' && n.list);
  $('#dj-yt-size').hidden = !(n && n.kind === 'yt');
  $('#dj-now').innerHTML = n
    ? `${art(capa)}<div class="dj-meta"><strong>${esc(titulo)}</strong><small>${sub}</small>
        <div class="dj-bar"><i id="dj-prog"></i></div><small id="dj-time"></small></div>`
    : `<span class="dj-art dj-art-empty">🤖</span><div class="dj-meta"><strong>Nada tocando</strong><small>Toque em "Adicionar música" para começar.</small></div>`;
  $('#dj-play').textContent = n && !n.pausedAt ? '⏸' : '▶';
  $('#dj-mini-play').textContent = n && !n.pausedAt ? '⏸' : '▶';
  $('#dj-mini-now').textContent = n ? `· ${titulo}${n.pausedAt ? ' (pausado)' : ''}` : '· nada tocando';
  $('#dj-play').disabled = !n && !dj.queue.length;
  $('#dj-skip').disabled = !n && !dj.queue.length;
  $('#dj-vol').value = Math.round(djVolume * 100);
  const q = $('#dj-queue');
  q.innerHTML = dj.queue.length
    ? dj.queue.map((t, i) => `<li><span class="dj-n">${i + 1}</span><span class="dj-q-title">${esc(t.title)}<small>${esc([t.artist, t.by].filter(Boolean).join(' · '))}</small></span><span class="dj-q-dur">${t.live ? 'ao vivo' : fmtDur(t.duration)}</span><button type="button" class="icon-btn" data-dj-rm="${t.key}" title="Tirar da fila">${ICON.close}</button></li>`).join('')
    : '<li class="dj-empty">Fila vazia</li>';
  renderDjProgress();
}
$('#btn-dj').onclick = () => djMove(currentChannel);
// Minimizar o painel (fica só uma linha; lembra a escolha)
const DJ_MIN = 'voz-dj-min';
function applyDjMin() {
  const min = !!store.get(DJ_MIN, false);
  $('#dj-panel').classList.toggle('min', min);
  $('#dj-min').textContent = min ? '⤢' : '▁';
  $('#dj-min').title = min ? 'Abrir o painel do DJ' : 'Minimizar o painel do DJ';
  $('#dj-mini-play').hidden = !min;
  $('#dj-mini-skip').hidden = !min;
}
$('#dj-min').onclick = () => { store.set(DJ_MIN, !store.get(DJ_MIN, false)); applyDjMin(); };
$('#dj-mini-play').onclick = () => djCtrl(dj?.now && !dj.now.pausedAt ? 'pause' : 'play');
$('#dj-mini-skip').onclick = () => djCtrl('skip');
applyDjMin();
$('#dj-back').onclick = () => djMove('bots');
$('#dj-play').onclick = () => djCtrl(dj?.now && !dj.now.pausedAt ? 'pause' : 'play');
$('#dj-skip').onclick = () => djCtrl('skip');
$('#dj-skip-all').onclick = () => djCtrl('skip-all');
$('#dj-queue').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dj-rm]');
  if (b) djCtrl('remove', b.dataset.djRm);
});
$('#dj-vol').addEventListener('input', (e) => {
  djVolume = Number(e.target.value) / 100;
  store.set('voz-dj-vol', djVolume);
  djAudio.volume = djVolume;
});

// ----- Procurar / adicionar música -----
let djKind = 'audius';
let djSearchTimer = null;
function openDjSearch() {
  $('#dj-search').hidden = false;
  setTimeout(() => $('#dj-q').focus(), 30);
  djSearch();
}
function setDjKind(k) {
  djKind = k;
  document.querySelectorAll('[data-djkind]').forEach((b) => b.classList.toggle('on', b.dataset.djkind === k));
  $('#dj-q').placeholder = { yt: 'Cole o link do vídeo ou da playlist do YouTube', audius: 'Nome da música ou artista…', radio: 'Nome da rádio (ex.: Jovem Pan, sertanejo, rock)…', file: 'Procurar nas enviadas…', link: 'Cole o link direto do áudio (https://…mp3)' }[k];
  $('#dj-upload-row').hidden = k !== 'file';
  $('#dj-link-row').hidden = k !== 'link';
  $('#dj-yt-row').hidden = k !== 'yt';
  djSearch();
}
document.querySelectorAll('[data-djkind]').forEach((b) => (b.onclick = () => setDjKind(b.dataset.djkind)));
$('#dj-q').addEventListener('input', () => {
  if (djKind !== 'yt' && /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test($('#dj-q').value.trim())) { setDjKind('yt'); return; }
  clearTimeout(djSearchTimer);
  djSearchTimer = setTimeout(djSearch, 350);
});
$('#dj-search-close').onclick = () => { $('#dj-search').hidden = true; };
$('#dj-add').onclick = openDjSearch;
async function djSearch() {
  const box = $('#dj-results');
  if (djKind === 'link' || djKind === 'yt') { box.innerHTML = ''; return; }
  const q = $('#dj-q').value.trim();
  if (djKind === 'audius' && !q) { box.innerHTML = '<div class="chat-empty">Digite o nome de uma música ou artista. As músicas vêm do Audius, uma plataforma aberta: tem muita coisa de artistas independentes, eletrônica, lo-fi, remixes e covers.</div>'; return; }
  box.innerHTML = '<div class="chat-empty">Procurando…</div>';
  const r = await emitAck('dj-search', { kind: djKind, q });
  if (r?.error) { box.innerHTML = `<div class="chat-empty">${esc(r.error)}</div>`; return; }
  const items = r?.items || [];
  if (!items.length) { box.innerHTML = `<div class="chat-empty">${djKind === 'file' ? 'Nenhuma música enviada ainda. Use "Enviar MP3".' : 'Nada encontrado.'}</div>`; return; }
  box.innerHTML = items.map((t, i) => `<div class="dj-res" data-i="${i}">
      ${t.art ? `<img class="dj-art" src="${esc(t.art)}" alt="">` : `<span class="dj-art dj-art-empty">${t.kind === 'radio' ? '📻' : '🎵'}</span>`}
      <span class="dj-meta"><strong>${esc(t.title)}</strong><small>${esc([t.artist, t.duration ? fmtDur(t.duration) : '', t.live ? 'ao vivo' : ''].filter(Boolean).join(' · '))}</small></span>
      ${t.kind === 'file' && (t.dono === me?.id || isMod()) ? `<button type="button" class="icon-btn" data-del="${t.id}" title="Apagar da biblioteca">${ICON.close}</button>` : ''}
      <button type="button" class="btn small primary" data-add="${i}">Adicionar</button></div>`).join('');
  box._items = items;
}
$('#dj-results').addEventListener('click', async (e) => {
  const d = e.target.closest('[data-del]');
  if (d) {
    if (!confirm('Apagar essa música da biblioteca do DJ?')) return;
    const r = await emitAck('dj-delete-music', { id: Number(d.dataset.del) });
    if (r?.error) toast(r.error); else djSearch();
    return;
  }
  const b = e.target.closest('[data-add]');
  if (!b) return;
  const t = $('#dj-results')._items?.[Number(b.dataset.add)];
  if (t) djAdd(t);
});
$('#dj-yt-add').onclick = async () => {
  const url = $('#dj-q').value.trim();
  if (!/youtu\.?be/i.test(url)) return toast('Cole um link do YouTube (vídeo ou playlist).');
  const btn = $('#dj-yt-add');
  btn.disabled = true;
  try {
    const r = await emitAck('dj-add', { kind: 'yt', url });
    if (r?.error) return toast(r.error);
    toast(`▶ Entrou na fila (${r.position}º).`);
    $('#dj-q').value = '';
  } finally {
    btn.disabled = false;
  }
};
$('#dj-q').addEventListener('keydown', (e) => { if (e.key === 'Enter' && djKind === 'yt') $('#dj-yt-add').click(); });
$('#dj-link-add').onclick = () => {
  const url = $('#dj-q').value.trim();
  if (!/^https:\/\/\S+$/i.test(url)) return toast('Cole um link que comece com https:// (ex.: um .mp3 ou uma rádio).');
  djAdd({ kind: 'link', url, title: url.split('/').pop()?.split('?')[0] || 'Link' });
};
// Enviar um MP3 para a biblioteca do DJ (fica guardado para as próximas vezes)
$('#dj-upload').onclick = () => $('#dj-file').click();
$('#dj-file').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  e.target.value = '';
  if (!f) return;
  if (f.size > 15 * 1024 * 1024) return toast('Arquivo grande demais (máximo 15 MB).');
  const btn = $('#dj-upload');
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  try {
    // descobre a duração
    const dur = await new Promise((ok) => {
      const a = new Audio();
      const url = URL.createObjectURL(f);
      a.onloadedmetadata = () => { URL.revokeObjectURL(url); ok(isFinite(a.duration) ? a.duration : null); };
      a.onerror = () => { URL.revokeObjectURL(url); ok(null); };
      a.src = url;
    });
    const id = await uploadMedia(f);
    if (!id) return;
    const nomeArq = f.name.replace(/\.[^.]+$/, '');
    const title = (prompt('Nome da música:', nomeArq) || '').trim() || nomeArq;
    const artist = (prompt('Artista (pode deixar em branco):', '') || '').trim();
    const r = await emitAck('dj-save', { img: id, title, artist, duration: dur });
    if (r?.error) return toast(r.error);
    toast('🎵 Música guardada na biblioteca do DJ!');
    djSearch();
  } finally {
    btn.disabled = false;
    btn.textContent = '⬆️ Enviar MP3';
  }
});

// ---------- Chat do canal ----------
let chatMsgs = [];
let chatOpen = false;
let chatUnread = 0;
$('#btn-chat .ico').innerHTML = ICON.chat;
$('#chat-close').innerHTML = ICON.close;
$('#btn-chat').onclick = () => setChatOpen(!chatOpen);
$('#chat-close').onclick = () => setChatOpen(false);

function setChatOpen(v) {
  chatOpen = v && !!currentChannel;
  if (chatOpen && dmOpen) setDmOpen(false);
  $('#chat').hidden = !chatOpen;
  document.body.classList.toggle('chat-open', chatOpen);
  if (chatOpen) {
    chatUnread = 0;
    renderChat(true);
    setTimeout(() => $('#chat-input').focus(), 30);
  }
  updateChatBadge();
}

function updateChatBadge() {
  const b = $('#chat-badge');
  b.hidden = chatUnread === 0;
  b.textContent = chatUnread > 99 ? '99+' : String(chatUnread);
  $('#btn-chat').classList.toggle('active', chatOpen);
}

// Mensagem que é só um GIF (dos serviços de GIF conhecidos) vira imagem
const GIF_RE = /^https:\/\/([a-z0-9-]+\.)*(klipy\.com|giphy\.com|tenor\.com|imgur\.com)\/\S+\.(gif|webp)(\?\S*)?$/i;
const isGif = (t) => GIF_RE.test(String(t).trim());
// Foto enviada pelo King Launcher: a mensagem é "img:<código>"
const IMG_RE = /^img:([A-Za-z0-9_-]{16})$/;
const isImg = (t) => IMG_RE.test(String(t).trim());
// Áudio: "aud:<código>:<segundos>"
const AUD_RE = /^aud:([A-Za-z0-9_-]{16}):(\d{1,3})$/;
const isAud = (t) => AUD_RE.test(String(t).trim());
const VM_PLAY = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';
const VM_PAUSE = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z" fill="currentColor"/></svg>';
const fmtSec = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function audHTML(t) {
  const [, id, sec] = String(t).trim().match(AUD_RE);
  return `<div class="voice-msg" data-src="/img/${id}" data-dur="${sec}"><button type="button" class="vm-play" title="Ouvir">${VM_PLAY}</button>
    <div class="vm-bar"><i></i></div><span class="vm-time">${fmtSec(Number(sec))}</span></div>`;
}
const msgHTML = (t) => isAud(t) ? audHTML(t) : isImg(t)
  ? `<img class="chat-photo" src="/img/${String(t).trim().slice(4)}" alt="Foto" loading="lazy">`
  : isGif(t)
    ? `<img class="chat-gif" src="${esc(String(t).trim())}" alt="GIF" loading="lazy">`
    : linkify(t);
const msgPreview = (t) => (isAud(t) ? `🎤 Áudio (${fmtSec(Number(String(t).trim().match(AUD_RE)[2]))})` : isImg(t) ? '📷 Foto' : isGif(t) ? '🎞️ GIF' : t);

// ---------- Mandar fotos (chat da chamada e mensagens diretas) ----------
// A foto é diminuída aqui mesmo (no máximo 1600 px) antes de subir para o servidor
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    // GIF animado vai do jeito que está (se não for enorme)
    if (file.type === 'image/gif' && file.size < 2.5 * 1024 * 1024) return resolve(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('foto'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('foto')); };
    img.src = url;
  });
}
// Sobe a foto/áudio para o servidor; devolve o código (ou null)
async function uploadMedia(blob) {
  try {
    const r = await fetch('/api/img', {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'application/octet-stream', Authorization: `Bearer ${authToken}` },
      body: blob,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) { toast(j.error || 'Não consegui mandar.'); return null; }
    return j.id;
  } catch {
    toast('Não consegui mandar. Confira a internet.');
    return null;
  }
}
async function sendMediaText(text, where, dmTo) {
  if (where === 'chat') {
    const res = await emitAck('chat-send', { text });
    if (res?.error) toast(res.error);
    return;
  }
  const res = await emitAck('dm-send', { to: dmTo, text });
  if (res?.error) return toast(res.error);
  const c = dmContact(dmTo);
  if (c) c.last = res.message;
  if (dmWith === dmTo) { dmMsgs.push(res.message); renderDm(true); }
}

// ---------- Mensagem de áudio ----------
// Toque no 🎤 para gravar, "Enviar" para mandar (no máximo 2 minutos)
const REC_MAX = 120;
let rec = null; // { mr, stream, chunks, start, where, dmTo, form, tick, cancel }
async function startRec(where, form) {
  if (rec) return;
  if (where === 'chat' && !currentChannel) return;
  if (where === 'dm' && !dmWith) return;
  if (!window.MediaRecorder) return toast('Este navegador não grava áudio.');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch {
    return toast('Libere o microfone para gravar áudio.');
  }
  const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
  const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 48000 } : undefined);
  rec = { mr, stream, chunks: [], start: Date.now(), where, dmTo: dmWith, form, cancel: false };
  mr.ondataavailable = (e) => e.data.size && rec?.chunks.push(e.data);
  mr.onstop = async () => {
    const r = rec;
    rec = null;
    clearInterval(r.tick);
    r.stream.getTracks().forEach((t) => t.stop());
    r.form.classList.remove('recording');
    const sec = Math.max(1, Math.round((Date.now() - r.start) / 1000));
    if (r.cancel || (Date.now() - r.start) < 700) return;
    const blob = new Blob(r.chunks, { type: (mr.mimeType || 'audio/webm').split(';')[0] });
    r.form.classList.add('sending');
    const id = await uploadMedia(blob);
    r.form.classList.remove('sending');
    if (id) await sendMediaText(`aud:${id}:${Math.min(sec, REC_MAX)}`, r.where, r.dmTo);
  };
  mr.start(250);
  form.classList.add('recording');
  const t = form.querySelector('.rec-time');
  t.textContent = '0:00';
  rec.tick = setInterval(() => {
    const s = (Date.now() - rec.start) / 1000;
    t.textContent = fmtSec(s);
    if (s >= REC_MAX) stopRec(false);
  }, 250);
}
function stopRec(cancel) {
  if (!rec) return;
  rec.cancel = cancel;
  try { rec.mr.stop(); } catch {}
}
document.querySelectorAll('.rec-btn').forEach((b) => (b.onclick = () => startRec(b.dataset.for, b.closest('form'))));
document.querySelectorAll('.rec-send').forEach((b) => (b.onclick = () => stopRec(false)));
document.querySelectorAll('.rec-cancel').forEach((b) => (b.onclick = () => stopRec(true)));

// Tocador dos áudios (um de cada vez)
let vmAudio = null, vmEl = null;
function vmReset(el) {
  if (!el) return;
  el.classList.remove('playing');
  el.querySelector('.vm-play').innerHTML = VM_PLAY;
  el.querySelector('.vm-bar i').style.width = '0%';
  el.querySelector('.vm-time').textContent = fmtSec(Number(el.dataset.dur));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.vm-play');
  if (!b) return;
  const el = b.closest('.voice-msg');
  if (vmEl === el && vmAudio) {
    if (vmAudio.paused) { vmAudio.play(); el.classList.add('playing'); b.innerHTML = VM_PAUSE; } else { vmAudio.pause(); el.classList.remove('playing'); b.innerHTML = VM_PLAY; }
    return;
  }
  if (vmAudio) { vmAudio.pause(); vmReset(vmEl); }
  vmEl = el;
  vmAudio = new Audio(el.dataset.src);
  const dur = Number(el.dataset.dur) || 1;
  vmAudio.ontimeupdate = () => {
    if (vmEl !== el) return;
    const d = isFinite(vmAudio.duration) && vmAudio.duration > 0 ? vmAudio.duration : dur;
    el.querySelector('.vm-bar i').style.width = `${Math.min(100, (vmAudio.currentTime / d) * 100)}%`;
    el.querySelector('.vm-time').textContent = fmtSec(vmAudio.currentTime);
  };
  vmAudio.onended = () => { vmReset(el); vmAudio = null; vmEl = null; };
  vmAudio.onerror = () => { toast('Não consegui tocar esse áudio.'); vmReset(el); vmAudio = null; vmEl = null; };
  vmAudio.play().catch(() => {});
  el.classList.add('playing');
  b.innerHTML = VM_PAUSE;
});

let photoFor = 'chat';
let photoBusy = false;
async function sendPhoto(file, where) {
  if (!file || !file.type.startsWith('image/')) return toast('Escolha uma foto.');
  if (photoBusy) return;
  const dmTo = dmWith;
  if (where === 'chat' && !currentChannel) return;
  if (where === 'dm' && !dmTo) return;
  photoBusy = true;
  document.querySelectorAll('.photo-btn').forEach((b) => b.classList.add('busy'));
  try {
    const blob = await shrinkPhoto(file);
    const id = await uploadMedia(blob);
    if (id) await sendMediaText(`img:${id}`, where, dmTo);
  } catch {
    toast('Não consegui mandar a foto.');
  } finally {
    photoBusy = false;
    document.querySelectorAll('.photo-btn').forEach((b) => b.classList.remove('busy'));
  }
}
document.querySelectorAll('.photo-btn').forEach((b) => (b.onclick = () => {
  photoFor = b.dataset.for;
  $('#photo-input').click();
}));
$('#photo-input').addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  e.target.value = '';
  if (f) sendPhoto(f, photoFor);
});
// Colar uma foto (Ctrl+V) na caixa de texto também manda
[['#chat-input', 'chat'], ['#dm-input', 'dm']].forEach(([sel, where]) => {
  $(sel).addEventListener('paste', (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    sendPhoto(item.getAsFile(), where);
  });
});
// Tocar na foto abre grande
document.addEventListener('click', (e) => {
  const im = e.target.closest('.chat-photo');
  if (!im) return;
  const v = $('#photo-view');
  v.querySelector('img').src = im.src;
  v.hidden = false;
});
$('#photo-view').onclick = () => { $('#photo-view').hidden = true; };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#photo-view').hidden = true; });
// Quando a foto termina de carregar, continua mostrando a última mensagem
document.addEventListener('load', (e) => {
  if (!e.target.classList?.contains('chat-photo') && !e.target.classList?.contains('chat-gif')) return;
  let box = e.target.parentElement;
  while (box && box.scrollHeight <= box.clientHeight) box = box.parentElement;
  if (box && box.scrollHeight - box.scrollTop - box.clientHeight < e.target.clientHeight + 160) box.scrollTop = box.scrollHeight;
}, true);

// Texto com links clicáveis (sem permitir HTML de ninguém)
function linkify(text) {
  return esc(text).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
}
const hhmm = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function renderChat(scrollDown = false) {
  const list = $('#chat-list');
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
  if (!chatMsgs.length) {
    list.innerHTML = '<div class="chat-empty">Nenhuma mensagem ainda. Diga oi! 👋</div>';
  } else {
    let html = '';
    let prev = null;
    for (const m of chatMsgs) {
      const grouped = prev && prev.from === m.from && m.ts - prev.ts < 5 * 60 * 1000;
      const live = findUser(m.from);
      const u = { name: m.name, avatar: live?.avatar || m.avatar };
      html += grouped
        ? `<div class="chat-msg cont"><div class="chat-text">${msgHTML(m.text)}</div></div>`
        : `<div class="chat-msg">${avatarHTML(u)}<div class="chat-body">
             <div class="chat-meta"><strong>${esc(m.name)}</strong><time>${hhmm(m.ts)}</time></div>
             <div class="chat-text">${msgHTML(m.text)}</div></div></div>`;
      prev = m;
    }
    list.innerHTML = html;
  }
  if (scrollDown || atBottom) list.scrollTop = list.scrollHeight;
}

socket.on('chat', (m) => {
  if (!currentChannel) return;
  chatMsgs.push(m);
  if (chatMsgs.length > 100) chatMsgs.shift();
  if (m.from !== selfId) {
    if (!chatOpen) {
      chatUnread++;
      updateChatBadge();
      const pv = msgPreview(m.text);
    toast(`💬 ${m.name}: ${pv.length > 60 ? pv.slice(0, 60) + '…' : pv}`);
    notifyIfHidden(`💬 ${m.name} (chat do canal)`, pv);
    }
    playSound('mensagem');
  }
  renderChat(m.from === selfId);
});

$('#chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text || !currentChannel) return;
  input.value = '';
  const res = await emitAck('chat-send', { text });
  if (res?.error) { toast(res.error); input.value = text; }
});
async function sendChatText(text) {
  if (!currentChannel) return;
  const res = await emitAck('chat-send', { text });
  if (res?.error) toast(res.error);
}

// ---------- Mensagens diretas ----------
// Conversa particular entre duas contas. Funciona mesmo fora da chamada, e quem
// estiver offline recebe quando voltar.
let dmContacts = [];
let dmUnread = {};      // id da conta -> não lidas
let dmOpen = false;
let dmWith = null;      // id da conta da conversa aberta
let dmMsgs = [];
let dmMore = false;
const back = svg('<path d="M15 18l-6-6 6-6"/>');
$('#btn-dm .ico').innerHTML = ICON.chat;
$('#dm-close').innerHTML = ICON.close;
$('#dm-close2').innerHTML = ICON.close;
$('#dm-back').innerHTML = back;
$('#btn-dm').onclick = () => (dmOpen ? setDmOpen(false) : setDmOpen(true));
$('#dm-close').onclick = $('#dm-close2').onclick = () => setDmOpen(false);
$('#dm-back').onclick = () => { dmWith = null; showDmList(); };
$('#dm-search').addEventListener('input', renderDmContacts);

const dmTotal = () => Object.values(dmUnread).reduce((a, b) => a + b, 0);
function updateDmBadge() {
  const n = dmTotal() + incomingCount();
  const b = $('#dm-badge');
  b.hidden = n === 0;
  b.textContent = n > 99 ? '99+' : String(n);
  $('#btn-dm').classList.toggle('active', dmOpen);
}

function setDmOpen(v, withId = null) {
  if (!loggedIn) return;
  if (v) askNotifyPermission();
  dmOpen = v;
  $('#dm').hidden = !v;
  document.body.classList.toggle('dm-open', v);
  if (v && chatOpen) setChatOpen(false); // os dois ficam no mesmo lugar
  if (v) {
    loadDmContacts().then(() => (withId ? openDm(withId) : showDmList()));
  } else {
    dmWith = null;
  }
  updateDmBadge();
}

async function loadDmContacts() {
  const r = await emitAck('dm-contacts', {});
  if (r?.error) return toast(r.error);
  dmContacts = r.contacts || [];
  dmContacts.forEach((c) => { if (c.friend) friends[c.id] = c.friend; });
  dmUnread = {};
  dmContacts.forEach((c) => { if (c.unread) dmUnread[c.id] = c.unread; });
  renderDmContacts();
  updateDmBadge();
}

const dmTime = (ts) => {
  const d = new Date(ts), now = new Date();
  return d.toDateString() === now.toDateString()
    ? hhmm(ts)
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// Abas da lista: "Conversas" e "Amigos" (amigos, pedidos recebidos/enviados e outras pessoas)
let dmTab = 'convos';
document.querySelectorAll('[data-dmtab]').forEach((b) => (b.onclick = () => {
  dmTab = b.dataset.dmtab;
  document.querySelectorAll('[data-dmtab]').forEach((x) => x.classList.toggle('on', x === b));
  renderDmContacts();
}));
function updateReqCount() {
  const n = Object.values(friends).filter((v) => v === 'incoming').length;
  const b = $('#dm-req-count');
  b.hidden = !n;
  b.textContent = n;
}
function friendRow(c, sub, actions) {
  return `<div class="dm-friend-row" data-id="${c.id}">
    <span class="dm-av">${avatarHTML(c)}<i class="dot ${c.online ? 'on' : ''}"></i></span>
    <span class="dm-info"><strong>${esc(c.name)} ${roleBadge(c.role)}</strong><small class="${!sub && c.online ? 'online' : ''}">${esc(sub || `@${c.username} · ${c.online ? 'online' : 'offline'}`)}</small></span>
    <span class="dm-actions">${actions}</span></div>`;
}
function renderFriendsTab(list) {
  const box = $('#dm-contacts');
  const by = (st) => list.filter((c) => (friends[c.id] || null) === st).sort((a, b) => b.online - a.online || a.name.localeCompare(b.name));
  const incoming = by('incoming'), outgoing = by('outgoing'), amigos = by('friend'), outros = by(null);
  let h = '';
  if (incoming.length) h += `<div class="dm-section">🤝 Pedidos recebidos (${incoming.length})</div>` + incoming.map((c) => friendRow(c, 'quer ser seu amigo',
    `<button type="button" class="btn small ok" data-fa="accept">Aceitar</button><button type="button" class="btn small" data-fa="remove">Recusar</button>`)).join('');
  if (outgoing.length) h += `<div class="dm-section">⏳ Pedidos enviados (${outgoing.length})</div>` + outgoing.map((c) => friendRow(c, 'esperando a resposta',
    `<button type="button" class="btn small" data-fa="remove">Cancelar</button>`)).join('');
  h += `<div class="dm-section">⭐ Amigos (${amigos.length})</div>`;
  if (!amigos.length) h += `<div class="chat-empty">${dmContacts.length ? 'Você ainda não tem amigos. Adicione alguém na lista abaixo!' : 'Ainda não tem outras pessoas aprovadas.'}</div>`;
  h += amigos.map((c) => friendRow(c, null,
    `<button type="button" class="icon-btn" data-fa="dm" title="Mensagem">${ICON.chat}</button><button type="button" class="icon-btn" data-fa="unfriend" title="Desfazer amizade">${ICON.close}</button>`)).join('');
  if (outros.length) h += `<div class="dm-section">👥 Outras pessoas (${outros.length})</div>` + outros.map((c) => friendRow(c, null,
    `<button type="button" class="btn small primary" data-fa="add">➕ Adicionar</button>`)).join('');
  box.innerHTML = h;
}
$('#dm-contacts').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-fa]');
  if (!b) return;
  e.stopPropagation();
  const row = b.closest('.dm-friend-row');
  const id = Number(row.dataset.id);
  const c = dmContact(id);
  const a = b.dataset.fa;
  if (a === 'dm') return openDm(id);
  if (a === 'unfriend') {
    if (!confirm(`Desfazer a amizade com ${c?.name || 'essa pessoa'}?`)) return;
    return friendAction(id, 'remove');
  }
  await friendAction(id, a);
  if (a === 'add') toast(`Pedido de amizade enviado para ${c?.name || ''}.`);
  if (a === 'accept') toast(`🎉 Você e ${c?.name || ''} agora são amigos!`);
}, true);
// clique no resto da linha (nome/foto) abre a conversa
$('#dm-contacts').addEventListener('click', (e) => {
  if (e.target.closest('[data-fa]')) return;
  const row = e.target.closest('.dm-friend-row');
  if (row) openDm(Number(row.dataset.id));
});

function renderDmContacts() {
  updateReqCount();
  const q = $('#dm-search').value.trim().toLowerCase();
  if (dmTab === 'amigos') {
    return renderFriendsTab(dmContacts.filter((c) => !q || c.name.toLowerCase().includes(q) || c.username.includes(q)));
  }
  const list = dmContacts
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.username.includes(q))
    .sort((a, b) => (b.last?.ts || 0) - (a.last?.ts || 0) || b.online - a.online || a.name.localeCompare(b.name));
  const box = $('#dm-contacts');
  if (!list.length) {
    box.innerHTML = `<div class="chat-empty">${dmContacts.length ? 'Ninguém com esse nome.' : 'Ainda não tem outros amigos aprovados.'}</div>`;
    return;
  }
  const reqs = list.filter((c) => friends[c.id] === 'incoming');
  const reqHTML = reqs.length ? `<div class="dm-section">Pedidos de amizade</div>` + reqs.map((c) => `
    <div class="dm-req" data-id="${c.id}">${avatarHTML(c)}<span class="dm-info"><strong>${esc(c.name)}</strong><small>quer ser seu amigo</small></span>
      <button type="button" class="btn small ok" data-req="accept">Aceitar</button><button type="button" class="btn small" data-req="remove">Recusar</button></div>`).join('')
    + '<div class="dm-section">Conversas</div>' : '';
  box.innerHTML = reqHTML + list.map((c) => {
    const n = dmUnread[c.id] || 0;
    const prev = c.last ? `${c.last.from === me?.id ? 'Você: ' : ''}${msgPreview(c.last.text)}` : (c.online ? 'Online agora' : 'Toque para conversar');
    return `<button class="dm-contact ${n ? 'unread' : ''}" data-id="${c.id}">
      <span class="dm-av">${avatarHTML(c)}<i class="dot ${c.online ? 'on' : ''}"></i></span>
      <span class="dm-info"><strong>${esc(c.name)} ${roleBadge(c.role)}${friends[c.id] === 'friend' ? ' <span class="star" title="Amigo">⭐</span>' : ''}</strong><small>${esc(prev.length > 60 ? prev.slice(0, 60) + '…' : prev)}</small></span>
      <span class="dm-meta">${c.last ? `<time>${dmTime(c.last.ts)}</time>` : ''}${n ? `<b class="dm-count">${n}</b>` : ''}</span>
    </button>`;
  }).join('');
}
$('#dm-contacts').addEventListener('click', (e) => {
  const rq = e.target.closest('[data-req]');
  if (rq) return friendAction(Number(rq.closest('.dm-req').dataset.id), rq.dataset.req);
  const b = e.target.closest('.dm-contact');
  if (b) openDm(Number(b.dataset.id));
});

function showDmList() {
  $('#dm-list-view').hidden = false;
  $('#dm-convo-view').hidden = true;
  renderDmContacts();
}

function dmContact(id) { return dmContacts.find((c) => c.id === id); }

async function openDm(id) {
  const c = dmContact(id);
  if (!c) return toast('Essa pessoa não está disponível para conversar.');
  dmWith = id;
  $('#dm-list-view').hidden = true;
  $('#dm-convo-view').hidden = false;
  fillAvatar($('#dm-who-avatar'), c.name, c.avatar);
  $('#dm-who-name').innerHTML = `${esc(c.name)} ${roleBadge(c.role)}`;
  updateDmStatus();
  updateFriendButton();
  dmMsgs = [];
  $('#dm-msgs').innerHTML = '<div class="chat-empty">Carregando…</div>';
  const r = await emitAck('dm-history', { with: id });
  if (dmWith !== id) return;
  if (r?.error) return toast(r.error);
  dmMsgs = r.messages || [];
  dmMore = !!r.more;
  delete dmUnread[id];
  c.unread = 0;
  updateDmBadge();
  renderDm(true);
  setTimeout(() => $('#dm-input').focus(), 30);
}

function updateDmStatus() {
  const c = dmContact(dmWith);
  const st = $('#dm-who-status');
  if (!c) return;
  st.textContent = c.online ? 'Online' : 'Offline — recebe quando entrar';
  st.classList.toggle('on', !!c.online);
}

async function loadOlderDm() {
  if (!dmWith || !dmMsgs.length) return;
  const list = $('#dm-msgs');
  const h0 = list.scrollHeight;
  const r = await emitAck('dm-history', { with: dmWith, before: dmMsgs[0].id });
  if (r?.error) return;
  dmMsgs = [...(r.messages || []), ...dmMsgs];
  dmMore = !!r.more;
  renderDm();
  list.scrollTop = list.scrollHeight - h0;
}

function renderDm(scrollDown = false) {
  const list = $('#dm-msgs');
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
  const c = dmContact(dmWith);
  if (!dmMsgs.length) {
    list.innerHTML = `<div class="chat-empty">Comece a conversa com ${esc(c?.name || '')}! 👋</div>`;
    return;
  }
  let html = dmMore ? '<button class="btn small dm-older" type="button">Carregar mensagens antigas</button>' : '';
  let prev = null;
  const lastMine = [...dmMsgs].reverse().find((m) => m.from === me?.id);
  for (const m of dmMsgs) {
    const mine = m.from === me?.id;
    const u = mine ? { name: myName, avatar: myAvatar } : { name: c?.name || '?', avatar: c?.avatar || '' };
    const grouped = prev && prev.from === m.from && m.ts - prev.ts < 5 * 60 * 1000;
    html += grouped
      ? `<div class="chat-msg cont"><div class="chat-text">${msgHTML(m.text)}</div></div>`
      : `<div class="chat-msg">${avatarHTML(u)}<div class="chat-body">
           <div class="chat-meta"><strong>${esc(u.name)}</strong><time>${dmTime(m.ts)}${new Date(m.ts).toDateString() !== new Date().toDateString() ? ' ' + hhmm(m.ts) : ''}</time></div>
           <div class="chat-text">${msgHTML(m.text)}</div></div></div>`;
    if (m === lastMine && m.read) html += '<div class="dm-seen">✓✓ Visto</div>';
    prev = m;
  }
  list.innerHTML = html;
  list.querySelector('.dm-older')?.addEventListener('click', loadOlderDm);
  if (scrollDown || atBottom) list.scrollTop = list.scrollHeight;
}

async function sendDmText(text) {
  if (!dmWith) return;
  const to = dmWith;
  const r = await emitAck('dm-send', { to, text });
  if (r?.error) return toast(r.error);
  const c = dmContact(to);
  if (c) c.last = r.message;
  if (dmWith === to) { dmMsgs.push(r.message); renderDm(true); }
}

$('#dm-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#dm-input');
  const text = input.value.trim();
  if (!text || !dmWith) return;
  input.value = '';
  const to = dmWith;
  const r = await emitAck('dm-send', { to, text });
  if (r?.error) { toast(r.error); input.value = text; return; }
  const c = dmContact(to);
  if (c) c.last = r.message;
  if (dmWith === to) { dmMsgs.push(r.message); renderDm(true); }
});

socket.on('dm-unread', (u) => {
  dmUnread = {};
  Object.entries(u || {}).forEach(([k, v]) => { dmUnread[Number(k)] = v; });
  updateDmBadge();
});

socket.on('dm', (m) => {
  const other = m.from === me?.id ? m.to : m.from;
  let c = dmContact(other);
  if (!c && m.fromUser && m.from !== me?.id) {
    c = { ...m.fromUser, online: true, unread: 0, last: null };
    dmContacts.push(c);
  }
  if (c) c.last = m;
  const viewing = dmOpen && dmWith === other && !document.hidden;
  if (viewing) {
    dmMsgs.push(m);
    renderDm(m.from === me?.id);
    if (m.from !== me?.id) socket.emit('dm-read', { with: other });
  } else if (m.from !== me?.id) {
    dmUnread[other] = (dmUnread[other] || 0) + 1;
    const pv = msgPreview(m.text);
    toast(`✉️ ${m.fromUser?.name || 'Mensagem'}: ${pv.length > 60 ? pv.slice(0, 60) + '…' : pv}`);
    notifyIfHidden(`✉️ ${m.fromUser?.name || 'Mensagem nova'}`, pv);
    playSound('mensagem', true);
  }
  if (dmOpen && !dmWith) renderDmContacts();
  updateDmBadge();
});

// Quem estava com a conversa aberta e voltou para a aba: marca como lida
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && dmOpen && dmWith && dmUnread[dmWith]) openDm(dmWith);
});

socket.on('dm-read', ({ by }) => {
  if (dmWith !== by) return;
  dmMsgs.forEach((m) => { if (m.from === me?.id) m.read = true; });
  renderDm();
});

socket.on('presence', ({ uid, online }) => {
  const c = dmContact(uid);
  if (!c) return;
  c.online = online;
  if (dmOpen && !dmWith) renderDmContacts();
  if (dmWith === uid) updateDmStatus();
});

// ---------- Amigos ----------
let friends = {}; // id da conta -> 'friend' | 'incoming' | 'outgoing'
const incomingCount = () => Object.values(friends).filter((v) => v === 'incoming').length;

socket.on('friends', (m) => {
  friends = {};
  Object.entries(m || {}).forEach(([k, v]) => { friends[Number(k)] = v; });
  dmContacts.forEach((c) => { c.friend = friends[c.id] || null; });
  updateDmBadge();
  updateReqCount();
  if (dmOpen && !dmWith) renderDmContacts();
  if (dmWith) updateFriendButton();
  if (volTarget && !$('#vol-pop').hidden) renderVolFriend();
});
socket.on('friend-request', ({ name }) => {
  toast(`🤝 ${name} quer ser seu amigo! Veja em Mensagens.`);
  playSound('mensagem', true);
  notifyIfHidden('🤝 Pedido de amizade', `${name} quer ser seu amigo`);
});
socket.on('friend-accepted', ({ name }) => {
  toast(`🎉 Você e ${name} agora são amigos!`);
});

async function friendAction(uid, action) {
  const ev = { add: 'friend-request', accept: 'friend-accept', remove: 'friend-remove' }[action];
  const r = await emitAck(ev, { userId: uid });
  if (r?.error) toast(r.error);
}

function friendLabel(uid) {
  return { friend: '⭐ Amigos', incoming: '✔ Aceitar amizade', outgoing: '⏳ Pedido enviado' }[friends[uid]] || '➕ Adicionar amigo';
}

function updateFriendButton() {
  const b = $('#dm-friend');
  if (!dmWith) return;
  const st = friends[dmWith];
  b.textContent = friendLabel(dmWith);
  b.className = 'btn small dm-friend ' + (st === 'friend' ? 'is-friend' : st === 'incoming' ? 'ok' : st === 'outgoing' ? '' : 'primary');
  b.title = st === 'friend' ? 'Clique para desfazer a amizade' : st === 'outgoing' ? 'Clique para cancelar o pedido' : '';
}
$('#dm-friend').onclick = () => {
  const st = friends[dmWith];
  const c = dmContact(dmWith);
  if (st === 'friend') { if (confirm(`Desfazer a amizade com ${c?.name}?`)) friendAction(dmWith, 'remove'); }
  else if (st === 'outgoing') friendAction(dmWith, 'remove');
  else if (st === 'incoming') friendAction(dmWith, 'accept');
  else friendAction(dmWith, 'add');
};

// ---------- Seletor de emojis e GIFs ----------
const EMOJI_CAT_NAMES = { rostos: 'Carinhas', gestos: 'Gestos', coracoes: 'Corações e festa', jogos: 'Jogos', comida: 'Comida', animais: 'Animais e natureza', objetos: 'Objetos', simbolos: 'Símbolos' };
let emojiCats = [];
let emojiCat = 'rostos';
let pickerFor = null; // 'chat' | 'dm'
let gifTimer = null;
let gifLoaded = '';
fetch('emojis.json').then((r) => r.json()).then((d) => { emojiCats = d; }).catch(() => {});

function openPicker(target, anchor) {
  if (pickerFor === target && !$('#picker').hidden) return closePicker();
  pickerFor = target;
  const p = $('#picker');
  p.hidden = false;
  renderEmojiCats();
  const r = anchor.getBoundingClientRect();
  const w = p.offsetWidth, h = p.offsetHeight;
  p.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
  p.style.top = `${Math.max(8, r.top - h - 8)}px`;
}
function closePicker() { $('#picker').hidden = true; pickerFor = null; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#picker').hidden) closePicker(); });
document.querySelectorAll('.pick-btn').forEach((b) => (b.onclick = () => openPicker(b.dataset.for, b)));
document.addEventListener('pointerdown', (e) => {
  if ($('#picker').hidden) return;
  if (e.target.closest('#picker') || e.target.closest('.pick-btn')) return;
  closePicker();
});
document.querySelectorAll('.picker-tabs button').forEach((b) => (b.onclick = () => {
  document.querySelectorAll('.picker-tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $('#picker-emoji').hidden = b.dataset.tab !== 'emoji';
  $('#picker-gif').hidden = b.dataset.tab !== 'gif';
  if (b.dataset.tab === 'gif') { loadGifs($('#gif-search').value.trim()); setTimeout(() => $('#gif-search').focus(), 30); }
}));

function renderEmojiCats() {
  $('#emoji-cats').innerHTML = emojiCats.map((c) =>
    `<button type="button" data-cat="${c.id}" class="${c.id === emojiCat ? 'on' : ''}" title="${EMOJI_CAT_NAMES[c.id] || ''}">${c.icon}</button>`).join('');
  const cat = emojiCats.find((c) => c.id === emojiCat) || emojiCats[0];
  $('#emoji-grid').innerHTML = cat ? cat.emojis.map((e) => `<button type="button" class="emo">${e}</button>`).join('') : '';
}
$('#emoji-cats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (b) { emojiCat = b.dataset.cat; renderEmojiCats(); $('#emoji-grid').scrollTop = 0; }
});
$('#emoji-grid').addEventListener('click', (e) => {
  const b = e.target.closest('.emo');
  if (!b) return;
  const input = pickerFor === 'dm' ? $('#dm-input') : $('#chat-input');
  const a = input.selectionStart ?? input.value.length, z = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, a) + b.textContent + input.value.slice(z);
  input.focus();
  input.selectionStart = input.selectionEnd = a + b.textContent.length;
});

async function loadGifs(q) {
  if (gifLoaded === q && $('#gif-grid').children.length) return;
  gifLoaded = q;
  const grid = $('#gif-grid');
  grid.innerHTML = '<div class="gif-msg">Carregando…</div>';
  try {
    const r = await fetch(`/api/gifs?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${authToken}` } });
    const d = await r.json();
    if (gifLoaded !== q) return;
    if (d.error) { grid.innerHTML = `<div class="gif-msg">${esc(d.error)}</div>`; gifLoaded = ''; return; }
    grid.innerHTML = d.gifs.length
      ? d.gifs.map((g) => `<button type="button" class="gif" data-url="${esc(g.url)}" title="${esc(g.title)}"><img src="${esc(g.preview)}" alt="${esc(g.title)}" loading="lazy"></button>`).join('')
      : '<div class="gif-msg">Nenhum GIF encontrado.</div>';
  } catch {
    grid.innerHTML = '<div class="gif-msg">Não consegui buscar GIFs agora.</div>';
    gifLoaded = '';
  }
}
$('#gif-search').addEventListener('input', (e) => {
  clearTimeout(gifTimer);
  gifTimer = setTimeout(() => loadGifs(e.target.value.trim()), 400);
});
$('#gif-grid').addEventListener('click', (e) => {
  const b = e.target.closest('.gif');
  if (!b) return;
  const url = b.dataset.url;
  const target = pickerFor;
  closePicker();
  if (target === 'dm') sendDmText(url); else sendChatText(url);
});

// ---------- Avisos do navegador (quando a aba está escondida) ----------
function notifyIfHidden(title, body) {
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: 'logo-fone.svg', silent: true }); } catch {}
}
function askNotifyPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}
// Título da aba pisca quando alguém chama atenção com ela escondida
let titleFlash = null;
function flashTitle(text) {
  if (!document.hidden) return;
  clearInterval(titleFlash);
  let on = false;
  titleFlash = setInterval(() => { document.title = (on = !on) ? text : 'King Launcher'; }, 900);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { clearInterval(titleFlash); document.title = 'King Launcher'; }
});

// ---------- 🍅 Tomate e 👊 Chamar atenção ----------
// Só entre amigos na mesma chamada; cada botão pode ser usado de novo depois de 5 segundos
const FUN = {
  tomato: { emoji: '🍅', label: 'Tomate', sent: (n) => `🍅 Tomate jogado em ${n}!`, got: (f) => `🍅 ${f} jogou um tomate em você!`, seen: (f, t) => `🍅 ${f} jogou um tomate em ${t}!` },
  nudge: { emoji: '👊', label: 'Chamar atenção', sent: (n) => `👊 Você chamou a atenção de ${n}!`, got: (f) => `👊 ${f} está chamando sua atenção!`, seen: (f, t) => `👊 ${f} está chamando a atenção de ${t}!` },
  beer: { emoji: '🍺', label: 'Garrafada', sent: (n) => `🍺 Garrafas jogadas em ${n}!`, got: (f) => `🍺 ${f} jogou garrafas de cerveja em você!`, seen: (f, t) => `🍺 ${f} jogou garrafas de cerveja em ${t}!` },
  smoke: { emoji: '🌿', label: 'Hora de fumar', sent: (n) => `🌿 Hora de fumar com ${n}!`, got: (f) => `🌿 ${f}: hora de fumar!`, seen: (f, t) => `🌿 ${f} chamou ${t} pra fumar!` },
};
const funReadyAt = { tomato: 0, nudge: 0, beer: 0, smoke: 0 };
let funTick = null;
socket.on('connect', () => {
  emitAck('fun-cooldown', {}).then((r) => {
    for (const k of Object.keys(FUN)) funReadyAt[k] = Date.now() + (r?.[k] || 0) * 1000;
  });
});
const funLeft = (k) => Math.max(0, Math.ceil((funReadyAt[k] - Date.now()) / 1000));
const fmtLeft = (sec) => (sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);

function renderVolFriend() {
  const box = $('#vol-friend');
  const u = findUser(volTarget);
  if (!u || !u.uid || u.uid === me?.id) { box.innerHTML = ''; return; }
  const st = friends[u.uid];
  if (st !== 'friend') {
    box.innerHTML = `<button type="button" class="btn small ${st === 'incoming' ? 'ok' : ''}" data-fr="${st || 'none'}">${friendLabel(u.uid)}</button>`;
    return;
  }
  let algum = false;
  box.innerHTML = `<div class="fun-title">⭐ Amigo — brincadeiras</div><div class="fun-btns">${Object.entries(FUN).map(([k, f]) => {
    const l = funLeft(k);
    if (l) algum = true;
    return `<button type="button" class="btn small fun-btn" data-fun="${k}" ${l ? 'disabled' : ''}>${f.emoji} ${l ? fmtLeft(l) : f.label}</button>`;
  }).join('')}</div>`;
  clearInterval(funTick);
  if (algum) funTick = setInterval(() => { if ($('#vol-pop').hidden) clearInterval(funTick); else renderVolFriend(); }, 1000);
}
$('#vol-friend').addEventListener('click', async (e) => {
  const u = findUser(volTarget);
  if (!u) return;
  const fr = e.target.closest('[data-fr]');
  if (fr) {
    const st = fr.dataset.fr;
    if (st === 'incoming') friendAction(u.uid, 'accept');
    else if (st === 'outgoing') friendAction(u.uid, 'remove');
    else { await friendAction(u.uid, 'add'); toast(`Pedido de amizade enviado para ${u.name}.`); }
    return;
  }
  const b = e.target.closest('[data-fun]');
  if (!b) return;
  const kind = b.dataset.fun;
  const r = await emitAck('fun', { to: volTarget, kind });
  if (r?.wait) funReadyAt[kind] = Date.now() + r.wait * 1000;
  if (r?.error && !r.wait) toast(r.error);
  else if (r?.ok) toast(FUN[kind].sent(u.name));
  renderVolFriend();
});

socket.on('fun', ({ kind, from }) => {
  const W = funEnv().win;
  if (kind === 'tomato') {
    // 3 tomates seguidos, cada um de um lado
    throwTomato();
    W.setTimeout(throwTomato, 300);
    W.setTimeout(throwTomato, 600);
    toast(`🍅 ${from} jogou um tomate em você!`);
    notifyIfHidden('🍅 Tomatada!', `${from} jogou um tomate em você!`);
    flashTitle(`🍅 ${from} te acertou!`);
  } else if (kind === 'beer') {
    // 3 garrafas seguidas
    throwBottle();
    W.setTimeout(throwBottle, 320);
    W.setTimeout(throwBottle, 640);
    toast(FUN.beer.got(from));
    notifyIfHidden('🍺 Garrafada!', `${from} jogou garrafas de cerveja em você!`);
    flashTitle(`🍺 ${from} te acertou!`);
  } else if (kind === 'smoke') {
    smokeTime(from);
    notifyIfHidden('🌿 Hora de fumar!', `${from} chamou você pra fumar!`);
    flashTitle(`🌿 ${from}: hora de fumar!`);
  } else {
    nudge(from);
    notifyIfHidden('👊 Toc toc!', `${from} está chamando sua atenção!`);
    flashTitle(`👊 ${from} chamou você!`);
  }
});
socket.on('fun-shown', ({ kind, from, to }) => {
  if (FUN[kind]) toast(FUN[kind].seen(from, to));
});

// Onde as brincadeiras são desenhadas (a página inteira)
function funEnv() {
  return { win: window, doc: document, layer: $('#fun-layer'), shake: document.querySelector('.app') };
}

// O tomate voa em arco, achata ao bater, espirra gotinhas, mancha a tela e escorre
const rnd = (a, b) => a + Math.random() * (b - a);
function throwTomato() {
  const E = funEnv();
  const layer = E.layer;
  const W = E.win.innerWidth, H = E.win.innerHeight;
  const tx = W * rnd(0.2, 0.8), ty = H * rnd(0.2, 0.65);
  const fromLeft = Math.random() < 0.5;
  const x0 = fromLeft ? -140 : W + 40, y0 = H * rnd(0.55, 1);
  const spin = (fromLeft ? 1 : -1) * rnd(540, 900);

  // voo: anda em linha reta para o lado, sobe e desce em arco, gira e cresce (vem na sua direção)
  const fly = E.doc.createElement('div');
  fly.className = 'fx-fly';
  fly.innerHTML = '<span class="fx-tom">🍅</span>';
  layer.appendChild(fly);
  const frames = [];
  for (let k = 0; k <= 16; k++) {
    const p = k / 16;
    const x = x0 + (tx - x0) * p, y = y0 + (ty - y0) * p - Math.sin(Math.PI * p) * H * 0.22;
    frames.push({ transform: `translate(${x - 60}px, ${y - 60}px) rotate(${spin * p}deg) scale(${0.55 + p * 0.9})` });
  }
  const DUR = 560;
  fly.animate(frames, { duration: DUR, easing: 'cubic-bezier(.35,.1,.55,1)', fill: 'forwards' });

  E.win.setTimeout(() => {
    // achata ao bater
    fly.firstElementChild.animate(
      [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.7, .45)', opacity: 0.9 }, { transform: 'scale(1.9, .3)', opacity: 0 }],
      { duration: 110, fill: 'forwards' });
    E.win.setTimeout(() => fly.remove(), 120);
    playSound('tomate', true);
    splatAt(layer, tx, ty, Math.min(W, H) * rnd(0.36, 0.5));
  }, DUR);
}

// Fio escorrendo "de verdade": sai largo da mancha, vai afinando e ondulando,
// desce cada vez mais devagar e leva uma gota gorda e brilhante na ponta
const DRIP_TOMATE = ['#7d0907', '#c41f19', '#ff6b5b', '#a3100c'];
let dripSeq = 0;
function makeDrip(x, y, w, L, pal, dur, delay) {
  const id = `dr${++dripSeq}`;
  const W = w * 3, cx = W / 2, H = L + w * 2;
  const ph = rnd(0, 6.28), fq = rnd(1.5, 3.2), ph2 = rnd(0, 6.28);
  const half = (t) => (w / 2) * (1 - 0.5 * t) * (1 + 0.14 * Math.sin(t * 9 + ph2)) + (t < 0.14 ? w * 0.75 * (1 - t / 0.14) ** 2 : 0);
  const wob = (t, p) => Math.sin(t * fq * 6.28 + p) * w * 0.17 * Math.min(1, t * 4);
  const N = 28, L1 = [], R1 = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, yy = t * L;
    L1.push(`${(cx - half(t) + wob(t, ph)).toFixed(1)} ${yy.toFixed(1)}`);
    R1.push(`${(cx + half(t) + wob(t, ph2)).toFixed(1)} ${yy.toFixed(1)}`);
  }
  const body = `M${L1.join(' L')} L${R1.reverse().join(' L')} Z`;
  const hl = [];
  for (let i = 3; i <= N - 2; i++) { const t = i / N; hl.push(`${(cx - half(t) * 0.35 + wob(t, ph) * 0.5).toFixed(1)} ${(t * L).toFixed(1)}`); }
  const el = funEnv().doc.createElement('div');
  el.className = 'fx-drip2';
  el.style.left = `${x - cx}px`;
  el.style.top = `${y}px`;
  el.style.width = `${W}px`;
  el.style.height = `${H}px`;
  el.innerHTML = `<svg class="fx-drip-body" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset=".38" stop-color="${pal[1]}"/>
      <stop offset=".55" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[0]}"/></linearGradient></defs>
      <path d="${body}" fill="url(#${id})"/>
      <path d="M${hl.join(' L')}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="${(w * 0.16).toFixed(1)}" stroke-linecap="round"/>
    </svg>
    <svg class="fx-drip-bulb" width="${W}" height="${w * 2.4}" viewBox="0 0 ${W} ${w * 2.4}" style="top:${-w * 1.2}px">
      <defs><radialGradient id="${id}b" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="${pal[2]}"/><stop offset=".45" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[3]}"/></radialGradient></defs>
      <path d="M${cx - w * 0.26} ${w * 0.35} C ${cx - w * 0.95} ${w * 1.2}, ${cx - w * 0.78} ${w * 2.3}, ${cx} ${w * 2.3}
        C ${cx + w * 0.78} ${w * 2.3}, ${cx + w * 0.95} ${w * 1.2}, ${cx + w * 0.26} ${w * 0.35} Z" fill="url(#${id}b)"/>
      <ellipse cx="${cx - w * 0.28}" cy="${w * 1.55}" rx="${w * 0.15}" ry="${w * 0.26}" fill="#fff" fill-opacity=".55"/>
    </svg>`;
  // desce rápido no começo e vai freando (como líquido grosso)
  const ease = 'cubic-bezier(.25,.6,.35,1)';
  el.firstElementChild.animate([{ clipPath: `inset(0 0 ${H}px 0)` }, { clipPath: `inset(0 0 ${H - L}px 0)` }],
    { duration: dur, delay, easing: ease, fill: 'both' });
  el.lastElementChild.animate([
    { transform: `translateY(${w * 0.3}px) scale(.3)` },
    { transform: `translateY(${L * 0.18}px) scale(1)`, offset: 0.18 },
    { transform: `translateY(${L}px) scale(1.12)` },
  ], { duration: dur, delay, easing: ease, fill: 'both' });
  return el;
}

function splatAt(layer, x, y, size) {
  const E = funEnv();
  const wrap = E.doc.createElement('div');
  wrap.className = 'fx-splat-wrap';
  wrap.style.left = `${x}px`;
  wrap.style.top = `${y}px`;
  // a mancha
  const img = E.doc.createElement('img');
  img.src = `fx/splat${1 + Math.floor(Math.random() * 3)}.svg`;
  img.className = 'fx-splat';
  img.style.width = img.style.height = `${size}px`;
  img.style.left = img.style.top = `${-size / 2}px`;
  const rot = rnd(0, 360);
  img.animate([
    { transform: `rotate(${rot}deg) scale(.25)` },
    { transform: `rotate(${rot}deg) scale(1.12)`, offset: 0.6 },
    { transform: `rotate(${rot}deg) scale(1)` },
  ], { duration: 200, easing: 'ease-out', fill: 'forwards' });
  wrap.appendChild(img);
  // gotinhas voando para os lados (com "gravidade")
  for (let k = 0; k < 14; k++) {
    const d = E.doc.createElement('i');
    d.className = 'fx-drop';
    const s = rnd(6, 16);
    d.style.width = d.style.height = `${s}px`;
    d.style.left = d.style.top = `${-s / 2}px`;
    const a = rnd(0, Math.PI * 2), dist = rnd(size * 0.45, size * 1.05);
    const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist;
    d.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.75}px, ${dy * 0.75 - 30}px) scale(.9)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy + 70}px) scale(.5)`, opacity: 0 },
    ], { duration: rnd(520, 760), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
    wrap.appendChild(d);
  }
  // fios de molho escorrendo, com uma gota na ponta
  const n = 3 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) {
    wrap.appendChild(makeDrip(rnd(-size * 0.3, size * 0.3), rnd(size * 0.08, size * 0.22), rnd(9, 17),
      rnd(80, size * 0.95), DRIP_TOMATE, rnd(2600, 3800), rnd(250, 800)));
  }
  layer.appendChild(wrap);
  // vai escorregando e some
  wrap.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(0)', opacity: 1, offset: 0.7 },
    { transform: 'translateY(40px)', opacity: 0 }], { duration: 5600, easing: 'ease-in', fill: 'forwards' });
  E.win.setTimeout(() => wrap.remove(), 5700);
}

// 🍺 A garrafa voa girando e estoura na tela: vidro trincado, cacos e respingo de cerveja com espuma
function throwBottle() {
  const E = funEnv();
  const layer = E.layer;
  const W = E.win.innerWidth, H = E.win.innerHeight;
  const tx = W * rnd(0.2, 0.8), ty = H * rnd(0.2, 0.62);
  const fromLeft = Math.random() < 0.5;
  const x0 = fromLeft ? -120 : W + 40, y0 = H * rnd(0.55, 1);
  const spin = (fromLeft ? 1 : -1) * rnd(600, 1000);
  const fly = E.doc.createElement('div');
  fly.className = 'fx-fly fx-bottle-fly';
  fly.innerHTML = '<img src="fx/garrafa.svg" class="fx-bottle" alt="">';
  layer.appendChild(fly);
  const frames = [];
  for (let k = 0; k <= 16; k++) {
    const p = k / 16;
    const x = x0 + (tx - x0) * p, y = y0 + (ty - y0) * p - Math.sin(Math.PI * p) * H * 0.24;
    frames.push({ transform: `translate(${x - 60}px, ${y - 60}px) rotate(${spin * p}deg) scale(${0.5 + p * 0.85})` });
  }
  const DUR = 540;
  fly.animate(frames, { duration: DUR, easing: 'cubic-bezier(.35,.1,.55,1)', fill: 'forwards' });
  E.win.setTimeout(() => {
    fly.remove();
    playSound('vidro', true);
    const size = Math.min(W, H) * rnd(0.42, 0.56);
    const wrap = E.doc.createElement('div');
    wrap.className = 'fx-splat-wrap';
    wrap.style.left = `${tx}px`;
    wrap.style.top = `${ty}px`;
    // cerveja espalhada (atrás) e o vidro trincado (na frente)
    const beer = E.doc.createElement('img');
    beer.src = `fx/cerveja${1 + Math.floor(Math.random() * 3)}.svg`;
    beer.className = 'fx-splat';
    const bs = size * 1.05;
    beer.style.width = beer.style.height = `${bs}px`;
    beer.style.left = beer.style.top = `${-bs / 2}px`;
    const r1 = rnd(0, 360);
    beer.animate([{ transform: `rotate(${r1}deg) scale(.2)` }, { transform: `rotate(${r1}deg) scale(1.1)`, offset: 0.6 },
      { transform: `rotate(${r1}deg) scale(1)` }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
    wrap.appendChild(beer);
    const crack = E.doc.createElement('img');
    crack.src = `fx/vidro${1 + Math.floor(Math.random() * 2)}.svg`;
    crack.className = 'fx-crack';
    crack.style.width = crack.style.height = `${size * 1.25}px`;
    crack.style.left = crack.style.top = `${-size * 0.625}px`;
    crack.style.transform = `rotate(${rnd(0, 360)}deg)`;
    crack.animate([{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }], { duration: 140, easing: 'ease-out', fill: 'forwards' });
    wrap.appendChild(crack);
    // cacos de vidro marrom voando com gravidade
    for (let k = 0; k < 16; k++) {
      const c = E.doc.createElement('i');
      c.className = 'fx-shard';
      const w = rnd(8, 22), h = rnd(10, 30);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      c.style.left = `${-w / 2}px`;
      c.style.top = `${-h / 2}px`;
      const a = rnd(0, Math.PI * 2), dist = rnd(size * 0.4, size * 1.1);
      const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist, rot = rnd(-720, 720);
      c.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.7}px, ${dy * 0.7 - 40}px) rotate(${rot * 0.6}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy + 160}px) rotate(${rot}deg)`, opacity: 0 },
      ], { duration: rnd(650, 1000), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
      wrap.appendChild(c);
    }
    // gotas de cerveja com espuma
    for (let k = 0; k < 12; k++) {
      const d = E.doc.createElement('i');
      d.className = 'fx-drop fx-beer-drop';
      const sz = rnd(6, 15);
      d.style.width = d.style.height = `${sz}px`;
      d.style.left = d.style.top = `${-sz / 2}px`;
      const a = rnd(0, Math.PI * 2), dist = rnd(size * 0.4, size * 0.95);
      const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist;
      d.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.75}px, ${dy * 0.75 - 30}px) scale(.9)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy + 70}px) scale(.5)`, opacity: 0 },
      ], { duration: rnd(520, 760), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
      wrap.appendChild(d);
    }
    layer.appendChild(wrap);
    // tranco na tela
    E.shake.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-7px,4px)' }, { transform: 'translate(6px,-3px)' }, { transform: 'translate(0,0)' }], { duration: 180 });
    wrap.animate([{ opacity: 1 }, { opacity: 1, offset: 0.72 }, { opacity: 0 }], { duration: 5800, easing: 'ease-in', fill: 'forwards' });
    E.win.setTimeout(() => wrap.remove(), 5900);
  }, DUR);
}

// Desenho do baseado (papel creme com dobrinhas; a ponta acesa fica marrom-arroxeada com brasa)
// Tudo em "unidades": o baseado inteiro tem 400 de comprimento e 80 de altura.
const J_ANG = -38;
function jointData() {
  const creases = [];
  for (let x = 40; x < 390; x += rnd(26, 40)) creases.push([x, rnd(16, 34), rnd(-4, 6), Math.random() < 0.5 ? 1 : -1]);
  const spots = [];
  for (let k = 0; k < 16; k++) spots.push([rnd(0, 1) ** 1.6, rnd(-0.9, 0.9), rnd(3.5, 8), rnd(2.5, 5.5), k % 3, rnd(0, 6.28), rnd(5, 11)]);
  return { ph: rnd(0, 6.28), w1: rnd(0, 6.28), w2: rnd(0, 6.28), creases, spots };
}
const jR = (J, x) => 13 + 21 * Math.pow(Math.max(0, x) / 400, 0.6) + 1.3 * Math.sin((x / 400) * 9 + J.ph);
function jointPath(g, J, len) {
  const cy = 40, r0 = jR(J, 0), x0 = r0 * 0.9;
  const re = jR(J, len), capR = re * 0.45, xe = Math.max(x0 + 1, len - capR);
  g.beginPath();
  g.moveTo(x0, cy - r0);
  for (let x = x0 + 8; x < xe; x += 8) g.lineTo(x, cy - jR(J, x));
  g.lineTo(xe, cy - re);
  g.bezierCurveTo(xe + capR * 1.33, cy - re, xe + capR * 1.33, cy + re, xe, cy + re);
  for (let x = xe - 8; x > x0; x -= 8) g.lineTo(x, cy + jR(J, x));
  g.lineTo(x0, cy + r0);
  g.arc(x0, cy, r0, Math.PI / 2, Math.PI * 1.5, false);
  g.closePath();
}
function drawJoint(g, J, len, lit, t) {
  const cy = 40, x0 = jR(J, 0) * 0.9, re = jR(J, len);
  g.clearRect(-30, -40, 500, 170);
  // brilho da brasa (atrás)
  if (lit) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 1400 * Math.PI * 2);
    const gr = g.createRadialGradient(len - 4, cy, 0, len - 4, cy, re * (1.5 + 0.5 * pulse));
    gr.addColorStop(0, `rgba(255,110,30,${0.45 + 0.25 * pulse})`);
    gr.addColorStop(1, 'rgba(255,110,30,0)');
    g.fillStyle = gr;
    g.fillRect(len - 50, -20, 100, 120);
  }
  jointPath(g, J, len);
  g.fillStyle = '#ece5ce';
  g.fill();
  g.save();
  jointPath(g, J, len);
  g.clip();
  // brilho comprido do papel
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(250,248,236,.9)';
  g.lineWidth = 9;
  g.beginPath();
  for (let x = x0 + 6; x < len - 12; x += 8) { const y = cy - jR(J, x) * 0.42; x === x0 + 6 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  // dobrinhas do papel
  g.strokeStyle = '#c9c2aa';
  g.lineWidth = 2.4;
  for (const [x, l, dy, side] of J.creases) {
    if (x > len - 14) continue;
    const r = jR(J, x);
    g.beginPath();
    if (side > 0) { g.moveTo(x, cy - r + 1); g.quadraticCurveTo(x + l * 0.4, cy - r * 0.55, x + l, cy - r * 0.2 + dy); }
    else { g.moveTo(x, cy + r - 1); g.quadraticCurveTo(x + l * 0.45, cy + r * 0.6, x + l, cy + r * 0.25 + dy); }
    g.stroke();
  }
  // ponta queimada: faixa marrom-arroxeada com borda ondulada
  if (lit) {
    const cs = Math.max(x0, len - 38);
    const gr = g.createLinearGradient(cs, 0, len, 0);
    gr.addColorStop(0, '#8d6f68');
    gr.addColorStop(0.5, '#765861');
    gr.addColorStop(1, '#55394a');
    g.fillStyle = gr;
    g.beginPath();
    for (let y = -2; y <= 82; y += 3) {
      const x = cs + 5 * Math.sin(y * 0.22 + J.w1) + 3 * Math.sin(y * 0.55 + J.w2);
      y === -2 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.lineTo(len + 10, 82);
    g.lineTo(len + 10, -2);
    g.closePath();
    g.fill();
    // pedacinhos de brasa piscando
    const cols = ['#e5261a', '#ff8b1f', '#ffb33b'];
    for (const [dx, dy, w, h, c, ph, sp] of J.spots) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * sp + ph));
      g.globalAlpha = a;
      g.fillStyle = cols[c];
      const x = len - 4 - dx * 16, y = cy + dy * re * 0.75;
      g.beginPath();
      g.roundRect ? g.roundRect(x - w / 2, y - h / 2, w, h, 1.5) : g.rect(x - w / 2, y - h / 2, w, h);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  g.restore();
  // contorno
  jointPath(g, J, len);
  g.strokeStyle = '#bcb59e';
  g.lineWidth = 3.8;
  g.lineJoin = 'round';
  g.stroke();
}

// 🌿 Hora de fumar: o baseado sobe, é aceso, queima até o fim e a fumaça toma conta da tela
let smoking = false;
function smokeTime(from) {
  if (smoking) return;
  smoking = true;
  const E = funEnv();
  const layer = E.layer;
  const box = E.doc.createElement('div');
  box.className = 'fx-smoke';
  box.innerHTML = `<div class="fx-fog"></div>
    <div class="fx-smoke-text">🌿 <b>${esc(from)}</b>: hora de fumar!</div>
    <div class="fx-joint">
      <canvas class="fx-joint-cv"></canvas><i class="fx-ember"></i>
    </div>`;
  layer.appendChild(box);
  const joint = box.querySelector('.fx-joint');
  const cv = box.querySelector('.fx-joint-cv');
  const J = jointData();
  const t0 = performance.now();
  const fog = box.querySelector('.fx-fog');
  // nuvens grandes que vão tomando a tela
  for (let k = 0; k < 14; k++) {
    const c = E.doc.createElement('i');
    c.className = 'fx-cloud';
    const s = rnd(0.45, 0.9) * Math.max(E.win.innerWidth, E.win.innerHeight);
    c.style.width = c.style.height = `${s}px`;
    c.style.left = `${rnd(-0.25, 0.95) * E.win.innerWidth - s / 2 + s * 0.25}px`;
    c.style.top = `${rnd(-0.2, 1.0) * E.win.innerHeight - s / 2 + s * 0.2}px`;
    c.animate([{ transform: 'translate(0,0) scale(.8)' }, { transform: `translate(${rnd(-80, 80)}px, ${rnd(-140, -40)}px) scale(1.15)` }],
      { duration: rnd(9000, 12000), easing: 'ease-out', fill: 'forwards' });
    fog.appendChild(c);
  }
  // o baseado sobe
  joint.animate([{ transform: `translate(-50%, 160px) rotate(${J_ANG}deg)`, opacity: 0 }, { transform: `translate(-50%, 0) rotate(${J_ANG}deg)`, opacity: 1 }],
    { duration: 600, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' });
  E.win.setTimeout(() => playSound('isqueiro', true), 300);
  const BURN0 = 800, BURN = 6800;
  // acende e vai queimando até o filtro
  // desenha o baseado queimando, quadro a quadro
  const dpr = Math.min(2, E.win.devicePixelRatio || 1);
  cv.width = Math.round(joint.offsetWidth * dpr);
  cv.height = Math.round(joint.offsetHeight * dpr);
  const g = cv.getContext('2d');
  // a tela de desenho sobra um pouco em volta (para o brilho e a ponta arredondada)
  g.setTransform(cv.width / 440, 0, 0, cv.height / 128, (20 / 440) * cv.width, (24 / 128) * cv.height);
  const tipMark = box.querySelector('.fx-ember');
  const frame = () => {
    if (!box.isConnected) return;
    const t = performance.now() - t0;
    const p = Math.min(1, Math.max(0, (t - BURN0) / BURN));
    const len = 400 * (1 - 0.8 * p);
    drawJoint(g, J, len, t > BURN0 - 200, t);
    tipMark.style.left = `${(len / 400) * 100}%`;
    E.win.requestAnimationFrame(frame);
  };
  E.win.requestAnimationFrame(frame);
  fog.animate([{ opacity: 0 }, { opacity: 0, offset: 0.08 }, { opacity: 0.93, offset: 0.62 }, { opacity: 0.93, offset: 0.78 }, { opacity: 0 }],
    { duration: 11500, easing: 'ease-in-out', fill: 'forwards' });
  // fumacinha saindo da ponta
  const ember = box.querySelector('.fx-ember');
  const puff = E.win.setInterval(() => {
    const r = ember.getBoundingClientRect();
    if (!r.width) return;
    const p = E.doc.createElement('i');
    p.className = 'fx-puff';
    const s = rnd(30, 60);
    p.style.width = p.style.height = `${s}px`;
    p.style.left = `${r.left + r.width / 2 - s / 2}px`;
    p.style.top = `${r.top - s / 2}px`;
    const dx = rnd(-90, 90), up = rnd(220, 420);
    p.animate([
      { transform: 'translate(0,0) scale(.4)', opacity: 0 },
      { transform: `translate(${dx * 0.3}px, ${-up * 0.25}px) scale(1.2)`, opacity: 0.75, offset: 0.2 },
      { transform: `translate(${dx}px, ${-up}px) scale(${rnd(3, 4.5)})`, opacity: 0 },
    ], { duration: rnd(2200, 3200), easing: 'ease-out', fill: 'forwards' });
    box.appendChild(p);
    E.win.setTimeout(() => p.remove(), 3300);
  }, 110);
  // cinza caindo
  const ashTick = E.win.setInterval(() => {
    const r = ember.getBoundingClientRect();
    if (!r.width) return;
    const a = E.doc.createElement('i');
    a.className = 'fx-ashbit';
    a.style.left = `${r.left + rnd(-4, 4)}px`;
    a.style.top = `${r.top + r.height * 0.6}px`;
    a.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${rnd(-20, 20)}px, ${rnd(120, 220)}px) rotate(${rnd(-200, 200)}deg)`, opacity: 0 }],
      { duration: rnd(900, 1400), easing: 'ease-in', fill: 'forwards' });
    box.appendChild(a);
    E.win.setTimeout(() => a.remove(), 1500);
  }, 650);
  E.win.setTimeout(() => E.win.clearInterval(ashTick), BURN0 + BURN);
  E.win.setTimeout(() => E.win.clearInterval(puff), BURN0 + BURN - 300);
  // sobrou a pontinha: sai girando em arco, como quem joga a bituca fora
  E.win.setTimeout(() => {
    const W = E.win.innerWidth, H = E.win.innerHeight;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const frames = [];
    for (let k = 0; k <= 20; k++) {
      const p = k / 20;
      const dx = dir * W * 0.75 * p;
      const dy = -H * 0.42 * Math.sin(Math.PI * p * 0.85) + H * 0.9 * p * p;
      frames.push({ transform: `translate(-50%, 0) translate(${dx}px, ${dy}px) rotate(${J_ANG + dir * 1080 * p}deg) scale(${1 - 0.25 * p})` });
    }
    joint.animate(frames, { duration: 1150, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' });
  }, BURN0 + BURN + 150);
  E.win.setTimeout(() => { box.remove(); smoking = false; }, 11600);
}

// Mão batendo "toc toc" e a tela tremendo (igual ao MSN)
function nudge(from) {
  const E = funEnv();
  const layer = E.layer;
  const box = E.doc.createElement('div');
  box.className = 'fx-nudge';
  box.innerHTML = `<div class="fx-fist"><i class="fx-hit h1"></i><i class="fx-hit h2"></i><span class="fist-emoji">👊</span></div>
    <div class="fx-nudge-text"><b>${esc(from)}</b> está chamando sua atenção!</div>`;
  layer.appendChild(box);
  playSound('toctoc', true);
  // duas batidas "no vidro" (0,25 s e 0,47 s) e depois a tela treme
  E.win.setTimeout(() => {
    const app = E.shake;
    app.classList.remove('shake');
    void app.offsetWidth;
    app.classList.add('shake');
    E.win.setTimeout(() => app.classList.remove('shake'), 650);
  }, 620);
  E.win.setTimeout(() => box.classList.add('out'), 2300);
  E.win.setTimeout(() => box.remove(), 2700);
}

// Do cartão de um amigo na chamada: "Mandar mensagem"
$('#vol-dm').onclick = () => {
  const u = findUser(volTarget);
  closeVolume();
  if (u?.uid) setDmOpen(true, u.uid);
};

// ---------- Medidor da transmissão (FPS, resolução, atraso) ----------
// Mostra em cada transmissão como ela está chegando de verdade, para saber
// se o problema é a internet, o computador de quem transmite ou nada.
const LIMIT_LABEL = { bandwidth: 'internet', cpu: 'processador', other: 'outro' };
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
// Celular em pé manda 720x1600: o "p" é sempre o lado menor (720p)
const resText = (w, h) => `${Math.min(w || h, h || w)}p`;
// Sem mudança na tela não há quadros novos para enviar (ex.: tela inicial parada)
const fpsText = (fps) => (fps < 1 ? 'imagem parada' : `${Math.round(fps)} FPS`);

async function updateScreenStats() {
  for (const [id, el] of screenCards) {
    const box = el.querySelector('.screen-stats');
    if (!box) continue;
    try {
      if (id === selfId) {
        // Minha transmissão: como está saindo para quem assiste
        let fps = 0, h = 0, w = 0, lim = '', viewers = 0;
        for (const peer of peers.values()) {
          const v = peer.screenSenders.find((sd) => sd.track?.kind === 'video');
          if (!v) continue;
          viewers++;
          (await v.getStats()).forEach((r) => {
            if (r.type === 'outbound-rtp') {
              fps = Math.max(fps, num(r.framesPerSecond));
              h = Math.max(h, num(r.frameHeight));
              w = Math.max(w, num(r.frameWidth));
              if (r.qualityLimitationReason && r.qualityLimitationReason !== 'none') lim = r.qualityLimitationReason;
            }
          });
        }
        box.textContent = viewers === 0
          ? 'Ninguém assistindo ainda'
          : `${viewers} assistindo · ${fpsText(fps)} · ${resText(w, h)}` + (lim ? ` · limitado pelo ${LIMIT_LABEL[lim] || lim}` : '');
        box.className = 'screen-stats' + (lim ? ' warn' : '');
        continue;
      }
      const peer = peers.get(id);
      const scrIds = new Set(peer?.screenStream?.getVideoTracks().map((t) => t.id) || []);
      const recv = peer?.pc.getReceivers().find((r) => r.track?.kind === 'video' && r.track.readyState === 'live' && scrIds.has(r.track.id));
      if (!peer || !recv) { box.textContent = ''; continue; }
      let fps = 0, h = 0, w = 0, jb = 0, rtt = 0, lost = 0, got = 0;
      (await recv.getStats()).forEach((r) => {
        if (r.type === 'inbound-rtp') {
          fps = num(r.framesPerSecond);
          h = num(r.frameHeight);
          w = num(r.frameWidth);
          // atraso do "estoque" de quadros no ÚLTIMO segundo (não a média desde o começo)
          const delayTot = num(r.jitterBufferDelay), emitted = num(r.jitterBufferEmittedCount);
          const prev = el._jb || { d: 0, n: 0 };
          const dn = emitted - prev.n;
          jb = dn > 0 ? ((delayTot - prev.d) / dn) * 1000 : (emitted ? (delayTot / emitted) * 1000 : 0);
          el._jb = { d: delayTot, n: emitted };
          // perda também do último segundo
          const pl = el._pl || { lost: 0, got: 0 };
          lost = Math.max(0, num(r.packetsLost) - pl.lost);
          got = Math.max(0, num(r.packetsReceived) - pl.got);
          el._pl = { lost: num(r.packetsLost), got: num(r.packetsReceived) };
        }
        if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') {
          rtt = num(r.currentRoundTripTime) * 1000;
        }
      });
      // atraso aproximado = metade do "ida e volta" da rede + o que fica guardado para tocar liso
      const delay = Math.round(rtt / 2 + jb);
      const lossPct = got + lost > 0 ? (lost / (got + lost)) * 100 : 0;
      box.textContent = `${fpsText(fps)} · ${resText(w, h)} · atraso ~${delay} ms` + (lossPct > 2 ? ` · perda ${lossPct.toFixed(0)}%` : '');
      box.className = 'screen-stats' + ((fps >= 1 && fps < 20) || delay > 400 || lossPct > 2 ? ' warn' : '');
      showSenderDiagnosis(el, id, peer, fps);
    } catch {}
  }
}
setInterval(updateScreenStats, 1000);

// Explica, em português, onde está o gargalo (do lado de quem transmite)
function showSenderDiagnosis(el, id, peer, fpsHere) {
  const box = el.querySelector('.screen-sender');
  if (!box) return;
  const st = peer.remoteStats;
  if (!st || Date.now() - st.at > 8000) { box.textContent = ''; return; }
  const who = nameOf(id);
  const mbps = st.bwe ? (st.bwe / 1e6).toFixed(1).replace('.', ',') : null;
  let msg = '', warn = false;
  if (st.lim === 'cpu') {
    msg = `⚠ O ${st.mobile ? 'celular' : 'computador'} de ${who} está sobrecarregado (processador)` + (st.auto ? ' — já reduzi para 30 FPS' : '');
    warn = true;
  } else if (st.lim === 'bandwidth' || (st.bwe && st.bwe < 1_200_000)) {
    msg = `⚠ Internet de ${who} fraca para enviar` + (mbps ? `: ${mbps} Mbps` : '');
    warn = true;
  } else if (st.fps >= 20 && fpsHere > 0 && fpsHere < st.fps * 0.6) {
    msg = `⚠ ${who} envia ${Math.round(st.fps)} FPS, mas chegam só ${Math.round(fpsHere)}: sua internet pode estar fraca`;
    warn = true;
  } else {
    msg = `Envio de ${who}: ${fpsText(st.fps)} · ${resText(st.w, st.h)}` + (mbps ? ` · ${mbps} Mbps disponíveis` : '');
  }
  box.textContent = msg;
  box.className = 'screen-sender' + (warn ? ' warn' : '');
}

// Quem transmite: manda o próprio diagnóstico para quem está assistindo
setInterval(async () => {
  if (!screenStream) return;
  for (const [id, peer] of peers) {
    const v = peer.screenSenders.find((sd) => sd.track?.kind === 'video');
    if (!v) continue;
    try {
      const st = { fps: 0, w: 0, h: 0, lim: '', bwe: 0, mobile: /Android|iPhone|iPad/i.test(navigator.userAgent) };
      (await v.getStats()).forEach((r) => {
        if (r.type === 'outbound-rtp') {
          st.fps = num(r.framesPerSecond); st.w = num(r.frameWidth); st.h = num(r.frameHeight);
          if (r.qualityLimitationReason && r.qualityLimitationReason !== 'none') st.lim = r.qualityLimitationReason;
        }
        if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') st.bwe = num(r.availableOutgoingBitrate);
      });
      sendSignal(id, { stats: st });
    } catch {}
  }
}, 2000);

// ---------- Mute / ensurdecer / volumes ----------
function applyMicState() {
  if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = !(muted || deafened); });
}

function toggleMute() {
  if (modMuted && (muted || deafened)) {
    if (deafened) { deafened = false; playSound('fone-on'); applyVolumes(); renderControls(); }
    return toast('🛡️ Um moderador fechou seu microfone. Só ele pode liberar.');
  }
  if (deafened) { deafened = false; muted = false; playSound('fone-on'); }
  else { muted = !muted; playSound(muted ? 'mic-off' : 'mic-on'); }
  applyMicState();
  applyVolumes();
  if (currentChannel) socket.emit('mute', { muted: muted || deafened || !localStream });
  renderControls();
}

function toggleDeafen() {
  deafened = !deafened;
  playSound(deafened ? 'fone-off' : 'fone-on', true);
  applyMicState();
  applyVolumes();
  if (currentChannel) socket.emit('mute', { muted: muted || deafened || !localStream });
  renderControls();
}

const volumeOf = (name) => (name in volumes ? volumes[name] : 1);
const screenVolumeOf = (name) => (name in screenVolumes ? screenVolumes[name] : 1);

// Aplica ensurdecer + volume de cada amigo + volume da transmissão
function applyVolumes() {
  djAudio.muted = deafened;
  peers.forEach((p, id) => {
    const v = volumeOf(nameOf(id));
    // Mutado por moderador: ninguém ouve o microfone dessa pessoa
    const silenced = !!findUser(id)?.modMuted;
    p.audioEls.forEach((el) => {
      el.muted = deafened;
      el.volume = el.dataset.kind === 'music' ? musicVolume : el.dataset.kind === 'screen' ? screenVolumeOf(nameOf(id)) : (silenced ? 0 : v);
    });
  });
}

// Janela de volume de um amigo
let volTarget = null;
function openVolume(id, anchor) {
  const u = findUser(id);
  if (!u) return;
  volTarget = id;
  const pop = $('#vol-pop');
  fillAvatar($('#vol-avatar'), u.name, u.avatar);
  $('#vol-name').textContent = `Volume de ${u.name}`;
  syncVolumeUI();
  renderModTools(u);
  $('#vol-dm').hidden = !u.uid || u.uid === me?.id;
  renderVolFriend();
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  let top = r.top - h - 8;
  if (top < 8) top = r.bottom + 8;
  left = Math.max(8, Math.min(left, innerWidth - w - 8));
  top = Math.max(8, Math.min(top, innerHeight - h - 8));
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}
// Botões de moderador dentro da janelinha de volume
function renderModTools(u) {
  const box = $('#mod-tools');
  box.hidden = !canModerate(u);
  if (box.hidden) return;
  const b = (act, label, cls = '') => `<button class="btn small ${cls}" data-mod="${act}">${label}</button>`;
  box.innerHTML = `<div class="mod-title">🛡️ Moderação</div><div class="mod-btns">
    ${u.modMuted ? b('unmute', '🎙️ Liberar microfone', 'ok') : b('mute', '🔇 Fechar microfone')}
    ${isSharing(u.id) ? b('stop-share', '⏹ Parar transmissão') : ''}
    ${u.cam ? b('stop-cam', '📷 Desligar câmera') : ''}
    ${u.music ? b('stop-music', '🎵 Parar a música') : ''}
    ${b('kick', '🚪 Expulsar da chamada', 'danger')}
    ${b('ban', '⛔ Banir', 'danger')}</div>`;
}
$('#mod-tools').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-mod]');
  if (!btn || !volTarget) return;
  const act = btn.dataset.mod, name = nameOf(volTarget);
  if (act === 'ban' && !confirm(`Banir ${name}? A pessoa sai na hora e não consegue mais entrar.`)) return;
  if (act === 'kick' && !confirm(`Expulsar ${name} da chamada?`)) return;
  const r = await emitAck('mod-action', { action: act, id: volTarget });
  if (r?.error) return toast(r.error);
  const msg = { mute: `Microfone de ${name} fechado.`, unmute: `Microfone de ${name} liberado.`, 'stop-share': `Transmissão de ${name} parada.`,
    'stop-cam': `Câmera de ${name} desligada.`, 'stop-music': `Música de ${name} parada.`, kick: `${name} foi expulso da chamada.`, ban: `${name} foi banido.` }[act];
  toast(msg);
  if (act === 'kick' || act === 'ban') closeVolume();
});

function syncVolumeUI() {
  const v = volumeOf(nameOf(volTarget));
  $('#vol-range').value = Math.round(v * 100);
  $('#vol-value').textContent = `${Math.round(v * 100)}%`;
  $('#vol-mute').textContent = v === 0 ? 'Voltar a ouvir' : 'Silenciar';
}
function setVolume(v) {
  const name = nameOf(volTarget);
  if (v === 1) delete volumes[name]; else volumes[name] = v;
  store.set('voz-volumes', volumes);
  applyVolumes();
  syncVolumeUI();
  renderMain();
}
function closeVolume() {
  volTarget = null;
  $('#vol-pop').hidden = true;
}
$('#vol-range').addEventListener('input', (e) => setVolume(e.target.value / 100));
const beforeSilence = {}; // volume de antes de silenciar, para voltar igual
$('#vol-mute').onclick = () => {
  const name = nameOf(volTarget);
  if (volumeOf(name) === 0) {
    setVolume(beforeSilence[name] || 1);
  } else {
    beforeSilence[name] = volumeOf(name);
    setVolume(0);
  }
};
$('#vol-reset').onclick = () => setVolume(1);
document.addEventListener('pointerdown', (e) => {
  if (!volTarget) return;
  if ($('#vol-pop').contains(e.target) || e.target.closest('[data-vol]')) return;
  closeVolume();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeVolume(); });

// ---------- Indicador de quem está falando ----------
let audioCtx = null;
const analysers = new Map();

function ensureAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx?.state === 'suspended') audioCtx.resume();
}

function watchSpeaking(id, stream) {
  if (!audioCtx || !id) return;
  unwatchSpeaking(id);
  try {
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analysers.set(id, { source, analyser, data: new Uint8Array(analyser.fftSize), lastLoud: 0 });
  } catch (err) {
    console.warn(err);
  }
}

function unwatchSpeaking(id) {
  const a = analysers.get(id);
  if (a) { try { a.source.disconnect(); } catch {} }
  analysers.delete(id);
  if (speaking.delete(id)) updateSpeakingClasses();
}

setInterval(() => {
  const now = performance.now();
  let changed = false;
  analysers.forEach((a, id) => {
    a.analyser.getByteTimeDomainData(a.data);
    let sum = 0;
    for (const v of a.data) { const x = (v - 128) / 128; sum += x * x; }
    const rms = Math.sqrt(sum / a.data.length);
    const silenced = id === selfId && (muted || deafened);
    if (rms > 0.03 && !silenced) a.lastLoud = now;
    const isSpeaking = now - a.lastLoud < 300;
    if (isSpeaking !== speaking.has(id)) {
      isSpeaking ? speaking.add(id) : speaking.delete(id);
      changed = true;
    }
  });
  if (changed) updateSpeakingClasses();
}, 80);

function updateSpeakingClasses() {
  document.querySelectorAll('[data-uid]').forEach((el) => {
    el.classList.toggle('speaking', speaking.has(el.dataset.uid));
  });
}

// ---------- Renderização ----------
function renderAll() {
  renderChannels();
  renderMain();
  renderControls();
  renderDj();
}

function renderChannels() {
  const wrap = $('#channels');
  wrap.innerHTML = '';
  channelsState.forEach((ch) => {
    const el = document.createElement('div');
    el.className = 'channel' + (ch.id === currentChannel ? ' active' : '');
    el.innerHTML = `
      <div class="channel-row">
        <button class="channel-btn">${ICON.speaker}<span>${esc(ch.name)}</span><small>${ch.users.length}/${config.maxPerChannel}</small></button>
        ${isMod() ? `<button class="rename-btn" title="Trocar nome da sala">${ICON.pencil}</button><button class="rename-btn del-btn" title="Apagar sala">${ICON.close}</button>` : ''}
      </div>`;
    el.querySelector('.channel-btn').onclick = () => joinChannel(ch.id);
    const rb = el.querySelector('.rename-btn:not(.del-btn)');
    if (rb) rb.onclick = () => renameChannel(ch);
    const db = el.querySelector('.del-btn');
    if (db) db.onclick = () => deleteChannel(ch);

    const ul = document.createElement('ul');
    ch.users.forEach((u) => {
      const li = document.createElement('li');
      li.className = 'member' + (speaking.has(u.id) ? ' speaking' : '');
      li.dataset.uid = u.id;
      li.innerHTML = `
        ${avatarHTML(u)}
        <span class="mname">${esc(u.name)}${u.id === selfId ? ' (você)' : ''}</span>${roleBadge(u.role)}
        ${(ch.sharers || [ch.sharer]).includes(u.id) ? '<span class="live">AO VIVO</span>' : ''}
        ${u.cam ? `<span class="cam-ico" title="Câmera ligada">${ICON.cam}</span>` : ''}
        ${u.music ? '<span class="cam-ico" title="Tocando música">🎵</span>' : ''}
        ${u.muted ? `<span class="muted-ico">${ICON.micOff}</span>` : ''}`;
      ul.appendChild(li);
    });
    if (dj && dj.room === ch.id) {
      const li = document.createElement('li');
      li.className = 'member bot';
      li.innerHTML = `${avatarHTML({ name: dj.name, avatar: dj.avatar })}<span class="mname">${esc(dj.name)}</span><span class="bot-badge">BOT</span>${dj.now && !dj.now.pausedAt ? '<span class="cam-ico" title="Tocando">🎵</span>' : ''}`;
      ul.appendChild(li);
    }
    el.appendChild(ul);
    wrap.appendChild(el);
  });
  if (isMod()) {
    const add = document.createElement('button');
    add.className = 'new-channel';
    add.innerHTML = '➕ Nova sala';
    add.onclick = createChannel;
    wrap.appendChild(add);
  }
  // Sala dos bots: o DJ fica aqui esperando alguém chamar
  if (dj) {
    const bots = document.createElement('div');
    bots.className = 'channel bots-room';
    const inBots = !dj.room;
    bots.innerHTML = `<div class="channel-row"><div class="channel-btn static">🤖<span>Bots</span><small>${inBots ? 1 : 0}/1</small></div></div>
      <ul>${inBots ? `<li class="member bot clickable" title="${currentChannel ? 'Chamar o DJ King para a sua chamada' : 'Entre numa sala para chamar o DJ'}">${avatarHTML({ name: dj.name, avatar: dj.avatar })}<span class="mname">${esc(dj.name)}</span><span class="bot-hint">${currentChannel ? 'chamar ›' : 'DJ de música'}</span></li>` : `<li class="member empty-bot">O DJ King está na sala ${esc(channelsState.find((c) => c.id === dj.room)?.name || '')}</li>`}</ul>`;
    const b = bots.querySelector('.member.clickable');
    if (b) b.onclick = () => djMove(currentChannel);
    wrap.appendChild(bots);
  }
}

function renderMain() {
  const ch = channelsState.find((c) => c.id === currentChannel);
  $('#main-title').textContent = ch ? ch.name : 'Escolha um canal de voz';
  $('#empty').hidden = !!ch;
  $('#callbar').hidden = !ch;
  $('#main-hint').hidden = !ch || ch.users.length < 2;

  const tiles = $('#tiles');
  tiles.innerHTML = '';
  if (!ch) return;
  ch.users.forEach((u) => {
    const isMe = u.id === selfId;
    const vol = volumeOf(u.name);
    const t = document.createElement('div');
    // Transmitindo a tela: a câmera aparece só dentro da transmissão (não repete no quadradinho)
    const cam = isSharing(u.id) ? null : camOf(u.id);
    t.className = 'tile' + (speaking.has(u.id) ? ' speaking' : '') + (isMe ? '' : ' clickable') + (cam ? ' has-cam' : '');
    t.dataset.uid = u.id;
    t.innerHTML = `
      ${cam ? '' : avatarHTML(u)}
      <span class="tname">${u.muted ? ICON.micOff : ''}${esc(u.name)}${isMe ? ' (você)' : ''}${roleBadge(u.role)}</span>
      ${u.modMuted ? '<span class="modmute-badge" title="Microfone fechado por um moderador">🔇 mutado</span>' : ''}
      ${isSharing(u.id) ? '<span class="live">AO VIVO</span>' : ''}
      ${!isMe && isSharing(u.id) ? `<button class="watch-btn ${watching.has(u.id) ? 'on' : ''}">${watching.has(u.id) ? 'Assistindo' : 'Assistir'}</button>` : ''}
      ${!isMe && vol !== 1 ? `<span class="vol-badge">${vol === 0 ? 'Silenciado' : Math.round(vol * 100) + '%'}</span>` : ''}`;
    if (!isMe) {
      t.dataset.vol = '1';
      t.title = 'Ajustar volume';
      t.onclick = () => (volTarget === u.id ? closeVolume() : openVolume(u.id, t));
      const wb = t.querySelector('.watch-btn');
      if (wb) {
        wb.title = watching.has(u.id) ? 'Parar de assistir' : 'Assistir a transmissão';
        wb.onclick = (e) => { e.stopPropagation(); watching.has(u.id) ? unwatch(u.id) : watch(u.id); };
      }
    }
    if (cam) {
      const v = camVideoFor(u.id, cam);
      t.prepend(v);
      v.play().catch(() => {});
      t.appendChild(mirrorButton(u.id));
    }
    tiles.appendChild(t);
  });
}

function renderControls() {
  const me = $('#me-avatar');
  fillAvatar(me, myName, myAvatar);
  $('#me-name').textContent = myName;

  const bmu = $('#btn-music');
  bmu.classList.toggle('active', !!musicStream);
  bmu.querySelector('.label').textContent = musicStream ? 'Parar música' : 'Música';
  bmu.hidden = !navigator.mediaDevices?.getDisplayMedia || /Android|iPhone|iPad/i.test(navigator.userAgent);

  const bm = $('#btn-mute');
  bm.innerHTML = muted || deafened ? ICON.micOff : ICON.mic;
  bm.classList.toggle('off', muted || deafened);
  bm.title = muted || deafened ? 'Desmutar' : 'Mutar microfone';

  const bd = $('#btn-deafen');
  bd.innerHTML = deafened ? ICON.headOff : ICON.head;
  bd.classList.toggle('off', deafened);
  bd.title = deafened ? 'Voltar a ouvir' : 'Ensurdecer';

  const st = $('#me-status');
  st.textContent = currentChannel ? `Em ${channelName(currentChannel)}` : 'Desconectado';
  st.classList.toggle('on', !!currentChannel);

  const bs = $('#btn-share');
  bs.disabled = !navigator.mediaDevices?.getDisplayMedia;
  bs.classList.toggle('active', !!screenStream);
  bs.querySelector('.label').textContent = screenStream ? 'Parar transmissão' : 'Compartilhar tela';

  // Botões da tela cheia (microfone e fone)
  document.querySelectorAll('.fs-mic').forEach((b) => {
    const off = muted || deafened;
    b.innerHTML = off ? ICON.micOff : ICON.mic;
    b.classList.toggle('off', off);
    b.title = modMuted ? 'Microfone fechado por um moderador' : off ? 'Abrir microfone' : 'Fechar microfone';
  });
  document.querySelectorAll('.fs-deaf').forEach((b) => {
    b.innerHTML = deafened ? ICON.headOff : ICON.head;
    b.classList.toggle('off', deafened);
    b.title = deafened ? 'Voltar a ouvir' : 'Desligar o som';
  });
  bm.title = modMuted ? 'Microfone fechado por um moderador' : bm.title;

  const bc = $('#btn-cam');
  bc.disabled = !navigator.mediaDevices?.getUserMedia;
  bc.classList.toggle('active', !!camStream);
  bc.querySelector('.ico').innerHTML = camStream ? ICON.cam : ICON.camOff;
  bc.querySelector('.label').textContent = camStream ? (camFloating ? 'Fechar câmera flutuante' : 'Desligar câmera') : 'Câmera';
}
