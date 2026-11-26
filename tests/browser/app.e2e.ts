import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Neon Reliquary — Real Browser E2E & Accessibility', () => {
  test('Desktop journey: landing -> character selection -> bento cockpit -> reload persistence', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Navigate to character selection
    await page.goto('/characters')
    const agelmundVisible = page.locator('text=/Agelmund/i >> visible=true').first()
    await expect(agelmundVisible).toBeVisible()

    // Select Agelmund and manifest into cockpit
    const manifestBtn = page.locator('button:visible', { hasText: /manifest|entra|resume|riprendi/i }).first()
    await manifestBtn.click()
    await page.waitForURL(/\/(status|combat)/)

    // Verify TacticalHUD badges and navigation are visible on desktop
    await expect(page.getByTestId('hp-popover-trigger')).toBeVisible()
    await expect(page.getByTestId('ac-total')).toBeVisible()
    await expect(page.getByTestId('ac-touch')).toBeVisible()
    await expect(page.getByTestId('ac-flat-footed')).toBeVisible()

    // Navigate to Combat and verify tactical cockpit
    await page.locator('a[href="/combat"]:visible').first().click()
    await page.waitForURL(/\/combat/)
    await expect(page.getByTestId('hp-popover-trigger')).toBeVisible()

    // Reload and verify state persists via localStorage
    await page.reload()
    await expect(page.getByTestId('hp-popover-trigger')).toBeVisible()
    await expect(page.locator('text=/Mazikeen|Shotrix|Agelmund|Knam|Mariano|Noorie/i >> visible=true').first()).toBeVisible()
  })

  test('Mobile viewport (390x844): no horizontal overflow and HUD visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/characters')
    const manifestBtn = page.locator('button:visible', { hasText: /manifest|entra|resume|riprendi/i }).first()
    await manifestBtn.click()
    await page.waitForURL(/\/(status|combat)/)

    await expect(page.getByTestId('hp-popover-trigger')).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('Offline resilience: SPA navigation remains interactive when network goes offline', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/characters')
    const manifestBtn = page.locator('button:visible', { hasText: /manifest|entra|resume|riprendi/i }).first()
    await manifestBtn.click()
    await page.waitForURL(/\/(status|combat)/)

    await context.setOffline(true)
    const spellsLink = page.locator('a[href="/spells"]:visible').first()
    await spellsLink.click()
    await page.waitForURL(/\/spells/)
    await expect(page.getByTestId('hp-popover-trigger')).toBeVisible()
    await context.setOffline(false)
  })

  test('Accessibility audit (WCAG): zero critical axe violations on Landing & Character Selection', async ({ page }) => {
    await page.goto('/')
    const landingResults = await new AxeBuilder({ page }).analyze()
    const landingCritical = landingResults.violations.filter((v) => v.impact === 'critical')
    expect(landingCritical).toEqual([])

    await page.goto('/characters')
    const charsResults = await new AxeBuilder({ page }).analyze()
    const charsCritical = charsResults.violations.filter((v) => v.impact === 'critical')
    expect(charsCritical).toEqual([])
  })
})
