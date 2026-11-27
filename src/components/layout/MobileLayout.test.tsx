// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MainLayout } from './MainLayout'
import { SettingsPanel } from './SettingsPanel'
import { TacticalHpPopover } from './TacticalHpPopover'
import { TacticalHUD } from './TacticalHUD'
import { useCharacterStore, type FullCharacter } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import mazikeenJson from '../../data/mazikeen-noctis.json'

const mazikeen = mazikeenJson as unknown as FullCharacter

describe('Mobile Layout, Navigation & Legibility Safeguards', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [mazikeen],
      activeCharacterId: mazikeen.id,
    })
    useSessionStore.setState({ sessions: {} })
    useSessionStore.getState().initSession(mazikeen.id, mazikeen.maxHp)
  })

  it('BottomNav renders all 9 navigation items with readable >=10px typography and auto-scrolls active item into view', () => {
    const scrollIntoViewMock = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoViewMock

    render(
      <MemoryRouter initialEntries={['/notes']}>
        <BottomNav />
      </MemoryRouter>
    )

    const nav = screen.getByRole('navigation', { name: /navigation/i })
    const links = nav.querySelectorAll('a')
    expect(links.length).toBe(9)

    // Ensure readable >=10px font class and generous touch target width (no cramped 50px / 9px)
    links.forEach((link) => {
      expect(link.className).toContain('min-w-[64px]')
      expect(link.className).toContain('text-[10px]')
      expect(link.className).not.toContain('text-[9px]')
      expect(link.className).not.toContain('text-[8px]')
    })

    // Active route (/notes) should trigger smooth centering scrollIntoView
    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ inline: 'center', block: 'nearest' })
    )
  })

  it('MainLayout provides sufficient mobile bottom padding (pb-36) to clear BottomNav and ChatFab', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/status']}>
        <MainLayout />
      </MemoryRouter>
    )

    const main = container.querySelector('main')
    expect(main).not.toBeNull()
    expect(main!.className).toContain('pb-36')
  })

  it('SettingsPanel is hidden from assistive tech & pointer events when closed, and renders above TopBar (z-[75]) when open', () => {
    const onClose = vi.fn()
    const { container, rerender } = render(<SettingsPanel isOpen={false} onClose={onClose} />)

    const hiddenPanel = container.querySelector('[aria-hidden="true"]')
    expect(hiddenPanel).not.toBeNull()
    expect(hiddenPanel!.className).toContain('invisible')
    expect(hiddenPanel!.className).toContain('pointer-events-none')

    rerender(<SettingsPanel isOpen={true} onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: /settings|impostazioni/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.className).toContain('z-[75]')
  })

  it('TacticalHpPopover uses viewport-clamped fixed positioning on mobile and closes on outside touchstart', () => {
    const onClose = vi.fn()
    render(
      <TacticalHpPopover
        isOpen={true}
        onClose={onClose}
        characterId={mazikeen.id}
        currentHp={30}
        maxHp={48}
        tempHp={0}
        nonlethalDamage={0}
        conScore={16}
      />
    )

    const popover = screen.getByTestId('hp-popover')
    expect(popover.className).toContain('fixed')
    expect(popover.className).toContain('inset-x-3')

    // Outside touch on mobile should dismiss popover
    fireEvent.touchStart(document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('TacticalHUD renders mobile home button, readable >=10px stat labels, and scrollable active conditions strip', () => {
    useSessionStore.getState().toggleCondition(mazikeen.id, 'shaken')
    useSessionStore.getState().toggleCondition(mazikeen.id, 'sickened')

    render(
      <MemoryRouter>
        <TacticalHUD />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    const charHeading = screen.getByRole('heading', { name: mazikeen.name })
    expect(charHeading.className).not.toContain('max-w-[85px]')

    const condStrip = screen.getByRole('group', { name: /active conditions|condizioni attive/i })
    expect(condStrip.className).toContain('overflow-x-auto')
  })
})
