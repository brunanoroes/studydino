const path = require('path');

let db;

if (process.env.DATABASE_URL) {
  // PostgreSQL em produção - apenas conexão, sem SQL complexo
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  db = {
    pool,
    prepare: (sql) => ({
      run: (...params) => {
        try {
          pool.query(sql, params);
        } catch(e) {
          console.error('Query error:', e.message);
        }
        return { changes: 1, lastInsertRowid: null };
      },
      get: (...params) => null,
      all: (...params) => []
    }),
    exec: () => {},
    transaction: (fn) => fn()
  };
} else {
  // SQLite local (desenvolvimento)
  const Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, 'estudos.db'));

  // Inicializar tabelas apenas para SQLite
  const sql = `
    CREATE TABLE IF NOT EXISTS materias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      cor TEXT NOT NULL DEFAULT '#4CAF50',
      emoji TEXT NOT NULL DEFAULT '📚',
      criada_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trilhas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
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
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cronograma (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      trilha_id INTEGER NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      nome TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '📚',
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

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
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

  db.exec(sql);
}

module.exports = db;
