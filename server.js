// Servidor do King Launcher: contas, canais e "apresentação" entre os participantes.
// Áudio, tela e câmera NÃO passam por aqui — vão direto entre os aparelhos (WebRTC).

const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { hashSenha, confereSenha, criaToken, leToken, abreBanco } = require('./contas');

const PORT = process.env.PORT || 3000;
const MAX_PER_CHANNEL = Number(process.env.MAX_PER_CHANNEL || 15);
const DEFAULT_NAMES = (process.env.CHANNELS || 'Geral,Sala 2,Sala 3')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const { banco, tipo: tipoBanco } = abreBanco();

const app = express();
app.use(express.json({ limit: '100kb' }));
// "no-cache": o navegador sempre confere se o arquivo mudou (atualizações aparecem na hora)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
}));

// O app do celular (e a versão de teste) chamam a API de outro endereço
app.use('/api', (req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Configuração de STUN/TURN entregue ao navegador
// "Impressão digital" do site: muda sempre que os arquivos mudam (nova atualização)
const VERSAO_SITE = (() => {
  const h = crypto.createHash('sha1');
  for (const f of ['app.js', 'style.css', 'index.html']) {
    try { h.update(require('fs').readFileSync(path.join(__dirname, 'public', f))); } catch {}
  }
  return h.digest('hex').slice(0, 12);
})();

app.get('/config', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const iceServers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL.split(',').map((s) => s.trim()),
      username: process.env.TURN_USER,
      credential: process.env.TURN_PASS,
    });
  }
  res.json({ iceServers, maxPerChannel: MAX_PER_CHANNEL, contas: true, versao: VERSAO_SITE });
});

// ---------- Contas ----------
const RANK = { member: 0, mod: 1, owner: 2 };
const ROLE_NAME = { owner: 'Dono', mod: 'Moderador', member: 'Membro' };

function cleanName(s, fallback) {
  const v = String(s || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  return v || fallback;
}

// Avatar: um do pacote ("p:gato") ou uma foto pequena enviada pela pessoa
function cleanAvatar(a) {
  if (typeof a !== 'string') return '';
  if (/^p:[a-z0-9-]{1,20}$/.test(a)) return a;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a) && a.length < 40_000) return a;
  return '';
}

const cleanUsername = (s) => String(s || '').trim().toLowerCase();
const publicUser = (u) => ({
  id: u.id, username: u.username, name: u.name, avatar: u.avatar || '',
  role: u.role, status: u.status, createdAt: u.created_at,
});

// Proteção contra quem fica tentando adivinhar senha (ou criando contas sem parar)
const tentativas = new Map(); // "tipo|ip" -> [horários]
function bloqueado(chave, limite) {
  const now = Date.now();
  const lista = (tentativas.get(chave) || []).filter((t) => now - t < 60_000);
  tentativas.set(chave, lista);
  return lista.length >= limite;
}
const anota = (chave) => tentativas.get(chave)?.push(Date.now()) ?? tentativas.set(chave, [Date.now()]);

const erro = (res, status, msg, extra = {}) => res.status(status).json({ error: msg, ...extra });

app.post('/api/register', async (req, res) => {
  try {
    if (bloqueado('cadastro|' + req.ip, 10)) return erro(res, 429, 'Muitas tentativas. Espere um minuto.');
    anota('cadastro|' + req.ip);
    const username = cleanUsername(req.body?.username);
    const senha = String(req.body?.password || '');
    const name = cleanName(req.body?.name, '') || username;
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) {
      return erro(res, 400, 'O usuário deve ter de 3 a 20 letras ou números (sem espaço nem acento).');
    }
    if (senha.length < 6) return erro(res, 400, 'A senha precisa ter pelo menos 6 caracteres.');
    if (await banco.byUsername(username)) return erro(res, 409, 'Esse usuário já existe. Escolha outro.');
    // A primeira conta criada é a do dono (já aprovada)
    const primeiro = (await banco.count()) === 0;
    const u = await banco.create({
      username, name, pass: hashSenha(senha),
      role: primeiro ? 'owner' : 'member',
      status: primeiro ? 'approved' : 'pending',
    });
    if (primeiro) {
      return res.json({ ok: true, status: 'approved', token: criaToken(u.id), user: publicUser(u) });
    }
    avisaPendentes();
    res.json({ ok: true, status: 'pending' });
  } catch (e) {
    console.error('cadastro:', e);
    erro(res, 500, 'Erro no servidor. Tente de novo.');
  }
});

app.post('/api/login', async (req, res) => {
  try {
    // 8 senhas erradas seguidas: espera 1 minuto
    if (bloqueado('login|' + req.ip, 8)) return erro(res, 429, 'Muitas senhas erradas. Espere um minuto.');
    const u = await banco.byUsername(cleanUsername(req.body?.username));
    if (!u || !confereSenha(req.body?.password, u.pass)) {
      anota('login|' + req.ip);
      return erro(res, 401, 'Usuário ou senha errados.');
    }
    if (u.status === 'pending') {
      return erro(res, 403, 'Sua conta ainda está esperando a aprovação do dono.', { status: 'pending' });
    }
    if (u.status === 'banned') return erro(res, 403, 'Esta conta foi banida.', { status: 'banned' });
    res.json({ ok: true, token: criaToken(u.id), user: publicUser(u) });
  } catch (e) {
    console.error('login:', e);
    erro(res, 500, 'Erro no servidor. Tente de novo.');
  }
});

async function userFromReq(req) {
  const h = String(req.headers.authorization || '');
  const id = leToken(h.startsWith('Bearer ') ? h.slice(7) : '');
  return id ? banco.byId(id) : null;
}

