// King Launcher — cliente
// WebRTC em malha (cada participante conecta direto com os outros).
// Ideal para grupos pequenos (até 6) com uma transmissão de tela por vez.

const $ = (s) => document.querySelector(s);

// ---------- Abertura (logo + fone caindo na coroa) ----------
(function intro() {
  const el = document.getElementById('intro');
  if (!el) return;
  const end = () => { el.classList.add('out'); setTimeout(() => el.remove(), 450); };
  const t = setTimeout(end, 3100);
  el.addEventListener('click', () => { clearTimeout(t); end(); });
})();
// Só conecta depois do login (o servidor confere o "crachá" de acesso)
let authToken = null;
const socket = io({ autoConnect: false, auth: (cb) => cb({ token: authToken }) });
// Cada servidor tem os próprios bots: todo pedido de DJ/TV/Arcade leva o servidor atual
{
  const _emit = socket.emit.bind(socket);
  socket.emit = (ev, ...args) => {
    if (/^(dj|tv|arcade)-/.test(ev) && typeof currentServer !== 'undefined' && currentServer) {
      if (args.length && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) args[0] = { ...args[0], srv: currentServer };
      else if (!args.length || typeof args[0] === 'function') args.unshift({ srv: currentServer });
    }
    return _emit(ev, ...args);
  };
}
// Estado dos bots de cada servidor (o da tela é o do servidor atual)
const botsPorSrv = {};
function guardaBot(tipo, st) {
  if (!st || !st.srv) return true;
  (botsPorSrv[st.srv] ||= {})[tipo] = st;
  return st.srv === currentServer;
}
let botsSrvAplicado = null;
function aplicaBotsDoServidor() {
  if (!currentServer || botsSrvAplicado === currentServer) return;
  botsSrvAplicado = currentServer;
  const b = botsPorSrv[currentServer];
  if (!b || !b.dj || !b.tv || !b.arcade) socket.emit('bots-get', { srv: currentServer });
  for (const tipo of ['dj', 'tv', 'arcade']) if (b && b[tipo]) socket.listeners(tipo).forEach((fn) => fn(b[tipo]));
}

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
let plateiaMudoAviso = false; // já avisei que a plateia desta sala não fala
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
// 🎭 Palco: estou na plateia (mudo, sem transmitir) ou no palco?
let palcoMode = false; // a sala atual é um palco
let noPalco = false; // eu estou no palco
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
const emitAck = (ev, data) => new Promise((resolve) => socket.emit(ev, data, (r) => { if (r?.pedido) toast(`📝 ${r.msg || 'Pedido enviado ao dono para confirmar.'}`); resolve(r); }));
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
  { id: 'neon', nome: 'Neon', cor: '#22d3ee', amostra: 'linear-gradient(135deg, #7c3aed, #22d3ee)' },
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
  if (theme.id === 'neon') {
    return { bg: '#0a0718', panel: '#17132b', 'panel-2': '#1c1733', 'panel-3': '#2a2447', hover: '#241e3f',
      'hover-strong': '#322a55', 'btn-hover': '#3a3162', text: '#e4e1f7', 'text-strong': '#f6f4ff', muted: '#aaa4cf',
      line: '#2b2548', 'line-strong': '#06040f', userbar: '#120f24', pop: '#151129', stage: '#06040f', link: '#7dd3fc',
      accent: '#22d3ee', 'accent-hover': '#67e8f9', 'on-accent': '#04202a', live: '#f472b6', 'on-live': '#2a0618',
      'glow-1': 'rgba(124, 58, 237, .8)', 'glow-2': 'rgba(8, 145, 178, .7)', 'glow-3': 'rgba(219, 39, 119, .3)' };
  }
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
let themeChoice = store.get('voz-tema', { id: 'neon' });
function applyTheme(choice) {
  themeChoice = choice;
  const base = THEMES.find((t) => t.id === choice.id) || { id: 'custom', cor: choice.cor };
  const pal = paletteFor(base.id === 'custom' ? { id: 'custom', cor: choice.cor } : base);
  // limpa as cores extras do tema Neon antes de aplicar outro tema
  for (const k of ['on-accent', 'live', 'on-live', 'glow-1', 'glow-2', 'glow-3']) document.documentElement.style.removeProperty(`--${k}`);
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

// Descobre cedo se o site manda e-mail (pra pedir o e-mail no cadastro)
fetch('/config').then((r) => r.json()).then((c) => { if (c) { config = c; setAuthMode(authMode); } }).catch(() => {});
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === mode));
  $('#auth-name-row').hidden = mode !== 'register';
  $('#auth-email').required = mode === 'register' && !!config?.email;
  $('#auth-termos-row').hidden = mode !== 'register';
  $('#auth-termos').required = mode === 'register';
  $('#auth-email-dica').textContent = config?.email ? '(para recuperar a senha)' : '(opcional)';
  $('#auth-forgot').hidden = mode !== 'login' || !config?.email;
  $('#auth-submit').textContent = mode === 'register' ? 'Criar conta' : 'Entrar';
  $('#auth-pass').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  $('#auth-hint').innerHTML = mode === 'register'
    ? 'Depois de criar, o dono precisa <b>aprovar</b> sua conta. Aí é só entrar.'
    : (config?.cadastro === 'aprovacao' ? 'Ainda não tem conta? Toque em <b>Criar conta</b>. O dono precisa aprovar antes do primeiro acesso.' : 'Ainda não tem conta? Toque em <b>Criar conta</b>: é rápido e grátis.');
  if (mode === 'register') $('#auth-hint').innerHTML = config?.cadastro === 'aprovacao' ? 'Depois de criar, o dono precisa <b>aprovar</b> sua conta. Aí é só entrar.' : config?.cadastro === 'livre' ? 'Sua conta entra na hora.' : 'Sua conta entra na hora. Para entrar ou criar servidores, confirme o <b>código</b> que vai para o seu e-mail.';
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
  setAuthMode('login');
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
      if (!$('#auth-termos').checked) return authMsg('Para criar a conta, marque que tem 14 anos ou mais e aceita os Termos e a Política.');
      const r = await api('/api/register', { username, password, name: $('#auth-name').value.trim(), email: $('#auth-email').value.trim(), termos: true });
      if (r.error) return authMsg(r.error);
      if (r.token) { store.set('voz-lembrar', $('#auth-remember').checked ? { u: username, p: password } : null); await startSession(r.token, r.user, true); if (r.confirmar) pedeCodigoEmail(username, 'Mandamos um código de 6 números para o seu e-mail. Confirme para poder entrar e criar servidores. Olhe também o spam.'); return; }
      setAuthMode('login');
      authMsg('Conta criada! Agora é só esperar o dono aprovar. Depois entre com seu usuário e senha.', 'ok');
      if (r.confirmar) pedeCodigoEmail(username);
    } else {
      const r = await api('/api/login', { username, password });
      if (r.error) {
        return authMsg(r.error, r.httpStatus === 403 ? 'wait' : 'error');
      }
      store.set('voz-lembrar', $('#auth-remember').checked ? { u: username, p: password } : null);
      startSession(r.token, r.user, false);
    }
  } catch {
    authMsg('Não consegui falar com o servidor. Se ninguém usou nos últimos minutos, ele pode levar até 1 minuto para acordar. Tente de novo.');
  } finally {
    btn.disabled = false;
  }
});

// Precisa confirmar o e-mail (pra entrar/criar servidor): reenvia o código e abre a caixinha
async function pedeConfirmarEmail() {
  if (!me?.email) { toast('📧 Cadastre um e-mail em ⚙ Configurações → Conta para entrar ou criar servidores.'); openSettings('conta'); return; }
  const r = await api('/api/email/reenviar', { username: me.username });
  pedeCodigoEmail(me.username, r.error ? `${r.error} Se já tem um código válido, digite aqui.` : `Para entrar ou criar servidores, confirme seu e-mail: mandamos um código para ${me.email}. Olhe também o spam.`);
}
const emailPendente = () => !!(config?.email && config?.cadastro === 'email' && me && me.role !== 'owner' && !me.emailOk);
// Sem servidor: a pessoa fica "solta" no TalKing até entrar com um convite ou criar o seu
function renderSemServidor() {
  const box = $('#empty');
  if (!loggedIn || serversState.length) {
    if (box.classList.contains('sem-srv')) { box.classList.remove('sem-srv'); box.innerHTML = '<img src="logo-fone.svg" alt="" class="empty-logo" /><h2>Nenhum canal selecionado</h2><p>Clique em uma sala para entrar.</p>'; }
    return false;
  }
  box.classList.add('sem-srv');
  box.innerHTML = `<img src="logo-fone.svg" alt="" class="empty-logo" />
    <h2>Bem-vindo ao TalKing, ${esc(myName)}!</h2>
    <p>Você ainda não está em nenhum servidor. Peça o <b>link de convite</b> de um amigo ou crie o seu.</p>
    ${emailPendente() ? '<p class="aviso-email">⚠️ Antes, confirme seu e-mail: só quem confirmou entra ou cria servidores.</p><button type="button" class="btn primary" id="sem-srv-email">📧 Confirmar meu e-mail</button>' : '<div class="sem-srv-btns"><button type="button" class="btn primary" id="sem-srv-novo">🏰 Criar servidor</button><button type="button" class="btn" id="sem-srv-convite">🔗 Entrar com convite</button></div>'}`;
  const b1 = box.querySelector('#sem-srv-novo'), b2 = box.querySelector('#sem-srv-convite'), b3 = box.querySelector('#sem-srv-email');
  if (b1) b1.onclick = () => abreNovoServidor();
  if (b2) b2.onclick = () => { abreNovoServidor(); setTimeout(() => $('#srv-join-code').focus(), 50); };
  if (b3) b3.onclick = pedeConfirmarEmail;
  return true;
}

// ---------- E-mail: código de confirmação e recuperação de senha ----------
let codigoUser = '';
function pedeCodigoEmail(username, texto) {
  codigoUser = username || me?.username || '';
  $('#codigo-texto').textContent = texto || 'Mandamos um código de 6 números para o seu e-mail. Olhe também a caixa de spam.';
  $('#codigo-input').value = '';
  $('#codigo-msg').hidden = true;
  $('#codigo-modal').hidden = false;
  setTimeout(() => $('#codigo-input').focus(), 50);
}
const msgEm = (sel, text, kind = 'error') => { const el = $(sel); el.hidden = !text; el.textContent = text; el.className = 'auth-msg ' + kind; };
$('#codigo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await api('/api/email/confirmar', { username: codigoUser, code: $('#codigo-input').value.trim() });
  if (r.error) return msgEm('#codigo-msg', r.error);
  $('#codigo-modal').hidden = true;
  if (r.user && me && r.user.id === me.id) { me = r.user; renderSettings(); }
  toast('✅ E-mail confirmado!');
  if (!loggedIn) authMsg('E-mail confirmado! Quando o dono aprovar sua conta, é só entrar.', 'ok');
  else { if (pendingInvite) { const c = pendingInvite; pendingInvite = null; entrarComConvite(c); } renderAll(); }
});
$('#codigo-reenviar').onclick = async () => {
  const r = await api('/api/email/reenviar', { username: codigoUser });
  msgEm('#codigo-msg', r.error || 'Código reenviado. Olhe a caixa de entrada e o spam.', r.error ? 'error' : 'ok');
};
$('#codigo-depois').onclick = () => { $('#codigo-modal').hidden = true; };

let senhaPasso = 1;
function abreRecuperar() {
  senhaPasso = 1;
  $('#senha-login').value = $('#auth-user').value.trim();
  $('#senha-codigo').value = $('#senha-nova').value = '';
  $('#senha-passo1').hidden = false; $('#senha-passo2').hidden = true;
  $('#senha-ok').textContent = 'Enviar código';
  $('#senha-msg').hidden = true;
  $('#senha-modal').hidden = false;
  setTimeout(() => $('#senha-login').focus(), 50);
}
$('#auth-forgot').onclick = abreRecuperar;
$('#senha-cancelar').onclick = () => { $('#senha-modal').hidden = true; };
$('#senha-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const login = $('#senha-login').value.trim();
  if (!login) return msgEm('#senha-msg', 'Digite seu usuário ou e-mail.');
  const btn = $('#senha-ok'); btn.disabled = true;
  try {
    if (senhaPasso === 1) {
      const r = await api('/api/senha/esqueci', { login });
      if (r.error) return msgEm('#senha-msg', r.error);
      senhaPasso = 2;
      $('#senha-passo1').hidden = true; $('#senha-passo2').hidden = false;
      $('#senha-dica').textContent = r.dica ? `Se a conta existir, o código foi para ${r.dica}. Digite o código e a senha nova.` : 'Se a conta existir e tiver e-mail, o código foi enviado. Digite o código e a senha nova.';
      $('#senha-ok').textContent = 'Criar senha nova';
      msgEm('#senha-msg', '');
      setTimeout(() => $('#senha-codigo').focus(), 50);
    } else {
      const r = await api('/api/senha/redefinir', { login, code: $('#senha-codigo').value.trim(), password: $('#senha-nova').value });
      if (r.error) return msgEm('#senha-msg', r.error);
      $('#senha-modal').hidden = true;
      if (!login.includes('@')) $('#auth-user').value = login;
      $('#auth-pass').value = '';
      authMsg('Senha nova criada! Agora é só entrar.', 'ok');
    }
  } catch {
    msgEm('#senha-msg', 'Não consegui falar com o servidor. Tente de novo.');
  } finally { btn.disabled = false; }
});
// Configurações: trocar/adicionar e-mail
$('#email-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#email-novo').value.trim();
  const r = await api('/api/email', { email, password: $('#email-senha').value });
  if (r.error) return toast(r.error);
  $('#email-senha').value = '';
  pedeCodigoEmail(me.username, `Mandamos um código de 6 números para ${email}. Digite aqui para confirmar.`);
});
$('#email-atual').addEventListener('click', async (e) => {
  if (!e.target.matches('.link-btn')) return;
  const r = await api('/api/email/reenviar', { username: me.username });
  if (r.error) return toast(r.error);
  pedeCodigoEmail(me.username);
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
  if (config?.email && me && !me.email) setTimeout(() => toast('📧 Cadastre um e-mail em Configurações → Sua conta para poder recuperar a senha.'), 2500);
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
  if (pendingInvite) { const c = pendingInvite; pendingInvite = null; entrarComConvite(c); }
});
async function entrarComConvite(codigo) {
  const c = String(codigo || '').trim().split('/').pop();
  if (!c) return;
  const r = await emitAck('srv-join', { codigo: c });
  if (r?.email) { pendingInvite = c; return pedeConfirmarEmail(); }
  if (r?.error) return toast(r.error);
  const nome = () => srvOf(r.id)?.nome || 'servidor';
  // o snapshot novo chega logo depois do ack
  setTimeout(() => { escolheServidor(r.id, { silencioso: true }); toast(r.ja ? `Você já está no servidor ${nome()}.` : `🎉 Você entrou no servidor ${nome()}!`); }, 300);
}

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
  if (sec === 'mod') { renderModOwner(); showModTab(modTab); loadAccounts(); }
}
document.querySelectorAll('.settings-tabs button').forEach((b) => (b.onclick = () => showSettingsSec(b.dataset.sec)));
$('#settings-close').onclick = () => ($('#settings').hidden = true);
$('#settings').addEventListener('pointerdown', (e) => { if (e.target.id === 'settings') $('#settings').hidden = true; });

function renderSettings() {
  $('#tab-mod').hidden = !isMod();
  $('#acc-username').textContent = me ? `@${me.username}` : '';
  $('#acc-role').textContent = me ? ROLE_LABEL[me.role] || '' : '';
  $('#email-sec').hidden = !config?.email;
  if (me) {
    $('#email-atual').innerHTML = me.email
      ? `${esc(me.email)} ${me.emailOk ? '<span class="ok-tag">✅ confirmado</span>' : '<span class="warn-tag">⚠️ não confirmado</span> <button type="button" class="link-btn">Confirmar agora</button>'}`
      : '<span class="warn-tag">⚠️ Sem e-mail.</span> Cadastre um para poder recuperar a senha.';
    $('#email-novo').placeholder = me.email ? 'Trocar para outro e-mail' : 'Seu e-mail';
  }
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
$('#apagar-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!confirm('Tem certeza? Sua conta, mensagens e servidores que você criou serão apagados para sempre.')) return;
  const r = await api('/api/conta/apagar', { password: $('#apagar-senha').value });
  if (r.error) return toast(r.error);
  $('#apagar-senha').value = '';
  store.set('voz-lembrar', null);
  logout('Sua conta foi apagada. Até mais!', 'ok');
});

// ---------- Moderação: contas ----------
let pendingCount = 0;
let accounts = [];

