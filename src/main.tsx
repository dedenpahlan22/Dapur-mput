import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    __deferredPWAPrompt?: Event | null;
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredPWAPrompt = e;
  window.dispatchEvent(new Event('mputpos-pwa-prompt-ready'));
});

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
