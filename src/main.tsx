import { createRoot } from 'react-dom/client';
import '@fontsource/saira/latin-400.css';
import '@fontsource/saira/latin-500.css';
import '@fontsource/saira/latin-600.css';
import '@fontsource/saira-condensed/latin-500.css';
import '@fontsource/saira-condensed/latin-700.css';
import '@fontsource/saira-condensed/latin-800.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