let pedidosCount = 0;
function updatePendingBadges() {
  const n = (isMod() ? pendingCount : 0) + (me?.role === 'owner' ? pedidosCount : 0);
  for (const id of ['#gear-badge', '#mod-badge']) {
    const b = $(id);
    b.hidden = !n;
    b.textContent = String(n);
  }
  const mt = $('#mt-pedidos-n'); if (mt) { mt.hidden = !pedidosCount; mt.textContent = String(pedidosCount); }
}
socket.on('pedidos', ({ count }) => {
  if (count > pedidosCount && loggedIn) { toast(`📝 ${count === 1 ? 'Um moderador fez um pedido' : `${count} pedidos de moderadores`} esperando sua confirmação (menu ⚙ → Moderação → Pedidos).`); playSound('mensagem', true); }
  pedidosCount = count;
  updatePendingBadges();
  if (!$('#settings').hidden && settingsSec === 'mod' && modTab === 'pedidos') loadPedidos();
});
socket.on('pedido-decidido', ({ aprovado, descricao }) => {
  toast(aprovado ? `✅ O dono aprovou: ${descricao}` : `❌ O dono recusou: ${descricao}`);
  if (!$('#settings').hidden && settingsSec === 'mod') { if (modTab === 'pedidos') loadPedidos(); else loadAccounts(); }
});
async function loadPedidos() {
  const r = await emitAck('pedidos-list', {});
  if (r?.error) return toast(r.error);
  const box = $('#mod-pedidos');
  const dono = me?.role === 'owner';
  const pend = r.pedidos.filter((p) => p.status === 'pendente'), resto = r.pedidos.filter((p) => p.status !== 'pendente').slice(0, 30);
  const linha = (p) => `<div class="pedido ${p.status}" data-id="${p.id}"><div><b>${esc(p.descricao)}</b><small>${dono ? `pedido de ${esc(p.de_nome)} · ` : ''}${fmtQuando(p.quando)}${p.status !== 'pendente' ? ` · <span class="st">${p.status === 'aprovado' ? '✅ aprovado' : '❌ recusado'}${p.decidido_por ? ` por ${esc(p.decidido_por)}` : ''}</span>` : ' · ⏳ esperando o dono'}</small></div>${dono && p.status === 'pendente' ? '<div class="acc-actions"><button class="btn small ok" data-pd="1">✔ Aprovar</button><button class="btn small danger" data-pd="0">✖ Recusar</button></div>' : ''}</div>`;
  box.innerHTML = `<p class="sec-hint">${dono ? 'Alterações feitas por moderadores só valem depois que você confirmar aqui.' : 'Suas alterações no painel vão para o dono confirmar.'}</p><h2>Esperando${pend.length ? ` (${pend.length})` : ''}</h2>${pend.length ? pend.map(linha).join('') : '<p class="sec-hint">Nenhum pedido esperando.</p>'}${resto.length ? `<h2>Já decididos</h2>${resto.map(linha).join('')}` : ''}`;
  box.querySelectorAll('[data-pd]').forEach((b) => { b.onclick = async () => { const id = Number(b.closest('.pedido').dataset.id); const r2 = await emitAck('pedido-decidir', { id, aprovar: b.dataset.pd === '1' }); if (r2?.error) toast(r2.error); else toast(b.dataset.pd === '1' ? 'Aprovado e executado.' : 'Recusado.'); loadPedidos(); loadAccounts(); }; });
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

const fmtQuando = (d) => { if (!d) return 'nunca'; try { const x = new Date(d); return x.toLocaleDateString('pt-BR') + ' ' + x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
function renderAccounts() {
  const busca = ($('#mod-busca').value || '').trim().toLowerCase();
  const bate = (u) => !busca || [u.name, u.username, u.email].some((x) => (x || '').toLowerCase().includes(busca));
  const pend = accounts.filter((u) => u.status === 'pending' && bate(u));
  const rest = accounts.filter((u) => u.status !== 'pending' && bate(u));
  const souDono = me?.role === 'owner';
  const mail = (u) => (souDono ? (u.email ? `<span class="mail">${esc(u.email)}</span> ${u.emailOk ? '<span class="mail-ok">✅</span>' : '<span class="mail-no" title="E-mail não confirmado">⚠️ não confirmou</span>'} · ` : '<span class="mail-no">sem e-mail</span> · ') : '');
  const row = (u, buttons) => `
    <div class="acc" data-id="${u.id}">
      ${avatarHTML(u)}
      <div class="acc-info"><strong>${esc(u.name)} ${roleBadge(u.role)}</strong>
        <small>@${esc(u.username)} · ${u.status === 'banned' ? '<b class="ban">banido</b>' : u.status === 'pending' ? 'esperando aprovação' : ROLE_LABEL[u.role]} · ${mail(u)}criada ${fmtDate(u.createdAt)}${souDono ? ` · último acesso ${fmtQuando(u.vistoEm)}` : ''}</small></div>
      <div class="acc-actions">${buttons}</div>
    </div>`;
  $('#mod-total').textContent = `(${accounts.length})`;
  const btn = (act, label, cls = '') => `<button class="btn small ${cls}" data-act="${act}">${label}</button>`;
  $('#mod-pending').innerHTML = pend.length
    ? pend.map((u) => row(u, btn('approve', '✔ Aprovar', 'ok') + btn('reject', '✖ Recusar', 'danger'))).join('')
    : '<p class="sec-hint">Ninguém esperando agora.</p>';
  $('#mod-users').innerHTML = rest.map((u) => {
    if (u.id === me?.id || RANK[u.role] >= RANK[me?.role]) return row(u, '');
    let b = '';
    if (u.status === 'approved') b += btn('reset-pass', '🔑 Nova senha');
    if (u.status === 'approved') b += u.role === 'mod' ? btn('make-member', 'Tirar moderador') : btn('make-mod', '🛡️ Tornar moderador');
    b += u.status === 'banned' ? btn('unban', 'Desbanir', 'ok') : btn('ban', 'Banir', 'danger');
    b += btn('delete', 'Apagar', 'danger');
    return row(u, b);
  }).join('');
}

$('#mod-busca').addEventListener('input', renderAccounts);
// Abas do painel (dono): contas / servidores / atividade
let modTab = 'contas';
function showModTab(t) {
  modTab = t;
  document.querySelectorAll('#mod-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mt === t));
  $('#mod-contas').hidden = t !== 'contas'; $('#mod-servidores').hidden = t !== 'servidores'; $('#mod-atividade').hidden = t !== 'atividade'; $('#mod-pedidos').hidden = t !== 'pedidos';
  if (t === 'servidores') loadAdminServers();
  if (t === 'atividade') loadAdminEvents();
  if (t === 'pedidos') loadPedidos();
}
document.querySelectorAll('#mod-tabs button').forEach((b) => (b.onclick = () => showModTab(b.dataset.mt)));
function renderModOwner() {
  const dono = me?.role === 'owner';
  $('#mt-servidores').hidden = !isMod(); $('#mt-atividade').hidden = !isMod(); $('#mt-pedidos').hidden = !isMod(); $('#mod-cadastro').hidden = !dono;
  if (dono) {
    const modo = config?.cadastro || 'email';
    document.querySelectorAll('#cadastro-seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === modo));
    $('#cadastro-dica').textContent = modo === 'email' ? 'A conta entra na hora, mas só entra ou cria servidor depois de confirmar o e-mail.' : modo === 'aprovacao' ? 'Cada conta nova espera você aprovar aqui.' : 'Qualquer um entra na hora e usa servidores sem confirmar e-mail.';
    if (modo === 'email' && !config?.email) $('#cadastro-dica').textContent += ' ⚠️ O e-mail não está configurado no Render, então por enquanto vale a aprovação manual.';
  }
}
document.querySelectorAll('#cadastro-seg button').forEach((b) => { b.onclick = async () => { const r = await api('/api/ajustes', { cadastro: b.dataset.v }); if (r.error) return toast(r.error); config.cadastro = r.cadastro; renderModOwner(); toast('Cadastro atualizado.'); }; });
async function loadAdminServers() {
  const r = await emitAck('admin-servers', {});
  if (r?.error) return toast(r.error);
  const box = $('#mod-servidores');
  const cargoTxt = { dono: '👑 dono', mod: '🛡️ mod', membro: 'membro' };
  box.innerHTML = `<p class="sec-hint">${r.servers.length} servidor(es). Você manda em todos, mesmo sem ser membro.</p>` + r.servers.map((sv) => `
    <details class="srv-adm" data-srv="${sv.id}">
      <summary><span class="srv-ico">${sv.icone ? `<img src="${esc(sv.icone)}" alt="">` : esc((sv.nome[0] || '?').toUpperCase())}</span><span>${esc(sv.nome)}${sv.principal ? ' <small>(principal)</small>' : ''}</span><small>· dono ${esc(sv.dono.name)} · ${sv.membros.length} membro(s) · ${sv.online} online</small></summary>
      <div class="srv-salas">Salas: ${sv.salas.map((c) => `${c.tipo === 'texto' ? '💬' : c.tipo === 'palco' ? '🎭' : '🔊'} ${esc(c.name)}${c.pessoas ? ` (${c.pessoas})` : ''}`).join(' · ') || 'nenhuma'}</div>
      <div class="srv-acoes">${sv.principal ? '' : `<button class="btn small" data-sact="abrir">Abrir servidor</button><button class="btn small danger" data-sact="apagar">Apagar servidor</button>`}<form class="srv-add"><input placeholder="@usuário para adicionar" maxlength="20" /><button class="btn small" type="submit">➕ Adicionar</button></form></div>
      ${sv.membros.map((m) => `<div class="acc" data-uid="${m.id}">${avatarHTML(m)}<div class="acc-info"><strong>${esc(m.name)} ${m.online ? '🟢' : ''}</strong><small>@${esc(m.username)} · ${cargoTxt[m.cargo] || m.cargo}</small></div><div class="acc-actions">${m.cargo === 'dono' || m.id === me?.id ? '' : `${m.cargo === 'mod' ? '<button class="btn small" data-sact="membro">Tirar mod</button>' : '<button class="btn small" data-sact="mod">Dar mod</button>'}<button class="btn small" data-sact="coroa">Passar coroa</button><button class="btn small danger" data-sact="kick">Expulsar</button><button class="btn small danger" data-sact="ban">Banir</button>`}</div></div>`).join('')}
      ${sv.banidos.length ? `<div class="srv-salas">Banidos: ${sv.banidos.map((b) => `${esc(b.name)} <button class="btn small" data-sact="unban" data-uid="${b.id}">desbanir</button>`).join(' · ')}</div>` : ''}
    </details>`).join('');
}
$('#mod-servidores').addEventListener('submit', async (e) => {
  const f = e.target.closest('.srv-add');
  if (!f) return;
  e.preventDefault();
  const srv = f.closest('.srv-adm').dataset.srv, nome = f.querySelector('input').value.trim().replace(/^@/, '').toLowerCase();
  const u = accounts.find((x) => x.username === nome);
  if (!u) return toast('Não achei esse usuário. Digite o @usuário exato (veja na aba Contas).');
  const r = await emitAck('admin-srv-add', { id: srv, uid: u.id });
  if (r?.error) return toast(r.error);
  toast(r.ja ? 'Essa pessoa já estava no servidor.' : `${u.name} entrou no servidor.`);
  loadAdminServers();
});
$('#mod-servidores').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-sact]');
  if (!b) return;
  const srv = b.closest('.srv-adm').dataset.srv, act = b.dataset.sact;
  const uid = Number(b.dataset.uid || b.closest('[data-uid]')?.dataset.uid);
  if (act === 'abrir') { $('#settings').hidden = true; currentServer = srv; store.set('voz-servidor', srv); renderAll(); return; }
  if (act === 'apagar') { if (!confirm('Apagar este servidor com todas as salas? Não tem volta.')) return; const r = await emitAck('srv-delete', { id: srv }); if (r?.error) toast(r.error); return loadAdminServers(); }
  if ((act === 'kick' || act === 'ban') && !confirm(`${act === 'ban' ? 'Banir' : 'Expulsar'} essa pessoa do servidor?`)) return;
  if (act === 'coroa' && !confirm('Passar a coroa (dono do servidor) para essa pessoa?')) return;
  const r = await emitAck('srv-member', { id: srv, uid, action: act });
  if (r?.error) toast(r.error);
  loadAdminServers();
});
const EV_NOME = { 'conta-criada': 'criou conta', 'email-confirmado': 'confirmou e-mail', entrou: 'entrou', aprovada: 'aprovada', 'servidor-criado': 'criou servidor', 'entrou-servidor': 'entrou no servidor', 'saiu-servidor': 'saiu do servidor', 'sala-criada': 'criou sala', 'conta-apagada': 'conta apagada', banido: 'banido do TalKing', desbanido: 'desbanido', 'banido-servidor': 'banido de servidor', 'expulso-servidor': 'expulso de servidor', ajuste: 'ajuste', pedido: 'pediu ao dono', 'pedido-aprovado': 'aprovou pedido', 'pedido-recusado': 'recusou pedido' };
const EV_RUIM = new Set(['conta-apagada', 'banido', 'banido-servidor', 'expulso-servidor']);
let evFiltro = '';
async function loadAdminEvents() {
  const r = await emitAck('admin-events', { limite: 400 });
  if (r?.error) return toast(r.error);
  const box = $('#mod-atividade');
  const tipos = [...new Set(r.eventos.map((e) => e.tipo))];
  const lista = r.eventos.filter((e) => !evFiltro || e.tipo === evFiltro);
  box.innerHTML = `<div class="ev-filtros"><button class="btn small${evFiltro ? '' : ' primary'}" data-ev="">Tudo</button>${tipos.map((t) => `<button class="btn small${evFiltro === t ? ' primary' : ''}" data-ev="${t}">${EV_NOME[t] || t}</button>`).join('')}</div>`
    + (lista.length ? lista.map((e) => `<div class="ev${EV_RUIM.has(e.tipo) ? ' ruim' : ''}"><time>${fmtQuando(e.quando)}</time><div><span class="ev-tipo">${EV_NOME[e.tipo] || e.tipo}</span><b>${esc(e.nome || '?')}</b>${e.detalhe ? ` — ${esc(e.detalhe)}` : ''}</div></div>`).join('') : '<p class="sec-hint">Nada registrado ainda.</p>');
  box.querySelectorAll('[data-ev]').forEach((b) => (b.onclick = () => { evFiltro = b.dataset.ev; loadAdminEvents(); }));
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
  if (r?.pedido) return;
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
  // A conexão voltou: entra de novo na sala em que a pessoa estava
  if (rejoinId && !currentChannel && loggedIn) {
    const id = rejoinId, tinhaTela = rejoinShare;
    rejoinId = null; rejoinShare = false;
    joinChannel(id).then(() => {
      if (currentChannel === id) toast(tinhaTela ? 'Reconectado à sala. Sua transmissão parou: é só compartilhar a tela de novo.' : 'Reconectado à sala.');
    }).catch(() => {});
  }
  checkSiteVersion();
  if (isMod()) socket.emit('admin-users', {}, (r) => { if (r?.users) { accounts = r.users; pendingCount = accounts.filter((u) => u.status === 'pending').length; updatePendingBadges(); } });
  const saved = store.get('voz-canais', null);
  if (saved?.version) socket.emit('sync-names', saved);
});

setInterval(() => { if (currentChannel && socket.connected) fetch('/config', { cache: 'no-store' }).catch(() => {}); }, 4 * 60 * 1000);

const TIPO_INFO = {
  voz: { ico: ICON.speaker, emoji: '🔊', nome: 'Sala de voz', desc: 'Conversa, câmera e transmissão de tela' },
  texto: { ico: '💬', emoji: '💬', nome: 'Sala de mensagens', desc: 'Só texto, fotos e clipes; não precisa entrar em chamada' },
  palco: { ico: '🎭', emoji: '🎭', nome: 'Palco (cinema)', desc: 'Até 2 no palco transmitindo; a plateia assiste e conversa' },
};
async function createChannel() {
  // Escolhe o tipo numa caixinha, depois o nome
  const tipo = await escolheTipoSala();
  if (!tipo) return;
  let tema, plateia;
  if (tipo === 'palco') { const e = await escolheTema('ar-livre'); if (!e) return; tema = e.tema; plateia = { mic: e.mic, cam: e.cam }; }
  const nome = prompt(`Nome da nova ${TIPO_INFO[tipo].nome.toLowerCase()}:`, '');
  if (nome === null) return;
  const res = await emitAck('create-channel', { name: nome, srv: currentServer, tipo, tema, plateia });
  if (res?.error) toast(res.error); else toast(`${TIPO_INFO[tipo].emoji} Sala "${nome.trim()}" criada!`);
}
function escolheTipoSala() {
  return new Promise((res) => {
    document.querySelectorAll('.tipo-pop').forEach((p) => p.remove());
    const pop = document.createElement('div');
    pop.className = 'modal';
    pop.innerHTML = `<div class="modal-card tipo-pop"><h2>Que tipo de sala?</h2>${Object.entries(TIPO_INFO).map(([k, t]) => `<button type="button" class="tipo-opt" data-tipo="${k}"><span class="tipo-emoji">${t.emoji}</span><span><strong>${t.nome}</strong><small>${t.desc}</small></span></button>`).join('')}<button type="button" class="btn tipo-cancel">Cancelar</button></div>`;
    document.body.appendChild(pop);
    const fim = (v) => { pop.remove(); res(v); };
    pop.querySelectorAll('.tipo-opt').forEach((b) => { b.onclick = () => fim(b.dataset.tipo); });
    pop.querySelector('.tipo-cancel').onclick = () => fim(null);
    pop.onclick = (e) => { if (e.target === pop) fim(null); };
  });
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
// ---------- Lateral direita (pessoas na chamada + chat) e modo teatro ----------
const telaLarga = () => matchMedia('(min-width: 900px)').matches;
let sideMin = store.get('voz-side-min', false);   // true = lateral recolhida (só os rostinhos) = modo teatro
let botsOpen = false;                              // gavetinha dos bots aberta?
function applySide(foco = false) {
  document.body.classList.toggle('side-min', sideMin);
  const b = $('#side-toggle');
  if (b) { b.querySelector('.txt').textContent = sideMin ? '' : 'Modo teatro'; b.querySelector('.ico').textContent = sideMin ? '⟨' : '⟩'; b.title = sideMin ? 'Abrir pessoas e chat' : 'Modo teatro: recolher a lateral e aumentar a transmissão'; }
  if (telaLarga() && currentChannel) setChatOpen(!sideMin && !dmOpen, !foco);
}
function toggleSide() { sideMin = !sideMin; store.set('voz-side-min', sideMin); applySide(true); }

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
    if (!res.error) window.dispatchEvent(new CustomEvent('talking-chamada', { detail: true }));
    if (res.error) {
      toast(res.error);
      stopMic();
      return;
    }

    currentChannel = id;
    selfId = res.selfId;
    setTimeout(() => { syncDjAudio(); renderDj(); syncTv(); renderTv(); renderArcade(); }, 0);
    modMuted = !!res.modMuted;
    if (modMuted) { muted = true; applyMicState(); }
    palcoMode = res.tipo === 'palco';
    noPalco = false;
    if (palcoMode) toast('🎭 Você está na plateia: pode falar à vontade. Para transmitir, peça para subir ao palco.');
    chatMsgs = Array.isArray(res.chat) ? res.chat.slice() : [];
    chatUnread = 0;
    renderChat(true);
    watching.clear();
    if (localStream) watchSpeaking(selfId, localStream);
    socket.emit('mute', { muted: muted || deafened || !localStream });

    res.peers.forEach((p) => createPeer(p.id, true));
    soundJoin();
    renderAll();
    applySide();
    // Quem já está transmitindo aparece com o botão "Assistir" (não abre sozinho)
  } finally {
    joining = false;
  }
}

function leaveChannel(switching = false) {
  if (!switching) window.dispatchEvent(new CustomEvent('talking-chamada', { detail: false }));
  rejoinId = null;
  if (!currentChannel) return;
  palcoMode = false; noPalco = false;
  stopShare();
  stopCam();
  stopMusic();
  [...peers.keys()].forEach(closePeer);
  socket.emit('leave');
  if (!switching) { stopMic(); soundLeave(); }
  unwatchSpeaking(selfId);
  currentChannel = null;
  setTimeout(() => { syncDjAudio(); renderDj(); syncTv(); renderTv(); renderArcade(); }, 0);
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
    const st = pc.connectionState;
    if (st === 'failed') { pc.restartIce(); peer.failTries = (peer.failTries || 0) + 1; }
    if (st === 'connected') { tuneScreenSenders(peer); tuneCamSenders(peer); peer.failTries = 0; }
    clearTimeout(peer.failTimer);
    if (st === 'failed' || st === 'disconnected') {
      // depois de 5 s sem conectar, avisa no quadradinho (normalmente é rede fechada: precisa de TURN)
      peer.failTimer = setTimeout(() => { if (['failed', 'disconnected'].includes(pc.connectionState)) { peer.semConexao = true; renderMain(); if (!peer.avisou) { peer.avisou = true; toast(`⚠️ Não consegui conectar com ${nameOf(id)} (rede fechada). Clique no aviso no quadradinho para tentar de novo.`); } } }, 5000);
    } else if (peer.semConexao) { peer.semConexao = false; renderMain(); }
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
  if (mic) { peer.micSender = peer.pc.addTrack(mic, localStream); tuneMicSender(peer); }
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
      const plateia = palcoMode && !noPalco;
      p.encodings[0].maxBitrate = economiaAtiva() ? 120_000 : plateia ? 150_000 : 350_000;
      p.encodings[0].maxFramerate = economiaAtiva() ? 12 : plateia ? 15 : 20;
      await sender.setParameters(p);
    } catch {}
  }
}

