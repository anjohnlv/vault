import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

async function bootstrap() {
  let App: React.ComponentType;

  const isCapacitor = typeof window !== 'undefined' && 'Capacitor' in window;
  const urlParams = new URLSearchParams(window.location.search);
  const forceMobile = urlParams.has('mobile');

  if (isCapacitor || forceMobile) {
    const mod = await import('./mobile/App');
    App = mod.default;
  } else {
    const mod = await import('./web/App');
    App = mod.default;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
