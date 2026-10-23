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
  draw();
});
socket.on('arcade-balls', (b) => { live = b; draw(); });
socket.on('dj-info', ({ text }) => { if (/Arcade|🕹️/.test(text || '')) toast(text); });

const meuSeat = () => (A?.seats || []).findIndex((s) => s && s.uid === uid);
const minhaVez = () => A?.state && meuSeat() >= 0 && A.state.turn === meuSeat() && A.state.phase === 'aim' && A.seats.every(Boolean);

function renderTop() {
  const semJogo = !A || !A.game;
  $('#pick').classList.toggle('hide', !semJogo);
  if (semJogo) return;
  const st = A.state;
  [0, 1].forEach((i) => {
    const s = A.seats[i];
    const el = $('#seat' + i);
    el.querySelector('b').textContent = s ? s.name : 'vazio';
    el.classList.toggle('turn', !!(st && s && st.phase !== 'over' && st.turn === i && A.seats.every(Boolean)));
    const g = st?.groups?.[i];
    el.querySelector('.dot').className = 'dot ' + (g || '');
    if (st) {
      const resta = g ? st.balls.filter((b) => !b.in && (g === 'lisa' ? b.id >= 1 && b.id <= 7 : b.id >= 9)).length : null;
      el.title = s ? `${s.name}${g ? ` · ${g}s, faltam ${resta}` : ''}` : 'Cadeira livre';
    }
  });
  const eu = meuSeat();
  $('#sit').classList.toggle('hide', eu >= 0 || A.seats.every(Boolean));
  $('#stand').classList.toggle('hide', eu < 0);
  $('#reset').classList.toggle('hide', !(st && st.phase === 'over'));
  let msg = st?.msg || '';
  if (st && !A.seats.every(Boolean)) msg = A.seats.some(Boolean) ? 'Esperando mais um jogador sentar…' : 'Toque em "Jogar" para sentar (2 jogadores).';
  else if (st && st.phase === 'aim' && minhaVez()) msg = (st.inHand ? 'Bola na mão: toque na mesa para colocar a branca. ' : '') + 'Sua vez: arraste a partir da branca e solte.';
  $('#msg').textContent = msg;
}

$('#pick-sinuca').onclick = async () => { const r = await emitAck('arcade-game', { game: 'sinuca' }); if (r.error) toast(r.error); };
$('#sit').onclick = async () => { const r = await emitAck('arcade-sit'); if (r.error) toast(r.error); };
$('#stand').onclick = async () => { const r = await emitAck('arcade-stand'); if (r.error) toast(r.error); };
$('#reset').onclick = async () => { const r = await emitAck('arcade-reset'); if (r.error) toast(r.error); };

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
  if (!A?.state) return;
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
