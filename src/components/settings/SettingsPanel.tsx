import { useUIStore } from '../../store/useUIStore.js'
import { WIDGET_TYPES } from '../../../lib/widgetTypes.js'
import type { Theme } from '../../types/index.js'

interface Props {
  onClose: () => void
}

const THEMES: { id: Theme; label: string }[] = [
  { id: 'wireframe', label: '⬜ Wireframe' },
  { id: 'dark', label: '🌑 Dark' },
  { id: 'blueprint', label: '🗺 Blueprint' },
]

export function SettingsPanel({ onClose }: Props) {
  const { theme, setTheme, hiddenWidgetTypes, toggleWidgetType, brandPreset, setBrandPreset } =
    useUIStore()

  return (
    <div className="settings-panel" role="dialog" aria-label="Settings" aria-modal="true">
      <div className="settings-panel__header">
        <span className="settings-panel__title">Settings</span>
        <button className="btn btn--icon" onClick={onClose} aria-label="Close settings">✕</button>
      </div>

      <div className="settings-panel__body">
        {/* Theme */}
        <section>
          <div className="settings-section__label">Theme</div>
          <div className="settings-section__options">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-btn${theme === t.id ? ' theme-btn--active' : ''}`}
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Brand preset */}
        <section>
          <div className="settings-section__label">Brand</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Primary color
              <input
                type="color"
                value={brandPreset.primaryColor}
                onChange={(e) => setBrandPreset({ primaryColor: e.target.value })}
                style={{ width: 40, height: 28, border: '1px solid var(--color-border)', borderRadius: 4, cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Corner radius: {brandPreset.cornerRadius}px
              <input
                type="range"
                min={0}
                max={24}
                value={brandPreset.cornerRadius}
                onChange={(e) => setBrandPreset({ cornerRadius: Number(e.target.value) })}
                style={{ accentColor: 'var(--color-accent)' }}
              />
            </label>
          </div>
        </section>

        {/* Widget toggles */}
        <section>
          <div className="settings-section__label">Widget visibility</div>
          {WIDGET_TYPES.map((type) => {
            const hidden = hiddenWidgetTypes.has(type)
            return (
              <label
                key={type}
                className={`widget-toggle${hidden ? ' widget-toggle--hidden' : ''}`}
                title={hidden ? 'Click to show' : 'Click to hide'}
              >
                <input
                  type="checkbox"
                  checked={!hidden}
                  onChange={() => toggleWidgetType(type)}
                />
                {type.replace(/_/g, ' ')}
              </label>
            )
          })}
        </section>
      </div>
    </div>
  )
}
