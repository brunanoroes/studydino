import { useState, useEffect } from 'react';
import { Trash2, SlidersHorizontal, Clock } from 'lucide-react';
import { api, formatarTempo } from '../api';
import type { Sessao, Materia, Trilha } from '../api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props { materias: Materia[]; trilhas: Trilha[]; atualizar: number; }

export default function Historico({ materias, trilhas, atualizar }: Props) {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [filtroMateria, setFiltroMateria] = useState('');
  const [filtroTrilha, setFiltroTrilha] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Quando trilha muda, limpa filtro de matéria
  const trilhaSelecionada = trilhas.find(t => String(t.id) === filtroTrilha);
  const materiasFiltradas = trilhaSelecionada
    ? materias.filter(m => trilhaSelecionada.materias.some(tm => tm.id === m.id))
    : materias;

  const carregar = () => {
    setCarregando(true);
    const params: Record<string, string> = { limit: '100' };
    // Se trilha selecionada, filtra pelas matérias da trilha no client side
    if (filtroMateria) params.materia_id = filtroMateria;
    api.sessoes.list(params).then(all => {
      if (trilhaSelecionada && !filtroMateria) {
        const ids = new Set(trilhaSelecionada.materias.map(m => m.id));
        setSessoes(all.filter(s => ids.has(s.materia_id)));
      } else {
        setSessoes(all);
      }
    }).finally(() => setCarregando(false));
  };

  useEffect(() => { setFiltroMateria(''); }, [filtroTrilha]);
  useEffect(() => { carregar(); }, [filtroMateria, filtroTrilha, atualizar]);

  const deletar = async (id: number) => {
    await api.sessoes.delete(id);
    carregar();
  };

  const formatarData = (iso: string) => {
    try { return format(new Date(iso), "dd 'de' MMM · HH'h'mm", { locale: ptBR }); }
    catch { return iso; }
  };

  // Agrupar por dia
  const porDia = sessoes.reduce<Record<string, Sessao[]>>((acc, s) => {
    const dia = s.iniciada_em.slice(0, 10);
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(s);
    return acc;
  }, {});

  return (
    <div style={{ padding: '32px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} color="var(--verde-accent)" />
            Histórico
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {sessoes.length} {sessoes.length === 1 ? 'sessão registrada' : 'sessões registradas'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <SlidersHorizontal size={14} color="var(--gray-400)" />
          {trilhas.length > 0 && (
            <select
              value={filtroTrilha}
              onChange={e => setFiltroTrilha(e.target.value)}
              style={{
                padding: '7px 12px', borderRadius: 8,
                border: `1.5px solid ${filtroTrilha ? 'var(--verde-accent)' : 'var(--gray-200)'}`,
                background: 'white', fontWeight: 600, fontSize: 13,
                color: filtroTrilha ? 'var(--gray-800)' : 'var(--gray-400)',
              }}
            >
              <option value="">Todas as trilhas</option>
              {trilhas.map(t => <option key={t.id} value={String(t.id)}>{t.nome}</option>)}
            </select>
          )}
          {materiasFiltradas.length > 0 && (
            <select
              value={filtroMateria}
              onChange={e => setFiltroMateria(e.target.value)}
              style={{
                padding: '7px 12px', borderRadius: 8,
                border: `1.5px solid ${filtroMateria ? 'var(--verde-accent)' : 'var(--gray-200)'}`,
                background: 'white', fontWeight: 600, fontSize: 13,
                color: filtroMateria ? 'var(--gray-800)' : 'var(--gray-400)',
              }}
            >
              <option value="">Todas as matérias</option>
              {materiasFiltradas.map(m => <option key={m.id} value={String(m.id)}>{m.nome}</option>)}
            </select>
          )}
        </div>
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>
          <Clock size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
          <p style={{ fontWeight: 600 }}>Carregando...</p>
        </div>
      ) : sessoes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-400)' }}>
          <Clock size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15 }}>Nenhuma sessão encontrada</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(porDia).map(([dia, lista]) => {
            const totalDia = lista.reduce((s, x) => s + x.duracao_segundos, 0);
            let labelDia = '';
            try { labelDia = format(new Date(dia + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR }); } catch { labelDia = dia; }
            return (
              <div key={dia}>
                {/* Cabeçalho do dia */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--gray-100)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', textTransform: 'capitalize' }}>{labelDia}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>{formatarTempo(totalDia)} no total</span>
                </div>
                {/* Sessões do dia */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lista.map(s => (
                    <div key={s.id} style={{
                      background: 'white',
                      border: '1.5px solid var(--gray-100)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 4, background: s.materia_cor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)' }}>{s.materia_nome}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2, display: 'flex', gap: 10 }}>
                          <span>{formatarData(s.iniciada_em)}</span>
                          <span style={{ fontWeight: 700, color: 'var(--gray-600)' }}>{formatarTempo(s.duracao_segundos)}</span>
                        </div>
                        {s.anotacao && (
                          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4, fontStyle: 'italic' }}>
                            {s.anotacao}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deletar(s.id)}
                        style={{ background: '#fff5f5', color: '#ef4444', borderRadius: 7, padding: '6px', display: 'flex', border: '1px solid #fee2e2', flexShrink: 0 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
