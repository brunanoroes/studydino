import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, HelpCircle, Check, ExternalLink, Play, Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, Layers } from 'lucide-react';
import { TRILHA_STEPS } from '../data/trilhaSteps';
import { api, formatarTempo } from '../api';
import type { Trilha, CapituloApi, BlocoCapituloApi } from '../api';

interface Props {
  trilha: Trilha;
  ativa: boolean;
  onVoltar: () => void;
  onSelecionar: (t: Trilha) => void;
  onIniciarCronometro: (materiaId: number) => void;
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TIPOS = {
  estudo: 'Estudo', pausa: 'Pausa', questoes: 'Questões', revisao: 'Revisão', livre: 'Livre',
} as const;

type FormCapitulo = {
  nome: string;
  emoji: string;
  descricao: string;
  materia_ids: number[];
  cronograma: Omit<BlocoCapituloApi, 'id'>[];
};
const FORM_VAZIO: FormCapitulo = { nome: '', emoji: '📚', descricao: '', materia_ids: [], cronograma: [] };
const BLOCO_VAZIO = { dia_semana: 1, hora_inicio: '18:00', hora_fim: '19:00', tipo: 'estudo' as const, materia_id: null as number | null, descricao: '' };

export default function TrilhaDetalhe({ trilha, ativa, onVoltar, onSelecionar, onIniciarCronometro }: Props) {
  const config = TRILHA_STEPS[trilha.nome];
  const totalSegundos = trilha.materias.reduce((s, m) => s + m.total_segundos, 0);

  // ── Capítulos configuráveis ──────────────────────────────
  const [capitulos, setCapitulos] = useState<CapituloApi[]>([]);
  const [carregandoCap, setCarregandoCap] = useState(true);
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormCapitulo>(FORM_VAZIO);
  const [novoBloco, setNovoBloco] = useState({ ...BLOCO_VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const carregarCapitulos = () => {
    setCarregandoCap(true);
    api.capitulos.list(trilha.id).then(setCapitulos).catch(console.error).finally(() => setCarregandoCap(false));
  };
  useEffect(carregarCapitulos, [trilha.id]);

  const abrirNovoCapitulo = () => {
    setEditandoId(null);
    setForm({ ...FORM_VAZIO });
    setNovoBloco({ ...BLOCO_VAZIO });
    setFormAberto(true);
  };
  const abrirEditarCapitulo = (c: CapituloApi) => {
    setEditandoId(c.id);
    setForm({
      nome: c.nome, emoji: c.emoji, descricao: c.descricao ?? '',
      materia_ids: c.materias.map(m => m.id),
      cronograma: c.cronograma.map(({ id, ...resto }) => resto),
    });
    setNovoBloco({ ...BLOCO_VAZIO });
    setFormAberto(true);
  };
  const cancelarForm = () => { setFormAberto(false); setEditandoId(null); };

  const toggleMateriaForm = (id: number) => {
    setForm(f => ({
      ...f,
      materia_ids: f.materia_ids.includes(id) ? f.materia_ids.filter(x => x !== id) : [...f.materia_ids, id],
    }));
  };

  const adicionarBloco = () => {
    setForm(f => ({ ...f, cronograma: [...f.cronograma, { ...novoBloco, descricao: novoBloco.descricao || null }] }));
    setNovoBloco({ ...BLOCO_VAZIO });
  };
  const removerBloco = (i: number) => {
    setForm(f => ({ ...f, cronograma: f.cronograma.filter((_, idx) => idx !== i) }));
  };

  const salvarCapitulo = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    try {
      const payload = { ...form, descricao: form.descricao.trim() || null };
      if (editandoId) await api.capitulos.update(editandoId, payload);
      else await api.capitulos.create(trilha.id, payload);
      cancelarForm();
      carregarCapitulos();
    } finally { setSalvando(false); }
  };

  const excluirCapitulo = async (id: number) => {
    await api.capitulos.delete(id);
    setConfirmDelete(null);
    carregarCapitulos();
  };

  const mover = async (id: number, direcao: 'cima' | 'baixo') => {
    await api.capitulos.mover(id, direcao);
    carregarCapitulos();
  };

  // Build passos (resources) estáticos — independente do sistema de capítulos
  const passos = config
    ? config.passos.map((p, i) => {
        const materia = trilha.materias.find(m => m.nome === p.materia_nome);
        return { index: i, passo: p, materia };
      })
    : [];

  return (
    <div style={{ padding: '24px 24px 32px' }}>
      {/* Topo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={onVoltar}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--gray-500)', fontSize: 13, fontWeight: 600,
            background: 'var(--gray-100)', borderRadius: 8, padding: '7px 12px',
            border: '1px solid var(--gray-200)',
          }}
        >
          <ArrowLeft size={14} /> Trilhas
        </button>
      </div>

      {/* Header da trilha */}
      <div style={{
        borderRadius: 'var(--radius-sm)', overflow: 'hidden',
        border: '1.5px solid var(--gray-100)', marginBottom: 24,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ height: 5, background: trilha.cor }} />
        <div style={{ padding: '18px 20px', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-800)', letterSpacing: '-0.5px' }}>
                {trilha.nome}
              </h2>
              <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4, display: 'flex', gap: 14 }}>
                <span>{trilha.materias.length} matérias</span>
                <span>{formatarTempo(totalSegundos)} estudados</span>
              </div>
            </div>
            <button
              onClick={() => onSelecionar(trilha)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: ativa ? 'var(--gray-100)' : 'var(--verde-accent)',
                color: ativa ? 'var(--verde-accent)' : 'white',
                border: ativa ? '1.5px solid var(--verde-accent)' : 'none',
                borderRadius: 100, padding: '9px 18px',
                fontWeight: 700, fontSize: 13, flexShrink: 0,
                boxShadow: ativa ? 'none' : '0 2px 12px rgba(90,158,58,0.3)',
              }}
            >
              {ativa ? <><Check size={14} /> Trilha ativa</> : 'Selecionar trilha'}
            </button>
          </div>

          {config && (
            <p style={{
              fontSize: 14, color: 'var(--gray-600)', marginTop: 14, lineHeight: 1.6,
              padding: '12px 14px', background: 'var(--gray-50)',
              borderRadius: 8, border: '1px solid var(--gray-100)',
            }}>
              {config.descricao}
            </p>
          )}

          {/* Matérias badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {trilha.materias.map(m => (
              <span key={m.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: m.cor + '15', border: `1px solid ${m.cor}40`,
                borderRadius: 100, padding: '3px 10px',
                fontSize: 12, fontWeight: 600, color: 'var(--gray-700)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.cor, flexShrink: 0 }} />
                {m.nome}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Capítulos ────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{
            fontSize: 11, fontWeight: 800, color: 'var(--gray-400)',
            textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Layers size={13} /> Capítulos (Minha Trilha)
          </h3>
          {!formAberto && (
            <button onClick={abrirNovoCapitulo} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--verde-accent)', color: 'white',
              borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700,
            }}>
              <Plus size={13} /> Adicionar capítulo
            </button>
          )}
        </div>

        {/* Form de capítulo */}
        {formAberto && (
          <div style={{ background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', padding: 18, marginBottom: 14 }}>
            <h4 style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-700)', marginBottom: 14 }}>
              {editandoId ? 'Editar capítulo' : 'Novo capítulo'}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 5 }}>Emoji</label>
                <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  maxLength={4}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid var(--gray-200)', fontSize: 18, textAlign: 'center' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 5 }}>Título</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Fundamentos"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid var(--gray-200)', fontSize: 14, fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 5 }}>Descrição (opcional)</label>
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
                placeholder="O que esse capítulo cobre"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid var(--gray-200)', fontSize: 13, resize: 'vertical' }} />
            </div>

