// 🕹️ Arcade King — bot de mini-jogos da chamada. Jogo 1: Sinuca (8 bolas).
// O servidor é o "juiz": roda a física das bolas e manda as posições para todo mundo
// (quem joga e quem só assiste veem a mesma mesa). Jogos originais, sem ROM de ninguém.

const W = 800; // mesa (área de jogo) em "pixels" lógicos
const H = 400;
const R = 11; // raio da bola
const POCKET_R = 19;
const DT = 1 / 120;
const FRICTION = 0.992; // por passo (atrito do pano)
const STOP = 6; // abaixo disso a bola para (px/s)
const MAX_POWER = 1700; // px/s
const POCKETS = [
  [0, 0], [W / 2, -4], [W, 0],
  [0, H], [W / 2, H + 4], [W, H],
];

function rackInicial() {
  const balls = [];
  // branca
  balls.push({ id: 0, x: W * 0.25, y: H / 2, vx: 0, vy: 0, in: false });
  // triângulo: 1..15, 8 no meio da terceira fileira, lisas/listradas misturadas
  const ordem = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 15, 7];
  let k = 0;
  const ax = W * 0.72;
  const gap = R * 2 + 0.6;
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row <= col; row++) {
      const x = ax + col * gap * 0.87;
      const y = H / 2 + (row - col / 2) * gap;
      balls.push({ id: ordem[k++], x, y, vx: 0, vy: 0, in: false });
    }
  }
  return balls;
}

function emMovimento(balls) {
  return balls.some((b) => !b.in && (Math.abs(b.vx) > 0 || Math.abs(b.vy) > 0));
}

// Um passo da física. Devolve eventos: { pocketed: [ids], firstHit: id|null, cushion: bool }
function passo(balls, ev) {
  for (const b of balls) {
    if (b.in) continue;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    b.vx *= FRICTION;
    b.vy *= FRICTION;
    if (Math.hypot(b.vx, b.vy) < STOP) { b.vx = 0; b.vy = 0; }
  }
  // caçapas
  for (const b of balls) {
    if (b.in) continue;
    for (const [px, py] of POCKETS) {
      if (Math.hypot(b.x - px, b.y - py) < POCKET_R) {
        b.in = true;
        b.vx = 0;
        b.vy = 0;
        ev.pocketed.push(b.id);
        break;
      }
    }
  }
  // tabelas (com "boca" das caçapas: perto delas a bola pode sair)
  for (const b of balls) {
    if (b.in) continue;
    const pertoCanto = POCKETS.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < POCKET_R + R);
    if (!pertoCanto) {
      if (b.x < R) { b.x = R; b.vx = -b.vx * 0.8; ev.cushion = true; }
      if (b.x > W - R) { b.x = W - R; b.vx = -b.vx * 0.8; ev.cushion = true; }
      if (b.y < R) { b.y = R; b.vy = -b.vy * 0.8; ev.cushion = true; }
      if (b.y > H - R) { b.y = H - R; b.vy = -b.vy * 0.8; ev.cushion = true; }
    } else if (b.x < -R * 2 || b.x > W + R * 2 || b.y < -R * 2 || b.y > H + R * 2) {
      // caiu pela boca
      b.in = true; b.vx = 0; b.vy = 0; ev.pocketed.push(b.id);
    }
  }
  // bola com bola
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (a.in) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const c = balls[j];
      if (c.in) continue;
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d === 0 || d >= 2 * R) continue;
      const nx = dx / d;
      const ny = dy / d;
      // separa
      const over = (2 * R - d) / 2;
      a.x -= nx * over; a.y -= ny * over;
      c.x += nx * over; c.y += ny * over;
      // troca a componente normal da velocidade (massas iguais)
      const va = a.vx * nx + a.vy * ny;
      const vc = c.vx * nx + c.vy * ny;
      if (va - vc <= 0) continue;
      const e = 0.96;
      const ia = va;
      const ic = vc;
      const nva = ((1 - e) * ia + (1 + e) * ic) / 2;
      const nvc = ((1 + e) * ia + (1 - e) * ic) / 2;
      a.vx += (nva - va) * nx; a.vy += (nva - va) * ny;
      c.vx += (nvc - vc) * nx; c.vy += (nvc - vc) * ny;
      if (ev.firstHit == null && (a.id === 0 || c.id === 0)) ev.firstHit = a.id === 0 ? c.id : a.id;
    }
  }
}

const grupoDe = (id) => (id >= 1 && id <= 7 ? 'lisa' : id >= 9 && id <= 15 ? 'listrada' : id === 8 ? 'oito' : null);

