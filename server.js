// Servidor de sinalização: apresenta os participantes uns aos outros.
// Áudio e tela NÃO passam por aqui — vão direto entre os navegadores (WebRTC).

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_PER_CHANNEL = Number(process.env.MAX_PER_CHANNEL || 6);
const CHANNELS = (process.env.CHANNELS || 'Geral,Sala 2,Sala 3')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de STUN/TURN entregue ao navegador
app.get('/config', (req, res) => {
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
const io = new Server(server);

// canal -> { users: Map<socketId, {name, muted}>, sharer: socketId | null }
const rooms = new Map();
CHANNELS.forEach((c) => rooms.set(c, { users: new Map(), sharer: null }));

function snapshot() {
  return CHANNELS.map((name) => {
    const r = rooms.get(name);
    return {
      name,
      sharer: r.sharer,
      users: [...r.users.entries()].map(([id, u]) => ({ id, ...u })),
    };
  });
}

function broadcastChannels() {
  io.emit('channels', snapshot());
}

function leave(socket) {
  const ch = socket.data.channel;
  if (!ch) return;
  const room = rooms.get(ch);
  room.users.delete(socket.id);
  if (room.sharer === socket.id) {
    room.sharer = null;
    socket.to(ch).emit('share-stopped', { id: socket.id });
  }
  socket.to(ch).emit('peer-left', { id: socket.id });
  socket.leave(ch);
  socket.data.channel = null;
  broadcastChannels();
}

io.on('connection', (socket) => {
  socket.data.channel = null;
  socket.emit('channels', snapshot());

  socket.on('join', ({ channel, name } = {}, ack = () => {}) => {
    const room = rooms.get(channel);
    if (!room) return ack({ error: 'Esse canal não existe.' });
    if (socket.data.channel === channel) return ack({ error: 'Você já está nesse canal.' });
    if (room.users.size >= MAX_PER_CHANNEL) {
      return ack({ error: `Canal cheio (máximo ${MAX_PER_CHANNEL} pessoas).` });
    }

    leave(socket);

    const cleanName = String(name || 'Anônimo').trim().slice(0, 24) || 'Anônimo';
    const peers = [...room.users.entries()].map(([id, u]) => ({ id, ...u }));

    room.users.set(socket.id, { name: cleanName, muted: false });
    socket.data.channel = channel;
    socket.join(channel);
    socket.to(channel).emit('peer-joined', { id: socket.id, name: cleanName });

    ack({ ok: true, selfId: socket.id, peers, sharer: room.sharer });
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
    const ch = socket.data.channel;
    if (!ch) return;
    const u = rooms.get(ch).users.get(socket.id);
    if (u) {
      u.muted = !!muted;
      broadcastChannels();
    }
  });

  // Apenas uma transmissão de tela por canal
  socket.on('share-start', (_ = {}, ack = () => {}) => {
    const ch = socket.data.channel;
    if (!ch) return ack({ error: 'Entre em um canal primeiro.' });
    const room = rooms.get(ch);
    if (room.sharer && room.sharer !== socket.id) {
      const who = room.users.get(room.sharer)?.name || 'Alguém';
      return ack({ error: `${who} já está transmitindo a tela.` });
    }
    room.sharer = socket.id;
    io.to(ch).emit('share-started', { id: socket.id });
    ack({ ok: true });
    broadcastChannels();
  });

  socket.on('share-stop', () => {
    const ch = socket.data.channel;
    if (!ch) return;
    const room = rooms.get(ch);
    if (room.sharer === socket.id) {
      room.sharer = null;
      io.to(ch).emit('share-stopped', { id: socket.id });
      broadcastChannels();
    }
  });

  socket.on('disconnect', () => leave(socket));
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Canais: ${CHANNELS.join(', ')} | Máx. por canal: ${MAX_PER_CHANNEL}`);
  console.log(process.env.TURN_URL ? `TURN: ${process.env.TURN_URL}` : 'TURN: não configurado (só STUN)');
});