async function toggleCam() {
  if (camStream) return stopCam();
  if (!currentChannel) return;
  // Na plateia do palco a câmera é pequenininha (só aparece na bolinha da poltrona): resolução baixa pra não pesar
  const plateia = palcoMode && !noPalco;
  if (plateia && currentCh()?.plateia?.cam === 'mudo') return toast('🚫 Nesta sala a plateia fica sem câmera. Peça para subir ao palco.');
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: plateia
        ? { width: { ideal: 240 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 15 }, facingMode: 'user' }
        : economiaAtiva()
          ? { width: { ideal: 320 }, height: { ideal: 180 }, frameRate: { ideal: 12, max: 15 }, facingMode: 'user' }
          : { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 20, max: 24 }, facingMode: 'user' },
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
  if (camFlipTodos) socket.emit('cam-flip', { on: true });
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
      d.title = 'Câmera — TalKing';
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
    if (camFlipTodos) socket.emit('cam-flip', { on: true });
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
// Base: a sua câmera espelhada, a dos outros do jeito que a pessoa mandou (ela pode ter espelhado para todos)
function isMirrored(id) { const base = id === selfId ? true : !!findUser(id)?.camFlip; return base !== !!mirrorPref[mirrorKey(id)]; }
// Espelhar a MINHA câmera para todo mundo (quem está com ela aberta decide)
let camFlipTodos = store.get('voz-espelhar-todos', false) === true;
function toggleCamFlipTodos() {
  camFlipTodos = !camFlipTodos;
  store.set('voz-espelhar-todos', camFlipTodos);
  socket.emit('cam-flip', { on: camFlipTodos });
  toast(camFlipTodos ? '⇄ Os outros agora veem sua câmera espelhada.' : 'Os outros veem sua câmera normal.');
  renderCams();
}
const FLIP_ALL_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M8 8l-5 4 5 4"/><path d="M16 8l5 4-5 4"/><circle cx="19" cy="5" r="2.5"/><circle cx="5" cy="5" r="2.5"/></svg>';
function flipAllButton() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mirror-btn flip-all' + (camFlipTodos ? ' on' : '');
  b.title = camFlipTodos ? 'Os outros veem sua câmera espelhada (clique para desfazer)' : 'Espelhar sua câmera para todo mundo';
  b.innerHTML = FLIP_ALL_SVG;
  b.onclick = (e) => { e.stopPropagation(); toggleCamFlipTodos(); };
  b.onpointerdown = (e) => e.stopPropagation();
  return b;
}
function toggleMirror(id) {
  const k = mirrorKey(id);
  mirrorPref[k] = !mirrorPref[k];
  store.set('voz-espelhar', mirrorPref);
  renderCams();
  document.querySelectorAll('.cam-pip, .cam-mini').forEach((p) => p.querySelector('video').classList.toggle('mirror', isMirrored(p.dataset.id)));
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
  if (data.reset) {
    // o outro lado pediu para refazer a conexão do zero
    const watched = watching.has(from);
    closePeer(from);
    if (watched) watching.add(from);
    createPeer(from, false);
    return;
  }
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
        await pc.setRemoteDescription({ type: d.type, sdp: opusSdp(fastStart(d.sdp)) });
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

// Refaz a conexão com uma pessoa do zero (quando ficou "sem conexão")
function reconnectPeer(id) {
  const peer = peers.get(id);
  if (!peer) return;
  const watched = watching.has(id);
  closePeer(id);
  if (watched) watching.add(id);
  sendSignal(id, { reset: true }); // o outro lado também refaz
  createPeer(id, true);
  toast(`Tentando conectar de novo com ${nameOf(id)}…`);
  renderMain();
}
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
// ---------- 📉 Economia de dados ----------
// 'auto': liga sozinho em dados móveis / internet lenta / "economia de dados" do celular
let economiaModo = store.get('voz-economia', 'auto');
if (!['auto', 'on', 'off'].includes(economiaModo)) economiaModo = 'auto';
function redeFraca() {
  const c = navigator.connection;
  if (!c) return false;
  return !!c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '') || c.type === 'cellular';
}
const economiaAtiva = () => economiaModo === 'on' || (economiaModo === 'auto' && redeFraca());
let economiaUltima = null;
function aplicaEconomia(avisa = true) {
  const on = economiaAtiva();
  document.body.classList.toggle('economia', on);
  if (economiaUltima !== null && on !== economiaUltima && avisa) toast(on ? '📉 Economia de dados ligada (dados móveis ou internet lenta): voz, câmera e transmissões mais leves.' : '📈 Economia de dados desligada.');
  economiaUltima = on;
  // avisa quem transmite pra mim e reajusta o que eu envio
  [...watching].forEach((id) => socket.emit('watch', { id, on: true, leve: on }));
  peers.forEach((peer) => { tuneCamSenders(peer); tuneMicSender(peer); });
  renderEconomia();
}
function renderEconomia() {
  document.querySelectorAll('#economia-seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === economiaModo));
  const el = $('#economia-dica');
  if (el) el.textContent = (economiaAtiva() ? '✅ Ligada agora. ' : '⏸ Desligada agora. ') + 'Com ela ligada: voz em 20 kbps, câmera em 180p, transmissões que você assiste chegam em 480p/15 FPS e o que você transmite sai em 480p. No "Automático", liga sozinha em dados móveis ou internet lenta.';
}
document.querySelectorAll('#economia-seg button').forEach((b) => { b.onclick = () => { economiaModo = b.dataset.v; store.set('voz-economia', economiaModo); aplicaEconomia(); }; });
navigator.connection?.addEventListener?.('change', () => aplicaEconomia());
setTimeout(() => aplicaEconomia(false), 0);
// Microfone: Opus com DTX (não manda nada no silêncio) e bitrate baixo. Voz humana fica ótima em 20–32 kbps.
const OPUS_KBPS = () => (economiaAtiva() ? 20 : 32);
function opusSdp(sdp) {
  if (!sdp) return sdp;
  const kbps = OPUS_KBPS();
  const lines = sdp.split('\r\n');
  const opusPts = new Set();
  lines.forEach((l) => { const m = l.match(/^a=rtpmap:(\d+) opus\/48000/i); if (m) opusPts.add(m[1]); });
  if (!opusPts.size) return sdp;
  const out = [];
  const comFmtp = new Set();
  for (const l of lines) {
    const fm = l.match(/^a=fmtp:(\d+) (.*)$/);
    if (fm && opusPts.has(fm[1])) {
      comFmtp.add(fm[1]);
      let params = fm[2].split(';').map((x) => x.trim()).filter((x) => x && !/^(usedtx|maxaveragebitrate|stereo|sprop-stereo)=/.test(x));
      params.push('usedtx=1', `maxaveragebitrate=${kbps * 1000}`, 'stereo=0', 'sprop-stereo=0');
      out.push(`a=fmtp:${fm[1]} ${params.join(';')}`);
      continue;
    }
    out.push(l);
  }
  for (const pt of opusPts) if (!comFmtp.has(pt)) out.push(`a=fmtp:${pt} usedtx=1;maxaveragebitrate=${kbps * 1000};stereo=0;sprop-stereo=0`);
  return out.join('\r\n');
}
async function tuneMicSender(peer) {
  const sd = peer?.micSender;
  if (!sd) return;
  try {
    const p = sd.getParameters();
    if (!p.encodings?.length) p.encodings = [{}];
    p.encodings[0].maxBitrate = OPUS_KBPS() * 1000;
    await sd.setParameters(p);
  } catch {}
}

const QUALITY = {
  economia: { w: 854, h: 480, fps: 15, bitrate: 700_000, hint: 'motion' },
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
      // quem está assistindo em economia de dados recebe uma versão leve (480p / 15 FPS / 700 kbps)
      const leve = peer.leve || economiaAtiva();
      p.encodings[0].maxBitrate = leve ? Math.min(q().bitrate, 700_000) : q().bitrate;
      p.encodings[0].maxFramerate = leve ? Math.min(q().fps, 15) : q().fps;
      const alt = sender.track.getSettings?.().height || q().h;
      p.encodings[0].scaleResolutionDownBy = leve && alt > 480 ? Math.max(1, alt / 480) : 1;
      // Jogo: quando a internet/PC aperta, diminui a nitidez mas mantém a fluidez
      p.degradationPreference = 'maintain-framerate';
      await sender.setParameters(p);
    } catch {}
  }
}

// ---------- Eventos do servidor ----------
// ---------- 🏰 Servidores (comunidades) ----------
let serversState = []; // [{ id, nome, icone, dono, membros, cargo }]
let currentServer = store.get('voz-servidor', null);
const textUnread = new Map(); // sala de texto -> mensagens não lidas
const srvOf = (id) => serversState.find((sv) => sv.id === id);
const myCargo = (srvId = currentServer) => srvOf(srvId)?.cargo || null;
const podeGerirSrv = (srvId = currentServer) => myCargo(srvId) === 'dono' || myCargo(srvId) === 'mod' || isMod();
function escolheServidor(id, { silencioso = false } = {}) {
  if (!srvOf(id)) return;
  currentServer = id;
  store.set('voz-servidor', id);
  closeTextRoom();
  aplicaBotsDoServidor();
  renderAll();
  if (!silencioso) toast(`🏰 ${srvOf(id).nome}`);
}
// Link de convite aberto no navegador: /entrar/<código>
let pendingInvite = new URLSearchParams(location.search).get('convite') || (location.pathname.match(/^\/entrar\/([A-Za-z0-9_-]{4,16})/) || [])[1] || null;
if (pendingInvite) history.replaceState(null, '', '/');

