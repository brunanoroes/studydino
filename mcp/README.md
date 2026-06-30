# StudyDino MCP Server

Servidor MCP (Model Context Protocol) para controlar os dados do StudyDino via Claude.

## O que é?

MCP é um protocolo que permite que Claude (ou Claude Code) interaja com ferramentas e dados através de um servidor. Com este servidor, você pode:

- **Ler dados**: Acessar matérias, trilhas, cronogramas via recursos
- **Escrever dados**: Criar, atualizar e deletar matérias e trilhas
- **Gerenciar relacionamentos**: Adicionar/remover matérias de trilhas

## Usando no Claude Code

1. O servidor já está configurado em `.claude/settings.json`
2. Claude terá acesso automático aos recursos e ferramentas

## Recursos Disponíveis

### `studydino://materias`
Lista todas as matérias

```json
[
  {
    "id": 1,
    "nome": "Matemática",
    "cor": "#FF5733",
    "emoji": "📐",
    "criada_em": "2024-06-30T19:00:00Z"
  }
]
```

### `studydino://trilhas`
Lista todas as trilhas

```json
[
  {
    "id": 1,
    "nome": "Preparação ENEM",
    "cor": "#2d6a4f",
    "criada_em": "2024-06-30T19:00:00Z"
  }
]
```

### `studydino://trilhas/{id}`
Detalhes de uma trilha específica com suas matérias

## Ferramentas Disponíveis

### Matérias

#### `criar_materia`
Cria uma nova matéria
```
Argumentos:
- nome (obrigatório): string
- cor (opcional): hex color (padrão: #4CAF50)
- emoji (opcional): string (padrão: 📚)
```

#### `atualizar_materia`
Atualiza uma matéria existente
```
Argumentos:
- id (obrigatório): number
- nome (opcional): string
- cor (opcional): hex color
- emoji (opcional): string
```

#### `deletar_materia`
Deleta uma matéria
```
Argumentos:
- id (obrigatório): number
```

### Trilhas

#### `criar_trilha`
Cria uma nova trilha
```
Argumentos:
- nome (obrigatório): string
- cor (opcional): hex color (padrão: #2d6a4f)
```

#### `atualizar_trilha`
Atualiza uma trilha existente
```
Argumentos:
- id (obrigatório): number
- nome (opcional): string
- cor (opcional): hex color
```

#### `deletar_trilha`
Deleta uma trilha
```
Argumentos:
- id (obrigatório): number
```

### Relacionamentos

#### `adicionar_materia_trilha`
Adiciona uma matéria a uma trilha
```
Argumentos:
- trilha_id (obrigatório): number
- materia_id (obrigatório): number
```

#### `remover_materia_trilha`
Remove uma matéria de uma trilha
```
Argumentos:
- trilha_id (obrigatório): number
- materia_id (obrigatório): number
```

## Exemplos de Uso

### Listar todas as matérias
```
Claude, mostre as matérias cadastradas no StudyDino
```

### Criar uma nova matéria
```
Claude, crie uma matéria chamada "Física" com cor #FF6B6B e emoji ⚛️
```

### Gerenciar trilha
```
Claude, crie uma trilha chamada "Preparação Vestibular" e adicione as matérias 1, 2, 3
```

## Estrutura

```
mcp/
├── server.js       # Servidor MCP principal
└── README.md       # Esta documentação
```

## Requisitos

- Node.js 14+
- SQLite ou PostgreSQL (configurado em backend/db.js)

## Testando Localmente

```bash
node mcp/server.js
```

O servidor aguarda mensagens JSON via stdin com o protocolo MCP.
