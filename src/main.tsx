import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import i18n from './i18n';

// keep document lang/dir in sync
const applyDir = () => {
  document.documentElement.lang = i18n.language;
  // Basic RTL detection (en, ta, hi are LTR)
  document.documentElement.dir = 'ltr';
};
applyDir();
i18n.on('languageChanged', applyDir);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
