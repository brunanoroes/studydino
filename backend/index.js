const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui-mude-em-producao';
const JWT_EXPIRATION = '7d';
const PORT = process.env.PORT || 3001;

// Não derruba o processo por uma promise rejeitada solta
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));

// Embrulha handlers async para mandar erros ao Express
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  console.error(e);
  if (!res.headersSent) res.status(500).json({ error: e.message });
});

const isUnique = (e) => e.code === '23505' || /unique|duplicate/i.test(e.message || '');

// ── AUTENTICAÇÃO ──────────────────────────────────────────
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

app.post('/api/auth/registro', wrap(async (req, res) => {
  const { username, senha } = req.body;
  if (!username || !senha) return res.status(400).json({ error: 'Username e senha obrigatórios' });
  if (username.length < 3) return res.status(400).json({ error: 'Username deve ter mínimo 3 caracteres' });
  if (!/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(senha)) {
    return res.status(400).json({ error: 'Senha deve ter mínimo 6 caracteres, 1 letra e 1 número' });
  }

  const usuario = await db.get('SELECT id FROM usuarios WHERE username = ?', username);
  if (usuario) return res.status(409).json({ error: 'Username já existe' });

  const senhaHash = bcrypt.hashSync(senha, 10);
  const r = await db.insert('INSERT INTO usuarios (username, senha_hash) VALUES (?, ?)', username, senhaHash);
  const token = jwt.sign({ id: r.lastInsertRowid, username }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  res.status(201).json({ id: r.lastInsertRowid, username, token });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { username, senha } = req.body;
  if (!username || !senha) return res.status(400).json({ error: 'Username e senha obrigatórios' });

  const usuario = await db.get('SELECT id, username, senha_hash FROM usuarios WHERE username = ?', username);
  if (!usuario || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return res.status(401).json({ error: 'Username ou senha incorretos' });
  }
  const token = jwt.sign({ id: usuario.id, username: usuario.username }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  res.json({ id: usuario.id, username: usuario.username, token });
}));

app.get('/api/auth/me', verificarToken, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

// ── AMIZADES ──────────────────────────────────────────────
app.post('/api/amigos/adicionar', verificarToken, wrap(async (req, res) => {
  const { username_amigo } = req.body;
  if (!username_amigo) return res.status(400).json({ error: 'Username obrigatório' });

  const amigo = await db.get('SELECT id FROM usuarios WHERE username = ?', username_amigo);
  if (!amigo) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (amigo.id === req.user.id) return res.status(400).json({ error: 'Não pode adicionar a si mesmo' });

  await db.run('INSERT OR IGNORE INTO amizades (usuario_id, amigo_id) VALUES (?, ?)', req.user.id, amigo.id);
  res.json({ ok: true });
}));

app.get('/api/amigos', verificarToken, wrap(async (req, res) => {
  const amigos = await db.all(`
    SELECT u.id, u.username FROM amizades a
    JOIN usuarios u ON u.id = a.amigo_id
    WHERE a.usuario_id = ?
    ORDER BY u.username
  `, req.user.id);
  res.json(amigos);
}));

app.delete('/api/amigos/:amigoId', verificarToken, wrap(async (req, res) => {
  await db.run('DELETE FROM amizades WHERE usuario_id = ? AND amigo_id = ?', req.user.id, req.params.amigoId);
  res.json({ ok: true });
}));

app.get('/api/amigos/:amigoId/progresso', verificarToken, wrap(async (req, res) => {
  const amigoId = req.params.amigoId;
  const amizade = await db.get('SELECT id FROM amizades WHERE usuario_id = ? AND amigo_id = ?', req.user.id, amigoId);
  if (!amizade) return res.status(403).json({ error: 'Não é seu amigo' });

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessoes = await db.all(`
    SELECT m.nome, m.cor, SUM(s.duracao_segundos) as total_segundos
    FROM sessoes s
    JOIN materias m ON m.id = s.materia_id
    WHERE s.usuario_id = ? AND s.finalizada_em >= ?
    GROUP BY s.materia_id, m.nome, m.cor
    ORDER BY total_segundos DESC
  `, amigoId, seteDiasAtras);

  const totalSegundos = sessoes.reduce((sum, s) => sum + Number(s.total_segundos), 0);
  res.json({ sessoes, totalSegundos });
}));

app.get('/api/amigos/:amigoId/estudando-agora', verificarToken, wrap(async (req, res) => {
  const amigoId = req.params.amigoId;
  const amizade = await db.get('SELECT id FROM amizades WHERE usuario_id = ? AND amigo_id = ?', req.user.id, amigoId);
  if (!amizade) return res.status(403).json({ error: 'Não é seu amigo' });

  const sessaoAtiva = await db.get(`
    SELECT m.nome, m.cor, s.iniciada_em
    FROM sessoes s
    JOIN materias m ON m.id = s.materia_id
    WHERE s.usuario_id = ? AND s.finalizada_em IS NULL
    LIMIT 1
  `, amigoId);

  res.json(sessaoAtiva ? { estudando: true, ...sessaoAtiva } : { estudando: false });
}));

// ── CONFIG ────────────────────────────────────────────────
app.get('/api/config/:chave', wrap(async (req, res) => {
  const row = await db.get('SELECT valor FROM config WHERE chave = ?', req.params.chave);
  res.json({ valor: row ? row.valor : null });
}));

app.put('/api/config/:chave', wrap(async (req, res) => {
  const { valor } = req.body;
  if (valor === null || valor === undefined) {
    await db.run('DELETE FROM config WHERE chave = ?', req.params.chave);
  } else {
    await db.run('INSERT OR REPLACE INTO config (chave, valor) VALUES (?, ?)', req.params.chave, String(valor));
  }
  res.json({ ok: true });
}));

// ── MATÉRIAS ──────────────────────────────────────────────
app.get('/api/materias', wrap(async (req, res) => {
  const materias = await db.all(`
    SELECT m.*,
      COALESCE(SUM(s.duracao_segundos), 0) AS total_segundos,
      COUNT(s.id) AS total_sessoes
    FROM materias m
    LEFT JOIN sessoes s ON s.materia_id = m.id
    GROUP BY m.id
    ORDER BY m.nome
  `);
  res.json(materias);
}));

app.post('/api/materias', wrap(async (req, res) => {
  const { nome, cor, emoji } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const result = await db.insert('INSERT INTO materias (nome, cor, emoji) VALUES (?, ?, ?)', nome, cor || '#2d6a4f', emoji || '');
    const materia = await db.get('SELECT * FROM materias WHERE id = ?', result.lastInsertRowid);
    res.status(201).json(materia);
  } catch (e) {
    if (isUnique(e)) return res.status(400).json({ error: 'Matéria já existe' });
    throw e;
  }
}));

app.put('/api/materias/:id', wrap(async (req, res) => {
  const { nome, cor, emoji } = req.body;
  const { id } = req.params;
  await db.run('UPDATE materias SET nome=?, cor=?, emoji=? WHERE id=?', nome, cor, emoji, id);
  const materia = await db.get('SELECT * FROM materias WHERE id = ?', id);
  if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });
  res.json(materia);
}));

