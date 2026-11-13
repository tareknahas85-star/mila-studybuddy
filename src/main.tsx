import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/tajawal/arabic-500.css'
import '@fontsource/tajawal/arabic-700.css'
import '@fontsource/tajawal/arabic-800.css'
import '@fontsource/reem-kufi-fun/arabic-700.css'
import App from './App.tsx'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('root element missing')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