// ---------- Fotos e áudios no chat ----------
// O arquivo é guardado no banco e a mensagem leva só "img:<código>" (foto)
// ou "aud:<código>:<segundos>" (áudio).
// O código é longo e aleatório: só quem recebeu a mensagem consegue abrir.
const IMG_MAX = 3 * 1024 * 1024; // fotos
const MUSIC_MAX = 15 * 1024 * 1024; // músicas (MP3) para o bot
const IMG_DIAS = 90; // fotos mais velhas que isso são apagadas
const imgUploads = new Map(); // uid -> horários (limite por minuto)
function tipoImagem(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (b.length > 6 && b.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  // áudios (mensagem de voz)
  if (b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'audio/webm';
  if (b.length > 4 && b.toString('ascii', 0, 4) === 'OggS') return 'audio/ogg';
  if (b.length > 12 && b.toString('ascii', 4, 8) === 'ftyp') return 'audio/mp4';
  if (b.length > 3 && (b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0))) return 'audio/mpeg';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE') return 'audio/wav';
  return null;
}
app.options('/api/img', (req, res) => res.sendStatus(204));
app.post('/api/img', express.raw({ type: () => true, limit: MUSIC_MAX }), async (req, res) => {
  try {
    const u = await userFromReq(req);
    if (!u || u.status !== 'approved') return erro(res, 401, 'Entre de novo.');
    const now = Date.now();
    const t = (imgUploads.get(u.id) || []).filter((x) => now - x < 60_000);
    if (t.length >= 20) return erro(res, 429, 'Calma! Muitos envios seguidos.');
    const dados = Buffer.isBuffer(req.body) ? req.body : null;
    const mime = dados && tipoImagem(dados);
    if (!mime) return erro(res, 400, 'Esse arquivo não é uma foto nem um áudio.');
    if (!mime.startsWith('audio/') && dados.length > IMG_MAX) return erro(res, 413, 'Foto grande demais.');
    t.push(now);
    imgUploads.set(u.id, t);
    const id = crypto.randomBytes(12).toString('base64url');
    await banco.addImg({ id, dono: u.id, mime, dados });
    res.json({ ok: true, id });
  } catch (e) {
    if (e.type === 'entity.too.large') return erro(res, 413, 'Arquivo grande demais.');
    console.error('img:', e.message);
    erro(res, 500, 'Não consegui guardar o arquivo.');
  }
});
app.get('/img/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!/^[A-Za-z0-9_-]{16}$/.test(id)) return res.sendStatus(404);
    const im = await banco.getImg(id);
    if (!im) return res.sendStatus(404);
    res.set('Content-Type', im.mime);
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Accept-Ranges', 'bytes');
    const total = im.dados.length;
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    if (m && (m[1] || m[2])) {
      let a = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2]));
      let b = m[1] && m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
      if (a >= total || a > b) { res.set('Content-Range', `bytes */${total}`); return res.sendStatus(416); }
      res.status(206);
      res.set('Content-Range', `bytes ${a}-${b}/${total}`);
      return res.end(im.dados.subarray(a, b + 1));
    }
    res.end(im.dados);
  } catch (e) {
    res.sendStatus(500);
  }
});
async function limpaFotos() {
  try {
    const n = await banco.removeOldImgs(IMG_DIAS);
    if (n) console.log(`Fotos antigas apagadas: ${n}`);
  } catch (e) {
    console.error('limpar fotos:', e.message);
  }
}
setTimeout(limpaFotos, 60_000);
setInterval(limpaFotos, 24 * 3600_000).unref();

app.get('/api/me', async (req, res) => {
  try {
    const u = await userFromReq(req);
    if (!u) return erro(res, 401, 'Entre de novo.');
    if (u.status !== 'approved') {
      return erro(res, 403, u.status === 'banned' ? 'Esta conta foi banida.' : 'Conta esperando aprovação.', { status: u.status });
    }
    res.json({ ok: true, user: publicUser(u) });
  } catch (e) {
    erro(res, 500, 'Erro no servidor.');
  }
});

// Trocar a senha (precisa da senha atual)
app.post('/api/password', async (req, res) => {
  try {
    const u = await userFromReq(req);
    if (!u) return erro(res, 401, 'Entre de novo.');
    if (!confereSenha(req.body?.old, u.pass)) return erro(res, 401, 'A senha atual está errada.');
    if (String(req.body?.password || '').length < 6) return erro(res, 400, 'A senha nova precisa ter pelo menos 6 caracteres.');
    await banco.update(u.id, { pass: hashSenha(req.body.password) });
    res.json({ ok: true });
  } catch (e) {
    erro(res, 500, 'Erro no servidor.');
  }
});

// ---------- GIFs (KLIPY) ----------
// A chave fica no Render (variável KLIPY_KEY). As buscas passam pelo servidor
// para a chave não aparecer para ninguém.
const GIF_KEY = process.env.KLIPY_KEY || process.env.GIF_KEY || '';
const GIF_API = process.env.KLIPY_API || 'https://api.klipy.com'; // trocado só em testes
const gifCache = new Map(); // busca -> { at, items }

// Acha os endereços dos GIFs em qualquer formato de resposta
function extraiGifs(json) {
  const lista = Array.isArray(json?.results) ? json.results
    : Array.isArray(json?.data?.data) ? json.data.data
    : Array.isArray(json?.data) ? json.data : [];
  return lista.map((item) => {
    const urls = [];
    (function walk(o, path) {
      if (!o || typeof o !== 'object') return;
      for (const [k, v] of Object.entries(o)) {
        const p = path + '/' + k.toLowerCase();
        if (typeof v === 'string' && /^https:\/\/\S+\.(gif|webp)(\?\S*)?$/i.test(v)) urls.push({ p, url: v });
        else if (typeof v === 'object') walk(v, p);
      }
    })(item, '');
    if (!urls.length) return null;
    const isGif = (u) => /\.gif(\?|$)/i.test(u.url);
    const small = urls.find((u) => /tiny|nano|\/sm\b|\/xs\b|preview/.test(u.p) && isGif(u)) || urls.find((u) => /tiny|nano|\/sm\b|\/xs\b|preview/.test(u.p));
    // Tamanho médio (carrega rápido no celular); senão o que tiver
    const full = urls.find((u) => /\/md\/gif|mediumgif/.test(u.p)) || urls.find((u) => /\/gif\/url$/.test(u.p))
      || urls.find((u) => /\/hd\/gif/.test(u.p)) || urls.find(isGif) || urls[0];
    return { url: full.url, preview: (small || full).url, title: String(item.content_description || item.title || '').slice(0, 80) };
  }).filter(Boolean);
}

async function buscaGifs(q) {
  const key = encodeURIComponent(GIF_KEY);
  const tentativas = q
    ? [`${GIF_API}/v2/search?q=${encodeURIComponent(q)}&key=${key}&limit=24&locale=pt_BR&contentfilter=medium`,
       `${GIF_API}/api/v1/${key}/gifs/search?q=${encodeURIComponent(q)}&per_page=24&rating=pg-13`]
    : [`${GIF_API}/v2/featured?key=${key}&limit=24&locale=pt_BR&contentfilter=medium`,
       `${GIF_API}/api/v1/${key}/gifs/trending?per_page=24&rating=pg-13`];
  for (const url of tentativas) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const items = extraiGifs(await r.json());
      if (items.length) return items;
    } catch {}
  }
  return null;
}

app.get('/api/gifs', async (req, res) => {
  const u = await userFromReq(req).catch(() => null);
  if (!u || u.status !== 'approved') return erro(res, 401, 'Entre de novo.');
  if (!GIF_KEY) return erro(res, 503, 'Os GIFs ainda não foram ativados (falta a chave KLIPY no Render).', { semChave: true });
  const q = String(req.query.q || '').trim().slice(0, 60).toLowerCase();
  const hit = gifCache.get(q);
  if (hit && Date.now() - hit.at < 5 * 60_000) return res.json({ ok: true, gifs: hit.items });
  const items = await buscaGifs(q);
  if (!items) return erro(res, 502, 'Não consegui buscar GIFs agora. Tente de novo.');
  gifCache.set(q, { at: Date.now(), items });
  if (gifCache.size > 300) gifCache.delete(gifCache.keys().next().value);
  res.json({ ok: true, gifs: items });
});

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 200_000, cors: { origin: '*' } });

// ---------- Canais ----------
// Canais (salas) ficam guardados no banco: o dono e os moderadores criam, renomeiam e apagam.
// Cada um tem um id fixo (c1, c2, ...) e um nome.
const channels = [];
const MAX_CHANNELS = 30;
function makeChannel(id, name) {
  return {
    id,
    name,
    users: new Map(), // socketId -> { uid, name, muted, modMuted, avatar, proto, cam, role }
    sharers: new Set(), // quem está transmitindo agora (várias pessoas ao mesmo tempo)
    chat: [], // últimas mensagens do chat deste canal
  };
}
async function loadChannels() {
  let list = await banco.listChannels();
  if (!list.length) {
    list = DEFAULT_NAMES.map((name, i) => ({ id: `c${i + 1}`, nome: name }));
    await banco.saveChannels(list);
  }
  channels.length = 0;
  list.forEach((c) => channels.push(makeChannel(c.id, c.nome)));
}
const persistChannels = () => banco.saveChannels(channels.map((c) => ({ id: c.id, nome: c.name }))).catch((e) => console.error('salvar canais:', e.message));
const CHAT_KEEP = 100;
let chatSeq = 0;
// Quando o nome foi trocado pela última vez (0 = nomes padrão)
let namesVersion = 0;

