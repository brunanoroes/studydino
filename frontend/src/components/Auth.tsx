import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';

interface Props {
  onLogin: (token: string, username: string) => void;
}

export default function Auth({ onLogin }: Props) {
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const validarSenha = (s: string): string => {
    if (s.length < 6) return 'Mínimo 6 caracteres';
    if (!/[a-zA-Z]/.test(s)) return 'Deve conter letra';
    if (!/\d/.test(s)) return 'Deve conter número';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!username.trim() || !senha.trim()) {
      setErro('Preencha todos os campos');
      return;
    }

    if (modo === 'registro') {
      const erroSenha = validarSenha(senha);
      if (erroSenha) {
        setErro(erroSenha);
        return;
      }
    }

    setCarregando(true);
    try {
      const endpoint = modo === 'login' ? '/api/auth/login' : '/api/auth/registro';
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, senha }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onLogin(data.token, data.username);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--verde-deep)', backgroundImage: 'url("/bg.svg")', backgroundSize: 'cover', padding: 16 }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.2)',
        padding: 40,
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60,
            background: 'var(--verde-accent)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Lock size={30} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gray-800)', letterSpacing: '-0.5px' }}>StudyDino</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>Seu gestor de estudos inteligente</p>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => { setModo('login'); setErro(''); }}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              background: modo === 'login' ? 'var(--verde-accent)' : 'var(--gray-100)',
              color: modo === 'login' ? 'white' : 'var(--gray-600)',
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
            }}
          >
            Entrar
          </button>
          <button
            onClick={() => { setModo('registro'); setErro(''); }}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              background: modo === 'registro' ? 'var(--verde-accent)' : 'var(--gray-100)',
              color: modo === 'registro' ? 'white' : 'var(--gray-600)',
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
            }}
          >
            Criar conta
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="seu_usuario"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: `1.5px solid ${erro ? '#ef4444' : 'var(--gray-200)'}`,
                fontSize: 14, fontWeight: 500, background: 'white',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--verde-accent)'}
              onBlur={e => e.target.style.borderColor = erro ? '#ef4444' : 'var(--gray-200)'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: `1.5px solid ${erro ? '#ef4444' : 'var(--gray-200)'}`,
                fontSize: 14, fontWeight: 500, background: 'white',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--verde-accent)'}
              onBlur={e => e.target.style.borderColor = erro ? '#ef4444' : 'var(--gray-200)'}
            />
            {modo === 'registro' && (
              <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 5 }}>
                Mín. 6 caracteres, 1 letra e 1 número
              </p>
            )}
          </div>

          {erro && (
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', fontSize: 13, fontWeight: 500,
            }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'var(--verde-accent)', color: 'white',
              fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              opacity: carregando ? 0.7 : 1,
              boxShadow: '0 2px 12px rgba(90,158,58,0.3)',
            }}
          >
            {carregando ? 'Processando...' : (modo === 'login' ? 'Entrar' : 'Criar conta')}
          </button>
        </form>
      </div>
    </div>
  );
}