socket.on('channels', (data) => {
  channelsState = data.channels;
  serversState = data.servers || serversState;
  // Servidor atual: o da sala em que estou, senão o salvo, senão o primeiro
  const daSala = currentChannel && channelsState.find((c) => c.id === currentChannel)?.srv;
  if (daSala && daSala !== currentServer) { currentServer = daSala; store.set('voz-servidor', daSala); }
  if (!srvOf(currentServer)) { currentServer = serversState[0]?.id || null; if (currentServer) store.set('voz-servidor', currentServer); }
  aplicaBotsDoServidor();
  if (textRoom && !channelsState.some((c) => c.id === textRoom)) closeTextRoom();
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
  if (meEntry) {
    modMuted = !!meEntry.modMuted;
    if (modMuted && !muted) { muted = true; applyMicState(); renderControls(); }
    // Sala de palco com plateia sem microfone: avisa uma vez quando passa a valer pra mim
    if (!!meEntry.plateiaMudo !== plateiaMudoAviso) {
      plateiaMudoAviso = !!meEntry.plateiaMudo;
      if (plateiaMudoAviso) toast('🔇 Nesta sala a plateia fica sem microfone. Peça para subir ao palco para falar.');
      else if (modMuted === false && muted) toast('🎙️ Seu microfone foi liberado. Clique no microfone para falar.');
    }
  }
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
  if (palcoMode) { watch(id); toast(`🎬 ${nameOf(id)} começou a transmitir no palco.`); playSound('transmissao'); renderAll(); return; }
  toast(`${nameOf(id)} começou a transmitir a tela. Clique em "Assistir" para ver.`);
  playSound('transmissao');
  renderAll();
});
// 🎭 Subi ao palco / desci do palco
socket.on('stage', ({ on, by }) => {
  noPalco = !!on;
  if (on) {
    toast(`🎭 ${by} te colocou no palco! Agora você pode transmitir a tela.`);
    playSound('fone-on');
  } else {
    if (screenStream) stopShare();
    toast('🎭 Você voltou para a plateia.');
  }
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
socket.on('watch-request', ({ from, on, leve }) => {
  const peer = peers.get(from);
  if (!peer) return;
  peer.watchingMe = !!on;
  peer.leve = !!leve;
  syncScreenSenders();
  tuneScreenSenders(peer);
});

function watch(id) {
  if (!currentChannel || id === selfId) return;
  watching.add(id);
  socket.emit('watch', { id, on: true, leve: economiaAtiva() });
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
socket.on('cam-denied', () => {
  if (camStream) stopCam();
  toast('🚫 Nesta sala a plateia fica sem câmera.');
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

// Sala para onde voltar sozinho quando a conexão cai e volta (em vez de derrubar a chamada)
let rejoinId = null, rejoinShare = false;
socket.on('disconnect', (reason) => {
  if (currentChannel) {
    const caiu = reason !== 'io client disconnect' && reason !== 'io server disconnect';
    rejoinId = caiu ? currentChannel : null;
    rejoinShare = caiu && !!screenStream;
    toast(caiu ? 'Conexão caiu — voltando para a sala sozinho…' : 'Conexão com o servidor perdida.');
    stopShare();
    stopCam();
    [...peers.keys()].forEach(closePeer);
    stopMic();
    currentChannel = null;
    setTimeout(() => { syncDjAudio(); renderDj(); syncTv(); renderTv(); renderArcade(); }, 0);
    watching.clear();
    renderScreens();
    closeVolume();
    renderAll();
  }
});

// ---------- 📱 Ponte com o aplicativo Android (TalKing app) ----------
// Dentro do app, a tela do celular é capturada pelo app (nativo) e entra aqui como um vídeo
// por uma conexão WebRTC local (app → site). Daí o site manda pros amigos como sempre.
const noApp = !!window.TalKingApp;
if (noApp) {
  document.body.classList.add('app');
  const appManda = (m) => { try { window.TalKingApp.postMessage(JSON.stringify(m)); } catch (e) { console.warn('app:', e); } };
  let appPc = null, appResolve = null, appReject = null, appTimer = null;
  const appFecha = () => { if (appPc) { try { appPc.close(); } catch {} appPc = null; } };
  window.TalKingAppRecebe = async (m) => {
    try {
      if (typeof m === 'string') m = JSON.parse(m);
      if (m.tipo === 'offer') {
        appFecha();
        appPc = new RTCPeerConnection({ iceServers: [] });
        appPc.onicecandidate = (e) => { if (e.candidate) appManda({ tipo: 'ice', candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
        appPc.ontrack = (e) => { const st = e.streams[0] || new MediaStream([e.track]); if (appResolve) { clearTimeout(appTimer); appResolve(st); appResolve = appReject = null; } };
        await appPc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
        const a = await appPc.createAnswer();
        await appPc.setLocalDescription(a);
        appManda({ tipo: 'answer', sdp: appPc.localDescription.sdp });
      } else if (m.tipo === 'ice') {
        if (appPc && m.candidate) await appPc.addIceCandidate(m.candidate).catch(() => {});
      } else if (m.tipo === 'share-erro') {
        clearTimeout(appTimer);
        if (appReject) appReject(new Error(m.msg || 'cancelado'));
        appResolve = appReject = null;
        if (m.msg) toast(m.msg);
      } else if (m.tipo === 'share-fim') {
        if (screenStream) stopShare();
      } else if (m.tipo === 'voltar') {
        // botão voltar do celular: fecha o que estiver aberto; se nada, o app decide
        const aberto = [...document.querySelectorAll('.modal:not([hidden])')].pop();
        if (aberto) { aberto.hidden = true; return appManda({ tipo: 'voltar-ok', fechou: true }); }
        if (textRoom) { closeTextRoom(); renderChannels(); return appManda({ tipo: 'voltar-ok', fechou: true }); }
        if (dmOpen) { setDmOpen(false); return appManda({ tipo: 'voltar-ok', fechou: true }); }
        appManda({ tipo: 'voltar-ok', fechou: false, emChamada: !!currentChannel });
      }
    } catch (e) { console.warn('ponte app:', e); }
  };
  // Dentro do app, "compartilhar tela" pede a captura nativa
  navigator.mediaDevices.getDisplayMedia = (c = {}) => new Promise((res, rej) => {
    appResolve = res; appReject = rej;
    const v = c.video || {};
    appManda({ tipo: 'share-start', fps: v.frameRate?.ideal || 30, w: v.width?.ideal || 1280, h: v.height?.ideal || 720 });
    appTimer = setTimeout(() => { if (appReject) appReject(new Error('timeout')); appResolve = appReject = null; }, 60_000);
  });
  // avisa o app quando a transmissão para (botão do site)
  window.addEventListener('talking-share-stop', () => { appManda({ tipo: 'share-stop' }); appFecha(); });
  // em chamada: o app segura um serviço em segundo plano (voz continua com a tela apagada)
  window.addEventListener('talking-chamada', (e) => appManda({ tipo: e.detail ? 'call-on' : 'call-off' }));
}

// ---------- Compartilhar tela ----------
async function toggleShare() {
  if (screenStream) return stopShare();
  if (!currentChannel) return;
  if (palcoMode && !noPalco) return toast('🎭 Só quem está no palco transmite a tela. Peça para subir ao palco.');
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
  window.dispatchEvent(new Event('talking-share-stop'));
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
      if (clipRecs.has(id)) { clipRecs.get(id).parar(); clipRecs.delete(id); }
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
          <button class="clip"></button><button class="icon-btn clip-off" title="Desligar os clipes" hidden>⏹</button>
          <button class="icon-btn cams" title="Mostrar/esconder as câmeras dos outros por cima da transmissão">👥</button>
          <button class="icon-btn fs" title="Tela cheia">${ICON.full}</button>
          <button class="icon-btn close" title="${mine ? 'Parar de transmitir' : 'Parar de assistir'}">${ICON.close}</button>
        </div>
        <div class="fs-bar">
          <button class="fs-btn fs-mic" title="Microfone"></button>
          <button class="fs-btn fs-deaf" title="Ouvir"></button>
          ${mine ? '' : `<label class="fs-vol" title="Volume desta transmissão"><span class="ico">${ICON.speaker}</span>
            <input type="range" min="0" max="100"><span class="fs-vol-val"></span></label>`}
          <button class="fs-btn clip" title="Clipar"></button>
          <button class="fs-btn fs-exit" title="Sair da tela cheia">${ICON.exitFull}</button>
        </div>`;
      el.querySelector('.fs-mic').onclick = toggleMute;
      el.querySelector('.fs-deaf').onclick = toggleDeafen;
      el.querySelector('.fs-exit').onclick = () => document.exitFullscreen?.();
      // Controles aparecem ao mexer o mouse/tocar e somem sozinhos
      let lx = -1, ly = -1;
      const wake = (e) => {
        // ignora "movimento" falso: o navegador avisa movimento quando a imagem muda embaixo do mouse parado
        if (e && e.type === 'pointermove') {
          if (Math.abs(e.clientX - lx) < 4 && Math.abs(e.clientY - ly) < 4) return;
          lx = e.clientX; ly = e.clientY;
        }
        el.classList.remove('idle');
        clearTimeout(el._idle);
        el._idle = setTimeout(() => {
          // com o mouse em cima de um botão, espera mais um pouco
          if (matchMedia('(hover: hover)').matches && el.querySelector('.screen-tools:hover, .fs-bar:hover')) return wake();
          el.classList.add('idle');
        }, 3000);
      };
      wake();
      el.addEventListener('pointermove', wake);
      el.addEventListener('pointerdown', wake);
      el.addEventListener('fullscreenchange', () => wake());
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
      el.querySelector('.cams').onclick = toggleCamStrip;
      el.querySelectorAll('.clip').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); clipToggle(id, b); }; });
      el.querySelector('.clip-off').onclick = () => clipOff();
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
    updateCamStrip(el, id);
    if (live) clipGarante(id);
    updateClipButtons(el, id);
    const fc = el.querySelector('.float-cam');
    if (fc) fc.hidden = !(camStream && !camFloating && canFloat());
  });

  applyLatencyMode();
  box.dataset.count = String(box.querySelectorAll('.screen-card').length || list.length);
  box.hidden = list.length === 0;
  $('#stage').classList.toggle('sharing', list.length > 0);
  // Marca d'água some quando tem transmissão na tela (não atrapalha a imagem)
  document.body.classList.toggle('has-stream', list.length > 0);
}

// Quadradinho da câmera por cima da tela de quem transmite (dá para arrastar
// e mudar o tamanho puxando o canto)
// Câmeras de quem transmite que você escolheu esconder (só nesta tela; o 👥 traz de volta)
const camPipHidden = new Set();
function updateCamPip(card, id) {
  const st = camOf(id);
  let pip = card.querySelector('.cam-pip');
  if (!st || camPipHidden.has(id)) { if (pip) { pip.querySelector('video').srcObject = null; pip.remove(); } return; }
  if (!pip) {
    pip = document.createElement('div');
    pip.className = 'cam-pip';
    pip.title = 'Arraste para mover · puxe o canto para mudar o tamanho';
    pip.innerHTML = '<video autoplay playsinline muted></video><button type="button" class="x" title="Esconder a câmera de quem transmite (só para você)">×</button>';
    pip.appendChild(mirrorButton(id));
    const x = pip.querySelector('.x');
    x.onpointerdown = (e) => e.stopPropagation();
    x.onclick = (e) => { e.stopPropagation(); camPipHidden.add(id); renderScreens(); toast('Câmera de quem transmite escondida (só para você). Use 👥 para trazer de volta.'); };
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

// ---------- 🎬 Clipes: salvar os últimos 30 s de uma transmissão ----------
// Assim que uma transmissão aparece na tela, o navegador começa a guardar os últimos 30 s
// dela (pedaço anterior + atual, nada é salvo no servidor). Clicou em "Clipar": manda os
// dois pedaços para o servidor, que corta os últimos 30 s e põe o vídeo no chat da sala.
// Imagem do clipe = o que você vê (tela + janelinhas de câmera no lugar onde estão).
// Som do clipe = som da transmissão + vozes da chamada (inclusive a sua).
// A montagem tela+câmeras roda num "worker" (continua mesmo com a aba escondida).
const CLIP_SEG_MS = 30_000; // tamanho de cada pedaço gravado
const CLIP_GUARDA_S = 60; // segundos guardados na memória (além do pedaço que está sendo gravado)
const CLIP_OPCOES = [30, 45, 60];
let clipSeg = CLIP_OPCOES.includes(store.get('voz-clip-seg', 30)) ? store.get('voz-clip-seg', 30) : 30;
const clipRecs = new Map(); // id da transmissão -> gravador
let clipAuto = store.get('voz-clip-auto', true) !== false; // gravar sozinho quando tem transmissão
const CLIP_WORKER = `
let W = 0, H = 0, writer = null, layout = [], cams = new Map(), canvas = null, ctx = null, rodando = true, lidos = 0, escritos = 0;
setInterval(() => postMessage({ lidos, escritos }), 1000);
function cover(img, x, y, w, h, mirror) {
  const iw = img.displayWidth || img.width, ih = img.displayHeight || img.height;
  if (!iw || !ih) return;
  const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k, sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(12, w * 0.08)); ctx.clip();
  if (mirror) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h); }
  else ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(12, w * 0.08)); ctx.lineWidth = Math.max(2, w * 0.015); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke(); ctx.restore();
}
function nome(txt, x, y, w, h) {
  if (!txt) return;
  const fs = Math.max(11, Math.round(h * 0.11));
  ctx.save(); ctx.font = 'bold ' + fs + 'px sans-serif'; ctx.textBaseline = 'bottom';
  const tw = Math.min(w - 8, ctx.measureText(txt).width + 10);
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x + 4, y + h - fs - 10, tw, fs + 6);
  ctx.fillStyle = '#fff'; ctx.fillText(txt, x + 9, y + h - 6, w - 18); ctx.restore();
}
async function leTela(readable) {
  const reader = readable.getReader();
  while (rodando) {
    const { value: frame, done } = await reader.read();
    if (done) break;
    lidos++;
    try {
      // Clipe no máximo em 720p (fica leve para gravar e bom para mandar no WhatsApp)
      const k = Math.min(1, 1280 / frame.displayWidth, 720 / frame.displayHeight);
      const nw = Math.round(frame.displayWidth * k / 2) * 2, nh = Math.round(frame.displayHeight * k / 2) * 2;
      if (!canvas || W !== nw || H !== nh) {
        W = nw; H = nh;
        canvas = new OffscreenCanvas(W, H); ctx = canvas.getContext('2d', { alpha: false });
      }
      ctx.drawImage(frame, 0, 0, W, H);
      for (const l of layout) {
        const c = cams.get(l.id);
        const x = l.x * W, y = l.y * H, w = l.w * W, h = l.h * H;
        if (c && c.frame) cover(c.frame, x, y, w, h, l.mirror);
        else { ctx.fillStyle = '#111'; ctx.fillRect(x, y, w, h); }
        nome(l.nome, x, y, w, h);
      }
      const out = new VideoFrame(canvas, { timestamp: frame.timestamp, duration: frame.duration || undefined });
      frame.close();
      if (writer) { await writer.write(out); escritos++; } else out.close();
    } catch (e) { try { frame.close(); } catch {} }
  }
}
async function leCam(id, readable) {
  const c = { reader: readable.getReader(), frame: null };
  cams.set(id, c);
  while (rodando && cams.get(id) === c) {
    const { value, done } = await c.reader.read();
    if (done) break;
    if (c.frame) c.frame.close();
    c.frame = value;
  }
  if (c.frame) { c.frame.close(); c.frame = null; }
}
onmessage = (e) => {
  const m = e.data;
  if (m.tipo === 'tela') { writer = m.writable.getWriter(); leTela(m.readable); }
  else if (m.tipo === 'cam') { leCam(m.id, m.readable); }
  else if (m.tipo === 'semcam') { const c = cams.get(m.id); if (c) { cams.delete(m.id); try { c.reader.cancel(); } catch {} } }
  else if (m.tipo === 'layout') layout = m.layout;
  else if (m.tipo === 'parar') { rodando = false; try { writer && writer.close(); } catch {} cams.forEach((c) => { try { c.reader.cancel(); } catch {} }); close(); }
};
`;
let clipWorkerUrl = null;
const podeMontar = () => !!(window.MediaStreamTrackProcessor && window.MediaStreamTrackGenerator && window.OffscreenCanvas);
// WebM primeiro: é o formato que o Chrome grava há anos (o MP4 do Chrome ainda dá problema no corte)
function clipMime() {
  if (!window.MediaRecorder) return null;
  const tipos = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'];
  return tipos.find((t) => MediaRecorder.isTypeSupported(t)) || null;
}
// Onde a imagem do vídeo aparece dentro do cartão (object-fit: contain)
function areaDoVideo(card) {
  const v = card.querySelector(':scope > video');
  const r = v.getBoundingClientRect();
  const vw = v.videoWidth || 16, vh = v.videoHeight || 9;
  const k = Math.min(r.width / vw, r.height / vh);
  const w = vw * k, h = vh * k;
  return { x: r.left + (r.width - w) / 2, y: r.top + (r.height - h) / 2, w, h };
}
class ClipRec {
  constructor(id) {
    this.id = id;
    this.mime = clipMime();
    this.prevs = []; // últimos pedaços completos ({ blob, sec }), do mais velho para o mais novo
    this.cur = null; // gravador atual
    this.curStart = 0;
    this.saving = false;
    this.ctx = null;
    this.dest = null;
    this.fontes = new Map(); // track -> source
    this.parado = false;
    this.worker = null;
    this.gen = null;
    this.telaTrack = null;
    this.camsNoWorker = new Map(); // id -> track
    this.rodar();
    this.mixTimer = setInterval(() => { this.atualizaVozes(); this.atualizaCams(); }, 1000);
  }
  video() { return this.id === selfId ? screenStream : peers.get(this.id)?.screenStream; }
  card() { return screenCards.get(this.id); }
  // Vídeo que vai ser gravado: a tela montada com as câmeras (ou só a tela, se o navegador não souber montar)
  trackDeVideo() {
    const v = this.video();
    const t = v?.getVideoTracks()[0];
    if (!t) return null;
    if (!podeMontar()) return t;
    if (this.gen && this.telaTrack === t && this.gen.readyState === 'live') return this.gen;
    this.fechaWorker();
    try {
      if (!clipWorkerUrl) clipWorkerUrl = URL.createObjectURL(new Blob([CLIP_WORKER], { type: 'text/javascript' }));
      this.worker = new Worker(clipWorkerUrl);
      this.worker.onmessage = (e) => { this.stats = e.data; };
      this.gen = new MediaStreamTrackGenerator({ kind: 'video' });
      const readable = new MediaStreamTrackProcessor({ track: t }).readable;
      this.worker.postMessage({ tipo: 'tela', readable, writable: this.gen.writable }, [readable, this.gen.writable]);
      this.telaTrack = t;
      this.camsNoWorker.clear();
      this.atualizaCams();
      return this.gen;
    } catch (e) {
      console.warn('clip montar:', e);
      this.fechaWorker();
      return t;
    }
  }
  fechaWorker() {
    if (this.worker) { try { this.worker.postMessage({ tipo: 'parar' }); } catch {} setTimeout((w) => w.terminate(), 1500, this.worker); }
    this.worker = null; this.gen = null; this.telaTrack = null; this.camsNoWorker.clear();
  }
  // Manda para o worker as câmeras que estão na tela e onde elas estão (em % da imagem)
  atualizaCams() {
    if (!this.worker) return;
    const card = this.card();
    if (!card) return;
    const area = areaDoVideo(card);
    if (!area.w || !area.h) return;
    const layout = [];
    const vivas = new Set();
    card.querySelectorAll('.cam-pip, .cam-mini').forEach((el) => {
      const id = el.dataset.id;
      const st = camOf(id);
      const track = st?.getVideoTracks()[0];
      if (!track) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      vivas.add(id);
      if (this.camsNoWorker.get(id) !== track) {
        try {
          const readable = new MediaStreamTrackProcessor({ track }).readable;
          this.worker.postMessage({ tipo: 'cam', id, readable }, [readable]);
          this.camsNoWorker.set(id, track);
        } catch {}
      }
      // Se a janelinha estiver fora da imagem (nas faixas pretas), entra para dentro no clipe
      const w = Math.min(1, r.width / area.w), h = Math.min(1, r.height / area.h);
      layout.push({
        id, mirror: isMirrored(id), nome: el.classList.contains('cam-mini') ? (id === selfId ? 'Você' : nameOf(id)) : '',
        x: Math.max(0, Math.min(1 - w, (r.left - area.x) / area.w)), y: Math.max(0, Math.min(1 - h, (r.top - area.y) / area.h)), w, h,
      });
    });
    this.camsNoWorker.forEach((_, id) => { if (!vivas.has(id)) { this.worker.postMessage({ tipo: 'semcam', id }); this.camsNoWorker.delete(id); } });
    const chave = JSON.stringify(layout);
    if (chave !== this.ultimoLayout) { this.ultimoLayout = chave; this.worker.postMessage({ tipo: 'layout', layout }); }
  }
  // Mistura o som da transmissão com as vozes de todo mundo
  stream() {
    const vt = this.trackDeVideo();
    if (!vt) return null;
    const out = new MediaStream([vt]);
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.dest = this.ctx.createMediaStreamDestination();
      }
      this.atualizaVozes();
      if (this.dest.stream.getAudioTracks().length) out.addTrack(this.dest.stream.getAudioTracks()[0]);
    } catch {}
    return out;
  }
  atualizaVozes() {
    if (!this.ctx) return;
    const tracks = new Set();
    const v = this.video();
    if (v) v.getAudioTracks().forEach((t) => tracks.add(t));
    peers.forEach((p) => { try { p.pc.getReceivers().forEach((r) => { if (r.track?.kind === 'audio' && r.track.readyState === 'live') tracks.add(r.track); }); } catch {} });
    if (localStream && !muted) localStream.getAudioTracks().forEach((t) => tracks.add(t));
    tracks.forEach((t) => {
      if (this.fontes.has(t)) return;
      try { const s = this.ctx.createMediaStreamSource(new MediaStream([t])); s.connect(this.dest); this.fontes.set(t, s); } catch {}
    });
    this.fontes.forEach((s, t) => { if (!tracks.has(t)) { try { s.disconnect(); } catch {} this.fontes.delete(t); } });
  }
  rodar() {
    if (this.parado || !this.mime) return;
    const st = this.stream();
    if (!st || !st.getVideoTracks().length) { this.timer = setTimeout(() => this.rodar(), 1000); return; }
    let rec;
    try { rec = new MediaRecorder(st, { mimeType: this.mime, videoBitsPerSecond: 3_000_000, audioBitsPerSecond: 128_000, videoKeyFrameIntervalDuration: 2000 }); } catch (e) { console.warn('clip:', e); this.mime = null; return; }
    const chunks = [];
    rec._mime = this.mime;
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    rec.onstop = () => {
      clearTimeout(rec._vigia);
      const blob = new Blob(chunks, { type: rec._mime.split(';')[0] });
      if (rec._onblob) { const f = rec._onblob; rec._onblob = null; f(blob); } else this.guarda(blob, rec._sec || 0);
    };
    rec.onerror = (e) => { console.warn('clip gravador:', e.error || e); this.trocaFormato(rec); };
    try { rec.start(1000); } catch (e) { console.warn('clip start:', e); this.trocaFormato(rec); return; }
    this.cur = rec;
    this.curStart = Date.now();
    this.timer = setTimeout(() => this.rotaciona(), CLIP_SEG_MS);
    // Vigia: se em 4 s não chegou nenhum pedaço de vídeo, esse formato não está funcionando aqui
    rec._vigia = setTimeout(() => { if (!chunks.length && this.cur === rec) this.trocaFormato(rec); }, 4000);
  }
  // O formato escolhido (ex.: MP4) não gravou: tenta o próximo (WebM); se nada funcionar, desiste
  trocaFormato(rec) {
    clearTimeout(this.timer);
    clearTimeout(rec?._vigia);
    if (this.cur === rec) this.cur = null;
    try { if (rec && rec.state !== 'inactive') { rec._onblob = () => {}; rec.stop(); } } catch {}
    const tipos = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'];
    const i = tipos.indexOf(this.mime);
    const prox = tipos.slice(i + 1).find((t) => MediaRecorder.isTypeSupported(t));
    this.prevs = [];
    if (!prox) { this.mime = null; console.warn('clip: nenhum formato gravou'); toast('Não consegui gravar clipes neste navegador.'); renderScreens(); return; }
    console.warn('clip: trocando formato', this.mime, '->', prox);
    this.mime = prox;
    this.rodar();
  }
  rotaciona() {
    const rec = this.cur;
    this.cur = null;
    if (rec && rec.state !== 'inactive') { rec._sec = (Date.now() - this.curStart) / 1000; rec.stop(); }
    this.rodar();
  }
  // Guarda um pedaço fechado; joga fora os mais velhos quando já tem mais de 1 min guardado
  guarda(blob, sec) {
    if (!blob.size || sec <= 0) return;
    this.prevs.push({ blob, sec });
    let total = this.prevs.reduce((a, p) => a + p.sec, 0);
    while (this.prevs.length > 1 && total - this.prevs[0].sec >= CLIP_GUARDA_S) total -= this.prevs.shift().sec;
  }
  segundosGravados() { return this.prevs.reduce((a, p) => a + p.sec, 0) + (Date.now() - this.curStart) / 1000; }
  // Clicou em "Clipar": fecha o pedaço atual e manda os pedaços guardados + o atual
  // (o servidor corta os últimos N segundos que já passaram)
  async clipar(seg = clipSeg) {
    if (this.saving) return;
    if (!this.cur) { toast(this.mime ? 'O gravador ainda está começando. Tente de novo em alguns segundos.' : 'Não consegui gravar clipes neste navegador.'); return; }
    this.saving = true;
    renderScreens();
    clearTimeout(this.timer);
    const rec = this.cur;
    const secAtual = (Date.now() - this.curStart) / 1000;
    // só os pedaços necessários para cobrir N segundos (menos coisa para subir)
    const prevs = [];
    let soma = secAtual;
    for (let i = this.prevs.length - 1; i >= 0 && soma < seg; i--) { prevs.unshift(this.prevs[i].blob); soma += this.prevs[i].sec; }
    this.cur = null;
    const atual = await new Promise((res) => {
      rec._onblob = res;
      // se o gravador não fechar em 4 s, segue com o que tiver
      const t = setTimeout(() => { if (rec._onblob) { rec._onblob = null; res(new Blob([])); } }, 4000);
      rec.addEventListener('stop', () => clearTimeout(t), { once: true });
      try { rec.state === 'inactive' ? rec.onstop() : rec.stop(); } catch (e) { clearTimeout(t); if (rec._onblob) { rec._onblob = null; res(new Blob([])); } }
    });
    // o pedaço fechado agora continua valendo para o próximo clipe
    this.guarda(atual, secAtual);
    this.rodar(); // continua gravando para o próximo clipe
    try {
      const partes = [...prevs, atual].filter((b) => b && b.size);
      if (!partes.length) throw new Error('O gravador não produziu vídeo. Tente de novo em alguns segundos.');
      const r = await fetch('/api/clip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Authorization: `Bearer ${authToken}`,
          'X-Partes': partes.map((b) => b.size).join(','),
          'X-Clip-Seg': String(seg),
          'X-Clip-De': encodeURIComponent(this.id === selfId ? myName : nameOf(this.id)),
          'X-Clip-Sala': currentChannel || '',
        },
        body: new Blob(partes),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não consegui salvar o clipe.');
      toast(`🎬 Clipe de ${j.segundos}s salvo! Está no chat da sala.`);
    } catch (e) {
      toast(e.message || 'Não consegui salvar o clipe.');
    }
    this.saving = false;
    renderScreens();
  }
  parar() {
    this.parado = true;
    clearTimeout(this.timer);
    clearInterval(this.mixTimer);
    if (this.cur && this.cur.state !== 'inactive') { this.cur._onblob = () => {}; this.cur.stop(); }
    this.cur = null; this.prevs = [];
    this.fechaWorker();
    try { this.ctx?.close(); } catch {}
  }
}
// Liga/garante o gravador de uma transmissão que está na tela
function clipGarante(id) {
  if (!clipAuto || clipRecs.has(id) || !clipMime()) return;
  clipRecs.set(id, new ClipRec(id));
}
// Caixinha para escolher quantos segundos clipar
function clipEscolhe(id, btn) {
  const r = clipRecs.get(id);
  if (!r) return;
  document.querySelectorAll('.clip-pop').forEach((p) => p.remove());
  const pop = document.createElement('div');
  pop.className = 'clip-pop';
  const tem = r.segundosGravados();
  pop.innerHTML = `<div class="clip-pop-t">Clipar os últimos…</div>` + CLIP_OPCOES.map((n) => {
    const falta = n > tem + 2;
    return `<button type="button" data-seg="${n}" class="${n === clipSeg ? 'sel' : ''}" ${falta ? 'disabled title="Ainda não tem isso tudo gravado"' : ''}>${n === 60 ? '1 min' : n + ' s'}${falta ? ` <small>(tem ${Math.max(0, Math.floor(tem))} s)</small>` : ''}</button>`;
  }).join('');
  pop.querySelectorAll('button[data-seg]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      clipSeg = Number(b.dataset.seg);
      store.set('voz-clip-seg', clipSeg);
      pop.remove();
      r.clipar(clipSeg);
      toast('🎬 Salvando o clipe…');
      renderScreens();
    };
  });
  pop.onpointerdown = (e) => e.stopPropagation();
  const card = btn.closest('.screen-card');
  card.appendChild(pop);
  // perto do botão que foi clicado
  const cr = card.getBoundingClientRect(), br = btn.getBoundingClientRect();
  const emBaixo = btn.classList.contains('fs-btn');
  if (emBaixo) { pop.style.left = `${Math.max(8, br.left - cr.left + br.width / 2 - 110)}px`; pop.style.bottom = `${cr.bottom - br.top + 8}px`; }
  else { pop.style.right = `${Math.max(8, cr.right - br.right)}px`; pop.style.top = `${br.bottom - cr.top + 6}px`; }
  setTimeout(() => document.addEventListener('pointerdown', () => pop.remove(), { once: true }), 0);
}
function clipToggle(id, btn) {
  const r = clipRecs.get(id);
  if (r) {
    if (r.saving) return;
    if (r.segundosGravados() < 3) { toast('Espere alguns segundos gravando antes de clipar.'); return; }
    clipEscolhe(id, btn);
    return;
  }
  if (!clipMime()) { toast('Este navegador não grava vídeo. Use o Chrome ou o Edge.'); return; }
  clipAuto = true;
  store.set('voz-clip-auto', true);
  clipGarante(id);
  toast('🎬 Clipes ligados: a partir de agora o último minuto fica sempre guardado.');
  renderScreens();
}
function clipOff() {
  clipAuto = false;
  store.set('voz-clip-auto', false);
  clipRecs.forEach((r) => r.parar());
  clipRecs.clear();
  toast('Clipes desligados (o computador para de gravar). Clique em 🎬 para ligar de novo.');
  renderScreens();
}
function updateClipButtons(el, id) {
  const r = clipRecs.get(id);
  el.querySelectorAll('.clip').forEach((b) => {
    b.classList.toggle('on', !!r);
    b.classList.toggle('busy', !!r?.saving);
    b.textContent = r ? (r.saving ? '⏳ Salvando…' : '🎬 Clipar') : '🎬 Clipes';
    b.title = r ? 'Salvar os últimos 30 s, 45 s ou 1 min desta transmissão no chat' : 'Ligar os clipes: o último 1 minuto fica sempre guardado';
  });
  el.querySelectorAll('.clip-off').forEach((b) => { b.hidden = !r; });
}

// ---------- Câmeras dos outros por cima da transmissão ----------
// Enquanto você assiste a tela de alguém, quem mais está com a câmera ligada
// (inclusive você) aparece numa fileira de janelinhas. O botão 👥 mostra/esconde
// todas; o × de cada uma esconde só aquela pessoa.
let camStripOn = store.get('voz-cams-na-tela', true) !== false;
const camStripHidden = new Set(); // pessoas escondidas com o ×
let camMiniResizing = false; // alguém está puxando o canto de uma janelinha
function toggleCamStrip() {
  camStripOn = !camStripOn;
  if (camStripOn) { camStripHidden.clear(); camPipHidden.clear(); }
  store.set('voz-cams-na-tela', camStripOn);
  renderScreens();
  toast(camStripOn ? '👥 Câmeras dos outros aparecem por cima da transmissão.' : 'Câmeras dos outros escondidas (só nesta tela).');
}
// Deixa um elemento arrastável dentro do cartão da transmissão, guardando a posição
function makeDraggable(el, card, key, aoSoltar) {
  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const m = e.target.closest('.cam-mini');
    if (m) { const mr = m.getBoundingClientRect(); if (e.clientX > mr.right - 18 && e.clientY > mr.bottom - 18) return; }
    const r = el.getBoundingClientRect(), c = card.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, c };
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const { c } = drag;
    const x = Math.max(0, Math.min(e.clientX - c.left - drag.dx, c.width - el.offsetWidth));
    const y = Math.max(0, Math.min(e.clientY - c.top - drag.dy, c.height - el.offsetHeight));
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    el.style.right = 'auto'; el.style.bottom = 'auto';
  });
  const end = () => {
    if (drag) {
      if (aoSoltar) aoSoltar();
      else { const c = card.getBoundingClientRect(), r = el.getBoundingClientRect(); if (c.width && r.width) store.set(key, { x: (r.left - c.left) / c.width, y: (r.top - c.top) / c.height }); }
    }
    drag = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  requestAnimationFrame(() => {
    const sv = key ? store.get(key, null) : null, c = card.getBoundingClientRect();
    if (sv && c.width) {
      el.style.left = `${Math.max(0, Math.min(sv.x, 0.9)) * c.width}px`;
      el.style.top = `${Math.max(0, Math.min(sv.y, 0.9)) * c.height}px`;
      el.style.right = 'auto'; el.style.bottom = 'auto';
    }
  });
}
// chave para lembrar posição/tamanho da janelinha de cada pessoa (neste navegador)
function camMiniKey(id) { return id === selfId ? 'eu' : String(findUser(id)?.uid || nameOf(id)); }
let camMiniPos = store.get('voz-cammini-pos', {}) || {};
function updateCamStrip(card, sharerId) {
  card.querySelectorAll('.cam-strip').forEach((s) => s.remove()); // versão antiga (fileira)
  const ch = currentCh();
  const list = camStripOn && ch
    ? ch.users.filter((u) => u.id !== sharerId && !camStripHidden.has(u.id) && camOf(u.id)).map((u) => u.id)
    : [];
  card.querySelector('.cams')?.classList.toggle('on', camStripOn);
  // tira quem saiu / desligou a câmera
  card.querySelectorAll('.cam-mini').forEach((m) => {
    if (!list.includes(m.dataset.id)) { m.querySelector('video').srcObject = null; m.remove(); }
  });
  list.forEach((id, i) => {
    let m = card.querySelector(`.cam-mini[data-id="${CSS.escape(id)}"]`);
    if (!m) {
      m = document.createElement('div');
      m.className = 'cam-mini';
      m.dataset.id = id;
      m.innerHTML = '<video autoplay playsinline muted></video><span class="nm"></span><button class="x" title="Esconder esta câmera">×</button>';
      m.title = 'Arraste para mover · puxe o canto para mudar o tamanho';
      m.querySelector('.x').onclick = (e) => { e.stopPropagation(); camStripHidden.add(id); renderScreens(); };
      m.querySelector('.x').onpointerdown = (e) => e.stopPropagation();
      m.appendChild(mirrorButton(id));
      card.appendChild(m);
      const key = camMiniKey(id);
      // cada janelinha é independente: posição e tamanho lembrados por pessoa
      m.style.visibility = 'hidden';
      const posiciona = () => {
        const sv = camMiniPos[key];
        const c = card.getBoundingClientRect();
        if (!c.width) { requestAnimationFrame(posiciona); return; } // cartão ainda sem tamanho
        if (sv) {
          m.style.width = `${Math.max(80, sv.w * c.width)}px`;
          m.style.left = `${Math.max(0, Math.min(sv.x, 0.9)) * c.width}px`;
          m.style.top = `${Math.max(0, Math.min(sv.y, 0.9)) * c.height}px`;
        } else {
          // sem posição salva: uma do lado da outra, embaixo à esquerda
          const w = Math.max(88, Math.min(160, c.width * 0.14));
          m.style.width = `${w}px`;
          m.style.left = `${12 + i * (w + 8)}px`;
          m.style.top = `${Math.max(0, c.height - w * 0.75 - 56)}px`;
        }
        m.style.right = 'auto'; m.style.bottom = 'auto';
        m.style.visibility = '';
      };
      requestAnimationFrame(posiciona);
      const salva = () => {
        const cr = card.getBoundingClientRect(), r = m.getBoundingClientRect();
        if (!cr.width || !r.width) return;
        camMiniPos[key] = { x: (r.left - cr.left) / cr.width, y: (r.top - cr.top) / cr.height, w: r.width / cr.width };
        store.set('voz-cammini-pos', camMiniPos);
      };
      makeDraggable(m, card, null, salva);
      new ResizeObserver(() => { if (camMiniResizing && m.matches(':active')) salva(); }).observe(m);
      m.addEventListener('pointerdown', (e) => { const r = m.getBoundingClientRect(); camMiniResizing = e.clientX > r.right - 18 && e.clientY > r.bottom - 18; });
      m.addEventListener('pointerup', () => { if (camMiniResizing) { camMiniResizing = false; salva(); } });
    }
    m.querySelector('.nm').textContent = id === selfId ? 'Você' : nameOf(id);
    const v = m.querySelector('video');
    const st = camOf(id);
    if (v.srcObject !== st) { v.srcObject = st; v.play().catch(() => {}); }
    v.classList.toggle('mirror', isMirrored(id));
  });
}

// ---------- 🤖 DJ King (bot de música) ----------
// O servidor diz o que está tocando e desde quando; cada aparelho toca por conta própria,
// no mesmo ponto. Quem está na chamada com o DJ controla a fila.
let dj = null; // estado completo vindo do servidor
let djClock = 0; // diferença entre o relógio daqui e o do servidor
let djVolume = store.get('voz-dj-vol', 0.5);
let djMuted = !!store.get('voz-dj-mute', false); // mudo só para mim
const djAudio = new Audio();
djAudio.preload = 'auto';
$('#audio-sink').appendChild(djAudio);
// Tenta recarregar a música neste aparelho (quando ela travou ou acabou antes da hora)
function djRecarregar() {
  const n = dj?.now;
  if (!n || n.kind === 'yt') return;
  djAudio.dataset.key = '';
  setTimeout(() => { if (dj?.now?.key === n.key) syncDjAudio(); }, 1500);
}
djAudio.addEventListener('ended', () => {
  const n = dj?.now;
  if (!n) return;
  socket.emit('dj-ended', { key: n.key });
  // acabou cedo demais? então foi a conexão: recarrega e volta para o ponto certo
  if (n.duration && djPos() < n.duration - 6) djRecarregar();
});
djAudio.addEventListener('error', () => {
  if (!dj?.now || !djAudio.src || djAudio.dataset.key !== dj.now.key) return;
  socket.emit('dj-ended', { key: dj.now.key, error: true });
  djRecarregar();
});
const djHere = () => !!(dj && currentChannel && dj.room === currentChannel);
const djPos = () => (dj?.now ? Math.max(0, ((dj.now.pausedAt || (Date.now() - djClock)) - dj.now.startedAt) / 1000) : 0);
const djUrl = (t) => (t.url.startsWith('/') ? location.origin + t.url : t.url);
const fmtDur = (s) => (s == null || !isFinite(s) ? '' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);

socket.on('dj', (st) => {
  if (!guardaBot('dj', st)) return;
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
  djAudio.muted = deafened || djMuted;
  tvVideo.muted = deafened || tvMuted;
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
      if (deafened || djMuted) p.mute(); else p.unMute();
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
    if (deafened || djMuted) p.mute(); else p.unMute();
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
  if (typeof updateMediaClass === 'function') updateMediaClass();
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
  $('#dj-yt-full').hidden = !(n && n.kind === 'yt');
  $('#dj-now').innerHTML = n
    ? `${art(capa)}<div class="dj-meta"><strong>${esc(titulo)}</strong><small>${sub}</small>
        <div class="dj-bar"><i id="dj-prog"></i></div><small id="dj-time"></small></div>`
    : `<span class="dj-art dj-art-empty">🤖</span><div class="dj-meta"><strong>Nada tocando</strong><small>Toque em "Adicionar música" para começar.</small></div>`;
  $('#dj-play').textContent = n && !n.pausedAt ? '⏸' : '▶';
  $('#dj-mini-play').textContent = n && !n.pausedAt ? '⏸' : '▶';
  $('#dj-mini-now').textContent = n ? `· ${titulo}${n.pausedAt ? ' (pausado)' : ''}` : '· nada tocando';
  $('#dj-play').disabled = !n && !dj.queue.length;
  $('#dj-skip').disabled = !n && !dj.queue.length;
  $('#dj-prev').disabled = !n && !(dj.history || []).length;
  $('#dj-mini-prev').disabled = $('#dj-prev').disabled;
  // 🔁 repetir: desligado / fila toda / só esta
  const rep = dj.repeat || 'off';
  const rb = $('#dj-repeat');
  rb.textContent = rep === 'one' ? '🔂' : '🔁';
  rb.classList.toggle('on', rep !== 'off');
  rb.title = rep === 'off' ? 'Repetir: desligado (clique para repetir a fila toda)' : rep === 'all' ? 'Repetindo a fila toda (clique para repetir só esta música)' : 'Repetindo esta música (clique para desligar)';
  $('#dj-vol').value = Math.round(djVolume * 100);
  renderDjMute();
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
  $('#dj-mini-prev').hidden = !min;
  $('.dj-head .dj-mute').hidden = !min;
}
$('#dj-min').onclick = () => { store.set(DJ_MIN, !store.get(DJ_MIN, false)); applyDjMin(); };
$('#dj-mini-play').onclick = () => djCtrl(dj?.now && !dj.now.pausedAt ? 'pause' : 'play');
$('#dj-mini-skip').onclick = () => djCtrl('skip');
$('#dj-mini-prev').onclick = () => djCtrl('prev');
applyDjMin();
$('#dj-prev').onclick = () => djCtrl('prev');
$('#dj-repeat').onclick = () => djCtrl('repeat');
$('#dj-back').onclick = () => djMove('bots');
$('#dj-play').onclick = () => djCtrl(dj?.now && !dj.now.pausedAt ? 'pause' : 'play');
$('#dj-skip').onclick = () => djCtrl('skip');
$('#dj-skip-all').onclick = () => djCtrl('skip-all');
$('#dj-queue').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dj-rm]');
  if (b) djCtrl('remove', b.dataset.djRm);
});
function renderDjMute() {
  document.querySelectorAll('.dj-mute').forEach((b) => { b.textContent = djMuted ? '🔇' : '🔊'; b.title = djMuted ? 'Ligar o som do DJ (só para você)' : 'Silenciar o DJ (só para você)'; b.classList.toggle('on', djMuted); });
}
document.querySelectorAll('.dj-mute').forEach((b) => (b.onclick = () => {
  djMuted = !djMuted;
  store.set('voz-dj-mute', djMuted);
  djAudio.muted = deafened || djMuted;
  if (dj?.now?.kind === 'yt' && djHere()) syncYt(dj.now);
  renderDjMute();
}));
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

// ---------- 📺 TV King (bot de TV ao vivo) ----------
let tv = null;
let tvVolume = store.get('voz-tv-vol', 0.7);
let tvMuted = !!store.get('voz-tv-mute', false);
let hlsObj = null;
let tvLoadedId = '';
let tvFailed = false;
let tvMediaErr = 0;
const tvVideo = $('#tv-video');
const tvHere = () => !!(tv && currentChannel && tv.room === currentChannel);
const flag = (cc) => (cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐');
const PAISES = { BR: 'Brasil', PT: 'Portugal', US: 'Estados Unidos', AR: 'Argentina', ES: 'Espanha', IT: 'Itália', FR: 'França', DE: 'Alemanha', GB: 'Reino Unido', MX: 'México', JP: 'Japão', KR: 'Coreia do Sul', CL: 'Chile', CO: 'Colômbia', UY: 'Uruguai', PY: 'Paraguai', CA: 'Canadá', AO: 'Angola', MZ: 'Moçambique', RU: 'Rússia', CN: 'China', IN: 'Índia', TR: 'Turquia', NL: 'Holanda', BE: 'Bélgica', CH: 'Suíça', AU: 'Austrália', PE: 'Peru', VE: 'Venezuela', BO: 'Bolívia', EC: 'Equador', CU: 'Cuba', DO: 'Rep. Dominicana', SA: 'Arábia Saudita', AE: 'Emirados Árabes', EG: 'Egito', ZA: 'África do Sul', GR: 'Grécia', PL: 'Polônia', SE: 'Suécia', NO: 'Noruega', DK: 'Dinamarca', FI: 'Finlândia', IE: 'Irlanda', AT: 'Áustria', CZ: 'Tchéquia', RO: 'Romênia', HU: 'Hungria', UA: 'Ucrânia', IL: 'Israel', ID: 'Indonésia', TH: 'Tailândia', PH: 'Filipinas', VN: 'Vietnã', MY: 'Malásia', TW: 'Taiwan', HK: 'Hong Kong', NG: 'Nigéria', KE: 'Quênia', MA: 'Marrocos', PK: 'Paquistão', IR: 'Irã', IQ: 'Iraque', QA: 'Catar' };
const nomePais = (cc) => PAISES[cc] || cc || 'Outros';

socket.on('tv', (st) => {
  if (!guardaBot('tv', st)) return;
  tv = st;
  syncTv();
  renderTv();
  renderChannels();
});

function loadHls() {
  if (window.Hls) return Promise.resolve();
  if (!loadHls.p) loadHls.p = new Promise((ok, bad) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js'; sc.onload = ok; sc.onerror = bad; document.head.appendChild(sc); });
  return loadHls.p;
}
function tvStop() {
  if (hlsObj) { try { hlsObj.destroy(); } catch {} hlsObj = null; }
  if (tvVideo.src || tvLoadedId) { tvVideo.pause(); tvVideo.removeAttribute('src'); tvVideo.load(); }
  tvLoadedId = '';
}
function tvErro(msg) {
  tvFailed = true;
  $('#tv-msg').textContent = msg;
  $('#tv-msg').hidden = false;
  if (tv?.channel) socket.emit('tv-fail', { id: tv.channel.id });
}
async function syncTv() {
  const c = tvHere() ? tv?.channel : null;
  if (!c) { tvStop(); return; }
  tvVideo.volume = tvVolume;
  tvVideo.muted = deafened || tvMuted;
  if (tvLoadedId === c.id) { if (tvVideo.paused && !tvFailed) tvVideo.play().catch(() => {}); return; }
  tvStop();
  tvLoadedId = c.id;
  tvFailed = false;
  tvMediaErr = 0;
  $('#tv-msg').hidden = true;
  try {
    if (tvVideo.canPlayType('application/vnd.apple.mpegurl')) {
      tvVideo.src = c.url;
    } else {
      await loadHls();
      if (tvLoadedId !== c.id) return;
      if (!Hls.isSupported()) return tvErro('Este navegador não consegue tocar TV ao vivo.');
      hlsObj = new Hls({ enableWorker: true, lowLatencyMode: false, liveSyncDurationCount: 3 });
      hlsObj.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.details === 'manifestLoadError') tvErro('Esse canal não toca no navegador (bloqueia sites). Tente pelo celular ou escolha outro.');
        else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) { try { hlsObj.startLoad(); } catch {} }
        else if (data.details === 'manifestIncompatibleCodecsError') tvErro('Esse canal usa um formato de vídeo que este computador não reproduz (HEVC). Tente pelo celular ou escolha outro.');
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) { if (++tvMediaErr > 4) tvErro('Este navegador não consegue reproduzir o vídeo desse canal. Tente pelo celular ou escolha outro.'); else { try { hlsObj.recoverMediaError(); } catch {} } }
        else tvErro('Esse canal não está abrindo agora. Escolha outro.');
      });
      hlsObj.loadSource(c.url);
      hlsObj.attachMedia(tvVideo);
    }
    tvVideo.play().catch(() => {});
  } catch (e) {
    tvErro('Não consegui abrir esse canal.');
  }
}
tvVideo.addEventListener('error', () => { if (tvLoadedId && !hlsObj) tvErro('Esse canal não toca no navegador. Tente pelo celular ou escolha outro.'); });
// O navegador só libera som/vídeo depois de um clique
document.addEventListener('click', () => { if (tvHere() && tv?.channel && tvVideo.paused && !tvFailed) tvVideo.play().catch(() => {}); }, { capture: true });

async function tvMove(to) {
  if (!to) return toast('Entre numa sala primeiro, depois chame a TV.');
  const r = await emitAck('tv-move', { to });
  if (r?.error) toast(r.error);
}
const TV_MIN = 'voz-tv-min';
// Marca d'água some enquanto tem vídeo (TV ou YouTube) na tela
function updateMediaClass() {
  const on = (tvHere() && !!tv?.channel) || (djHere() && dj?.now?.kind === 'yt') || (arcadeHere() && !store.get(ARC_MIN, false));
  document.body.classList.toggle('has-media', on);
}
function toggleFull(el) {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else el.requestFullscreen?.().catch(() => toast('Este navegador não deixou abrir em tela cheia.'));
}
$('#tv-full').onclick = () => toggleFull($('#tv-video-wrap'));
$('#dj-yt-full').onclick = () => toggleFull($('#dj-yt-wrap'));
function renderTv() {
  updateMediaClass();
  const panel = $('#tv-panel');
  const call = $('#btn-tv');
  if (!tv || !currentChannel) { panel.hidden = true; call.hidden = true; return; }
  const here = tvHere();
  call.hidden = here;
  panel.hidden = !here;
  if (!here) return;
  const min = !!store.get(TV_MIN, false);
  panel.classList.toggle('min', min);
  $('#tv-min').textContent = min ? '⤢' : '▁';
  $('#tv-min').title = min ? 'Abrir o painel da TV' : 'Minimizar o painel da TV';
  const c = tv.channel;
  $('#tv-now').innerHTML = c
    ? `${c.logo ? `<img class="dj-art tv-logo" src="${esc(c.logo)}" alt="">` : '<span class="dj-art dj-art-empty">📺</span>'}<div class="dj-meta"><strong>${esc(c.name)}</strong><small>${flag(c.country)} ${esc(nomePais(c.country))}${c.cats?.length ? ' · ' + esc(c.cats.join(', ')) : ''} · ● AO VIVO</small></div>`
    : `<span class="dj-art dj-art-empty">📺</span><div class="dj-meta"><strong>Nenhum canal ligado</strong><small>Toque em "Canais" para escolher.</small></div>`;
  $('#tv-mini-now').textContent = c ? `· ${c.name}` : '· desligada';
  $('#tv-off').hidden = !c;
  $('#tv-video-wrap').hidden = !c;
  $('#tv-vol').value = Math.round(tvVolume * 100);
  document.querySelectorAll('.tv-mute').forEach((b) => { b.textContent = tvMuted ? '🔇' : '🔊'; b.classList.toggle('on', tvMuted); b.title = tvMuted ? 'Ligar o som da TV (só para você)' : 'Silenciar a TV (só para você)'; });
}
$('#btn-tv').onclick = () => tvMove(currentChannel);
$('#tv-back').onclick = () => tvMove('bots');
$('#tv-off').onclick = async () => { const r = await emitAck('tv-off', {}); if (r?.error) toast(r.error); };
$('#tv-min').onclick = () => { store.set(TV_MIN, !store.get(TV_MIN, false)); renderTv(); };
$('#tv-vol').addEventListener('input', (e) => { tvVolume = Number(e.target.value) / 100; store.set('voz-tv-vol', tvVolume); tvVideo.volume = tvVolume; });
document.querySelectorAll('.tv-mute').forEach((b) => (b.onclick = () => { tvMuted = !tvMuted; store.set('voz-tv-mute', tvMuted); tvVideo.muted = deafened || tvMuted; renderTv(); }));

// ----- Escolher canal -----
let tvCountry = 'BR';
let tvListTimer = null;
function openTvPick() { $('#tv-pick').hidden = false; setTimeout(() => $('#tv-q').focus(), 30); tvList(); }
$('#tv-channels').onclick = openTvPick;
$('#tv-pick-close').onclick = () => { $('#tv-pick').hidden = true; };
$('#tv-q').addEventListener('input', () => { clearTimeout(tvListTimer); tvListTimer = setTimeout(tvList, 300); });
$('#tv-country').addEventListener('change', (e) => { tvCountry = e.target.value; tvList(); });
async function tvList() {
  const box = $('#tv-results');
  box.innerHTML = '<div class="chat-empty">Carregando canais…</div>';
  const q = $('#tv-q').value.trim();
  const r = await emitAck('tv-list', { q, country: q ? '' : tvCountry });
  if (r?.error) { box.innerHTML = `<div class="chat-empty">${esc(r.error)}</div>`; return; }
  const sel = $('#tv-country');
  if (r.countries && sel.options.length <= 1) {
    const cods = Object.keys(r.countries).sort((a, b) => (a === 'BR' ? -1 : b === 'BR' ? 1 : (a === 'PT' ? -1 : b === 'PT' ? 1 : nomePais(a).localeCompare(nomePais(b)))));
    sel.innerHTML = cods.map((c) => `<option value="${c}">${flag(c)} ${esc(nomePais(c))} (${r.countries[c]})</option>`).join('');
    sel.value = tvCountry;
  }
  const items = r.items || [];
  if (!items.length) { box.innerHTML = '<div class="chat-empty">Nenhum canal encontrado.</div>'; return; }
  box.innerHTML = items.map((c, i) => `<div class="dj-res tv-res ${c.web === false ? 'tv-only-app' : ''}" data-i="${i}">
      ${c.logo ? `<img class="dj-art tv-logo" src="${esc(c.logo)}" alt="" loading="lazy">` : '<span class="dj-art dj-art-empty">📺</span>'}
      <span class="dj-meta"><strong>${esc(c.name)}</strong><small>${flag(c.country)} ${esc(nomePais(c.country))}${c.cats?.length ? ' · ' + esc(c.cats.slice(0, 2).join(', ')) : ''}${c.web === false ? ' · <b>só no celular</b>' : c.web ? ' · ✓ PC' : ''}${c.geo ? ' · 🇧🇷 só no Brasil' : ''}</small></span>
      <button type="button" class="btn small primary" data-tv="${i}">Assistir</button></div>`).join('') + (r.total > items.length ? `<div class="chat-empty">Mostrando ${items.length} de ${r.total}. Digite para procurar.</div>` : '');
  box._items = items;
}
$('#tv-results').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-tv]');
  if (!b) return;
  const c = $('#tv-results')._items?.[Number(b.dataset.tv)];
  if (!c) return;
  const r = await emitAck('tv-set', { id: c.id });
  if (r?.error) return toast(r.error);
  $('#tv-pick').hidden = true;
});

// ---------- 🕹️ Arcade King (mini-jogos) ----------
let arcade = null;
const arcadeHere = () => !!(arcade && currentChannel && arcade.room === currentChannel);
socket.on('arcade', (st) => { if (!guardaBot('arcade', st)) return; arcade = st; renderArcade(); renderChannels(); });
async function arcadeMove(to) {
  if (!to) return toast('Entre numa sala primeiro, depois chame o Arcade.');
  const r = await emitAck('arcade-move', { to });
  if (r?.error) toast(r.error);
}
const ARC_MIN = 'voz-arcade-min';
function renderArcade() {
  updateMediaClass();
  const panel = $('#arcade-panel');
  const call = $('#btn-arcade');
  const frame = $('#arcade-frame');
  if (!arcade || !currentChannel) { panel.hidden = true; call.hidden = true; if (frame.src) frame.removeAttribute('src'); return; }
  const here = arcadeHere();
  call.hidden = here;
  panel.hidden = !here;
  if (!here) { if (frame.getAttribute('src')) frame.removeAttribute('src'); return; }
  const want = `arcade.html?token=${encodeURIComponent(authToken || '')}&uid=${me?.id || 0}`;
  if (frame.getAttribute('src') !== want) frame.setAttribute('src', want);
  const min = !!store.get(ARC_MIN, false);
  panel.classList.toggle('min', min);
  $('#arcade-min').textContent = min ? '⤢' : '▁';
  $('#arcade-mini-now').textContent = arcade.game ? `· ${arcade.game === 'sinuca' ? 'Sinuca' : arcade.game}${arcade.seats?.filter(Boolean).length ? ' · ' + arcade.seats.filter(Boolean).map((s) => s.name).join(' × ') : ''}` : '· escolhendo jogo';
}
$('#btn-arcade').onclick = () => arcadeMove(currentChannel);
$('#arcade-back').onclick = () => arcadeMove('bots');
$('#arcade-min').onclick = () => { store.set(ARC_MIN, !store.get(ARC_MIN, false)); renderArcade(); };
$('#arcade-full').onclick = () => toggleFull($('#arcade-wrap'));

// ---------- Chat do canal ----------
let chatMsgs = [];
let chatOpen = false;
let chatUnread = 0;
$('#btn-chat .ico').innerHTML = ICON.chat;
$('#chat-close').innerHTML = ICON.close;
$('#btn-chat').onclick = () => (telaLarga() ? toggleSide() : setChatOpen(!chatOpen));
$('#chat-close').onclick = () => setChatOpen(false);

function setChatOpen(v, semFoco = false) {
  chatOpen = v && !!currentChannel;
  if (chatOpen && dmOpen) setDmOpen(false);
  $('#chat').hidden = !chatOpen;
  document.body.classList.toggle('chat-open', chatOpen);
  if (chatOpen) {
    chatUnread = 0;
    renderChat(true);
    if (!semFoco) setTimeout(() => $('#chat-input').focus(), 30);
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
// Clipe de transmissão: "clip:<código>:<segundos>:<de quem era a tela>"
const CLIP_RE = /^clip:([A-Za-z0-9_-]{16}):(\d{1,4}):([\s\S]{0,40})$/;
const isClip = (t) => CLIP_RE.test(String(t).trim());
function clipHTML(t) {
  const [, id, sec, de] = String(t).trim().match(CLIP_RE);
  return `<div class="clip-msg"><video controls preload="metadata" playsinline src="/img/${id}"></video>
    <div class="clip-cap">🎬 Clipe da tela de ${esc(de)} · ${fmtSec(Number(sec))}
    <a href="/img/${id}" download="clipe-${esc(de).replace(/[^\w-]+/g, '_')}-${id.slice(0, 6)}" title="Baixar o clipe">⬇ baixar</a></div></div>`;
}
const msgHTML = (t) => isClip(t) ? clipHTML(t) : isAud(t) ? audHTML(t) : isImg(t)
  ? `<img class="chat-photo" src="/img/${String(t).trim().slice(4)}" alt="Foto" loading="lazy">`
  : isGif(t)
    ? `<img class="chat-gif" src="${esc(String(t).trim())}" alt="GIF" loading="lazy">`
    : linkify(t);
const msgPreview = (t) => (isClip(t) ? '🎬 Clipe' : isAud(t) ? `🎤 Áudio (${fmtSec(Number(String(t).trim().match(AUD_RE)[2]))})` : isImg(t) ? '📷 Foto' : isGif(t) ? '🎞️ GIF' : t);

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
      if (m.sys) { html += `<div class="chat-sys">${esc(m.text)}</div>`; prev = null; continue; }
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
  if (m.channel) { // sala de mensagens do servidor
    const lista = textMsgs.get(m.channel) || [];
    lista.push(m);
    if (lista.length > 100) lista.shift();
    textMsgs.set(m.channel, lista);
    if (m.channel === textRoom) renderTextRoom(m.uid === me.id);
    else if (!m.sys) { textUnread.set(m.channel, (textUnread.get(m.channel) || 0) + 1); renderChannels(); }
    if (m.uid !== me.id && !m.sys) { playSound('mensagem'); const pv = msgPreview(m.text); if (m.channel !== textRoom) toast(`💬 ${m.name} em #${channelsState.find((c) => c.id === m.channel)?.name || ''}: ${pv.length > 60 ? pv.slice(0, 60) + '…' : pv}`); }
    return;
  }
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
  if (!v) setTimeout(() => applySide(), 0); // fechou as mensagens: o chat da sala volta para a lateral
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
  titleFlash = setInterval(() => { document.title = (on = !on) ? text : 'TalKing'; }, 900);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { clearInterval(titleFlash); document.title = 'TalKing'; }
  // Aba em segundo plano: pausa as transmissões que eu assisto (não gasta internet à toa); volta ao abrir
  if (!currentChannel) return;
  [...watching].forEach((id) => socket.emit('watch', { id, on: !document.hidden, leve: economiaAtiva() }));
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
    return toast(findUser(selfId)?.plateiaMudo ? '🔇 Nesta sala a plateia fica sem microfone. Peça para subir ao palco.' : '🛡️ Um moderador fechou seu microfone. Só ele pode liberar.');
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

// Lista "Na chamada" da lateral: rostinho, nome, volume e botão de assistir
function renderPeople(ch) {
  const box = $('#people');
  if (!box) return;
  box.innerHTML = '';
  if (!ch) return;
  ch.users.forEach((u) => {
    const isMe = u.id === selfId, vol = volumeOf(u.name), live = isSharing(u.id);
    const p = document.createElement('div');
    p.className = 'member pessoa' + (speaking.has(u.id) ? ' speaking' : '') + (live ? ' live-on' : '') + (isMe ? '' : ' clickable');
    p.dataset.uid = u.id;
    p.innerHTML = `
      ${avatarHTML(u)}
      <div class="pinfo">
        <div class="pl1"><span class="mname">${esc(u.name)}${isMe ? ' (você)' : ''}</span>${roleBadge(u.role)}${u.muted ? `<span class="muted-ico">${ICON.micOff}</span>` : ''}${live ? '<span class="live">AO VIVO</span>' : ''}</div>
        ${isMe ? '' : `<div class="pvol"><i style="width:${Math.max(0, Math.min(100, Math.round(vol * 100)))}%"></i></div>`}
      </div>
      ${isMe ? '' : `<small class="pperc">${vol === 0 ? 'mudo' : Math.round(vol * 100) + '%'}</small>`}
      ${!isMe && live ? `<button class="watch-btn ${watching.has(u.id) ? 'on' : ''}">${watching.has(u.id) ? 'Assistindo' : 'Assistir'}</button>` : ''}`;
    if (!isMe) {
      p.title = `${u.name} — clique para ajustar o volume`;
      p.onclick = () => (volTarget === u.id ? closeVolume() : openVolume(u.id, p));
      const wb = p.querySelector('.watch-btn');
      if (wb) wb.onclick = (e) => { e.stopPropagation(); watching.has(u.id) ? unwatch(u.id) : watch(u.id); };
    } else p.title = u.name;
    box.appendChild(p);
  });
}

function updateSpeakingClasses() {
  document.querySelectorAll('[data-uid]').forEach((el) => {
    el.classList.toggle('speaking', speaking.has(el.dataset.uid));
  });
}

// ---------- Renderização ----------
function renderAll() {
  renderTv();
  renderArcade();
  renderChannels();
  renderMain();
  renderControls();
  renderDj();
}

function renderChannels() {
  renderServerBar();
  const wrap = $('#channels');
  wrap.innerHTML = '';
  const gerente = podeGerirSrv();
  channelsState.filter((c) => c.srv === currentServer).forEach((ch) => {
    const tipo = ch.tipo || 'voz';
    const el = document.createElement('div');
    el.className = `channel tipo-${tipo}` + (ch.id === currentChannel || ch.id === textRoom ? ' active' : '');
    const naoLidas = textUnread.get(ch.id) || 0;
    const conta = tipo === 'texto' ? (naoLidas ? `<small class="chat-badge">${naoLidas}</small>` : '') : `<small>${ch.users.length}/${tipo === 'palco' ? config.maxPerChannel * 2 : config.maxPerChannel}</small>`;
    el.innerHTML = `
      <div class="channel-row">
        <button class="channel-btn" title="${TIPO_INFO[tipo].nome}">${TIPO_INFO[tipo].ico}<span>${esc(ch.name)}</span>${conta}</button>
        ${gerente ? `<button class="rename-btn" title="Trocar nome da sala">${ICON.pencil}</button><button class="rename-btn del-btn" title="Apagar sala">${ICON.close}</button>` : ''}
      </div>`;
    el.querySelector('.channel-btn').onclick = () => (tipo === 'texto' ? openTextRoom(ch.id) : joinChannel(ch.id));
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
    if (arcade && arcade.room === ch.id) {
      const li = document.createElement('li');
      li.className = 'member bot';
      li.innerHTML = `${avatarHTML({ name: arcade.name, avatar: arcade.avatar })}<span class="mname">${esc(arcade.name)}</span><span class="bot-badge">BOT</span>${arcade.game ? '<span class="cam-ico" title="Jogando">🎱</span>' : ''}`;
      ul.appendChild(li);
    }
    if (tv && tv.room === ch.id) {
      const li = document.createElement('li');
      li.className = 'member bot';
      li.innerHTML = `${avatarHTML({ name: tv.name, avatar: tv.avatar })}<span class="mname">${esc(tv.name)}</span><span class="bot-badge">BOT</span>${tv.channel ? '<span class="cam-ico" title="No ar">📺</span>' : ''}`;
      ul.appendChild(li);
    }
    if (dj && dj.room === ch.id) {
      const li = document.createElement('li');
      li.className = 'member bot';
      li.innerHTML = `${avatarHTML({ name: dj.name, avatar: dj.avatar })}<span class="mname">${esc(dj.name)}</span><span class="bot-badge">BOT</span>${dj.now && !dj.now.pausedAt ? '<span class="cam-ico" title="Tocando">🎵</span>' : ''}`;
      ul.appendChild(li);
    }
    if (tipo !== 'texto') el.appendChild(ul);
    wrap.appendChild(el);
  });
  if (gerente) {
    const add = document.createElement('button');
    add.className = 'new-channel';
    add.innerHTML = '➕ Nova sala';
    add.onclick = createChannel;
    wrap.appendChild(add);
  }
  // Sala dos bots: o DJ e a TV ficam aqui esperando alguém chamar
  if (dj || tv || arcade) {
    const bots = document.createElement('div');
    bots.className = 'channel bots-room' + (botsOpen ? ' open' : '');
    const lista = [dj && { ...dj, move: () => djMove(currentChannel), hint: 'DJ de música' }, tv && { ...tv, move: () => tvMove(currentChannel), hint: 'TV ao vivo' }, arcade && { ...arcade, move: () => arcadeMove(currentChannel), hint: 'Mini-jogos' }].filter(Boolean);
    const emCasa = lista.filter((b) => !b.room);
    bots.innerHTML = `<div class="channel-row"><div class="channel-btn static">🤖<span>Bots</span><small>${emCasa.length}/${lista.length}</small></div></div><ul></ul>`;
    const ul = bots.querySelector('ul');
    bots.querySelector('.channel-btn').onclick = (e) => { e.stopPropagation(); botsOpen = !botsOpen; bots.classList.toggle('open', botsOpen); };
    lista.forEach((b) => {
      const li = document.createElement('li');
      if (!b.room) {
        li.className = 'member bot clickable';
        li.title = currentChannel ? `Chamar ${b.name} para a sua chamada` : 'Entre numa sala para chamar';
        li.innerHTML = `${avatarHTML({ name: b.name, avatar: b.avatar })}<span class="mname">${esc(b.name)}</span><span class="bot-hint">${currentChannel ? 'chamar ›' : b.hint}</span>`;
        li.onclick = b.move;
      } else {
        li.className = 'member empty-bot';
        li.textContent = `${b.name} está na sala ${channelsState.find((c) => c.id === b.room)?.name || ''}`;
      }
      ul.appendChild(li);
    });
    wrap.appendChild(bots);
  }
}

// ---- 🏰 Barra do servidor (pílula + lista para trocar) ----
function srvIconHTML(sv, cls = 'avatar srv-icon') {
  const el = document.createElement('span');
  el.className = cls;
  fillAvatar(el, sv.nome, sv.icone || '');
  return el.outerHTML;
}
function renderServerBar() {
  const sv = srvOf(currentServer);
  const pill = $('#srv-pill');
  if (!sv) {
    if (!loggedIn) { pill.hidden = true; return; }
    pill.hidden = false;
    fillAvatar($('#srv-icon'), '+', '');
    $('#srv-name').textContent = 'Servidores';
    pill.title = 'Criar um servidor ou entrar com convite';
    return;
  }
  pill.hidden = false;
  const ic = $('#srv-icon');
  fillAvatar(ic, sv.nome, sv.icone || '');
  $('#srv-name').textContent = sv.nome;
  pill.title = `${sv.nome} · ${sv.membros} membro(s) · clique para trocar de servidor ou abrir o menu`;
}
function toggleSrvPop(force) {
  const pop = $('#srv-pop');
  const abrir = force ?? pop.hidden;
  if (!abrir) { pop.hidden = true; return; }
  const sv = srvOf(currentServer);
  pop.innerHTML = `
    ${sv ? `<div class="srv-pop-head">${srvIconHTML(sv)}<div><strong>${esc(sv.nome)}</strong><small>${sv.membros} membro(s) · você é ${CARGO_NOME[sv.cargo] || 'membro'}</small></div></div>
    <button type="button" class="srv-item" data-act="convite">🔗 Convidar amigos</button>
    <button type="button" class="srv-item" data-act="membros">👥 Membros</button>
    ${podeGerirSrv() ? '<button type="button" class="srv-item" data-act="editar">✏️ Nome e ícone</button>' : ''}
    ${sv.cargo === 'dono' ? (sv.id === 'talking' ? '' : '<button type="button" class="srv-item danger" data-act="apagar">🗑️ Apagar servidor</button>') : '<button type="button" class="srv-item danger" data-act="sair">🚪 Sair do servidor</button>'}
    <hr class="sep" />` : ''}
    <div class="srv-pop-title">Seus servidores</div>
    ${serversState.map((x) => `<button type="button" class="srv-item srv-choice${x.id === currentServer ? ' on' : ''}" data-srv="${esc(x.id)}">${srvIconHTML(x, 'avatar srv-icon small')}<span>${esc(x.nome)}</span><small>${x.membros}</small></button>`).join('')}
    <button type="button" class="srv-item" data-act="novo">➕ Criar servidor ou entrar com convite</button>`;
  pop.querySelectorAll('[data-srv]').forEach((b) => { b.onclick = () => { pop.hidden = true; escolheServidor(b.dataset.srv); }; });
  pop.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => { pop.hidden = true; srvAction(b.dataset.act); }; });
  pop.hidden = false;
  setTimeout(() => document.addEventListener('pointerdown', (e) => { if (!pop.contains(e.target) && !$('#srv-pill').contains(e.target)) pop.hidden = true; }, { once: true }), 0);
}
const CARGO_NOME = { dono: 'dono', mod: 'moderador', membro: 'membro' };
$('#srv-pill').onclick = () => toggleSrvPop();
async function srvAction(act) {
  const sv = srvOf(currentServer);
  if (act === 'novo') return abreNovoServidor();
  if (!sv) return;
  if (act === 'convite') return abreConvite(sv);
  if (act === 'membros') return abreMembros(sv);
  if (act === 'editar') {
    const nome = prompt('Nome do servidor:', sv.nome);
    if (nome === null) return;
    const r = await emitAck('srv-edit', { id: sv.id, nome });
    if (r?.error) toast(r.error); else toast('Nome atualizado.');
    return;
  }
  if (act === 'sair') {
    if (!confirm(`Sair do servidor "${sv.nome}"? Você vai precisar de um convite para voltar.`)) return;
    const r = await emitAck('srv-leave', { id: sv.id });
    if (r?.error) toast(r.error); else { toast(`Você saiu de ${sv.nome}.`); currentServer = null; }
    return;
  }
  if (act === 'apagar') {
    if (!confirm(`Apagar o servidor "${sv.nome}" com todas as salas? Isso não tem volta.`)) return;
    const r = await emitAck('srv-delete', { id: sv.id });
    if (r?.error) toast(r.error); else { toast('Servidor apagado.'); currentServer = null; }
  }
}
function abreNovoServidor() {
  const m = $('#srv-new');
  $('#srv-new-name').value = '';
  $('#srv-join-code').value = '';
  const grid = $('#srv-new-icons');
  grid.innerHTML = '';
  let icone = '';
  const marca = () => grid.querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.a === icone));
  const none = document.createElement('button'); none.type = 'button'; none.dataset.a = ''; none.textContent = 'Aa'; none.title = 'Só a inicial'; none.className = 'srv-ico-letra';
  none.onclick = () => { icone = ''; marca(); };
  grid.appendChild(none);
  (avatarList || []).slice(0, 24).forEach((a) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.a = `p:${a.id}`;
    b.innerHTML = `<img src="avatars/${a.id}.svg" alt="${esc(a.nome)}">`;
    b.onclick = () => { icone = `p:${a.id}`; marca(); };
    grid.appendChild(b);
  });
  marca();
  m.hidden = false;
  $('#srv-new-name').focus();
  $('#srv-new-form').onsubmit = async (e) => {
    e.preventDefault();
    const r = await emitAck('srv-create', { nome: $('#srv-new-name').value, icone });
    if (r?.email) { m.hidden = true; return pedeConfirmarEmail(); }
    if (r?.error) return toast(r.error);
    m.hidden = true;
    setTimeout(() => { escolheServidor(r.id, { silencioso: true }); toast('🏰 Servidor criado! Convide seus amigos pelo menu do servidor.'); abreConvite(srvOf(r.id)); }, 300);
  };
  $('#srv-join-btn').onclick = async () => { const c = $('#srv-join-code').value.trim(); if (!c) return; m.hidden = true; entrarComConvite(c); };
}
$('#srv-new-close').onclick = () => { $('#srv-new').hidden = true; };
$('#srv-new').onclick = (e) => { if (e.target === $('#srv-new')) $('#srv-new').hidden = true; };
function abreSrvModal(titulo, html) {
  $('#srv-m-title').textContent = titulo;
  $('#srv-m-body').innerHTML = html;
  $('#srv-modal').hidden = false;
}
$('#srv-m-close').onclick = () => { $('#srv-modal').hidden = true; };
$('#srv-modal').onclick = (e) => { if (e.target === $('#srv-modal')) $('#srv-modal').hidden = true; };
async function abreConvite(sv, novo = false) {
  const r = await emitAck('srv-invite', { id: sv.id, novo });
  if (r?.error) return toast(r.error);
  const link = `${location.origin}/entrar/${r.codigo}`;
  abreSrvModal(`Convidar para ${sv.nome}`, `
    <p>Mande este link para quem você quer no servidor. Quem abrir e tiver conta entra na hora.</p>
    <div class="invite-row"><input id="invite-link" readonly value="${esc(link)}" /><button type="button" id="invite-copy" class="btn primary">Copiar</button></div>
    <p class="sec-hint">Quem ainda não tem conta cria uma pelo mesmo link (e entra depois que o dono do TalKing aprovar).</p>
    ${podeGerirSrv(sv.id) ? '<button type="button" id="invite-new" class="btn small">Gerar link novo (o antigo para de valer)</button>' : ''}`);
  $('#invite-copy').onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Link copiado!'); } catch { $('#invite-link').select(); } };
  const bn = $('#invite-new');
  if (bn) bn.onclick = () => abreConvite(sv, true);
}
async function abreMembros(sv) {
  const r = await emitAck('srv-members', { id: sv.id });
  if (r?.error) return toast(r.error);
  const meuCargo = srvOf(sv.id)?.cargo;
  const posso = (m) => (meuCargo === 'dono' || isMod()) ? m.cargo !== 'dono' : meuCargo === 'mod' && m.cargo === 'membro';
  abreSrvModal(`Membros de ${sv.nome} (${r.membros.length})`, `<div class="acc-list">${r.membros.map((m) => `
    <div class="acc-row member-row">
      ${avatarHTML({ name: m.name, avatar: m.avatar })}
      <div class="acc-info"><strong>${esc(m.name)}</strong><small>${CARGO_NOME[m.cargo]} · ${m.online ? '🟢 online' : 'offline'}</small></div>
      ${m.id !== me.id && posso(m) ? `<div class="acc-actions">
        ${meuCargo === 'dono' ? (m.cargo === 'mod' ? `<button type="button" class="btn small" data-act="membro" data-uid="${m.id}">Tirar moderador</button>` : `<button type="button" class="btn small" data-act="mod" data-uid="${m.id}">Dar moderador</button>`) : ''}
        <button type="button" class="btn small" data-act="kick" data-uid="${m.id}">Expulsar</button>
        <button type="button" class="btn small danger" data-act="ban" data-uid="${m.id}">Banir</button>
        ${meuCargo === 'dono' ? `<button type="button" class="btn small" data-act="coroa" data-uid="${m.id}" title="Passar o servidor para essa pessoa">👑</button>` : ''}
      </div>` : ''}
    </div>`).join('')}</div>`);
  $('#srv-m-body').querySelectorAll('[data-act]').forEach((b) => {
    b.onclick = async () => {
      const act = b.dataset.act, uid = Number(b.dataset.uid);
      const nome = r.membros.find((m) => m.id === uid)?.name || '';
      if (act === 'ban' && !confirm(`Banir ${nome} do servidor? A pessoa não consegue mais entrar, nem com convite.`)) return;
      if (act === 'coroa' && !confirm(`Passar o servidor "${sv.nome}" para ${nome}? Você vira moderador.`)) return;
      const x = await emitAck('srv-member', { id: sv.id, uid, action: act });
      if (x?.error) return toast(x.error);
      toast('Feito.');
      abreMembros(sv);
    };
  });
}

