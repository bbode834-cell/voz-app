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
  const box = $('#seats');
  box.innerHTML = '';
  A.seats.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'seat' + (sinuca ? ' t' + (i % 2) : '');
    const naVez = st && s && st.phase !== 'over' && st.turn === i && (st.ordem || []).includes(i);
    if (naVez) el.classList.add('turn');
    let extra = '';
    if (sinuca && st) { const g = st.groups?.[i % 2]; extra = `<span class="dot ${g || ''}"></span>`; }
    if (!sinuca && st && s) extra = `<span class="vs">${st.counts?.[i] ?? ''}${A.game === 'cartas' ? '🃏' : '🁣'}${A.game === 'cartas' && st.uno?.[i] ? ' <b style="color:var(--accent)">UNO</b>' : ''}</span>`;
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
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

$('#pick-sinuca').onclick = async () => { const r = await emitAck('arcade-game', { game: 'sinuca' }); if (r.error) toast(r.error); };
$('#pick-domino').onclick = async () => { const r = await emitAck('arcade-game', { game: 'domino' }); if (r.error) toast(r.error); };
$('#pick-cartas').onclick = async () => { const r = await emitAck('arcade-game', { game: 'cartas' }); if (r.error) toast(r.error); };
$('#sit').onclick = async () => { const r = await emitAck('arcade-sit'); if (r.error) toast(r.error); };
$('#start').onclick = async () => { const r = await emitAck('arcade-start'); if (r.error) toast(r.error); };
$('#stand').onclick = async () => { const r = await emitAck('arcade-stand'); if (r.error) toast(r.error); };
$('#reset').onclick = async () => { const r = await emitAck('arcade-reset'); if (r.error) toast(r.error); };
$('#trocar').onclick = async () => {
  if (A?.state && A.state.phase !== 'over' && !confirm('Trocar de jogo encerra a partida atual. Trocar?')) return;
  const r = await emitAck('arcade-game', { game: null }); // volta para a escolha
  if (r.error) toast(r.error);
};

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