            {/* Matérias */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 6 }}>
                Matérias do capítulo ({form.materia_ids.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {trilha.materias.map(m => {
                  const sel = form.materia_ids.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleMateriaForm(m.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 11px', borderRadius: 7,
                      background: sel ? m.cor + '18' : 'white',
                      border: `1.5px solid ${sel ? m.cor : 'var(--gray-200)'}`,
                      fontSize: 12, fontWeight: 600, color: sel ? 'var(--gray-800)' : 'var(--gray-400)',
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.cor }} />
                      {m.nome}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cronograma do capítulo */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 6 }}>
                Cronograma semanal deste capítulo ({form.cronograma.length} blocos)
              </label>

              {form.cronograma.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                  {form.cronograma.map((b, i) => {
                    const mat = trilha.materias.find(m => m.id === b.materia_id);
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'white', border: '1px solid var(--gray-200)', borderRadius: 7,
                        padding: '6px 10px', fontSize: 12,
                      }}>
                        <span style={{ fontWeight: 700, color: 'var(--gray-600)', minWidth: 30 }}>{DIAS[b.dia_semana]}</span>
                        <span style={{ color: 'var(--gray-500)' }}>{b.hora_inicio}–{b.hora_fim}</span>
                        <span style={{
                          fontWeight: 700, fontSize: 10, textTransform: 'uppercase',
                          color: mat?.cor ?? 'var(--gray-400)',
                        }}>
                          {TIPOS[b.tipo]}{mat ? ` · ${mat.nome}` : ''}
                        </span>
                        <button onClick={() => removerBloco(i)} style={{ marginLeft: 'auto', color: '#ef4444', display: 'flex' }}>
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, alignItems: 'end' }}>
                <select value={novoBloco.dia_semana} onChange={e => setNovoBloco(b => ({ ...b, dia_semana: Number(e.target.value) }))}
                  style={{ padding: '7px 6px', borderRadius: 6, border: '1.5px solid var(--gray-200)', fontSize: 12, fontWeight: 600 }}>
                  {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input type="time" value={novoBloco.hora_inicio} onChange={e => setNovoBloco(b => ({ ...b, hora_inicio: e.target.value }))}
                  style={{ padding: '7px 4px', borderRadius: 6, border: '1.5px solid var(--gray-200)', fontSize: 12 }} />
                <input type="time" value={novoBloco.hora_fim} onChange={e => setNovoBloco(b => ({ ...b, hora_fim: e.target.value }))}
                  style={{ padding: '7px 4px', borderRadius: 6, border: '1.5px solid var(--gray-200)', fontSize: 12 }} />
                <select value={novoBloco.tipo} onChange={e => setNovoBloco(b => ({ ...b, tipo: e.target.value as typeof b.tipo, materia_id: e.target.value === 'estudo' ? b.materia_id : null }))}
                  style={{ padding: '7px 4px', borderRadius: 6, border: '1.5px solid var(--gray-200)', fontSize: 12, fontWeight: 600 }}>
                  {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select
                  value={novoBloco.materia_id ?? ''}
                  disabled={novoBloco.tipo !== 'estudo'}
                  onChange={e => setNovoBloco(b => ({ ...b, materia_id: Number(e.target.value) || null }))}
                  style={{ padding: '7px 4px', borderRadius: 6, border: '1.5px solid var(--gray-200)', fontSize: 12 }}>
                  <option value="">Matéria...</option>
                  {trilha.materias.filter(m => form.materia_ids.includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
                <button onClick={adicionarBloco} style={{
                  background: 'var(--verde-accent)', color: 'white', borderRadius: 6,
                  padding: '7px 0', fontSize: 12, fontWeight: 700,
                }}>
                  + Add
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={salvarCapitulo} disabled={salvando || !form.nome.trim()} style={{
                background: 'var(--verde-accent)', color: 'white', borderRadius: 7,
                padding: '8px 18px', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: !form.nome.trim() ? 0.5 : 1,
              }}>
                <Check size={13} /> {salvando ? 'Salvando...' : 'Salvar capítulo'}
              </button>
              <button onClick={cancelarForm} style={{
                background: 'white', color: 'var(--gray-500)', border: '1.5px solid var(--gray-200)',
                borderRadius: 7, padding: '8px 14px', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <X size={13} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de capítulos */}
        {!carregandoCap && capitulos.length === 0 && !formAberto && (
          <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--gray-400)', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--gray-200)' }}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>Nenhum capítulo configurado ainda.</p>
            <p style={{ fontSize: 12, marginTop: 2 }}>Crie capítulos para que esta trilha apareça em "Minha Trilha".</p>
          </div>
        )}

        {capitulos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {capitulos.map((c, i) => (
              <div key={c.id} style={{ background: 'white', border: '1.5px solid var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{c.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)' }}>{c.nome}</div>
                    {c.descricao && <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{c.descricao}</div>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {c.materias.map(m => (
                        <span key={m.id} style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-600)', background: m.cor + '15', border: `1px solid ${m.cor}35`, borderRadius: 100, padding: '1px 8px' }}>
                          {m.nome}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-300)', marginTop: 6, fontWeight: 600 }}>
                      {c.cronograma.length} {c.cronograma.length === 1 ? 'bloco' : 'blocos'} de cronograma
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                    <button onClick={() => mover(c.id, 'cima')} disabled={i === 0} style={{ color: 'var(--gray-400)', opacity: i === 0 ? 0.3 : 1, display: 'flex' }}><ChevronUp size={14} /></button>
                    <button onClick={() => mover(c.id, 'baixo')} disabled={i === capitulos.length - 1} style={{ color: 'var(--gray-400)', opacity: i === capitulos.length - 1 ? 0.3 : 1, display: 'flex' }}><ChevronDown size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    {confirmDelete === c.id ? (
                      <>
                        <button onClick={() => excluirCapitulo(c.id)} style={{ background: '#ef4444', color: 'white', borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 700 }}>Excluir</button>
                        <button onClick={() => setConfirmDelete(null)} style={{ background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 600 }}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => abrirEditarCapitulo(c)} style={{ background: 'var(--gray-50)', color: 'var(--gray-500)', borderRadius: 6, padding: 6, display: 'flex', border: '1px solid var(--gray-200)' }}><Pencil size={12} /></button>
                        <button onClick={() => setConfirmDelete(c.id)} style={{ background: '#fff5f5', color: '#ef4444', borderRadius: 6, padding: 6, display: 'flex', border: '1px solid #fee2e2' }}><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recursos de estudo (links estáticos, quando existem para esta trilha) */}
      {passos.length > 0 && (
        <div>
          <h3 style={{
            fontSize: 11, fontWeight: 800, color: 'var(--gray-400)',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14,
          }}>
            Recursos de estudo
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {passos.map(({ index, passo, materia }) => (
              <div key={index} style={{
                background: 'white', border: '1.5px solid var(--gray-100)',
                borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px',
                  borderBottom: passo.recursos.length > 0 ? '1px solid var(--gray-100)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: materia ? materia.cor : 'var(--gray-200)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: 'white',
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-800)' }}>
                      {passo.materia_nome}
                    </div>
                    {materia && materia.total_segundos > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--verde-accent)', fontWeight: 600, marginTop: 2 }}>
                        {formatarTempo(materia.total_segundos)} estudados
                      </div>
                    )}
                  </div>
                  {materia && (
                    <button
                      onClick={() => onIniciarCronometro(materia.id)}
                      title="Iniciar cronômetro nesta matéria"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'var(--verde-accent)', color: 'white',
                        borderRadius: 8, padding: '6px 12px',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      <Play size={11} strokeWidth={3} /> Cronômetro
                    </button>
                  )}
                </div>

                {passo.recursos.length > 0 && (
                  <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {passo.recursos.map((r, ri) => (
                      <a
                        key={ri}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                          background: r.tipo === 'pdf' ? '#f0fdf4' : '#eff6ff',
                          border: `1px solid ${r.tipo === 'pdf' ? '#bbf7d0' : '#bfdbfe'}`,
                          color: r.tipo === 'pdf' ? '#15803d' : '#1d4ed8',
                          transition: 'opacity 0.15s',
                        }}
                      >
                        {r.tipo === 'pdf'
                          ? <BookOpen size={14} strokeWidth={2.5} />
                          : <HelpCircle size={14} strokeWidth={2.5} />
                        }
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>{r.concurso}</span>
                        <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
