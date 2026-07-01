import { useEffect, useState } from 'react';

// Mostra um aviso quando o backend do Render está "acordando" (cold start).
// Ouve os eventos disparados pela camada de API (api.ts).
export default function WakingBanner() {
  const [acordando, setAcordando] = useState(false);

  useEffect(() => {
    const onWaking = () => setAcordando(true);
    const onReady = () => setAcordando(false);
    window.addEventListener('api:waking', onWaking);
    window.addEventListener('api:ready', onReady);
    return () => {
      window.removeEventListener('api:waking', onWaking);
      window.removeEventListener('api:ready', onReady);
    };
  }, []);

  if (!acordando) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#2d6a4f',
        color: 'white',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          border: '2px solid rgba(255,255,255,0.4)',
          borderTopColor: 'white',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'wakingspin 0.7s linear infinite',
        }}
      />
      Acordando o servidor… isso pode levar até 1 minuto na primeira vez.
      <style>{`@keyframes wakingspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
