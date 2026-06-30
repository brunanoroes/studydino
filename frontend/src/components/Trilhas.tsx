import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Layers, Clock, ChevronRight, BookOpen } from 'lucide-react';
import { api, formatarTempo } from '../api';
import type { Materia, Trilha } from '../api';
import TrilhaDetalhe from './TrilhaDetalhe';

const CORES = [
  '#2d6a4f','#52b788','#4a90d9','#e76f51','#264653','#e9c46a',
  '#6d6875','#9b2226','#457b9d','#606c38','#bc6c25','#8ecae6',
];

interface Props {
  trilhas: Trilha[];
  materias: Materia[];
  trilhaAtiva: Trilha | null;
  onAtualizar: () => void;
  onSelecionarTrilha: (t: Trilha | null) => void;
  onIniciarCronometro: (materiaId: number) => void;
}

interface FormData { nome: string; cor: string; materia_ids: number[] }
const VAZIO: FormData = { nome: '', cor: '#2d6a4f', materia_ids: [] };

export default function Trilhas({ trilhas, materias, trilhaAtiva, onAtualizar, onSelecionarTrilha, onIniciarCronometro }: Props) {
  const [form, setForm] = useState<FormData>(VAZIO);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<Trilha | null>(null);

  const abrirNovo = () => { setEditandoId(null); setForm(VAZIO); setErro(''); setFormAberto(true); setDetalhe(null); };
  const abrirEditar = (t: Trilha, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoId(t.id);
    setForm({ nome: t.nome, cor: t.cor, materia_ids: t.materias.map(m => m.id) });
    setErro(''); setFormAberto(true); setDetalhe(null);
  };
  const cancelar = () => { setEditandoId(null); setForm(VAZIO); setErro(''); setFormAberto(false); };

  const toggleMateria = (id: number) => {
    setForm(f => ({
      ...f,
      materia_ids: f.materia_ids.includes(id)
        ? f.materia_ids.filter(x => x !== id)
        : [...f.materia_ids, id],
    }));
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Informe o nome da trilha'); return; }
    if (form.materia_ids.length === 0) { setErro('Selecione ao menos uma matéria'); return; }
    setCarregando(true); setErro('');
    try {
      let trilhaId = editandoId;
      if (!editandoId) {
        const r = await api.trilhas.create(form);
        trilhaId = r.id;
      } else {
        await api.trilhas.update(editandoId, form);
      }
      await onAtualizar();
      // Abre o detalhe da trilha para configurar capítulos
      const trilha = trilhas.find(t => t.id === trilhaId);
      if (trilha) setDetalhe(trilha);
      cancelar();
    } catch (e: any) { setErro(e.message); }
    finally { setCarregando(false); }
  };

  const deletar = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.trilhas.delete(id);
    setConfirmDelete(null);
    if (trilhaAtiva?.id === id) onSelecionarTrilha(null);
    if (detalhe?.id === id) setDetalhe(null);
    onAtualizar();
  };

  const totalSegundosTrilha = (t: Trilha) =>
    t.materias.reduce((acc, m) => acc + m.total_segundos, 0);

  // Detalhe view
  if (detalhe) {
    const trilhaAtualizada = trilhas.find(t => t.id === detalhe.id) ?? detalhe;
    return (
      <TrilhaDetalhe
        trilha={trilhaAtualizada}
        ativa={trilhaAtiva?.id === trilhaAtualizada.id}
        onVoltar={() => setDetalhe(null)}
        onSelecionar={t => onSelecionarTrilha(trilhaAtiva?.id === t.id ? null : t)}
        onIniciarCronometro={onIniciarCronometro}
      />
    );
  }

  return (
    <div style={{ padding: '32px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={20} color="var(--verde-accent)" />
            Trilhas
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            Clique em uma trilha para ver o plano de estudos
          </p>
        </div>
        {!formAberto && (
          <button onClick={abrirNovo} style={{
            background: 'var(--verde-accent)', color: 'white',
            borderRadius: 8, padding: '9px 18px',
            fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 2px 12px rgba(90,158,58,0.3)',
          }}>
            <Plus size={16} /> Nova trilha
          </button>
        )}
      </div>

      {/* Form */}
      {formAberto && (
        <div style={{
          background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)',
          borderRadius: 'var(--radius-sm)', padding: 20, marginBottom: 20,
        }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-800)', marginBottom: 16 }}>
            {editandoId ? 'Editar trilha' : 'Nova trilha'}
          </h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--gray-600)', marginBottom: 6 }}>Nome</label>
            <input
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Ciclo Básico, Petrobras 2025..."
              autoFocus
              style={{
                width: '100%', padding: '10px 13px', borderRadius: 8,
                border: `1.5px solid ${erro && !form.nome ? '#ef4444' : 'var(--gray-200)'}`,
                fontSize: 14, fontWeight: 500, background: 'white', color: 'var(--gray-800)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--verde-accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>Cor</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CORES.map(c => (
                <button key={c} onClick={() => setForm({ ...form, cor: c })} style={{
                  width: 26, height: 26, borderRadius: '50%', background: c,
                  border: `3px solid ${form.cor === c ? '#111' : 'transparent'}`,
                  outline: form.cor === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                }} />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>
              Matérias
              <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--gray-400)' }}>
                ({form.materia_ids.length} selecionada{form.materia_ids.length !== 1 ? 's' : ''})
              </span>
            </label>
            {materias.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-400)', fontStyle: 'italic' }}>Nenhuma matéria cadastrada ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {materias.map(m => {
                  const selecionada = form.materia_ids.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleMateria(m.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8, textAlign: 'left',
                      background: selecionada ? m.cor + '15' : 'white',
                      border: `1.5px solid ${selecionada ? m.cor : 'var(--gray-200)'}`,
                      transition: 'all 0.15s',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        background: selecionada ? m.cor : 'transparent',
                        border: `2px solid ${selecionada ? m.cor : 'var(--gray-300)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selecionada && <Check size={11} color="white" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)' }}>{m.nome}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{formatarTempo(m.total_segundos)} estudados</div>
                      </div>
                      <div style={{ width: 3, height: 32, borderRadius: 4, background: m.cor, flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}
            {erro && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{erro}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={salvar} disabled={carregando} style={{
              background: 'var(--verde-accent)', color: 'white',
              borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 6, opacity: carregando ? 0.7 : 1,
            }}>
              <Check size={15} /> {carregando ? 'Salvando...' : 'Salvar'}
            </button>
            {editandoId && trilhas.length > 0 && (
              <button onClick={() => {
                const t = trilhas.find(tr => tr.id === editandoId);
                if (t) setDetalhe(t);
              }} style={{
                background: '#6366f1', color: 'white',
                borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <BookOpen size={15} /> Gerenciar capítulos
              </button>
            )}
            <button onClick={cancelar} style={{
              background: 'white', color: 'var(--gray-600)', borderRadius: 8,
              padding: '9px 16px', fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid var(--gray-200)',
            }}>
              <X size={15} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {trilhas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-400)' }}>
          <Layers size={40} style={{ opacity: 0.25, margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15 }}>Nenhuma trilha criada</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Agrupe matérias por concurso ou fase de estudo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trilhas.map(t => {
            const isAtiva = trilhaAtiva?.id === t.id;
            return (
              <div
                key={t.id}
                style={{
                  background: 'white', border: `1.5px solid ${isAtiva ? t.cor : 'var(--gray-100)'}`,
                  borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                  boxShadow: isAtiva ? `0 0 0 3px ${t.cor}22` : 'var(--shadow-sm)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ height: 4, background: t.cor }} />
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--gray-800)' }}>{t.nome}</span>
                      {isAtiva && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: t.cor,
                          background: t.cor + '15', borderRadius: 100, padding: '2px 8px',
                          border: `1px solid ${t.cor}40`, textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>ativa</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2, display: 'flex', gap: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {formatarTempo(totalSegundosTrilha(t))}
                      </span>
                      <span>{t.materias.length} {t.materias.length === 1 ? 'matéria' : 'matérias'}</span>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {t.materias.map(m => (
                        <span key={m.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: m.cor + '15', border: `1px solid ${m.cor}40`,
                          borderRadius: 100, padding: '2px 8px',
                          fontSize: 11, fontWeight: 600, color: 'var(--gray-700)',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.cor, flexShrink: 0 }} />
                          {m.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    {confirmDelete === t.id ? (
                      <>
                        <button onClick={e => deletar(t.id, e)} style={{
                          background: '#ef4444', color: 'white', borderRadius: 7,
                          padding: '6px 12px', fontSize: 12, fontWeight: 700,
                        }}>Excluir</button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(null); }} style={{
                          background: 'var(--gray-100)', color: 'var(--gray-600)',
                          borderRadius: 7, padding: '6px 10px', fontSize: 12, fontWeight: 600,
                        }}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={e => { e.stopPropagation(); setDetalhe(t); }} style={{
                          background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                          borderRadius: 7, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5,
                          border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, fontWeight: 600,
                        }}><Layers size={13} /> Capítulos</button>
                        <button onClick={e => abrirEditar(t, e)} style={{
                          background: 'var(--gray-50)', color: 'var(--gray-500)',
                          borderRadius: 7, padding: '7px', display: 'flex',
                          border: '1px solid var(--gray-200)',
                        }}><Pencil size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(t.id); }} style={{
                          background: '#fff5f5', color: '#ef4444', borderRadius: 7,
                          padding: '7px', display: 'flex', border: '1px solid #fee2e2',
                        }}><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
