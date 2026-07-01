const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Materia {
  id: number;
  nome: string;
  cor: string;
  emoji: string;
  criada_em: string;
  total_segundos: number;
  total_sessoes: number;
}

export interface Sessao {
  id: number;
  materia_id: number;
  materia_nome: string;
  materia_cor: string;
  materia_emoji: string;
  duracao_segundos: number;
  iniciada_em: string;
  finalizada_em: string;
  anotacao: string | null;
}

export interface Amigo {
  id: number;
  username: string;
}

export interface ProgressoAmigo {
  sessoes: Array<{ nome: string; cor: string; total_segundos: number }>;
  totalSegundos: number;
}

export interface StatusEstudando {
  estudando: boolean;
  nome?: string;
  cor?: string;
  iniciada_em?: string;
}

export interface Trilha {
  id: number;
  nome: string;
  cor: string;
  criada_em: string;
  total_materias: number;
  materias: Array<{ id: number; nome: string; cor: string; total_segundos: number }>;
}

export interface CapituloMateria { id: number; nome: string; cor: string }

export interface BlocoCapituloApi {
  id?: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  tipo: 'estudo' | 'pausa' | 'questoes' | 'revisao' | 'livre';
  materia_id: number | null;
  descricao: string | null;
}

export interface CapituloApi {
  id: number;
  trilha_id: number;
  ordem: number;
  nome: string;
  emoji: string;
  descricao: string | null;
  materias: CapituloMateria[];
  cronograma: BlocoCapituloApi[];
}

export interface BlocoCronograma {
  id: number;
  dia_semana: number; // 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab
  hora_inicio: string; // "18:00"
  hora_fim: string;    // "19:15"
  tipo: 'estudo' | 'pausa' | 'questoes' | 'revisao' | 'livre';
  materia_id: number | null;
  descricao: string | null;
  materia_nome?: string;
  materia_cor?: string;
}

export interface BlocoCronogramaDia {
  id: number;
  data: string; // 'YYYY-MM-DD'
  hora_inicio: string;
  hora_fim: string;
  tipo: 'estudo' | 'pausa' | 'questoes' | 'revisao' | 'livre';
  materia_id: number | null;
  descricao: string | null;
  serie_id: string | null;
  materia_nome?: string;
  materia_cor?: string;
}

export interface ComparativoMateria {
  materia_id: number;
  nome: string;
  cor: string;
  planejado_segundos: number;
  realizado_segundos: number;
}

export interface Comparativo {
  comparativo: ComparativoMateria[];
  totalPlanejado: number;
  totalRealizado: number;
}

export interface Dashboard {
  porMateria: Array<{
    id: number; nome: string; cor: string; emoji: string;
    total_segundos: number; total_sessoes: number;
  }>;
  porDia: Array<{ dia: string; total_segundos: number }>;
  resumo: {
    total_segundos: number; total_sessoes: number;
    materias_estudadas: number; dias_estudados: number;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // O backend no Render (plano grátis) hiberna após inatividade e leva ~50s
  // para acordar. Em vez de falhar na 1ª chamada, aguardamos e repetimos por
  // até ~75s enquanto o servidor sobe, avisando a UI via evento 'api:waking'.
  const deadline = Date.now() + 75000;

  while (true) {
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, { headers, ...opts });
    } catch (e) {
      // Falha de rede = backend ainda dormindo/inacessível → espera e tenta de novo
      if (e instanceof TypeError && Date.now() < deadline) {
        window.dispatchEvent(new CustomEvent('api:waking'));
        await sleep(3000);
        continue;
      }
      throw e;
    }

    // 502/503/504 = servidor acordando no Render → espera e tenta de novo
    if ((res.status === 502 || res.status === 503 || res.status === 504) && Date.now() < deadline) {
      window.dispatchEvent(new CustomEvent('api:waking'));
      await sleep(3000);
      continue;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    window.dispatchEvent(new CustomEvent('api:ready'));
    return res.json();
  }
}

