const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui-mude-em-producao';
const JWT_EXPIRATION = '7d';
const PORT = process.env.PORT || 3001;

// ── AUTENTICAÇÃO ──────────────────────────────────────────
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

app.post('/api/auth/registro', (req, res) => {
  const { username, senha } = req.body;
  if (!username || !senha) return res.status(400).json({ error: 'Username e senha obrigatórios' });
  if (username.length < 3) return res.status(400).json({ error: 'Username deve ter mínimo 3 caracteres' });
  if (!/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(senha)) {
    return res.status(400).json({ error: 'Senha deve ter mínimo 6 caracteres, 1 letra e 1 número' });
  }

  try {
    const usuario = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username);
    if (usuario) return res.status(409).json({ error: 'Username já existe' });

    const senhaHash = bcrypt.hashSync(senha, 10);
    const r = db.prepare('INSERT INTO usuarios (username, senha_hash) VALUES (?, ?)').run(username, senhaHash);
    const token = jwt.sign({ id: r.lastInsertRowid, username }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

    res.status(201).json({ id: r.lastInsertRowid, username, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, senha } = req.body;
  if (!username || !senha) return res.status(400).json({ error: 'Username e senha obrigatórios' });

  try {
    const usuario = db.prepare('SELECT id, username, senha_hash FROM usuarios WHERE username = ?').get(username);
    if (!usuario) return res.status(401).json({ error: 'Username ou senha incorretos' });

    if (!bcrypt.compareSync(senha, usuario.senha_hash)) {
      return res.status(401).json({ error: 'Username ou senha incorretos' });
    }

    const token = jwt.sign({ id: usuario.id, username: usuario.username }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    res.json({ id: usuario.id, username: usuario.username, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', verificarToken, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

// ── AMIZADES ──────────────────────────────────────────────
app.post('/api/amigos/adicionar', verificarToken, (req, res) => {
  const { username_amigo } = req.body;
  if (!username_amigo) return res.status(400).json({ error: 'Username obrigatório' });

  try {
    const amigo = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username_amigo);
    if (!amigo) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (amigo.id === req.user.id) return res.status(400).json({ error: 'Não pode adicionar a si mesmo' });

    db.prepare('INSERT OR IGNORE INTO amizades (usuario_id, amigo_id) VALUES (?, ?)').run(req.user.id, amigo.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/amigos', verificarToken, (req, res) => {
  try {
    const amigos = db.prepare(`
      SELECT u.id, u.username FROM amizades a
      JOIN usuarios u ON u.id = a.amigo_id
      WHERE a.usuario_id = ?
      ORDER BY u.username
    `).all(req.user.id);
    res.json(amigos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/amigos/:amigoId', verificarToken, (req, res) => {
  try {
    db.prepare('DELETE FROM amizades WHERE usuario_id = ? AND amigo_id = ?').run(req.user.id, req.params.amigoId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/amigos/:amigoId/progresso', verificarToken, (req, res) => {
  try {
    const amigoId = req.params.amigoId;
    // Verifica se é amigo
    const amizade = db.prepare('SELECT id FROM amizades WHERE usuario_id = ? AND amigo_id = ?').get(req.user.id, amigoId);
    if (!amizade) return res.status(403).json({ error: 'Não é seu amigo' });

    const agora = new Date();
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const sessoes = db.prepare(`
      SELECT m.nome, m.cor, SUM(s.duracao_segundos) as total_segundos
      FROM sessoes s
      JOIN materias m ON m.id = s.materia_id
      WHERE s.usuario_id = ? AND s.finalizada_em >= ?
      GROUP BY s.materia_id, m.nome, m.cor
      ORDER BY total_segundos DESC
    `).all(amigoId, seteDiasAtras);

    const totalSegundos = sessoes.reduce((sum, s) => sum + s.total_segundos, 0);
    res.json({ sessoes, totalSegundos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/amigos/:amigoId/estudando-agora', verificarToken, (req, res) => {
  try {
    const amigoId = req.params.amigoId;
    const amizade = db.prepare('SELECT id FROM amizades WHERE usuario_id = ? AND amigo_id = ?').get(req.user.id, amigoId);
    if (!amizade) return res.status(403).json({ error: 'Não é seu amigo' });

    const sessaoAtiva = db.prepare(`
      SELECT m.nome, m.cor, s.iniciada_em
      FROM sessoes s
      JOIN materias m ON m.id = s.materia_id
      WHERE s.usuario_id = ? AND s.finalizada_em IS NULL
      LIMIT 1
    `).get(amigoId);

    if (sessaoAtiva) {
      res.json({ estudando: true, ...sessaoAtiva });
    } else {
      res.json({ estudando: false });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── CONFIG ────────────────────────────────────────────────
app.get('/api/config/:chave', (req, res) => {
  const row = db.prepare('SELECT valor FROM config WHERE chave = ?').get(req.params.chave);
  res.json({ valor: row ? row.valor : null });
});

app.put('/api/config/:chave', (req, res) => {
  const { valor } = req.body;
  if (valor === null || valor === undefined) {
    db.prepare('DELETE FROM config WHERE chave = ?').run(req.params.chave);
  } else {
    db.prepare('INSERT OR REPLACE INTO config (chave, valor) VALUES (?, ?)').run(req.params.chave, String(valor));
  }
  res.json({ ok: true });
});

// ── MATÉRIAS ──────────────────────────────────────────────
app.get('/api/materias', (req, res) => {
  const materias = db.prepare(`
    SELECT m.*,
      COALESCE(SUM(s.duracao_segundos), 0) AS total_segundos,
      COUNT(s.id) AS total_sessoes
    FROM materias m
    LEFT JOIN sessoes s ON s.materia_id = m.id
    GROUP BY m.id
    ORDER BY m.nome
  `).all();
  res.json(materias);
});

app.post('/api/materias', (req, res) => {
  const { nome, cor, emoji } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const result = db.prepare(
      'INSERT INTO materias (nome, cor, emoji) VALUES (?, ?, ?)'
    ).run(nome, cor || '#2d6a4f', emoji || '');
    const materia = db.prepare('SELECT * FROM materias WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(materia);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Matéria já existe' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/materias/:id', (req, res) => {
  const { nome, cor, emoji } = req.body;
  const { id } = req.params;
  try {
    db.prepare('UPDATE materias SET nome=?, cor=?, emoji=? WHERE id=?').run(nome, cor, emoji, id);
    const materia = db.prepare('SELECT * FROM materias WHERE id = ?').get(id);
    if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });
    res.json(materia);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/materias/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM materias WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Matéria não encontrada' });
  res.json({ ok: true });
});

// ── SESSÕES ───────────────────────────────────────────────
app.get('/api/sessoes', (req, res) => {
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
  res.json(db.prepare(query).all(...params));
});

app.post('/api/sessoes', verificarToken, (req, res) => {
  const { materia_id, duracao_segundos, iniciada_em, finalizada_em, anotacao } = req.body;
  if (!materia_id || !duracao_segundos) return res.status(400).json({ error: 'materia_id e duracao_segundos são obrigatórios' });
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO sessoes (usuario_id, materia_id, duracao_segundos, iniciada_em, finalizada_em, anotacao)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, materia_id, duracao_segundos, iniciada_em || now, finalizada_em || now, anotacao || null);
  const sessao = db.prepare(`
    SELECT s.*, m.nome AS materia_nome, m.cor AS materia_cor, m.emoji AS materia_emoji
    FROM sessoes s JOIN materias m ON m.id = s.materia_id WHERE s.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(sessao);
});

app.delete('/api/sessoes/:id', (req, res) => {
  const result = db.prepare('DELETE FROM sessoes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Sessão não encontrada' });
  res.json({ ok: true });
});

// ── TRILHAS ───────────────────────────────────────────────
app.get('/api/trilhas', (req, res) => {
  const trilhas = db.prepare(`
    SELECT t.*,
      COUNT(tm.materia_id) AS total_materias
    FROM trilhas t
    LEFT JOIN trilha_materias tm ON tm.trilha_id = t.id
    GROUP BY t.id
    ORDER BY t.nome
  `).all();

  const result = trilhas.map(t => ({
    ...t,
    materias: db.prepare(`
      SELECT m.id, m.nome, m.cor,
        COALESCE(SUM(s.duracao_segundos), 0) AS total_segundos
      FROM trilha_materias tm
      JOIN materias m ON m.id = tm.materia_id
      LEFT JOIN sessoes s ON s.materia_id = m.id
      WHERE tm.trilha_id = ?
      GROUP BY m.id
      ORDER BY m.nome
    `).all(t.id),
  }));

  res.json(result);
});

app.post('/api/trilhas', (req, res) => {
  const { nome, cor, materia_ids = [] } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const r = db.prepare('INSERT INTO trilhas (nome, cor) VALUES (?, ?)').run(nome, cor || '#2d6a4f');
    const id = r.lastInsertRowid;
    const insMateria = db.prepare('INSERT INTO trilha_materias (trilha_id, materia_id) VALUES (?, ?)');
    db.transaction(() => materia_ids.forEach((mid) => insMateria.run(id, mid)))();
    res.status(201).json(db.prepare('SELECT * FROM trilhas WHERE id = ?').get(id));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Trilha já existe' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/trilhas/:id', (req, res) => {
  const { nome, cor, materia_ids = [] } = req.body;
  const { id } = req.params;
  try {
    db.prepare('UPDATE trilhas SET nome=?, cor=? WHERE id=?').run(nome, cor, id);
    db.prepare('DELETE FROM trilha_materias WHERE trilha_id=?').run(id);
    const ins = db.prepare('INSERT INTO trilha_materias (trilha_id, materia_id) VALUES (?, ?)');
    db.transaction(() => materia_ids.forEach((mid) => ins.run(id, mid)))();
    res.json(db.prepare('SELECT * FROM trilhas WHERE id=?').get(id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/trilhas/:id', (req, res) => {
  const r = db.prepare('DELETE FROM trilhas WHERE id=?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Trilha não encontrada' });
  res.json({ ok: true });
});

// ── CAPÍTULOS (configuráveis por trilha) ─────────────────
app.get('/api/trilhas/:id/capitulos', (req, res) => {
  const capitulos = db.prepare('SELECT * FROM capitulos WHERE trilha_id = ? ORDER BY ordem, id').all(req.params.id);
  const result = capitulos.map(c => ({
    ...c,
    materias: db.prepare(`
      SELECT m.id, m.nome, m.cor FROM capitulo_materias cm
      JOIN materias m ON m.id = cm.materia_id
      WHERE cm.capitulo_id = ? ORDER BY cm.ordem, m.nome
    `).all(c.id),
    cronograma: db.prepare(
      'SELECT * FROM capitulo_cronograma WHERE capitulo_id = ? ORDER BY dia_semana, hora_inicio'
    ).all(c.id),
  }));
  res.json(result);
});

app.post('/api/trilhas/:id/capitulos', (req, res) => {
  const { nome, emoji, descricao, materia_ids = [], cronograma = [] } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome do capítulo é obrigatório' });
  const trilhaId = req.params.id;
  const maxOrdem = db.prepare('SELECT COALESCE(MAX(ordem), -1) AS m FROM capitulos WHERE trilha_id = ?').get(trilhaId).m;

  const r = db.prepare('INSERT INTO capitulos (trilha_id, ordem, nome, emoji, descricao) VALUES (?,?,?,?,?)')
    .run(trilhaId, maxOrdem + 1, nome, emoji || '📚', descricao || null);
  const capituloId = r.lastInsertRowid;

  const insMat = db.prepare('INSERT INTO capitulo_materias (capitulo_id, materia_id, ordem) VALUES (?,?,?)');
  const insCron = db.prepare(
    'INSERT INTO capitulo_cronograma (capitulo_id, dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?,?)'
  );
  db.transaction(() => {
    materia_ids.forEach((mid, i) => insMat.run(capituloId, mid, i));
    cronograma.forEach(b => insCron.run(capituloId, b.dia_semana, b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null));
  })();

  res.status(201).json({ id: capituloId });
});

app.put('/api/capitulos/:id', (req, res) => {
  const { nome, emoji, descricao, materia_ids = [], cronograma = [] } = req.body;
  const id = req.params.id;
  if (!nome) return res.status(400).json({ error: 'Nome do capítulo é obrigatório' });

  db.prepare('UPDATE capitulos SET nome=?, emoji=?, descricao=? WHERE id=?').run(nome, emoji || '📚', descricao || null, id);
  db.prepare('DELETE FROM capitulo_materias WHERE capitulo_id=?').run(id);
  db.prepare('DELETE FROM capitulo_cronograma WHERE capitulo_id=?').run(id);

  const insMat = db.prepare('INSERT INTO capitulo_materias (capitulo_id, materia_id, ordem) VALUES (?,?,?)');
  const insCron = db.prepare(
    'INSERT INTO capitulo_cronograma (capitulo_id, dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?,?)'
  );
  db.transaction(() => {
    materia_ids.forEach((mid, i) => insMat.run(id, mid, i));
    cronograma.forEach(b => insCron.run(id, b.dia_semana, b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null));
  })();

  res.json({ ok: true });
});

app.delete('/api/capitulos/:id', (req, res) => {
  db.prepare('DELETE FROM capitulos WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.put('/api/capitulos/:id/mover', (req, res) => {
  const { direcao } = req.body; // 'cima' | 'baixo'
  const cap = db.prepare('SELECT * FROM capitulos WHERE id=?').get(req.params.id);
  if (!cap) return res.status(404).json({ error: 'Capítulo não encontrado' });
  const vizinho = direcao === 'cima'
    ? db.prepare('SELECT * FROM capitulos WHERE trilha_id=? AND ordem < ? ORDER BY ordem DESC LIMIT 1').get(cap.trilha_id, cap.ordem)
    : db.prepare('SELECT * FROM capitulos WHERE trilha_id=? AND ordem > ? ORDER BY ordem ASC LIMIT 1').get(cap.trilha_id, cap.ordem);
  if (!vizinho) return res.json({ ok: true });
  db.transaction(() => {
    db.prepare('UPDATE capitulos SET ordem=? WHERE id=?').run(vizinho.ordem, cap.id);
    db.prepare('UPDATE capitulos SET ordem=? WHERE id=?').run(cap.ordem, vizinho.id);
  })();
  res.json({ ok: true });
});

// ── DASHBOARD ─────────────────────────────────────────────
app.get('/api/dashboard', (req, res) => {
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
  const whereMateria = whereTrilha;

  const porMateria = db.prepare(`
    SELECT m.id, m.nome, m.cor, m.emoji,
      COALESCE(SUM(s.duracao_segundos), 0) AS total_segundos,
      COUNT(s.id) AS total_sessoes
    FROM materias m
    LEFT JOIN sessoes s ON s.materia_id = m.id AND ${wherePeriodo}
    WHERE ${whereMateria}
    GROUP BY m.id
    ORDER BY total_segundos DESC
  `).all();

  const porDia = db.prepare(`
    SELECT DATE(s.iniciada_em) AS dia, SUM(s.duracao_segundos) AS total_segundos
    FROM sessoes s
    JOIN materias m ON m.id = s.materia_id
    WHERE ${where}
    GROUP BY dia
    ORDER BY dia
  `).all();

  const resumo = db.prepare(`
    SELECT
      COALESCE(SUM(s.duracao_segundos), 0) AS total_segundos,
      COUNT(s.id) AS total_sessoes,
      COUNT(DISTINCT s.materia_id) AS materias_estudadas,
      COUNT(DISTINCT DATE(s.iniciada_em)) AS dias_estudados
    FROM sessoes s
    JOIN materias m ON m.id = s.materia_id
    WHERE ${where}
  `).get();

  res.json({ porMateria, porDia, resumo });
});

// ── CRONOGRAMA POR DATA (calendário real) ────────────────
app.get('/api/cronograma-dias', (req, res) => {
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
  res.json(db.prepare(query).all(...params));
});

app.post('/api/cronograma-dias', (req, res) => {
  const { data, hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  const r = db.prepare(
    'INSERT INTO cronograma_dias (data, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?)'
  ).run(data, hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null);
  res.json({ id: r.lastInsertRowid });
});

// Atualiza só esta ocorrência (some-se da série, vira um evento avulso)
app.put('/api/cronograma-dias/:id', (req, res) => {
  const { data, hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  db.prepare(
    'UPDATE cronograma_dias SET data=?, hora_inicio=?, hora_fim=?, tipo=?, materia_id=?, descricao=?, serie_id=NULL WHERE id=?'
  ).run(data, hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/cronograma-dias/:id', (req, res) => {
  db.prepare('DELETE FROM cronograma_dias WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Atualiza todas as ocorrências da série (mesmo horário/tipo/matéria em todas as datas futuras e passadas)
app.put('/api/cronograma-dias/serie/:serieId', (req, res) => {
  const { hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  db.prepare(
    'UPDATE cronograma_dias SET hora_inicio=?, hora_fim=?, tipo=?, materia_id=?, descricao=? WHERE serie_id=?'
  ).run(hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null, req.params.serieId);
  res.json({ ok: true });
});

app.delete('/api/cronograma-dias/serie/:serieId', (req, res) => {
  db.prepare('DELETE FROM cronograma_dias WHERE serie_id=?').run(req.params.serieId);
  res.json({ ok: true });
});

// Aplica um template semanal (capítulo) gerando blocos datados só a partir de hoje.
// Não mexe em datas passadas — preserva o histórico. Cada bloco do template vira
// uma "série" (serie_id) que se repete toda semana, para permitir editar/excluir
// "somente este" ou "todos os eventos" depois.
app.post('/api/cronograma-dias/aplicar-semana', (req, res) => {
  const { blocosSemana, semanas = 12 } = req.body;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const toISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const insert = db.prepare(
    'INSERT INTO cronograma_dias (data, hora_inicio, hora_fim, tipo, materia_id, descricao, serie_id) VALUES (?,?,?,?,?,?,?)'
  );

  db.transaction(() => {
    // Remove apenas planejamento futuro (data >= hoje), preservando histórico passado
    db.prepare('DELETE FROM cronograma_dias WHERE data >= ?').run(toISO(hoje));

    const serieIds = blocosSemana.map(() => `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
    const totalDias = semanas * 7;
    for (let i = 0; i < totalDias; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      const diaSemana = d.getDay(); // 0=Dom..6=Sab
      blocosSemana.forEach((b, idx) => {
        if (b.dia_semana !== diaSemana) return;
        insert.run(toISO(d), b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null, serieIds[idx]);
      });
    }
  })();

  res.json({ ok: true });
});

// ── COMPARATIVO PLANEJADO x REALIZADO ────────────────────
app.get('/api/dashboard/comparativo', (req, res) => {
  // Planejado: blocos 'estudo' do cronograma_dias nos últimos 7 dias (mesma janela do realizado)
  const blocosEstudo = db.prepare(`
    SELECT materia_id, hora_inicio, hora_fim
    FROM cronograma_dias
    WHERE tipo = 'estudo' AND materia_id IS NOT NULL
      AND data >= DATE('now', '-6 days') AND data <= DATE('now')
  `).all();

  const planejadoPorMateria = {};
  for (const b of blocosEstudo) {
    const [hi, mi] = b.hora_inicio.split(':').map(Number);
    const [hf, mf] = b.hora_fim.split(':').map(Number);
    const segundos = ((hf * 60 + mf) - (hi * 60 + mi)) * 60;
    planejadoPorMateria[b.materia_id] = (planejadoPorMateria[b.materia_id] || 0) + Math.max(0, segundos);
  }

  // Realizado: últimos 7 dias, por matéria
  const realizado = db.prepare(`
    SELECT materia_id, COALESCE(SUM(duracao_segundos), 0) AS total_segundos
    FROM sessoes
    WHERE DATE(iniciada_em) >= DATE('now', '-6 days')
    GROUP BY materia_id
  `).all();
  const realizadoPorMateria = {};
  for (const r of realizado) realizadoPorMateria[r.materia_id] = r.total_segundos;

  const materiaIds = new Set([
    ...Object.keys(planejadoPorMateria).map(Number),
    ...Object.keys(realizadoPorMateria).map(Number),
  ]);

  const materias = db.prepare('SELECT id, nome, cor FROM materias').all();
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
});

// ── CRONOGRAMA ────────────────────────────────────────────
app.get('/api/cronograma', (req, res) => {
  const blocos = db.prepare(`
    SELECT c.*, m.nome as materia_nome, m.cor as materia_cor
    FROM cronograma c
    LEFT JOIN materias m ON m.id = c.materia_id
    ORDER BY c.dia_semana, c.hora_inicio
  `).all();
  res.json(blocos);
});

app.post('/api/cronograma', (req, res) => {
  const { dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  const r = db.prepare(
    'INSERT INTO cronograma (dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?)'
  ).run(dia_semana, hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/cronograma/:id', (req, res) => {
  const { dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao } = req.body;
  db.prepare(
    'UPDATE cronograma SET dia_semana=?, hora_inicio=?, hora_fim=?, tipo=?, materia_id=?, descricao=? WHERE id=?'
  ).run(dia_semana, hora_inicio, hora_fim, tipo, materia_id ?? null, descricao ?? null, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/cronograma/:id', (req, res) => {
  db.prepare('DELETE FROM cronograma WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/cronograma/batch', (req, res) => {
  const blocos = req.body;
  const insert = db.prepare(
    'INSERT INTO cronograma (dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?)'
  );
  const insertMany = db.transaction((items) => {
    for (const b of items) insert.run(b.dia_semana, b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null);
  });
  insertMany(blocos);
  res.json({ ok: true });
});

// Limpa tudo e insere novos blocos em uma transação
app.post('/api/cronograma/replace', (req, res) => {
  const blocos = req.body;
  const insert = db.prepare(
    'INSERT INTO cronograma (dia_semana, hora_inicio, hora_fim, tipo, materia_id, descricao) VALUES (?,?,?,?,?,?)'
  );
  db.transaction(() => {
    db.prepare('DELETE FROM cronograma').run();
    for (const b of blocos) insert.run(b.dia_semana, b.hora_inicio, b.hora_fim, b.tipo, b.materia_id ?? null, b.descricao ?? null);
  })();
  res.json({ ok: true });
});

// ── PASSOS CONCLUÍDOS (legacy) ────────────────────────────
app.get('/api/trilhas/:id/passos', (req, res) => {
  const rows = db.prepare('SELECT passo_index FROM passos_completos WHERE trilha_id = ?').all(req.params.id);
  res.json(rows.map(r => r.passo_index));
});

app.put('/api/trilhas/:id/passos/:index', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO passos_completos (trilha_id, passo_index) VALUES (?, ?)').run(req.params.id, req.params.index);
  res.json({ ok: true });
});

app.delete('/api/trilhas/:id/passos/:index', (req, res) => {
  db.prepare('DELETE FROM passos_completos WHERE trilha_id = ? AND passo_index = ?').run(req.params.id, req.params.index);
  res.json({ ok: true });
});

// ── MATÉRIAS CONCLUÍDAS (capítulos) ──────────────────────
app.get('/api/trilhas/:id/materias-concluidas', (req, res) => {
  const rows = db.prepare('SELECT materia_id FROM materias_concluidas WHERE trilha_id = ?').all(req.params.id);
  res.json(rows.map(r => r.materia_id));
});

app.put('/api/trilhas/:id/materias-concluidas/:mid', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO materias_concluidas (trilha_id, materia_id) VALUES (?, ?)').run(req.params.id, req.params.mid);
  res.json({ ok: true });
});

app.delete('/api/trilhas/:id/materias-concluidas/:mid', (req, res) => {
  db.prepare('DELETE FROM materias_concluidas WHERE trilha_id = ? AND materia_id = ?').run(req.params.id, req.params.mid);
  res.json({ ok: true });
});

// ── MIGRAÇÃO DE DADOS ───────────────────────────────────
app.post('/api/admin/migrate-mock-data', verificarToken, (req, res) => {
  try {
    const { source_username, target_username } = req.body;
    if (!source_username || !target_username) {
      return res.status(400).json({ error: 'source_username e target_username obrigatórios' });
    }

    const source = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(source_username);
    const target = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(target_username);

    if (!source) return res.status(404).json({ error: 'Usuário origem não encontrado' });
    if (!target) return res.status(404).json({ error: 'Usuário destino não encontrado' });

    // Copiar sessões de estudo
    const sessoes = db.prepare('SELECT * FROM sessoes WHERE usuario_id = ?').all(source.id);
    const insertSessao = db.prepare(
      'INSERT INTO sessoes (usuario_id, materia_id, duracao_segundos, iniciada_em, finalizada_em) VALUES (?, ?, ?, ?, ?)'
    );

    sessoes.forEach(s => {
      insertSessao.run(target.id, s.materia_id, s.duracao_segundos, s.iniciada_em, s.finalizada_em);
    });

    res.json({
      ok: true,
      message: `${sessoes.length} sessões migradas de ${source_username} para ${target_username}`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
