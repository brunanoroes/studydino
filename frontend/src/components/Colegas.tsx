import { useState, useEffect } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { api, formatarTempo } from '../api';
import type { Amigo, ProgressoAmigo, StatusEstudando } from '../api';

interface ColaboradorComStatus extends Amigo {
  progresso?: ProgressoAmigo;
  status?: StatusEstudando;
  carregando?: boolean;
}

export default function Colegas() {
  const [amigos, setAmigos] = useState<ColaboradorComStatus[]>([]);
  const [novoAmigo, setNovoAmigo] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [adicionando, setAdicionando] = useState(false);

  const carregarAmigos = async () => {
    setCarregando(true);
    try {
      const lista = await api.amigos.listar();
      setAmigos(lista.map(a => ({ ...a, carregando: true })));

      // Carrega progresso e status de cada amigo em paralelo
      await Promise.all(
        lista.map(async (amigo) => {
          try {
            const [progresso, status] = await Promise.all([
              api.amigos.progresso(amigo.id),
              api.amigos.estudandoAgora(amigo.id),
            ]);
            setAmigos(prev => prev.map(a =>
              a.id === amigo.id
                ? { ...a, progresso, status, carregando: false }
                : a
            ));
          } catch (e) {
            setAmigos(prev => prev.map(a =>
              a.id === amigo.id ? { ...a, carregando: false } : a
            ));
          }
        })
      );
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAmigos();
    const interval = setInterval(carregarAmigos, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAmigo.trim()) return;

    setAdicionando(true);
    setErro('');
    try {
      await api.amigos.adicionar(novoAmigo);
      setNovoAmigo('');
      carregarAmigos();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setAdicionando(false);
    }
  };

  const removerAmigo = async (id: number) => {
    if (!confirm('Remover este amigo?')) return;
    try {
      await api.amigos.remover(id);
      setAmigos(amigos.filter(a => a.id !== id));
    } catch (e: any) {
      setErro(e.message);
    }
  };

  if (carregando) {
    return (
      <div style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--gray-400)' }}>
        <Users size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontWeight: 600 }}>Carregando colegas...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 20px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Users size={20} color="var(--verde-accent)" />
          Colegas
        </h2>
        <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Acompanhe o progresso de seus colegas</p>
      </div>

      {/* Adicionar novo amigo */}
      <form onSubmit={handleAdicionar} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={novoAmigo}
            onChange={e => setNovoAmigo(e.target.value)}
            placeholder="Digite o username do colega..."
            style={{
              flex: 1, padding: '10px 13px', borderRadius: 8,
              border: `1.5px solid ${erro ? '#ef4444' : 'var(--gray-200)'}`,
              fontSize: 14, fontWeight: 500, background: 'white',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--verde-accent)'}
            onBlur={e => e.target.style.borderColor = erro ? '#ef4444' : 'var(--gray-200)'}
          />
          <button
            type="submit"
            disabled={adicionando || !novoAmigo.trim()}
            style={{
              background: 'var(--verde-accent)', color: 'white',
              borderRadius: 8, padding: '10px 16px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              opacity: !novoAmigo.trim() ? 0.5 : 1,
            }}
          >
            <Plus size={14} /> {adicionando ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
        {erro && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{erro}</p>}
      </form>

      {/* Lista de amigos */}
      {amigos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-400)' }}>
          <Users size={40} style={{ opacity: 0.25, margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--gray-600)' }}>Nenhum colega adicionado</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Adicione colegas para acompanhar o progresso deles!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {amigos.map(amigo => (
            <div
              key={amigo.id}
              style={{
                background: 'white', border: '1.5px solid var(--gray-100)',
                borderRadius: 'var(--radius-sm)', padding: 16,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Header do amigo */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-800)' }}>
                      {amigo.username}
                    </span>
                    {amigo.carregando ? (
                      <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>carregando...</span>
                    ) : amigo.status?.estudando ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#10b981',
                        background: '#ecfdf5', borderRadius: 100, padding: '2px 8px',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        🟢 Estudando · {amigo.status.nome}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>🔴 Offline</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    {amigo.progresso ? formatarTempo(amigo.progresso.totalSegundos) : '0s'} estudados hoje
                  </p>
                </div>
                <button
                  onClick={() => removerAmigo(amigo.id)}
                  style={{
                    background: '#fff5f5', color: '#ef4444', borderRadius: 7,
                    padding: '6px', display: 'flex', border: '1px solid #fee2e2',
                    cursor: 'pointer',
                  }}
                  title="Remover amigo"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Progresso por matéria */}
              {amigo.carregando ? (
                <p style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Carregando progresso...</p>
              ) : amigo.progresso && amigo.progresso.sessoes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {amigo.progresso.sessoes.slice(0, 5).map((sessao, i) => {
                    const pct = Math.round((sessao.total_segundos / amigo.progresso!.totalSegundos) * 100);
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--gray-700)' }}>
                          <span>{sessao.nome}</span>
                          <span style={{ color: 'var(--gray-400)' }}>{formatarTempo(sessao.total_segundos)}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 100, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%', width: `${pct}%`,
                              background: sessao.cor, borderRadius: 100,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Sem estudos hoje</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
