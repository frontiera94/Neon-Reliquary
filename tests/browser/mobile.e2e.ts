import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  tolerance = 2
): boolean {
  const ix = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const iy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return ix > tolerance && iy > tolerance
}

async function assertWithinViewport(
  page: Page,
  selectorOrLocator: ReturnType<Page['locator']>,
  label: string
) {
  await expect(selectorOrLocator, `${label} should be visible`).toBeVisible()
  const box = await selectorOrLocator.boundingBox()
  expect(box, `${label} boundingBox should exist`).not.toBeNull()
  const vw = page.viewportSize()!.width
  expect(box!.x, `${label} left edge (${box!.x}) >= 0`).toBeGreaterThanOrEqual(-1)
  expect(
    box!.x + box!.width,
    `${label} right edge (${box!.x + box!.width}) <= viewport (${vw})`
  ).toBeLessThanOrEqual(vw + 1)
  return box!
}

test.describe('Neon Reliquary — Mobile Layout, Overlaps & Legibility Verification', () => {
  for (const vp of [
    { name: 'Compact Android (360x800)', width: 360, height: 800 },
    { name: 'iPhone SE (375x667)', width: 375, height: 667 },
    { name: 'Modern Mobile (390x844)', width: 390, height: 844 },
  ]) {
    test(`${vp.name}: Landing & Character Selection have zero horizontal overflow or header collisions`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })

      // 1. Landing Page
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const enterBtn = page.getByRole('button', { name: /enter|entra/i })
      await assertWithinViewport(page, enterBtn, 'Landing Enter CTA')

      const landingOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(landingOverflow).toBe(false)

      // 2. Character Selection Page
      await page.goto('/characters')
      const brand = page.locator('header').getByText('NEON RELIQUARY')
      const syncBadge = page.locator('header').getByTestId('cloud-sync-badge')
      const sheetsBtn = page.locator('header button[aria-label*="sheet" i], header button[aria-label*="sched" i]')

      const brandBox = await assertWithinViewport(page, brand, 'Header brand')
      const syncBox = await assertWithinViewport(page, syncBadge, 'Header CloudSyncBadge')
      const sheetsBox = await assertWithinViewport(page, sheetsBtn, 'Header Sheets button')

      expect(
        boxesOverlap(brandBox, syncBox),
        `brandBox=${JSON.stringify(brandBox)} syncBox=${JSON.stringify(syncBox)}`
      ).toBe(false)
      expect(
        boxesOverlap(syncBox, sheetsBox),
        `syncBox=${JSON.stringify(syncBox)} sheetsBox=${JSON.stringify(sheetsBox)}`
      ).toBe(false)

      const charsOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(charsOverflow).toBe(false)
    })
  }

  test('Mobile (360x800): TacticalHUD keeps HP, AC, Saves & Conditions strictly inside viewport without overlapping', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/characters')

    const manifestBtn = page.locator('button:visible', { hasText: /manifest|manifesta|resume|riprendi/i }).first()
    await manifestBtn.click()
    await page.waitForURL(/\/status/)

    // Verify Row 1: Character identity and right-side controls do not collide
    const charTitle = page.locator('header h1')
    const dropdownBtn = page.locator('header').getByTestId('character-dropdown-trigger')
    const settingsBtn = page.locator('header').getByRole('button', { name: /settings|impostazioni/i })

    const titleBox = await assertWithinViewport(page, charTitle, 'HUD Character Name')
    const dropdownBox = await assertWithinViewport(page, dropdownBtn, 'HUD Character Dropdown')
    const settingsBox = await assertWithinViewport(page, settingsBtn, 'HUD Settings Button')

    expect(boxesOverlap(titleBox, dropdownBox)).toBe(false)
    expect(boxesOverlap(dropdownBox, settingsBox)).toBe(false)
    // Character name should have readable width on 360px (not crushed to < 60px)
    expect(titleBox.width).toBeGreaterThanOrEqual(80)

    // Verify Row 2: HP Trigger, AC Capsule, and Saving Throws Capsule all fit inside 360px without overlapping
    const hpBox = await assertWithinViewport(page, page.getByTestId('hp-popover-trigger'), 'HP Trigger')
    const acGroup = page.locator('header [role="group"][aria-label*="Armor Class" i], header [role="group"][aria-label*="Classe Armatura" i]')
    const savesGroup = page.locator('header [role="group"][aria-label*="Saving Throws" i], header [role="group"][aria-label*="Tiri Salvezza" i]')

    const acBox = await assertWithinViewport(page, acGroup, 'AC Capsule')
    const savesBox = await assertWithinViewport(page, savesGroup, 'Saving Throws Capsule')

    expect(boxesOverlap(hpBox, acBox)).toBe(false)
    expect(boxesOverlap(hpBox, savesBox)).toBe(false)
    expect(boxesOverlap(acBox, savesBox)).toBe(false)

    // Activate two conditions and verify HUD STILL keeps HP, AC, and Saves strictly inside viewport!
    const shakenBtn = page.locator('main section button', { hasText: /^shaken$|^scosso$/i }).first()
    const sickenedBtn = page.locator('main section button', { hasText: /^sickened$|^infermo$/i }).first()
    await shakenBtn.click()
    await sickenedBtn.click()

    const hpBoxAfter = await assertWithinViewport(
      page,
      page.getByTestId('hp-popover-trigger'),
      'HP Trigger with active conditions'
    )
    const acBoxAfter = await assertWithinViewport(page, acGroup, 'AC Capsule with active conditions')
    const savesBoxAfter = await assertWithinViewport(page, savesGroup, 'Saves Capsule with active conditions')
    const condGroup = page.locator('header [role="group"][aria-label*="Condition" i], header [role="group"][aria-label*="Condizion" i]')
    const condBox = await assertWithinViewport(page, condGroup, 'HUD Active Conditions Strip')

    expect(boxesOverlap(hpBoxAfter, acBoxAfter)).toBe(false)
    expect(boxesOverlap(acBoxAfter, savesBoxAfter)).toBe(false)
    expect(boxesOverlap(acBoxAfter, condBox)).toBe(false)
    expect(boxesOverlap(savesBoxAfter, condBox)).toBe(false)
  })

  test('Mobile (360x800): HP Popover, Settings Drawer, Inspector Drawer & Chat Oracle open cleanly within viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/characters')
    await page.locator('button:visible', { hasText: /manifest|manifesta|resume|riprendi/i }).first().click()
    await page.waitForURL(/\/status/)

    // 1. Open Tactical HP Popover from HUD
    await page.getByTestId('hp-popover-trigger').click()
    const popover = page.getByTestId('hp-popover')
    await assertWithinViewport(page, popover, 'Tactical HP Popover')

    // Apply -5 damage and +5 heal inside popover
    await popover.getByRole('button', { name: /damage 5|danno 5/i }).click()
    await popover.getByRole('button', { name: /heal 5|cura 5/i }).click()
    await popover.getByRole('button', { name: /close|chiudi/i }).click()
    await expect(popover).toBeHidden()

    // 2. Open Settings Drawer and verify Close button is NOT obscured by sticky TopBar
    await page.locator('header').getByRole('button', { name: /settings|impostazioni/i }).click()
    const settingsDialog = page.getByRole('dialog', { name: /settings|impostazioni/i })
    await expect(settingsDialog).toBeVisible()
    const closeSettingsBtn = settingsDialog.getByRole('button', { name: /close|chiudi/i })
    await expect
      .poll(async () => {
        const b = await closeSettingsBtn.boundingBox()
        return b ? b.x + b.width : 999
      })
      .toBeLessThanOrEqual(361)
    await assertWithinViewport(page, closeSettingsBtn, 'Settings Close Button')
    await closeSettingsBtn.click()
    await expect(settingsDialog).toBeHidden()

    // 3. Open Condition Inspector Drawer on mobile via (i) button
    const inspectBtn = page.locator('main button[aria-label*="Inspect condition" i], main button[aria-label*="Ispeziona condizione" i]').first()
    await inspectBtn.click()
    const inspector = page.getByTestId('inspector-drawer')
    await assertWithinViewport(page, inspector, 'Mobile Inspector Bottom Sheet')
    await inspector.getByRole('button', { name: /close|chiudi/i }).click()
    await expect(inspector).toBeHidden()

    // 4. Open Chat Oracle via compact mobile FAB
    const chatFab = page.getByRole('button', { name: /oracolo/i })
    await assertWithinViewport(page, chatFab, 'Mobile Chat FAB')
    await chatFab.click()
    const closeChatBtn = page.getByRole('button', { name: /close|chiudi/i }).first()
    await expect(closeChatBtn).toBeVisible()
    await closeChatBtn.click()
  })

  test('Mobile (360x800): All 9 routes navigate cleanly, BottomNav labels never collide, and legibility/contrast pass WCAG AA', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/characters')
    await page.locator('button:visible', { hasText: /manifest|manifesta|resume|riprendi/i }).first().click()
    await page.waitForURL(/\/status/)

    // Verify BottomNav links have non-overlapping boxes
    const navLinks = page.locator('nav[aria-label="Navigation"] a')
    await expect(navLinks).toHaveCount(9)
    const linkCount = await navLinks.count()

    for (let i = 0; i < linkCount - 1; i++) {
      const boxA = await navLinks.nth(i).boundingBox()
      const boxB = await navLinks.nth(i + 1).boundingBox()
      expect(boxA).not.toBeNull()
      expect(boxB).not.toBeNull()
      expect(boxesOverlap(boxA!, boxB!, 1)).toBe(false)
    }

    const routes = ['/status', '/skills', '/combat', '/spells', '/features', '/inventory', '/companion', '/notes', '/map']

    for (const route of routes) {
      await page.goto(route)
      await expect(page.getByTestId('hp-popover-trigger')).toBeVisible()
      await page.waitForTimeout(350)

      // Active BottomNav item should auto-scroll into horizontal viewport
      const activeNav = page.locator(`nav[aria-label="Navigation"] a[href="${route}"]`)
      await expect
        .poll(async () => {
          const b = await activeNav.boundingBox()
          return b ? b.x >= -1 && b.x + b.width <= 361 : false
        })
        .toBe(true)
      await assertWithinViewport(page, activeNav, `Active BottomNav tab for ${route}`)

      // No horizontal document overflow
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(hasOverflow, `Route ${route} should not overflow horizontally`).toBe(false)

      // Legibility check: no visible text element should render below 10px
      const sub10pxElements = await page.evaluate(() => {
        const bad: string[] = []
        for (const el of Array.from(document.querySelectorAll('*'))) {
          const style = window.getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) < 0.05) continue
          if (el.classList.contains('sr-only') || el.classList.contains('material-symbols-outlined')) continue
          const rect = el.getBoundingClientRect()
          if (rect.width < 2 || rect.height < 2) continue
          const hasDirectText = Array.from(el.childNodes).some(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0
          )
          if (hasDirectText && parseFloat(style.fontSize) < 10) {
            bad.push(`${el.tagName.toLowerCase()}: "${(el.textContent ?? '').trim().slice(0, 25)}" (${style.fontSize})`)
          }
        }
        return bad
      })
      expect(sub10pxElements, `Route ${route} should have no sub-10px text`).toEqual([])

      // WCAG AA color-contrast & critical accessibility check
      const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
      expect(
        axe.violations,
        `Route ${route} should have zero WCAG AA color-contrast violations`
      ).toEqual([])
    }
  })
})
