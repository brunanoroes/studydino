import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronLeft, ChevronRight, X, Trash2, CalendarDays, Play } from 'lucide-react';
import { api, formatarTempo } from '../api';
import type { BlocoCronogramaDia, Materia, Sessao } from '../api';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const TIPOS = {
  estudo:   { label: 'Estudo',   cor: '' },
  pausa:    { label: 'Pausa',    cor: '#94a3b8' },
  questoes: { label: 'Questões', cor: '#3b82f6' },
  revisao:  { label: 'Revisão',  cor: '#8b5cf6' },
  livre:    { label: 'Livre',    cor: '#10b981' },
} as const;
type Tipo = keyof typeof TIPOS;

// ── Utilitários de data ──────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const addMonths = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; };
const addYears = (d: Date, n: number) => { const r = new Date(d); r.setFullYear(r.getFullYear() + n); return r; };
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const sameDate = (a: Date, b: Date) => toISO(a) === toISO(b);
const toMin = (h: string) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };

function monthMatrix(ref: Date): Date[][] {
  const first = startOfMonth(ref);
  const gridStart = startOfWeek(first);
  const weeks: Date[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) { week.push(cursor); cursor = addDays(cursor, 1); }
    weeks.push(week);
    if (cursor.getMonth() !== ref.getMonth() && w >= 4) break;
  }
  return weeks;
}

type Modo = 'planejado' | 'realizado';
type Visao = 'dia' | 'semana' | 'mes' | 'ano';

interface BlocoVisual {
  id: number | string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  tipo: Tipo;
  materia_id: number | null;
  descricao: string | null;
  materia_nome?: string;
  materia_cor?: string;
  editavel: boolean;
}

const FORM_VAZIO = {
  data: '',
  hora_inicio: '18:00',
  hora_fim: '19:00',
  tipo: 'estudo' as Tipo,
  materia_id: null as number | null,
  descricao: '',
};

interface Props { materias: Materia[]; onIniciarCronometro?: (materiaId: number) => void }

