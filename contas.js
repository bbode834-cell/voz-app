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
    const row = { id, avatar: '', created_at: new Date(), ...u };
    this.users.set(id, row);
    return { ...row };
  }
  async byUsername(username) {
    for (const u of this.users.values()) if (u.username === username) return { ...u };
    return null;
  }
  async byId(id) { const u = this.users.get(Number(id)); return u ? { ...u } : null; }
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

  // Canais (salas): [{ id, nome }]
  async listChannels() { return (this.canais || []).map((c) => ({ ...c })); }
  async saveChannels(list) { this.canais = list.map((c) => ({ id: c.id, nome: c.nome })); }

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
      'INSERT INTO usuarios (username, name, pass, role, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [u.username, u.name, u.pass, u.role, u.status]
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
  async update(id, fields) {
    const keys = Object.keys(fields).filter((k) => ['name', 'avatar', 'role', 'status', 'pass'].includes(k));
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
    const r = await this.pool.query('SELECT id, nome FROM canais ORDER BY ordem, id');
    return r.rows;
  }
  async saveChannels(list) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('DELETE FROM canais');
      for (let i = 0; i < list.length; i++) {
        await c.query('INSERT INTO canais (id, nome, ordem) VALUES ($1, $2, $3)', [list[i].id, list[i].nome, i]);
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
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