// Sinuca em duplas: cadeiras 0 e 2 são o time A, 1 e 3 o time B. A vez roda entre as cadeiras ocupadas.
const timeDe = (seat) => seat % 2;
function novoJogo(seats) {
  const ordem = seats.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
  return {
    balls: rackInicial(),
    ordem, // cadeiras que jogam, na sequência
    turn: ordem[0], // cadeira da vez
    groups: [null, null], // 'lisa' | 'listrada' por TIME (0 = cadeiras 0/2, 1 = cadeiras 1/3)
    inHand: true,
    phase: 'aim', // aim | moving | over
    winner: null, // time vencedor
    msg: 'Quebra! Arraste a partir da bola branca para dar a tacada.',
    shots: 0,
  };
}
function proximaCadeira(st, atual) {
  const i = st.ordem.indexOf(atual);
  return st.ordem[(i + 1) % st.ordem.length];
}
function proximaDoOutroTime(st, atual) {
  let c = proximaCadeira(st, atual);
  for (let k = 0; k < st.ordem.length && timeDe(c) === timeDe(atual); k++) c = proximaCadeira(st, c);
  return c;
}

// ---------- 🁣 Dominó (2 a 4 jogadores) ----------
function novoDomino(seats) {
  const ordem = seats.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
  const pecas = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) pecas.push([a, b]);
  for (let i = pecas.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pecas[i], pecas[j]] = [pecas[j], pecas[i]]; }
  const hands = {};
  for (const c of ordem) hands[c] = pecas.splice(0, 7);
  // começa quem tem a maior dupla (ou a maior pedra)
  let inicio = ordem[0];
  let melhor = -1;
  for (const c of ordem) for (const [a, b] of hands[c]) { const v = a === b ? 100 + a : a + b; if (v > melhor) { melhor = v; inicio = c; } }
  return {
    ordem, hands, monte: pecas, chain: [], // chain: [[a,b],...] já orientadas (esquerda→direita)
    turn: inicio, phase: 'play', winner: null, passes: 0,
    msg: `${'%NOME%'} começa (tem a maior pedra).`, counts: {}, lastMove: null,
  };
}
// ---------- 🃏 Cartas (estilo Uno, 2 a 4 jogadores) ----------
// carta: { c: 'r'|'g'|'b'|'y'|'k', v: '0'..'9'|'pula'|'inverte'|'+2'|'coringa'|'+4' }
function baralhoCartas() {
  const d = [];
  for (const c of ['r', 'g', 'b', 'y']) {
    d.push({ c, v: '0' });
    for (let k = 0; k < 2; k++) {
      for (let n = 1; n <= 9; n++) d.push({ c, v: String(n) });
      d.push({ c, v: 'pula' }, { c, v: 'inverte' }, { c, v: '+2' });
    }
  }
  for (let k = 0; k < 4; k++) d.push({ c: 'k', v: 'coringa' }, { c: 'k', v: '+4' });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function novoCartas(seats) {
  const ordem = seats.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
  const deck = baralhoCartas();
  const hands = {};
  for (const c of ordem) hands[c] = deck.splice(0, 7);
  // a primeira carta da mesa é um número
  let top = deck.pop();
  while (!/^\d$/.test(top.v)) { deck.unshift(top); top = deck.pop(); }
  return {
    ordem, hands, deck, pile: [top], cor: top.c, dir: 1, turn: ordem[0], phase: 'play', winner: null,
    drew: null, // seat que já comprou nesta vez (pode jogar a comprada ou passar)
    uno: {}, // seat -> true se gritou UNO com 1 carta
    unoPend: null, // { seat, until } quem ficou com 1 carta e ainda não gritou
    msg: `${seats[ordem[0]].name} começa.`, lastMove: null,
  };
}
const podeJogarCarta = (carta, st) => carta.c === 'k' || carta.c === st.cor || carta.v === st.pile[st.pile.length - 1].v;
function compraCartas(st, seat, n) {
  for (let i = 0; i < n; i++) {
    if (!st.deck.length) {
      if (st.pile.length <= 1) break;
      const top = st.pile.pop();
      st.deck = st.pile.map((c) => (c.c === 'k' ? { ...c } : c));
      st.pile = [top];
      for (let k = st.deck.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [st.deck[k], st.deck[j]] = [st.deck[j], st.deck[k]]; }
    }
    if (st.deck.length) st.hands[seat].push(st.deck.pop());
  }
}
const extremos = (chain) => (chain.length ? [chain[0][0], chain[chain.length - 1][1]] : null);
function jogadasPossiveis(hand, chain) {
  const ex = extremos(chain);
  if (!ex) return hand.map((_, i) => ({ i, lados: ['dir'] }));
  const out = [];
  hand.forEach(([a, b], i) => {
    const lados = [];
    if (a === ex[0] || b === ex[0]) lados.push('esq');
    if (a === ex[1] || b === ex[1]) lados.push('dir');
    if (lados.length) out.push({ i, lados });
  });
  return out;
}

module.exports = function setupArcade(io, { byId, socketsOf, BOTS_ROOM, broadcastChannels, rank, RANK }) {
  const MAX_SEATS = 4;
  const arcade = { id: 'bot-arcade', name: 'Arcade King', avatar: 'p:arcade', room: null, game: null, seats: [null, null, null, null], started: false, state: null, timer: null };
  const pub = () => ({ id: arcade.id, name: arcade.name, avatar: arcade.avatar, room: arcade.room });
  // O dominó manda a mão de cada um só para ele: o snapshot público esconde as mãos
  const snapshot = (uid) => {
    let state = null;
    if (arcade.state && arcade.game === 'sinuca') state = { ...arcade.state, balls: arcade.state.balls.map((b) => ({ id: b.id, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, in: b.in })) };
    if (arcade.state && arcade.game === 'domino') {
      const st = arcade.state;
      const seat = uid != null ? cadeira(uid) : -1;
      const counts = {};
      for (const c of st.ordem) counts[c] = st.hands[c].length;
      state = { ordem: st.ordem, chain: st.chain, turn: st.turn, phase: st.phase, winner: st.winner, msg: st.msg, counts, monte: st.monte.length, lastMove: st.lastMove,
        hand: seat >= 0 ? st.hands[seat] : null, jogadas: seat >= 0 && st.phase === 'play' && st.turn === seat ? jogadasPossiveis(st.hands[seat], st.chain) : [],
        revel: st.phase === 'over' ? st.hands : null };
    }
    if (arcade.state && arcade.game === 'cartas') {
      const st = arcade.state;
      const seat = uid != null ? cadeira(uid) : -1;
      const counts = {};
      for (const c of st.ordem) counts[c] = st.hands[c].length;
      state = { ordem: st.ordem, top: st.pile[st.pile.length - 1], cor: st.cor, dir: st.dir, turn: st.turn, phase: st.phase, winner: st.winner, msg: st.msg, counts, deck: st.deck.length,
        drew: st.drew, unoPend: st.unoPend ? st.unoPend.seat : null, uno: st.uno, lastMove: st.lastMove,
        hand: seat >= 0 ? st.hands[seat] : null,
        jogaveis: seat >= 0 && st.phase === 'play' && st.turn === seat ? st.hands[seat].map((c, i) => (podeJogarCarta(c, st) && (st.drew == null || i === st.hands[seat].length - 1) ? i : -1)).filter((i) => i >= 0) : [] };
    }
    return { id: arcade.id, name: arcade.name, avatar: arcade.avatar, room: arcade.room, game: arcade.game, seats: arcade.seats, started: arcade.started, state, W, H, R, POCKET_R, serverNow: Date.now() };
  };
  function broadcast() {
    if ((arcade.game === 'domino' || arcade.game === 'cartas') && arcade.state) {
      for (const s of io.sockets.sockets.values()) s.emit('arcade', snapshot(s.data.user?.id));
    } else io.emit('arcade', snapshot());
  }
  const naSala = (uid) => !!arcade.room && socketsOf(uid).some((s) => s.data.channel === arcade.room);
  const cadeira = (uid) => arcade.seats.findIndex((s) => s && s.uid === uid);

  function pararJogo() {
    clearInterval(arcade.timer);
    arcade.timer = null;
    arcade.state = null;
    arcade.game = null;
    arcade.started = false;
    arcade.seats = [null, null, null, null];
  }
  const sentados = () => arcade.seats.filter(Boolean).length;
  function encerra(msgFn) {
    const st = arcade.state;
    if (!st || st.phase === 'over') return;
    clearInterval(arcade.timer);
    arcade.timer = null;
    st.phase = 'over';
    msgFn(st);
  }
  function voltarParaBots() {
    pararJogo();
    arcade.room = null;
    broadcast();
  }
  // Quem saiu da sala perde a cadeira
  function limpaCadeiras() {
    let mudou = false;
    arcade.seats = arcade.seats.map((s) => {
      if (s && !naSala(s.uid)) { mudou = true; return null; }
      return s;
    });
    if (mudou && arcade.state && arcade.state.phase !== 'over') saiuDaPartida();
    return mudou;
  }
  // Alguém da partida saiu: tira da ordem; se sobrou um (ou um time), acabou
  function saiuDaPartida() {
    const st = arcade.state;
    if (!st) return;
    st.ordem = st.ordem.filter((c) => arcade.seats[c]);
    if (arcade.game === 'sinuca') {
      const times = new Set(st.ordem.map(timeDe));
      if (times.size <= 1) encerra((s) => { s.winner = st.ordem.length ? timeDe(st.ordem[0]) : null; s.msg = st.ordem.length ? `${nomeTime(s.winner)} venceu (o adversário saiu).` : 'Todo mundo saiu da mesa.'; });
      else if (!arcade.seats[st.turn]) { st.turn = st.ordem[0]; st.phase = st.phase === 'moving' ? 'moving' : 'aim'; }
    } else if (arcade.game === 'domino' || arcade.game === 'cartas') {
      if (st.ordem.length <= 1) encerra((s) => { s.winner = st.ordem[0] ?? null; s.msg = st.ordem.length ? `${arcade.seats[st.ordem[0]].name} venceu (os outros saíram).` : 'Todo mundo saiu.'; });
      else if (!arcade.seats[st.turn]) st.turn = st.ordem[0];
    }
  }
  const nomeTime = (t) => {
    const ns = arcade.seats.map((s, i) => (s && timeDe(i) === t ? s.name : null)).filter(Boolean);
    return ns.length > 1 ? `Dupla ${ns.join(' e ')}` : ns[0] || `Time ${t + 1}`;
  }

  // ---- regras da sinuca ----
  function tacada(seat, angle, power) {
    const st = arcade.state;
    const cue = st.balls.find((b) => b.id === 0);
    if (cue.in) { cue.in = false; cue.x = W * 0.25; cue.y = H / 2; }
    const p = Math.max(80, Math.min(MAX_POWER, Number(power) || 0));
    cue.vx = Math.cos(angle) * p;
    cue.vy = Math.sin(angle) * p;
    st.phase = 'moving';
    st.inHand = false;
    st.shots += 1;
    st.msg = '';
    const ev = { pocketed: [], firstHit: null, cushion: false };
    const antes = st.balls.filter((b) => b.in).map((b) => b.id);
    clearInterval(arcade.timer);
    let ticks = 0;
    arcade.timer = setInterval(() => {
      // 120 passos/s de física, 24 quadros/s para a tela
      for (let i = 0; i < 5; i++) passo(st.balls, ev);
      ticks += 1;
      if (!emMovimento(st.balls) || ticks > 24 * 18) {
        clearInterval(arcade.timer);
        arcade.timer = null;
        for (const b of st.balls) { b.vx = 0; b.vy = 0; }
        resolveTacada(seat, ev, antes);
        broadcast();
        return;
      }
      io.to('arcade-view').volatile.emit('arcade-balls', st.balls.filter((b) => !b.in).map((b) => [b.id, Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10]));
    }, 1000 / 24);
  }

  function resolveTacada(seat, ev, antes) {
    const st = arcade.state;
    const time = timeDe(seat);
    const outroTime = 1 - time;
    const nome = (i) => arcade.seats[i]?.name || 'Jogador';
    const novas = ev.pocketed.filter((id) => !antes.includes(id));
    const brancaCaiu = novas.includes(0);
    const oitoCaiu = novas.includes(8);
    const meuGrupo = st.groups[time];
    const minhasFora = (g) => st.balls.filter((b) => grupoDe(b.id) === g && !b.in).length;
    const proxAdv = proximaDoOutroTime(st, seat);
    const prox = proximaCadeira(st, seat);

    if (oitoCaiu) {
      const limpou = meuGrupo && minhasFora(meuGrupo) === 0;
      st.phase = 'over';
      if (limpou && !brancaCaiu) { st.winner = time; st.msg = `🎱 ${nome(seat)} encaçapou a 8. ${nomeTime(time)} venceu!`; }
      else { st.winner = outroTime; st.msg = `💀 ${nome(seat)} derrubou a 8 antes da hora. ${nomeTime(outroTime)} venceu!`; }
      return;
    }
    if (!st.groups[0] && !st.groups[1]) {
      const primeira = novas.find((id) => id !== 0 && id !== 8);
      if (primeira != null && !brancaCaiu) {
        st.groups[time] = grupoDe(primeira);
        st.groups[outroTime] = grupoDe(primeira) === 'lisa' ? 'listrada' : 'lisa';
      }
    }
    let falta = null;
    if (brancaCaiu) falta = 'A branca caiu';
    else if (ev.firstHit == null) falta = 'Não tocou em nenhuma bola';
    else if (st.groups[time]) {
      const g = grupoDe(ev.firstHit);
      const precisaOito = minhasFora(st.groups[time]) === 0;
      if (precisaOito ? g !== 'oito' : g !== st.groups[time]) falta = `Tocou primeiro numa bola ${g === 'oito' ? 'oito' : g}`;
    } else if (grupoDe(ev.firstHit) === 'oito' && st.shots > 1) falta = 'Tocou primeiro na 8';
    const encaçapouMinha = novas.some((id) => id !== 0 && id !== 8 && (!st.groups[time] || grupoDe(id) === st.groups[time]));
    if (falta) {
      if (brancaCaiu) { const cue = st.balls.find((b) => b.id === 0); cue.in = false; cue.x = W * 0.25; cue.y = H / 2; }
      st.turn = proxAdv;
      st.inHand = true;
      st.msg = `Falta de ${nome(seat)}: ${falta}. ${nome(proxAdv)} joga com a bola na mão.`;
    } else if (encaçapouMinha) {
      st.turn = seat;
      st.msg = `${nome(seat)} encaçapou e continua.`;
    } else {
      st.turn = prox;
      st.msg = `Vez de ${nome(prox)}.`;
    }
    st.phase = 'aim';
    const g = st.groups[timeDe(st.turn)];
    if (g) {
      const resta = minhasFora(g);
      st.msg += resta === 0 ? ' Agora é a 8!' : ` (${g === 'lisa' ? 'lisas' : 'listradas'}, faltam ${resta})`;
    }
  }

  // ---- cartas ----
  function proximoCartas(st, de, pulos = 0) {
    let c = de;
    for (let k = 0; k <= pulos; k++) {
      const i = st.ordem.indexOf(c);
      c = st.ordem[(i + st.dir + st.ordem.length) % st.ordem.length];
    }
    return c;
  }
  function jogaCarta(seat, idx, cor) {
    const st = arcade.state;
    const nome = (i) => arcade.seats[i]?.name || 'Jogador';
    const hand = st.hands[seat];
    const carta = hand[idx];
    if (!carta) return 'Carta inválida.';
    if (!podeJogarCarta(carta, st)) return 'Essa carta não combina com a mesa.';
    if (st.drew != null && idx !== hand.length - 1) return 'Depois de comprar, só dá para jogar a carta comprada.';
    if (carta.c === 'k' && !['r', 'g', 'b', 'y'].includes(cor)) return 'Escolha a cor.';
    hand.splice(idx, 1);
    st.pile.push(carta);
    st.cor = carta.c === 'k' ? cor : carta.c;
    st.drew = null;
    st.lastMove = { seat, carta, cor: st.cor };
    // quem estava pendente de UNO e jogou de novo? já era: o castigo só vale se outro pegar antes
    if (st.unoPend && st.unoPend.seat === seat) st.unoPend = null;
    if (!hand.length) {
      st.phase = 'over';
      st.winner = seat;
      st.msg = `🏆 ${nome(seat)} bateu e venceu!`;
      return null;
    }
    if (hand.length === 1 && !st.uno[seat]) st.unoPend = { seat, until: Date.now() + 15000 };
    if (hand.length > 1) st.uno[seat] = false;
    let prox;
    let extra = '';
    if (carta.v === 'inverte') {
      st.dir = -st.dir;
      prox = st.ordem.length === 2 ? seat : proximoCartas(st, seat); // com 2, inverte = pula
      extra = st.ordem.length === 2 ? ' Inverteu: joga de novo.' : ' Inverteu o sentido.';
    } else if (carta.v === 'pula') {
      prox = proximoCartas(st, seat, 1);
      extra = ` ${nome(proximoCartas(st, seat))} foi pulado.`;
    } else if (carta.v === '+2' || carta.v === '+4') {
      const alvo = proximoCartas(st, seat);
      compraCartas(st, alvo, carta.v === '+2' ? 2 : 4);
      st.uno[alvo] = false;
      prox = proximoCartas(st, seat, 1);
      extra = ` ${nome(alvo)} comprou ${carta.v === '+2' ? 2 : 4} e perdeu a vez.`;
    } else prox = proximoCartas(st, seat);
    st.turn = prox;
    st.msg = `${nome(seat)} jogou.${extra} Vez de ${nome(prox)}.`;
    return null;
  }
  function compraVez(seat) {
    const st = arcade.state;
    const nome = (i) => arcade.seats[i]?.name || 'Jogador';
    if (st.drew === seat) {
      // já comprou e não quer/pode jogar: passa
      st.drew = null;
      st.turn = proximoCartas(st, seat);
      st.msg = `${nome(seat)} passou. Vez de ${nome(st.turn)}.`;
      return null;
    }
    const antes = st.hands[seat].length;
    compraCartas(st, seat, 1);
    if (st.hands[seat].length === antes) return 'Acabaram as cartas do monte.';
    st.uno[seat] = false;
    const nova = st.hands[seat][st.hands[seat].length - 1];
    if (podeJogarCarta(nova, st)) { st.drew = seat; st.msg = `${nome(seat)} comprou uma carta e pode jogá-la (ou passar).`; }
    else { st.turn = proximoCartas(st, seat); st.msg = `${nome(seat)} comprou e passou. Vez de ${nome(st.turn)}.`; }
    return null;
  }
  function gritaUno(seat) {
    const st = arcade.state;
    if (st.hands[seat].length > 2) return 'Só dá para gritar UNO com 1 carta (ou prestes a ficar com 1).';
    st.uno[seat] = true;
    if (st.unoPend && st.unoPend.seat === seat) st.unoPend = null;
    st.msg = `${arcade.seats[seat].name}: UNO! 🗣️`;
    return null;
  }
  function pegouUno(seat) {
    const st = arcade.state;
    const p = st.unoPend;
    if (!p || p.seat === seat) return 'Ninguém para pegar agora.';
    if (st.hands[p.seat].length !== 1) { st.unoPend = null; return 'Já passou.'; }
    compraCartas(st, p.seat, 2);
    st.unoPend = null;
    st.msg = `😅 ${arcade.seats[p.seat].name} esqueceu de gritar UNO e comprou 2 (${arcade.seats[seat].name} pegou).`;
    return null;
  }

  // ---- dominó ----
  function jogaDomino(seat, idx, lado) {
    const st = arcade.state;
    const nome = (i) => arcade.seats[i]?.name || 'Jogador';
    const hand = st.hands[seat];
    const pos = jogadasPossiveis(hand, st.chain).find((j) => j.i === idx);
    if (!pos) return 'Essa pedra não encaixa.';
    const l = pos.lados.includes(lado) ? lado : pos.lados[0];
    let [a, b] = hand[idx];
    if (!st.chain.length) st.chain.push([a, b]);
    else if (l === 'esq') { const e = st.chain[0][0]; if (b !== e) [a, b] = [b, a]; st.chain.unshift([a, b]); }
    else { const d = st.chain[st.chain.length - 1][1]; if (a !== d) [a, b] = [b, a]; st.chain.push([a, b]); }
    hand.splice(idx, 1);
    st.passes = 0;
    st.lastMove = { seat, peca: [a, b], lado: l };
    if (!hand.length) {
      st.phase = 'over';
      st.winner = seat;
      st.msg = `🏆 ${nome(seat)} bateu!`;
      return null;
    }
    st.turn = proximaCadeira(st, seat);
    st.msg = `Vez de ${nome(st.turn)}.`;
    return null;
  }
  function passaDomino(seat) {
    const st = arcade.state;
    const nome = (i) => arcade.seats[i]?.name || 'Jogador';
    if (jogadasPossiveis(st.hands[seat], st.chain).length) return 'Você tem pedra para jogar.';
    if (st.monte.length) {
      st.hands[seat].push(st.monte.pop());
      st.msg = `${nome(seat)} comprou do monte.`;
      return null; // continua na vez dele (pode jogar ou comprar de novo)
    }
    st.passes += 1;
    st.lastMove = { seat, passou: true };
    if (st.passes >= st.ordem.length) {
      // jogo fechado: menos pontos ganha
      const soma = (c) => st.hands[c].reduce((t, [a, b]) => t + a + b, 0);
      let best = null;
      for (const c of st.ordem) if (best == null || soma(c) < soma(best)) best = c;
      st.phase = 'over';
      st.winner = best;
      st.msg = `🔒 Jogo fechado! ${nome(best)} venceu com ${soma(best)} ponto(s) na mão.`;
      return null;
    }
    st.turn = proximaCadeira(st, seat);
    st.msg = `${nome(seat)} passou. Vez de ${nome(st.turn)}.`;
    return null;
  }

  io.on('connection', (socket) => {
    const me = () => socket.data.user;
    const isMod = () => RANK[me().role] >= RANK.mod;
    socket.emit('arcade', snapshot(me().id));
    const pode = () => isMod() || naSala(me().id);
    // A tela do jogo avisa que quer receber as bolas em movimento
    socket.on('arcade-hello', () => socket.join('arcade-view'));

    socket.on('arcade-move', ({ to } = {}, ack = () => {}) => {
      if (to === BOTS_ROOM || to == null) {
        if (!pode() && arcade.room) return ack({ error: 'Só quem está na chamada com o Arcade pode devolver ele.' });
        const from = arcade.room;
        voltarParaBots();
        ack({ ok: true });
        broadcastChannels();
        if (from) io.to(from).emit('dj-info', { text: `🕹️ ${me().name} devolveu o Arcade King para a sala Bots.` });
        return;
      }
      const ch = byId(to);
      if (!ch) return ack({ error: 'Sala não encontrada.' });
      if (socket.data.channel !== ch.id && !naSala(me().id) && !isMod()) return ack({ error: 'Entre na chamada primeiro e puxe o Arcade para ela.' });
      const from = arcade.room;
      if (from !== ch.id) pararJogo();
      arcade.room = ch.id;
      ack({ ok: true });
      broadcastChannels();
      broadcast();
      if (from && from !== ch.id) io.to(from).emit('dj-info', { text: `🕹️ ${me().name} levou o Arcade King para a sala ${ch.name}.` });
      socket.to(ch.id).emit('dj-info', { text: `🕹️ ${me().name} chamou o Arcade King para a chamada.` });
    });

    // Escolher o jogo (por enquanto só sinuca) e sentar/levantar
    socket.on('arcade-game', ({ game } = {}, ack = () => {}) => {
      if (!pode()) return ack({ error: 'Puxe o Arcade King para a sua chamada primeiro.' });
      if (game == null) { pararJogo(); ack({ ok: true }); broadcast(); return; } // volta para a escolha de jogo
      if (!['sinuca', 'domino', 'cartas'].includes(game)) return ack({ error: 'Jogo desconhecido.' });
      pararJogo();
      arcade.game = game;
      ack({ ok: true });
      broadcast();
    });
    // Começar a partida (qualquer um sentado, com 2+ sentados)
    socket.on('arcade-start', (_d, ack = () => {}) => {
      if (!arcade.game) return ack({ error: 'Escolha um jogo.' });
      limpaCadeiras();
      if (cadeira(me().id) < 0 && !isMod()) return ack({ error: 'Sente na mesa para começar.' });
      if (sentados() < 2) return ack({ error: 'Precisa de pelo menos 2 jogadores.' });
      if (arcade.state && arcade.state.phase !== 'over') return ack({ error: 'A partida já está rolando.' });
      arcade.started = true;
      arcade.state = arcade.game === 'sinuca' ? novoJogo(arcade.seats) : arcade.game === 'cartas' ? novoCartas(arcade.seats) : novoDomino(arcade.seats);
      if (arcade.game === 'domino') arcade.state.msg = arcade.state.msg.replace('%NOME%', arcade.seats[arcade.state.turn].name);
      ack({ ok: true });
      broadcast();
    });
    socket.on('arcade-sit', (_d, ack = () => {}) => {
      if (!naSala(me().id)) return ack({ error: 'Entre na chamada com o Arcade para jogar.' });
      if (!arcade.game) return ack({ error: 'Escolha um jogo primeiro.' });
      limpaCadeiras();
      if (cadeira(me().id) >= 0) return ack({ ok: true });
      if (arcade.state && arcade.state.phase !== 'over') return ack({ error: 'A partida já começou. Espere acabar para entrar.' });
      const livre = arcade.seats.findIndex((s) => !s);
      if (livre < 0) return ack({ error: 'A mesa está cheia (4 jogadores).' });
      arcade.seats[livre] = { uid: me().id, name: me().name, avatar: me().avatar };
      ack({ ok: true });
      broadcast();
    });
    socket.on('arcade-stand', (_d, ack = () => {}) => {
      const i = cadeira(me().id);
      if (i < 0) return ack({ ok: true });
      arcade.seats[i] = null;
      if (arcade.state && arcade.state.phase !== 'over') saiuDaPartida();
      ack({ ok: true });
      broadcast();
    });
    socket.on('arcade-reset', (_d, ack = () => {}) => {
      if (!pode()) return ack({ error: 'Só quem está na chamada pode reiniciar.' });
      if (!arcade.game) return ack({ error: 'Escolha um jogo.' });
      clearInterval(arcade.timer);
      arcade.timer = null;
      limpaCadeiras();
      if (sentados() < 2) { arcade.state = null; arcade.started = false; ack({ ok: true }); broadcast(); return; }
      arcade.state = arcade.game === 'sinuca' ? novoJogo(arcade.seats) : arcade.game === 'cartas' ? novoCartas(arcade.seats) : novoDomino(arcade.seats);
      if (arcade.game === 'domino') arcade.state.msg = arcade.state.msg.replace('%NOME%', arcade.seats[arcade.state.turn].name);
      ack({ ok: true });
      broadcast();
    });
    // Cartas: { action: 'play'|'draw'|'uno'|'pegou', i, cor }
    socket.on('arcade-cartas', ({ action, i, cor } = {}, ack = () => {}) => {
      const st = arcade.state;
      if (!st || arcade.game !== 'cartas') return ack({ error: 'Sem jogo.' });
      limpaCadeiras();
      const seat = cadeira(me().id);
      if (seat < 0) return ack({ error: 'Você está só assistindo.' });
      if (st.phase !== 'play') return ack({ error: 'A partida acabou.' });
      let err;
      if (action === 'uno') err = gritaUno(seat);
      else if (action === 'pegou') err = pegouUno(seat);
      else if (st.turn !== seat) err = 'Não é a sua vez.';
      else if (action === 'draw') err = compraVez(seat);
      else err = jogaCarta(seat, Number(i), cor);
      if (err) return ack({ error: err });
      ack({ ok: true });
      broadcast();
    });
    // Dominó: jogar { i, lado } e passar/comprar
    socket.on('arcade-domino', ({ action, i, lado } = {}, ack = () => {}) => {
      const st = arcade.state;
      if (!st || arcade.game !== 'domino') return ack({ error: 'Sem jogo.' });
      limpaCadeiras();
      const seat = cadeira(me().id);
      if (seat < 0) return ack({ error: 'Você está só assistindo.' });
      if (st.phase !== 'play') return ack({ error: 'A partida acabou.' });
      if (st.turn !== seat) return ack({ error: 'Não é a sua vez.' });
      const err = action === 'pass' ? passaDomino(seat) : jogaDomino(seat, Number(i), lado === 'esq' ? 'esq' : 'dir');
      if (err) return ack({ error: err });
      ack({ ok: true });
      broadcast();
    });
    // Tacada: { angle (rad), power (0..1) }
    socket.on('arcade-shot', ({ angle, power } = {}, ack = () => {}) => {
      const st = arcade.state;
      if (!st || arcade.game !== 'sinuca') return ack({ error: 'Sem jogo.' });
      limpaCadeiras();
      const i = cadeira(me().id);
      if (i < 0) return ack({ error: 'Você está só assistindo. Toque em "Jogar" para sentar.' });
      if (!st.ordem.includes(i)) return ack({ error: 'Você entrou depois: espere a próxima partida.' });
      if (st.phase !== 'aim') return ack({ error: st.phase === 'over' ? 'A partida acabou.' : 'As bolas ainda estão rolando.' });
      if (st.turn !== i) return ack({ error: 'Não é a sua vez.' });
      const a = Number(angle);
      if (!Number.isFinite(a)) return ack({ error: 'Tacada inválida.' });
      tacada(i, a, Math.max(0.05, Math.min(1, Number(power) || 0.5)) * MAX_POWER);
      ack({ ok: true });
      broadcast();
    });
    // Bola na mão: { x, y }
    socket.on('arcade-place', ({ x, y } = {}, ack = () => {}) => {
      const st = arcade.state;
      if (!st || arcade.game !== 'sinuca') return ack({ error: 'Sem jogo.' });
      const i = cadeira(me().id);
      if (i < 0 || st.turn !== i || st.phase !== 'aim' || !st.inHand) return ack({ error: 'Agora não dá para mover a branca.' });
      const cue = st.balls.find((b) => b.id === 0);
      const nx = Math.max(R, Math.min(W - R, Number(x) || 0));
      const ny = Math.max(R, Math.min(H - R, Number(y) || 0));
      if (st.balls.some((b) => b.id !== 0 && !b.in && Math.hypot(b.x - nx, b.y - ny) < 2 * R + 1)) return ack({ error: 'Tem bola aí.' });
      cue.x = nx; cue.y = ny; cue.in = false;
      ack({ ok: true });
      broadcast();
    });
  });

  return {
    pub,
    onLeave(chId, usersLeft) {
      if (arcade.room !== chId) return;
      if (usersLeft === 0) { voltarParaBots(); return; }
      if (limpaCadeiras()) broadcast();
    },
    onChannelDeleted(chId) { if (arcade.room === chId) voltarParaBots(); },
  };
};
