// Contas dos usuários: cadastro, senha, aprovação e cargos.
// Ficam guardadas no banco grátis Neon (variável DATABASE_URL no Render).
// Sem DATABASE_URL, ficam só na memória (apagam quando o servidor reinicia).

const crypto = require('crypto');

// ---------- Senhas (embaralhadas: nem o dono do servidor consegue ler) ----------
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(senha), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function confereSenha(senha, guardada) {
  try {
    const [tipo, salt, hash] = String(guardada).split('$');
    if (tipo !== 'scrypt') return false;
    const teste = crypto.scryptSync(String(senha), salt, 64);
    return crypto.timingSafeEqual(teste, Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// ---------- Banco na memória (testes / sem Neon) ----------
class Memoria {
  constructor() { this.users = new Map(); this.seq = 0; this.msgs = []; this.msgSeq = 0; this.amigos = []; }
  async init() {}
  async count() { return this.users.size; }
  async create(u) {
    const id = ++this.seq;
    const row = { id, avatar: '', email: '', email_ok: false, created_at: new Date(), ...u };
    this.users.set(id, row);
    return { ...row };
  }
  async byUsername(username) {
    for (const u of this.users.values()) if (u.username === username) return { ...u };
    return null;
  }
  async byId(id) { const u = this.users.get(Number(id)); return u ? { ...u } : null; }
  async byEmail(email) {
    if (!email) return null;
    for (const u of this.users.values()) if (u.email === email) return { ...u };
    return null;
  }
  async addPedido(pd) { this.pedidos = this.pedidos || []; const row = { id: (this.pedidos.at(-1)?.id || 0) + 1, status: 'pendente', quando: new Date(), ...pd }; this.pedidos.push(row); return { ...row }; }
  async listPedidos() { return (this.pedidos || []).map((p) => ({ ...p })).reverse(); }
  async setPedido(id, f) { const p = (this.pedidos || []).find((x) => x.id === Number(id)); if (p) Object.assign(p, f); return p ? { ...p } : null; }
  async addEvento(e) { this.eventos = this.eventos || []; this.eventos.push({ id: this.eventos.length + 1, quando: new Date(), ...e }); if (this.eventos.length > 5000) this.eventos.splice(0, this.eventos.length - 5000); }
  async listEventos(limite = 300) { return (this.eventos || []).slice(-limite).reverse().map((e) => ({ ...e })); }
  async getAjuste(chave) { return (this.ajustes || {})[chave] ?? null; }
  async setAjuste(chave, valor) { this.ajustes = this.ajustes || {}; this.ajustes[chave] = String(valor); }
  async update(id, fields) {
    const u = this.users.get(Number(id));
    if (!u) return null;
    Object.assign(u, fields);
    return { ...u };
  }
  async remove(id) { this.users.delete(Number(id)); }
  async list() { return [...this.users.values()].map((u) => ({ ...u })).sort((a, b) => a.id - b.id); }

  // Mensagens diretas
  async addMsg({ de, para, texto }) {
    const m = { id: ++this.msgSeq, de, para, texto, criado: new Date(), lida: false };
    this.msgs.push(m);
    return { ...m };
  }
  async history(a, b, limit = 50, beforeId = null) {
    const all = this.msgs.filter((m) => ((m.de === a && m.para === b) || (m.de === b && m.para === a)) && (!beforeId || m.id < beforeId));
    return all.slice(-limit).map((m) => ({ ...m }));
  }
  async markRead(para, de) { this.msgs.forEach((m) => { if (m.para === para && m.de === de) m.lida = true; }); }
  async unread(uid) {
    const r = {};
    this.msgs.forEach((m) => { if (m.para === uid && !m.lida) r[m.de] = (r[m.de] || 0) + 1; });
    return r;
  }
  async lastWith(uid) {
    const r = {};
    this.msgs.forEach((m) => {
      if (m.de !== uid && m.para !== uid) return;
      r[m.de === uid ? m.para : m.de] = { ...m };
    });
    return r;
  }
  async removeMsgsOf(uid) {
    this.msgs = this.msgs.filter((m) => m.de !== uid && m.para !== uid);
    this.amigos = this.amigos.filter((f) => f.a !== uid && f.b !== uid);
  }

  // Fotos do chat
  async addImg(im) { (this.imgs ||= new Map()).set(im.id, { ...im, criado: Date.now() }); }
  async getImg(id) { return this.imgs?.get(id) || null; }
  async removeOldImgs(dias) {
    let n = 0;
    const lim = Date.now() - dias * 86400_000;
    const keep = this.musicImgIds();
    for (const [k, v] of this.imgs || []) if (v.criado < lim && !keep.has(k)) { this.imgs.delete(k); n++; }
    return n;
  }

  // Biblioteca de músicas (MP3 enviados) do bot
  async addMusic(m) { this.musSeq = (this.musSeq || 0) + 1; const row = { id: this.musSeq, ...m, criado: new Date() }; (this.musicas ||= []).push(row); return { ...row }; }
  async listMusic() { return (this.musicas || []).map((m) => ({ ...m })); }
  async removeMusic(id) { this.musicas = (this.musicas || []).filter((m) => m.id !== Number(id)); }
  musicImgIds() { return new Set((this.musicas || []).map((m) => m.img)); }

  // Canais (salas): [{ id, nome, servidor, tipo }]
  async listChannels() { return (this.canais || []).map((c) => ({ ...c })); }
  async saveChannels(list) { this.canais = list.map((c) => ({ id: c.id, nome: c.nome, servidor: c.servidor || 'talking', tipo: c.tipo || 'voz', tema: c.tema || '', opcoes: c.opcoes || '' })); }

  // Servidores (comunidades): { id, nome, icone, dono, criado }
  async listServers() { return (this.servidores || []).map((s) => ({ ...s })); }
  async createServer(s) { (this.servidores ||= []).push({ ...s, criado: new Date() }); return { ...s }; }
  async updateServer(id, f) { const s = (this.servidores || []).find((x) => x.id === id); if (s) Object.assign(s, f); return s ? { ...s } : null; }
  async deleteServer(id) {
    this.servidores = (this.servidores || []).filter((s) => s.id !== id);
    this.membros = (this.membros || []).filter((m) => m.servidor !== id);
    this.convites = (this.convites || []).filter((c) => c.servidor !== id);
    this.banidos = (this.banidos || []).filter((b) => b.servidor !== id);
  }
  // Membros: { servidor, uid, cargo: 'dono' | 'mod' | 'membro' }
  async listMembers() { return (this.membros || []).map((m) => ({ ...m })); }
  async setMember(servidor, uid, cargo) {
    this.membros ||= [];
    const m = this.membros.find((x) => x.servidor === servidor && x.uid === uid);
    if (m) m.cargo = cargo; else this.membros.push({ servidor, uid, cargo, entrou: new Date() });
  }
  async removeMember(servidor, uid) { this.membros = (this.membros || []).filter((x) => !(x.servidor === servidor && x.uid === uid)); }
  async removeMemberEverywhere(uid) { this.membros = (this.membros || []).filter((x) => x.uid !== uid); }
  // Convites: { codigo, servidor, criado_por, usos }
  async listInvites() { return (this.convites || []).map((c) => ({ ...c })); }
  async createInvite(c) { (this.convites ||= []).push({ ...c, usos: 0, criado: new Date() }); }
  async useInvite(codigo) { const c = (this.convites || []).find((x) => x.codigo === codigo); if (c) c.usos += 1; }
  async deleteInvite(codigo) { this.convites = (this.convites || []).filter((x) => x.codigo !== codigo); }
  // Banidos de um servidor
  async listBans() { return (this.banidos || []).map((b) => ({ ...b })); }
  async setBan(servidor, uid, on) {
    this.banidos = (this.banidos || []).filter((b) => !(b.servidor === servidor && b.uid === uid));
    if (on) this.banidos.push({ servidor, uid });
  }

  // Amizades: { a, b (a < b), de (quem pediu), status: 'pending' | 'accepted' }
  async friendsOf(uid) { return this.amigos.filter((f) => f.a === uid || f.b === uid).map((f) => ({ ...f })); }
  async getFriend(x, y) {
    const [a, b] = x < y ? [x, y] : [y, x];
    const f = this.amigos.find((f) => f.a === a && f.b === b);
    return f ? { ...f } : null;
  }
  async setFriend(x, y, de, status) {
    const [a, b] = x < y ? [x, y] : [y, x];
    const f = this.amigos.find((f) => f.a === a && f.b === b);
    if (f) Object.assign(f, { de, status }); else this.amigos.push({ a, b, de, status });
  }
  async removeFriend(x, y) {
    const [a, b] = x < y ? [x, y] : [y, x];
    this.amigos = this.amigos.filter((f) => !(f.a === a && f.b === b));
  }
}

// ---------- Banco Postgres (Neon) ----------
class Postgres {
  constructor(url) {
    const { Pool } = require('pg');
    const local = /localhost|127\.0\.0\.1|\/tmp|host=\//.test(url);
    this.pool = new Pool({
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: false },
      max: 4,
    });
    this.pool.on('error', (e) => console.error('banco:', e.message));
  }
  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        pass TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await this.pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`);
    await this.pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_ok BOOLEAN NOT NULL DEFAULT false`);
    await this.pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS termos_em TIMESTAMPTZ`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS ajustes (chave TEXT PRIMARY KEY, valor TEXT NOT NULL DEFAULT '')`);
    await this.pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS visto_em TIMESTAMPTZ`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS pedidos (id SERIAL PRIMARY KEY, de_uid INTEGER NOT NULL DEFAULT 0, de_nome TEXT NOT NULL DEFAULT '', evento TEXT NOT NULL, dados TEXT NOT NULL DEFAULT '{}', descricao TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pendente', decidido_por TEXT NOT NULL DEFAULT '', quando TIMESTAMPTZ NOT NULL DEFAULT now(), decidido_em TIMESTAMPTZ)`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS eventos (id SERIAL PRIMARY KEY, uid INTEGER NOT NULL DEFAULT 0, nome TEXT NOT NULL DEFAULT '', tipo TEXT NOT NULL, detalhe TEXT NOT NULL DEFAULT '', quando TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS mensagens (
        id SERIAL PRIMARY KEY,
        de INTEGER NOT NULL,
        para INTEGER NOT NULL,
        texto TEXT NOT NULL,
        criado TIMESTAMPTZ NOT NULL DEFAULT now(),
        lida BOOLEAN NOT NULL DEFAULT false
      )`);
    await this.pool.query('CREATE INDEX IF NOT EXISTS mensagens_par ON mensagens (LEAST(de, para), GREATEST(de, para), id)');
    await this.pool.query('CREATE INDEX IF NOT EXISTS mensagens_naolidas ON mensagens (para) WHERE NOT lida');
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS amizades (
        a INTEGER NOT NULL,
        b INTEGER NOT NULL,
        de INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        criado TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (a, b)
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS musicas (
        id SERIAL PRIMARY KEY,
        img TEXT NOT NULL,
        titulo TEXT NOT NULL,
        artista TEXT NOT NULL DEFAULT '',
        dono INTEGER NOT NULL,
        duracao INTEGER,
        criado TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS canais (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        ordem INTEGER NOT NULL DEFAULT 0
      )`);
    // Servidores (comunidades): cada um com suas salas e membros
    await this.pool.query(`ALTER TABLE canais ADD COLUMN IF NOT EXISTS servidor TEXT NOT NULL DEFAULT 'talking'`);
    await this.pool.query(`ALTER TABLE canais ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'voz'`);
    await this.pool.query(`ALTER TABLE canais ADD COLUMN IF NOT EXISTS tema TEXT NOT NULL DEFAULT ''`);
    await this.pool.query(`ALTER TABLE canais ADD COLUMN IF NOT EXISTS opcoes TEXT NOT NULL DEFAULT ''`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS servidores (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        icone TEXT NOT NULL DEFAULT '',
        dono INTEGER NOT NULL,
        criado TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS membros (
        servidor TEXT NOT NULL,
        uid INTEGER NOT NULL,
        cargo TEXT NOT NULL DEFAULT 'membro',
        entrou TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (servidor, uid)
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS convites (
        codigo TEXT PRIMARY KEY,
        servidor TEXT NOT NULL,
        criado_por INTEGER NOT NULL,
        usos INTEGER NOT NULL DEFAULT 0,
        criado TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS banidos (
        servidor TEXT NOT NULL,
        uid INTEGER NOT NULL,
        PRIMARY KEY (servidor, uid)
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS imagens (
        id TEXT PRIMARY KEY,
        dono INTEGER NOT NULL,
        mime TEXT NOT NULL,
        dados BYTEA NOT NULL,
        criado TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  }
  async count() {
    const r = await this.pool.query('SELECT count(*)::int AS n FROM usuarios');
    return r.rows[0].n;
  }
  async create(u) {
    const r = await this.pool.query(
      'INSERT INTO usuarios (username, name, pass, role, status, email, email_ok, termos_em) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [u.username, u.name, u.pass, u.role, u.status, u.email || '', !!u.email_ok, u.termos_em || null]
    );
    return r.rows[0];
  }
  async byUsername(username) {
    const r = await this.pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    return r.rows[0] || null;
  }
  async byId(id) {
    const r = await this.pool.query('SELECT * FROM usuarios WHERE id = $1', [Number(id)]);
    return r.rows[0] || null;
  }
  async byEmail(email) {
    if (!email) return null;
    const r = await this.pool.query('SELECT * FROM usuarios WHERE email = $1 ORDER BY id LIMIT 1', [email]);
    return r.rows[0] || null;
  }
  async addPedido(pd) {
    const r = await this.pool.query('INSERT INTO pedidos (de_uid, de_nome, evento, dados, descricao) VALUES ($1,$2,$3,$4,$5) RETURNING *', [Number(pd.de_uid) || 0, pd.de_nome || '', pd.evento, JSON.stringify(pd.dados || {}), pd.descricao || '']);
    return this._pedido(r.rows[0]);
  }
  _pedido(r) { return r ? { ...r, dados: (() => { try { return JSON.parse(r.dados); } catch { return {}; } })() } : null; }
  async listPedidos() {
    const r = await this.pool.query('SELECT * FROM pedidos ORDER BY id DESC LIMIT 200');
    return r.rows.map((x) => this._pedido(x));
  }
  async setPedido(id, f) {
    const r = await this.pool.query('UPDATE pedidos SET status = $2, decidido_por = $3, decidido_em = now() WHERE id = $1 RETURNING *', [Number(id), f.status, f.decidido_por || '']);
    return this._pedido(r.rows[0]);
  }
  async addEvento(e) {
    await this.pool.query('INSERT INTO eventos (uid, nome, tipo, detalhe) VALUES ($1, $2, $3, $4)', [Number(e.uid) || 0, e.nome || '', e.tipo || '', e.detalhe || '']);
    if (Math.random() < 0.02) await this.pool.query('DELETE FROM eventos WHERE id NOT IN (SELECT id FROM eventos ORDER BY id DESC LIMIT 5000)').catch(() => {});
  }
  async listEventos(limite = 300) {
    const r = await this.pool.query('SELECT id, uid, nome, tipo, detalhe, quando FROM eventos ORDER BY id DESC LIMIT $1', [limite]);
    return r.rows;
  }
  async getAjuste(chave) {
    const r = await this.pool.query('SELECT valor FROM ajustes WHERE chave = $1', [chave]);
    return r.rows[0]?.valor ?? null;
  }
  async setAjuste(chave, valor) {
    await this.pool.query('INSERT INTO ajustes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor', [chave, String(valor)]);
  }
  async update(id, fields) {
    const keys = Object.keys(fields).filter((k) => ['name', 'avatar', 'role', 'status', 'pass', 'email', 'email_ok', 'termos_em', 'visto_em'].includes(k));
    if (!keys.length) return this.byId(id);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const r = await this.pool.query(
      `UPDATE usuarios SET ${sets} WHERE id = $1 RETURNING *`,
      [Number(id), ...keys.map((k) => fields[k])]
    );
    return r.rows[0] || null;
  }
  async remove(id) { await this.pool.query('DELETE FROM usuarios WHERE id = $1', [Number(id)]); }
  async list() {
    const r = await this.pool.query('SELECT * FROM usuarios ORDER BY id');
    return r.rows;
  }

  // Mensagens diretas
  async addMsg({ de, para, texto }) {
    const r = await this.pool.query('INSERT INTO mensagens (de, para, texto) VALUES ($1,$2,$3) RETURNING *', [de, para, texto]);
    return r.rows[0];
  }
  async history(a, b, limit = 50, beforeId = null) {
    const r = await this.pool.query(
      `SELECT * FROM mensagens WHERE LEAST(de, para) = LEAST($1::int, $2::int) AND GREATEST(de, para) = GREATEST($1::int, $2::int)
       ${beforeId ? 'AND id < $4' : ''} ORDER BY id DESC LIMIT $3`,
      beforeId ? [a, b, limit, beforeId] : [a, b, limit]
    );
    return r.rows.reverse();
  }
  async markRead(para, de) {
    await this.pool.query('UPDATE mensagens SET lida = true WHERE para = $1 AND de = $2 AND NOT lida', [para, de]);
  }
  async unread(uid) {
    const r = await this.pool.query('SELECT de, count(*)::int AS n FROM mensagens WHERE para = $1 AND NOT lida GROUP BY de', [uid]);
    const out = {};
    r.rows.forEach((x) => { out[x.de] = x.n; });
    return out;
  }
  async lastWith(uid) {
    const r = await this.pool.query(
      `SELECT DISTINCT ON (CASE WHEN de = $1 THEN para ELSE de END) *, CASE WHEN de = $1 THEN para ELSE de END AS outro
       FROM mensagens WHERE de = $1 OR para = $1 ORDER BY CASE WHEN de = $1 THEN para ELSE de END, id DESC`,
      [uid]
    );
    const out = {};
    r.rows.forEach((x) => { out[x.outro] = x; });
    return out;
  }
  async removeMsgsOf(uid) {
    await this.pool.query('DELETE FROM mensagens WHERE de = $1 OR para = $1', [uid]);
    await this.pool.query('DELETE FROM amizades WHERE a = $1 OR b = $1', [uid]);
  }

  // Fotos do chat
  async addImg({ id, dono, mime, dados }) {
    await this.pool.query('INSERT INTO imagens (id, dono, mime, dados) VALUES ($1,$2,$3,$4)', [id, dono, mime, dados]);
  }
  async getImg(id) {
    const r = await this.pool.query('SELECT mime, dados FROM imagens WHERE id = $1', [id]);
    return r.rows[0] || null;
  }
  async removeOldImgs(dias) {
    // as músicas da biblioteca do bot não vencem
    const r = await this.pool.query(
      `DELETE FROM imagens WHERE criado < now() - ($1::int * interval '1 day') AND id NOT IN (SELECT img FROM musicas)`, [dias]);
    return r.rowCount;
  }

  // Biblioteca de músicas (MP3 enviados) do bot
  async addMusic({ img, titulo, artista, dono, duracao }) {
    const r = await this.pool.query(
      'INSERT INTO musicas (img, titulo, artista, dono, duracao) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [img, titulo, artista || '', dono, duracao || null]);
    return r.rows[0];
  }
  async listMusic() {
    const r = await this.pool.query('SELECT * FROM musicas ORDER BY titulo');
    return r.rows;
  }
  async removeMusic(id) {
    const r = await this.pool.query('DELETE FROM musicas WHERE id = $1 RETURNING img', [Number(id)]);
    if (r.rows[0]) await this.pool.query('DELETE FROM imagens WHERE id = $1', [r.rows[0].img]);
  }

  // Canais (salas)
  async listChannels() {
    const r = await this.pool.query('SELECT id, nome, servidor, tipo, tema, opcoes FROM canais ORDER BY ordem, id');
    return r.rows;
  }
  async saveChannels(list) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('DELETE FROM canais');
      for (let i = 0; i < list.length; i++) {
        await c.query('INSERT INTO canais (id, nome, ordem, servidor, tipo, tema, opcoes) VALUES ($1, $2, $3, $4, $5, $6, $7)', [list[i].id, list[i].nome, i, list[i].servidor || 'talking', list[i].tipo || 'voz', list[i].tema || '', list[i].opcoes || '']);
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }

  // Servidores
  async listServers() { return (await this.pool.query('SELECT id, nome, icone, dono, criado FROM servidores ORDER BY criado')).rows; }
  async createServer({ id, nome, icone, dono }) {
    await this.pool.query('INSERT INTO servidores (id, nome, icone, dono) VALUES ($1, $2, $3, $4)', [id, nome, icone || '', Number(dono)]);
    return { id, nome, icone: icone || '', dono: Number(dono) };
  }
  async updateServer(id, f) {
    const sets = [], vals = [];
    for (const k of ['nome', 'icone', 'dono']) if (f[k] !== undefined) { vals.push(f[k]); sets.push(`${k} = $${vals.length}`); }
    if (!sets.length) return null;
    vals.push(id);
    const r = await this.pool.query(`UPDATE servidores SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id, nome, icone, dono`, vals);
    return r.rows[0] || null;
  }
  async deleteServer(id) {
    await this.pool.query('DELETE FROM membros WHERE servidor = $1', [id]);
    await this.pool.query('DELETE FROM convites WHERE servidor = $1', [id]);
    await this.pool.query('DELETE FROM banidos WHERE servidor = $1', [id]);
    await this.pool.query('DELETE FROM servidores WHERE id = $1', [id]);
  }
  async listMembers() { return (await this.pool.query('SELECT servidor, uid, cargo FROM membros')).rows; }
  async setMember(servidor, uid, cargo) {
    await this.pool.query('INSERT INTO membros (servidor, uid, cargo) VALUES ($1, $2, $3) ON CONFLICT (servidor, uid) DO UPDATE SET cargo = EXCLUDED.cargo', [servidor, Number(uid), cargo]);
  }
  async removeMember(servidor, uid) { await this.pool.query('DELETE FROM membros WHERE servidor = $1 AND uid = $2', [servidor, Number(uid)]); }
  async removeMemberEverywhere(uid) { await this.pool.query('DELETE FROM membros WHERE uid = $1', [Number(uid)]); }
  async listInvites() { return (await this.pool.query('SELECT codigo, servidor, criado_por, usos FROM convites')).rows; }
  async createInvite({ codigo, servidor, criado_por }) { await this.pool.query('INSERT INTO convites (codigo, servidor, criado_por) VALUES ($1, $2, $3)', [codigo, servidor, Number(criado_por)]); }
  async useInvite(codigo) { await this.pool.query('UPDATE convites SET usos = usos + 1 WHERE codigo = $1', [codigo]); }
  async deleteInvite(codigo) { await this.pool.query('DELETE FROM convites WHERE codigo = $1', [codigo]); }
  async listBans() { return (await this.pool.query('SELECT servidor, uid FROM banidos')).rows; }
  async setBan(servidor, uid, on) {
    await this.pool.query('DELETE FROM banidos WHERE servidor = $1 AND uid = $2', [servidor, Number(uid)]);
    if (on) await this.pool.query('INSERT INTO banidos (servidor, uid) VALUES ($1, $2)', [servidor, Number(uid)]);
  }

  // Amizades
  async friendsOf(uid) {
    const r = await this.pool.query('SELECT a, b, de, status FROM amizades WHERE a = $1 OR b = $1', [uid]);
    return r.rows;
  }
  async getFriend(x, y) {
    const [a, b] = x < y ? [x, y] : [y, x];
    const r = await this.pool.query('SELECT a, b, de, status FROM amizades WHERE a = $1 AND b = $2', [a, b]);
    return r.rows[0] || null;
  }
  async setFriend(x, y, de, status) {
    const [a, b] = x < y ? [x, y] : [y, x];
    await this.pool.query(
      `INSERT INTO amizades (a, b, de, status) VALUES ($1,$2,$3,$4)
       ON CONFLICT (a, b) DO UPDATE SET de = EXCLUDED.de, status = EXCLUDED.status`,
      [a, b, de, status]
    );
  }
  async removeFriend(x, y) {
    const [a, b] = x < y ? [x, y] : [y, x];
    await this.pool.query('DELETE FROM amizades WHERE a = $1 AND b = $2', [a, b]);
  }
}

// ---------- "Crachá" de acesso (token) ----------
// Assinado com uma chave secreta: ninguém consegue falsificar.
function chaveSecreta() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // Sem chave definida: usa uma derivada do endereço do banco (continua a mesma
  // quando o servidor reinicia, então ninguém precisa entrar de novo)
  return crypto.createHash('sha256').update('king-launcher|' + (process.env.DATABASE_URL || 'local')).digest('hex');
}

function criaToken(userId) {
  const corpo = `${userId}.${Date.now()}`;
  const sig = crypto.createHmac('sha256', chaveSecreta()).update(corpo).digest('base64url');
  return `${corpo}.${sig}`;
}

function leToken(token) {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) return null;
  const corpo = `${partes[0]}.${partes[1]}`;
  const sig = crypto.createHmac('sha256', chaveSecreta()).update(corpo).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(partes[2]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return Number(partes[0]) || null;
}

function abreBanco() {
  const url = process.env.DATABASE_URL;
  if (url) return { banco: new Postgres(url), tipo: 'Neon/Postgres' };
  return { banco: new Memoria(), tipo: 'memória (as contas somem quando o servidor reinicia!)' };
}

module.exports = { hashSenha, confereSenha, criaToken, leToken, abreBanco };
