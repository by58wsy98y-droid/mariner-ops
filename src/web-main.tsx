// Web build (claude.ai page): data is saved to the user's Claude account.
import { createRoot } from 'react-dom/client';
import App from './App';
import { cloudStore } from './cloudStore';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App store={cloudStore()} />);
