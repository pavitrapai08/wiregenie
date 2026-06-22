import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AppShell } from './components/shell/AppShell.js'
import { GeneratePage } from './pages/GeneratePage.js'
import { useUIStore } from './store/useUIStore.js'

function ThemeRoot() {
  const { theme, brandPreset } = useUIStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const el = document.documentElement
    el.style.setProperty('--color-accent', brandPreset.primaryColor)
    el.style.setProperty('--widget-radius', `${brandPreset.cornerRadius}px`)
    el.style.setProperty('--font-sans', brandPreset.fontFamily)
  }, [brandPreset])

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<GeneratePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeRoot />
    </BrowserRouter>
  )
}
