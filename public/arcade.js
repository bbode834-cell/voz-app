// 🕹️ Arcade King — tela do jogo (roda no site, dentro do painel, e no app, dentro do WebView).
// O servidor manda o estado; aqui só desenhamos e enviamos as jogadas.
const qs = new URLSearchParams(location.search);
const token = qs.get('token') || '';
const uid = Number(qs.get('uid') || 0);
const $ = (s) => document.querySelector(s);
const toastEl = $('#toast');
let toastT = null;
function toast(m) { toastEl.textContent = m; toastEl.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.style.opacity = 0), 2500); }

const socket = io(location.origin, { auth: { token }, transports: ['websocket'] });
const emitAck = (ev, data = {}) => new Promise((ok) => { const t = setTimeout(() => ok({ error: 'Sem resposta do servidor.' }), 10000); socket.emit(ev, data, (r) => { clearTimeout(t); ok(r || {}); }); });

let A = null; // estado do arcade
let live = null; // posições durante o movimento [[id,x,y],...]
let W = 800, H = 400, R = 11, PR = 19;
const PAD = 40; // borda da mesa (madeira)
const cv = $('#c');
const ctx = cv.getContext('2d');
const COR = { 1: '#f5c400', 2: '#1e5bd6', 3: '#e0282a', 4: '#6a2aa8', 5: '#f07a1a', 6: '#1b8f3a', 7: '#7a1d1d', 8: '#111' };
const corDe = (id) => COR[id > 8 ? id - 8 : id] || '#fff';

socket.on('connect', () => socket.emit('arcade-hello'));
socket.on('connect_error', (e) => toast('Não consegui entrar: ' + (e.message || e)));
socket.on('arcade', (st) => {
  A = st;
  W = st.W; H = st.H; R = st.R; PR = st.POCKET_R;
  if (st.state?.phase !== 'moving') live = null;
  renderTop();
  if (st.game === 'sinuca') fit();
});
socket.on('arcade-balls', (b) => { live = b; draw(); });
socket.on('dj-info', ({ text }) => { if (/Arcade|🕹️/.test(text || '')) toast(text); });

const meuSeat = () => (A?.seats || []).findIndex((s) => s && s.uid === uid);
const minhaVez = () => A?.state && A.game === 'sinuca' && meuSeat() >= 0 && A.state.turn === meuSeat() && A.state.phase === 'aim';

function renderTop() {
  const semJogo = !A || !A.game;
  $('#pick').classList.toggle('hide', !semJogo);
  if (semJogo) return;
  const st = A.state;
  const sinuca = A.game === 'sinuca';
  $('#stage').classList.toggle('hide', !sinuca);
  $('#domino').classList.toggle('hide', A.game !== 'domino');
  $('#cartas').classList.toggle('hide', A.game !== 'cartas');
  $('#luta').classList.toggle('hide', A.game !== 'luta');
  const box = $('#seats');
  box.innerHTML = '';
  A.seats.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'seat' + (sinuca ? ' t' + (i % 2) : '');
    const naVez = st && s && st.phase !== 'over' && st.turn === i && (st.ordem || []).includes(i);
    if (naVez) el.classList.add('turn');
    let extra = '';
    if (sinuca && st) { const g = st.groups?.[i % 2]; extra = `<span class="dot ${g || ''}"></span>`; }
    if ((A.game === 'domino' || A.game === 'cartas') && st && s) extra = `<span class="vs">${st.counts?.[i] ?? ''}${A.game === 'cartas' ? '🃏' : '🁣'}${A.game === 'cartas' && st.uno?.[i] ? ' <b style="color:var(--accent)">UNO</b>' : ''}</span>`;
    if (A.game === 'luta' && st && s && st.wins && st.ordem.includes(i)) extra = `<span class="vs">${'★'.repeat(st.wins[st.ordem.indexOf(i)] || 0)}</span>`;
    el.innerHTML = `${extra}<b>${s ? esc(s.name) : (A.started && st && st.phase !== 'over' ? '—' : 'vazio')}</b>`;
    if (!s && !(A.started && st && st.phase !== 'over')) el.style.opacity = .5;
    if (s || i < 2 || A.seats.slice(0, i).every(Boolean)) box.appendChild(el);
  });
  const eu = meuSeat();
  const rolando = st && st.phase !== 'over';
  const n = A.seats.filter(Boolean).length;
  $('#sit').classList.toggle('hide', eu >= 0 || rolando || n >= 4);
  $('#start').classList.toggle('hide', !(eu >= 0 && !rolando && n >= 2));
  $('#stand').classList.toggle('hide', eu < 0);
  $('#reset').classList.toggle('hide', !(st && st.phase === 'over' && n >= 2));
  let msg = st?.msg || '';
  if (!rolando && !(st && st.phase === 'over')) msg = n < 2 ? `Toque em "Jogar" para sentar (${n}/4). Com 2 ou mais, alguém aperta Começar.` : `${n} na mesa. Quem está sentado pode apertar Começar.`;
  else if (sinuca && st && st.phase === 'aim' && minhaVez()) msg = (st.inHand ? 'Bola na mão: toque na mesa para colocar a branca. ' : '') + 'Sua vez: arraste a partir da branca e solte.';
  $('#msg').textContent = msg;
  if (A.game === 'domino') renderDomino();
  if (A.game === 'cartas') renderCartas();
  if (A.game === 'luta') renderLuta();
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

$('#pick-sinuca').onclick = async () => { const r = await emitAck('arcade-game', { game: 'sinuca' }); if (r.error) toast(r.error); };
$('#pick-domino').onclick = async () => { const r = await emitAck('arcade-game', { game: 'domino' }); if (r.error) toast(r.error); };
$('#pick-cartas').onclick = async () => { const r = await emitAck('arcade-game', { game: 'cartas' }); if (r.error) toast(r.error); };
$('#pick-luta').onclick = async () => { const r = await emitAck('arcade-game', { game: 'luta' }); if (r.error) toast(r.error); };
$('#sit').onclick = async () => { const r = await emitAck('arcade-sit'); if (r.error) toast(r.error); };
$('#start').onclick = async () => { const r = await emitAck('arcade-start'); if (r.error) toast(r.error); };
$('#stand').onclick = async () => { const r = await emitAck('arcade-stand'); if (r.error) toast(r.error); };
$('#reset').onclick = async () => { const r = await emitAck('arcade-reset'); if (r.error) toast(r.error); };
$('#trocar').onclick = async () => {
  if (A?.state && A.state.phase !== 'over' && !confirm('Trocar de jogo encerra a partida atual. Trocar?')) return;
  const r = await emitAck('arcade-game', { game: null }); // volta para a escolha
  if (r.error) toast(r.error);
};