const byId = (id) => channels.find((c) => c.id === id);

// ---------- Fontes de música do DJ ----------
const AUDIUS = 'https://api.audius.co';
const AUDIUS_APP = 'KingLauncher';
const RADIO_HOSTS = ['https://de1.api.radio-browser.info', 'https://nl1.api.radio-browser.info', 'https://at1.api.radio-browser.info', 'https://all.api.radio-browser.info'];
async function fetchJson(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal, headers: { 'User-Agent': 'KingLauncher/1.0 (bot de musica)', Accept: 'application/json', ...(opts.headers || {}) } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}
const audiusStream = (id) => `${AUDIUS}/v1/tracks/${encodeURIComponent(id)}/stream?app_name=${AUDIUS_APP}`;
function audiusItem(t) {
  return {
    kind: 'audius', id: t.id, title: t.title, artist: t.user?.name || '', duration: Number(t.duration) || null,
    art: t.artwork?.['150x150'] || t.artwork?.['480x480'] || '', url: audiusStream(t.id),
  };
}
// Audius: plataforma aberta de música (API grátis). Só o que pode ser tocado.
async function buscaAudius(q) {
  const j = await fetchJson(`${AUDIUS}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=${AUDIUS_APP}&limit=20`);
  return (j.data || []).filter((t) => t.is_streamable !== false && !t.is_stream_gated).slice(0, 20).map(audiusItem);
}
async function audiusTrack(id) {
  const j = await fetchJson(`${AUDIUS}/v1/tracks/${encodeURIComponent(id)}?app_name=${AUDIUS_APP}`);
  return j.data ? audiusItem(j.data) : null;
}
// Radio Browser: catálogo aberto de rádios do mundo. Só rádios com https (o navegador bloqueia http).
async function buscaRadios(q) {
  const params = new URLSearchParams({ limit: '30', hidebroken: 'true', order: 'clickcount', reverse: 'true' });
  if (q) params.set('name', q); else params.set('countrycode', 'BR');
  let lastErr;
  for (const host of RADIO_HOSTS) {
    try {
      const j = await fetchJson(`${host}/json/stations/search?${params}`);
      return j
        .filter((r) => /^https:\/\//i.test(r.url_resolved || r.url) && !r.hls)
        .slice(0, 20)
        .map((r) => ({
          kind: 'radio', id: r.stationuuid, title: r.name, artist: [r.country, r.tags].filter(Boolean).join(' · ').slice(0, 60),
          url: r.url_resolved || r.url, art: /^https:/.test(r.favicon || '') ? r.favicon : '', duration: null, live: true,
        }));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('rádios indisponíveis');
}
async function listaMusicas(q) {
  const all = await banco.listMusic();
  const ql = String(q || '').toLowerCase();
  return all
    .filter((m) => !ql || m.titulo.toLowerCase().includes(ql) || (m.artista || '').toLowerCase().includes(ql))
    .map((m) => ({ kind: 'file', id: m.id, title: m.titulo, artist: m.artista || '', url: `/img/${m.img}`, art: '', duration: m.duracao || null, dono: m.dono }));
}
// ---- YouTube: o DJ usa o player oficial do YouTube em cada aparelho (regras do YouTube:
// o vídeo fica visível; nada é baixado). Aqui só entendemos o link e pegamos título/capa.
function parseYouTube(url) {
  let u;
  try { u = new URL(String(url || '').trim()); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return null;
  const vid = /^[A-Za-z0-9_-]{11}$/;
  const lst = /^[A-Za-z0-9_-]{10,80}$/;
  let video = null;
  let list = u.searchParams.get('list');
  if (host === 'youtu.be') video = u.pathname.slice(1).split('/')[0];
  else if (u.pathname === '/watch') video = u.searchParams.get('v');
  else {
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) video = m[1];
  }
  video = video && vid.test(video) ? video : null;
  list = list && lst.test(list) && !/^RD/.test(list) ? list : null; // "mix" (RD…) não abre fora do YouTube
  let index = Number(u.searchParams.get('index'));
  index = Number.isInteger(index) && index > 0 ? index - 1 : 0;
  if (!video && !list) return null;
  return { video, list, index };
}
async function infoYouTube(video, list) {
  const alvo = list ? `https://www.youtube.com/playlist?list=${list}` : `https://www.youtube.com/watch?v=${video}`;
  const j = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(alvo)}&format=json`);
  return { title: String(j.title || '').slice(0, 100), author: String(j.author_name || '').slice(0, 60), art: /^https:/.test(j.thumbnail_url || '') ? j.thumbnail_url : '' };
}

// Transforma o que o usuário escolheu numa faixa segura para a fila
async function montaFaixa(item, by) {
  let t = null;
  if (item.kind === 'audius' && item.id) t = await audiusTrack(String(item.id).slice(0, 20));
  else if (item.kind === 'radio' && /^https:\/\//i.test(item.url || '')) {
    t = { kind: 'radio', id: String(item.id || '').slice(0, 60), title: String(item.title || 'Rádio').slice(0, 80), artist: String(item.artist || '').slice(0, 60), url: String(item.url).slice(0, 500), art: /^https:/.test(item.art || '') ? String(item.art).slice(0, 500) : '', duration: null, live: true };
  } else if (item.kind === 'file') {
    const m = (await banco.listMusic()).find((x) => x.id === Number(item.id));
    if (m) t = { kind: 'file', id: m.id, title: m.titulo, artist: m.artista || '', url: `/img/${m.img}`, art: '', duration: m.duracao || null };
  } else if (item.kind === 'link' && /^https:\/\/\S+$/i.test(item.url || '')) {
    t = { kind: 'link', id: '', title: String(item.title || item.url).slice(0, 80), artist: '', url: String(item.url).slice(0, 500), art: '', duration: null };
  } else if (item.kind === 'yt') {
    const p = parseYouTube(item.url);
    if (!p) throw new Error('yt-link');
    let info = { title: '', author: '', art: '' };
    try {
      info = await infoYouTube(p.video, p.list);
    } catch (e) {
      // 401/403 = o dono do vídeo não deixa tocar fora do YouTube; 404 = não existe / é particular
      if (!p.list && /HTTP (401|403|404)/.test(e.message)) throw new Error('yt-bloqueado');
      if (p.list && /HTTP (401|403|404)/.test(e.message)) throw new Error('yt-playlist');
    }
    t = {
      kind: 'yt', id: p.video || p.list, title: info.title || (p.list ? 'Playlist do YouTube' : 'Vídeo do YouTube'), artist: info.author,
      url: p.list ? `https://www.youtube.com/playlist?list=${p.list}` : `https://www.youtube.com/watch?v=${p.video}`,
      art: info.art || (p.video ? `https://i.ytimg.com/vi/${p.video}/mqdefault.jpg` : ''), duration: null,
      video: p.video, list: p.list, index: p.list ? p.index : 0, count: p.list ? null : 1, nowTitle: '', nowVideo: p.video || '',
    };
  }
  if (!t) return null;
  return { ...t, key: `t${++djSeq}`, by: String(by || '').slice(0, 24) };
}

