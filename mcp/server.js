#!/usr/bin/env node

const http = require('http');
const path = require('path');
const db = require(path.join(__dirname, '../backend/db.js'));

// Protocolo MCP via stdin/stdout
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// ──── MCP Protocol Helpers ────
function send(message) {
  console.log(JSON.stringify(message));
}

function sendError(id, code, message) {
  send({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  });
}

function sendResult(id, result) {
  send({
    jsonrpc: '2.0',
    id,
    result,
  });
}

// ──── Resource Handlers ────
function getResource(uri) {
  if (uri === 'studydino://materias') {
    const materias = db.prepare('SELECT * FROM materias').all();
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(materias, null, 2),
    };
  }

  if (uri === 'studydino://trilhas') {
    const trilhas = db.prepare('SELECT * FROM trilhas').all();
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(trilhas, null, 2),
    };
  }

  if (uri === 'studydino://cronograma') {
    const cronograma = db.prepare('SELECT * FROM cronograma').all();
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(cronograma, null, 2),
    };
  }

  if (uri.startsWith('studydino://trilhas/')) {
    const trilhaId = parseInt(uri.split('/').pop());
    const trilha = db.prepare('SELECT * FROM trilhas WHERE id = ?').get(trilhaId);
    const materias = db
      .prepare(`
        SELECT m.* FROM materias m
        JOIN trilha_materias tm ON m.id = tm.materia_id
        WHERE tm.trilha_id = ?
      `)
      .all(trilhaId);

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({ trilha, materias }, null, 2),
    };
  }

  return null;
}

// ──── Tool Handlers ────
function handleTool(name, args) {
  try {
    switch (name) {
      case 'criar_materia':
        return criarMateria(args);
      case 'atualizar_materia':
        return atualizarMateria(args);
      case 'deletar_materia':
        return deletarMateria(args);
      case 'criar_trilha':
        return criarTrilha(args);
      case 'atualizar_trilha':
        return atualizarTrilha(args);
      case 'deletar_trilha':
        return deletarTrilha(args);
      case 'adicionar_materia_trilha':
        return adicionarMateriaTrilha(args);
      case 'remover_materia_trilha':
        return removerMateriaTrilha(args);
      case 'criar_usuario':
        return criarUsuario(args);
      case 'migrar_dados_mockados':
        return migrarDadosMockados(args);
      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error) {
    throw error;
  }
}

// ──── User Management ────
function criarUsuario({ username, senha }) {
  const usuarioExistente = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username);
  if (usuarioExistente) {
    throw new Error('Usuário já existe');
  }

  const bcrypt = require('bcryptjs');
  const senhaHash = bcrypt.hashSync(senha, 10);
  const result = db.prepare('INSERT INTO usuarios (username, senha_hash) VALUES (?, ?)').run(username, senhaHash);

  return {
    success: true,
    id: result.lastID,
    username,
    message: `Usuário ${username} criado com sucesso`
  };
}

function migrarDadosMockados({ source_username, target_username }) {
  const source = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(source_username);
  const target = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(target_username);

  if (!source) throw new Error(`Usuário origem ${source_username} não encontrado`);
  if (!target) throw new Error(`Usuário destino ${target_username} não encontrado`);

  // Copiar sessões de estudo
  const sessoes = db.prepare('SELECT * FROM sessoes WHERE usuario_id = ?').all(source.id);
  const insertSessao = db.prepare(
    'INSERT INTO sessoes (usuario_id, materia_id, duracao_segundos, iniciada_em, finalizada_em) VALUES (?, ?, ?, ?, ?)'
  );

  let count = 0;
  sessoes.forEach(s => {
    insertSessao.run(target.id, s.materia_id, s.duracao_segundos, s.iniciada_em, s.finalizada_em);
    count++;
  });

  return {
    success: true,
    sessoes_migradas: count,
    message: `${count} sessões de estudo migradas de ${source_username} para ${target_username}`
  };
}

function criarMateria({ nome, cor = '#4CAF50', emoji = '📚' }) {
  const result = db.prepare('INSERT INTO materias (nome, cor, emoji) VALUES (?, ?, ?)').run(nome, cor, emoji);
  return {
    id: result.lastID,
    nome,
    cor,
    emoji,
    criada_em: new Date().toISOString(),
  };
}

