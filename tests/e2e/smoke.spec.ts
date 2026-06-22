import { test, expect } from '@playwright/test'

// Smoke test: generate → refine → save → restore from history
// Requires a running dev server at http://localhost:5173
// and VITE_MOCK_API=true or a valid ANTHROPIC_API_KEY in the environment.

test.describe('WireGenie smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('app loads with empty state', async ({ page }) => {
    await expect(page.locator('.header__logo')).toContainText('WireGenie')
    await expect(page.locator('.sidebar')).toBeVisible()
    // Canvas shows the empty state prompt
    await expect(page.locator('.canvas-area')).toBeVisible()
  })

  test('sidebar tabs switch between Sessions, Library, History', async ({ page }) => {
    const libraryTab = page.locator('.sidebar-tab', { hasText: 'Library' })
    const historyTab = page.locator('.sidebar-tab', { hasText: 'History' })

    await libraryTab.click()
    await expect(page.locator('.library-grid')).toBeVisible()

    await historyTab.click()
    await expect(page.locator('.history-panel')).toBeVisible()

    const sessionsTab = page.locator('.sidebar-tab', { hasText: 'Sessions' })
    await sessionsTab.click()
    await expect(page.locator('.sidebar__sessions')).toBeVisible()
  })

  test('history search filters sessions by name', async ({ page }) => {
    const historyTab = page.locator('.sidebar-tab', { hasText: 'History' })
    await historyTab.click()

    const searchInput = page.locator('.history-search')
    await searchInput.fill('zzznonexistent')
    await expect(page.locator('.history-panel__empty')).toBeVisible()

    await searchInput.clear()
    await expect(page.locator('.history-item')).toHaveCount(1)
  })

  test('new session creates a second session item', async ({ page }) => {
    const sessionsTab = page.locator('.sidebar-tab', { hasText: 'Sessions' })
    await sessionsTab.click()

    await expect(page.locator('.session-item')).toHaveCount(1)
    await page.locator('.btn--icon[title="New session"]').click()
    await expect(page.locator('.session-item')).toHaveCount(2)
  })

  test('settings panel opens and closes', async ({ page }) => {
    await page.locator('.btn', { hasText: 'Settings' }).first().click()
    await expect(page.locator('.settings-panel')).toBeVisible()
    await page.locator('.btn', { hasText: 'Close' }).click()
    await expect(page.locator('.settings-panel')).not.toBeVisible()
  })

  test('theme switch applies data-theme attribute', async ({ page }) => {
    await page.locator('.btn', { hasText: 'Settings' }).first().click()
    await page.locator('.theme-btn', { hasText: 'Dark' }).click()
    const theme = await page.locator('html').getAttribute('data-theme')
    expect(theme).toBe('dark')
  })
})
