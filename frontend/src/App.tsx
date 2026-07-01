import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import type { Materia, Trilha } from './api';
import Cronometro from './components/Cronometro';
import Materias from './components/Materias';
import TrilhasComp from './components/Trilhas';
import Dashboard from './components/Dashboard';
import Historico from './components/Historico';
import MinhaTrilha from './components/MinhaTrilha';
import Agenda from './components/Agenda';
import Colegas from './components/Colegas';
import Auth from './components/Auth';
import { Timer, BookOpen, BarChart2, Clock, Layers, ChevronDown, Route, CalendarDays, LogOut, Users } from 'lucide-react';

type Aba = 'timer' | 'materias' | 'trilhas' | 'dashboard' | 'historico' | 'minha-trilha' | 'agenda' | 'colegas';

// 'trilhas' não aparece no nav — acessível só pelo dropdown do header
const ABAS = [
  { id: 'timer' as Aba, label: 'Cronômetro', Icon: Timer },
  { id: 'materias' as Aba, label: 'Matérias', Icon: BookOpen },
  { id: 'minha-trilha' as Aba, label: 'Minha Trilha', Icon: Route },
  { id: 'agenda' as Aba, label: 'Agenda', Icon: CalendarDays },
  { id: 'colegas' as Aba, label: 'Colegas', Icon: Users },
  { id: 'dashboard' as Aba, label: 'Dashboard', Icon: BarChart2 },
  { id: 'historico' as Aba, label: 'Histórico', Icon: Clock },
];

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'));
  const [aba, setAba] = useState<Aba>('timer');
  const [trilhaDropdownAberto, setTrilhaDropdownAberto] = useState(false);
  const inicializadoRef = useRef(false);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [trilhaAtiva, setTrilhaAtiva] = useState<Trilha | null>(null);
  const [historicoAtualizar, setHistoricoAtualizar] = useState(0);
  const [materiaPreSelecionada, setMateriaPreSelecionada] = useState<number | null>(null);

  const handleLogin = (newToken: string, user: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', user);
    setToken(newToken);
    setUsername(user);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    // limpa dados do usuário anterior para não vazar entre contas
    setMaterias([]);
    setTrilhas([]);
    setTrilhaAtiva(null);
    inicializadoRef.current = false;
    setAba('timer');
  }, []);

  useEffect(() => {
    window.addEventListener('auth:unauthorized', handleLogout);
    return () => window.removeEventListener('auth:unauthorized', handleLogout);
  }, [handleLogout]);

  const carregarMaterias = useCallback(() => {
    api.materias.list().then(setMaterias).catch(console.error);
  }, []);

  const carregarTrilhas = useCallback(() => {
    Promise.all([api.trilhas.list(), api.config.get('trilhaAtivaId')]).then(([list, cfg]) => {
      setTrilhas(list);
      const idSalvo = cfg.valor ? Number(cfg.valor) : null;
      setTrilhaAtiva(idSalvo ? (list.find(t => t.id === idSalvo) ?? null) : null);
      inicializadoRef.current = true;
    }).catch(console.error);
  }, []);

  // Carrega os dados sempre que houver sessão (e recarrega ao logar). Sem token, não busca.
  useEffect(() => {
    if (!token) return;
    carregarMaterias();
    carregarTrilhas();
  }, [token, carregarMaterias, carregarTrilhas]);

  useEffect(() => {
    if (!inicializadoRef.current) return;
    api.config.set('trilhaAtivaId', trilhaAtiva ? String(trilhaAtiva.id) : null).catch(console.error);
  }, [trilhaAtiva]);

  // Todos os hooks acima rodam sempre; só depois decidimos mostrar login ou app.
  if (!token || !username) {
    return <Auth onLogin={handleLogin} />;
  }

  const aoSalvarSessao = () => {
    carregarMaterias();
    carregarTrilhas();
    setHistoricoAtualizar(n => n + 1);
  };

  // Matérias filtradas pela trilha ativa (para o cronômetro)
  const materiasParaCronometro = trilhaAtiva
    ? materias.filter(m => trilhaAtiva.materias.some(tm => tm.id === m.id))
    : materias;

  const handleIniciarCronometro = (materiaId: number) => {
    setMateriaPreSelecionada(materiaId);
    setAba('timer');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(26,54,31,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--verde-accent)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Timer size={18} color="white" />
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>
            StudyDino
          </span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 8 }}>
            {username}
          </span>
        </div>

        {/* Botão logout + seletor de trilha */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleLogout} title="Sair da conta" style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, padding: '6px 10px', color: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12,
            fontWeight: 600, transition: 'all 0.15s',
          }}>
            <LogOut size={13} /> Sair
          </button>
          {trilhas.length > 0 && (
            <div style={{ position: 'relative' }}>
            <button
              onClick={() => setTrilhaDropdownAberto(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: trilhaAtiva ? `${trilhaAtiva.cor}22` : 'rgba(255,255,255,0.08)',
                border: `1px solid ${trilhaAtiva ? `${trilhaAtiva.cor}55` : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 100,
                padding: '6px 12px 6px 10px',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Layers size={14} color={trilhaAtiva ? trilhaAtiva.cor : 'rgba(255,255,255,0.5)'} />
              <span style={{ color: trilhaAtiva ? 'white' : 'rgba(255,255,255,0.55)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {trilhaAtiva ? trilhaAtiva.nome : 'Trilha'}
              </span>
              <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
            </button>

            {trilhaDropdownAberto && (
              <>
                {/* overlay para fechar ao clicar fora */}
                <div
                  onClick={() => setTrilhaDropdownAberto(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 29 }}
                />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 30,
                  background: 'rgba(20,44,24,0.97)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  minWidth: 200,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '8px 12px 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Selecionar trilha
                  </div>
                  {/* Opção nenhuma */}
                  <button
                    onClick={() => { setTrilhaAtiva(null); setTrilhaDropdownAberto(false); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '9px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: !trilhaAtiva ? 'rgba(255,255,255,0.07)' : 'transparent',
                      color: !trilhaAtiva ? 'white' : 'rgba(255,255,255,0.5)',
                      fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    Nenhuma
                  </button>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
                  {trilhas.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTrilhaAtiva(t); setTrilhaDropdownAberto(false); }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '9px 14px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: trilhaAtiva?.id === t.id ? `${t.cor}22` : 'transparent',
                        color: trilhaAtiva?.id === t.id ? 'white' : 'rgba(255,255,255,0.7)',
                        fontSize: 13, fontWeight: 600,
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.cor, flexShrink: 0 }} />
                      {t.nome}
                    </button>
                  ))}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '6px 0 4px' }} />
                  <button
                    onClick={() => { setAba('trilhas'); setTrilhaDropdownAberto(false); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '9px 14px 11px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      color: 'rgba(0,0,0,0.35)', fontSize: 12, fontWeight: 600,
                    }}
                  >
                    <Layers size={12} />
                    gerenciar trilhas
                  </button>
                </div>
              </>
            )}
          </div>
            )}
        </div>
      </header>

      {/* Content */}
      <main style={{
        flex: 1,
        padding: '28px 16px 16px',
        maxWidth: 700,
        margin: '0 auto',
        width: '100%',
      }}>
        <div className="glass" style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
          {aba === 'timer' && (
            materiasParaCronometro.length === 0 ? (
              <div style={{ padding: '64px 32px', textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'var(--verde-accent)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <BookOpen size={28} color="white" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--gray-800)', marginBottom: 6 }}>
                  {trilhaAtiva ? `Nenhuma matéria na trilha "${trilhaAtiva.nome}"` : 'Nenhuma matéria cadastrada'}
                </p>
                <p style={{ color: 'var(--gray-400)', fontSize: 14, marginBottom: 24 }}>
                  {trilhaAtiva ? 'A trilha ativa não tem matérias cadastradas.' : 'Crie suas matérias antes de iniciar o cronômetro.'}
                </p>
                <button onClick={() => setAba(trilhaAtiva ? 'trilhas' : 'materias')} style={{
                  background: 'var(--verde-accent)', color: 'white',
                  borderRadius: 100, padding: '10px 24px',
                  fontWeight: 600, fontSize: 14,
                }}>
                  {trilhaAtiva ? 'Gerenciar Trilhas' : 'Gerenciar Matérias'}
                </button>
              </div>
            ) : (
              <Cronometro
                materias={materiasParaCronometro}
                onSessaoSalva={aoSalvarSessao}
                materiaPreSelecionada={materiaPreSelecionada}
                onMateriaPreSelecionadaUsada={() => setMateriaPreSelecionada(null)}
              />
            )
          )}
          {aba === 'materias' && <Materias materias={materiasParaCronometro} todasMaterias={materias} trilhaAtiva={trilhaAtiva} trilhas={trilhas} onAtualizar={carregarMaterias} />}
          {aba === 'trilhas' && (
            <TrilhasComp
              trilhas={trilhas}
              materias={materias}
              trilhaAtiva={trilhaAtiva}
              onAtualizar={carregarTrilhas}
              onSelecionarTrilha={setTrilhaAtiva}
              onIniciarCronometro={handleIniciarCronometro}
            />
          )}
          {aba === 'minha-trilha' && (
            <MinhaTrilha
              trilhaAtiva={trilhaAtiva}
              onIniciarCronometro={handleIniciarCronometro}
              onGerenciarTrilhas={() => setAba('trilhas')}
            />
          )}
          {aba === 'agenda' && <Agenda materias={materias} onIniciarCronometro={handleIniciarCronometro} />}
          {aba === 'colegas' && <Colegas />}
          {aba === 'dashboard' && <Dashboard trilhas={trilhas} />}
          {aba === 'historico' && <Historico materias={materias} trilhas={trilhas} atualizar={historicoAtualizar} />}
        </div>
      </main>

      {/* Bottom nav */}
      <nav style={{
        position: 'sticky', bottom: 0,
        background: 'rgba(26,54,31,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
      }}>
        {ABAS.map(({ id, label, Icon }) => {
          const active = aba === id;
          return (
            <button
              key={id}
              onClick={() => setAba(id)}
              style={{
                flex: 1, padding: '12px 4px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'transparent',
                color: active ? 'var(--verde-light)' : 'rgba(255,255,255,0.45)',
                borderTop: `2px solid ${active ? 'var(--verde-light)' : 'transparent'}`,
                transition: 'all 0.18s',
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, letterSpacing: '0.3px' }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