// ---------- 🤖 DJ King: o bot de música ----------
// Fica na sala "Bots". Quem está numa chamada puxa ele para lá; o que ele toca cada
// aparelho reproduz sozinho (o som não passa pelo servidor), todos no mesmo ponto.
const BOTS_ROOM = 'bots';
const dj = {
  id: 'bot-dj',
  name: 'DJ King',
  avatar: 'p:robo',
  room: null, // null = sala dos Bots; senão o id do canal
  queue: [], // próximas: { key, kind, url, title, artist, art, duration }
  now: null, // tocando: { ...faixa, startedAt (ms, quando o "0:00" começou), pausedAt (ms | null) }
  timer: null,
};
let djSeq = 0;
function djPublic() {
  return { id: dj.id, name: dj.name, avatar: dj.avatar, room: dj.room };
}
function djState() {
  const { timer, ...rest } = dj;
  return { ...rest, serverNow: Date.now() };
}
function broadcastDj() { io.emit('dj', djState()); }
function djStop() {
  clearTimeout(dj.timer);
  dj.timer = null;
}
// Toca a próxima da fila (ou para, se acabou)
function djNext() {
  djStop();
  const t = dj.queue.shift();
  if (!t) { dj.now = null; broadcastDj(); return; }
  dj.now = { ...t, startedAt: Date.now(), pausedAt: null };
  djArmTimer();
  broadcastDj();
}
// Quando a música deve acabar (se a duração é conhecida), passa para a próxima sozinho
function djArmTimer() {
  djStop();
  const n = dj.now;
  if (!n || n.pausedAt || !n.duration) return;
  const left = n.duration * 1000 - (Date.now() - n.startedAt);
  dj.timer = setTimeout(djNext, Math.max(500, left + 1500));
}
// Playlist do YouTube: passa para o próximo vídeo dela (ou para a próxima da fila, se acabou)
function djAvanca() {
  const n = dj.now;
  if (n && n.kind === 'yt' && n.list && (n.count == null || n.index + 1 < n.count)) {
    n.index += 1;
    n.startedAt = Date.now();
    n.pausedAt = null;
    n.nowTitle = '';
    n.nowVideo = '';
    broadcastDj();
    return;
  }
  djNext();
}
function djPause() {
  const n = dj.now;
  if (!n || n.pausedAt) return;
  n.pausedAt = Date.now();
  djStop();
}
function djResume() {
  const n = dj.now;
  if (!n || !n.pausedAt) return;
  n.startedAt += Date.now() - n.pausedAt;
  n.pausedAt = null;
  djArmTimer();
}

function snapshot() {
  return {
    namesVersion,
    bot: djPublic(),
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      sharers: [...c.sharers],
      sharer: c.sharers.values().next().value || null,
      users: [...c.users.entries()].map(([id, u]) => ({ id, ...u })),
    })),
  };
}

function broadcastChannels() {
  io.emit('channels', snapshot());
}

function leave(socket) {
  const ch = byId(socket.data.channel);
  if (!ch) return;
  ch.users.delete(socket.id);
  if (ch.sharers.delete(socket.id)) {
    socket.to(ch.id).emit('share-stopped', { id: socket.id });
  }
  socket.to(ch.id).emit('peer-left', { id: socket.id });
  socket.leave(ch.id);
  socket.data.channel = null;
  // Sala ficou vazia com o DJ lá dentro? Ele volta sozinho para a sala Bots (e pausa a música).
  if (dj.room === ch.id && ch.users.size === 0) {
    dj.room = null;
    djPause();
    broadcastDj();
  }
  broadcastChannels();
}

// Todos os "aparelhos" conectados de uma conta (pode estar no PC e no celular)
const socketsOf = (uid) => [...io.sockets.sockets.values()].filter((s) => s.data.user?.id === uid);

// Avisa dono/moderadores quantas contas esperam aprovação
async function avisaPendentes() {
  try {
    const n = (await banco.list()).filter((u) => u.status === 'pending').length;
    io.to('mods').emit('pending', { count: n });
  } catch {}
}

// Atualiza nome/foto/cargo de uma conta em todos os lugares onde ela está
function refreshLive(u) {
  socketsOf(u.id).forEach((s) => {
    s.data.user = { ...s.data.user, name: u.name, avatar: u.avatar || '', role: u.role };
    if (RANK[u.role] >= RANK.mod) s.join('mods'); else s.leave('mods');
    s.emit('me', publicUser(u));
    const entry = byId(s.data.channel)?.users.get(s.id);
    if (entry) Object.assign(entry, { name: u.name, avatar: u.avatar || '', role: u.role });
  });
  broadcastChannels();
}

// ---------- Mensagens diretas ----------
const online = (uid) => socketsOf(uid).length > 0;
const pubMsg = (m) => ({ id: m.id, from: m.de, to: m.para, text: m.texto, ts: new Date(m.criado).getTime(), read: !!m.lida });

// Avisa todo mundo quando alguém fica online/offline (para a bolinha verde)
function avisaPresenca(uid) {
  io.emit('presence', { uid, online: online(uid) });
}

// ---------- Amigos ----------
// Situação de cada pessoa para mim: 'friend' | 'incoming' (me pediu) | 'outgoing' (eu pedi)
async function friendMap(uid) {
  const out = {};
  for (const f of await banco.friendsOf(uid)) {
    const other = f.a === uid ? f.b : f.a;
    out[other] = f.status === 'accepted' ? 'friend' : f.de === uid ? 'outgoing' : 'incoming';
  }
  return out;
}
async function enviaAmigos(uid) {
  try {
    const m = await friendMap(uid);
    socketsOf(uid).forEach((s) => s.emit('friends', m));
  } catch {}
}

// Tomate e "chamar atenção": cada botão pode ser usado de novo depois de 5 segundos
const FUN_COOLDOWN = 5_000; // 5 segundos entre um uso e outro
const FUN_KINDS = ['tomato', 'nudge', 'beer', 'smoke'];
const funUsado = new Map(); // "uid|tipo" -> horário

// Tira a conta de todos os lugares (banida ou apagada)
function expulsaConta(uid, by, motivo = 'banida') {
  socketsOf(uid).forEach((s) => {
    s.emit('banned', { by, motivo });
    leave(s);
    setTimeout(() => s.disconnect(true), 300);
  });
}

// ---------- Entrada: só quem tem conta aprovada ----------
io.use(async (socket, next) => {
  try {
    const uid = leToken(socket.handshake.auth?.token);
    if (!uid) return next(new Error('login'));
    const u = await banco.byId(uid);
    if (!u) return next(new Error('login'));
    if (u.status !== 'approved') return next(new Error(u.status)); // 'pending' ou 'banned'
    socket.data.user = { id: u.id, username: u.username, name: u.name, avatar: u.avatar || '', role: u.role };
    next();
  } catch (e) {
    console.error('entrada:', e.message);
    next(new Error('servidor'));
  }
});

