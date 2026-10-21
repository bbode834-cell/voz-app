// Servidor de sinalização: apresenta os participantes uns aos outros.
// Áudio e tela NÃO passam por aqui — vão direto entre os navegadores (WebRTC).

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_PER_CHANNEL = Number(process.env.MAX_PER_CHANNEL || 15);
const DEFAULT_NAMES = (process.env.CHANNELS || 'Geral,Sala 2,Sala 3')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de STUN/TURN entregue ao navegador
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
  res.json({ iceServers, maxPerChannel: MAX_PER_CHANNEL });
});

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 200_000 });

// Canais têm um id fixo (c1, c2, ...) e um nome que pode ser trocado
const channels = DEFAULT_NAMES.map((name, i) => ({
  id: `c${i + 1}`,
  name,
  users: new Map(), // socketId -> { name, muted, avatar, proto }
  sharers: new Set(), // quem está transmitindo agora (várias pessoas ao mesmo tempo)
}));
// Quando o nome foi trocado pela última vez (0 = nomes padrão)
let namesVersion = 0;

const byId = (id) => channels.find((c) => c.id === id);

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

function snapshot() {
  return {
    namesVersion,
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      sharers: [...c.sharers],
      // "sharer" = a primeira transmissão (para a versão 1.0.2 do app)
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
  broadcastChannels();
}

io.on('connection', (socket) => {
  socket.data.channel = null;
  socket.emit('channels', snapshot());

  // Depois que o servidor "dorme", ele volta com os nomes padrão.
  // Quem já conhecia os nomes novos devolve eles aqui.
  socket.on('sync-names', ({ version, names } = {}) => {
    const v = Number(version) || 0;
    if (v <= namesVersion || !Array.isArray(names)) return;
    let changed = false;
    names.forEach((n) => {
      const ch = byId(n?.id);
      if (ch) { ch.name = cleanName(n.name, ch.name); changed = true; }
    });
    if (changed) {
      namesVersion = v;
      broadcastChannels();
    }
  });

  socket.on('rename-channel', ({ id, name } = {}, ack = () => {}) => {
    const ch = byId(id);
    if (!ch) return ack({ error: 'Canal não encontrado.' });
    const novo = cleanName(name, '');
    if (!novo) return ack({ error: 'Digite um nome.' });
    ch.name = novo;
    namesVersion = Date.now();
    ack({ ok: true });
    broadcastChannels();
  });

  socket.on('join', ({ channel, name, avatar, proto } = {}, ack = () => {}) => {
    const ch = byId(channel);
    if (!ch) return ack({ error: 'Esse canal não existe.' });
    if (socket.data.channel === ch.id) return ack({ error: 'Você já está nesse canal.' });
    if (ch.users.size >= MAX_PER_CHANNEL) {
      return ack({ error: `Canal cheio (máximo ${MAX_PER_CHANNEL} pessoas).` });
    }

    leave(socket);

    const nome = cleanName(name, 'Anônimo');
    const peers = [...ch.users.entries()].map(([id, u]) => ({ id, ...u }));

    // proto 2 = versão que escolhe qual transmissão assistir
    ch.users.set(socket.id, { name: nome, muted: false, avatar: cleanAvatar(avatar), proto: Number(proto) || 1 });
    socket.data.channel = ch.id;
    socket.join(ch.id);
    socket.to(ch.id).emit('peer-joined', { id: socket.id, name: nome });

    ack({
      ok: true,
      selfId: socket.id,
      peers,
      sharers: [...ch.sharers],
      sharer: ch.sharers.values().next().value || null,
    });
    broadcastChannels();
  });

  // Trocar nome/foto sem sair do canal
  socket.on('profile', ({ name, avatar } = {}) => {
    const ch = byId(socket.data.channel);
    const u = ch?.users.get(socket.id);
    if (!u) return;
    u.name = cleanName(name, u.name);
    u.avatar = cleanAvatar(avatar);
    broadcastChannels();
  });

  socket.on('leave', () => leave(socket));

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
      u.muted = !!muted;
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

  // Quem quer assistir (ou parar de assistir) avisa quem está transmitindo.
  // Assim cada pessoa só envia o vídeo para quem está assistindo.
  socket.on('watch', ({ id, on } = {}) => {
    const ch = byId(socket.data.channel);
    const target = io.sockets.sockets.get(id);
    if (!ch || !target || target.data.channel !== ch.id) return;
    target.emit('watch-request', { from: socket.id, on: !!on });
  });

  socket.on('disconnect', () => leave(socket));
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Canais: ${DEFAULT_NAMES.join(', ')} | Máx. por canal: ${MAX_PER_CHANNEL}`);
  console.log(process.env.TURN_URL ? `TURN: ${process.env.TURN_URL}` : 'TURN: não configurado (só STUN)');
});
