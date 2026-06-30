import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { api, formatarTempo } from '../api';
import type { Dashboard as DashboardData, Trilha, Comparativo } from '../api';
import { TrendingUp, Clock, BookOpen, Calendar, Zap, BarChart2, Layers, Target } from 'lucide-react';

const PERIODOS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: '7 dias' },
  { value: 'mes', label: '30 dias' },
  { value: 'total', label: 'Total' },
];

interface Props { trilhas: Trilha[] }

export default function Dashboard({ trilhas }: Props) {
  const [periodo, setPeriodo] = useState('semana');
  const [trilhaId, setTrilhaId] = useState<number | undefined>(undefined);
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [comparativo, setComparativo] = useState<Comparativo | null>(null);

  useEffect(() => {
    setCarregando(true);
    api.dashboard(periodo, trilhaId).then(setDados).finally(() => setCarregando(false));
  }, [periodo, trilhaId]);

  useEffect(() => {
    api.comparativo().then(setComparativo).catch(console.error);
  }, []);

  if (carregando || !dados) return (
    <div style={{ padding: '80px 32px', textAlign: 'center', color: 'var(--gray-400)' }}>
      <BarChart2Icon />
      <p style={{ marginTop: 12, fontWeight: 600 }}>Carregando...</p>
    </div>
  );

  const { resumo, porMateria, porDia } = dados;
  const comHoras = porMateria.filter(m => m.total_segundos > 0);

  const dadosBarra = porDia.map(d => ({
    dia: d.dia.slice(5),
    horas: parseFloat((d.total_segundos / 3600).toFixed(2)),
  }));

  return (
    <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header + período */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={20} color="var(--verde-accent)" />
            Dashboard
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>Visão geral dos seus estudos</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtro por trilha */}
          {trilhas.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={13} color="var(--gray-400)" />
              <select
                value={trilhaId ?? ''}
                onChange={e => setTrilhaId(Number(e.target.value) || undefined)}
                style={{
                  padding: '5px 10px', borderRadius: 7,
                  border: `1.5px solid ${trilhaId ? 'var(--verde-accent)' : 'var(--gray-200)'}`,
                  background: 'white', fontWeight: 600, fontSize: 12,
                  color: trilhaId ? 'var(--gray-800)' : 'var(--gray-400)',
                }}
              >
                <option value="">Todas as trilhas</option>
                {trilhas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          )}
          {/* Filtro por período */}
          <div style={{
            display: 'flex', gap: 2,
            background: 'var(--gray-100)',
            borderRadius: 8, padding: 3,
          }}>
            {PERIODOS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                style={{
                  borderRadius: 6, padding: '5px 14px',
                  background: periodo === p.value ? 'white' : 'transparent',
                  color: periodo === p.value ? 'var(--gray-800)' : 'var(--gray-400)',
                  fontWeight: periodo === p.value ? 700 : 500, fontSize: 13,
                  boxShadow: periodo === p.value ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s',
                }}
              >{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <CardResumo icon={<Clock size={18} />} label="Tempo total" valor={formatarTempo(resumo?.total_segundos || 0)} cor="var(--verde-accent)" />
        <CardResumo icon={<Zap size={18} />} label="Sessões" valor={String(resumo?.total_sessoes || 0)} cor="#f59e0b" />
        <CardResumo icon={<BookOpen size={18} />} label="Matérias" valor={String(resumo?.materias_estudadas || 0)} cor="#6366f1" />
        <CardResumo icon={<Calendar size={18} />} label="Dias" valor={String(resumo?.dias_estudados || 0)} cor="#ef4444" />
      </div>

      {/* Planejado vs Realizado */}
      {comparativo && comparativo.comparativo.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Target size={14} color="var(--verde-accent)" />
              Planejado vs Realizado · últimos 7 dias
            </h3>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-400)' }}>
              {formatarTempo(comparativo.totalRealizado)} / {formatarTempo(comparativo.totalPlanejado)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comparativo.comparativo.map(c => {
              const pctRealizado = c.planejado_segundos > 0
                ? Math.min(100, Math.round((c.realizado_segundos / c.planejado_segundos) * 100))
                : (c.realizado_segundos > 0 ? 100 : 0);
              const acimaDoPlano = c.planejado_segundos > 0 && c.realizado_segundos > c.planejado_segundos;
              return (
                <div key={c.materia_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--gray-700)' }}>
                    <span>{c.nome}</span>
                    <span style={{ color: acimaDoPlano ? 'var(--verde-accent)' : 'var(--gray-400)' }}>
                      {formatarTempo(c.realizado_segundos)}
                      {c.planejado_segundos > 0 && (
                        <span style={{ color: 'var(--gray-300)' }}> / {formatarTempo(c.planejado_segundos)}</span>
                      )}
                    </span>
                  </div>
                  <div style={{ height: 7, background: 'var(--gray-100)', borderRadius: 100, position: 'relative', overflow: 'hidden' }}>
                    {c.planejado_segundos === 0 && c.realizado_segundos > 0 && (
                      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, var(--gray-100), var(--gray-100) 4px, var(--gray-50) 4px, var(--gray-50) 8px)' }} />
                    )}
                    <div style={{
                      height: '100%', width: `${pctRealizado}%`,
                      background: acimaDoPlano ? 'var(--verde-accent)' : c.cor,
                      borderRadius: 100, transition: 'width 0.6s ease',
                      position: 'relative',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráfico barras */}
      {dadosBarra.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Horas por dia
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dadosBarra} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [`${v}h`, 'Horas']}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: 'var(--shadow)', fontSize: 13 }}
                cursor={{ fill: 'rgba(90,158,58,0.07)' }}
              />
              <Bar dataKey="horas" fill="var(--verde-accent)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pizza + Ranking */}
      {comHoras.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Por matéria
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={comHoras} dataKey="total_segundos" nameKey="nome"
                  cx="50%" cy="50%" outerRadius={75} innerRadius={40} stroke="none">
                  {comHoras.map(m => <Cell key={m.id} fill={m.cor} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatarTempo(v as number), 'Tempo']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: 'var(--shadow)', fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ranking
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {comHoras.slice(0, 5).map((m, i) => {
                const pct = Math.round((m.total_segundos / comHoras[0].total_segundos) * 100);
                return (
                  <div key={m.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--gray-700)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--gray-400)', fontWeight: 700, fontSize: 11 }}>#{i + 1}</span>
                        {m.nome}
                      </span>
                      <span style={{ color: 'var(--gray-400)' }}>{formatarTempo(m.total_segundos)}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--gray-100)', borderRadius: 100 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: m.cor, borderRadius: 100, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {comHoras.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
          <TrendingUp size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15 }}>Sem dados para o período</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Use o cronômetro para registrar suas sessões.</p>
        </div>
      )}
    </div>
  );
}

function BarChart2Icon() {
  return <BarChart2 size={40} style={{ opacity: 0.2, margin: '0 auto', display: 'block' }} />;
}

function CardResumo({ icon, label, valor, cor }: { icon: React.ReactNode; label: string; valor: string; cor: string }) {
  return (
    <div style={{
      background: 'var(--gray-50)',
      border: '1.5px solid var(--gray-100)',
      borderRadius: 'var(--radius-sm)',
      padding: '16px',
    }}>
      <div style={{ color: cor, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gray-800)', letterSpacing: '-0.5px' }}>{valor}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}