// ---- 💬 Sala de mensagens do servidor ----
let textRoom = null;
const textMsgs = new Map(); // sala -> mensagens
async function openTextRoom(id) {
  const ch = channelsState.find((c) => c.id === id);
  if (!ch) return;
  if (textRoom && textRoom !== id) socket.emit('text-close', { id: textRoom });
  const r = await emitAck('text-open', { id });
  if (r?.error) return toast(r.error);
  textRoom = id;
  textMsgs.set(id, r.chat || []);
  textUnread.delete(id);
  $('#text-name').textContent = ch.name;
  $('#text-room').hidden = false;
  document.body.classList.add('text-open');
  renderTextRoom(true);
  renderChannels();
  $('#text-input').focus();
}
function closeTextRoom() {
  if (!textRoom) return;
  socket.emit('text-close', { id: textRoom });
  textRoom = null;
  $('#text-room').hidden = true;
  document.body.classList.remove('text-open');
}
function renderTextRoom(scrollDown = false) {
  const list = $('#text-list');
  const msgs = textMsgs.get(textRoom) || [];
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
  if (!msgs.length) list.innerHTML = '<div class="chat-empty">Nenhuma mensagem ainda. Diga oi! 👋</div>';
  else {
    let html = '', prev = null;
    for (const m of msgs) {
      if (m.sys) { html += `<div class="chat-sys">${esc(m.text)}</div>`; prev = null; continue; }
      const grouped = prev && prev.name === m.name && m.ts - prev.ts < 5 * 60 * 1000;
      html += grouped
        ? `<div class="chat-msg cont"><div class="chat-text">${msgHTML(m.text)}</div></div>`
        : `<div class="chat-msg">${avatarHTML({ name: m.name, avatar: m.avatar })}<div class="chat-body"><div class="chat-meta"><strong>${esc(m.name)}</strong><time>${hhmm(m.ts)}</time></div><div class="chat-text">${msgHTML(m.text)}</div></div></div>`;
      prev = m;
    }
    list.innerHTML = html;
  }
  if (scrollDown || atBottom) list.scrollTop = list.scrollHeight;
}
$('#text-close').onclick = () => { closeTextRoom(); renderChannels(); };
$('#text-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#text-input');
  const text = input.value.trim();
  if (!text || !textRoom) return;
  input.value = '';
  const r = await emitAck('chat-send', { text, channel: textRoom });
  if (r?.error) toast(r.error);
});

