import { useState, useEffect } from 'react';
import { CheckCircle2, BookOpen, Layers, CalendarDays } from 'lucide-react';
import { api } from '../api';
import type { Trilha, CapituloApi } from '../api';

interface Props {
  trilhaAtiva: Trilha | null;
  onIniciarCronometro: (materiaId: number) => void;
  onGerenciarTrilhas: () => void;
}

export default function MinhaTrilha({ trilhaAtiva, onIniciarCronometro, onGerenciarTrilhas }: Props) {
  const [concluidas, setConcluidas] = useState<Set<number>>(new Set());
  const [recemConcluido, setRecemConcluido] = useState<number | null>(null);
  const [aplicandoCronograma, setAplicandoCronograma] = useState(false);
  const [capitulos, setCapitulos] = useState<CapituloApi[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!trilhaAtiva) { setCapitulos([]); setCarregando(false); return; }
    setCarregando(true);
    Promise.all([
      api.trilhas.materiasConcluidas.list(trilhaAtiva.id),
      api.capitulos.list(trilhaAtiva.id),
    ]).then(([ids, caps]) => {
      setConcluidas(new Set(ids));
      setCapitulos(caps);
    }).catch(console.error).finally(() => setCarregando(false));
  }, [trilhaAtiva?.id]);

  const aplicarCronograma = async (cap: CapituloApi) => {
    if (!confirm(`Isso vai substituir o planejamento futuro (a partir de hoje) pelo cronograma de "${cap.nome}". O histórico de dias passados não é afetado. Continuar?`)) return;
    setAplicandoCronograma(true);
    await api.cronogramaDias.aplicarSemana(cap.cronograma, 12);
    setAplicandoCronograma(false);
  };

  const toggleMateria = async (materiaId: number, capIdx: number) => {
    if (!trilhaAtiva) return;
    const jaFeito = concluidas.has(materiaId);
    const novas = new Set(concluidas);

    if (jaFeito) {
      novas.delete(materiaId);
      await api.trilhas.materiasConcluidas.desmarcar(trilhaAtiva.id, materiaId);
    } else {
      novas.add(materiaId);
      await api.trilhas.materiasConcluidas.marcar(trilhaAtiva.id, materiaId);
    }

    setConcluidas(novas);

    // Detecta conclusão do capítulo
    const cap = capitulos[capIdx];
    const todasFeitas = cap.materias.every(m => novas.has(m.id));
    if (!jaFeito && todasFeitas) {
      setRecemConcluido(capIdx);
      setTimeout(() => setRecemConcluido(null), 3500);
    }
  };

  if (!trilhaAtiva) {
    return (
      <div style={{ padding: '64px 32px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(90,158,58,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Layers size={26} color="var(--verde-accent)" />
        </div>
        <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--gray-700)', marginBottom: 6 }}>
          Nenhuma trilha ativa
        </p>
        <p style={{ color: 'var(--gray-400)', fontSize: 14, marginBottom: 24 }}>
          Selecione uma trilha no menu do topo para ver seu progresso.
        </p>
        <button onClick={onGerenciarTrilhas} style={{
          background: 'var(--verde-accent)', color: 'white',
          borderRadius: 100, padding: '10px 24px',
          fontWeight: 600, fontSize: 14,
        }}>
          Gerenciar Trilhas
        </button>
      </div>
    );
  }

  if (carregando) {
    return <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>;
  }

  if (capitulos.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)' }}>
        <Layers size={32} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--gray-600)' }}>Trilha "{trilhaAtiva.nome}" sem capítulos definidos.</p>
        <p style={{ fontSize: 13, marginTop: 4 }}>Vá em "gerenciar trilhas" e adicione capítulos com matérias e cronograma para acompanhar o progresso aqui.</p>
        <button onClick={onGerenciarTrilhas} style={{
          marginTop: 16, background: 'var(--verde-accent)', color: 'white',
          borderRadius: 100, padding: '10px 22px', fontWeight: 600, fontSize: 13,
        }}>
          Gerenciar Trilhas
        </button>
      </div>
    );
  }

  const todasMateriaIds = capitulos.flatMap(c => c.materias.map(m => m.id));
  const totalConcluidas = todasMateriaIds.filter(id => concluidas.has(id)).length;
  const progressoGeral = todasMateriaIds.length > 0 ? Math.round((totalConcluidas / todasMateriaIds.length) * 100) : 0;

  const nomePorId = (cap: CapituloApi, id: number) =>
    cap.materias.find(m => m.id === id)?.nome ?? `Matéria #${id}`;

  const corPorId = (cap: CapituloApi, id: number) =>
    cap.materias.find(m => m.id === id)?.cor ?? 'var(--verde-accent)';

  const capDesbloqueado = (idx: number) =>
    idx === 0 || capitulos[idx - 1].materias.every(m => concluidas.has(m.id));

  const capStatus = (cap: CapituloApi, idx: number) => {
    if (!capDesbloqueado(idx)) return 'bloqueado' as const;
    if (cap.materias.length > 0 && cap.materias.every(m => concluidas.has(m.id))) return 'concluido' as const;
    if (cap.materias.some(m => concluidas.has(m.id))) return 'andamento' as const;
    return 'disponivel' as const;
  };

  return (
    <div style={{ padding: '28px 20px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: trilhaAtiva.cor, boxShadow: `0 0 0 3px ${trilhaAtiva.cor}33` }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-800)', letterSpacing: '-0.3px' }}>
            {trilhaAtiva.nome}
          </h2>
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 12, marginLeft: 20 }}>
          {totalConcluidas} de {todasMateriaIds.length} matérias concluídas
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'var(--gray-100)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressoGeral}%`,
            background: progressoGeral === 100
              ? 'var(--verde-accent)'
              : `linear-gradient(90deg, ${trilhaAtiva.cor}, var(--verde-accent))`,
            borderRadius: 99,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Capítulos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {capitulos.map((cap, idx) => {
          const status = capStatus(cap, idx);
          const concluidasCap = cap.materias.filter(m => concluidas.has(m.id)).length;
          const pct = cap.materias.length > 0 ? Math.round((concluidasCap / cap.materias.length) * 100) : 0;
          const celebrando = recemConcluido === idx;

          return (
            <div
              key={idx}
              style={{
                borderRadius: 14,
                border: status === 'concluido'
                  ? '1.5px solid rgba(90,158,58,0.3)'
                  : status === 'bloqueado'
                    ? '1.5px solid var(--gray-100)'
                    : '1.5px solid var(--gray-200)',
                background: status === 'bloqueado'
                  ? 'var(--gray-50)'
                  : status === 'concluido'
                    ? 'rgba(90,158,58,0.03)'
                    : 'white',
                overflow: 'hidden',
                opacity: status === 'bloqueado' ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {/* Cabeçalho */}
              <div style={{ padding: '14px 18px 12px', borderBottom: status === 'bloqueado' ? 'none' : '1px solid var(--gray-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>
                    {status === 'bloqueado' ? '🔒' : cap.emoji}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Capítulo {idx + 1}
                      </span>
                      {status === 'concluido' && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--verde-accent)', background: 'rgba(90,158,58,0.1)', borderRadius: 99, padding: '1px 7px' }}>
                          ✓ Concluído
                        </span>
                      )}
                      {status === 'andamento' && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', borderRadius: 99, padding: '1px 7px' }}>
                          Em andamento
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: status === 'bloqueado' ? 'var(--gray-400)' : 'var(--gray-800)', marginTop: 1 }}>
                      {cap.nome}
                    </div>
                  </div>
                  {status !== 'bloqueado' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: status === 'concluido' ? 'var(--verde-accent)' : 'var(--gray-400)' }}>
                        {concluidasCap}/{cap.materias.length}
                      </span>
                      {cap.cronograma.length > 0 && (
                        <button
                          onClick={() => aplicarCronograma(cap)}
                          disabled={aplicandoCronograma}
                          title="Aplicar cronograma deste capítulo na Agenda"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: status === 'concluido' ? 'rgba(90,158,58,0.1)' : 'rgba(99,102,241,0.1)',
                            border: `1.5px solid ${status === 'concluido' ? 'rgba(90,158,58,0.3)' : 'rgba(99,102,241,0.3)'}`,
                            color: status === 'concluido' ? 'var(--verde-accent)' : '#6366f1',
                            borderRadius: 7, padding: '4px 9px',
                            fontSize: 11, fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <CalendarDays size={11} />
                          Agenda
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {status !== 'bloqueado' && (
                  <div style={{ height: 4, borderRadius: 99, background: 'var(--gray-100)', overflow: 'hidden', marginTop: 10 }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: status === 'concluido' ? 'var(--verde-accent)' : '#f59e0b',
                      borderRadius: 99,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                )}
              </div>

              {/* Banner de celebração */}
              {celebrando && (
                <div style={{
                  padding: '12px 18px',
                  background: 'rgba(90,158,58,0.08)',
                  borderBottom: '1px solid rgba(90,158,58,0.12)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 24 }}>🎉</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--verde-deep)' }}>
                      Capítulo {idx + 1} concluído!
                    </div>
                    {idx + 1 < capitulos.length && (
                      <div style={{ fontSize: 12, color: 'var(--verde-mid)', marginTop: 1 }}>
                        Capítulo {idx + 2} · {capitulos[idx + 1].nome} desbloqueado
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Matérias */}
              {status !== 'bloqueado' && (
                <div>
                  {cap.materias.map((m, mIdx) => {
                    const mid = m.id;
                    const feito = concluidas.has(mid);
                    const nome = nomePorId(cap, mid);
                    const cor = corPorId(cap, mid);
                    const isLast = mIdx === cap.materias.length - 1;

                    return (
                      <div
                        key={mid}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '13px 18px',
                          borderBottom: isLast ? 'none' : '1px solid var(--gray-50)',
                          background: feito ? 'rgba(0,0,0,0.012)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleMateria(mid, idx)}
                          style={{
                            flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                            border: feito ? 'none' : '2px solid var(--gray-200)',
                            background: feito ? cor : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          title={feito ? 'Desmarcar' : 'Marcar como concluído'}
                        >
                          {feito && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>

                        {/* Nome */}
                        <span style={{
                          flex: 1, fontSize: 14, fontWeight: feito ? 400 : 600,
                          color: feito ? 'var(--gray-400)' : 'var(--gray-700)',
                          textDecoration: feito ? 'line-through' : 'none',
                        }}>
                          {nome}
                        </span>

                        {/* Ação */}
                        {feito ? (
                          <CheckCircle2 size={16} color={cor} style={{ flexShrink: 0, opacity: 0.6 }} />
                        ) : (
                          <button
                            onClick={() => onIniciarCronometro(mid)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              background: cor + '15',
                              border: `1.5px solid ${cor}35`,
                              color: cor,
                              borderRadius: 8, padding: '5px 12px',
                              fontSize: 12, fontWeight: 700,
                              flexShrink: 0,
                              cursor: 'pointer',
                            }}
                          >
                            <BookOpen size={12} />
                            Estudar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {status === 'bloqueado' && (
                <div style={{ padding: '8px 18px 14px', fontSize: 13, color: 'var(--gray-300)' }}>
                  Conclua o capítulo anterior para desbloquear.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trilha 100% */}
      {progressoGeral === 100 && (
        <div style={{
          marginTop: 24, padding: '20px 24px', borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(90,158,58,0.1), rgba(45,106,79,0.06))',
          border: '1.5px solid rgba(90,158,58,0.25)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--verde-deep)' }}>Trilha concluída!</div>
          <div style={{ fontSize: 13, color: 'var(--verde-mid)', marginTop: 4 }}>
            Você concluiu todas as matérias de {trilhaAtiva.nome}.
          </div>
        </div>
      )}
    </div>
  );
}