app.delete('/api/materias/:id', wrap(async (req, res) => {
  const result = await db.run('DELETE FROM materias WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Matéria não encontrada' });
  res.json({ ok: true });
}));

// ── SESSÕES ───────────────────────────────────────────────
app.get('/api/sessoes', wrap(async (req, res) => {
  const { materia_id, data_inicio, data_fim, limit = 50 } = req.query;
  let query = `
    SELECT s.*, m.nome AS materia_nome, m.cor AS materia_cor, m.emoji AS materia_emoji
    FROM sessoes s
    JOIN materias m ON m.id = s.materia_id
    WHERE 1=1
  `;
  const params = [];
  if (materia_id) { query += ' AND s.materia_id = ?'; params.push(materia_id); }
  if (data_inicio) { query += ' AND DATE(s.iniciada_em) >= ?'; params.push(data_inicio); }
  if (data_fim) { query += ' AND DATE(s.iniciada_em) <= ?'; params.push(data_fim); }
  query += ' ORDER BY s.iniciada_em DESC LIMIT ?';
  params.push(Number(limit));
  res.json(await db.all(query, ...params));
}));

app.post('/api/sessoes', verificarToken, wrap(async (req, res) => {
  const { materia_id, duracao_segundos, iniciada_em, finalizada_em, anotacao } = req.body;
  if (!materia_id || !duracao_segundos) return res.status(400).json({ error: 'materia_id e duracao_segundos são obrigatórios' });
  const now = new Date().toISOString();
  const result = await db.insert(`
    INSERT INTO sessoes (usuario_id, materia_id, duracao_segundos, iniciada_em, finalizada_em, anotacao)
    VALUES (?, ?, ?, ?, ?, ?)
  `, req.user.id, materia_id, duracao_segundos, iniciada_em || now, finalizada_em || now, anotacao || null);
  const sessao = await db.get(`
    SELECT s.*, m.nome AS materia_nome, m.cor AS materia_cor, m.emoji AS materia_emoji
    FROM sessoes s JOIN materias m ON m.id = s.materia_id WHERE s.id = ?
  `, result.lastInsertRowid);
  res.status(201).json(sessao);
}));

