import react from 'react';
import { createRoot } from 'react-dom/client';
import ClerkApp from './App';
import './index.css';

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<ClerkApp />);
