import { useState } from 'react'
import { Sidebar } from './Sidebar.js'
import { Header } from './Header.js'
import { useUIStore } from '../../store/useUIStore.js'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function AppShell({ children }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { showSidebar } = useUIStore()

  return (
    <div className="app-shell">
      {showSidebar && <Sidebar />}

      <div className="main-area">
        <Header onOpenSettings={() => setSettingsOpen(!settingsOpen)} />
        {children}
      </div>
    </div>
  )
}