app.delete('/api/sessoes/:id', wrap(async (req, res) => {
  const result = await db.run('DELETE FROM sessoes WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Sessão não encontrada' });
  res.json({ ok: true });
}));

// ── TRILHAS ───────────────────────────────────────────────
app.get('/api/trilhas', wrap(async (req, res) => {
  const trilhas = await db.all(`
    SELECT t.*, COUNT(tm.materia_id) AS total_materias
    FROM trilhas t
    LEFT JOIN trilha_materias tm ON tm.trilha_id = t.id
    GROUP BY t.id
    ORDER BY t.nome
  `);

  const result = [];
  for (const t of trilhas) {
    const materias = await db.all(`
      SELECT m.id, m.nome, m.cor,
        COALESCE(SUM(s.duracao_segundos), 0) AS total_segundos
      FROM trilha_materias tm
      JOIN materias m ON m.id = tm.materia_id
      LEFT JOIN sessoes s ON s.materia_id = m.id
      WHERE tm.trilha_id = ?
      GROUP BY m.id
      ORDER BY m.nome
    `, t.id);
    result.push({ ...t, materias });
  }
  res.json(result);
}));

app.post('/api/trilhas', wrap(async (req, res) => {
  const { nome, cor, materia_ids = [] } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const trilha = await db.tx(async (q) => {
      const r = await q.insert('INSERT INTO trilhas (nome, cor) VALUES (?, ?)', nome, cor || '#2d6a4f');
      const id = r.lastInsertRowid;
      for (const mid of materia_ids) {
        await q.run('INSERT INTO trilha_materias (trilha_id, materia_id) VALUES (?, ?)', id, mid);
      }
      return q.get('SELECT * FROM trilhas WHERE id = ?', id);
    });
    res.status(201).json(trilha);
  } catch (e) {
    if (isUnique(e)) return res.status(400).json({ error: 'Trilha já existe' });
    throw e;
  }
}));

app.put('/api/trilhas/:id', wrap(async (req, res) => {
  const { nome, cor, materia_ids = [] } = req.body;
  const { id } = req.params;
  const trilha = await db.tx(async (q) => {
    await q.run('UPDATE trilhas SET nome=?, cor=? WHERE id=?', nome, cor, id);
    await q.run('DELETE FROM trilha_materias WHERE trilha_id=?', id);
    for (const mid of materia_ids) {
      await q.run('INSERT INTO trilha_materias (trilha_id, materia_id) VALUES (?, ?)', id, mid);
    }
    return q.get('SELECT * FROM trilhas WHERE id=?', id);
  });
  res.json(trilha);
}));

