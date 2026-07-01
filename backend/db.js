const path = require('path');

const usePg = !!process.env.DATABASE_URL;

// ────────────────────────────────────────────────────────────
// Schema. Tabelas "de conteúdo" pertencem a um usuário (usuario_id):
// materias, trilhas, capitulos, cronograma, cronograma_dias, config.
// Assim cada conta tem seu próprio edital. Só sessoes/amizades cruzam
// contas (aba Colegas). Nome é único POR usuário, não global.
// ────────────────────────────────────────────────────────────
const SCHEMA_PG = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS materias (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#4CAF50',
    emoji TEXT NOT NULL DEFAULT '',
    criada_em TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS trilhas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#2d6a4f',
    criada_em TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS trilha_materias (
    trilha_id INTEGER NOT NULL REFERENCES trilhas(id) ON DELETE CASCADE,
    materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    PRIMARY KEY (trilha_id, materia_id)
  );
  CREATE TABLE IF NOT EXISTS config (
    usuario_id INTEGER NOT NULL,
    chave TEXT NOT NULL,
    valor TEXT NOT NULL,
    PRIMARY KEY (usuario_id, chave)
  );
  CREATE TABLE IF NOT EXISTS cronograma (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    dia_semana INTEGER NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'estudo',
    materia_id INTEGER REFERENCES materias(id) ON DELETE SET NULL,
    descricao TEXT
  );
  CREATE TABLE IF NOT EXISTS passos_completos (
    trilha_id INTEGER NOT NULL REFERENCES trilhas(id) ON DELETE CASCADE,
    passo_index INTEGER NOT NULL,
    concluido_em TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (trilha_id, passo_index)
  );
  CREATE TABLE IF NOT EXISTS materias_concluidas (
    trilha_id INTEGER NOT NULL REFERENCES trilhas(id) ON DELETE CASCADE,
    materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    concluido_em TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (trilha_id, materia_id)
  );
  CREATE TABLE IF NOT EXISTS cronograma_dias (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'estudo',
    materia_id INTEGER REFERENCES materias(id) ON DELETE SET NULL,
    descricao TEXT,
    serie_id TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_cronograma_dias_data ON cronograma_dias(data);
  CREATE INDEX IF NOT EXISTS idx_cronograma_dias_serie ON cronograma_dias(serie_id);
  CREATE TABLE IF NOT EXISTS sessoes (
    id SERIAL PRIMARY KEY,
    materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    duracao_segundos INTEGER NOT NULL,
    iniciada_em TIMESTAMP NOT NULL,
    finalizada_em TIMESTAMP,
    anotacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS capitulos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    trilha_id INTEGER NOT NULL REFERENCES trilhas(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL DEFAULT 0,
    nome TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '',
    descricao TEXT
  );
  CREATE TABLE IF NOT EXISTS capitulo_materias (
    capitulo_id INTEGER NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
    materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (capitulo_id, materia_id)
  );
  CREATE TABLE IF NOT EXISTS capitulo_cronograma (
    id SERIAL PRIMARY KEY,
    capitulo_id INTEGER NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'estudo',
    materia_id INTEGER REFERENCES materias(id) ON DELETE SET NULL,
    descricao TEXT
  );
  CREATE TABLE IF NOT EXISTS amizades (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    amigo_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(usuario_id, amigo_id)
  );
  CREATE INDEX IF NOT EXISTS idx_amizades_usuario ON amizades(usuario_id);
`;

const SCHEMA_SQLITE = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS materias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#4CAF50',
    emoji TEXT NOT NULL DEFAULT '',
    criada_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS trilhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#2d6a4f',
    criada_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS trilha_materias (
    trilha_id INTEGER NOT NULL,
    materia_id INTEGER NOT NULL,
    PRIMARY KEY (trilha_id, materia_id),
    FOREIGN KEY (trilha_id) REFERENCES trilhas(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS config (
    usuario_id INTEGER NOT NULL,
    chave TEXT NOT NULL,
    valor TEXT NOT NULL,
    PRIMARY KEY (usuario_id, chave)
  );
  CREATE TABLE IF NOT EXISTS cronograma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    dia_semana INTEGER NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'estudo',
    materia_id INTEGER,
    descricao TEXT,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS passos_completos (
    trilha_id INTEGER NOT NULL,
    passo_index INTEGER NOT NULL,
    concluido_em TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (trilha_id, passo_index),
    FOREIGN KEY (trilha_id) REFERENCES trilhas(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS materias_concluidas (
    trilha_id INTEGER NOT NULL,
    materia_id INTEGER NOT NULL,
    concluido_em TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (trilha_id, materia_id),
    FOREIGN KEY (trilha_id) REFERENCES trilhas(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS cronograma_dias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'estudo',
    materia_id INTEGER,
    descricao TEXT,
    serie_id TEXT,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cronograma_dias_data ON cronograma_dias(data);
  CREATE INDEX IF NOT EXISTS idx_cronograma_dias_serie ON cronograma_dias(serie_id);
  CREATE TABLE IF NOT EXISTS sessoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materia_id INTEGER NOT NULL,
    duracao_segundos INTEGER NOT NULL,
    iniciada_em TEXT NOT NULL,
    finalizada_em TEXT,
    anotacao TEXT,
    usuario_id INTEGER,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS capitulos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    trilha_id INTEGER NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    nome TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '',
    descricao TEXT,
    FOREIGN KEY (trilha_id) REFERENCES trilhas(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS capitulo_materias (
    capitulo_id INTEGER NOT NULL,
    materia_id INTEGER NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (capitulo_id, materia_id),
    FOREIGN KEY (capitulo_id) REFERENCES capitulos(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS capitulo_cronograma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    capitulo_id INTEGER NOT NULL,
    dia_semana INTEGER NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'estudo',
    materia_id INTEGER,
    descricao TEXT,
    FOREIGN KEY (capitulo_id) REFERENCES capitulos(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS amizades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    amigo_id INTEGER NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (amigo_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE(usuario_id, amigo_id)
  );
  CREATE INDEX IF NOT EXISTS idx_amizades_usuario ON amizades(usuario_id);
`;

// Migração p/ bancos que já existiam sem usuario_id (produção).
// Idempotente: adiciona colunas, tira o UNIQUE global do nome, e atribui
// o conteúdo órfão ao primeiro usuário (a Bruna, dona do histórico atual).
const MIGRATE_PG = `
  ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS anotacao TEXT;
  ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
  ALTER TABLE materias ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
  ALTER TABLE trilhas ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
  ALTER TABLE cronograma ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
  ALTER TABLE cronograma_dias ADD COLUMN IF NOT EXISTS usuario_id INTEGER;
  ALTER TABLE capitulos ADD COLUMN IF NOT EXISTS usuario_id INTEGER;

  ALTER TABLE materias DROP CONSTRAINT IF EXISTS materias_nome_key;
  ALTER TABLE trilhas DROP CONSTRAINT IF EXISTS trilhas_nome_key;

  UPDATE materias        SET usuario_id = (SELECT MIN(id) FROM usuarios) WHERE usuario_id IS NULL;
  UPDATE trilhas         SET usuario_id = (SELECT MIN(id) FROM usuarios) WHERE usuario_id IS NULL;
  UPDATE cronograma      SET usuario_id = (SELECT MIN(id) FROM usuarios) WHERE usuario_id IS NULL;
  UPDATE cronograma_dias SET usuario_id = (SELECT MIN(id) FROM usuarios) WHERE usuario_id IS NULL;
  UPDATE capitulos c     SET usuario_id = t.usuario_id FROM trilhas t WHERE c.trilha_id = t.id AND c.usuario_id IS NULL;
  UPDATE capitulos       SET usuario_id = (SELECT MIN(id) FROM usuarios) WHERE usuario_id IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_materias_uid_nome ON materias(usuario_id, nome);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_trilhas_uid_nome ON trilhas(usuario_id, nome);
`;

// ────────────────────────────────────────────────────────────
// Tradução SQLite → PostgreSQL (placeholders, datas, upserts)
// ────────────────────────────────────────────────────────────
function translatePg(sql, returnId) {
  let suffix = '';

  if (/INSERT\s+OR\s+IGNORE/i.test(sql)) {
    sql = sql.replace(/INSERT\s+OR\s+IGNORE/i, 'INSERT');
    suffix = ' ON CONFLICT DO NOTHING';
  }

  sql = sql.replace(/DATE\(\s*'now'\s*,\s*'([+-]?\d+)\s*days?'\s*\)/gi,
    (_m, n) => `(CURRENT_DATE + INTERVAL '${n} days')`);
  sql = sql.replace(/DATE\(\s*'now'\s*\)/gi, 'CURRENT_DATE');
  sql = sql.replace(/DATE\(\s*([a-zA-Z_][\w.]*)\s*\)/g, '($1)::date');

  sql += suffix;
  if (returnId && !/RETURNING/i.test(sql)) sql += ' RETURNING id';

  let i = 0;
  sql = sql.replace(/\?/g, () => `$${++i}`);
  return sql;
}

let db;

if (usePg) {
  const pg = require('pg');
  pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
  pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
  pg.types.setTypeParser(1082, (v) => v);
  pg.types.setTypeParser(1114, (v) => v);
  pg.types.setTypeParser(1184, (v) => v);

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const exec = async (client, sql, params, returnId) =>
    (client || pool).query(translatePg(sql, returnId), params);

  const makeQ = (client) => ({
    get: async (sql, ...p) => (await exec(client, sql, p, false)).rows[0],
    all: async (sql, ...p) => (await exec(client, sql, p, false)).rows,
    run: async (sql, ...p) => ({ changes: (await exec(client, sql, p, false)).rowCount }),
    insert: async (sql, ...p) => {
      const r = await exec(client, sql, p, true);
      return { lastInsertRowid: r.rows[0] ? r.rows[0].id : null };
    },
  });

  const base = makeQ(null);

  db = {
    isPg: true,
    ...base,
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn(makeQ(client));
        await client.query('COMMIT');
        return out;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    init: async () => {
      await pool.query(SCHEMA_PG);
      await pool.query(MIGRATE_PG);
    },
  };
} else {
  const Database = require('better-sqlite3');
  const sdb = new Database(path.join(__dirname, 'estudos.db'));
  sdb.pragma('foreign_keys = ON');
  sdb.exec(SCHEMA_SQLITE);
  // Migração best-effort p/ estudos.db antigo (ignora coluna já existente)
  for (const t of ['materias', 'trilhas', 'cronograma', 'cronograma_dias', 'capitulos']) {
    try { sdb.exec(`ALTER TABLE ${t} ADD COLUMN usuario_id INTEGER`); } catch (_) { /* já existe */ }
  }
  try {
    sdb.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_materias_uid_nome ON materias(usuario_id, nome);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trilhas_uid_nome ON trilhas(usuario_id, nome);
    `);
  } catch (_) { /* pode falhar se houver duplicatas antigas locais */ }

  const makeQ = () => ({
    get: async (sql, ...p) => sdb.prepare(sql).get(...p),
    all: async (sql, ...p) => sdb.prepare(sql).all(...p),
    run: async (sql, ...p) => {
      const r = sdb.prepare(sql).run(...p);
      return { changes: r.changes, lastInsertRowid: r.lastInsertRowid };
    },
    insert: async (sql, ...p) => {
      const r = sdb.prepare(sql).run(...p);
      return { lastInsertRowid: r.lastInsertRowid };
    },
  });

  const base = makeQ();

  db = {
    isPg: false,
    ...base,
    tx: async (fn) => {
      sdb.exec('BEGIN');
      try {
        const out = await fn(base);
        sdb.exec('COMMIT');
        return out;
      } catch (e) {
        sdb.exec('ROLLBACK');
        throw e;
      }
    },
    init: async () => {},
  };
}

module.exports = db;
