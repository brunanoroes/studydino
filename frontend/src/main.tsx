import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import WakingBanner from './components/WakingBanner.tsx'

createRoot(document.getElementById('root')!).render(
  <>
    <WakingBanner />
    <App />
  </>
)