export default function Agenda({ materias, onIniciarCronometro }: Props) {
  const [visao, setVisao] = useState<Visao>('semana');
  const [modo, setModo] = useState<Modo>('planejado');
  const [dataRef, setDataRef] = useState(new Date());
  const [blocos, setBlocos] = useState<BlocoCronogramaDia[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoSerieId, setEditandoSerieId] = useState<string | null>(null);
  const [aplicarA, setAplicarA] = useState<'este' | 'todos'>('este');
  const [formAberto, setFormAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const range = useMemo(() => {
    if (visao === 'dia') return { ini: dataRef, fim: dataRef };
    if (visao === 'semana') { const ini = startOfWeek(dataRef); return { ini, fim: addDays(ini, 6) }; }
    if (visao === 'mes') { const m = monthMatrix(dataRef); return { ini: m[0][0], fim: m[m.length - 1][6] }; }
    return { ini: new Date(dataRef.getFullYear(), 0, 1), fim: new Date(dataRef.getFullYear(), 11, 31) };
  }, [visao, dataRef]);

  useEffect(() => {
    const inicio = toISO(range.ini), fim = toISO(range.fim);
    if (modo === 'planejado') {
      api.cronogramaDias.list(inicio, fim).then(setBlocos).catch(console.error);
    } else {
      api.sessoes.list({ data_inicio: inicio, data_fim: fim, limit: '1000' }).then(setSessoes).catch(console.error);
    }
  }, [range.ini, range.fim, modo]);

  // Normaliza para um formato visual comum
  const blocosVisuais: BlocoVisual[] = useMemo(() => {
    if (modo === 'planejado') {
      return blocos.map(b => ({ ...b, editavel: true }));
    }
    return sessoes.map(s => {
      const ini = new Date(s.iniciada_em);
      const fim = new Date(s.finalizada_em);
      return {
        id: s.id,
        data: toISO(ini),
        hora_inicio: `${pad2(ini.getHours())}:${pad2(ini.getMinutes())}`,
        hora_fim: `${pad2(fim.getHours())}:${pad2(fim.getMinutes())}`,
        tipo: 'estudo' as Tipo,
        materia_id: s.materia_id,
        descricao: s.anotacao,
        materia_nome: s.materia_nome,
        materia_cor: s.materia_cor,
        editavel: false,
      };
    });
  }, [blocos, sessoes, modo]);

  const blocosPorDia = (iso: string) => blocosVisuais.filter(b => b.data === iso);

  const totalSegundosRange = useMemo(() => {
    if (modo === 'planejado') {
      return blocosVisuais.filter(b => b.tipo === 'estudo').reduce((s, b) => s + (toMin(b.hora_fim) - toMin(b.hora_inicio)) * 60, 0);
    }
    return sessoes.reduce((s, x) => s + x.duracao_segundos, 0);
  }, [blocosVisuais, sessoes, modo]);

  // ── Navegação ──────────────────────────────────────────
  const navegar = (delta: number) => {
    if (visao === 'dia') setDataRef(d => addDays(d, delta));
    else if (visao === 'semana') setDataRef(d => addDays(d, delta * 7));
    else if (visao === 'mes') setDataRef(d => addMonths(d, delta));
    else setDataRef(d => addYears(d, delta));
  };
  const irParaHoje = () => setDataRef(new Date());
  const irParaDia = (d: Date) => { setDataRef(d); setVisao('dia'); };

  const tituloRange = () => {
    if (visao === 'dia') return `${DIAS[dataRef.getDay()]}, ${dataRef.getDate()} de ${MESES[dataRef.getMonth()]} de ${dataRef.getFullYear()}`;
    if (visao === 'semana') {
      const ini = range.ini, fim = range.fim;
      if (ini.getMonth() === fim.getMonth()) return `${ini.getDate()} – ${fim.getDate()} de ${MESES[ini.getMonth()]} de ${ini.getFullYear()}`;
      return `${ini.getDate()} ${MESES[ini.getMonth()].slice(0, 3)} – ${fim.getDate()} ${MESES[fim.getMonth()].slice(0, 3)} de ${fim.getFullYear()}`;
    }
    if (visao === 'mes') return `${MESES[dataRef.getMonth()]} de ${dataRef.getFullYear()}`;
    return `${dataRef.getFullYear()}`;
  };

  // ── Form ───────────────────────────────────────────────
  const abrirNovo = (iso: string, hora?: string) => {
    setEditandoId(null);
    setEditandoSerieId(null);
    setAplicarA('este');
    setForm({ ...FORM_VAZIO, data: iso, hora_inicio: hora ?? '18:00', hora_fim: hora ? somarMinutos(hora, 60) : '19:00' });
    setFormAberto(true);
  };
  const abrirEditar = (b: BlocoCronogramaDia) => {
    setEditandoId(b.id);
    setEditandoSerieId(b.serie_id);
    setAplicarA('este');
    setForm({ data: b.data, hora_inicio: b.hora_inicio, hora_fim: b.hora_fim, tipo: b.tipo, materia_id: b.materia_id, descricao: b.descricao ?? '' });
    setFormAberto(true);
  };
  const cancelar = () => { setFormAberto(false); setEditandoId(null); setEditandoSerieId(null); };

  const recarregar = () => {
    const inicio = toISO(range.ini), fim = toISO(range.fim);
    api.cronogramaDias.list(inicio, fim).then(setBlocos).catch(console.error);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const payload = { ...form, descricao: form.descricao || null };
      if (editandoId && editandoSerieId && aplicarA === 'todos') {
        const { data: _data, ...semData } = payload;
        await api.cronogramaDias.updateSerie(editandoSerieId, semData);
      } else if (editandoId) {
        await api.cronogramaDias.update(editandoId, payload);
      } else {
        await api.cronogramaDias.create(payload);
      }
      cancelar(); recarregar();
    } finally { setSalvando(false); }
  };

  const deletar = async () => {
    if (!editandoId) return;
    if (editandoSerieId && aplicarA === 'todos') {
      await api.cronogramaDias.deleteSerie(editandoSerieId);
    } else {
      await api.cronogramaDias.delete(editandoId);
    }
    cancelar();
    recarregar();
  };

  const corBloco = (b: BlocoVisual) => b.tipo === 'estudo' ? (b.materia_cor ?? '#2d6a4f') : (TIPOS[b.tipo]?.cor ?? '#94a3b8');

  return (
    <div style={{ padding: '24px 18px 36px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <CalendarDays size={18} color="var(--verde-accent)" />
            {tituloRange()}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
            {modo === 'planejado' ? 'Planejado' : 'Realizado'} neste período: <strong style={{ color: 'var(--gray-600)' }}>{formatarTempo(totalSegundosRange)}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle Planejado/Realizado */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
            {(['planejado', 'realizado'] as Modo[]).map(m => (
              <button key={m} onClick={() => setModo(m)} style={{
                borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                background: modo === m ? 'white' : 'transparent',
                color: modo === m ? 'var(--gray-800)' : 'var(--gray-400)',
                boxShadow: modo === m ? 'var(--shadow-sm)' : 'none',
              }}>
                {m === 'planejado' ? 'Planejado' : 'Realizado'}
              </button>
            ))}
          </div>
          {/* Visão */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
            {(['dia', 'semana', 'mes', 'ano'] as Visao[]).map(v => (
              <button key={v} onClick={() => setVisao(v)} style={{
                borderRadius: 6, padding: '5px 11px', fontSize: 12, fontWeight: 700,
                background: visao === v ? 'white' : 'transparent',
                color: visao === v ? 'var(--gray-800)' : 'var(--gray-400)',
                boxShadow: visao === v ? 'var(--shadow-sm)' : 'none',
                textTransform: 'capitalize',
              }}>
                {v === 'mes' ? 'Mês' : v}
              </button>
            ))}
          </div>
          {/* Navegação */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => navegar(-1)} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} color="var(--gray-500)" />
            </button>
            <button onClick={irParaHoje} style={{ borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 700, background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)', color: 'var(--gray-600)' }}>
              Hoje
            </button>
            <button onClick={() => navegar(1)} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} color="var(--gray-500)" />
            </button>
          </div>
        </div>
      </div>

      {/* Form (apenas modo planejado) */}
      {formAberto && modo === 'planejado' && (
        <div style={{ background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', padding: 18, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-700)', marginBottom: 14 }}>
            {editandoId ? 'Editar bloco' : 'Novo bloco'} · {formatarDataCurta(form.data)}
          </h3>

          {editandoId && editandoSerieId && (
            <div style={{ marginBottom: 14, padding: 12, background: 'white', border: '1.5px solid var(--gray-200)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 8 }}>
                Este horário se repete toda semana. Aplicar alterações a:
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { v: 'este' as const, label: 'Somente este evento' },
                  { v: 'todos' as const, label: 'Todos os eventos' },
                ]).map(opt => (
                  <button key={opt.v} onClick={() => setAplicarA(opt.v)} style={{
                    flex: 1, padding: '7px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                    background: aplicarA === opt.v ? 'var(--verde-accent)' : 'white',
                    color: aplicarA === opt.v ? 'white' : 'var(--gray-500)',
                    border: `1.5px solid ${aplicarA === opt.v ? 'var(--verde-accent)' : 'var(--gray-200)'}`,
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 5 }}>Início</label>
              <input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid var(--gray-200)', fontSize: 14, fontWeight: 600 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 5 }}>Fim</label>
              <input type="time" value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid var(--gray-200)', fontSize: 14, fontWeight: 600 }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 5 }}>Tipo</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(Object.entries(TIPOS) as [Tipo, typeof TIPOS[Tipo]][]).map(([k, v]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, tipo: k, materia_id: null }))} style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    background: form.tipo === k ? (v.cor || 'var(--verde-accent)') : 'white',
                    color: form.tipo === k ? 'white' : 'var(--gray-500)',
                    border: `1.5px solid ${form.tipo === k ? (v.cor || 'var(--verde-accent)') : 'var(--gray-200)'}`,
                  }}>{v.label}</button>
                ))}
              </div>
            </div>
            {form.tipo === 'estudo' && (
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 5 }}>Matéria</label>
                <select value={form.materia_id ?? ''} onChange={e => setForm(f => ({ ...f, materia_id: Number(e.target.value) || null }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid var(--gray-200)', fontSize: 13, fontWeight: 600, background: 'white' }}>
                  <option value="">Selecione...</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
            )}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 5 }}>Descrição (opcional)</label>
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid var(--gray-200)', fontSize: 13 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={salvar} disabled={salvando} style={{ background: 'var(--verde-accent)', color: 'white', borderRadius: 7, padding: '8px 18px', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={13} /> {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={cancelar} style={{ background: 'white', color: 'var(--gray-500)', border: '1.5px solid var(--gray-200)', borderRadius: 7, padding: '8px 14px', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
              <X size={13} /> Cancelar
            </button>
            {editandoId && (
              <button onClick={deletar} style={{ background: '#fff5f5', color: '#ef4444', border: '1.5px solid #fee2e2', borderRadius: 7, padding: '8px 14px', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                <Trash2 size={13} /> Excluir{aplicarA === 'todos' && editandoSerieId ? ' todos' : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Corpo: visões */}
      {visao === 'dia' && (
        <VisaoTimeline
          dias={[dataRef]}
          blocosPorDia={blocosPorDia}
          corBloco={corBloco}
          editavel={modo === 'planejado'}
          onAdd={abrirNovo}
          onEdit={abrirEditar}
          onEstudar={onIniciarCronometro}
        />
      )}
      {visao === 'semana' && (
        <VisaoTimeline
          dias={Array.from({ length: 7 }, (_, i) => addDays(range.ini, i))}
          blocosPorDia={blocosPorDia}
          corBloco={corBloco}
          editavel={modo === 'planejado'}
          onAdd={abrirNovo}
          onEdit={abrirEditar}
        />
      )}
      {visao === 'mes' && (
        <VisaoMes
          mesRef={dataRef}
          blocosPorDia={blocosPorDia}
          corBloco={corBloco}
          onDiaClick={irParaDia}
        />
      )}
      {visao === 'ano' && (
        <VisaoAno
          anoRef={dataRef}
          blocosPorDia={blocosPorDia}
          onDiaClick={irParaDia}
          onMesClick={(m) => { setDataRef(m); setVisao('mes'); }}
        />
      )}
    </div>
  );
}

// ── Visão Dia/Semana (timeline) ─────────────────────────
function VisaoTimeline({ dias, blocosPorDia, corBloco, editavel, onAdd, onEdit, onEstudar }: {
  dias: Date[];
  blocosPorDia: (iso: string) => BlocoVisual[];
  corBloco: (b: BlocoVisual) => string;
  editavel: boolean;
  onAdd: (iso: string, hora?: string) => void;
  onEdit: (b: BlocoVisual) => void;
  onEstudar?: (materiaId: number) => void;
}) {
  const todos = dias.flatMap(d => blocosPorDia(toISO(d)));
  const mins = todos.flatMap(b => [toMin(b.hora_inicio), toMin(b.hora_fim)]);
  const minH = mins.length ? Math.max(0, Math.floor(Math.min(...mins) / 60) - 1) : 7;
  const maxH = mins.length ? Math.min(24, Math.ceil(Math.max(...mins) / 60) + 1) : 23;
  const pxMin = dias.length === 1 ? 1.6 : 1.3;
  const altTotal = (maxH - minH) * 60 * pxMin;
  const top = (h: string) => (toMin(h) - minH * 60) * pxMin;
  const height = (ini: string, fim: string) => Math.max((toMin(fim) - toMin(ini)) * pxMin, 20);
  const hoje = toISO(new Date());

  if (todos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-400)' }}>
        <CalendarDays size={36} style={{ opacity: 0.2, margin: '0 auto 10px', display: 'block' }} />
        <p style={{ fontWeight: 600, fontSize: 14 }}>Nada planejado neste período</p>
        {editavel && (
          <button onClick={() => onAdd(toISO(dias[0]))} style={{ marginTop: 14, background: 'var(--verde-accent)', color: 'white', borderRadius: 100, padding: '8px 18px', fontWeight: 600, fontSize: 13 }}>
            + Adicionar bloco
          </button>
        )}
        <p style={{ fontSize: 12, marginTop: 10 }}>Dica: aplique um cronograma de capítulo em "Minha Trilha".</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `36px repeat(${dias.length}, 1fr)`, minWidth: dias.length > 1 ? 560 : 280 }}>
        <div />
        {dias.map((d, i) => {
          const ehHoje = sameDate(d, new Date());
          return (
            <div key={i} style={{ textAlign: 'center', padding: '6px 2px', borderLeft: '1px solid var(--gray-100)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: ehHoje ? 'var(--verde-accent)' : 'var(--gray-600)', textTransform: 'uppercase' }}>{DIAS[d.getDay()]}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>{d.getDate()}/{d.getMonth() + 1}</div>
              {editavel && (
                <button onClick={() => onAdd(toISO(d))} style={{ marginTop: 4, width: 18, height: 18, borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-400)', fontSize: 13, fontWeight: 700 }}>+</button>
              )}
            </div>
          );
        })}

        <div style={{ position: 'relative', height: altTotal }}>
          {Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i).map(h => (
            <div key={h} style={{ position: 'absolute', top: (h - minH) * 60 * pxMin - 6, right: 2, fontSize: 9, fontWeight: 700, color: 'var(--gray-300)' }}>{h < 10 ? '0' + h : h}h</div>
          ))}
        </div>

        {dias.map((d, di) => {
          const iso = toISO(d);
          const ehHoje = iso === hoje;
          return (
            <div key={di} style={{ position: 'relative', height: altTotal, borderLeft: '1px solid var(--gray-100)', background: ehHoje ? 'rgba(90,158,58,0.03)' : (di % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.008)') }}>
              {Array.from({ length: maxH - minH + 1 }, (_, i) => (
                <div key={i} style={{ position: 'absolute', top: i * 60 * pxMin, left: 0, right: 0, height: 1, background: 'var(--gray-100)' }} />
              ))}
              {blocosPorDia(iso).map(b => {
                const cor = corBloco(b);
                const h = height(b.hora_inicio, b.hora_fim);
                const label = b.tipo === 'estudo' ? (b.materia_nome ?? 'Estudo') : (TIPOS[b.tipo]?.label ?? b.tipo);
                const podeEstudar = dias.length === 1 && editavel && onEstudar && b.tipo === 'estudo' && b.materia_id;
                return (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => editavel && onEdit(b)}
                    title={`${b.hora_inicio}–${b.hora_fim} · ${label}${b.descricao ? ' · ' + b.descricao : ''}`}
                    style={{
                      position: 'absolute', top: top(b.hora_inicio), left: 2, right: 2, height: h,
                      background: cor + (b.tipo === 'pausa' ? '30' : '22'),
                      border: `1.5px solid ${cor}60`, borderRadius: 5,
                      padding: h > 24 ? '3px 5px' : '1px 4px', textAlign: 'left', overflow: 'hidden',
                      cursor: editavel ? 'pointer' : 'default',
                    }}
                  >
                    {h > 28 ? (
                      <>
                        <div style={{ fontSize: 9, fontWeight: 800, color: cor, lineHeight: 1.2 }}>{b.hora_inicio}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-700)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: podeEstudar ? 50 : 0 }}>{label}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-700)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: podeEstudar ? 44 : 0 }}>{label}</div>
                    )}
                    {podeEstudar && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEstudar!(b.materia_id!); }}
                        title="Estudar agora"
                        style={{
                          position: 'absolute', top: 3, right: 3,
                          display: 'flex', alignItems: 'center', gap: 3,
                          background: cor, color: 'white',
                          borderRadius: 5, padding: h > 28 ? '3px 7px' : '2px 5px',
                          fontSize: 9, fontWeight: 700,
                        }}
                      >
                        <Play size={8} fill="white" />
                        Estudar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Visão Mês ────────────────────────────────────────────
function VisaoMes({ mesRef, blocosPorDia, corBloco, onDiaClick }: {
  mesRef: Date;
  blocosPorDia: (iso: string) => BlocoVisual[];
  corBloco: (b: BlocoVisual) => string;
  onDiaClick: (d: Date) => void;
}) {
  const semanas = monthMatrix(mesRef);
  const hoje = new Date();
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DIAS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {semanas.map((semana, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {semana.map((d, di) => {
              const iso = toISO(d);
              const blocos = blocosPorDia(iso);
              const foraDoMes = d.getMonth() !== mesRef.getMonth();
              const ehHoje = sameDate(d, hoje);
              return (
                <button key={di} onClick={() => onDiaClick(d)} style={{
                  minHeight: 56, borderRadius: 8, padding: '4px 5px',
                  background: ehHoje ? 'rgba(90,158,58,0.08)' : 'white',
                  border: `1.5px solid ${ehHoje ? 'rgba(90,158,58,0.35)' : 'var(--gray-100)'}`,
                  opacity: foraDoMes ? 0.35 : 1,
                  textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  <span style={{ fontSize: 11, fontWeight: ehHoje ? 800 : 600, color: ehHoje ? 'var(--verde-accent)' : 'var(--gray-600)' }}>{d.getDate()}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {blocos.slice(0, 4).map(b => (
                      <span key={b.id} style={{ width: 5, height: 5, borderRadius: '50%', background: corBloco(b) }} />
                    ))}
                    {blocos.length > 4 && <span style={{ fontSize: 8, color: 'var(--gray-400)', fontWeight: 700 }}>+{blocos.length - 4}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Visão Ano ────────────────────────────────────────────
function VisaoAno({ anoRef, blocosPorDia, onDiaClick, onMesClick }: {
  anoRef: Date;
  blocosPorDia: (iso: string) => BlocoVisual[];
  onDiaClick: (d: Date) => void;
  onMesClick: (d: Date) => void;
}) {
  const hoje = new Date();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {Array.from({ length: 12 }, (_, mi) => {
        const mesData = new Date(anoRef.getFullYear(), mi, 1);
        const semanas = monthMatrix(mesData);
        return (
          <div key={mi} style={{ border: '1.5px solid var(--gray-100)', borderRadius: 10, padding: 10 }}>
            <button onClick={() => onMesClick(mesData)} style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-700)', marginBottom: 6, display: 'block' }}>
              {MESES[mi]}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {DIAS.map(d => (
                <div key={d} style={{ fontSize: 8, fontWeight: 700, color: 'var(--gray-300)', textAlign: 'center' }}>{d[0]}</div>
              ))}
              {semanas.flat().map((d, di) => {
                const foraDoMes = d.getMonth() !== mi;
                const temBlocos = blocosPorDia(toISO(d)).length > 0;
                const ehHoje = sameDate(d, hoje);
                return (
                  <button key={di} onClick={() => onDiaClick(d)} style={{
                    fontSize: 9, fontWeight: ehHoje ? 800 : 500, textAlign: 'center', padding: '2px 0', borderRadius: 4,
                    color: foraDoMes ? 'var(--gray-200)' : (ehHoje ? 'white' : 'var(--gray-500)'),
                    background: ehHoje ? 'var(--verde-accent)' : (temBlocos && !foraDoMes ? 'rgba(90,158,58,0.12)' : 'transparent'),
                  }}>
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function somarMinutos(hora: string, min: number): string {
  const total = toMin(hora) + min;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function formatarDataCurta(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}/${m}/${y}`;
}
