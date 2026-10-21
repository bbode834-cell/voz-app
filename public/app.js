// King Launcher — cliente
// WebRTC em malha (cada participante conecta direto com os outros).
// Ideal para grupos pequenos (até 6) com uma transmissão de tela por vez.

const $ = (s) => document.querySelector(s);
const socket = io();

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
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  pencil: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
};

// ---------- Armazenamento local (fica salvo neste navegador) ----------
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---------- Estado ----------
let config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], maxPerChannel: 6 };
let myName = store.get('voz-nome', '');
let myAvatar = store.get('voz-avatar', '');
let loggedIn = false;
let selfId = null;
let currentChannel = null; // id do canal (c1, c2...)
let channelsState = [];
let localStream = null;   // microfone
let screenStream = null;  // minha tela (quando eu transmito)
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
const SONS = ['entrou', 'saiu', 'mic-on', 'mic-off', 'fone-on', 'fone-off', 'transmissao'];
const soundBuffers = {};
let soundsLoaded = false;

async function loadSounds() {
  if (soundsLoaded || !audioCtx) return;
  soundsLoaded = true;
  await Promise.all(SONS.map(async (n) => {
    try {
      const r = await fetch(`sons/${n}.wav`);
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

// ---------- Perfil (nome + avatar) ----------
if (!window.isSecureContext) $('#secure-warning').hidden = false;
let draftAvatar = myAvatar;

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

function openProfile() {
  draftAvatar = myAvatar;
  $('#name-input').value = myName;
  $('#profile-title').textContent = loggedIn ? 'Editar perfil' : 'Bem-vindo';
  renderAvatarGrid();
  updatePreview();
  $('#profile').hidden = false;
  setTimeout(() => $('#name-input').focus(), 50);
}

$('#name-input').addEventListener('input', updatePreview);
$('#btn-upload').onclick = () => $('#file-input').click();
$('#file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    draftAvatar = await shrinkImage(file, 96);
    renderAvatarGrid();
    updatePreview();
  } catch {
    toast('Não consegui abrir essa imagem.');
  }
});

// Reduz a foto para um quadradinho de 96px (fica leve para mandar aos amigos)
function shrinkImage(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const s = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      let q = 0.85, out = c.toDataURL('image/jpeg', q);
      while (out.length > 38000 && q > 0.3) { q -= 0.15; out = c.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}

$('#profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  myName = $('#name-input').value.trim().slice(0, 24) || 'Anônimo';
  myAvatar = draftAvatar;
  store.set('voz-nome', myName);
  store.set('voz-avatar', myAvatar);
  $('#profile').hidden = true;
  if (!loggedIn) {
    loggedIn = true;
    try { config = await (await fetch('/config')).json(); } catch {}
  }
  ensureAudioCtx();
  loadSounds();
  if (currentChannel) socket.emit('profile', { name: myName, avatar: myAvatar });
  renderAll();
});

$('#btn-profile').onclick = openProfile;
loadAvatarList();
openProfile();

// ---------- Botões ----------
$('#btn-mute').onclick = toggleMute;
$('#btn-deafen').onclick = toggleDeafen;
$('#btn-share').onclick = toggleShare;
$('#btn-leave').onclick = () => leaveChannel();
$('#btn-leave .ico').innerHTML = ICON.hang;
$('#btn-share .ico').innerHTML = ICON.screen;


// ---------- Nomes dos canais ----------
// O servidor grátis "dorme" e volta com os nomes padrão; quem lembra dos
// nomes novos manda de volta para ele assim que conecta.
socket.on('connect', () => {
  const saved = store.get('voz-canais', null);
  if (saved?.version) socket.emit('sync-names', saved);
});

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

    const res = await emitAck('join', { channel: id, name: myName, avatar: myAvatar, proto: 2 });
    if (res.error) {
      toast(res.error);
      stopMic();
      return;
    }

    currentChannel = id;
    selfId = res.selfId;
    watching.clear();
    if (localStream) watchSpeaking(selfId, localStream);
    socket.emit('mute', { muted: muted || deafened || !localStream });

    res.peers.forEach((p) => createPeer(p.id, true));
    soundJoin();
    renderAll();
    // Já tem gente transmitindo: começa assistindo a primeira
    const already = res.sharers || (res.sharer ? [res.sharer] : []);
    const other = already.filter((x) => x !== selfId);
    if (other.length) watch(other[0]);
  } finally {
    joining = false;
  }
}

function leaveChannel(switching = false) {
  if (!currentChannel) return;
  stopShare();
  [...peers.keys()].forEach(closePeer);
  socket.emit('leave');
  if (!switching) { stopMic(); soundLeave(); }
  unwatchSpeaking(selfId);
  currentChannel = null;
  watching.clear();
  renderScreens();
  closeVolume();
  renderAll();
}

function stopMic() {
  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  localStream = null;
}

// ---------- WebRTC (negociação "perfeita") ----------
// Quem acabou de entrar (initiator) faz a primeira oferta; quem já estava
// no canal só adiciona seu áudio/tela ao responder. Isso evita "colisão"
// de ofertas, que às vezes deixava uma conexão travada.
function createPeer(id, initiator = false) {
  if (peers.has(id)) return peers.get(id);
  const pc = new RTCPeerConnection({ iceServers: config.iceServers });
  const peer = {
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
    if (pc.connectionState === 'connected') tuneScreenSenders(peer);
  };

  pc.ontrack = ({ track, streams }) => {
    const stream = streams[0] || new MediaStream([track]);
    if (track.kind === 'video') {
      peer.screenStream = stream;
      // Chegou vídeo de quem está transmitindo: mostra (o app 1.0.2 envia sem pedirmos)
      if (isSharing(id) && !watching.has(id)) watching.add(id);
      renderScreens();
      return;
    }
    // Áudio: pode ser o microfone ou o som da tela transmitida
    if (!peer.audioEls.has(stream.id)) {
      const el = new Audio();
      el.autoplay = true;
      el.srcObject = stream;
      el.dataset.kind = stream.getVideoTracks().length > 0 ? 'screen' : 'mic';
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
  if (localStream) localStream.getTracks().forEach((t) => peer.pc.addTrack(t, localStream));
  if (screenStream && shouldSendTo(peer.id)) {
    peer.screenSenders = addScreenTracks(peer.pc, screenStream);
  }
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
  peers.delete(id);
  unwatchSpeaking(id);
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
  const saved = store.get('voz-canais', null);
  if (data.namesVersion > 0 && (!saved || data.namesVersion >= saved.version)) {
    store.set('voz-canais', {
      version: data.namesVersion,
      names: data.channels.map((c) => ({ id: c.id, name: c.name })),
    });
  }
  // Para de mostrar quem parou de transmitir ou saiu
  [...watching].forEach((id) => { if (!isSharing(id)) watching.delete(id); });
  syncScreenSenders();
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
  toast(`${nameOf(id)} começou a transmitir a tela.`);
  playSound('transmissao');
  renderAll();
  // Se não estou vendo nada, já abro essa
  if (watching.size === 0) watch(id);
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

socket.on('disconnect', () => {
  if (currentChannel) {
    toast('Conexão com o servidor perdida.');
    stopShare();
    [...peers.keys()].forEach(closePeer);
    stopMic();
    currentChannel = null;
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
        </div>`;
      el.querySelector('.fs').onclick = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else el.requestFullscreen?.();
      };
      el.querySelector('.close').onclick = () => (mine ? stopShare() : unwatch(id));
      const lat = el.querySelector('.lat');
      if (lat) { lat.onclick = toggleLatency; updateLatencyButton(el); }
      const range = el.querySelector('.screen-vol input');
      if (range) {
        range.value = Math.round(screenVolumeOf(nameOf(id)) * 100);
        range.addEventListener('input', (e) => {
          const name = nameOf(id);
          const v = e.target.value / 100;
          if (v === 1) delete screenVolumes[name]; else screenVolumes[name] = v;
          store.set('voz-volume-telas', screenVolumes);
          el.querySelector('.screen-vol .ico').innerHTML = v > 0 ? ICON.speaker : ICON.speakerOff;
          applyVolumes();
        });
      }
      screenCards.set(id, el);
      box.appendChild(el);
    }
    const stream = mine ? screenStream : peers.get(id)?.screenStream;
    const live = !!stream && stream.getVideoTracks().some((t) => t.readyState === 'live');
    const v = el.querySelector('video');
    if (live && v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); }
    if (!live && v.srcObject) v.srcObject = null;
    el.querySelector('.screen-waiting').hidden = live;
    el.querySelector('.owner').textContent = mine ? 'Sua tela' : `Tela de ${nameOf(id)}`;
  });

  applyLatencyMode();
  box.dataset.count = String(list.length);
  box.hidden = list.length === 0;
  $('#stage').classList.toggle('sharing', list.length > 0);
  // Marca d'água some quando tem transmissão na tela (não atrapalha a imagem)
  document.body.classList.toggle('has-stream', list.length > 0);
}

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
      const recv = peer?.pc.getReceivers().find((r) => r.track?.kind === 'video' && r.track.readyState === 'live');
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
  peers.forEach((p, id) => {
    const v = volumeOf(nameOf(id));
    p.audioEls.forEach((el) => {
      el.muted = deafened;
      el.volume = el.dataset.kind === 'screen' ? screenVolumeOf(nameOf(id)) : v;
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
        <button class="rename-btn" title="Trocar nome do canal">${ICON.pencil}</button>
      </div>`;
    el.querySelector('.channel-btn').onclick = () => joinChannel(ch.id);
    el.querySelector('.rename-btn').onclick = () => renameChannel(ch);

    const ul = document.createElement('ul');
    ch.users.forEach((u) => {
      const li = document.createElement('li');
      li.className = 'member' + (speaking.has(u.id) ? ' speaking' : '');
      li.dataset.uid = u.id;
      li.innerHTML = `
        ${avatarHTML(u)}
        <span class="mname">${esc(u.name)}${u.id === selfId ? ' (você)' : ''}</span>
        ${(ch.sharers || [ch.sharer]).includes(u.id) ? '<span class="live">AO VIVO</span>' : ''}
        ${u.muted ? `<span class="muted-ico">${ICON.micOff}</span>` : ''}`;
      ul.appendChild(li);
    });
    el.appendChild(ul);
    wrap.appendChild(el);
  });
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
    t.className = 'tile' + (speaking.has(u.id) ? ' speaking' : '') + (isMe ? '' : ' clickable');
    t.dataset.uid = u.id;
    t.innerHTML = `
      ${avatarHTML(u)}
      <span class="tname">${u.muted ? ICON.micOff : ''}${esc(u.name)}${isMe ? ' (você)' : ''}</span>
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
    tiles.appendChild(t);
  });
}

function renderControls() {
  const me = $('#me-avatar');
  fillAvatar(me, myName, myAvatar);
  $('#me-name').textContent = myName;

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
}
