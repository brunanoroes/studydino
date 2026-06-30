import { useState, useEffect, useRef } from 'react';
import { Play, Pause, StopCircle, ChevronDown, Coffee, SkipForward } from 'lucide-react';
import { api, formatarTempoCompleto } from '../api';
import type { Materia } from '../api';

interface Props {
  materias: Materia[];
  onSessaoSalva: () => void;
  materiaPreSelecionada?: number | null;
  onMateriaPreSelecionadaUsada?: () => void;
}

type Modo = 'livre' | 'pomodoro';
type Fase = 'foco' | 'pausaCurta' | 'pausaLonga';

const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, '0');

export default function Cronometro({ materias, onSessaoSalva, materiaPreSelecionada, onMateriaPreSelecionadaUsada }: Props) {
  const [materiaId, setMateriaId] = useState<number | null>(null);
  const [rodando, setRodando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [anotacao, setAnotacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const iniciadoEmRef = useRef<string>('');

  // ── Pomodoro ─────────────────────────────────────────────
  const [modo, setModo] = useState<Modo>('livre');
  const [focoMin, setFocoMin] = useState(25);
  const [pausaCurtaMin, setPausaCurtaMin] = useState(5);
  const [pausaLongaMin, setPausaLongaMin] = useState(15);
  const [ciclosAtePausaLonga, setCiclosAtePausaLonga] = useState(4);
  const [fase, setFase] = useState<Fase>('foco');
  const [cicloAtual, setCicloAtual] = useState(0);
  const [transicao, setTransicao] = useState<string | null>(null);

  const duracaoFase = fase === 'foco' ? focoMin * 60 : fase === 'pausaCurta' ? pausaCurtaMin * 60 : pausaLongaMin * 60;

  // Pré-seleção de matéria vinda da página de detalhe de trilha
  useEffect(() => {
    if (materiaPreSelecionada && materias.some(m => m.id === materiaPreSelecionada)) {
      setMateriaId(materiaPreSelecionada);
      onMateriaPreSelecionadaUsada?.();
    }
  }, [materiaPreSelecionada]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // timestamp-based: evita drift ou duplicidade de intervals
  const tickBaseRef = useRef<{ startedAt: number; baseSegundos: number }>({ startedAt: 0, baseSegundos: 0 });

  useEffect(() => {
    if (rodando) {
      tickBaseRef.current = { startedAt: Date.now(), baseSegundos: segundos };
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - tickBaseRef.current.startedAt) / 1000);
        setSegundos(tickBaseRef.current.baseSegundos + elapsed);
      }, 500);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [rodando]);

  // Transição automática de fase no modo pomodoro
  useEffect(() => {
    if (modo !== 'pomodoro' || !rodando) return;
    if (segundos >= duracaoFase) avancarFase(duracaoFase);
  }, [segundos, modo, rodando, duracaoFase]);

  const iniciar = () => {
    if (!materiaId) return;
    if (segundos === 0) iniciadoEmRef.current = new Date().toISOString();
    setRodando(true);
  };

  const pausar = () => setRodando(false);

  const resetar = () => { setSegundos(0); setAnotacao(''); setRodando(false); };

  const parar = async () => {
    if (segundos < 1) { resetar(); return; }
    setRodando(false);
    setSalvando(true);
    try {
      await api.sessoes.create({
        materia_id: materiaId!,
        duracao_segundos: segundos,
        iniciada_em: iniciadoEmRef.current,
        finalizada_em: new Date().toISOString(),
        anotacao: anotacao.trim() || undefined,
      });
      setSucesso(true);
      onSessaoSalva();
      setTimeout(() => { setSucesso(false); resetar(); }, 1400);
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  };

  // Finaliza a fase de foco do pomodoro antes do tempo acabar (registra parcial e avança o ciclo)
  const finalizarFocoAntecipado = async () => {
    if (segundos < 1) { resetar(); return; }
    setRodando(false);
    setSalvando(true);
    try {
      await api.sessoes.create({
        materia_id: materiaId!,
        duracao_segundos: segundos,
        iniciada_em: iniciadoEmRef.current,
        finalizada_em: new Date().toISOString(),
        anotacao: anotacao.trim() || undefined,
      });
      onSessaoSalva();
      avancarFase(segundos);
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  };

  // Avança para a próxima fase do pomodoro. Se veio de um foco, salva a sessão de estudo.
  const avancarFase = async (segundosFoco?: number) => {
    setRodando(false);
    if (fase === 'foco') {
      if (segundosFoco === duracaoFase) {
        // chegou ao fim naturalmente — salva sessão completa
        try {
          await api.sessoes.create({
            materia_id: materiaId!,
            duracao_segundos: segundosFoco,
            iniciada_em: iniciadoEmRef.current,
            finalizada_em: new Date().toISOString(),
            anotacao: anotacao.trim() || undefined,
          });
          onSessaoSalva();
        } catch (e) { console.error(e); }
      }
      const novoCiclo = cicloAtual + 1;
      setCicloAtual(novoCiclo);
      const ehLonga = novoCiclo % ciclosAtePausaLonga === 0;
      setFase(ehLonga ? 'pausaLonga' : 'pausaCurta');
      setTransicao(ehLonga ? '🎉 Foco concluído! Hora da pausa longa.' : '✅ Foco concluído! Hora de uma pausa curta.');
    } else {
      if (fase === 'pausaLonga') setCicloAtual(0);
      setFase('foco');
      setTransicao('🎯 Pausa concluída! Hora de focar.');
    }
    setSegundos(0);
    setAnotacao('');
    setTimeout(() => setTransicao(null), 4000);
  };

  // Pula a pausa atual sem registrar nada
  const pularPausa = () => {
    setFase('foco');
    setSegundos(0);
    setRodando(false);
    setTransicao(null);
  };

  const trocarModo = (m: Modo) => {
    if (rodando || segundos > 0) return;
    setModo(m);
    setFase('foco');
    setCicloAtual(0);
    setSegundos(0);
  };

  const materiaSelecionada = materias.find(m => m.id === materiaId);

  const displaySegundos = modo === 'pomodoro' ? Math.max(0, duracaoFase - segundos) : segundos;
  const mostrarHoras = modo === 'livre';
  const [hh, mm, ss] = mostrarHoras
    ? formatarTempoCompleto(displaySegundos).split(':')
    : ['', pad2(Math.floor(displaySegundos / 60)), pad2(displaySegundos % 60)];

  const idleNaFase = segundos === 0 && !rodando;
  const pausadoComProgresso = segundos > 0 && !rodando;

  const faseInfo = {
    foco: { label: 'Foco', emoji: '🎯', cor: 'var(--verde-accent)' },
    pausaCurta: { label: 'Pausa curta', emoji: '☕', cor: '#3b82f6' },
    pausaLonga: { label: 'Pausa longa', emoji: '🌴', cor: '#8b5cf6' },
  }[fase];

  return (
    <div style={{ padding: '40px 32px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

      {/* Toggle modo */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--gray-100)', borderRadius: 10, padding: 3 }}>
        {([{ v: 'livre' as Modo, label: 'Cronômetro livre' }, { v: 'pomodoro' as Modo, label: '🍅 Pomodoro' }]).map(opt => (
          <button
            key={opt.v}
            onClick={() => trocarModo(opt.v)}
            disabled={rodando || segundos > 0}
            style={{
              borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 700,
              background: modo === opt.v ? 'white' : 'transparent',
              color: modo === opt.v ? 'var(--gray-800)' : 'var(--gray-400)',
              boxShadow: modo === opt.v ? 'var(--shadow-sm)' : 'none',
              cursor: (rodando || segundos > 0) ? 'not-allowed' : 'pointer',
              opacity: (rodando || segundos > 0) && modo !== opt.v ? 0.5 : 1,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Configurações do pomodoro (só quando ocioso) */}
      {modo === 'pomodoro' && idleNaFase && fase === 'foco' && cicloAtual === 0 && (
        <div style={{ width: '100%', maxWidth: 420, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <CampoMinutos label="Foco (min)" valor={focoMin} onChange={setFocoMin} />
          <CampoMinutos label="Pausa curta (min)" valor={pausaCurtaMin} onChange={setPausaCurtaMin} />
          <CampoMinutos label="Pausa longa (min)" valor={pausaLongaMin} onChange={setPausaLongaMin} />
          <CampoMinutos label="Ciclos até pausa longa" valor={ciclosAtePausaLonga} onChange={setCiclosAtePausaLonga} min={1} max={8} />
        </div>
      )}

      {/* Badge de fase + ciclos (pomodoro) */}
      {modo === 'pomodoro' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: faseInfo.cor + '15', border: `1.5px solid ${faseInfo.cor}40`,
            borderRadius: 100, padding: '6px 18px', fontSize: 14, fontWeight: 700, color: faseInfo.cor,
          }}>
            <span>{faseInfo.emoji}</span>
            {faseInfo.label}
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: ciclosAtePausaLonga }, (_, i) => {
              const preenchido = fase === 'foco'
                ? i < cicloAtual % ciclosAtePausaLonga || (cicloAtual > 0 && cicloAtual % ciclosAtePausaLonga === 0 && fase !== 'foco')
                : i < (cicloAtual === 0 ? ciclosAtePausaLonga : cicloAtual % ciclosAtePausaLonga || ciclosAtePausaLonga);
              return (
                <span key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: preenchido ? 'var(--verde-accent)' : 'var(--gray-200)',
                }} />
              );
            })}
          </div>
        </div>
      )}

      {/* Transição de fase */}
      {transicao && (
        <div style={{
          background: 'rgba(90,158,58,0.1)', border: '1.5px solid rgba(90,158,58,0.3)',
          borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--verde-deep)',
        }}>
          {transicao}
        </div>
      )}

      {/* Seletor de matéria */}
      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        <select
          value={materiaId ?? ''}
          onChange={e => setMateriaId(Number(e.target.value) || null)}
          disabled={rodando}
          style={{
            width: '100%',
            padding: materiaSelecionada ? '12px 44px 12px 36px' : '12px 44px 12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: `1.5px solid ${materiaSelecionada ? materiaSelecionada.cor : 'var(--gray-200)'}`,
            background: 'white',
            fontSize: 15,
            fontWeight: 600,
            color: materiaSelecionada ? 'var(--gray-800)' : 'var(--gray-400)',
            cursor: rodando ? 'not-allowed' : 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            transition: 'border-color 0.2s',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <option value="">Selecione uma matéria</option>
          {materias.map(m => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
        <ChevronDown
          size={16}
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }}
        />
        {materiaSelecionada && (
          <span style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            width: 9, height: 9, borderRadius: '50%',
            background: materiaSelecionada.cor,
            boxShadow: `0 0 0 3px ${materiaSelecionada.cor}22`,
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Flip-clock display */}
      <div style={{
        background: '#111',
        borderRadius: 24,
        padding: '40px 48px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
      }}>
        {/* Running indicator */}
        {rodando && (
          <span style={{
            position: 'absolute', top: 14, right: 16,
            width: 9, height: 9, borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 10px #4ade80',
            animation: 'blink 1s ease infinite',
          }} />
        )}

        {(mostrarHoras
          ? [{ val: hh, label: 'H' }, { val: mm, label: 'M' }, { val: ss, label: 'S' }]
          : [{ val: mm, label: 'M' }, { val: ss, label: 'S' }]
        ).map(({ val, label }, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {/* Flip card */}
              <div style={{
                background: '#1e1e1e',
                borderRadius: 14,
                padding: '14px 0',
                minWidth: 108,
                textAlign: 'center',
                fontWeight: 800,
                fontSize: 72,
                color: '#f5f5f5',
                fontFamily: '"Courier New", monospace',
                letterSpacing: 2,
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 2px 0 rgba(255,255,255,0.04)',
                position: 'relative',
                lineHeight: 1,
                userSelect: 'none',
              }}>
                {/* Mid divider line */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, top: '50%',
                  height: 1, background: '#000', opacity: 0.4, zIndex: 1,
                }} />
                {val}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>{label}</span>
            </div>
            {i < arr.length - 1 && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 54, fontWeight: 700, marginBottom: 20, lineHeight: 1 }}>:</span>
            )}
          </div>
        ))}
      </div>

      {/* Matéria badge ativa */}
      {materiaSelecionada && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: materiaSelecionada.cor + '15',
          border: `1.5px solid ${materiaSelecionada.cor}40`,
          borderRadius: 100,
          padding: '6px 18px',
          fontSize: 13, fontWeight: 600,
          color: 'var(--gray-700)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: materiaSelecionada.cor, display: 'inline-block' }} />
          {materiaSelecionada.nome}
        </div>
      )}

      {/* Controles */}
      <div style={{ display: 'flex', gap: 12 }}>
        {!rodando ? (
          <button
            onClick={iniciar}
            disabled={!materiaId || salvando}
            style={{
              background: materiaId ? (modo === 'pomodoro' ? faseInfo.cor : 'var(--verde-accent)') : 'var(--gray-200)',
              color: materiaId ? 'white' : 'var(--gray-400)',
              borderRadius: 100,
              padding: '13px 40px',
              fontSize: 15,
              fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 10,
              letterSpacing: '0.2px',
              boxShadow: materiaId ? '0 4px 20px rgba(90,158,58,0.35)' : 'none',
            }}
          >
            {modo === 'pomodoro' && fase !== 'foco' ? <Coffee size={18} /> : <Play size={18} fill={materiaId ? 'white' : 'var(--gray-400)'} />}
            {segundos > 0 ? 'Continuar' : modo === 'pomodoro' ? `Iniciar ${faseInfo.label.toLowerCase()}` : 'Iniciar'}
          </button>
        ) : (
          <button
            onClick={pausar}
            style={{
              background: '#f59e0b',
              color: 'white',
              borderRadius: 100,
              padding: '13px 36px',
              fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
            }}
          >
            <Pause size={18} />
            Pausar
          </button>
        )}

        {/* Cronômetro livre: finalizar */}
        {modo === 'livre' && pausadoComProgresso && (
          <button
            onClick={parar}
            disabled={salvando}
            style={{
              background: sucesso ? '#22c55e' : '#ef4444',
              color: 'white',
              borderRadius: 100,
              padding: '13px 30px',
              fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 4px 20px ${sucesso ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
              transition: 'background 0.3s',
            }}
          >
            <StopCircle size={18} />
            {sucesso ? 'Salvo!' : salvando ? 'Salvando...' : 'Finalizar'}
          </button>
        )}

        {/* Pomodoro foco: finalizar fase antecipadamente */}
        {modo === 'pomodoro' && fase === 'foco' && pausadoComProgresso && (
          <button
            onClick={finalizarFocoAntecipado}
            disabled={salvando}
            style={{
              background: '#ef4444', color: 'white', borderRadius: 100,
              padding: '13px 30px', fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
            }}
          >
            <StopCircle size={18} />
            {salvando ? 'Salvando...' : 'Finalizar foco'}
          </button>
        )}

        {/* Pomodoro pausa: pular */}
        {modo === 'pomodoro' && fase !== 'foco' && (rodando || pausadoComProgresso) && (
          <button
            onClick={pularPausa}
            style={{
              background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 100,
              padding: '13px 26px', fontSize: 15, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <SkipForward size={18} />
            Pular pausa
          </button>
        )}
      </div>

      {/* Anotação */}
      {((modo === 'livre' && pausadoComProgresso) || (modo === 'pomodoro' && fase === 'foco' && pausadoComProgresso)) && (
        <div style={{ width: '100%', maxWidth: 420 }}>
          <textarea
            placeholder="Adicionar anotação sobre esta sessão (opcional)"
            value={anotacao}
            onChange={e => setAnotacao(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--gray-200)',
              background: 'var(--gray-50)',
              fontSize: 14, resize: 'vertical',
              color: 'var(--gray-700)',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--verde-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
          />
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>
    </div>
  );
}

function CampoMinutos({ label, valor, onChange, min = 1, max = 90 }: { label: string; valor: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={valor}
        onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 7,
          border: '1.5px solid var(--gray-200)', fontSize: 14, fontWeight: 700,
          color: 'var(--gray-700)', textAlign: 'center',
        }}
      />
    </div>
  );
}