export const api = {
  auth: {
    login: (username: string, senha: string) =>
      req<{ id: number; username: string; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, senha }),
      }),
    registro: (username: string, senha: string) =>
      req<{ id: number; username: string; token: string }>('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({ username, senha }),
      }),
  },
  materias: {
    list: () => req<Materia[]>('/materias'),
    create: (data: { nome: string; cor: string; emoji: string }) =>
      req<Materia>('/materias', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { nome: string; cor: string; emoji: string }) =>
      req<Materia>(`/materias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<{ ok: true }>(`/materias/${id}`, { method: 'DELETE' }),
  },
  sessoes: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return req<Sessao[]>(`/sessoes${qs}`);
    },
    create: (data: {
      materia_id: number; duracao_segundos: number;
      iniciada_em: string; finalizada_em: string; anotacao?: string;
    }) => req<Sessao>('/sessoes', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => req<{ ok: true }>(`/sessoes/${id}`, { method: 'DELETE' }),
  },
  trilhas: {
    list: () => req<Trilha[]>('/trilhas'),
    create: (data: { nome: string; cor: string; materia_ids: number[] }) =>
      req<Trilha>('/trilhas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { nome: string; cor: string; materia_ids: number[] }) =>
      req<Trilha>(`/trilhas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<{ ok: true }>(`/trilhas/${id}`, { method: 'DELETE' }),
    passos: {
      list: (trilhaId: number) => req<number[]>(`/trilhas/${trilhaId}/passos`),
      marcar: (trilhaId: number, index: number) =>
        req<{ ok: true }>(`/trilhas/${trilhaId}/passos/${index}`, { method: 'PUT' }),
      desmarcar: (trilhaId: number, index: number) =>
        req<{ ok: true }>(`/trilhas/${trilhaId}/passos/${index}`, { method: 'DELETE' }),
    },
    materiasConcluidas: {
      list: (trilhaId: number) => req<number[]>(`/trilhas/${trilhaId}/materias-concluidas`),
      marcar: (trilhaId: number, materiaId: number) =>
        req<{ ok: true }>(`/trilhas/${trilhaId}/materias-concluidas/${materiaId}`, { method: 'PUT' }),
      desmarcar: (trilhaId: number, materiaId: number) =>
        req<{ ok: true }>(`/trilhas/${trilhaId}/materias-concluidas/${materiaId}`, { method: 'DELETE' }),
    },
  },
  capitulos: {
    list: (trilhaId: number) => req<CapituloApi[]>(`/trilhas/${trilhaId}/capitulos`),
    create: (trilhaId: number, data: { nome: string; emoji: string; descricao: string | null; materia_ids: number[]; cronograma: Omit<BlocoCapituloApi, 'id'>[] }) =>
      req<{ id: number }>(`/trilhas/${trilhaId}/capitulos`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { nome: string; emoji: string; descricao: string | null; materia_ids: number[]; cronograma: Omit<BlocoCapituloApi, 'id'>[] }) =>
      req<{ ok: true }>(`/capitulos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<{ ok: true }>(`/capitulos/${id}`, { method: 'DELETE' }),
    mover: (id: number, direcao: 'cima' | 'baixo') =>
      req<{ ok: true }>(`/capitulos/${id}/mover`, { method: 'PUT', body: JSON.stringify({ direcao }) }),
  },
  dashboard: (periodo: string, trilha_id?: number) =>
    req<Dashboard>(`/dashboard?periodo=${periodo}${trilha_id ? `&trilha_id=${trilha_id}` : ''}`),
  comparativo: () => req<Comparativo>('/dashboard/comparativo'),
  cronograma: {
    list: () => req<BlocoCronograma[]>('/cronograma'),
    create: (data: Omit<BlocoCronograma, 'id' | 'materia_nome' | 'materia_cor'>) =>
      req<{ id: number }>('/cronograma', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Omit<BlocoCronograma, 'id' | 'materia_nome' | 'materia_cor'>) =>
      req<{ ok: true }>(`/cronograma/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<{ ok: true }>(`/cronograma/${id}`, { method: 'DELETE' }),
    batch: (blocos: Omit<BlocoCronograma, 'id' | 'materia_nome' | 'materia_cor'>[]) =>
      req<{ ok: true }>('/cronograma/batch', { method: 'POST', body: JSON.stringify(blocos) }),
    replace: (blocos: Omit<BlocoCronograma, 'id' | 'materia_nome' | 'materia_cor'>[]) =>
      req<{ ok: true }>('/cronograma/replace', { method: 'POST', body: JSON.stringify(blocos) }),
  },
  cronogramaDias: {
    list: (inicio: string, fim: string) =>
      req<BlocoCronogramaDia[]>(`/cronograma-dias?inicio=${inicio}&fim=${fim}`),
    create: (data: Omit<BlocoCronogramaDia, 'id' | 'materia_nome' | 'materia_cor' | 'serie_id'>) =>
      req<{ id: number }>('/cronograma-dias', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Omit<BlocoCronogramaDia, 'id' | 'materia_nome' | 'materia_cor' | 'serie_id'>) =>
      req<{ ok: true }>(`/cronograma-dias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => req<{ ok: true }>(`/cronograma-dias/${id}`, { method: 'DELETE' }),
    updateSerie: (serieId: string, data: Omit<BlocoCronogramaDia, 'id' | 'data' | 'materia_nome' | 'materia_cor' | 'serie_id'>) =>
      req<{ ok: true }>(`/cronograma-dias/serie/${serieId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSerie: (serieId: string) =>
      req<{ ok: true }>(`/cronograma-dias/serie/${serieId}`, { method: 'DELETE' }),
    aplicarSemana: (blocosSemana: Array<{ dia_semana: number; hora_inicio: string; hora_fim: string; tipo: string; materia_id: number | null; descricao: string | null }>, semanas = 12) =>
      req<{ ok: true }>('/cronograma-dias/aplicar-semana', { method: 'POST', body: JSON.stringify({ blocosSemana, semanas }) }),
  },
  config: {
    get: (chave: string) => req<{ valor: string | null }>(`/config/${chave}`),
    set: (chave: string, valor: string | null) =>
      req<{ ok: true }>(`/config/${chave}`, { method: 'PUT', body: JSON.stringify({ valor }) }),
  },
  amigos: {
    adicionar: (username: string) => req<{ ok: true }>('/amigos/adicionar', { method: 'POST', body: JSON.stringify({ username_amigo: username }) }),
    listar: () => req<Amigo[]>('/amigos'),
    remover: (amigoId: number) => req<{ ok: true }>(`/amigos/${amigoId}`, { method: 'DELETE' }),
    progresso: (amigoId: number) => req<ProgressoAmigo>(`/amigos/${amigoId}/progresso`),
    estudandoAgora: (amigoId: number) => req<StatusEstudando>(`/amigos/${amigoId}/estudando-agora`),
  },
};

export function formatarTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export function formatarTempoCompleto(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0'),
  ].join(':');
}
