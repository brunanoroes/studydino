const EC = 'https://concursos.estrategia.com/todos-os-cursos?view=goal&goalId=';
const EQ = 'https://concursos.estrategia.com/questoes/buscar';

export interface Recurso {
  tipo: 'pdf' | 'questoes';
  label: string;
  concurso: string;
  url: string;
}

export interface Passo {
  materia_nome: string;
  recursos: Recurso[];
}

export interface TrilhaStepConfig {
  descricao: string;
  passos: Passo[];
}

export const TRILHA_STEPS: Record<string, TrilhaStepConfig> = {
  '_Ciclo Básico': {
    descricao: 'Matérias presentes em 5 ou mais dos seus 15 concursos alvo. Comece aqui — cada hora investida vale para múltiplas bancas. Só depois parta para as trilhas específicas.',
    passos: [
      { materia_nome: 'Língua Portuguesa', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Engenharia de Software', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Desenvolvimento de Software', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Banco de Dados', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Governança de TI', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Redes e Segurança', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Sustentação Tecnológica', url: EC + '331de2fa-5d93-4fb3-a451-68c6fdac50b1' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Segurança da Informação', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Inglês', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Análise Sistemas/Dev', url: EC + '57f4dbfb-4e34-453a-9eca-f935272c509b' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
    ],
  },

  'DATAPREV - Analista': {
    descricao: 'Empresa pública federal de previdência social. 5 cargos de TI com salários acima de R$ 12k. Material pós-edital disponível no Estratégia para todos os cargos.',
    passos: [
      { materia_nome: 'Língua Portuguesa', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Banco de Dados', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Engenharia de Software', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Desenvolvimento de Software', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Governança de TI', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Análise de Negócios', url: EC + 'a72c8069-7477-4c65-ad13-46c83eacb273' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Redes e Segurança', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Sustentação Tecnológica', url: EC + '331de2fa-5d93-4fb3-a451-68c6fdac50b1' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Segurança da Informação', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Sistemas Operacionais', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Segurança Cibernética', url: EC + '33ed4419-b805-491d-a5fe-aac46730a969' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Servidores e Infraestrutura', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'DATAPREV - Dev Software', url: EC + '3592f42c-7caf-41a7-a4db-9f4c5cb5fece' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
    ],
  },

  '_SERPRO': {
    descricao: 'Empresa pública de TI do governo federal. 2 cargos: Desenvolvimento de Sistemas e Ciência de Dados. Salários acima de R$ 14k. Material pós-edital disponível.',
    passos: [
      { materia_nome: 'Língua Portuguesa', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Inglês', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Raciocínio Lógico', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Banco de Dados', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Engenharia de Software', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Desenvolvimento de Software', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Segurança da Informação', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Redes e Segurança', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Ciência de Dados', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Ciências de Dados', url: EC + 'ac1cf948-7409-49b6-b26a-d045a2f542dc' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Linguagens de Programação', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Ciências de Dados', url: EC + 'ac1cf948-7409-49b6-b26a-d045a2f542dc' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'LGPD e Privacidade', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Legislação Institucional', recursos: [
        { tipo: 'pdf', label: 'Estatuto Social do SERPRO', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Servidores e Infraestrutura', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos (Servidores Web)', concurso: 'SERPRO - Dev Sistemas', url: EC + '278fde63-f5a9-4668-befe-f2bb1f8a1823' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
    ],
  },

  '_BNDES': {
    descricao: 'Banco Nacional de Desenvolvimento. Um dos melhores salários do setor público: R$ 20k+. 4 cargos de TI — todos com material pós-edital disponível no Estratégia.',
    passos: [
      { materia_nome: 'Língua Portuguesa', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Análise Sistemas/Dev', url: EC + '57f4dbfb-4e34-453a-9eca-f935272c509b' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Inglês', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Análise Sistemas/Dev', url: EC + '57f4dbfb-4e34-453a-9eca-f935272c509b' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Matemática', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Ciência de Dados', url: EC + 'df5ef78c-309e-4070-ab1f-4952524529a7' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Estatística e Probabilidade', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Ciência de Dados', url: EC + 'df5ef78c-309e-4070-ab1f-4952524529a7' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Arquitetura de Computadores', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Análise Sistemas/Dev', url: EC + '57f4dbfb-4e34-453a-9eca-f935272c509b' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Banco de Dados', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Análise Sistemas/Dev', url: EC + '57f4dbfb-4e34-453a-9eca-f935272c509b' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Engenharia de Software', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Análise Sistemas/Dev', url: EC + '57f4dbfb-4e34-453a-9eca-f935272c509b' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Desenvolvimento de Software', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Análise Sistemas/Dev', url: EC + '57f4dbfb-4e34-453a-9eca-f935272c509b' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Governança de TI', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Análise Sistemas/Dev', url: EC + '57f4dbfb-4e34-453a-9eca-f935272c509b' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Redes e Segurança', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Análise Sistemas/Suporte', url: EC + '963bf4a8-e118-4e2a-9523-579203177117' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Segurança da Informação', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Cibersegurança', url: EC + '0f10aa5f-7e22-496b-9587-925dd3b3d27c' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Sistemas Operacionais', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'BNDES - Cibersegurança', url: EC + '0f10aa5f-7e22-496b-9587-925dd3b3d27c' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
    ],
  },

  // PETROBRAS placeholder — trilha removida do DB
  '_PETROBRAS_old': {
    descricao: 'Maior empresa do Brasil. 4 cargos de TI com salários R$ 16k+. Engenharia de Software e Processos de Negócio têm edital publicado. Ciência de Dados e Infraestrutura estão em pré-edital.',
    passos: [
      { materia_nome: 'Língua Portuguesa', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'PETROBRAS - Processos de Negócio', url: EC + '5b61e6fe-4079-48e4-a320-a4b5ebbfa9d1' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Inglês', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'PETROBRAS - Processos de Negócio', url: EC + '5b61e6fe-4079-48e4-a320-a4b5ebbfa9d1' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Raciocínio Lógico', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'PETROBRAS - Processos de Negócio', url: EC + '5b61e6fe-4079-48e4-a320-a4b5ebbfa9d1' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Banco de Dados', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'PETROBRAS - Engenharia de Software', url: EC + '49536b7b-8f7a-4429-83f2-1be63f73a582' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Engenharia de Software', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'PETROBRAS - Engenharia de Software', url: EC + '49536b7b-8f7a-4429-83f2-1be63f73a582' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Ciência de Dados', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'PETROBRAS - Ciência de Dados', url: EC + '8144f48a-a2f6-4db1-a332-9c83fffacc19' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
      { materia_nome: 'Estatística e Probabilidade', recursos: [
        { tipo: 'pdf', label: 'PDF + Vídeos', concurso: 'PETROBRAS - Ciência de Dados', url: EC + '8144f48a-a2f6-4db1-a332-9c83fffacc19' },
        { tipo: 'questoes', label: 'Questões', concurso: 'Estratégia', url: EQ },
      ]},
    ],
  },
};

// ── Estrutura de capítulos por trilha ──────────────────────
type TipoCronograma = 'estudo' | 'pausa' | 'questoes' | 'revisao' | 'livre';

export interface BlocoCapitulo {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  tipo: TipoCronograma;
  materia_id: number | null;
  descricao: string | null;
}

export interface Capitulo {
  nome: string;
  emoji: string;
  materiaIds: number[];
  cronograma: BlocoCapitulo[];
}

export const TRILHA_CAPITULOS: Record<string, Capitulo[]> = {
  'DATAPREV': [
    {
      nome: 'Fundamentos',
      emoji: '📚',
      // PT=2, ES=5, DS=6, BD=4
      materiaIds: [2, 5, 6, 4],
      cronograma: [
        // Segunda
        { dia_semana: 1, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 5,    descricao: null },
        { dia_semana: 1, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 1, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 4,    descricao: null },
        { dia_semana: 1, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 1, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: 'ES e BD' },
        // Terça
        { dia_semana: 2, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 6,    descricao: null },
        { dia_semana: 2, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 2, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 2,    descricao: null },
        { dia_semana: 2, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 2, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: 'DS e PT' },
        // Quarta
        { dia_semana: 3, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 4,    descricao: null },
        { dia_semana: 3, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 3, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 5,    descricao: null },
        { dia_semana: 3, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 3, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: null },
        // Quinta
        { dia_semana: 4, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 2,    descricao: null },
        { dia_semana: 4, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 4, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 6,    descricao: null },
        { dia_semana: 4, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 4, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: null },
        // Sexta
        { dia_semana: 5, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 5,    descricao: null },
        { dia_semana: 5, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 5, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 4,    descricao: null },
        { dia_semana: 5, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 5, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'revisao',  materia_id: null, descricao: 'Questões e revisão semanal' },
        // Sábado
        { dia_semana: 6, hora_inicio: '09:00', hora_fim: '12:00', tipo: 'revisao',  materia_id: null, descricao: 'Revisão + questões ES, BD, DS, PT' },
        // Domingo
        { dia_semana: 0, hora_inicio: '10:00', hora_fim: '12:00', tipo: 'livre',    materia_id: null, descricao: 'Descanso ou revisão leve' },
      ],
    },
    {
      nome: 'Segurança e Governança',
      emoji: '🔐',
      // SI=9, GOV=7
      materiaIds: [9, 7],
      cronograma: [
        // Segunda
        { dia_semana: 1, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 9,    descricao: null },
        { dia_semana: 1, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 1, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 7,    descricao: null },
        { dia_semana: 1, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 1, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: 'SI e GOV' },
        // Terça
        { dia_semana: 2, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 7,    descricao: null },
        { dia_semana: 2, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 2, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 9,    descricao: null },
        { dia_semana: 2, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 2, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: null },
        // Quarta
        { dia_semana: 3, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 9,    descricao: null },
        { dia_semana: 3, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 3, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 7,    descricao: null },
        { dia_semana: 3, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 3, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: null },
        // Quinta
        { dia_semana: 4, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 7,    descricao: null },
        { dia_semana: 4, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 4, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 9,    descricao: null },
        { dia_semana: 4, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 4, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: null },
        // Sexta
        { dia_semana: 5, hora_inicio: '18:00', hora_fim: '20:00', tipo: 'revisao',  materia_id: null, descricao: 'Revisão SI + Governança de TI' },
        { dia_semana: 5, hora_inicio: '20:00', hora_fim: '20:15', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 5, hora_inicio: '20:15', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: null },
        // Sábado
        { dia_semana: 6, hora_inicio: '09:00', hora_fim: '12:00', tipo: 'revisao',  materia_id: null, descricao: 'Revisão + 80-100 questões SI e GOV' },
        // Domingo
        { dia_semana: 0, hora_inicio: '10:00', hora_fim: '12:00', tipo: 'livre',    materia_id: null, descricao: 'Descanso ou revisão leve' },
      ],
    },
    {
      nome: 'Infraestrutura',
      emoji: '🖥️',
      // SO=14, Redes=8, Serv=15
      materiaIds: [14, 8, 15],
      cronograma: [
        // Segunda
        { dia_semana: 1, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 14,   descricao: null },
        { dia_semana: 1, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 1, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 8,    descricao: null },
        { dia_semana: 1, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 1, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: 'SO e Redes' },
        // Terça
        { dia_semana: 2, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 8,    descricao: null },
        { dia_semana: 2, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 2, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 15,   descricao: null },
        { dia_semana: 2, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 2, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: 'Redes e Serv' },
        // Quarta
        { dia_semana: 3, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 14,   descricao: null },
        { dia_semana: 3, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 3, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 15,   descricao: null },
        { dia_semana: 3, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 3, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: null },
        // Quinta
        { dia_semana: 4, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 8,    descricao: null },
        { dia_semana: 4, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 4, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'estudo',   materia_id: 14,   descricao: null },
        { dia_semana: 4, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 4, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: null },
        // Sexta
        { dia_semana: 5, hora_inicio: '18:00', hora_fim: '19:15', tipo: 'estudo',   materia_id: 15,   descricao: null },
        { dia_semana: 5, hora_inicio: '19:15', hora_fim: '19:30', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 5, hora_inicio: '19:30', hora_fim: '20:45', tipo: 'revisao',  materia_id: null, descricao: 'Revisão SO + Redes + Serv' },
        { dia_semana: 5, hora_inicio: '20:45', hora_fim: '21:00', tipo: 'pausa',    materia_id: null, descricao: null },
        { dia_semana: 5, hora_inicio: '21:00', hora_fim: '22:00', tipo: 'questoes', materia_id: null, descricao: null },
        // Sábado
        { dia_semana: 6, hora_inicio: '09:00', hora_fim: '12:00', tipo: 'revisao',  materia_id: null, descricao: 'Revisão geral + simulado' },
        // Domingo
        { dia_semana: 0, hora_inicio: '10:00', hora_fim: '12:00', tipo: 'livre',    materia_id: null, descricao: 'Descanso' },
      ],
    },
  ],
};
