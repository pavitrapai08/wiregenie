import { create } from 'zustand'
import type { Theme, WidgetType, BrandPreset } from '../types/index.js'

interface UIState {
  theme: Theme
  hiddenWidgetTypes: Set<WidgetType>
  brandPreset: BrandPreset
  showSettings: boolean
  showSidebar: boolean
  inputMode: 'text' | 'image' | 'voice'

  setTheme: (theme: Theme) => void
  toggleWidgetType: (type: WidgetType) => void
  setBrandPreset: (preset: Partial<BrandPreset>) => void
  setShowSettings: (show: boolean) => void
  setShowSidebar: (show: boolean) => void
  setInputMode: (mode: UIState['inputMode']) => void
}

const DEFAULT_BRAND: BrandPreset = {
  primaryColor: '#6366f1',
  fontFamily: 'Inter, system-ui, sans-serif',
  cornerRadius: 8,
}

export const useUIStore = create<UIState>()((set) => ({
  theme: 'wireframe',
  hiddenWidgetTypes: new Set(),
  brandPreset: DEFAULT_BRAND,
  showSettings: false,
  showSidebar: true,
  inputMode: 'text',

  setTheme: (theme) => set({ theme }),

  toggleWidgetType: (type) =>
    set((s) => {
      const next = new Set(s.hiddenWidgetTypes)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return { hiddenWidgetTypes: next }
    }),

  setBrandPreset: (preset) =>
    set((s) => ({ brandPreset: { ...s.brandPreset, ...preset } })),

  setShowSettings: (show) => set({ showSettings: show }),
  setShowSidebar: (show) => set({ showSidebar: show }),
  setInputMode: (inputMode) => set({ inputMode }),
}))
