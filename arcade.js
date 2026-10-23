// 🕹️ Arcade King — bot de mini-jogos da chamada. Jogo 1: Sinuca (8 bolas).
// O servidor é o "juiz": roda a física das bolas e manda as posições para todo mundo
// (quem joga e quem só assiste veem a mesma mesa). Jogos originais, sem ROM de ninguém.

const W = 800; // mesa (área de jogo) em "pixels" lógicos
const H = 400;
const R = 11; // raio da bola
const POCKET_R = 19;
const DT = 1 / 120;
const FRICTION = 0.9935; // por passo (atrito do pano)
const STOP = 2; // abaixo disso a bola para (px/s)
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

function novoJogo() {
  return {
    balls: rackInicial(),
    turn: 0, // índice da cadeira (0/1)
    groups: [null, null], // 'lisa' | 'listrada' por cadeira
    inHand: true, // bola na mão (começo: atrás da linha, simplificado: qualquer lugar)
    phase: 'aim', // aim | moving | over
    winner: null,
    msg: 'Quebra! Arraste a partir da bola branca para dar a tacada.',
    shots: 0,
  };
}

module.exports = function setupArcade(io, { byId, socketsOf, BOTS_ROOM, broadcastChannels, rank, RANK }) {
  const arcade = { id: 'bot-arcade', name: 'Arcade King', avatar: 'p:arcade', room: null, game: null, seats: [null, null], state: null, timer: null };
  const pub = () => ({ id: arcade.id, name: arcade.name, avatar: arcade.avatar, room: arcade.room });
  const snapshot = () => ({
    id: arcade.id, name: arcade.name, avatar: arcade.avatar, room: arcade.room, game: arcade.game, seats: arcade.seats,
    state: arcade.state ? { ...arcade.state, balls: arcade.state.balls.map((b) => ({ id: b.id, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, in: b.in })) } : null,
    W, H, R, POCKET_R, serverNow: Date.now(),
  });
  const broadcast = () => io.emit('arcade', snapshot());
  const naSala = (uid) => !!arcade.room && socketsOf(uid).some((s) => s.data.channel === arcade.room);
  const cadeira = (uid) => arcade.seats.findIndex((s) => s && s.uid === uid);

  function pararJogo() {
    clearInterval(arcade.timer);
    arcade.timer = null;
    arcade.state = null;
    arcade.game = null;
    arcade.seats = [null, null];
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
    if (mudou && arcade.state && arcade.state.phase !== 'over') {
      const resta = arcade.seats.findIndex((s) => s);
      if (resta >= 0 && arcade.seats.filter(Boolean).length === 1) {
        arcade.state.phase = 'over';
        arcade.state.winner = resta;
        arcade.state.msg = `${arcade.seats[resta].name} venceu (o adversário saiu).`;
        clearInterval(arcade.timer);
        arcade.timer = null;
      }
    }
    return mudou;
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
      if (!emMovimento(st.balls) || ticks > 24 * 25) {
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
    const outro = 1 - seat;
    const nome = (i) => arcade.seats[i]?.name || 'Jogador';
    const novas = ev.pocketed.filter((id) => !antes.includes(id));
    const brancaCaiu = novas.includes(0);
    const oitoCaiu = novas.includes(8);
    const meuGrupo = st.groups[seat];
    const minhasFora = (g) => st.balls.filter((b) => grupoDe(b.id) === g && !b.in).length;

    // 8 caiu: ganhou se já limpou o grupo e não foi falta; senão perdeu
    if (oitoCaiu) {
      const limpou = meuGrupo && minhasFora(meuGrupo) === 0;
      st.phase = 'over';
      if (limpou && !brancaCaiu) { st.winner = seat; st.msg = `🎱 ${nome(seat)} encaçapou a 8 e venceu!`; }
      else { st.winner = outro; st.msg = `💀 ${nome(seat)} derrubou a 8 antes da hora. ${nome(outro)} venceu!`; }
      return;
    }
    // define os grupos na primeira bola encaçapada (fora a quebra com branca)
    if (!st.groups[0] && !st.groups[1]) {
      const primeira = novas.find((id) => id !== 0 && id !== 8);
      if (primeira != null && !brancaCaiu) {
        st.groups[seat] = grupoDe(primeira);
        st.groups[outro] = grupoDe(primeira) === 'lisa' ? 'listrada' : 'lisa';
      }
    }
    // faltas
    let falta = null;
    if (brancaCaiu) falta = 'A branca caiu';
    else if (ev.firstHit == null) falta = 'Não tocou em nenhuma bola';
    else if (st.groups[seat]) {
      const g = grupoDe(ev.firstHit);
      const precisaOito = minhasFora(st.groups[seat]) === 0;
      if (precisaOito ? g !== 'oito' : g !== st.groups[seat]) falta = `Tocou primeiro numa bola ${g === 'oito' ? 'oito' : g}`;
    } else if (grupoDe(ev.firstHit) === 'oito' && st.shots > 1) falta = 'Tocou primeiro na 8';
    const encaçapouMinha = novas.some((id) => id !== 0 && id !== 8 && (!st.groups[seat] || grupoDe(id) === st.groups[seat]));
    if (falta) {
      if (brancaCaiu) { const cue = st.balls.find((b) => b.id === 0); cue.in = false; cue.x = W * 0.25; cue.y = H / 2; }
      st.turn = outro;
      st.inHand = true;
      st.msg = `Falta de ${nome(seat)}: ${falta}. ${nome(outro)} joga com a bola na mão.`;
    } else if (encaçapouMinha) {
      st.turn = seat;
      st.msg = `${nome(seat)} encaçapou e continua.`;
    } else {
      st.turn = outro;
      st.msg = `Vez de ${nome(outro)}.`;
    }
    st.phase = 'aim';
    const g = st.groups[st.turn];
    if (g) {
      const resta = minhasFora(g);
      st.msg += resta === 0 ? ` Agora é a 8!` : ` (${g === 'lisa' ? 'lisas' : 'listradas'}, faltam ${resta})`;
    }
  }

  io.on('connection', (socket) => {
    const me = () => socket.data.user;
    const isMod = () => RANK[me().role] >= RANK.mod;
    socket.emit('arcade', snapshot());
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
      if (game !== 'sinuca') return ack({ error: 'Jogo desconhecido.' });
      pararJogo();
      arcade.game = game;
      arcade.state = novoJogo();
      ack({ ok: true });
      broadcast();
    });
    socket.on('arcade-sit', (_d, ack = () => {}) => {
      if (!naSala(me().id)) return ack({ error: 'Entre na chamada com o Arcade para jogar.' });
      if (!arcade.game) return ack({ error: 'Escolha um jogo primeiro.' });
      limpaCadeiras();
      if (cadeira(me().id) >= 0) return ack({ ok: true });
      const livre = arcade.seats.findIndex((s) => !s);
      if (livre < 0) return ack({ error: 'As duas cadeiras estão ocupadas. Espere a partida acabar.' });
      arcade.seats[livre] = { uid: me().id, name: me().name, avatar: me().avatar };
      // partida nova quando os dois sentam
      if (arcade.seats.every(Boolean) && arcade.state?.phase === 'over') arcade.state = novoJogo();
      ack({ ok: true });
      broadcast();
    });
    socket.on('arcade-stand', (_d, ack = () => {}) => {
      const i = cadeira(me().id);
      if (i < 0) return ack({ ok: true });
      arcade.seats[i] = null;
      if (arcade.state && arcade.state.phase !== 'over' && arcade.seats[1 - i]) {
        arcade.state.phase = 'over';
        arcade.state.winner = 1 - i;
        arcade.state.msg = `${arcade.seats[1 - i].name} venceu (o adversário desistiu).`;
        clearInterval(arcade.timer);
        arcade.timer = null;
      }
      ack({ ok: true });
      broadcast();
    });
    socket.on('arcade-reset', (_d, ack = () => {}) => {
      if (!pode()) return ack({ error: 'Só quem está na chamada pode reiniciar.' });
      if (!arcade.game) return ack({ error: 'Escolha um jogo.' });
      clearInterval(arcade.timer);
      arcade.timer = null;
      arcade.state = novoJogo();
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
      if (!arcade.seats.every(Boolean)) return ack({ error: 'Esperando o segundo jogador sentar.' });
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