io.on('connection', (socket) => {
  socket.data.channel = null;
  const me = () => socket.data.user;
  const isMod = () => RANK[me().role] >= RANK.mod;
  if (isMod()) {
    socket.join('mods');
    avisaPendentes();
  }
  socket.emit('me', { ...me(), status: 'approved' });
  socket.emit('channels', snapshot());
  if (socketsOf(me().id).length === 1) avisaPresenca(me().id);
  banco.unread(me().id).then((u) => socket.emit('dm-unread', u)).catch(() => {});
  friendMap(me().id).then((m) => socket.emit('friends', m)).catch(() => {});

  // Pedir amizade (se a outra pessoa já tinha pedido, vira amizade na hora)
  socket.on('friend-request', async ({ userId } = {}, ack = () => {}) => {
    try {
      const oid = Number(userId);
      const other = oid && oid !== me().id && (await banco.byId(oid));
      if (!other || other.status !== 'approved') return ack({ error: 'Essa pessoa não está disponível.' });
      const f = await banco.getFriend(me().id, oid);
      if (f?.status === 'accepted') return ack({ ok: true, status: 'friend' });
      if (f && f.de === oid) {
        await banco.setFriend(me().id, oid, oid, 'accepted');
        socketsOf(oid).forEach((s) => s.emit('friend-accepted', { id: me().id, name: me().name }));
      } else {
        await banco.setFriend(me().id, oid, me().id, 'pending');
        socketsOf(oid).forEach((s) => s.emit('friend-request', { id: me().id, name: me().name, avatar: me().avatar || '' }));
      }
      await Promise.all([enviaAmigos(me().id), enviaAmigos(oid)]);
      ack({ ok: true });
    } catch (e) {
      console.error('amizade:', e.message);
      ack({ error: 'Erro no servidor.' });
    }
  });

  socket.on('friend-accept', async ({ userId } = {}, ack = () => {}) => {
    try {
      const oid = Number(userId);
      const f = oid && (await banco.getFriend(me().id, oid));
      if (!f || f.de !== oid) return ack({ error: 'Esse pedido não existe mais.' });
      await banco.setFriend(me().id, oid, oid, 'accepted');
      socketsOf(oid).forEach((s) => s.emit('friend-accepted', { id: me().id, name: me().name }));
      await Promise.all([enviaAmigos(me().id), enviaAmigos(oid)]);
      ack({ ok: true });
    } catch (e) {
      ack({ error: 'Erro no servidor.' });
    }
  });

  // Recusar pedido, cancelar pedido ou desfazer amizade
  socket.on('friend-remove', async ({ userId } = {}, ack = () => {}) => {
    try {
      const oid = Number(userId);
      if (!oid) return ack({ error: 'Pessoa inválida.' });
      await banco.removeFriend(me().id, oid);
      await Promise.all([enviaAmigos(me().id), enviaAmigos(oid)]);
      ack({ ok: true });
    } catch (e) {
      ack({ error: 'Erro no servidor.' });
    }
  });

  // 🍅 Tomate / 👊 Chamar atenção — só entre amigos que estão na mesma chamada
  socket.on('fun', async ({ to, kind } = {}, ack = () => {}) => {
    try {
      if (!FUN_KINDS.includes(kind)) return ack({ error: 'Brincadeira desconhecida.' });
      const target = io.sockets.sockets.get(to);
      const ch = byId(socket.data.channel);
      if (!ch || !target || target.data.channel !== ch.id || target.id === socket.id) {
        return ack({ error: 'Vocês precisam estar na mesma chamada.' });
      }
      const f = await banco.getFriend(me().id, target.data.user.id);
      if (f?.status !== 'accepted') return ack({ error: 'Só dá para fazer isso com amigos. Adicione como amigo primeiro!' });
      const k = `${me().id}|${kind}`;
      const falta = (funUsado.get(k) || 0) + FUN_COOLDOWN - Date.now();
      if (falta > 0) return ack({ error: 'Espere um pouco.', wait: Math.ceil(falta / 1000) });
      funUsado.set(k, Date.now());
      target.emit('fun', { kind, from: me().name, fromId: socket.id });
      socket.to(ch.id).except(target.id).emit('fun-shown', { kind, from: me().name, to: target.data.user.name });
      ack({ ok: true, wait: FUN_COOLDOWN / 1000 });
    } catch (e) {
      console.error('brincadeira:', e.message);
      ack({ error: 'Erro no servidor.' });
    }
  });

  // Quanto falta para poder usar de novo (ao abrir o app/site)
  socket.on('fun-cooldown', (_ = {}, ack = () => {}) => {
    const out = {};
    for (const kind of FUN_KINDS) {
      const falta = (funUsado.get(`${me().id}|${kind}`) || 0) + FUN_COOLDOWN - Date.now();
      out[kind] = falta > 0 ? Math.ceil(falta / 1000) : 0;
    }
    ack(out);
  });

  // Lista de pessoas para conversar (contas aprovadas), com não lidas e última mensagem
  socket.on('dm-contacts', async (_ = {}, ack = () => {}) => {
    try {
      const [users, unread, last, fm] = await Promise.all([banco.list(), banco.unread(me().id), banco.lastWith(me().id), friendMap(me().id)]);
      const contacts = users
        .filter((u) => u.status === 'approved' && u.id !== me().id)
        .map((u) => ({
          id: u.id, username: u.username, name: u.name, avatar: u.avatar || '', role: u.role,
          online: online(u.id), unread: unread[u.id] || 0, last: last[u.id] ? pubMsg(last[u.id]) : null,
          friend: fm[u.id] || null,
        }));
      ack({ ok: true, contacts });
    } catch (e) {
      console.error('contatos:', e.message);
      ack({ error: 'Não consegui carregar as conversas.' });
    }
  });

  // Mensagens de uma conversa (e marca como lidas)
  socket.on('dm-history', async ({ with: other, before } = {}, ack = () => {}) => {
    try {
      const oid = Number(other);
      if (!oid) return ack({ error: 'Conversa inválida.' });
      const rows = await banco.history(me().id, oid, 50, Number(before) || null);
      await banco.markRead(me().id, oid);
      socketsOf(oid).forEach((s) => s.emit('dm-read', { by: me().id }));
      ack({ ok: true, messages: rows.map(pubMsg), more: rows.length === 50 });
    } catch (e) {
      console.error('histórico:', e.message);
      ack({ error: 'Não consegui carregar a conversa.' });
    }
  });

  socket.on('dm-read', async ({ with: other } = {}) => {
    try {
      const oid = Number(other);
      if (!oid) return;
      await banco.markRead(me().id, oid);
      socketsOf(oid).forEach((s) => s.emit('dm-read', { by: me().id }));
    } catch {}
  });

  socket.on('dm-send', async ({ to, text } = {}, ack = () => {}) => {
    try {
      const oid = Number(to);
      const t = String(text || '').replace(/\r/g, '').trim().slice(0, 1000);
      if (!t) return ack({ error: 'Mensagem vazia.' });
      const other = oid && (await banco.byId(oid));
      if (!other || other.status !== 'approved') return ack({ error: 'Essa pessoa não pode receber mensagens.' });
      const now = Date.now();
      socket.data.dmTimes = (socket.data.dmTimes || []).filter((x) => now - x < 5000);
      if (socket.data.dmTimes.length >= 8) return ack({ error: 'Calma! Muitas mensagens seguidas.' });
      socket.data.dmTimes.push(now);
      const m = pubMsg(await banco.addMsg({ de: me().id, para: oid, texto: t }));
      const fromInfo = { id: me().id, name: me().name, avatar: me().avatar || '', username: me().username, role: me().role };
      // Para quem recebe e para os outros aparelhos de quem enviou
      socketsOf(oid).forEach((s) => s.emit('dm', { ...m, fromUser: fromInfo }));
      socketsOf(me().id).forEach((s) => { if (s.id !== socket.id) s.emit('dm', { ...m, fromUser: fromInfo }); });
      ack({ ok: true, message: m });
    } catch (e) {
      console.error('mensagem:', e.message);
      ack({ error: 'Não consegui enviar.' });
    }
  });

  // (versões antigas mandavam os nomes guardados no aparelho; agora os canais ficam no banco)
  socket.on('sync-names', () => {});

  socket.on('rename-channel', ({ id, name } = {}, ack = () => {}) => {
    if (!isMod()) return ack({ error: 'Só o dono e os moderadores podem renomear canais.' });
    const ch = byId(id);
    if (!ch) return ack({ error: 'Canal não encontrado.' });
    const novo = cleanName(name, '');
    if (!novo) return ack({ error: 'Digite um nome.' });
    ch.name = novo;
    namesVersion = Date.now();
    ack({ ok: true });
    broadcastChannels();
    persistChannels();
  });

  // ---------- 🤖 DJ King ----------
  socket.emit('dj', djState());
  // Pode mandar no bot: quem está na chamada onde ele está (ou está puxando ele para a sua), e moderadores
  const podeDj = () => isMod() || (socket.data.channel && socket.data.channel === dj.room);

  socket.on('dj-move', ({ to } = {}, ack = () => {}) => {
    if (to === BOTS_ROOM || to == null) {
      if (!podeDj() && dj.room) return ack({ error: 'Só quem está na chamada com o DJ pode devolver ele.' });
      const from = dj.room;
      dj.room = null;
      djPause();
      ack({ ok: true });
      broadcastChannels();
      broadcastDj();
      if (from) io.to(from).emit('dj-info', { text: `🤖 ${me().name} devolveu o DJ King para a sala Bots.` });
      return;
    }
    const ch = byId(to);
    if (!ch) return ack({ error: 'Sala não encontrada.' });
    if (socket.data.channel !== ch.id && !isMod()) return ack({ error: 'Entre na chamada primeiro e puxe o DJ para ela.' });
    const from = dj.room;
    dj.room = ch.id;
    if (dj.now) djResume();
    ack({ ok: true });
    broadcastChannels();
    broadcastDj();
    if (from && from !== ch.id) io.to(from).emit('dj-info', { text: `🤖 ${me().name} levou o DJ King para a sala ${ch.name}.` });
    socket.to(ch.id).emit('dj-info', { text: `🤖 ${me().name} chamou o DJ King para a chamada.` });
  });

  // Procurar música (Audius) ou rádio (Radio Browser)
  socket.on('dj-search', async ({ kind, q } = {}, ack = () => {}) => {
    try {
      const query = String(q || '').trim().slice(0, 80);
      if (kind === 'radio') return ack({ ok: true, items: await buscaRadios(query) });
      if (kind === 'file') return ack({ ok: true, items: await listaMusicas(query) });
      if (!query) return ack({ ok: true, items: [] });
      ack({ ok: true, items: await buscaAudius(query) });
    } catch (e) {
      console.error('dj-search:', e.message);
      ack({ error: 'Não consegui pesquisar agora. Tente de novo.' });
    }
  });

  // Adicionar na fila: { kind: 'audius'|'radio'|'file'|'link', id | url, title, artist, art, duration }
  socket.on('dj-add', async (item = {}, ack = () => {}) => {
    try {
      if (!podeDj()) return ack({ error: 'Puxe o DJ King para a sua chamada primeiro.' });
      if (dj.queue.length >= 50) return ack({ error: 'A fila está cheia (50 músicas).' });
      let t;
      try {
        t = await montaFaixa(item, me().name);
      } catch (e) {
        if (e.message === 'yt-link') return ack({ error: 'Esse não parece um link do YouTube. Cole o link do vídeo ou da playlist.' });
        if (e.message === 'yt-bloqueado') return ack({ error: 'O dono desse vídeo não deixa tocar fora do YouTube (ou ele é particular).' });
        if (e.message === 'yt-playlist') return ack({ error: 'Não achei essa playlist. Ela precisa ser pública ou "não listada".' });
        throw e;
      }
      if (!t) return ack({ error: 'Não consegui adicionar essa música.' });
      dj.queue.push(t);
      ack({ ok: true, position: dj.queue.length });
      if (!dj.now) djNext(); else broadcastDj();
      if (dj.room) io.to(dj.room).emit('dj-info', { text: `🎵 ${me().name} adicionou "${t.title}" na fila.` });
    } catch (e) {
      console.error('dj-add:', e.message);
      ack({ error: 'Não consegui adicionar agora.' });
    }
  });

  socket.on('dj-ctrl', ({ action, key } = {}, ack = () => {}) => {
    if (!podeDj()) return ack({ error: 'Só quem está na chamada com o DJ pode controlar ele.' });
    if (action === 'pause') djPause();
    else if (action === 'play') { if (dj.now) djResume(); else djNext(); }
    else if (action === 'skip') { djAvanca(); ack({ ok: true }); return; } // numa playlist: próximo vídeo
    else if (action === 'skip-all') { djNext(); ack({ ok: true }); return; } // pula a playlist inteira
    else if (action === 'remove') dj.queue = dj.queue.filter((t) => t.key !== key);
    else if (action === 'clear') dj.queue = [];
    else if (action === 'stop') { djStop(); dj.now = null; dj.queue = []; }
    else return ack({ error: 'Comando desconhecido.' });
    ack({ ok: true });
    broadcastDj();
  });

  // Um aparelho avisou que a música acabou (ou não abriu): passa para a próxima
  socket.on('dj-ended', ({ key, index, error: err, last } = {}) => {
    const n = dj.now;
    if (!n || n.key !== key) return;
    if (!socket.data.channel || socket.data.channel !== dj.room) return;
    if (n.kind === 'yt' && n.list) {
      // Vários aparelhos avisam o mesmo fim: só vale o do vídeo atual
      if (Number.isInteger(index) && index !== n.index) return;
      if (err && dj.room) io.to(dj.room).emit('dj-info', { text: '⚠️ Um vídeo da playlist não pode tocar fora do YouTube. Pulando.' });
      if (last) { djNext(); return; }
      djAvanca();
      return;
    }
    if (err && dj.room) io.to(dj.room).emit('dj-info', { text: `⚠️ Não deu para tocar "${n.title}". Pulando.` });
    djNext();
  });

  // O player do YouTube de um aparelho conta o que está tocando (título, posição na playlist, tamanho)
  socket.on('dj-yt-meta', ({ key, index, count, title, author, video } = {}) => {
    const n = dj.now;
    if (!n || n.kind !== 'yt' || n.key !== key) return;
    if (!socket.data.channel || socket.data.channel !== dj.room) return;
    let mudou = false;
    if (Number.isInteger(count) && count > 0 && count !== n.count) { n.count = count; mudou = true; }
    if (index === n.index || !n.list) {
      const t = String(title || '').slice(0, 100);
      const v = String(video || '').slice(0, 11);
      if (t && t !== n.nowTitle) { n.nowTitle = t; mudou = true; }
      if (v && v !== n.nowVideo) { n.nowVideo = v; mudou = true; }
      const a = String(author || '').slice(0, 60);
      if (a && n.list && a !== n.artist) { n.artist = a; mudou = true; }
    }
    if (mudou) broadcastDj();
  });

  // Guardar um MP3 enviado na biblioteca do bot
  socket.on('dj-save', async ({ img, title, artist, duration } = {}, ack = () => {}) => {
    try {
      if (!/^[A-Za-z0-9_-]{16}$/.test(String(img || ''))) return ack({ error: 'Arquivo inválido.' });
      const im = await banco.getImg(img);
      if (!im || !String(im.mime).startsWith('audio/')) return ack({ error: 'Esse arquivo não é uma música.' });
      const m = await banco.addMusic({
        img, titulo: String(title || 'Música').trim().slice(0, 80) || 'Música', artista: String(artist || '').trim().slice(0, 60),
        dono: me().id, duracao: Number(duration) > 0 ? Math.round(Number(duration)) : null,
      });
      ack({ ok: true, music: m });
    } catch (e) {
      console.error('dj-save:', e.message);
      ack({ error: 'Não consegui guardar a música.' });
    }
  });
  socket.on('dj-delete-music', async ({ id } = {}, ack = () => {}) => {
    try {
      const all = await banco.listMusic();
      const m = all.find((x) => x.id === Number(id));
      if (!m) return ack({ error: 'Música não encontrada.' });
      if (m.dono !== me().id && !isMod()) return ack({ error: 'Só quem enviou (ou um moderador) pode apagar.' });
      await banco.removeMusic(m.id);
      ack({ ok: true });
    } catch (e) {
      ack({ error: 'Não consegui apagar.' });
    }
  });

  // Criar uma sala nova
  socket.on('create-channel', ({ name } = {}, ack = () => {}) => {
    if (!isMod()) return ack({ error: 'Só o dono e os moderadores podem criar salas.' });
    const novo = cleanName(name, '');
    if (!novo) return ack({ error: 'Digite um nome para a sala.' });
    if (channels.length >= MAX_CHANNELS) return ack({ error: `Limite de ${MAX_CHANNELS} salas.` });
    if (channels.some((c) => c.name.toLowerCase() === novo.toLowerCase())) return ack({ error: 'Já existe uma sala com esse nome.' });
    const n = channels.reduce((m, c) => Math.max(m, Number(String(c.id).slice(1)) || 0), 0) + 1;
    const ch = makeChannel(`c${n}`, novo);
    channels.push(ch);
    namesVersion = Date.now();
    ack({ ok: true, id: ch.id });
    broadcastChannels();
    persistChannels();
  });

  // Apagar uma sala (quem estiver nela sai da chamada)
  socket.on('delete-channel', ({ id } = {}, ack = () => {}) => {
    if (!isMod()) return ack({ error: 'Só o dono e os moderadores podem apagar salas.' });
    const ch = byId(id);
    if (!ch) return ack({ error: 'Sala não encontrada.' });
    if (channels.length <= 1) return ack({ error: 'Tem que sobrar pelo menos uma sala.' });
    for (const sid of [...ch.users.keys()]) {
      const s = io.sockets.sockets.get(sid);
      if (!s) continue;
      s.emit('kicked', { by: me().name, motivo: 'sala-apagada' });
      leave(s);
    }
    channels.splice(channels.indexOf(ch), 1);
    if (dj.room === ch.id) { dj.room = null; djPause(); broadcastDj(); }
    namesVersion = Date.now();
    ack({ ok: true });
    broadcastChannels();
    persistChannels();
  });

  socket.on('join', ({ channel, proto } = {}, ack = () => {}) => {
    const ch = byId(channel);
    if (!ch) return ack({ error: 'Esse canal não existe.' });
    if (socket.data.channel === ch.id) return ack({ error: 'Você já está nesse canal.' });
    if (ch.users.size >= MAX_PER_CHANNEL) {
      return ack({ error: `Canal cheio (máximo ${MAX_PER_CHANNEL} pessoas).` });
    }

    leave(socket);

    const peers = [...ch.users.entries()].map(([id, u]) => ({ id, ...u }));
    const u = me();
    // Quem foi mutado por um moderador continua mutado se trocar de canal
    const modMuted = !!socket.data.modMuted;
    ch.users.set(socket.id, {
      uid: u.id, name: u.name, avatar: u.avatar, role: u.role,
      muted: modMuted, modMuted, proto: Number(proto) || 1, cam: false, music: false,
    });
    socket.data.channel = ch.id;
    socket.join(ch.id);
    socket.to(ch.id).emit('peer-joined', { id: socket.id, name: u.name });

    ack({
      ok: true,
      selfId: socket.id,
      peers,
      sharers: [...ch.sharers],
      sharer: ch.sharers.values().next().value || null,
      chat: ch.chat,
      modMuted,
    });
    broadcastChannels();
  });

  // Trocar nome/foto (fica salvo na conta)
  socket.on('profile', async ({ name, avatar } = {}, ack = () => {}) => {
    try {
      const u = await banco.update(me().id, { name: cleanName(name, me().name), avatar: cleanAvatar(avatar) });
      if (u) refreshLive(u);
      ack({ ok: true });
    } catch (e) {
      ack({ error: 'Não consegui salvar agora.' });
    }
  });

  socket.on('leave', () => leave(socket));

  // Chat de texto do canal
  socket.on('chat-send', ({ text } = {}, ack = () => {}) => {
    const ch = byId(socket.data.channel);
    const u = ch?.users.get(socket.id);
    if (!u) return ack({ error: 'Entre em um canal para conversar.' });
    const t = String(text || '').replace(/\r/g, '').trim().slice(0, 500);
    if (!t) return ack({ error: 'Mensagem vazia.' });
    const now = Date.now();
    socket.data.chatTimes = (socket.data.chatTimes || []).filter((x) => now - x < 3000);
    if (socket.data.chatTimes.length >= 5) return ack({ error: 'Calma! Muitas mensagens seguidas.' });
    socket.data.chatTimes.push(now);
    const msg = {
      id: ++chatSeq,
      from: socket.id,
      name: u.name,
      avatar: u.avatar && u.avatar.startsWith('p:') ? u.avatar : '',
      text: t,
      ts: now,
    };
    ch.chat.push(msg);
    if (ch.chat.length > CHAT_KEEP) ch.chat.splice(0, ch.chat.length - CHAT_KEEP);
    io.to(ch.id).emit('chat', msg);
    ack({ ok: true });
  });

  // Repassa ofertas/respostas/candidatos WebRTC entre dois participantes do mesmo canal
  socket.on('signal', ({ to, data } = {}) => {
    const ch = socket.data.channel;
    const target = io.sockets.sockets.get(to);
    if (!ch || !target || target.data.channel !== ch) return;
    target.emit('signal', { from: socket.id, data });
  });

  socket.on('mute', ({ muted } = {}) => {
    const u = byId(socket.data.channel)?.users.get(socket.id);
    if (u) {
      // Mutado por moderador: continua aparecendo mutado
      u.muted = !!muted || !!u.modMuted;
      broadcastChannels();
    }
  });

  // Transmissões: várias pessoas podem transmitir ao mesmo tempo
  socket.on('share-start', (_ = {}, ack = () => {}) => {
    const ch = byId(socket.data.channel);
    if (!ch) return ack({ error: 'Entre em um canal primeiro.' });
    if (!ch.sharers.has(socket.id)) {
      ch.sharers.add(socket.id);
      io.to(ch.id).emit('share-started', { id: socket.id });
      broadcastChannels();
    }
    ack({ ok: true });
  });

  socket.on('share-stop', () => {
    const ch = byId(socket.data.channel);
    if (ch && ch.sharers.delete(socket.id)) {
      io.to(ch.id).emit('share-stopped', { id: socket.id });
      broadcastChannels();
    }
  });

  // Câmera ligada/desligada (o vídeo vai direto entre os participantes)
  socket.on('cam', ({ on } = {}) => {
    const u = byId(socket.data.channel)?.users.get(socket.id);
    if (u && u.cam !== !!on) {
      u.cam = !!on;
      broadcastChannels();
    }
  });

  // 🎵 Música: quem está tocando o som de uma aba para a chamada (o som vai direto entre os aparelhos)
  socket.on('music', ({ on } = {}) => {
    const u = byId(socket.data.channel)?.users.get(socket.id);
    if (u && u.music !== !!on) {
      u.music = !!on;
      broadcastChannels();
    }
  });

  // Quem quer assistir (ou parar de assistir) avisa quem está transmitindo.
  socket.on('watch', ({ id, on } = {}) => {
    const ch = byId(socket.data.channel);
    const target = io.sockets.sockets.get(id);
    if (!ch || !target || target.data.channel !== ch.id) return;
    target.emit('watch-request', { from: socket.id, on: !!on });
  });

  // ---------- Moderação dentro da chamada ----------
  // Só age em quem tem cargo menor (moderador não mexe no dono nem em outro moderador)
  socket.on('mod-action', async ({ action, id } = {}, ack = () => {}) => {
    try {
      if (!isMod()) return ack({ error: 'Só o dono e os moderadores podem fazer isso.' });
      const target = io.sockets.sockets.get(id);
      const tu = target?.data.user;
      if (!target || !tu) return ack({ error: 'Essa pessoa não está mais aqui.' });
      if (tu.id === me().id) return ack({ error: 'Você não pode fazer isso com você mesmo.' });
      if (RANK[me().role] <= RANK[tu.role]) {
        return ack({ error: `Você não pode moderar um ${ROLE_NAME[tu.role].toLowerCase()}.` });
      }
      const ch = byId(target.data.channel);
      const entry = ch?.users.get(target.id);
      const by = me().name;

      if (action === 'kick') {
        target.emit('kicked', { by });
        leave(target);
      } else if (action === 'mute' || action === 'unmute') {
        const on = action === 'mute';
        target.data.modMuted = on;
        if (entry) { entry.modMuted = on; if (on) entry.muted = true; }
        target.emit('mod-muted', { on, by });
        broadcastChannels();
      } else if (action === 'stop-share') {
        if (ch && ch.sharers.delete(target.id)) {
          io.to(ch.id).emit('share-stopped', { id: target.id });
          broadcastChannels();
        }
        target.emit('mod-stop-share', { by });
      } else if (action === 'stop-cam') {
        if (entry) entry.cam = false;
        target.emit('mod-stop-cam', { by });
        broadcastChannels();
      } else if (action === 'stop-music') {
        if (entry) entry.music = false;
        target.emit('mod-stop-music', { by });
        broadcastChannels();
      } else if (action === 'ban') {
        await banco.update(tu.id, { status: 'banned' });
        expulsaConta(tu.id, by);
      } else {
        return ack({ error: 'Ação desconhecida.' });
      }
      ack({ ok: true });
    } catch (e) {
      console.error('moderação:', e);
      ack({ error: 'Erro no servidor.' });
    }
  });

  // ---------- Painel de contas (aprovar, banir, cargos) ----------
  socket.on('admin-users', async (_ = {}, ack = () => {}) => {
    if (!isMod()) return ack({ error: 'Sem permissão.' });
    try {
      ack({ ok: true, users: (await banco.list()).map(publicUser) });
    } catch (e) {
      ack({ error: 'Erro no servidor.' });
    }
  });

  socket.on('admin-set', async ({ userId, action } = {}, ack = () => {}) => {
    try {
      if (!isMod()) return ack({ error: 'Sem permissão.' });
      const u = await banco.byId(userId);
      if (!u) return ack({ error: 'Conta não encontrada.' });
      const souDono = me().role === 'owner';
      if (u.id === me().id) return ack({ error: 'Você não pode mudar a sua própria conta aqui.' });
      if (RANK[me().role] <= RANK[u.role]) return ack({ error: 'Você não pode mexer nessa conta.' });

      if (action === 'approve') {
        await banco.update(u.id, { status: 'approved' });
      } else if (action === 'reject') {
        if (u.status !== 'pending') return ack({ error: 'Só dá para recusar contas esperando aprovação.' });
        await banco.remove(u.id);
      } else if (action === 'ban') {
        await banco.update(u.id, { status: 'banned' });
        expulsaConta(u.id, me().name);
      } else if (action === 'reset-pass') {
        // Senha provisória fácil de ditar (ex.: rei4821); a pessoa troca depois
        if (u.status === 'pending') return ack({ error: 'Aprove a conta primeiro.' });
        const letras = 'abcdefghjkmnpqrstuvwxyz';
        const crypto = require('crypto');
        let nova = '';
        for (let i = 0; i < 3; i++) nova += letras[crypto.randomInt(letras.length)];
        nova += String(crypto.randomInt(1000, 10000));
        await banco.update(u.id, { pass: hashSenha(nova) });
        return ack({ ok: true, password: nova });
      } else if (action === 'unban') {
        await banco.update(u.id, { status: 'approved' });
      } else if (action === 'make-mod' || action === 'make-member') {
        if (!souDono) return ack({ error: 'Só o dono pode mudar cargos.' });
        const nu = await banco.update(u.id, { role: action === 'make-mod' ? 'mod' : 'member' });
        refreshLive(nu);
      } else if (action === 'delete') {
        if (!souDono) return ack({ error: 'Só o dono pode apagar contas.' });
        await banco.remove(u.id);
        await banco.removeMsgsOf(u.id);
        expulsaConta(u.id, me().name, 'apagada');
      } else {
        return ack({ error: 'Ação desconhecida.' });
      }
      avisaPendentes();
      ack({ ok: true });
    } catch (e) {
      console.error('painel:', e);
      ack({ error: 'Erro no servidor.' });
    }
  });

  socket.on('disconnect', () => {
    leave(socket);
    if (!online(me().id)) avisaPresenca(me().id);
  });
});

banco.init()
  .then(loadChannels)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Canais: ${channels.map((c) => c.name).join(', ')} | Máx. por canal: ${MAX_PER_CHANNEL}`);
      console.log(`Contas guardadas em: ${tipoBanco}`);
      console.log(process.env.TURN_URL ? `TURN: ${process.env.TURN_URL}` : 'TURN: não configurado (só STUN)');
    });
  })
  .catch((e) => {
    console.error('Não consegui abrir o banco de dados. Confira o DATABASE_URL no Render.', e.message);
    process.exit(1);
  });
