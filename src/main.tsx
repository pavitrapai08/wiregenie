import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.js'

// Listen for storage events and show user-friendly messages
window.addEventListener('session-cap-warning', () => {
  console.warn('[WireGenie] Session cap reached (100). Delete old sessions to create new ones.')
})

window.addEventListener('storage-quota-warning', () => {
  console.warn('[WireGenie] localStorage quota exceeded. Consider exporting and deleting old sessions.')
})

window.addEventListener('version-stack-pruned', () => {
  console.info('[WireGenie] Undo history trimmed to 20 versions.')
})

const root = document.getElementById('root')
if (!root) throw new Error('No #root element found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