// ---- 🥊 luta ----
const LW = 800, LH = 400, CHAO = 330;
let lframe = null; // último quadro vindo do servidor
let lprev = null;
let lframeAt = 0;
socket.on('arcade-luta', (f) => { lprev = lframe; lframe = f; lframeAt = performance.now(); });
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
const lc = $('#lc');
const lctx = lc.getContext('2d');
lc.tabIndex = 0;
lc.addEventListener('pointerdown', () => lc.focus());
function renderLuta() {
  const st = A?.state;
  const sel = st && st.phase === 'select';
  $('#luta-select').classList.toggle('hide', !sel);
  $('#luta-stage').classList.toggle('hide', !st || sel);
  if (!st) return;
  if (st.phase !== 'select' && !lframe && st.frame) lframe = st.frame;
  if (sel) {
    const L = A.luta?.lutadores || {}, AR = A.luta?.arenas || {};
    const eu = meuSeat();
    const souJogador = st.ordem.includes(eu);
    const rival = st.ordem.find((c) => c !== eu);
    $('#fighters').innerHTML = Object.entries(L).map(([k, d]) => `<div class="fcard ${st.pick[eu] === k ? 'sel' : ''} ${rival != null && st.pick[rival] === k ? 'rival' : ''}" data-f="${k}">
        <div class="ava" style="background:radial-gradient(circle at 35% 35%, ${d.cor2}, ${d.cor})"></div><b>${d.nome}</b>${d.desc}
        <small>✨ ${d.especial.nome} (${d.especial.custo}): ${d.especial.desc}</small><small>💥 ${d.ultra.nome}: ${d.ultra.desc}</small></div>`).join('');
    $('#arenas').innerHTML = Object.entries(AR).map(([k, n]) => `<div class="acard ${st.arena === k ? 'sel' : ''}" data-a="${k}">${n}</div>`).join('');
    const nomes = st.ordem.map((c) => `${esc(A.seats[c]?.name || '?')}: ${st.pick[c] ? L[st.pick[c]].nome : '…'}${st.ready[c] ? ' ✓' : ''}`).join(' · ');
    $('#luta-status').textContent = (st.ordem.length < 2 ? 'Esperando o segundo lutador sentar. ' : '') + nomes + (st.arena ? ` · Arena: ${AR[st.arena]}` : ' · Arena: sorteio');
    $('#luta-ready').classList.toggle('hide', !souJogador);
    $('#luta-ready').textContent = st.ready[eu] ? 'Cancelar pronto' : 'Pronto!';
  }
}
$('#fighters').addEventListener('click', async (e) => { const c = e.target.closest('[data-f]'); if (!c) return; const r = await emitAck('arcade-luta', { action: 'pick', pick: c.dataset.f }); if (r.error) toast(r.error); });
$('#arenas').addEventListener('click', async (e) => { const c = e.target.closest('[data-a]'); if (!c) return; const r = await emitAck('arcade-luta', { action: 'arena', arena: c.dataset.a }); if (r.error) toast(r.error); });
$('#luta-ready').onclick = async () => { const r = await emitAck('arcade-luta', { action: 'ready' }); if (r.error) toast(r.error); };

// controles
const KEYS = { a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r', w: 'u', arrowup: 'u', ' ': 'u', s: 'd', arrowdown: 'd', j: 'p', k: 'k', l: 'b', u: 's', i: 'x' };
const inp = {};
let inpTimer = null;
function sendInp() {
  if (!A || A.game !== 'luta' || !A.state || A.state.phase !== 'fight' || !A.state.ordem.includes(meuSeat())) return;
  socket.emit('arcade-luta', { action: 'input', inp: { ...inp } });
}
function setKey(k, on) { if (!!inp[k] === on) return; inp[k] = on; sendInp(); }
window.addEventListener('keydown', (e) => { const k = KEYS[e.key.toLowerCase()]; if (!k) return; e.preventDefault(); setKey(k, true); });
window.addEventListener('keyup', (e) => { const k = KEYS[e.key.toLowerCase()]; if (!k) return; setKey(k, false); });
window.addEventListener('blur', () => { for (const k in inp) inp[k] = false; sendInp(); });
document.querySelectorAll('#pad [data-k]').forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); setKey(k, true); });
  const off = () => setKey(k, false);
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
});
// golpes são "toques": soltamos sozinhos depois de um quadro para não repetir
setInterval(() => { let mudou = false; for (const k of ['p', 'k', 's', 'x']) if (inp[k] && inp['_' + k]) { inp[k] = false; mudou = true; } for (const k of ['p', 'k', 's', 'x']) inp['_' + k] = !!inp[k]; if (mudou) sendInp(); }, 120);

