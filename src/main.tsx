import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './css/globals.css';
import './css/layouts/app.css';
import './css/pages/landing.css';
import './css/pages/guide.css';
import './css/theme/pavti.css';

try {
  const theme = localStorage.getItem('pavti_theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);
} catch {
  /* ignore */
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
