// Cliente: WebRTC em malha (cada participante conecta direto com os outros).
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
  screen: svg('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  hang: svg('<path d="M10.7 13.3a16 16 0 0 0 3.4 2.6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L7.9 9.9"/><path d="M22 2 2 22"/>'),
  full: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
};

// ---------- Estado ----------
let config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], maxPerChannel: 6 };
let myName = '';
let selfId = null;
let currentChannel = null;
let channelsState = [];
let localStream = null;   // microfone
let screenStream = null;  // minha tela (quando eu transmito)
let sharerId = null;      // quem está transmitindo no meu canal
let muted = false;
let deafened = false;
let joining = false;

// id -> { pc, polite, makingOffer, ignoreOffer, screenSenders, audioEls, screenStream }
const peers = new Map();
const speaking = new Set();

// ---------- Utilidades ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initial = (n) => (n.trim()[0] || '?').toUpperCase();
function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 55% 45%)`;
}
function nameOf(id) {
  for (const ch of channelsState) {
    const u = ch.users.find((x) => x.id === id);
    if (u) return u.name;
  }
  return 'Alguém';
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

// ---------- Login ----------
if (!window.isSecureContext) $('#secure-warning').hidden = false;
try { $('#name-input').value = localStorage.getItem('voz-nome') || ''; } catch {}
$('#name-input').focus();

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  myName = $('#name-input').value.trim().slice(0, 24) || 'Anônimo';
  try { localStorage.setItem('voz-nome', myName); } catch {}
  try { config = await (await fetch('/config')).json(); } catch {}
  $('#login').hidden = true;
  $('#me-name').textContent = myName;
  const av = $('#me-avatar');
  av.textContent = initial(myName);
  av.style.background = colorFor(myName);
  ensureAudioCtx();
  renderAll();
});

// ---------- Botões ----------
$('#btn-mute').onclick = toggleMute;
$('#btn-deafen').onclick = toggleDeafen;
$('#btn-share').onclick = toggleShare;
$('#btn-leave').onclick = () => leaveChannel();
$('#btn-fullscreen').innerHTML = ICON.full;
$('#btn-fullscreen').onclick = () => {
  const w = $('#screen-wrap');
  if (document.fullscreenElement) document.exitFullscreen();
  else w.requestFullscreen?.();
};
$('#btn-leave .ico').innerHTML = ICON.hang;
$('#btn-share .ico').innerHTML = ICON.screen;
$('.empty-icon').innerHTML = ICON.speaker;

// ---------- Entrar / sair do canal ----------
async function joinChannel(name) {
  if (joining || name === currentChannel || !myName) return;
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

    const res = await emitAck('join', { channel: name, name: myName });
    if (res.error) {
      toast(res.error);
      stopMic();
      return;
    }

    currentChannel = name;
    selfId = res.selfId;
    sharerId = res.sharer;
    if (localStream) watchSpeaking(selfId, localStream);
    socket.emit('mute', { muted: muted || deafened || !localStream });

    res.peers.forEach((p) => createPeer(p.id, true));
    if (sharerId) showScreenWaiting(sharerId);
    renderAll();
  } finally {
    joining = false;
  }
}

function leaveChannel(switching = false) {
  if (!currentChannel) return;
  stopShare();
  [...peers.keys()].forEach(closePeer);
  socket.emit('leave');
  if (!switching) stopMic();
  unwatchSpeaking(selfId);
  currentChannel = null;
  sharerId = null;
  hideScreen();
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
    screenStream: null,
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
      if (sharerId === id) showScreen(stream, id);
      return;
    }
    // Áudio: pode ser o microfone ou o som da tela transmitida
    if (!peer.audioEls.has(stream.id)) {
      const el = new Audio();
      el.autoplay = true;
      el.srcObject = stream;
      el.muted = deafened;
      $('#audio-sink').appendChild(el);
      el.play().catch(() => {});
      peer.audioEls.set(stream.id, el);
      const isScreenAudio = stream.getVideoTracks().length > 0;
      if (!isScreenAudio) watchSpeaking(id, stream);
    }
  };

  return peer;
}

function addLocalTracks(peer) {
  if (peer.tracksAdded) return;
  peer.tracksAdded = true;
  if (localStream) localStream.getTracks().forEach((t) => peer.pc.addTrack(t, localStream));
  if (screenStream) {
    peer.screenSenders = screenStream.getTracks().map((t) => peer.pc.addTrack(t, screenStream));
  }
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
        await pc.setRemoteDescription(d);
      } finally {
        peer.settingRemoteAnswer = false;
      }
      if (d.type === 'offer') {
        addLocalTracks(peer); // reaproveita as faixas da oferta, sem nova negociação
        await pc.setLocalDescription();
        sendSignal(from, { description: pc.localDescription });
      }
      tuneScreenSenders(peer);
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

// Limita a qualidade da tela para não estourar o upload de quem transmite
async function tuneScreenSenders(peer) {
  for (const sender of peer.screenSenders) {
    if (!sender.track || sender.track.kind !== 'video') continue;
    try {
      const p = sender.getParameters();
      if (!p.encodings || !p.encodings.length) continue;
      p.encodings[0].maxBitrate = 2_500_000;
      p.encodings[0].maxFramerate = 30;
      await sender.setParameters(p);
    } catch {}
  }
}

// ---------- Eventos do servidor ----------
socket.on('channels', (data) => {
  channelsState = data;
  renderAll();
});

socket.on('peer-joined', ({ id }) => {
  if (currentChannel) createPeer(id);
});

socket.on('peer-left', ({ id }) => {
  closePeer(id);
  if (sharerId === id) { sharerId = null; hideScreen(); }
});

socket.on('share-started', ({ id }) => {
  if (id === selfId) return;
  sharerId = id;
  const p = peers.get(id);
  if (p?.screenStream && p.screenStream.getVideoTracks().some((t) => t.readyState === 'live')) {
    showScreen(p.screenStream, id);
  } else {
    showScreenWaiting(id);
  }
  renderAll();
});

socket.on('share-stopped', ({ id }) => {
  const p = peers.get(id);
  if (p) {
    p.screenStream = null;
    // remove o áudio da tela que estava tocando
    p.audioEls.forEach((el, sid) => {
      if (el.srcObject?.getVideoTracks().length) { el.srcObject = null; el.remove(); p.audioEls.delete(sid); }
    });
  }
  if (sharerId === id) { sharerId = null; hideScreen(); }
  renderAll();
});

socket.on('disconnect', () => {
  if (currentChannel) {
    toast('Conexão com o servidor perdida.');
    stopShare();
    [...peers.keys()].forEach(closePeer);
    stopMic();
    currentChannel = null;
    sharerId = null;
    hideScreen();
    renderAll();
  }
});

// ---------- Compartilhar tela ----------
async function toggleShare() {
  if (screenStream) return stopShare();
  if (!currentChannel) return;
  if (sharerId && sharerId !== selfId) return toast(`${nameOf(sharerId)} já está transmitindo.`);
  if (!navigator.mediaDevices?.getDisplayMedia) return toast('Seu navegador não permite compartilhar a tela.');

  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 30, max: 30 }, width: { max: 1920 }, height: { max: 1080 } },
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
  if (vt && 'contentHint' in vt) vt.contentHint = 'detail';
  if (vt) vt.onended = () => stopShare(); // botão "Parar compartilhamento" do navegador

  peers.forEach((peer) => {
    // quem ainda não negociou recebe a tela automaticamente ao negociar
    if (peer.tracksAdded) peer.screenSenders = stream.getTracks().map((t) => peer.pc.addTrack(t, stream));
  });

  sharerId = selfId;
  showScreen(stream, selfId);
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
  if (sharerId === selfId) { sharerId = null; hideScreen(); }
  renderAll();
}

function showScreen(stream, id) {
  const v = $('#screen-video');
  if (v.srcObject !== stream) v.srcObject = stream;
  v.play().catch(() => {});
  $('#screen-waiting').hidden = true;
  $('#screen-owner').textContent = id === selfId ? 'Você está transmitindo' : `Tela de ${nameOf(id)}`;
  $('#screen-wrap').hidden = false;
  $('#stage').classList.add('sharing');
}

function showScreenWaiting(id) {
  $('#screen-video').srcObject = null;
  $('#screen-waiting').hidden = false;
  $('#screen-owner').textContent = `Tela de ${nameOf(id)}`;
  $('#screen-wrap').hidden = false;
  $('#stage').classList.add('sharing');
}

function hideScreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  $('#screen-video').srcObject = null;
  $('#screen-wrap').hidden = true;
  $('#stage').classList.remove('sharing');
}

// ---------- Mute / ensurdecer ----------
function applyMicState() {
  if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = !(muted || deafened); });
}

function toggleMute() {
  if (deafened) { deafened = false; muted = false; }
  else muted = !muted;
  applyMicState();
  applyDeafen();
  if (currentChannel) socket.emit('mute', { muted: muted || deafened || !localStream });
  renderControls();
}

function toggleDeafen() {
  deafened = !deafened;
  applyMicState();
  applyDeafen();
  if (currentChannel) socket.emit('mute', { muted: muted || deafened || !localStream });
  renderControls();
}

function applyDeafen() {
  peers.forEach((p) => p.audioEls.forEach((el) => { el.muted = deafened; }));
}

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
    el.className = 'channel' + (ch.name === currentChannel ? ' active' : '');
    el.innerHTML = `<button class="channel-btn">${ICON.speaker}<span>${esc(ch.name)}</span><small>${ch.users.length}/${config.maxPerChannel}</small></button>`;
    el.querySelector('button').onclick = () => joinChannel(ch.name);

    const ul = document.createElement('ul');
    ch.users.forEach((u) => {
      const li = document.createElement('li');
      li.className = 'member' + (speaking.has(u.id) ? ' speaking' : '');
      li.dataset.uid = u.id;
      li.innerHTML = `
        <span class="avatar" style="background:${colorFor(u.name)}">${esc(initial(u.name))}</span>
        <span class="mname">${esc(u.name)}${u.id === selfId ? ' (você)' : ''}</span>
        ${ch.sharer === u.id ? '<span class="live">AO VIVO</span>' : ''}
        ${u.muted ? `<span class="muted-ico">${ICON.micOff}</span>` : ''}`;
      ul.appendChild(li);
    });
    el.appendChild(ul);
    wrap.appendChild(el);
  });
}

function renderMain() {
  const ch = channelsState.find((c) => c.name === currentChannel);
  $('#main-title').textContent = ch ? ch.name : 'Escolha um canal de voz';
  $('#empty').hidden = !!ch;
  $('#callbar').hidden = !ch;

  const tiles = $('#tiles');
  tiles.innerHTML = '';
  if (!ch) return;
  ch.users.forEach((u) => {
    const t = document.createElement('div');
    t.className = 'tile' + (speaking.has(u.id) ? ' speaking' : '');
    t.dataset.uid = u.id;
    t.innerHTML = `
      <span class="avatar" style="background:${colorFor(u.name)}">${esc(initial(u.name))}</span>
      <span class="tname">${u.muted ? ICON.micOff : ''}${esc(u.name)}${u.id === selfId ? ' (você)' : ''}</span>
      ${ch.sharer === u.id ? '<span class="live">AO VIVO</span>' : ''}`;
    tiles.appendChild(t);
  });
}

function renderControls() {
  const bm = $('#btn-mute');
  bm.innerHTML = muted || deafened ? ICON.micOff : ICON.mic;
  bm.classList.toggle('off', muted || deafened);
  bm.title = muted || deafened ? 'Desmutar' : 'Mutar microfone';

  const bd = $('#btn-deafen');
  bd.innerHTML = deafened ? ICON.headOff : ICON.head;
  bd.classList.toggle('off', deafened);
  bd.title = deafened ? 'Voltar a ouvir' : 'Ensurdecer';

  const st = $('#me-status');
  st.textContent = currentChannel ? `Em ${currentChannel}` : 'Desconectado';
  st.classList.toggle('on', !!currentChannel);

  const bs = $('#btn-share');
  const someoneElse = sharerId && sharerId !== selfId;
  bs.disabled = !!someoneElse || !navigator.mediaDevices?.getDisplayMedia;
  bs.classList.toggle('active', !!screenStream);
  bs.querySelector('.label').textContent = screenStream ? 'Parar transmissão' : 'Compartilhar tela';
  bs.title = someoneElse ? `${nameOf(sharerId)} já está transmitindo` : '';

  if (sharerId && sharerId !== selfId && !$('#screen-wrap').hidden) {
    $('#screen-owner').textContent = `Tela de ${nameOf(sharerId)}`;
  }
}