app.delete('/api/trilhas/:id', wrap(async (req, res) => {
  const r = await db.run('DELETE FROM trilhas WHERE id=?', req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Trilha não encontrada' });
  res.json({ ok: true });
}));

// ── CAPÍTULOS (configuráveis por trilha) ─────────────────
app.get('/api/trilhas/:id/capitulos', wrap(async (req, res) => {
  const capitulos = await db.all('SELECT * FROM capitulos WHERE trilha_id = ? ORDER BY ordem, id', req.params.id);
  const result = [];
  for (const c of capitulos) {
    const materias = await db.all(`
      SELECT m.id, m.nome, m.cor FROM capitulo_materias cm
      JOIN materias m ON m.id = cm.materia_id
      WHERE cm.capitulo_id = ? ORDER BY cm.ordem, m.nome
    `, c.id);
    const cronograma = await db.all(
      'SELECT * FROM capitulo_cronograma WHERE capitulo_id = ? ORDER BY dia_semana, hora_inicio', c.id);
    result.push({ ...c, materias, cronograma });
  }
  res.json(result);
}));

app.post('/api/trilhas/:id/capitulos', wrap(async (req, res) => {
  const { nome, emoji, descricao, materia_ids = [], cronograma = [] } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome do capítulo é obrigatório' });
  const trilhaId = req.params.id;

  const capituloId = await db.tx(async (q) => {
    const max = await q.get('SELECT COALESCE(MAX(ordem), -1) AS m FROM capitulos WHERE trilha_id = ?', trilhaId);
    const r = await q.insert(
      'INSERT INTO capitulos (trilha_id, ordem, nome, emoji, descricao) VALUES (?,?,?,?,?)',
      trilhaId, Number(max.m) + 1, nome, emoji || '📚', descricao || null);
    const id = r.lastInsertRowid;
    let i = 0;
    for (const mid of materia_ids) {
      await q.run('INSERT INTO capitulo_materias (capitulo_id, materia_id, ordem) VALUES (?,?,?)', id, mid, i++);
    }
    for (const b of cronograma) {
      await q.run(
        'INSERT INTO capitulo_cronograma (capitulo_id, dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?,?)',
        id, b.dia_semana, b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null);
    }
    return id;
  });
  res.status(201).json({ id: capituloId });
}));

app.put('/api/capitulos/:id', wrap(async (req, res) => {
  const { nome, emoji, descricao, materia_ids = [], cronograma = [] } = req.body;
  const id = req.params.id;
  if (!nome) return res.status(400).json({ error: 'Nome do capítulo é obrigatório' });

  await db.tx(async (q) => {
    await q.run('UPDATE capitulos SET nome=?, emoji=?, descricao=? WHERE id=?', nome, emoji || '📚', descricao || null, id);
    await q.run('DELETE FROM capitulo_materias WHERE capitulo_id=?', id);
    await q.run('DELETE FROM capitulo_cronograma WHERE capitulo_id=?', id);
    let i = 0;
    for (const mid of materia_ids) {
      await q.run('INSERT INTO capitulo_materias (capitulo_id, materia_id, ordem) VALUES (?,?,?)', id, mid, i++);
    }
    for (const b of cronograma) {
      await q.run(
        'INSERT INTO capitulo_cronograma (capitulo_id, dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?,?)',
        id, b.dia_semana, b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null);
    }
  });
  res.json({ ok: true });
}));

app.delete('/api/capitulos/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM capitulos WHERE id=?', req.params.id);
  res.json({ ok: true });
}));