function atualizarMateria({ id, nome, cor, emoji }) {
  const updates = [];
  const values = [];

  if (nome !== undefined) {
    updates.push('nome = ?');
    values.push(nome);
  }
  if (cor !== undefined) {
    updates.push('cor = ?');
    values.push(cor);
  }
  if (emoji !== undefined) {
    updates.push('emoji = ?');
    values.push(emoji);
  }

  if (updates.length === 0) return { error: 'No fields to update' };

  values.push(id);
  db.prepare(`UPDATE materias SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return db.prepare('SELECT * FROM materias WHERE id = ?').get(id);
}

function deletarMateria({ id }) {
  db.prepare('DELETE FROM materias WHERE id = ?').run(id);
  return { success: true, id };
}

function criarTrilha({ nome, cor = '#2d6a4f' }) {
  const result = db.prepare('INSERT INTO trilhas (nome, cor) VALUES (?, ?)').run(nome, cor);
  return {
    id: result.lastID,
    nome,
    cor,
    criada_em: new Date().toISOString(),
  };
}

function atualizarTrilha({ id, nome, cor }) {
  const updates = [];
  const values = [];

  if (nome !== undefined) {
    updates.push('nome = ?');
    values.push(nome);
  }
  if (cor !== undefined) {
    updates.push('cor = ?');
    values.push(cor);
  }

  if (updates.length === 0) return { error: 'No fields to update' };

  values.push(id);
  db.prepare(`UPDATE trilhas SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return db.prepare('SELECT * FROM trilhas WHERE id = ?').get(id);
}

function deletarTrilha({ id }) {
  db.prepare('DELETE FROM trilhas WHERE id = ?').run(id);
  return { success: true, id };
}

function adicionarMateriaTrilha({ trilha_id, materia_id }) {
  db.prepare('INSERT INTO trilha_materias (trilha_id, materia_id) VALUES (?, ?)').run(trilha_id, materia_id);
  return { success: true, trilha_id, materia_id };
}

function removerMateriaTrilha({ trilha_id, materia_id }) {
  db.prepare('DELETE FROM trilha_materias WHERE trilha_id = ? AND materia_id = ?').run(trilha_id, materia_id);
  return { success: true, trilha_id, materia_id };
}

// ──── MCP Message Handler ────
rl.on('line', (line) => {
  try {
    const message = JSON.parse(line);

    if (message.method === 'initialize') {
      sendResult(message.id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          resources: {
            listChanged: false,
          },
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: 'StudyDino MCP Server',
          version: '1.0.0',
        },
      });
    } else if (message.method === 'resources/list') {
      sendResult(message.id, {
        resources: [
          {
            uri: 'studydino://materias',
            name: 'Matérias',
            description: 'Lista de todas as matérias',
            mimeType: 'application/json',
          },
          {
            uri: 'studydino://trilhas',
            name: 'Trilhas',
            description: 'Lista de todas as trilhas',
            mimeType: 'application/json',
          },
          {
            uri: 'studydino://cronograma',
            name: 'Cronograma',
            description: 'Cronograma de estudo',
            mimeType: 'application/json',
          },
        ],
      });
    } else if (message.method === 'resources/read') {
      const resource = getResource(message.params.uri);
      if (resource) {
        sendResult(message.id, resource);
      } else {
        sendError(message.id, -32602, 'Resource not found');
      }
    } else if (message.method === 'tools/list') {
      sendResult(message.id, {
        tools: [
          {
            name: 'criar_materia',
            description: 'Cria uma nova matéria',
            inputSchema: {
              type: 'object',
              properties: {
                nome: { type: 'string', description: 'Nome da matéria' },
                cor: { type: 'string', description: 'Cor em hex (ex: #FF0000)' },
                emoji: { type: 'string', description: 'Emoji da matéria' },
              },
              required: ['nome'],
            },
          },
          {
            name: 'atualizar_materia',
            description: 'Atualiza uma matéria existente',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID da matéria' },
                nome: { type: 'string', description: 'Novo nome' },
                cor: { type: 'string', description: 'Nova cor' },
                emoji: { type: 'string', description: 'Novo emoji' },
              },
              required: ['id'],
            },
          },
          {
            name: 'deletar_materia',
            description: 'Deleta uma matéria',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID da matéria' },
              },
              required: ['id'],
            },
          },
          {
            name: 'criar_trilha',
            description: 'Cria uma nova trilha de estudo',
            inputSchema: {
              type: 'object',
              properties: {
                nome: { type: 'string', description: 'Nome da trilha' },
                cor: { type: 'string', description: 'Cor em hex' },
              },
              required: ['nome'],
            },
          },
          {
            name: 'atualizar_trilha',
            description: 'Atualiza uma trilha existente',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID da trilha' },
                nome: { type: 'string', description: 'Novo nome' },
                cor: { type: 'string', description: 'Nova cor' },
              },
              required: ['id'],
            },
          },
          {
            name: 'deletar_trilha',
            description: 'Deleta uma trilha',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'ID da trilha' },
              },
              required: ['id'],
            },
          },
          {
            name: 'adicionar_materia_trilha',
            description: 'Adiciona uma matéria a uma trilha',
            inputSchema: {
              type: 'object',
              properties: {
                trilha_id: { type: 'number', description: 'ID da trilha' },
                materia_id: { type: 'number', description: 'ID da matéria' },
              },
              required: ['trilha_id', 'materia_id'],
            },
          },
          {
            name: 'remover_materia_trilha',
            description: 'Remove uma matéria de uma trilha',
            inputSchema: {
              type: 'object',
              properties: {
                trilha_id: { type: 'number', description: 'ID da trilha' },
                materia_id: { type: 'number', description: 'ID da matéria' },
              },
              required: ['trilha_id', 'materia_id'],
            },
          },
          {
            name: 'criar_usuario',
            description: 'Cria um novo usuário no sistema',
            inputSchema: {
              type: 'object',
              properties: {
                username: { type: 'string', description: 'Nome de usuário' },
                senha: { type: 'string', description: 'Senha do usuário (mín 6 chars, 1 letra, 1 número)' },
              },
              required: ['username', 'senha'],
            },
          },
          {
            name: 'migrar_dados_mockados',
            description: 'Migra dados de estudo de um usuário para outro',
            inputSchema: {
              type: 'object',
              properties: {
                source_username: { type: 'string', description: 'Username origem (com dados mockados)' },
                target_username: { type: 'string', description: 'Username destino (para receber os dados)' },
              },
              required: ['source_username', 'target_username'],
            },
          },
        ],
      });
    } else if (message.method === 'tools/call') {
      try {
        const result = handleTool(message.params.name, message.params.arguments);
        sendResult(message.id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
      } catch (error) {
        sendError(message.id, -32603, error.message);
      }
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
});

console.error('StudyDino MCP Server iniciado');
