import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Clock, BookOpen, ChevronRight } from 'lucide-react';
import { api, formatarTempo } from '../api';
import type { Materia, Trilha } from '../api';
import MateriaDetalhe from './MateriaDetalhe';

const CORES = [
  '#2d6a4f','#52b788','#4a90d9','#e76f51','#264653','#e9c46a',
  '#6d6875','#9b2226','#457b9d','#606c38','#bc6c25','#8ecae6',
];

interface Props {
  materias: Materia[];
  todasMaterias: Materia[];
  trilhaAtiva: Trilha | null;
  trilhas: Trilha[];
  onAtualizar: () => void;
}
interface FormData { nome: string; cor: string; }
const FORM_VAZIO: FormData = { nome: '', cor: '#2d6a4f' };

export default function Materias({ materias, todasMaterias, trilhaAtiva, trilhas, onAtualizar }: Props) {
  const [form, setForm] = useState<FormData>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<Materia | null>(null);

  const abrirNovo = () => { setEditandoId(null); setForm(FORM_VAZIO); setErro(''); setFormAberto(true); };
  const abrirEditar = (m: Materia) => { setEditandoId(m.id); setForm({ nome: m.nome, cor: m.cor }); setErro(''); setFormAberto(true); };
  const cancelar = () => { setEditandoId(null); setForm(FORM_VAZIO); setErro(''); setFormAberto(false); };

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Informe o nome da matéria'); return; }
    setCarregando(true); setErro('');
    try {
      if (editandoId) {
        await api.materias.update(editandoId, { nome: form.nome, cor: form.cor, emoji: '' });
      } else {
        await api.materias.create({ nome: form.nome, cor: form.cor, emoji: '' });
      }
      cancelar();
      onAtualizar();
    } catch (e: any) { setErro(e.message); }
    finally { setCarregando(false); }
  };

  const deletar = async (id: number) => {
    await api.materias.delete(id);
    setConfirmDelete(null);
    onAtualizar();
  };

  if (detalhe) {
    const atualizada = materias.find(m => m.id === detalhe.id) ?? detalhe;
    return (
      <MateriaDetalhe
        materia={atualizada}
        trilhaAtiva={trilhaAtiva}
        trilhas={trilhas}
        onVoltar={() => setDetalhe(null)}
      />
    );
  }

  return (
    <div style={{ padding: '32px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} color="var(--verde-accent)" />
            Matérias
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {trilhaAtiva
              ? <>{materias.length} de {todasMaterias.length} matérias · <span style={{ color: 'var(--verde-accent)', fontWeight: 600 }}>{trilhaAtiva.nome}</span></>
              : <>{materias.length} {materias.length === 1 ? 'matéria cadastrada' : 'matérias cadastradas'}</>
            }
          </p>
        </div>
        {!formAberto && !trilhaAtiva && (
          <button onClick={abrirNovo} style={{
            background: 'var(--verde-accent)', color: 'white',
            borderRadius: 8, padding: '9px 18px',
            fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 2px 12px rgba(90,158,58,0.3)',
          }}>
            <Plus size={16} /> Nova matéria
          </button>
        )}
      </div>

      {/* Form */}
      {formAberto && (
        <div style={{
          background: 'var(--gray-50)',
          border: '1.5px solid var(--gray-200)',
          borderRadius: 'var(--radius-sm)',
          padding: '20px',
          marginBottom: 20,
        }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-800)', marginBottom: 16 }}>
            {editandoId ? 'Editar matéria' : 'Nova matéria'}
          </h3>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--gray-600)', marginBottom: 6 }}>Nome</label>
            <input
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && salvar()}
              placeholder="Ex: Direito Constitucional"
              style={{
                width: '100%', padding: '10px 13px',
                borderRadius: 8,
                border: `1.5px solid ${erro ? '#ef4444' : 'var(--gray-200)'}`,
                fontSize: 14, fontWeight: 500,
                background: 'white',
                color: 'var(--gray-800)',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--verde-accent)'}
              onBlur={e => e.target.style.borderColor = erro ? '#ef4444' : 'var(--gray-200)'}
              autoFocus
            />
            {erro && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{erro}</p>}
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>Cor</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CORES.map(c => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, cor: c })}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: `3px solid ${form.cor === c ? '#111' : 'transparent'}`,
                    outline: form.cor === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={salvar} disabled={carregando} style={{
              background: 'var(--verde-accent)', color: 'white',
              borderRadius: 8, padding: '9px 20px',
              fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: carregando ? 0.7 : 1,
            }}>
              <Check size={15} /> {carregando ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={cancelar} style={{
              background: 'white', color: 'var(--gray-600)',
              borderRadius: 8, padding: '9px 16px',
              fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 6,
              border: '1.5px solid var(--gray-200)',
            }}>
              <X size={15} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {materias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-400)' }}>
          <BookOpen size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, fontSize: 15 }}>
            {trilhaAtiva ? `Nenhuma matéria na trilha "${trilhaAtiva.nome}"` : 'Nenhuma matéria cadastrada'}
          </p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            {trilhaAtiva ? 'Edite a trilha para adicionar matérias.' : 'Adicione suas matérias de estudo acima.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {materias.map(m => (
            <div key={m.id} onClick={() => setDetalhe(m)} style={{
              background: 'white',
              border: '1.5px solid var(--gray-100)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: 'var(--shadow-sm)',
              transition: 'box-shadow 0.15s',
              cursor: 'pointer',
            }}>
              <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: m.cor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.nome}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 3, display: 'flex', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {formatarTempo(m.total_segundos)}
                  </span>
                  <span>{m.total_sessoes} {m.total_sessoes === 1 ? 'sessão' : 'sessões'}</span>
                </div>
              </div>
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                {confirmDelete === m.id ? (
                  <>
                    <button onClick={() => deletar(m.id)} style={{
                      background: '#ef4444', color: 'white', borderRadius: 7,
                      padding: '6px 12px', fontSize: 12, fontWeight: 700,
                    }}>Excluir</button>
                    <button onClick={() => setConfirmDelete(null)} style={{
                      background: 'var(--gray-100)', color: 'var(--gray-600)',
                      borderRadius: 7, padding: '6px 10px', fontSize: 12, fontWeight: 600,
                    }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => abrirEditar(m)} style={{
                      background: 'var(--gray-50)', color: 'var(--gray-500)',
                      borderRadius: 7, padding: '7px', display: 'flex',
                      border: '1px solid var(--gray-200)',
                    }}><Pencil size={14} /></button>
                    <button onClick={() => setConfirmDelete(m.id)} style={{
                      background: '#fff5f5', color: '#ef4444',
                      borderRadius: 7, padding: '7px', display: 'flex',
                      border: '1px solid #fee2e2',
                    }}><Trash2 size={14} /></button>
                    <ChevronRight size={16} color="var(--gray-300)" />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
