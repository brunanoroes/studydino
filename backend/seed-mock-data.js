const bcrypt = require('bcryptjs');
const db = require('./db');

// Materias de teste
const materias = [
  { id: 1, nome: 'Desenvolvimento Web', cor: '#f59e0b', emoji: '🌐' },
  { id: 2, nome: 'Banco de Dados', cor: '#3b82f6', emoji: '🗄️' },
  { id: 3, nome: 'Infraestrutura', cor: '#8b5cf6', emoji: '⚙️' },
  { id: 4, nome: 'Desenvolvimento de Software', cor: '#ec4899', emoji: '💻' },
  { id: 5, nome: 'Engenharia de Software', cor: '#06b6d4', emoji: '🏗️' },
  { id: 6, nome: 'Português', cor: '#f97316', emoji: '📖' },
  { id: 7, nome: 'Governança de TI', cor: '#14b8a6', emoji: '🏛️' },
  { id: 9, nome: 'Segurança da Informação', cor: '#ef4444', emoji: '🔒' },
];

// Criar materias
try {
  materias.forEach(m => {
    const r = db.prepare('INSERT OR IGNORE INTO materias (id, nome, cor, emoji) VALUES (?, ?, ?, ?)').run(m.id, m.nome, m.cor, m.emoji);
    if (r.changes) console.log('✅ Matéria criada:', m.nome);
  });
} catch(e) {
  console.log('⚠️ Algumas matérias já existem');
}

// Usuários de teste
const usuarios = [
  { username: 'ana', senha: 'teste123' },
  { username: 'carlos', senha: 'teste123' },
  { username: 'diana', senha: 'teste123' },
];

// Criar usuários
const userIds = {};
try {
  usuarios.forEach(u => {
    const hash = bcrypt.hashSync(u.senha, 10);
    const r = db.prepare('INSERT OR IGNORE INTO usuarios (username, senha_hash) VALUES (?, ?)').run(u.username, hash);
    if (r.changes) console.log('✅ Criado:', u.username);
    const user = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(u.username);
    userIds[u.username] = user.id;
  });
} catch(e) {
  console.log('⚠️ Usuários já existem, carregando IDs...');
  usuarios.forEach(u => {
    const user = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(u.username);
    if (user) userIds[u.username] = user.id;
  });
}

// Pegar ID do bruno
const bruno = db.prepare('SELECT id FROM usuarios WHERE username = ?').get('bruno');
if (!bruno) {
  console.log('❌ Erro: Usuário bruno não encontrado. Crie-o primeiro!');
  process.exit(1);
}
const brunoId = bruno.id;

// Adicionar amizades
try {
  Object.entries(userIds).forEach(([name, userId]) => {
    const r = db.prepare('INSERT OR IGNORE INTO amizades (usuario_id, amigo_id) VALUES (?, ?)').run(brunoId, userId);
    if (r.changes) console.log(`✅ Amizade criada: bruno <-> ${name}`);
  });
} catch(e) {
  console.log('⚠️ Amizades já existem');
}

// Criar sessões de estudo para simular progresso
const agora = new Date().toISOString();
const ontem = new Date(Date.now() - 24*60*60*1000).toISOString();

const sessoesMock = [
  // ANA: 70 min hoje (BD 40min + ES 20min) + 30min ontem
  { usuario_id: userIds.ana, materia_id: 2, duracao: 1800, inicio: ontem, fim: ontem }, // BD 30min ontem
  { usuario_id: userIds.ana, materia_id: 2, duracao: 2400, inicio: agora, fim: agora }, // BD 40min hoje
  { usuario_id: userIds.ana, materia_id: 5, duracao: 1200, inicio: agora, fim: agora }, // ES 20min hoje

  // CARLOS: 90 min hoje (DS 60min + PT 30min)
  { usuario_id: userIds.carlos, materia_id: 4, duracao: 3600, inicio: agora, fim: agora }, // DS 1h hoje
  { usuario_id: userIds.carlos, materia_id: 6, duracao: 1800, inicio: agora, fim: agora }, // PT 30min hoje

  // DIANA: 85 min hoje (GOV 45min + SI 40min) + 1 ATIVA
  { usuario_id: userIds.diana, materia_id: 7, duracao: 2700, inicio: agora, fim: agora }, // GOV 45min hoje
  { usuario_id: userIds.diana, materia_id: 9, duracao: 1500, inicio: agora, fim: agora }, // SI 25min hoje
  { usuario_id: userIds.diana, materia_id: 9, duracao: 900, inicio: agora, fim: agora }, // SI 15min hoje
  { usuario_id: userIds.diana, materia_id: 9, duracao: 600, inicio: agora, fim: null }, // SI ATIVA AGORA 🟢 (10min)
];

try {
  sessoesMock.forEach(s => {
    const r = db.prepare(
      'INSERT INTO sessoes (usuario_id, materia_id, duracao_segundos, iniciada_em, finalizada_em) VALUES (?, ?, ?, ?, ?)'
    ).run(s.usuario_id, s.materia_id, s.duracao, s.inicio, s.fim);
    if (r.changes) {
      const status = s.fim ? '✅' : '🟢';
      console.log(`${status} Sessão criada: usuário ${s.usuario_id}, materia ${s.materia_id}, ${s.duracao}s`);
    }
  });
  console.log('\n📊 Dados de teste criados com sucesso!\n');
  console.log('Usuários: bruno, ana, carlos, diana');
  console.log('Senha: teste123\n');
  console.log('📈 Progresso hoje:');
  console.log('  🔹 Ana: 70 min (BD 40min + ES 20min)');
  console.log('  🔹 Carlos: 90 min (DS 60min + PT 30min)');
  console.log('  🔹 Diana: 85 min (GOV 45min + SI 40min) ← SI com sessão ATIVA! 🟢\n');
} catch(e) {
  console.log('⚠️ Erro ao criar sessões:', e.message);
  process.exit(1);
}
