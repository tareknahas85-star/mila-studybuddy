import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initSecrets } from './lib/store.ts'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('root element missing')

// نفك تشفير مفتاح جيميني قبل الرسم، عشان الشاشات تشوف المفتاح من أول لحظة.
void initSecrets().finally(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