app.put('/api/capitulos/:id/mover', wrap(async (req, res) => {
  const { direcao } = req.body; // 'cima' | 'baixo'
  const cap = await db.get('SELECT * FROM capitulos WHERE id=?', req.params.id);
  if (!cap) return res.status(404).json({ error: 'Capítulo não encontrado' });
  const vizinho = direcao === 'cima'
    ? await db.get('SELECT * FROM capitulos WHERE trilha_id=? AND ordem < ? ORDER BY ordem DESC LIMIT 1', cap.trilha_id, cap.ordem)
    : await db.get('SELECT * FROM capitulos WHERE trilha_id=? AND ordem > ? ORDER BY ordem ASC LIMIT 1', cap.trilha_id, cap.ordem);
  if (!vizinho) return res.json({ ok: true });
  await db.tx(async (q) => {
    await q.run('UPDATE capitulos SET ordem=? WHERE id=?', vizinho.ordem, cap.id);
    await q.run('UPDATE capitulos SET ordem=? WHERE id=?', cap.ordem, vizinho.id);
  });
  res.json({ ok: true });
}));

// ── DASHBOARD ─────────────────────────────────────────────
app.get('/api/dashboard', wrap(async (req, res) => {
  const { periodo = 'semana', trilha_id } = req.query;

  const filtros = {
    hoje: "DATE(s.iniciada_em) = DATE('now')",
    semana: "DATE(s.iniciada_em) >= DATE('now', '-6 days')",
    mes: "DATE(s.iniciada_em) >= DATE('now', '-29 days')",
    total: '1=1',
  };
  const wherePeriodo = filtros[periodo] || filtros.semana;
  const whereTrilha = trilha_id
    ? `m.id IN (SELECT materia_id FROM trilha_materias WHERE trilha_id = ${Number(trilha_id)})`
    : '1=1';

  const where = `${wherePeriodo} AND ${whereTrilha}`;

  const porMateria = await db.all(`
    SELECT m.id, m.nome, m.cor, m.emoji,
      COALESCE(SUM(s.duracao_segundos), 0) AS total_segundos,
      COUNT(s.id) AS total_sessoes
    FROM materias m
    LEFT JOIN sessoes s ON s.materia_id = m.id AND ${wherePeriodo}
    WHERE ${whereTrilha}
    GROUP BY m.id
    ORDER BY total_segundos DESC
  `);

  const porDia = await db.all(`
    SELECT DATE(s.iniciada_em) AS dia, SUM(s.duracao_segundos) AS total_segundos
    FROM sessoes s
    JOIN materias m ON m.id = s.materia_id
    WHERE ${where}
    GROUP BY dia
    ORDER BY dia
  `);

  const resumo = await db.get(`
    SELECT
      COALESCE(SUM(s.duracao_segundos), 0) AS total_segundos,
      COUNT(s.id) AS total_sessoes,
      COUNT(DISTINCT s.materia_id) AS materias_estudadas,
      COUNT(DISTINCT DATE(s.iniciada_em)) AS dias_estudados
    FROM sessoes s
    JOIN materias m ON m.id = s.materia_id
    WHERE ${where}
  `);

  res.json({ porMateria, porDia, resumo });
}));

