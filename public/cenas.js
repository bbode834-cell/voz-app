// Cenários do palco: usado pelo site (app.js) e pelo servidor (/cena/*.svg para o aplicativo)
(function (raiz) {
// ---- 🎭 Palco: cenários (ar livre, teatro, estádio, cinema particular). A plateia vira avatar sentado ----
// Gerador de números "aleatórios" fixo por sala: as estrelas e os assentos ficam sempre no mesmo lugar
function semente(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
function assentoSVG(tipo, cor) {
  // vistos de trás, simples e coloridos
  if (tipo === 'poltrona') return `<svg viewBox="0 0 80 60"><rect x="8" y="6" width="64" height="40" rx="12" fill="${cor}"/><rect x="2" y="28" width="76" height="22" rx="8" fill="${cor}" style="filter:brightness(.8)"/><rect x="10" y="48" width="8" height="10" rx="2" fill="#3b2a1a"/><rect x="62" y="48" width="8" height="10" rx="2" fill="#3b2a1a"/></svg>`;
  if (tipo === 'puff') return `<svg viewBox="0 0 80 60"><ellipse cx="40" cy="44" rx="36" ry="14" fill="${cor}" style="filter:brightness(.75)"/><path d="M8 40 Q10 10 40 8 Q70 10 72 40 Q60 50 40 50 Q20 50 8 40Z" fill="${cor}"/></svg>`;
  if (tipo === 'praia') return `<svg viewBox="0 0 80 60"><path d="M14 10 L66 10 L62 40 L18 40 Z" fill="${cor}"/><rect x="6" y="38" width="68" height="10" rx="5" fill="${cor}" style="filter:brightness(.8)"/><path d="M12 10 L6 58 M68 10 L74 58 M10 48 L22 58 M70 48 L58 58" stroke="#d4a373" stroke-width="3" stroke-linecap="round"/></svg>`;
  if (tipo === 'tapete') return `<svg viewBox="0 0 80 60"><rect x="2" y="30" width="76" height="24" rx="10" fill="${cor}" opacity=".9"/><rect x="10" y="36" width="60" height="12" rx="6" fill="${cor}" style="filter:brightness(.8)"/></svg>`;
  // teatro: poltrona de veludo com friso dourado
  if (tipo === 'veludo') return `<svg viewBox="0 0 80 60"><rect x="10" y="4" width="60" height="44" rx="14" fill="${cor}"/><rect x="14" y="8" width="52" height="36" rx="11" fill="none" stroke="#f3c969" stroke-width="2" opacity=".8"/><rect x="2" y="30" width="76" height="22" rx="7" fill="${cor}" style="filter:brightness(.72)"/><rect x="2" y="30" width="76" height="4" fill="#f3c969" opacity=".7"/><rect x="8" y="50" width="10" height="8" rx="2" fill="#5a3b1f"/><rect x="62" y="50" width="10" height="8" rx="2" fill="#5a3b1f"/></svg>`;
  // estádio: cadeira de plástico da arquibancada
  if (tipo === 'arquibancada') return `<svg viewBox="0 0 80 60"><rect x="12" y="4" width="56" height="40" rx="8" fill="${cor}"/><rect x="18" y="10" width="44" height="6" rx="3" fill="#000" opacity=".15"/><rect x="18" y="20" width="44" height="6" rx="3" fill="#000" opacity=".15"/><rect x="6" y="36" width="68" height="16" rx="5" fill="${cor}" style="filter:brightness(.78)"/><rect x="2" y="52" width="76" height="6" rx="2" fill="#6b7280"/></svg>`;
  // sala de estar: pedaço de sofá visto de trás (encosto + assento + braços)
  if (tipo === 'sofa') return `<svg viewBox="0 0 80 60"><rect x="4" y="6" width="72" height="34" rx="10" fill="${cor}"/><rect x="4" y="6" width="72" height="34" rx="10" fill="#000" opacity=".08"/><rect x="0" y="30" width="80" height="22" rx="8" fill="${cor}" style="filter:brightness(.82)"/><rect x="0" y="26" width="10" height="26" rx="5" fill="${cor}" style="filter:brightness(.9)"/><rect x="70" y="26" width="10" height="26" rx="5" fill="${cor}" style="filter:brightness(.9)"/><rect x="10" y="52" width="6" height="6" fill="#5a3b1f"/><rect x="64" y="52" width="6" height="6" fill="#5a3b1f"/></svg>`;
  // TalKing: cadeira de vidro com borda neon
  if (tipo === 'neon') return `<svg viewBox="0 0 80 60"><defs><linearGradient id="nk-${cor.slice(1)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs><rect x="10" y="4" width="60" height="42" rx="16" fill="${cor}" opacity=".55"/><rect x="10" y="4" width="60" height="42" rx="16" fill="none" stroke="url(#nk-${cor.slice(1)})" stroke-width="2.5"/><rect x="2" y="30" width="76" height="22" rx="9" fill="${cor}" opacity=".7"/><rect x="2" y="30" width="76" height="22" rx="9" fill="none" stroke="url(#nk-${cor.slice(1)})" stroke-width="2.5"/><ellipse cx="40" cy="57" rx="22" ry="3" fill="#22d3ee" opacity=".5"/></svg>`;
  // cinema particular: poltrona reclinável de couro com porta-copos
  return `<svg viewBox="0 0 80 60"><rect x="8" y="2" width="64" height="46" rx="16" fill="${cor}"/><path d="M20 10 Q40 4 60 10" stroke="#000" stroke-width="2" opacity=".25" fill="none"/><rect x="0" y="30" width="80" height="24" rx="9" fill="${cor}" style="filter:brightness(.7)"/><circle cx="8" cy="36" r="4" fill="#111"/><circle cx="72" cy="36" r="4" fill="#111"/><rect x="24" y="52" width="32" height="6" rx="2" fill="#1f1f1f"/></svg>`;
}
function estrelasSVG(rnd, n, ymax) { let s = ''; for (let i = 0; i < n; i++) { const x = rnd() * 1000, y = rnd() * ymax, r = 0.6 + rnd() * 1.6; s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#fff" opacity="${(0.4 + rnd() * 0.6).toFixed(2)}"/>`; } return s; }
// Cada cenário: desenho (1000x640), retângulo interno da telona (onde a transmissão aparece), fileiras da plateia e os assentos
const CENAS = {
  'ar-livre': {
    nome: 'Ar livre', emoji: '🌙', desc: 'Telona na grama, lua e estrelas',
    tela: { x: 152, y: 42, w: 696, h: 386 },
    porta: { x: 3, y: 82 }, // entra pela lateral da grama
    filas: [{ y: 95, k: 1, cap: 6 }, { y: 87, k: 0.86, cap: 7 }, { y: 80, k: 0.74, cap: 8 }, { y: 74, k: 0.64, cap: 9 }],
    assentos: ['poltrona', 'puff', 'praia', 'tapete'], cores: ['#e85d9a', '#f59e0b', '#38bdf8', '#a78bfa', '#34d399', '#fb7185', '#facc15'],
    svg(rnd) {
      const arvore = (x, y, k, cor) => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-6" y="0" width="12" height="70" fill="#120a2a"/><ellipse cx="0" cy="-10" rx="46" ry="38" fill="${cor}"/><ellipse cx="-22" cy="10" rx="34" ry="28" fill="${cor}"/><ellipse cx="24" cy="12" rx="34" ry="28" fill="${cor}"/><ellipse cx="0" cy="-40" rx="30" ry="26" fill="${cor}"/></g>`;
      const moita = (x, y, k) => `<ellipse cx="${x}" cy="${y}" rx="${34 * k}" ry="${16 * k}" fill="#143d2a"/>`;
      return `<defs>
      <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0624"/><stop offset=".6" stop-color="#2a1056"/><stop offset="1" stop-color="#6b2a8a"/></linearGradient>
      <linearGradient id="grama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f7a44"/><stop offset="1" stop-color="#0f4a2a"/></linearGradient>
      <radialGradient id="lua" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff8d6"/><stop offset=".7" stop-color="#ffe9a3"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient>
      <linearGradient id="feixe" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="1000" height="640" fill="url(#ceu)"/>
    ${estrelasSVG(rnd, 80, 420)}
    <circle cx="80" cy="64" r="40" fill="url(#lua)"/><circle cx="80" cy="64" r="26" fill="#fff6cf"/>
    <path d="M0 460 Q500 400 1000 460 L1000 640 L0 640Z" fill="#1a0f3a"/>
    ${arvore(70, 380, 1.0, '#17123a')}${arvore(940, 390, 0.95, '#17123a')}${arvore(130, 430, .55, '#1b1545')}${arvore(880, 432, .55, '#1b1545')}
    <path d="M0 478 Q250 450 500 470 Q750 490 1000 470 L1000 640 L0 640Z" fill="url(#grama)"/>
    ${moita(50, 490, 1)}${moita(950, 496, 1.1)}${moita(280, 484, .7)}${moita(720, 488, .8)}
    <polygon points="500,630 152,44 848,44" fill="url(#feixe)"/>
    <rect x="300" y="420" width="14" height="62" fill="#2b2140"/><rect x="686" y="420" width="14" height="62" fill="#2b2140"/>
    <rect x="140" y="30" width="720" height="410" rx="8" fill="#120b26"/>
    <rect x="152" y="42" width="696" height="386" rx="4" fill="#0a0716"/>`;
    },
  },
  teatro: {
    nome: 'Teatro', emoji: '🎭', desc: 'Cortinas de veludo, arco dourado e lustre',
    tela: { x: 152, y: 42, w: 696, h: 386 },
    porta: { x: 3, y: 92 }, // entra pelo corredor lateral
    filas: [{ y: 96, k: 1, cap: 6 }, { y: 88, k: 0.86, cap: 7 }, { y: 81, k: 0.74, cap: 8 }, { y: 75, k: 0.64, cap: 9 }],
    assentos: ['veludo'], cores: ['#9f1239', '#b91c1c', '#881337', '#a21caf', '#7f1d1d'],
    svg(rnd) {
      let pregas = '';
      for (let i = 0; i < 7; i++) { const x = 8 + i * 20; pregas += `<path d="M${x} 0 Q${x + 10} 220 ${x + 4} 470" stroke="#5a0a1a" stroke-width="7" fill="none" opacity=".55"/><path d="M${1000 - x} 0 Q${990 - x} 220 ${996 - x} 470" stroke="#5a0a1a" stroke-width="7" fill="none" opacity=".55"/>`; }
      let luzes = '';
      for (let i = 0; i < 12; i++) { const x = 170 + i * 60; luzes += `<ellipse cx="${x}" cy="478" rx="26" ry="10" fill="#ffd27a" opacity=".22"/><circle cx="${x}" cy="482" r="4" fill="#ffe9a3"/>`; }
      let cristais = '';
      for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; cristais += `<line x1="500" y1="30" x2="${(500 + Math.cos(a) * 48).toFixed(0)}" y2="${(30 + Math.sin(a) * 26 + 10).toFixed(0)}" stroke="#f3c969" stroke-width="1.5"/><circle cx="${(500 + Math.cos(a) * 48).toFixed(0)}" cy="${(30 + Math.sin(a) * 26 + 12).toFixed(0)}" r="4" fill="#fff3c4"/>`; }
      return `<defs>
      <linearGradient id="t-parede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0508"/><stop offset="1" stop-color="#3a0b14"/></linearGradient>
      <linearGradient id="t-cortina" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a0f22"/><stop offset=".5" stop-color="#b3182f"/><stop offset="1" stop-color="#6e0c1d"/></linearGradient>
      <linearGradient id="t-piso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b3a1e"/><stop offset="1" stop-color="#2a1708"/></linearGradient>
      <linearGradient id="t-ouro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3c969"/><stop offset=".5" stop-color="#b8860b"/><stop offset="1" stop-color="#f3c969"/></linearGradient>
    </defs>
    <rect width="1000" height="640" fill="url(#t-parede)"/>
    <!-- lustre -->
    <line x1="500" y1="0" x2="500" y2="26" stroke="#f3c969" stroke-width="2"/>${cristais}<circle cx="500" cy="30" r="9" fill="#ffe9a3"/><ellipse cx="500" cy="46" rx="70" ry="22" fill="#ffd27a" opacity=".12"/>
    <!-- piso do palco -->
    <path d="M0 470 L1000 470 L1000 640 L0 640Z" fill="url(#t-piso)"/>
    <path d="M0 470 L1000 470" stroke="#f3c969" stroke-width="3"/>
    ${luzes}
    <!-- arco dourado -->
    <rect x="128" y="18" width="744" height="434" rx="14" fill="none" stroke="url(#t-ouro)" stroke-width="12"/>
    <rect x="140" y="30" width="720" height="410" rx="8" fill="#120b26"/>
    <rect x="152" y="42" width="696" height="386" rx="4" fill="#0a0716"/>
    <!-- cortinas laterais -->
    <path d="M0 0 L150 0 Q120 230 165 470 L0 470Z" fill="url(#t-cortina)"/>
    <path d="M1000 0 L850 0 Q880 230 835 470 L1000 470Z" fill="url(#t-cortina)"/>
    ${pregas}
    <path d="M110 300 Q160 330 150 370" stroke="#f3c969" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M890 300 Q840 330 850 370" stroke="#f3c969" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M0 0 L1000 0 L1000 36 Q750 70 500 50 Q250 70 0 36Z" fill="#8a1127"/><path d="M0 36 Q250 70 500 50 Q750 70 1000 36" stroke="#f3c969" stroke-width="5" fill="none"/>`;
    },
  },
  estadio: {
    nome: 'Estádio', emoji: '🏟️', desc: 'Telão gigante, holofotes e arquibancada',
    tela: { x: 162, y: 60, w: 676, h: 370 },
    porta: { x: 3, y: 90 }, // entra pelo túnel da arquibancada
    filas: [{ y: 97, k: 1, cap: 7 }, { y: 90, k: 0.88, cap: 8 }, { y: 84, k: 0.78, cap: 9 }, { y: 79, k: 0.68, cap: 10 }],
    assentos: ['arquibancada'], cores: ['#2563eb', '#dc2626', '#facc15', '#16a34a', '#f97316', '#e5e7eb'],
    svg(rnd) {
      let torcida = '';
      for (let i = 0; i < 260; i++) { const x = rnd() * 1000, y = 300 + rnd() * 150; torcida += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2.2 + rnd() * 2).toFixed(1)}" fill="${['#f87171', '#60a5fa', '#fde047', '#e5e7eb', '#4ade80'][Math.floor(rnd() * 5)]}" opacity=".85"/>`; }
      const torre = (x) => `<rect x="${x - 6}" y="60" width="12" height="260" fill="#374151"/><rect x="${x - 52}" y="40" width="104" height="30" rx="4" fill="#1f2937"/><rect x="${x - 46}" y="46" width="92" height="18" fill="#fff8d6"/><polygon points="${x - 60},70 ${x + 60},70 ${x + 260},640 ${x - 260},640" fill="#fff" opacity=".07"/>`;
      let linhas = '';
      for (let i = 0; i < 9; i++) linhas += `<line x1="0" y1="${500 + i * 18}" x2="1000" y2="${500 + i * 18}" stroke="#fff" stroke-width="1" opacity="${i % 2 ? .06 : .12}"/>`;
      return `<defs>
      <linearGradient id="e-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset="1" stop-color="#1e3a5f"/></linearGradient>
      <linearGradient id="e-campo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15803d"/><stop offset="1" stop-color="#14532d"/></linearGradient>
      <linearGradient id="e-aco" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b7280"/><stop offset=".5" stop-color="#d1d5db"/><stop offset="1" stop-color="#6b7280"/></linearGradient>
    </defs>
    <rect width="1000" height="640" fill="url(#e-ceu)"/>
    ${estrelasSVG(rnd, 50, 260)}
    ${torre(60)}${torre(940)}
    <!-- arquibancada do outro lado -->
    <path d="M0 300 L1000 300 L1000 460 L0 460Z" fill="#1f2937"/>
    <path d="M0 330 L1000 330 M0 360 L1000 360 M0 390 L1000 390 M0 420 L1000 420" stroke="#111827" stroke-width="4"/>
    ${torcida}
    <rect x="0" y="456" width="1000" height="14" fill="#0f172a"/>
    <!-- campo -->
    <path d="M0 470 L1000 470 L1000 640 L0 640Z" fill="url(#e-campo)"/>
    ${linhas}
    <line x1="0" y1="490" x2="1000" y2="490" stroke="#fff" stroke-width="3" opacity=".8"/><circle cx="500" cy="490" r="80" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>
    <!-- telão suspenso -->
    <rect x="300" y="0" width="10" height="46" fill="url(#e-aco)"/><rect x="690" y="0" width="10" height="46" fill="url(#e-aco)"/>
    <rect x="148" y="44" width="704" height="402" rx="10" fill="#111827" stroke="url(#e-aco)" stroke-width="8"/>
    <rect x="162" y="60" width="676" height="370" rx="4" fill="#030712"/>
    <rect x="300" y="446" width="400" height="10" rx="3" fill="#374151"/>`;
    },
  },
  cinema: {
    nome: 'Cinema particular', emoji: '🍿', desc: 'Sala escura, poltronas de couro e luzes de parede',
    tela: { x: 152, y: 42, w: 696, h: 386 },
    porta: { x: 3, y: 92 }, // entra pela porta lateral (lado da placa SAÍDA)
    filas: [{ y: 96, k: 1, cap: 5 }, { y: 88, k: 0.86, cap: 6 }, { y: 81, k: 0.74, cap: 7 }, { y: 75, k: 0.64, cap: 8 }],
    assentos: ['reclinavel'], cores: ['#3f3f46', '#44403c', '#7f1d1d', '#1e293b', '#292524'],
    svg(rnd) {
      let teto = '';
      for (let i = 0; i < 40; i++) { const x = rnd() * 1000, y = rnd() * 24; teto += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.8 + rnd()).toFixed(1)}" fill="#fff" opacity=".6"/>`; }
      const arandela = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="40" ry="70" fill="#ffb366" opacity=".16"/><path d="M${x - 12} ${y} L${x + 12} ${y} L${x + 8} ${y - 22} L${x - 8} ${y - 22}Z" fill="#ffd9a8"/><rect x="${x - 3}" y="${y}" width="6" height="14" fill="#8a6a3a"/>`;
      let carpete = '';
      for (let i = 0; i < 14; i++) carpete += `<path d="M${i * 80 - 40} 640 L${i * 80 + 20} 478 L${i * 80 + 36} 478 L${i * 80 + 10} 640Z" fill="#000" opacity=".12"/>`;
      return `<defs>
      <linearGradient id="c-parede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0608"/><stop offset="1" stop-color="#2a1218"/></linearGradient>
      <linearGradient id="c-carpete" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a1020"/><stop offset="1" stop-color="#1b0609"/></linearGradient>
      <linearGradient id="c-cortina" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b0a14"/><stop offset=".5" stop-color="#6e1225"/><stop offset="1" stop-color="#3b0a14"/></linearGradient>
    </defs>
    <rect width="1000" height="640" fill="url(#c-parede)"/>
    ${teto}
    <!-- carpete -->
    <path d="M0 478 L1000 478 L1000 640 L0 640Z" fill="url(#c-carpete)"/>${carpete}
    <!-- luzes de parede -->
    ${arandela(60, 250)}${arandela(940, 250)}${arandela(60, 420)}${arandela(940, 420)}
    <!-- placa de saída -->
    <rect x="18" y="40" width="64" height="26" rx="4" fill="#064e3b"/><text x="50" y="59" font-size="16" font-family="sans-serif" font-weight="700" fill="#6ee7b7" text-anchor="middle">SAÍDA</text>
    <!-- caixas de som -->
    <rect x="96" y="150" width="34" height="120" rx="6" fill="#111"/><circle cx="113" cy="180" r="10" fill="#222"/><circle cx="113" cy="235" r="12" fill="#222"/>
    <rect x="870" y="150" width="34" height="120" rx="6" fill="#111"/><circle cx="887" cy="180" r="10" fill="#222"/><circle cx="887" cy="235" r="12" fill="#222"/>
    <!-- cortinas meio abertas -->
    <path d="M110 20 L170 20 Q150 240 180 450 L110 450Z" fill="url(#c-cortina)"/><path d="M890 20 L830 20 Q850 240 820 450 L890 450Z" fill="url(#c-cortina)"/>
    <!-- tela -->
    <rect x="140" y="30" width="720" height="410" rx="6" fill="#000"/>
    <rect x="152" y="42" width="696" height="386" rx="3" fill="#07070a"/>
    <rect x="140" y="438" width="720" height="6" fill="#ffb366" opacity=".25"/>
    <!-- luzinhas do corredor -->
    <circle cx="500" cy="500" r="3" fill="#ffd9a8"/><circle cx="500" cy="540" r="3" fill="#ffd9a8"/><circle cx="500" cy="585" r="3" fill="#ffd9a8"/><circle cx="500" cy="628" r="3" fill="#ffd9a8"/>`;
    },
  },
  talking: {
    nome: 'TalKing', emoji: '👑', desc: 'Vidro e neon, na cara do TalKing',
    tela: { x: 152, y: 48, w: 696, h: 386 },
    porta: { x: 3, y: 88 }, // entra pelo lado do pilar
    filas: [{ y: 96, k: 1, cap: 6 }, { y: 88, k: 0.86, cap: 7 }, { y: 81, k: 0.74, cap: 8 }, { y: 75, k: 0.64, cap: 9 }],
    assentos: ['neon'], cores: ['#1c1450', '#2a1a6e', '#141a4a', '#2a0f5c', '#101c3a'],
    svg(rnd) {
      let grade = '';
      for (let i = -6; i <= 16; i++) grade += `<line x1="${500 + (i - 5) * 60}" y1="640" x2="${500 + (i - 5) * 14}" y2="470" stroke="#22d3ee" stroke-width="1.2" opacity=".35"/>`;
      for (let i = 0; i < 8; i++) { const y = 470 + Math.pow(i / 7, 1.8) * 170; grade += `<line x1="0" y1="${y.toFixed(0)}" x2="1000" y2="${y.toFixed(0)}" stroke="#8b5cf6" stroke-width="1.2" opacity="${(0.25 + i * 0.06).toFixed(2)}"/>`; }
      let particulas = '';
      for (let i = 0; i < 60; i++) { const x = rnd() * 1000, y = rnd() * 460, r = 0.8 + rnd() * 2; particulas += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${['#22d3ee', '#8b5cf6', '#f472b6', '#fff'][Math.floor(rnd() * 4)]}" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`; }
      const pilar = (x) => `<rect x="${x - 10}" y="60" width="20" height="410" rx="10" fill="#1c1450" opacity=".8"/><rect x="${x - 10}" y="60" width="20" height="410" rx="10" fill="none" stroke="url(#k-neon)" stroke-width="2"/><rect x="${x - 3}" y="80" width="6" height="370" rx="3" fill="url(#k-neon)" filter="url(#k-blur)"/>`;
      return `<defs>
      <linearGradient id="k-fundo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070416"/><stop offset="1" stop-color="#140c3a"/></linearGradient>
      <linearGradient id="k-neon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#f472b6"/></linearGradient>
      <linearGradient id="k-piso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0726"/><stop offset="1" stop-color="#1a1050"/></linearGradient>
      <radialGradient id="k-glow1" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#22d3ee" stop-opacity=".35"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
      <radialGradient id="k-glow2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f472b6" stop-opacity=".3"/><stop offset="1" stop-color="#f472b6" stop-opacity="0"/></radialGradient>
      <filter id="k-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <rect width="1000" height="640" fill="url(#k-fundo)"/>
    <ellipse cx="80" cy="60" rx="320" ry="240" fill="url(#k-glow1)"/><ellipse cx="960" cy="600" rx="340" ry="260" fill="url(#k-glow2)"/>
    ${particulas}
    <!-- piso de vidro com grade neon -->
    <path d="M0 470 L1000 470 L1000 640 L0 640Z" fill="url(#k-piso)"/>
    ${grade}
    <line x1="0" y1="470" x2="1000" y2="470" stroke="url(#k-neon)" stroke-width="3"/><line x1="0" y1="470" x2="1000" y2="470" stroke="url(#k-neon)" stroke-width="10" opacity=".5" filter="url(#k-blur)"/>
    ${pilar(60)}${pilar(940)}
    <!-- coroa neon em cima da telona -->
    <g transform="translate(470 6) scale(2.6)"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8z" fill="none" stroke="url(#k-neon)" stroke-width="2.2" stroke-linejoin="round" filter="url(#k-blur)" opacity=".9"/><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8z" fill="#1c1450" stroke="url(#k-neon)" stroke-width="2" stroke-linejoin="round"/></g>
    <!-- telona de vidro com moldura neon -->
    <rect x="136" y="32" width="728" height="418" rx="18" fill="url(#k-neon)" opacity=".55" filter="url(#k-blur)"/>
    <rect x="140" y="36" width="720" height="410" rx="14" fill="#0b0726" stroke="url(#k-neon)" stroke-width="3"/>
    <rect x="152" y="48" width="696" height="386" rx="8" fill="#06040f"/>
    <rect x="140" y="446" width="720" height="4" fill="url(#k-neon)" opacity=".8"/>`;
    },
  },
  sala: {
    nome: 'Sala de estar (fumantes)', emoji: '🚬', desc: 'Sala vidro e neon, TV na parede; cada um entra pela porta e senta',
    tela: { x: 244, y: 40, w: 512, h: 288 },
    porta: { x: 6, y: 66 }, // de onde o avatar entra (em % da cena)
    palcoPos: [{ left: '25%', top: '60%' }, { left: '77%', top: '60%' }], // quem está no palco fica do lado do rack
    fumar: true,
    cinzeiro: { x: 50, y: 73 }, // onde o baseado é jogado no fim (em % da cena)
    filas: [{ y: 97, k: 1, cap: 5 }, { y: 86, k: 0.86, cap: 6 }, { y: 77, k: 0.74, cap: 7 }, { y: 70, k: 0.64, cap: 8 }],
    assentos: ['sofa', 'sofa', 'puff'], cores: ['#5b4bd6', '#2a9ec9', '#c2429a', '#3b3f8f', '#7c5cff'],
    svg(rnd) {
      let livros = '';
      for (let i = 0; i < 9; i++) { const x = 124 + (i % 3) * 15, y = 150 + Math.floor(i / 3) * 76; livros += `<rect x="${x}" y="${y}" width="11" height="${34 + rnd() * 16}" rx="2" fill="${['#22d3ee', '#8b5cf6', '#f472b6', '#a5f3fc'][Math.floor(rnd() * 4)]}" opacity=".9"/>`; }
      let estrelas = '';
      for (let i = 0; i < 16; i++) estrelas += `<circle cx="${(828 + rnd() * 154).toFixed(0)}" cy="${(64 + rnd() * 160).toFixed(0)}" r="${(1 + rnd() * 1.4).toFixed(1)}" fill="#fff" opacity=".8"/>`;
      let grade = '';
      for (let i = 0; i < 9; i++) grade += `<line x1="${110 + i * 97}" y1="520" x2="${60 + i * 110}" y2="640" stroke="#22d3ee" stroke-width="1" opacity=".18"/>`;
      for (let i = 0; i < 4; i++) grade += `<line x1="0" y1="${520 + i * 40}" x2="1000" y2="${520 + i * 40}" stroke="#8b5cf6" stroke-width="1" opacity=".18"/>`;
      return `<defs>
      <linearGradient id="s-parede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0820"/><stop offset="1" stop-color="#1a1448"/></linearGradient>
      <linearGradient id="s-piso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17123f"/><stop offset="1" stop-color="#0b0826"/></linearGradient>
      <linearGradient id="s-neon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#f472b6"/></linearGradient>
      <radialGradient id="s-tvluz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".45"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
      <radialGradient id="s-luz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#22d3ee" stop-opacity=".35"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
      <filter id="s-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <rect width="1000" height="640" fill="url(#s-parede)"/>
    <!-- fita de LED no teto -->
    <rect x="0" y="0" width="1000" height="4" fill="url(#s-neon)"/><rect x="0" y="0" width="1000" height="10" fill="url(#s-neon)" opacity=".5" filter="url(#s-blur)"/>
    <!-- piso de vidro -->
    <path d="M0 440 L1000 440 L1000 640 L0 640Z" fill="url(#s-piso)"/>
    <rect x="0" y="438" width="1000" height="3" fill="url(#s-neon)"/><rect x="0" y="434" width="1000" height="10" fill="url(#s-neon)" opacity=".45" filter="url(#s-blur)"/>
    ${grade}
    <ellipse cx="500" cy="600" rx="400" ry="80" fill="#2a1f6e" opacity=".55"/><ellipse cx="500" cy="600" rx="400" ry="80" fill="none" stroke="url(#s-neon)" stroke-width="2" opacity=".7"/>
    <!-- porta de vidro (por onde todo mundo entra), encostada na parede da esquerda -->
    <rect x="14" y="222" width="92" height="220" rx="6" fill="#1c1450"/><rect x="14" y="222" width="92" height="220" rx="6" fill="none" stroke="url(#s-neon)" stroke-width="3"/>
    <rect x="24" y="232" width="72" height="200" rx="4" fill="#22d3ee" opacity=".12"/><line x1="60" y1="232" x2="60" y2="432" stroke="#22d3ee" stroke-width="1" opacity=".4"/>
    <rect x="84" y="320" width="5" height="26" rx="2" fill="#f472b6"/>
    <!-- estante de vidro ao lado da porta, em pé no chão -->
    <rect x="116" y="136" width="54" height="304" rx="4" fill="#120e36"/><rect x="116" y="136" width="54" height="304" rx="4" fill="none" stroke="url(#s-neon)" stroke-width="2"/>
    <rect x="116" y="208" width="54" height="3" fill="#22d3ee" opacity=".8"/><rect x="116" y="284" width="54" height="3" fill="#8b5cf6" opacity=".8"/><rect x="116" y="360" width="54" height="3" fill="#f472b6" opacity=".8"/>
    ${livros}
    <rect x="124" y="378" width="38" height="50" rx="4" fill="#2a1f6e"/><circle cx="143" cy="403" r="9" fill="#22d3ee" opacity=".8"/>
    <!-- abajur de pé neon -->
    <rect x="198" y="150" width="5" height="286" fill="#9aa5c9"/><path d="M176 150 L226 150 L217 96 L185 96Z" fill="#1c1450" stroke="#22d3ee" stroke-width="2"/><ellipse cx="201" cy="150" rx="25" ry="5" fill="#22d3ee" opacity=".8"/>
    <ellipse cx="201" cy="230" rx="80" ry="130" fill="url(#s-luz)"/><path d="M180 436 L222 436 L214 426 L188 426Z" fill="#9aa5c9"/>
    <!-- relógio -->
    <circle cx="150" cy="60" r="22" fill="#120e36" stroke="#8b5cf6" stroke-width="3"/><line x1="150" y1="60" x2="150" y2="46" stroke="#a5f3fc" stroke-width="3"/><line x1="150" y1="60" x2="161" y2="65" stroke="#a5f3fc" stroke-width="3"/>
    <!-- TV na parede com LED atrás + rack de vidro -->
    <ellipse cx="500" cy="190" rx="360" ry="230" fill="url(#s-tvluz)"/>
    <rect x="224" y="20" width="552" height="328" rx="12" fill="url(#s-neon)" opacity=".7" filter="url(#s-blur)"/>
    <rect x="230" y="26" width="540" height="316" rx="8" fill="#0b0826" stroke="url(#s-neon)" stroke-width="2"/>
    <rect x="244" y="40" width="512" height="288" rx="3" fill="#06040f"/>
    <!-- rack de vidro, bem abaixo da TV -->
    <rect x="340" y="384" width="320" height="50" rx="6" fill="#1c1450"/><rect x="340" y="384" width="320" height="50" rx="6" fill="none" stroke="url(#s-neon)" stroke-width="2"/>
    <rect x="470" y="396" width="60" height="26" rx="3" fill="#0b0826"/><circle cx="486" cy="409" r="3" fill="#22d3ee"/><circle cx="498" cy="409" r="3" fill="#f472b6"/>
    <rect x="364" y="398" width="34" height="22" rx="3" fill="#2a1f6e"/><rect x="602" y="398" width="34" height="22" rx="3" fill="#2a1f6e"/>
    <!-- caixa de som em cima do rack -->
    <rect x="350" y="352" width="14" height="32" rx="3" fill="#0b0826" stroke="#22d3ee" stroke-width="1"/><circle cx="357" cy="360" r="3" fill="#22d3ee"/>
    <!-- planta neon no chão, ao lado do rack -->
    <rect x="690" y="400" width="30" height="36" rx="4" fill="#1c1450" stroke="#8b5cf6" stroke-width="1.5"/><path d="M705 400 Q680 372 695 350 Q705 376 705 400 Q715 368 735 358 Q720 386 705 400Z" fill="#34d399"/>
    <!-- letreiro neon TalKing (coroa) + prateleiras à direita -->
    <g transform="translate(760 54) scale(2)"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8z" fill="none" stroke="url(#s-neon)" stroke-width="2" stroke-linejoin="round" filter="url(#s-blur)"/><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8z" fill="#1c1450" stroke="url(#s-neon)" stroke-width="1.8" stroke-linejoin="round"/></g>
    <rect x="700" y="130" width="100" height="6" rx="3" fill="url(#s-neon)" opacity=".9"/><rect x="730" y="190" width="100" height="6" rx="3" fill="url(#s-neon)" opacity=".9"/>
    <rect x="712" y="106" width="26" height="24" rx="3" fill="#22d3ee" opacity=".8"/><rect x="746" y="110" width="12" height="20" fill="#f472b6"/><rect x="760" y="112" width="12" height="18" fill="#8b5cf6"/>
    <path d="M770 190 Q755 160 770 146 Q780 168 790 150 Q792 172 780 190Z" fill="#34d399"/><rect x="760" y="184" width="30" height="8" rx="2" fill="#2a1f6e"/>
    <!-- janela com moldura neon -->
    <rect x="824" y="60" width="160" height="196" rx="6" fill="#06040f"/>${estrelas}<circle cx="930" cy="112" r="20" fill="#fff3c4"/>
    <rect x="824" y="60" width="160" height="196" rx="6" fill="none" stroke="url(#s-neon)" stroke-width="4"/><line x1="904" y1="60" x2="904" y2="256" stroke="#8b5cf6" stroke-width="3" opacity=".8"/>
    <!-- gato dormindo na almofada -->
    <ellipse cx="150" cy="472" rx="44" ry="13" fill="#5b4bd6"/><ellipse cx="150" cy="464" rx="30" ry="14" fill="#e8873c"/><circle cx="172" cy="458" r="10" fill="#e8873c"/><path d="M165 450 L169 442 L174 450Z M174 450 L178 442 L182 450Z" fill="#e8873c"/><path d="M122 468 Q110 458 120 450" stroke="#e8873c" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- mesinha de vidro com cinzeiro -->
    <ellipse cx="500" cy="470" rx="40" ry="13" fill="#2a1f6e" opacity=".8"/><ellipse cx="500" cy="470" rx="40" ry="13" fill="none" stroke="url(#s-neon)" stroke-width="2"/><rect x="494" y="472" width="12" height="28" fill="#1c1450"/><ellipse cx="500" cy="466" rx="12" ry="4" fill="#9ca3af"/>`;
    },
  },
};

  const cenasPublic = () => Object.fromEntries(Object.entries(CENAS).map(([k, c]) => [k, { nome: c.nome, emoji: c.emoji, desc: c.desc, tela: c.tela, filas: c.filas, assentos: c.assentos, cores: c.cores, porta: c.porta || null, palcoPos: c.palcoPos || null, fumar: !!c.fumar, cinzeiro: c.cinzeiro || null }]));
  const api = { semente, assentoSVG, estrelasSVG, CENAS, cenasPublic };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else Object.assign(raiz, api);
})(typeof window !== 'undefined' ? window : globalThis);
