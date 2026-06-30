import { ArrowLeft, BookOpen, HelpCircle, ExternalLink, Clock } from 'lucide-react';
import { TRILHA_STEPS } from '../data/trilhaSteps';
import type { Materia, Trilha } from '../api';
import { formatarTempo } from '../api';

interface Props {
  materia: Materia;
  trilhaAtiva: Trilha | null;
  trilhas: Trilha[];
  onVoltar: () => void;
}

export default function MateriaDetalhe({ materia, trilhaAtiva, trilhas, onVoltar }: Props) {
  // Monta lista de trilhas que contêm esta matéria, com seus recursos
  const trilhasComRecursos = Object.entries(TRILHA_STEPS)
    .map(([trilhaNome, config]) => {
      const passo = config.passos.find(p => p.materia_nome === materia.nome);
      if (!passo || passo.recursos.length === 0) return null;
      // Se há trilha ativa, só mostra recursos dela
      if (trilhaAtiva && trilhaAtiva.nome !== trilhaNome) return null;
      const trilhaDB = trilhas.find(t => t.nome === trilhaNome);
      return { trilhaNome, cor: trilhaDB?.cor ?? '#2d6a4f', recursos: passo.recursos };
    })
    .filter(Boolean) as { trilhaNome: string; cor: string; recursos: typeof TRILHA_STEPS[string]['passos'][0]['recursos'] }[];

  return (
    <div style={{ padding: '24px 24px 32px' }}>
      {/* Topo */}
      <button
        onClick={onVoltar}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--gray-500)', fontSize: 13, fontWeight: 600,
          background: 'var(--gray-100)', borderRadius: 8, padding: '7px 12px',
          border: '1px solid var(--gray-200)', marginBottom: 20,
        }}
      >
        <ArrowLeft size={14} /> Matérias
      </button>

      {/* Header da matéria */}
      <div style={{
        borderRadius: 'var(--radius-sm)', overflow: 'hidden',
        border: '1.5px solid var(--gray-100)', marginBottom: 24,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ height: 5, background: materia.cor }} />
        <div style={{ padding: '18px 20px', background: 'white' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-800)', letterSpacing: '-0.5px' }}>
            {materia.nome}
          </h2>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 6, display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={13} /> {formatarTempo(materia.total_segundos)} estudados
            </span>
            <span>{materia.total_sessoes} {materia.total_sessoes === 1 ? 'sessão' : 'sessões'}</span>
          </div>
          {trilhaAtiva && (
            <div style={{
              marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `${trilhaAtiva.cor}15`, border: `1px solid ${trilhaAtiva.cor}40`,
              borderRadius: 100, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: 'var(--gray-700)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: trilhaAtiva.cor }} />
              {trilhaAtiva.nome}
            </div>
          )}
        </div>
      </div>

      {/* Recursos por trilha */}
      {trilhasComRecursos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
          <BookOpen size={36} style={{ opacity: 0.2, margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15 }}>Nenhum material mapeado</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            {trilhaAtiva
              ? `Esta matéria não tem recursos mapeados na trilha "${trilhaAtiva.nome}".`
              : 'Selecione uma trilha para ver os materiais disponíveis.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {trilhasComRecursos.map(({ trilhaNome, cor, recursos }) => (
            <div key={trilhaNome}>
              {/* Cabeçalho da trilha — omite se só há uma trilha visível */}
              {(trilhasComRecursos.length > 1 || !trilhaAtiva) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {trilhaNome}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recursos.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10, textDecoration: 'none',
                      background: r.tipo === 'pdf' ? '#f0fdf4' : '#eff6ff',
                      border: `1.5px solid ${r.tipo === 'pdf' ? '#bbf7d0' : '#bfdbfe'}`,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: r.tipo === 'pdf' ? '#dcfce7' : '#dbeafe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {r.tipo === 'pdf'
                        ? <BookOpen size={16} color="#15803d" strokeWidth={2.5} />
                        : <HelpCircle size={16} color="#1d4ed8" strokeWidth={2.5} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: r.tipo === 'pdf' ? '#15803d' : '#1d4ed8',
                      }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                        {r.concurso}
                      </div>
                    </div>
                    <ExternalLink size={14} style={{ flexShrink: 0, color: r.tipo === 'pdf' ? '#86efac' : '#93c5fd' }} />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