// ── COMPARATIVO PLANEJADO x REALIZADO ────────────────────
app.get('/api/dashboard/comparativo', wrap(async (req, res) => {
  const blocosEstudo = await db.all(`
    SELECT materia_id, hora_inicio, hora_fim
    FROM cronograma_dias
    WHERE tipo = 'estudo' AND materia_id IS NOT NULL
      AND data >= DATE('now', '-6 days') AND data <= DATE('now')
  `);

  const planejadoPorMateria = {};
  for (const b of blocosEstudo) {
    const [hi, mi] = b.hora_inicio.split(':').map(Number);
    const [hf, mf] = b.hora_fim.split(':').map(Number);
    const segundos = ((hf * 60 + mf) - (hi * 60 + mi)) * 60;
    planejadoPorMateria[b.materia_id] = (planejadoPorMateria[b.materia_id] || 0) + Math.max(0, segundos);
  }

  const realizado = await db.all(`
    SELECT materia_id, COALESCE(SUM(duracao_segundos), 0) AS total_segundos
    FROM sessoes
    WHERE DATE(iniciada_em) >= DATE('now', '-6 days')
    GROUP BY materia_id
  `);
  const realizadoPorMateria = {};
  for (const r of realizado) realizadoPorMateria[r.materia_id] = Number(r.total_segundos);

  const materiaIds = new Set([
    ...Object.keys(planejadoPorMateria).map(Number),
    ...Object.keys(realizadoPorMateria).map(Number),
  ]);

  const materias = await db.all('SELECT id, nome, cor FROM materias');
  const materiaMap = Object.fromEntries(materias.map(m => [m.id, m]));

  const comparativo = [...materiaIds].map(id => ({
    materia_id: id,
    nome: materiaMap[id]?.nome ?? `Matéria #${id}`,
    cor: materiaMap[id]?.cor ?? '#94a3b8',
    planejado_segundos: planejadoPorMateria[id] || 0,
    realizado_segundos: realizadoPorMateria[id] || 0,
  })).sort((a, b) => b.planejado_segundos - a.planejado_segundos);

  const totalPlanejado = comparativo.reduce((s, c) => s + c.planejado_segundos, 0);
  const totalRealizado = comparativo.reduce((s, c) => s + c.realizado_segundos, 0);

  res.json({ comparativo, totalPlanejado, totalRealizado });
}));

// ── CRONOGRAMA (template semanal legado) ──────────────────
app.get('/api/cronograma', wrap(async (req, res) => {
  const blocos = await db.all(`
    SELECT c.*, m.nome as materia_nome, m.cor as materia_cor
    FROM cronograma c
    LEFT JOIN materias m ON m.id = c.materia_id
    ORDER BY c.dia_semana, c.hora_inicio
  `);
  res.json(blocos);
}));

