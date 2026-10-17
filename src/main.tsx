// Phone (PWA) build: data stays in this browser; works offline once opened.
import { createRoot } from 'react-dom/client';
import App from './App';
import { localStore } from './localStore';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App store={localStore()} />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('sw.js');
}
// Ask the browser not to clear our data when the phone is low on space.
navigator.storage?.persist?.();