function renderMain() {
  const ch = channelsState.find((c) => c.id === currentChannel);
  $('#main-title').textContent = ch ? ch.name : (serversState.length ? 'Escolha um canal de voz' : 'TalKing');
  $('#empty').hidden = !!ch;
  if (!ch) renderSemServidor();
  $('#callbar').hidden = !ch;
  $('#main-hint').hidden = !ch || ch.users.length < 2;

  document.body.classList.toggle('in-call', !!ch);
  renderPeople(ch);

  const tiles = $('#tiles');
  tiles.innerHTML = '';
  document.body.classList.toggle('palco', !!ch && ch.tipo === 'palco');
  if (!ch) return;
  if (ch.tipo === 'palco') { renderCinema(ch, tiles); return; }
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
      ${!isMe && vol !== 1 ? `<span class="vol-badge">${vol === 0 ? 'Silenciado' : Math.round(vol * 100) + '%'}</span>` : ''}
      ${!isMe && peers.get(u.id)?.semConexao ? '<button class="noconn-btn" title="Sem conexão de áudio com essa pessoa. Clique para tentar de novo.">⚠️ sem conexão · tentar de novo</button>' : ''}`;
    if (!isMe) {
      t.dataset.vol = '1';
      t.title = 'Ajustar volume';
      t.onclick = () => (volTarget === u.id ? closeVolume() : openVolume(u.id, t));
      const nb = t.querySelector('.noconn-btn');
      if (nb) nb.onclick = (e) => { e.stopPropagation(); reconnectPeer(u.id); };
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
      if (u.id === selfId) t.appendChild(flipAllButton());
    }
    tiles.appendChild(t);
  });
}

// (cenários do palco: ver cenas.js, carregado antes deste arquivo)
const cenaDe = (ch) => CENAS[ch?.tema] || CENAS['ar-livre'];
// quem já está sentado em cada sala (pra animar só quem acabou de chegar)
const jaSentados = new Map();
const chegadas = new Map(); // uid -> quando começou a andar (pra continuar a animação se a sala redesenhar no meio)
function cenarioSVG(cena, rnd) {
  return `<svg class="cena" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${cena.svg(rnd)}</svg>`;
}
const PLATEIA_OPTS = {
  mic: { titulo: '🎙️ Microfone da plateia', livre: 'Livre', mudo: 'Mutado' },
  cam: { titulo: '📷 Câmera da plateia', livre: 'Livre', mudo: 'Fechada' },
};
// Caixinha do cenário + regras da plateia. Devolve { tema, mic, cam } ou null
function escolheTema(atual, plateia = {}) {
  return new Promise((res) => {
    document.querySelectorAll('.tipo-pop').forEach((p) => p.remove());
    const sel = { tema: CENAS[atual] ? atual : 'ar-livre', mic: plateia.mic === 'mudo' ? 'mudo' : 'livre', cam: plateia.cam === 'mudo' ? 'mudo' : 'livre' };
    const pop = document.createElement('div');
    pop.className = 'modal';
    pop.innerHTML = `<div class="modal-card tipo-pop tema-pop"><h2>Qual o cenário do palco?</h2><div class="tema-lista">${Object.entries(CENAS).map(([k, t]) => `<button type="button" class="tipo-opt${k === sel.tema ? ' atual' : ''}" data-tema="${k}"><span class="tipo-emoji">${t.emoji}</span><span><strong>${t.nome}</strong><small>${t.desc}</small></span></button>`).join('')}</div>
      <div class="plateia-regras">${Object.entries(PLATEIA_OPTS).map(([k, o]) => `<div class="regra"><span>${o.titulo}</span><div class="seg" data-regra="${k}"><button type="button" data-v="livre" class="${sel[k] === 'livre' ? 'on' : ''}">${o.livre} 100%</button><button type="button" data-v="mudo" class="${sel[k] === 'mudo' ? 'on' : ''}">${o.mudo} 100%</button></div></div>`).join('')}<small>Quem está no palco sempre pode falar e ligar a câmera. Dá pra mudar depois no botão 🎨.</small></div>
      <div class="tema-acoes"><button type="button" class="btn tipo-cancel">Cancelar</button><button type="button" class="btn primary tema-ok">Confirmar</button></div></div>`;
    document.body.appendChild(pop);
    const fim = (v) => { pop.remove(); res(v); };
    pop.querySelectorAll('.tipo-opt').forEach((b) => { b.onclick = () => { sel.tema = b.dataset.tema; pop.querySelectorAll('.tipo-opt').forEach((x) => x.classList.toggle('atual', x === b)); }; });
    pop.querySelectorAll('.seg button').forEach((b) => { b.onclick = () => { const k = b.closest('.seg').dataset.regra; sel[k] = b.dataset.v; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }; });
    pop.querySelector('.tema-ok').onclick = () => fim({ ...sel });
    pop.querySelector('.tipo-cancel').onclick = () => fim(null);
    pop.onclick = (e) => { if (e.target === pop) fim(null); };
  });
}
let cinemaObs = null;
function posicionaTelona() {
  // o #screens (transmissões) fica exatamente em cima da telona desenhada
  const cena = document.querySelector('.cinema'), sc = $('#screens'), st = $('#stage');
  if (!cena || !sc || !st || !document.body.classList.contains('palco')) return;
  const svg = cena.querySelector('.cena');
  const t = cenaDe(currentCh()).tela;
  const r = svg.getBoundingClientRect(), base = st.getBoundingClientRect();
  // viewBox 1000x640 com "slice": calcula a escala e o deslocamento reais
  const k = Math.max(r.width / 1000, r.height / 640);
  const ox = r.left + (r.width - 1000 * k) / 2, oy = r.top + (r.height - 640 * k) / 2;
  Object.assign(sc.style, { left: `${ox - base.left + st.scrollLeft + t.x * k}px`, top: `${oy - base.top + st.scrollTop + t.y * k}px`, width: `${t.w * k}px`, height: `${t.h * k}px` });
  const txt = cena.querySelector('.telona-txt');
  if (txt) Object.assign(txt.style, { left: `${ox - r.left + t.x * k}px`, top: `${oy - r.top + t.y * k}px`, width: `${t.w * k}px`, height: `${t.h * k}px` });
}
// O baseado da brincadeira "Hora de fumar", desenhado uma vez e usado como figurinha na sala dos fumantes
const _spritesBaseado = new Map();
let _jointSala = null;
function spriteBaseado(len = 400) {
  len = Math.max(110, Math.round(len / 20) * 20); // em degraus, pra reaproveitar o desenho
  if (_spritesBaseado.has(len)) return _spritesBaseado.get(len);
  let url = '';
  try {
    if (!_jointSala) _jointSala = jointData();
    const c = document.createElement('canvas');
    c.width = 500; c.height = 160;
    const g = c.getContext('2d');
    g.translate(30, 40);
    drawJoint(g, _jointSala, len, true, 900);
    url = c.toDataURL('image/png');
  } catch { url = ''; }
  _spritesBaseado.set(len, url);
  return url;
}
const FUMAR_MS = 60_000;
const baseadoLen = (inicio) => 400 - 290 * Math.min(1, (Date.now() - inicio) / FUMAR_MS);
async function mandaFumar() {
  const ch = currentCh();
  if (!ch || ch.tipo !== 'palco' || !cenaDe(ch).fumar) return;
  const r = await emitAck('palco-fumar', {});
  if (r?.error) toast(r.error);
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'F1' || !document.body.classList.contains('palco')) return;
  if (e.target.matches('input, textarea, [contenteditable]')) return;
  e.preventDefault();
  mandaFumar();
});
// a cada segundo o baseado de quem está fumando encurta; no fim ele voa pro cinzeiro
setInterval(() => {
  document.querySelectorAll('.cinema .cigarro[data-inicio]').forEach((el) => {
    const inicio = +el.dataset.inicio, img = el.querySelector('img');
    if (!img) return;
    if (Date.now() - inicio >= FUMAR_MS) {
      if (el.dataset.jogado) return;
      el.dataset.jogado = '1';
      jogaNoCinzeiro(el);
      return;
    }
    const src = spriteBaseado(baseadoLen(inicio));
    if (img.getAttribute('src') !== src) img.src = src;
  });
}, 1000);
function jogaNoCinzeiro(el) {
  const cena = document.querySelector('.cinema');
  const ch = currentCh();
  const cz = cena && cenaDe(ch).cinzeiro;
  const fum = el.parentElement?.querySelector('.fumaca');
  if (fum) fum.remove();
  if (!cz) { el.remove(); return; }
  const a = centroDe(el), r = cena.getBoundingClientRect(), st = $('#stage').getBoundingClientRect(), stEl = $('#stage');
  const b = { x: r.left - st.left + stEl.scrollLeft + r.width * cz.x / 100, y: r.top - st.top + stEl.scrollTop + r.height * cz.y / 100 };
  const voa = document.createElement('span');
  voa.className = 'reacao voa baseado-voa';
  voa.innerHTML = `<img src="${spriteBaseado(110)}" alt="">`;
  camadaReacoes().appendChild(voa);
  el.remove();
  const alt = Math.max(50, Math.hypot(b.x - a.x, b.y - a.y) * 0.3), passos = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - alt;
    const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x;
    const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y;
    passos.push({ transform: `translate(${x}px, ${y}px) rotate(${-30 + t * 400}deg)`, opacity: t > 0.9 ? 0.6 : 1 });
  }
  someDepois(voa, 900);
  voa.animate(passos, { duration: 900, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
    voa.remove();
    // última fumacinha no cinzeiro
    for (let i = 0; i < 3; i++) {
      const p = document.createElement('span');
      p.className = 'reacao pedaco fumo';
      camadaReacoes().appendChild(p);
      someDepois(p, 1400);
      p.animate([{ transform: `translate(${b.x}px, ${b.y}px) scale(.5)`, opacity: .7 }, { transform: `translate(${b.x + (i - 1) * 10}px, ${b.y - 40 - i * 8}px) scale(2.2)`, opacity: 0 }], { duration: 1400, delay: i * 200, easing: 'ease-out', fill: 'forwards' }).onfinish = () => p.remove();
    }
  };
}

// ---- 🍿 Reações da plateia: pipoca/tomate em alguém, aplausos e cia para a tela ----
const REACAO_EMOJI = { aplauso: '👏', fogo: '🔥', risada: '😂', coracao: '❤️', uau: '😮', pipoca: '🍿', tomate: '🍅' };
const REACAO_NOME = { aplauso: 'Aplaudir', fogo: 'Que fogo!', risada: 'Rindo', coracao: 'Amei', uau: 'Uau!', pipoca: 'Jogar pipoca', tomate: 'Jogar tomate' };
const REACAO_ALVO = new Set(['pipoca', 'tomate']);
let ultimaReacao = 0;
async function mandaReacao(tipo, alvo) {
  const agora = Date.now();
  if (agora - ultimaReacao < 250) return;
  ultimaReacao = agora;
  const r = await emitAck('palco-reacao', { tipo, alvo: alvo || null });
  if (r?.error) toast(r.error);
}
function camadaReacoes() {
  const st = $('#stage');
  let l = st.querySelector('#reacoes');
  if (!l) { l = document.createElement('div'); l.id = 'reacoes'; st.appendChild(l); }
  return l;
}
// centro de um elemento, relativo ao #stage
function centroDe(el) {
  const st = $('#stage'), r = el.getBoundingClientRect(), b = st.getBoundingClientRect();
  return { x: r.left - b.left + st.scrollLeft + r.width / 2, y: r.top - b.top + st.scrollTop + r.height / 2, w: r.width };
}
function pessoaNaCena(uid) {
  const d = document.querySelector(`.cinema [data-uid="${CSS.escape(uid)}"]`);
  return d ? (d.querySelector('.cam-redonda') || d.querySelector('.avatar') || d) : null;
}
// garante que o emoji some mesmo se a aba estiver em segundo plano (animação pausada)
function someDepois(el, ms) { setTimeout(() => el.remove(), ms + 400); }
function animaReacao({ tipo, de, alvo }) {
  const cena = document.querySelector('.cinema');
  if (!cena || !REACAO_EMOJI[tipo]) return;
  const origemEl = pessoaNaCena(de);
  const camada = camadaReacoes();
  const emoji = REACAO_EMOJI[tipo];
  const quem = findUser(de);
  if (REACAO_ALVO.has(tipo)) {
    const alvoEl = alvo && pessoaNaCena(alvo);
    if (!origemEl || !alvoEl) return;
    const a = centroDe(origemEl), b = centroDe(alvoEl);
    // quem joga dá uma "balançada" de arremesso antes da pipoca sair
    const origemDiv = origemEl.closest('[data-uid]');
    if (origemDiv) { origemDiv.classList.add('arremessa'); setTimeout(() => origemDiv.classList.remove('arremessa'), 450); }
    const voa = document.createElement('span');
    voa.className = 'reacao voa';
    voa.textContent = emoji;
    camada.appendChild(voa);
    // trajetória com "gravidade": parábola de verdade (sobe rápido, cai acelerando), com cambalhotas e sombra
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const alt = Math.max(70, dist * 0.42);
    const dur = 700 + Math.min(700, dist * 0.9);
    const N = 24, passos = [];
    const giros = (2 + Math.random() * 2) * (b.x >= a.x ? 1 : -1);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t - alt * 4 * t * (1 - t); // parábola
      const esc = 1 + Math.sin(t * Math.PI) * 0.7; // "chega mais perto da câmera" no alto
      const wobble = Math.sin(t * Math.PI * 6) * 6;
      passos.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(giros * 360 * t + wobble).toFixed(0)}deg) scale(${esc.toFixed(2)})` });
    }
    // sombra no chão acompanha
    const sombra = document.createElement('span');
    sombra.className = 'reacao sombra';
    camada.appendChild(sombra);
    const sPassos = [];
    for (let i = 0; i <= N; i++) { const t = i / N; const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + 14; const h = 4 * t * (1 - t); sPassos.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(1 - h * 0.5).toFixed(2)})`, opacity: 0.35 - h * 0.2 }); }
    someDepois(voa, 220 + dur); someDepois(sombra, 220 + dur);
    const anim = voa.animate(passos, { duration: dur, delay: 220, easing: 'linear', fill: 'forwards' });
    sombra.animate(sPassos, { duration: dur, delay: 220, easing: 'linear', fill: 'forwards' });
    anim.onfinish = () => {
      voa.remove(); sombra.remove();
      const alvoDiv = alvoEl.closest('[data-uid]');
      if (alvoDiv) { alvoDiv.classList.add('atingido'); setTimeout(() => alvoDiv.classList.remove('atingido'), 600); }
      // estouro: cada pedaço sai com velocidade própria e cai com gravidade, quicando
      const n = tipo === 'tomate' ? 9 : 10;
      for (let i = 0; i < n; i++) {
        const p = document.createElement('span');
        p.className = 'reacao pedaco';
        if (tipo === 'tomate') { p.textContent = i % 3 === 0 ? '🍅' : '🔴'; if (i % 3 !== 0) p.classList.add('gota'); }
        else { p.classList.add('kernel', `k${i % 4}`); } // pipoca estourada: grãozinhos brancos, não saquinhos
        camada.appendChild(p);
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3, vel = 60 + Math.random() * 90;
        const vx = Math.cos(ang) * vel, vy = Math.sin(ang) * vel, g = 260, T = 0.9 + Math.random() * 0.4;
        const kf = [];
        for (let k = 0; k <= 12; k++) {
          const t = (k / 12) * T;
          const x = b.x + vx * t, y = b.y + vy * t + 0.5 * g * t * t;
          kf.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(t * 400 * (i % 2 ? 1 : -1)).toFixed(0)}deg) scale(${(1 - (k / 12) * 0.6).toFixed(2)})`, opacity: k < 9 ? 1 : 1 - (k - 9) / 3 });
        }
        someDepois(p, T * 1000);
        p.animate(kf, { duration: T * 1000, easing: 'linear', fill: 'forwards' }).onfinish = () => p.remove();
      }
      if (tipo === 'tomate') {
        // mancha vermelha que escorre e some
        const m = document.createElement('span');
        m.className = 'reacao mancha';
        m.innerHTML = '<svg viewBox="0 0 60 60"><path d="M30 6 C40 4 52 10 54 22 C56 32 50 36 52 46 C53 54 44 58 38 52 C34 48 26 56 20 52 C12 48 14 40 10 34 C4 26 8 12 18 10 C22 9 26 7 30 6Z" fill="#dc2626" opacity=".9"/><circle cx="24" cy="24" r="4" fill="#f87171" opacity=".8"/></svg>';
        camada.appendChild(m);
        someDepois(m, 1500);
        m.animate([
          { transform: `translate(${b.x}px, ${b.y}px) scale(.3)`, opacity: 0 },
          { transform: `translate(${b.x}px, ${b.y}px) scale(1.15)`, opacity: 1, offset: 0.12 },
          { transform: `translate(${b.x}px, ${b.y + 6}px) scale(1)`, opacity: .9, offset: 0.5 },
          { transform: `translate(${b.x}px, ${b.y + 18}px) scale(1.05, 1.25)`, opacity: 0 },
        ], { duration: 1500, easing: 'ease-out', fill: 'forwards' }).onfinish = () => m.remove();
      }
      if (quem && alvo === selfId) toast(`${quem.name} jogou ${tipo} em você! ${emoji}`);
    };
    return;
  }
  // reação para a tela: sobe da pessoa em direção à telona e some
  const sc = $('#screens');
  const a = origemEl ? centroDe(origemEl) : centroDe(cena);
  const tela = sc && !sc.hidden && sc.offsetWidth ? centroDe(sc) : { x: a.x, y: a.y - 200 };
  for (let i = 0; i < 5; i++) {
    const p = document.createElement('span');
    p.className = 'reacao sobe';
    p.textContent = emoji;
    camada.appendChild(p);
    const dx = (Math.random() - 0.5) * 70, fim = { x: a.x + (tela.x - a.x) * (0.25 + Math.random() * 0.35) + dx, y: a.y - 80 - Math.random() * 120 };
    p.animate([
      { transform: `translate(${a.x}px, ${a.y}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${a.x + dx / 2}px, ${a.y - 30}px) scale(1.2)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${fim.x}px, ${fim.y}px) scale(.9) rotate(${(Math.random() - 0.5) * 40}deg)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 500, delay: i * 90, easing: 'ease-out', fill: 'forwards' }).onfinish = () => p.remove();
    someDepois(p, 1800 + i * 90);
  }
}
socket.on('palco-reacao', (r) => { try { animaReacao(r); } catch (e) { console.warn('reação', e); } });

function renderCinema(ch, box) {
  const gerente = podeGerirSrv(ch.srv);
  const palco = ch.users.filter((u) => u.stage);
  const plateia = ch.users.filter((u) => !u.stage);
  const eu = ch.users.find((u) => u.id === selfId);
  const euNoPalco = !!eu?.stage;
  noPalco = euNoPalco;
  document.body.classList.toggle('no-palco', euNoPalco);
  // Plateia assiste automaticamente quem transmite no palco
  palco.forEach((u) => { if (u.id !== selfId && isSharing(u.id) && !watching.has(u.id)) watch(u.id); });
  const rnd = semente(ch.id);
  const cena = cenaDe(ch);
  const wrap = document.createElement('div');
  wrap.className = `cinema tema-${ch.tema || 'ar-livre'}`;
  wrap.innerHTML = cenarioSVG(cena, rnd);
  const alguemTransmite = palco.some((u) => isSharing(u.id));
  // texto na telona apagada
  const tela = document.createElement('div');
  tela.className = 'telona-txt';
  tela.innerHTML = alguemTransmite ? '' : `<span>🎬</span><strong>${palco.length ? 'Esperando alguém do palco transmitir…' : 'O palco está vazio'}</strong><small>${gerente ? 'Passe o mouse em alguém da plateia e clique em "Subir ao palco".' : 'Quem está no palco pode transmitir a tela para todo mundo.'}</small>`;
  tela.hidden = alguemTransmite;
  wrap.appendChild(tela);
  const botaoPalco = (u) => {
    if (u.id === selfId) return u.stage ? '<button type="button" class="btn small stage-btn" data-off="1">⬇ Descer do palco</button>' : (gerente ? `<button type="button" class="btn small stage-btn" ${palco.length >= 2 ? 'disabled title="O palco só cabe 2"' : ''}>⬆ Subir ao palco</button>` : '');
    if (!gerente) return '';
    return u.stage ? '<button type="button" class="btn small stage-btn" data-off="1">⬇ Descer</button>' : `<button type="button" class="btn small stage-btn" ${palco.length >= 2 ? 'disabled title="O palco só cabe 2"' : ''}>⬆ Subir ao palco</button>`;
  };
  const botaoReacao = (u) => (u.id === selfId || !eu ? '' : `<span class="react-btns"><button type="button" class="react-btn" data-react="pipoca" title="Jogar pipoca">🍿</button><button type="button" class="react-btn" data-react="tomate" title="Jogar tomate">🍅</button></span>`);
  // ⇄ na bolinha da câmera (e, na sua, o 👥 de espelhar para todo mundo)
  const botoesEspelho = (d, u) => {
    const b = document.createElement('span');
    b.className = 'espelho-bolha';
    b.appendChild(mirrorButton(u.id));
    if (u.id === selfId) b.appendChild(flipAllButton());
    b.onclick = (e) => e.stopPropagation();
    d.appendChild(b);
  };
  const liga = (d, u) => {
    const sb = d.querySelector('.stage-btn');
    if (sb) sb.onclick = async (e) => { e.stopPropagation(); const r = await emitAck('stage-set', { id: u.id, on: !sb.dataset.off }); if (r?.error) toast(r.error); };
    d.querySelectorAll('.react-btn').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); mandaReacao(b.dataset.react, u.id); }; });
    if (u.id !== selfId) d.onclick = () => (volTarget === u.id ? closeVolume() : openVolume(u.id, d));
  };
  // quem está no palco: de pé ao lado da telona, iluminado
  palco.forEach((u, i) => {
    const d = document.createElement('div');
    d.className = `no-palco-pessoa lado-${i === 0 ? 'esq' : 'dir'}${speaking.has(u.id) ? ' speaking' : ''}${u.id === selfId ? ' eu' : ''}`;
    d.dataset.uid = u.id;
    d.title = u.name + ' · no palco';
    if (cena.palcoPos?.[i]) Object.assign(d.style, { left: cena.palcoPos[i].left, right: 'auto', top: cena.palcoPos[i].top });
    d.innerHTML = `${avatarHTML(u)}<span class="pname">🎤 ${esc(u.name)}${u.id === selfId ? ' (você)' : ''}</span>${isSharing(u.id) ? '<span class="live">AO VIVO</span>' : ''}${botaoPalco(u)}${botaoReacao(u)}`;
    const cam = camOf(u.id);
    if (cam) { const v = camVideoFor(u.id, cam); d.querySelector('.avatar').replaceWith(v); v.className = 'cam-redonda' + (isMirrored(u.id) ? ' mirror' : ''); v.play().catch(() => {}); botoesEspelho(d, u); }
    liga(d, u);
    wrap.appendChild(d);
  });
  // plateia: fileiras na grama, com perspectiva (fundo menor)
  const filas = cena.filas;
  const chave = ch.id;
  if (!jaSentados.has(chave)) jaSentados.set(chave, new Set());
  const vistos = jaSentados.get(chave);
  const presentes = new Set(ch.users.map((u) => u.id));
  const chegando = [];
  const fumaca = (u) => (cena.fumar && u.fumando && u.fumando < FUMAR_MS) ? `<span class="cigarro" data-inicio="${Date.now() - u.fumando}"><img src="${spriteBaseado(baseadoLen(Date.now() - u.fumando))}" alt=""></span><span class="fumaca"><i></i><i></i><i></i><i></i></span>` : '';
  let idx = 0;
  for (let f = 0; f < filas.length && idx < plateia.length; f++) {
    const fila = filas[f];
    const n = Math.min(fila.cap, plateia.length - idx);
    const passo = 84 / (n + 1);
    for (let c = 0; c < n; c++, idx++) {
      const u = plateia[idx];
      const r2 = semente(ch.id + ':' + (u.uid || u.name));
      const tipo = cena.assentos[Math.floor(r2() * cena.assentos.length)], cor = cena.cores[Math.floor(r2() * cena.cores.length)];
      const x = 8 + passo * (c + 1) + (r2() - 0.5) * (passo * 0.35) + (f % 2 ? passo / 3 : 0);
      const d = document.createElement('div');
      d.className = `sentado ${tipo}${speaking.has(u.id) ? ' speaking' : ''}${u.id === selfId ? ' eu' : ''}${u.hand ? ' hand' : ''}`;
      d.dataset.uid = u.id;
      d.title = u.name + (u.hand ? ' · quer subir ao palco' : '');
      d.style.cssText = `left:${Math.min(92, x).toFixed(1)}%;top:${fila.y}%;--k:${fila.k};z-index:${10 + Math.round(fila.y)};`;
      if (cena.porta && (!vistos.has(u.id) || chegadas.has(u.id))) chegando.push(d);
      d.innerHTML = `<span class="assento">${assentoSVG(tipo, cor)}</span>${avatarHTML(u)}${fumaca(u)}<span class="pname">${esc(u.name)}${u.id === selfId ? ' (você)' : ''}</span>${u.hand ? '<span class="hand-badge" title="Quer subir ao palco">✋</span>' : ''}${botaoPalco(u)}${botaoReacao(u)}`;
      const camP = camOf(u.id);
      if (camP) { const v = camVideoFor(u.id, camP); d.querySelector('.avatar').replaceWith(v); v.className = 'cam-redonda' + (isMirrored(u.id) ? ' mirror' : ''); v.play().catch(() => {}); botoesEspelho(d, u); }
      liga(d, u);
      wrap.appendChild(d);
    }
  }
  // placar + minha ação
  const info = document.createElement('div');
  info.className = 'cinema-info';
  const regras = (ch.plateia?.mic === 'mudo' ? '<span title="A plateia não fala; só o palco">🔇 plateia sem mic</span>' : '') + (ch.plateia?.cam === 'mudo' ? '<span title="A plateia não liga câmera; só o palco">🚫 plateia sem câmera</span>' : '');
  info.innerHTML = `<span>🎭 Palco ${palco.length}/2</span><span>🍿 Plateia ${plateia.length}</span>${gerente ? `<button type="button" class="tema-btn" title="Cenário e regras da plateia">${cena.emoji} ${cena.nome} · 🎨</button>` : `<span>${cena.emoji} ${cena.nome}</span>`}${regras}`;
  // ⛶ tela cheia (no celular, deita a tela): o cinema ocupa a tela toda
  const fs = document.createElement('button');
  fs.type = 'button'; fs.className = 'tema-btn fs-btn'; fs.title = 'Tela cheia'; fs.textContent = document.fullscreenElement ? '✕ Sair' : '⛶';
  fs.onclick = async () => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); try { screen.orientation?.unlock?.(); } catch {} }
      else { await $('#stage').requestFullscreen(); try { await screen.orientation?.lock?.('landscape'); } catch {} }
    } catch (e) { toast('Tela cheia não disponível aqui.'); }
  };
  info.appendChild(fs);
  const tb = info.querySelector('.tema-btn');
  if (tb) tb.onclick = async () => {
    const e = await escolheTema(ch.tema, ch.plateia);
    if (!e) return;
    const r = await emitAck('channel-theme', { id: ch.id, tema: e.tema, plateia: { mic: e.mic, cam: e.cam } });
    if (r?.error) toast(r.error); else toast(`${CENAS[e.tema].emoji} ${CENAS[e.tema].nome} · mic ${e.mic === 'mudo' ? 'mutado' : 'livre'} · câmera ${e.cam === 'mudo' ? 'fechada' : 'livre'}`);
  };
  wrap.appendChild(info);
  if (eu) {
    const bar = document.createElement('div');
    bar.className = 'reacao-bar';
    bar.innerHTML = Object.entries(REACAO_EMOJI).filter(([k]) => !REACAO_ALVO.has(k)).map(([k, e]) => `<button type="button" data-react="${k}" title="${REACAO_NOME[k]}">${e}</button>`).join('')
      + (cena.fumar ? `<button type="button" class="fumar-btn${eu.fumando && eu.fumando < FUMAR_MS ? ' on' : ''}" title="Acender um (F1)">🌿<small>F1</small></button>` : '');
    bar.querySelectorAll('button[data-react]').forEach((b) => { b.onclick = () => mandaReacao(b.dataset.react); });
    const fb = bar.querySelector('.fumar-btn');
    if (fb) fb.onclick = mandaFumar;
    wrap.appendChild(bar);
  }
  if (eu && !eu.stage) {
    const b = document.createElement('button');
    b.type = 'button';
    if (gerente) {
      // dono/moderador sobe sozinho, sem pedir
      b.className = 'btn hand-btn';
      b.textContent = '🎭 Subir ao palco';
      b.disabled = palco.length >= 2;
      b.title = b.disabled ? 'O palco só cabe 2' : '';
      b.onclick = async () => { const r = await emitAck('stage-set', { id: selfId, on: true }); if (r?.error) toast(r.error); };
    } else {
      b.className = 'btn hand-btn' + (eu.hand ? ' on' : '');
      b.textContent = eu.hand ? '✋ Pedido enviado · cancelar' : '✋ Pedir para subir ao palco';
      b.onclick = async () => { const r = await emitAck('stage-hand', { on: !eu.hand }); if (r?.error) toast(r.error); };
    }
    wrap.appendChild(b);
  }
  // fumaça também em quem está no palco
  if (cena.fumar) wrap.querySelectorAll('.no-palco-pessoa').forEach((d) => { const u = ch.users.find((x) => x.id === d.dataset.uid); if (u) d.insertAdjacentHTML('beforeend', fumaca(u)); });
  box.appendChild(wrap);
  // quem acabou de entrar na plateia: o avatar entra pela porta e anda até o lugar
  [...vistos].forEach((id) => { if (!presentes.has(id)) vistos.delete(id); });
  if (chegando.length) {
    const r = wrap.getBoundingClientRect();
    const agora = Date.now();
    let novos = 0;
    chegando.forEach((d) => {
      const av = d.querySelector('.avatar'), uid = d.dataset.uid;
      if (!av) return;
      let inicio = chegadas.get(uid);
      if (!inicio) { inicio = agora + novos * 250; chegadas.set(uid, inicio); novos++; }
      if (agora - inicio > 1800) { chegadas.delete(uid); return; }
      const a = av.getBoundingClientRect();
      const px = r.left + r.width * cena.porta.x / 100, py = r.top + r.height * cena.porta.y / 100;
      d.style.setProperty('--ax', `${(px - (a.left + a.width / 2)).toFixed(0)}px`);
      d.style.setProperty('--ay', `${(py - (a.top + a.height / 2)).toFixed(0)}px`);
      d.style.setProperty('--atraso', `${inicio - agora}ms`);
      d.classList.add('chegando');
      const termina = () => { d.classList.remove('chegando'); chegadas.delete(uid); };
      d.addEventListener('animationend', (e) => { if (e.animationName === 'anda') termina(); });
      setTimeout(termina, inicio - agora + 2000); // garantia (aba em segundo plano pausa animações)
    });
  }
  ch.users.forEach((u) => { if (!u.stage) vistos.add(u.id); else vistos.delete(u.id); });
  requestAnimationFrame(posicionaTelona);
  if (!cinemaObs) { cinemaObs = new ResizeObserver(() => posicionaTelona()); window.addEventListener('resize', posicionaTelona); document.addEventListener('fullscreenchange', () => { renderMain(); setTimeout(posicionaTelona, 100); }); }
  cinemaObs.disconnect();
  cinemaObs.observe(wrap);
}

function renderControls() {
  const me = $('#me-avatar');
  fillAvatar(me, myName, myAvatar);
  $('#me-name').textContent = myName;

  const bmu = $('#btn-music');
  bmu.classList.toggle('active', !!musicStream);
  bmu.querySelector('.label').textContent = musicStream ? 'Parar música' : 'Música';
  bmu.hidden = true; // botão "Música" (som de uma aba) desligado: o DJ King faz esse papel agora

  const bm = $('#btn-mute');
  bm.innerHTML = muted || deafened ? ICON.micOff : ICON.mic;
  bm.classList.toggle('off', muted || deafened);
  bm.title = muted || deafened ? 'Desmutar' : 'Mutar microfone';

  const bd = $('#btn-deafen');
  bd.innerHTML = deafened ? ICON.headOff : ICON.head;
  bd.classList.toggle('off', deafened);
  bd.title = deafened ? 'Voltar a ouvir' : 'Ensurdecer';
  // cópias na barra de baixo da chamada
  const cm = $('#cb-mic'), cf = $('#cb-fone');
  if (cm) { cm.innerHTML = bm.innerHTML; cm.classList.toggle('off', bm.classList.contains('off')); cm.title = bm.title; }
  if (cf) { cf.innerHTML = bd.innerHTML; cf.classList.toggle('off', bd.classList.contains('off')); cf.title = bd.title; }

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

// ---------- Gavetinha "Mais" da barra da chamada + botões de microfone e fone ----------
(function gaveta() {
  const b = $('#btn-more'), pop = $('#more-pop');
  if (!b || !pop) return;
  $('#cb-mic').onclick = toggleMute;
  $('#cb-fone').onclick = toggleDeafen;
  const set = (aberta) => { pop.hidden = !aberta; b.classList.toggle('open', aberta); b.setAttribute('aria-expanded', String(aberta)); };
  b.onclick = (e) => { e.stopPropagation(); set(pop.hidden); };
  pop.addEventListener('click', (e) => { if (e.target.closest('button')) set(false); });
  document.addEventListener('click', (e) => { if (!pop.hidden && !e.target.closest('.more-wrap')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  // aviso de mensagem nova do chat aparece também no botão da gaveta
  const cb = $('#chat-badge'), mb = $('#more-badge');
  const sb = $('#side-badge');
  const sync = () => { mb.hidden = cb.hidden; mb.textContent = cb.textContent; if (sb) { sb.hidden = cb.hidden; sb.textContent = cb.textContent; } };
  const st = $('#side-toggle');
  if (st) { st.onclick = toggleSide; applySide(); }
  document.addEventListener('click', (e) => {
    if (botsOpen && !e.target.closest('.bots-room')) { botsOpen = false; document.querySelector('.bots-room')?.classList.remove('open'); }
  });
  new MutationObserver(sync).observe(cb, { attributes: true, childList: true, characterData: true, subtree: true });
  sync();
  // tela cheia da TV: o botão some sozinho e volta ao mexer
  const tvw = $('#tv-video-wrap');
  if (tvw) {
    let t, lx = -1, ly = -1;
    const wake = (e) => {
      if (e && e.type === 'pointermove') { if (Math.abs(e.clientX - lx) < 4 && Math.abs(e.clientY - ly) < 4) return; lx = e.clientX; ly = e.clientY; }
      tvw.classList.remove('idle'); clearTimeout(t); t = setTimeout(() => tvw.classList.add('idle'), 3000);
    };
    tvw.addEventListener('pointermove', wake); tvw.addEventListener('pointerdown', wake); tvw.addEventListener('fullscreenchange', () => wake());
  }
})();
