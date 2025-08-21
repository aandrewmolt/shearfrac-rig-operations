import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/responsive.css'

// Build version indicator - moved to App component to avoid module-level execution

createRoot(document.getElementById("root")!).render(<App />);