// desenho
const ARENA_DRAW = {
  praia: (c) => { const g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#ff9a5c'); g.addColorStop(.6, '#ffd36b'); g.addColorStop(1, '#4fc3f7'); c.fillStyle = g; c.fillRect(0, 0, LW, LH); c.fillStyle = '#ffe082'; c.beginPath(); c.arc(640, 150, 46, 0, 7); c.fill(); c.fillStyle = '#1e88e5'; c.fillRect(0, 290, LW, 40); c.fillStyle = '#f5deb3'; c.fillRect(0, 330, LW, 70); },
  cidade: (c) => { const g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#0b1026'); g.addColorStop(1, '#2d2f6e'); c.fillStyle = g; c.fillRect(0, 0, LW, LH); for (let i = 0; i < 14; i++) { const h = 80 + ((i * 53) % 150); c.fillStyle = '#141a3a'; c.fillRect(i * 60 - 10, 330 - h, 50, h); c.fillStyle = '#ffeb3b88'; for (let y = 340 - h; y < 320; y += 18) for (let x = 0; x < 40; x += 14) if ((x + y + i) % 3) c.fillRect(i * 60 - 4 + x, y, 7, 9); } c.fillStyle = '#333'; c.fillRect(0, 330, LW, 70); c.strokeStyle = '#ffd54f'; c.setLineDash([24, 18]); c.beginPath(); c.moveTo(0, 365); c.lineTo(LW, 365); c.stroke(); c.setLineDash([]); },
  templo: (c) => { const g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#cfe8ff'); g.addColorStop(1, '#eef4f8'); c.fillStyle = g; c.fillRect(0, 0, LW, LH); c.fillStyle = '#9fb4c7'; c.beginPath(); c.moveTo(0, 330); c.lineTo(150, 120); c.lineTo(300, 300); c.lineTo(450, 90); c.lineTo(620, 280); c.lineTo(800, 140); c.lineTo(800, 330); c.closePath(); c.fill(); c.fillStyle = '#8d2d2d'; c.fillRect(330, 200, 140, 14); c.fillRect(345, 214, 10, 116); c.fillRect(445, 214, 10, 116); c.fillStyle = '#6b8e23'; c.fillRect(0, 330, LW, 70); },
  vulcao: (c) => { const g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#1a0000'); g.addColorStop(1, '#7a1e00'); c.fillStyle = g; c.fillRect(0, 0, LW, LH); c.fillStyle = '#2b1a14'; c.beginPath(); c.moveTo(200, 330); c.lineTo(400, 80); c.lineTo(600, 330); c.closePath(); c.fill(); c.fillStyle = '#ff7043'; c.fillRect(385, 80, 30, 12); c.fillStyle = '#3e2723'; c.fillRect(0, 330, LW, 70); c.fillStyle = '#ff5722'; for (let x = 0; x < LW; x += 90) c.fillRect(x + 20, 350, 40, 6); },
};
// ---- desenho dos lutadores (cada um com corpo e cara próprios) ----
const FORMA = {
  brasa: { tronco: 30, ombro: 36, cabeca: 14, pele: '#f1c27d', cabelo: 'fogo', roupa: '#d84315', detalhe: '#ffcc80' },
  tempestade: { tronco: 22, ombro: 26, cabeca: 13, pele: '#e8beac', cabelo: 'espetado', roupa: '#1976d2', detalhe: '#fff176' },
  rocha: { tronco: 46, ombro: 60, cabeca: 13, pele: '#a1887f', cabelo: 'careca', roupa: '#5d4037', detalhe: '#8d6e63' },
  sombra: { tronco: 26, ombro: 32, cabeca: 13, pele: '#3e2f4f', cabelo: 'capuz', roupa: '#311b92', detalhe: '#b388ff' },
  gelo: { tronco: 24, ombro: 28, cabeca: 13, pele: '#e3f2fd', cabelo: 'longo', roupa: '#0097a7', detalhe: '#e0f7fa' },
};
function sombrear(c, cor, x, y, w, h) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, cor); g.addColorStop(1, '#00000055');
  return g;
}
function bracoCurvo(c, x1, y1, x2, y2, grossura, cor) {
  // braço com cotovelo (duas curvas) e luva
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.25, my = (y1 + y2) / 2 - (x2 - x1) * 0.15;
  c.strokeStyle = '#00000066'; c.lineWidth = grossura + 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(mx, my, x2, y2); c.stroke();
  c.strokeStyle = cor; c.lineWidth = grossura;
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(mx, my, x2, y2); c.stroke();
  c.fillStyle = '#222'; c.beginPath(); c.arc(x2, y2, grossura * 0.75, 0, 7); c.fill();
}
function pernaCurva(c, x1, y1, x2, y2, grossura, cor) {
  const mx = (x1 + x2) / 2 - 4, my = (y1 + y2) / 2;
  c.strokeStyle = '#00000066'; c.lineWidth = grossura + 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(mx, my, x2, y2); c.stroke();
  c.strokeStyle = cor; c.lineWidth = grossura;
  c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(mx, my, x2, y2); c.stroke();
  // bota
  c.fillStyle = '#222'; c.beginPath(); c.ellipse(x2 + 4, y2, 10, 5, 0, 0, 7); c.fill();
}
function cabeloDe(c, tipo, r, d, agora) {
  if (tipo === 'fogo') {
    for (let i = -2; i <= 2; i++) {
      const h = 16 + Math.sin(agora / 70 + i) * 4;
      c.fillStyle = i % 2 ? '#ff9800' : '#ff3d00';
      c.beginPath(); c.moveTo(i * 5 - 4, -r + 2); c.quadraticCurveTo(i * 7, -r - h, i * 5 + 4, -r + 2); c.fill();
    }
  } else if (tipo === 'espetado') {
    c.fillStyle = '#fff176';
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 5 - 4, -r + 3); c.lineTo(i * 8 + 3, -r - 14 - Math.abs(i) * 2); c.lineTo(i * 5 + 4, -r + 3); c.fill(); }
  } else if (tipo === 'capuz') {
    c.fillStyle = d.roupa; c.beginPath(); c.arc(0, -2, r + 6, Math.PI, 0); c.lineTo(r + 8, 12); c.lineTo(-r - 8, 12); c.closePath(); c.fill();
    c.fillStyle = '#120a1f'; c.beginPath(); c.arc(0, 0, r - 1, 0, 7); c.fill();
    c.fillStyle = '#b388ff'; c.beginPath(); c.arc(4, -1, 2.6, 0, 7); c.arc(-3, -1, 2.2, 0, 7); c.fill();
  } else if (tipo === 'longo') {
    c.fillStyle = '#b3e5fc'; c.beginPath(); c.moveTo(-r, -4); c.quadraticCurveTo(-r - 10, 20, -r + 2, 34 + Math.sin(agora / 150) * 2); c.lineTo(-2, 10); c.closePath(); c.fill();
    c.beginPath(); c.arc(0, -3, r + 2, Math.PI, 0); c.fill();
  } else if (tipo === 'careca') {
    c.fillStyle = '#6d4c41'; c.beginPath(); c.arc(0, 2, r + 1, Math.PI * 1.15, Math.PI * 1.85); c.lineTo(0, -r + 6); c.fill();
  }
}
function drawFighter(c, f, L, agora) {
  const d = FORMA[f.k] || FORMA.brasa;
  const cores = L[f.k] || { cor: '#fff', cor2: '#ccc' };
  c.save();
  c.translate(f.x, f.y);
  if (f.invis) c.globalAlpha = 0.22;
  const ag = f.st === 'crouch';
  const resp = f.st === 'idle' ? Math.sin(agora / 400) * 1.5 : 0; // respira
  const ritmo = f.st === 'walk' ? Math.sin(agora / 110) : 0;
  const alt = (ag ? 64 : 96) + resp; // altura do pescoço
  const quadril = ag ? 34 : 48;
  // sombra no chão
  c.fillStyle = '#0006'; c.beginPath(); c.ellipse(0, 2, d.ombro * 0.7, 6, 0, 0, 7); c.fill();
  if (f.st === 'ko') {
    c.scale(f.face, 1);
    c.fillStyle = d.roupa; c.beginPath(); c.roundRect(-50, -24, 90, 22, 10); c.fill();
    c.fillStyle = d.pele; c.beginPath(); c.arc(52, -16, d.cabeca, 0, 7); c.fill();
    c.fillStyle = '#111'; c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillText('x  x', 52, -13);
    c.restore(); return;
  }
  if (f.frozen) { c.fillStyle = '#b3e5fcaa'; c.beginPath(); c.roundRect(-d.ombro / 2 - 8, -alt - 22, d.ombro + 16, alt + 24, 10); c.fill(); }
  c.scale(f.face, 1);
  const calca = f.k === 'rocha' ? '#4e342e' : f.k === 'gelo' ? '#006064' : f.k === 'sombra' ? '#1a1030' : '#263238';
  // pernas (com joelho)
  const p1 = ritmo * 12, p2 = -ritmo * 12;
  const chute = f.st === 'kick';
  pernaCurva(c, -8, -quadril, -12 + p1, 0, d.tronco * 0.28 + 4, calca);
  if (chute) pernaCurva(c, 8, -quadril, 52, -quadril - 6, d.tronco * 0.28 + 4, calca);
  else if (f.st === 'jump') pernaCurva(c, 8, -quadril, 10, -18, d.tronco * 0.28 + 4, calca);
  else pernaCurva(c, 8, -quadril, 12 + p2, 0, d.tronco * 0.28 + 4, calca);
  // tronco: forma por lutador
  const tw = d.tronco, th = alt - quadril + 6;
  c.fillStyle = '#00000055'; c.beginPath(); c.moveTo(-d.ombro / 2 + 2, -alt + 8); c.lineTo(d.ombro / 2 + 2, -alt + 8); c.lineTo(tw / 2 + 2, -quadril + 8); c.lineTo(-tw / 2 + 2, -quadril + 8); c.closePath(); c.fill();
  c.fillStyle = sombrear(c, d.roupa, -d.ombro / 2, -alt, d.ombro, th);
  c.beginPath(); c.moveTo(-d.ombro / 2, -alt + 6); c.quadraticCurveTo(0, -alt - 2, d.ombro / 2, -alt + 6); c.lineTo(tw / 2, -quadril + 6); c.quadraticCurveTo(0, -quadril + 12, -tw / 2, -quadril + 6); c.closePath(); c.fill();
  // detalhes de roupa
  c.fillStyle = d.detalhe;
  if (f.k === 'brasa') { c.beginPath(); c.moveTo(-6, -alt + 10); c.lineTo(6, -alt + 10); c.lineTo(0, -quadril + 4); c.closePath(); c.fill(); }
  if (f.k === 'tempestade') { c.fillRect(-d.ombro / 2, -alt + 6, d.ombro, 6); c.beginPath(); c.moveTo(-14, -alt + 8); c.lineTo(-30 - ritmo * 6, -alt + 24); c.lineTo(-12, -alt + 20); c.fill(); }
  if (f.k === 'rocha') { for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * 16, -alt + 10, 9, 0, 7); c.fill(); } c.fillStyle = '#3e2723'; c.fillRect(-tw / 2, -quadril - 4, tw, 8); }
  if (f.k === 'sombra') { c.fillStyle = '#00000066'; c.beginPath(); c.moveTo(-d.ombro / 2, -alt + 10); c.lineTo(-d.ombro / 2 - 10 - ritmo * 4, 2); c.lineTo(-tw / 2 + 4, -quadril + 6); c.fill(); c.fillStyle = d.detalhe; c.beginPath(); c.arc(0, -alt + 30, 4, 0, 7); c.fill(); }
  if (f.k === 'gelo') { c.fillStyle = '#ffffff88'; c.beginPath(); c.moveTo(-d.ombro / 2, -alt + 8); c.lineTo(0, -quadril); c.lineTo(d.ombro / 2, -alt + 8); c.lineTo(0, -alt + 16); c.fill(); }
  // braços
  const g = d.tronco * 0.24 + 4;
  let a1 = [-d.ombro / 2 + 2, -alt + 12, -d.ombro / 2 - 8, -alt + 46 + resp], a2 = [d.ombro / 2 - 2, -alt + 12, d.ombro / 2 + 12, -alt + 40];
  if (f.st === 'idle' || f.st === 'walk') { a1[3] -= 10; a2 = [d.ombro / 2 - 2, -alt + 12, d.ombro / 2 + 10, -alt + 30 + resp]; }
  if (f.st === 'punch') a2 = [d.ombro / 2 - 2, -alt + 14, d.ombro / 2 + 40, -alt + 16];
  if (f.st === 'kick') { a1 = [-d.ombro / 2 + 2, -alt + 12, -d.ombro / 2 - 14, -alt + 20]; }
  if (f.st === 'block') { a1 = [-d.ombro / 2 + 2, -alt + 12, 10, -alt + 2]; a2 = [d.ombro / 2 - 2, -alt + 12, 16, -alt + 14]; }
  if (f.st === 'special' || f.st === 'ultra') { a1 = [-d.ombro / 2 + 2, -alt + 12, 10, -alt - 16]; a2 = [d.ombro / 2 - 2, -alt + 12, d.ombro / 2 + 30, -alt + 4]; }
  if (f.st === 'hit') { a1 = [-d.ombro / 2 + 2, -alt + 12, -d.ombro / 2 - 20, -alt + 4]; a2 = [d.ombro / 2 - 2, -alt + 12, -4, -alt + 34]; }
  if (f.st === 'crouch') { a1 = [-d.ombro / 2 + 2, -alt + 12, -d.ombro / 2 - 2, -alt + 36]; a2 = [d.ombro / 2 - 2, -alt + 12, d.ombro / 2 + 6, -alt + 30]; }
  bracoCurvo(c, a1[0], a1[1], a1[2], a1[3], g, d.pele);
  // cabeça
  const r = d.cabeca;
  const incl = f.st === 'hit' ? -0.35 : f.st === 'punch' ? 0.15 : 0;
  c.save(); c.translate(0, -alt - r + 2); c.rotate(incl);
  c.fillStyle = '#00000044'; c.beginPath(); c.arc(2, 2, r, 0, 7); c.fill();
  c.fillStyle = d.pele; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  cabeloDe(c, d.cabelo, r, d, agora);
  if (d.cabelo !== 'capuz') {
    // olhos e boca
    c.fillStyle = '#111';
    if (f.st === 'hit') { c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText('>  <', 4, 2); }
    else { c.beginPath(); c.arc(6, -2, 1.8, 0, 7); c.arc(0.5, -2, 1.6, 0, 7); c.fill(); }
    c.strokeStyle = '#8d4b3a'; c.lineWidth = 1.5; c.beginPath();
    if (f.st === 'punch' || f.st === 'kick' || f.st === 'special' || f.st === 'ultra') { c.arc(4, 5, 3.5, 0, Math.PI); } else c.moveTo(1, 6); c.lineTo(7, 6);
    c.stroke();
    if (f.k === 'brasa') { c.strokeStyle = '#5d4037'; c.lineWidth = 2; c.beginPath(); c.moveTo(-3, -6); c.lineTo(3, -7); c.moveTo(5, -7); c.lineTo(9, -6); c.stroke(); }
    if (f.k === 'rocha') { c.strokeStyle = '#3e2723'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-4, -5); c.lineTo(9, -6); c.stroke(); c.fillStyle = '#3e2723'; c.fillRect(-2, 8, 10, 2); }
    if (f.k === 'gelo') { c.fillStyle = '#4dd0e1'; c.beginPath(); c.arc(6, -2, 2.4, 0, 7); c.arc(0.5, -2, 2.2, 0, 7); c.fill(); }
  }
  c.restore();
  bracoCurvo(c, a2[0], a2[1], a2[2], a2[3], g, d.pele);
  // efeitos de estado
  if (f.st === 'block') { c.fillStyle = '#ffffff44'; c.strokeStyle = '#ffffffaa'; c.lineWidth = 2; c.beginPath(); c.arc(18, -alt + 24, 24, 0, 7); c.fill(); c.stroke(); }
  if (f.st === 'punch' || f.st === 'kick') { c.fillStyle = '#ffffffaa'; c.beginPath(); c.arc(f.st === 'punch' ? d.ombro / 2 + 42 : 54, f.st === 'punch' ? -alt + 16 : -quadril - 6, 7, 0, 7); c.fill(); }
  if (f.burn) { c.fillStyle = '#ff6f0088'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * 10, -alt + 20 + Math.sin(agora / 50 + i) * 6, 10, 0, 7); c.fill(); } }
  if (f.slow) { c.fillStyle = '#80deea'; c.font = '14px system-ui'; c.textAlign = 'center'; c.fillText('❄', -d.ombro / 2 - 10, -alt - 10); }
  if (f.stun) { c.fillStyle = '#ffeb3b'; c.font = '16px system-ui'; c.textAlign = 'center'; c.fillText('✶ ✶', 0, -alt - 30); }
  c.restore();
}
function drawLuta() {
  if (!A || A.game !== 'luta' || !A.state || A.state.phase === 'select' || $('#luta').classList.contains('hide')) return;
  const st = A.state;
  const fr = lframe || st.frame;
  const c = lctx;
  const L = A.luta?.lutadores || {};
  (ARENA_DRAW[st.arena] || ARENA_DRAW.praia)(c);
  const agora = performance.now();
  if (fr) {
    // interpola um pouquinho entre o quadro anterior e o atual
    const k = lprev && lframe ? Math.min(1, (agora - lframeAt) / 34) : 1;
    const fs = fr.f.map((f, i) => (lprev && lprev.f?.[i] && k < 1 ? { ...f, x: lprev.f[i].x + (f.x - lprev.f[i].x) * k, y: lprev.f[i].y + (f.y - lprev.f[i].y) * k } : f));
    // efeitos de chão (tremor, era do gelo)
    for (const [tipo, x, t] of fr.fx) {
      if (tipo === 'tremor') { c.fillStyle = '#8d6e6388'; c.beginPath(); c.ellipse(x, CHAO, 110 * (1 - Math.max(0, t) / 0.25 + 0.2), 14, 0, 0, 7); c.fill(); }
      if (tipo === 'eragelo') { c.fillStyle = '#b3e5fc88'; c.fillRect(0, CHAO - 6, LW, 10); }
    }
    for (const f of fs) drawFighter(c, f, L, agora);
    for (const [tipo, x, y] of fr.proj) {
      c.beginPath(); c.arc(x, y, tipo === 'fogo' ? 14 : 11, 0, 7);
      c.fillStyle = tipo === 'fogo' ? '#ff7043' : '#80deea'; c.fill();
      c.beginPath(); c.arc(x, y, 6, 0, 7); c.fillStyle = '#fff'; c.fill();
    }
    for (const [tipo, x, t, dmg, y] of fr.fx) {
      if (tipo === 'raio') {
        if (t > 0) { c.fillStyle = '#ffffff55'; c.fillRect(x - 24, CHAO - 2, 48, 6); c.fillStyle = '#fff176'; c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.fillText('⚡', x, CHAO - 10); }
        else { c.strokeStyle = '#fff59d'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 10, 0); c.lineTo(x - 8, 120); c.lineTo(x + 6, 130); c.lineTo(x - 10, CHAO); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); }
      }
      if (tipo === 'pedra') { if (t > 0) { c.fillStyle = '#ffffff55'; c.fillRect(x - 20, CHAO - 2, 40, 6); c.fillStyle = '#8d6e63'; c.beginPath(); c.arc(x, Math.max(-30, CHAO - 60 - t * 500), 16, 0, 7); c.fill(); } else { c.fillStyle = '#8d6e63'; c.beginPath(); c.arc(x, CHAO - 14, 16, 0, 7); c.fill(); } }
      if (tipo === 'erupcao') { if (t > 0) { c.fillStyle = '#ff572288'; c.fillRect(x - 30, CHAO - 4, 60, 8); } else { const g = c.createLinearGradient(0, CHAO, 0, 60); g.addColorStop(0, '#ff3d00'); g.addColorStop(1, '#ffeb3b00'); c.fillStyle = g; c.fillRect(x - 34, 60, 68, CHAO - 60); } }
      if (tipo === 'sombra') { c.fillStyle = '#6a1b9a88'; c.beginPath(); c.arc(x, CHAO - 50, 40 * (1 - Math.max(0, t) / 0.4 + 0.2), 0, 7); c.fill(); }
      if (tipo === 'eclipse') { c.fillStyle = '#000000aa'; c.fillRect(0, 0, LW, LH); c.fillStyle = '#fff'; c.font = 'bold 26px system-ui'; c.textAlign = 'center'; c.fillText('ECLIPSE', LW / 2, 60); }
      if (tipo === 'dano') { c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 3; c.font = 'bold 20px system-ui'; c.textAlign = 'center'; c.strokeText('-' + dmg, x, y - (0.5 - t) * 60); c.fillText('-' + dmg, x, y - (0.5 - t) * 60); }
    }
    // HUD
    const nome = (i) => A.seats[st.ordem[i]]?.name || '?';
    fr.f.forEach((f, i) => {
      const x = i === 0 ? 20 : LW - 320, w = 300;
      c.fillStyle = '#0008'; c.fillRect(x, 14, w, 16);
      c.fillStyle = f.hp / f.hpMax > .3 ? '#43a047' : '#e53935';
      const hpw = w * Math.max(0, f.hp) / f.hpMax;
      c.fillRect(i === 0 ? x : x + w - hpw, 14, hpw, 16);
      c.fillStyle = '#0008'; c.fillRect(x, 34, w, 6); c.fillStyle = f.en >= 100 ? '#ff4081' : '#ffb300'; const enw = w * f.en / 100; c.fillRect(i === 0 ? x : x + w - enw, 34, enw, 6);
      c.fillStyle = '#fff'; c.font = 'bold 13px system-ui'; c.textAlign = i === 0 ? 'left' : 'right'; c.fillText(`${nome(i)} · ${L[f.k]?.nome || ''}`, i === 0 ? x : x + w, 54);
      for (let r = 0; r < 2; r++) { c.fillStyle = st.wins[i] > r ? '#ffd54f' : '#ffffff44'; c.beginPath(); c.arc(i === 0 ? x + 8 + r * 18 : x + w - 8 - r * 18, 66, 6, 0, 7); c.fill(); }
    });
    c.fillStyle = '#fff'; c.font = 'bold 26px system-ui'; c.textAlign = 'center'; c.fillText(String(Math.max(0, fr.timer)), LW / 2, 36);
    if (fr.phase === 'countdown') { c.font = 'bold 64px system-ui'; c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 6; const t = fr.cd > 0 ? String(fr.cd) : 'LUTEM!'; c.strokeText(t, LW / 2, 200); c.fillText(t, LW / 2, 200); }
  }
  if (st.phase === 'roundEnd' || st.phase === 'over') { c.fillStyle = '#0007'; c.fillRect(0, 150, LW, 90); c.fillStyle = '#fff'; c.font = 'bold 28px system-ui'; c.textAlign = 'center'; c.fillText(st.msg || '', LW / 2, 205); }
}
(function loop() { try { drawLuta(); } catch (e) { console.warn(e); } requestAnimationFrame(loop); })();

