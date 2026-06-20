import react from 'react';
import { createRoot } from 'react-dom/client';
import BarristerApp from './App';
import './index.css';

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<BarristerApp />);