app.post('/api/cronograma', wrap(async (req, res) => {
  const { dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  const r = await db.insert(
    'INSERT INTO cronograma (dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?)',
    dia_semana, hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null);
  res.json({ id: r.lastInsertRowid });
}));

app.put('/api/cronograma/:id', wrap(async (req, res) => {
  const { dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  await db.run(
    'UPDATE cronograma SET dia_semana=?, hora_inicio=?, hora_fim=?, tipo=?, materia_id=?, descricao=? WHERE id=?',
    dia_semana, hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null, req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/cronograma/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM cronograma WHERE id=?', req.params.id);
  res.json({ ok: true });
}));

app.post('/api/cronograma/batch', wrap(async (req, res) => {
  const blocos = req.body;
  await db.tx(async (q) => {
    for (const b of blocos) {
      await q.run('INSERT INTO cronograma (dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?)',
        b.dia_semana, b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null);
    }
  });
  res.json({ ok: true });
}));

app.post('/api/cronograma/replace', wrap(async (req, res) => {
  const blocos = req.body;
  await db.tx(async (q) => {
    await q.run('DELETE FROM cronograma');
    for (const b of blocos) {
      await q.run('INSERT INTO cronograma (dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?)',
        b.dia_semana, b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null);
    }
  });
  res.json({ ok: true });
}));

// ── CRONOGRAMA POR DATA (calendário real) ────────────────
app.get('/api/cronograma-dias', wrap(async (req, res) => {
  const { inicio, fim } = req.query;
  let query = `
    SELECT c.*, m.nome as materia_nome, m.cor as materia_cor
    FROM cronograma_dias c
    LEFT JOIN materias m ON m.id = c.materia_id
    WHERE 1=1
  `;
  const params = [];
  if (inicio) { query += ' AND c.data >= ?'; params.push(inicio); }
  if (fim) { query += ' AND c.data <= ?'; params.push(fim); }
  query += ' ORDER BY c.data, c.hora_inicio';
  res.json(await db.all(query, ...params));
}));

app.post('/api/cronograma-dias', wrap(async (req, res) => {
  const { data, hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  const r = await db.insert(
    'INSERT INTO cronograma_dias (data, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?)',
    data, hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null);
  res.json({ id: r.lastInsertRowid });
}));

app.put('/api/cronograma-dias/:id', wrap(async (req, res) => {
  const { data, hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  await db.run(
    'UPDATE cronograma_dias SET data=?, hora_inicio=?, hora_fim=?, tipo=?, materia_id=?, descricao=?, serie_id=NULL WHERE id=?',
    data, hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null, req.params.id);
  res.json({ ok: true });
}));

app.delete('/api/cronograma-dias/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM cronograma_dias WHERE id=?', req.params.id);
  res.json({ ok: true });
}));

app.put('/api/cronograma-dias/serie/:serieId', wrap(async (req, res) => {
  const { hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  await db.run(
    'UPDATE cronograma_dias SET hora_inicio=?, hora_fim=?, tipo=?, materia_id=?, descricao=? WHERE serie_id=?',
    hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null, req.params.serieId);
  res.json({ ok: true });
}));

app.delete('/api/cronograma-dias/serie/:serieId', wrap(async (req, res) => {
  await db.run('DELETE FROM cronograma_dias WHERE serie_id=?', req.params.serieId);
  res.json({ ok: true });
}));

// Aplica um template semanal gerando blocos datados só a partir de hoje.
app.post('/api/cronograma-dias/aplicar-semana', wrap(async (req, res) => {
  const { blocosSemana, semanas = 12 } = req.body;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  await db.tx(async (q) => {
    await q.run('DELETE FROM cronograma_dias WHERE data >= ?', toISO(hoje));
    const serieIds = blocosSemana.map(() => `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
    const totalDias = semanas * 7;
    for (let i = 0; i < totalDias; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      const diaSemana = d.getDay();
      for (let idx = 0; idx < blocosSemana.length; idx++) {
        const b = blocosSemana[idx];
        if (b.dia_semana !== diaSemana) continue;
        await q.run(
          'INSERT INTO cronograma_dias (data, hora_inicio, hora_fim, tipo, materia_id, descricao, serie_id) VALUES (?,?,?,?,?,?,?)',
          toISO(d), b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null, serieIds[idx]);
      }
    }
  });
  res.json({ ok: true });
}));

// ── PASSOS CONCLUÍDOS (legacy) ────────────────────────────
app.get('/api/trilhas/:id/passos', wrap(async (req, res) => {
  const rows = await db.all('SELECT passo_index FROM passos_completos WHERE trilha_id = ?', req.params.id);
  res.json(rows.map(r => r.passo_index));
}));

app.put('/api/trilhas/:id/passos/:index', wrap(async (req, res) => {
  await db.run('INSERT OR IGNORE INTO passos_completos (trilha_id, passo_index) VALUES (?, ?)', req.params.id, req.params.index);
  res.json({ ok: true });
}));

app.delete('/api/trilhas/:id/passos/:index', wrap(async (req, res) => {
  await db.run('DELETE FROM passos_completos WHERE trilha_id = ? AND passo_index = ?', req.params.id, req.params.index);
  res.json({ ok: true });
}));

// ── MATÉRIAS CONCLUÍDAS (capítulos) ──────────────────────
app.get('/api/trilhas/:id/materias-concluidas', wrap(async (req, res) => {
  const rows = await db.all('SELECT materia_id FROM materias_concluidas WHERE trilha_id = ?', req.params.id);
  res.json(rows.map(r => r.materia_id));
}));

app.put('/api/trilhas/:id/materias-concluidas/:mid', wrap(async (req, res) => {
  await db.run('INSERT OR IGNORE INTO materias_concluidas (trilha_id, materia_id) VALUES (?, ?)', req.params.id, req.params.mid);
  res.json({ ok: true });
}));

app.delete('/api/trilhas/:id/materias-concluidas/:mid', wrap(async (req, res) => {
  await db.run('DELETE FROM materias_concluidas WHERE trilha_id = ? AND materia_id = ?', req.params.id, req.params.mid);
  res.json({ ok: true });
}));

// ── START ─────────────────────────────────────────────────
db.init()
  .then(() => app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('Falha ao inicializar banco:', e);
    process.exit(1);
  });