// ---- cartas (estilo Uno) ----
const NOMEV = { pula: '⊘', inverte: '⇄', '+2': '+2', coringa: '✦', '+4': '+4' };
const cartaHTML = (c, cls = '', i = null) => `<div class="uc ${c.c} ${cls}" ${i != null ? `data-i="${i}"` : ''}><small>${NOMEV[c.v] || c.v}</small><span class="${/^\d$/.test(c.v) ? '' : 'act'}">${NOMEV[c.v] || c.v}</span></div>`;
const CORHEX = { r: '#e53935', g: '#43a047', b: '#1e88e5', y: '#fdd835' };
let pendCarta = null;
function renderCartas() {
  const st = A?.state;
  const pile = $('#pile');
  const hand = $('#myhand');
  if (!st) { pile.innerHTML = ''; hand.innerHTML = ''; $('#deck-n').textContent = ''; ['#uno', '#pegou', '#passar'].forEach((x) => $(x).classList.add('hide')); return; }
  pile.innerHTML = cartaHTML(st.top) + (st.top.c === 'k' ? `<span class="corbadge" style="background:${CORHEX[st.cor]}"></span>` : '');
  pile.style.position = 'relative';
  $('#deck-n').textContent = st.deck;
  $('#sentido').textContent = st.dir === 1 ? '⟳' : '⟲';
  const eu = meuSeat();
  const minhaVezC = eu >= 0 && st.turn === eu && st.phase === 'play';
  $('#deck').classList.toggle('ok', minhaVezC && st.drew !== eu);
  if (!st.hand) { hand.innerHTML = '<span style="color:var(--muted);font-size:12px">Você está assistindo.</span>'; ['#uno', '#pegou', '#passar'].forEach((x) => $(x).classList.add('hide')); return; }
  const ok = new Set(st.jogaveis || []);
  hand.innerHTML = st.hand.map((c, i) => cartaHTML(c, ok.has(i) ? 'ok' : '', i)).join('');
  $('#passar').classList.toggle('hide', !(minhaVezC && st.drew === eu));
  $('#uno').classList.toggle('hide', !(st.hand.length <= 2 && !st.uno?.[eu] && st.phase === 'play'));
  $('#pegou').classList.toggle('hide', !(st.unoPend != null && st.unoPend !== eu));
}
$('#myhand').addEventListener('click', async (e) => {
  const t = e.target.closest('[data-i]');
  if (!t) return;
  const st = A?.state;
  const i = Number(t.dataset.i);
  if (!(st?.jogaveis || []).includes(i)) return toast(st?.turn === meuSeat() ? 'Essa carta não combina com a mesa.' : 'Não é a sua vez.');
  if (st.hand[i].c === 'k') { pendCarta = i; $('#cor').classList.remove('hide'); return; }
  const r = await emitAck('arcade-cartas', { action: 'play', i });
  if (r.error) toast(r.error);
});
document.querySelectorAll('#cor [data-cor]').forEach((b) => (b.onclick = async () => { $('#cor').classList.add('hide'); const r = await emitAck('arcade-cartas', { action: 'play', i: pendCarta, cor: b.dataset.cor }); if (r.error) toast(r.error); }));
$('#cor-x').onclick = () => $('#cor').classList.add('hide');
$('#deck').onclick = async () => { const r = await emitAck('arcade-cartas', { action: 'draw' }); if (r.error) toast(r.error); };
$('#passar').onclick = async () => { const r = await emitAck('arcade-cartas', { action: 'draw' }); if (r.error) toast(r.error); };
$('#uno').onclick = async () => { const r = await emitAck('arcade-cartas', { action: 'uno' }); if (r.error) toast(r.error); };
$('#pegou').onclick = async () => { const r = await emitAck('arcade-cartas', { action: 'pegou' }); if (r.error) toast(r.error); };

