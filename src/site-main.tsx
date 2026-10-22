// Own-site version (GitHub Pages): the log is kept on this device and the app opens with no signal.
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import App from './App';
import { localStore } from './localStore';
import './styles.css';

applyPlugin(jsPDF);
(window as any).jspdf = { jsPDF }; // where the PDF maker looks for it

createRoot(document.getElementById('root')!).render(<App store={localStore()} />);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
// Ask the browser not to clear the log when the phone is low on space.
navigator.storage?.persist?.();