// ---- dominó ----
// Pontinhos (pips) de cada número, numa grade 3x3: posições 0..8
const PIPS = { 0: [], 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const pipsHTML = (n) => `<span class="half"><span class="pips">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((p) => `<i class="${PIPS[n].includes(p) ? 'on' : ''}"></i>`).join('')}</span></span>`;
const tileHTML = (a, b, cls) => `<div class="tile ${cls}" title="${a}|${b}">${pipsHTML(a)}${pipsHTML(b)}</div>`;
let pendente = null;
function renderDomino() {
  const st = A?.state;
  const chain = $('#chain');
  const hand = $('#hand');
  if (!st) { chain.innerHTML = '<span style="color:#fff9">Esperando começar…</span>'; hand.innerHTML = ''; $('#dom-pass').classList.add('hide'); $('#dom-monte').textContent = ''; return; }
  chain.innerHTML = st.chain.map(([a, b], i) => tileHTML(a, b, (a === b ? 'v' : 'h') + (st.lastMove && !st.lastMove.passou && ((st.lastMove.lado === 'esq' && i === 0) || (st.lastMove.lado !== 'esq' && i === st.chain.length - 1)) ? ' last' : ''))).join('') || '<span style="color:#fff9">Mesa vazia</span>';
  const minha = st.hand;
  if (!minha) {
    hand.innerHTML = `<span style="color:var(--muted);font-size:12px">${st.phase === 'over' && st.revel ? 'Mãos: ' + Object.entries(st.revel).map(([c, h]) => `${esc(A.seats[c]?.name || '?')} (${h.map((p) => p.join('|')).join(' ') || 'bateu'})`).join(' · ') : 'Você está assistindo.'}</span>`;
    $('#dom-pass').classList.add('hide');
  } else {
    const ok = new Map((st.jogadas || []).map((j) => [j.i, j.lados]));
    hand.innerHTML = minha.map(([a, b], i) => tileHTML(a, b, ok.has(i) ? 'ok' : '').replace('class="tile', `data-i="${i}" class="tile`)).join('');
    const minhaVezDom = st.turn === meuSeat() && st.phase === 'play';
    $('#dom-pass').classList.toggle('hide', !(minhaVezDom && !ok.size));
    $('#dom-pass').textContent = st.monte > 0 ? 'Comprar do monte' : 'Passar';
  }
  $('#dom-monte').textContent = `Monte: ${st.monte} pedra(s)`;
  // última jogada em destaque na última pedra; a borda da mesa rola até o fim
}
$('#hand').addEventListener('click', async (e) => {
  const t = e.target.closest('[data-i]');
  if (!t) return;
  const st = A?.state;
  const i = Number(t.dataset.i);
  const j = (st?.jogadas || []).find((x) => x.i === i);
  if (!j) return toast('Essa pedra não encaixa agora.');
  if (j.lados.length > 1) { pendente = i; $('#lado-txt').textContent = `Pedra ${st.hand[i].join('|')}: de que lado?`; $('#lado').classList.remove('hide'); return; }
  const r = await emitAck('arcade-domino', { action: 'play', i, lado: j.lados[0] });
  if (r.error) toast(r.error);
});
$('#lado-esq').onclick = async () => { $('#lado').classList.add('hide'); const r = await emitAck('arcade-domino', { action: 'play', i: pendente, lado: 'esq' }); if (r.error) toast(r.error); };
$('#lado-dir').onclick = async () => { $('#lado').classList.add('hide'); const r = await emitAck('arcade-domino', { action: 'play', i: pendente, lado: 'dir' }); if (r.error) toast(r.error); };
$('#lado-x').onclick = () => $('#lado').classList.add('hide');
$('#dom-pass').onclick = async () => { const r = await emitAck('arcade-domino', { action: 'pass' }); if (r.error) toast(r.error); };

// ---- desenho ----
let scale = 1;
function fit() {
  const st = $('#stage');
  const aw = st.clientWidth - 12, ah = st.clientHeight - 12;
  const tw = W + PAD * 2, th = H + PAD * 2;
  const s = Math.max(0.2, Math.min(aw / tw, ah / th));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(tw * s * dpr); cv.height = Math.round(th * s * dpr);
  cv.style.width = Math.round(tw * s) + 'px'; cv.style.height = Math.round(th * s) + 'px';
  scale = s * dpr;
  draw();
}
window.addEventListener('resize', fit);
function posicoes() {
  const st = A?.state;
  if (!st) return [];
  if (live && st.phase === 'moving') return live.map(([id, x, y]) => ({ id, x, y, in: false }));
  return st.balls;
}
function draw() {
  if (!A?.state || A.game !== 'sinuca') return;
  const st = A.state;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W + PAD * 2, H + PAD * 2);
  // madeira
  ctx.fillStyle = '#5a3a1e';
  ctx.beginPath(); ctx.roundRect(0, 0, W + PAD * 2, H + PAD * 2, 18); ctx.fill();
  // pano
  ctx.save(); ctx.translate(PAD, PAD);
  ctx.fillStyle = '#1f7a3f'; ctx.fillRect(-6, -6, W + 12, H + 12);
  ctx.fillStyle = '#2a9b50'; ctx.fillRect(0, 0, W, H);
  // marcas
  ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W * 0.25, 0); ctx.lineTo(W * 0.25, H); ctx.stroke();
  // caçapas
  for (const [px, py] of [[0, 0], [W / 2, -4], [W, 0], [0, H], [W / 2, H + 4], [W, H]]) { ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(px, py, PR, 0, Math.PI * 2); ctx.fill(); }
  // mira
  const eu = minhaVez();
  const cue = posicoes().find((b) => b.id === 0);
  if (eu && drag && cue && !cue.in) {
    const ang = drag.angle;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    // linha de mira até a primeira bola/tabela
    let t = 2000;
    for (const b of posicoes()) {
      if (b.id === 0 || b.in) continue;
      const fx = b.x - cue.x, fy = b.y - cue.y;
      const proj = fx * dx + fy * dy;
      if (proj <= 0) continue;
      const perp = Math.abs(fx * dy - fy * dx);
      if (perp < 2 * R) { const tt = proj - Math.sqrt(4 * R * R - perp * perp); if (tt < t) t = tt; }
    }
    const ex = cue.x + dx * Math.min(t, 1200), ey = cue.y + dy * Math.min(t, 1200);
    ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#ffffff55'; ctx.beginPath(); ctx.arc(ex, ey, R, 0, Math.PI * 2); ctx.stroke();
    // taco
    const back = 20 + drag.power * 90;
    ctx.strokeStyle = '#d9b26f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cue.x - dx * (R + back), cue.y - dy * (R + back)); ctx.lineTo(cue.x - dx * (R + back + 260), cue.y - dy * (R + back + 260)); ctx.stroke();
  }
  // bolas
  for (const b of posicoes()) {
    if (b.in) continue;
    ctx.beginPath(); ctx.arc(b.x + 1.5, b.y + 2, R, 0, Math.PI * 2); ctx.fillStyle = '#00000055'; ctx.fill();
    ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fillStyle = b.id === 0 ? '#f4f1e8' : b.id > 8 ? '#f4f1e8' : corDe(b.id); ctx.fill();
    if (b.id > 8) { ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = corDe(b.id); ctx.fillRect(b.x - R, b.y - R * 0.55, R * 2, R * 1.1); ctx.restore(); }
    if (b.id !== 0) { ctx.beginPath(); ctx.arc(b.x, b.y, R * 0.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.fillStyle = '#111'; ctx.font = `bold ${R * 0.75}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.id), b.x, b.y + 0.5); }
    ctx.beginPath(); ctx.arc(b.x - R * 0.35, b.y - R * 0.35, R * 0.3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff66'; ctx.fill();
  }
  if (eu && st.inHand && cue && !drag) { ctx.strokeStyle = '#ffffffaa'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cue.x, cue.y, R + 5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
  // vencedor
  if (st.phase === 'over') {
    ctx.fillStyle = '#00000088'; ctx.fillRect(0, 0, W + PAD * 2, H + PAD * 2);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 28px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(st.msg || 'Fim de jogo', (W + PAD * 2) / 2, (H + PAD * 2) / 2);
  }
}

// ---- controle: arrastar para mirar e dar força ----
let drag = null;
function ponto(e) {
  const r = cv.getBoundingClientRect();
  const sx = (W + PAD * 2) / r.width;
  return { x: (e.clientX - r.left) * sx - PAD, y: (e.clientY - r.top) * sx - PAD };
}
cv.addEventListener('pointerdown', (e) => {
  if (!minhaVez()) return;
  cv.setPointerCapture(e.pointerId);
  const p = ponto(e);
  drag = { sx: p.x, sy: p.y, angle: 0, power: 0, moved: false, t: Date.now() };
  $('#power').style.display = 'block';
});
cv.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = ponto(e);
  const cue = posicoes().find((b) => b.id === 0);
  const dx = p.x - drag.sx, dy = p.y - drag.sy;
  const d = Math.hypot(dx, dy);
  if (d > 6) drag.moved = true;
  if (drag.moved && cue) {
    // puxa o taco: a bola vai na direção contrária ao arrasto
    drag.angle = Math.atan2(-dy, -dx);
    drag.power = Math.min(1, d / 220);
    $('#power i').style.width = Math.round(drag.power * 100) + '%';
  }
  draw();
});
async function soltar(e) {
  if (!drag) return;
  const d = drag; drag = null;
  $('#power').style.display = 'none';
  draw();
  const st = A?.state;
  if (!st) return;
  if (!d.moved) {
    // toque curto: com bola na mão, coloca a branca ali
    if (st.inHand) { const r = await emitAck('arcade-place', { x: d.sx, y: d.sy }); if (r.error) toast(r.error); }
    return;
  }
  if (d.power < 0.06) return;
  const r = await emitAck('arcade-shot', { angle: d.angle, power: d.power });
  if (r.error) toast(r.error);
}
cv.addEventListener('pointerup', soltar);
cv.addEventListener('pointercancel', () => { drag = null; $('#power').style.display = 'none'; draw(); });
fit();
