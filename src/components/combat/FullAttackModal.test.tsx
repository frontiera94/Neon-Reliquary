// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FullAttackModal } from './FullAttackModal'
import type { Weapon } from '../../types/combat'
import type { EffectiveWeaponCalculated } from '../../lib/stat-calc'

const baseWeapon: Weapon = {
  id: 'weap-scimitar',
  name: '+1 Scimitar',
  type: 'melee',
  attackBonus: [10, 5],
  damageDice: '1d6',
  damageBonus: 4,
  critRange: 18,
  critMultiplier: 2,
  tags: ['Light', 'Finesse'],
}

const baseEffective: EffectiveWeaponCalculated = {
  attackBonus: [10, 5],
  damageBonus: 4,
  acMod: 0,
  activeBuffNames: [],
  attackBreakdown: [{ label: 'Base', value: 10 }],
  damageBreakdown: [{ label: 'Base', value: 4 }],
}

function mockRandomRolls(rolls: number[]) {
  let index = 0
  return vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
    const u32 = arr as Uint32Array
    const target = rolls[index % rolls.length]
    index++
    u32[0] = target - 1
    return arr
  })
}

describe('FullAttackModal', () => {
  let onRollDamage: (label: string, bonus: number, isCritical?: boolean) => void
  let onRollExtraDice: () => void
  let onClose: () => void

  beforeEach(() => {
    onRollDamage = vi.fn()
    onRollExtraDice = vi.fn()
    onClose = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <FullAttackModal
        isOpen={false}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        onRollDamage={onRollDamage}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all attacks in the iterative sequence (1° Attack, 2° Attack)', () => {
    mockRandomRolls([10, 10])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        onRollDamage={onRollDamage}
      />
    )

    expect(screen.getByText('+1 Scimitar')).toBeInTheDocument()
    expect(screen.getByText('1° Attack')).toBeInTheDocument()
    expect(screen.getByText('2° Attack')).toBeInTheDocument()
    expect(screen.getByText('Crit: 18-20/x2')).toBeInTheDocument()
  })

  it('renders Off-hand Attack when twfActive is true for melee weapon', () => {
    mockRandomRolls([10, 10, 10])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={true}
        offhandPenalty={-2}
        onRollDamage={onRollDamage}
      />
    )

    expect(screen.getByText('Off-hand Attack')).toBeInTheDocument()
    expect(screen.getByText('Off-hand')).toBeInTheDocument()
    // Off-hand bonus is 10 + (-2) = 8
    expect(screen.getByText(/d20 \(10\) \+ 8/)).toBeInTheDocument()
  })

  it('does not render Off-hand Attack for ranged weapon even if twfActive is true', () => {
    mockRandomRolls([10, 10])

    const rangedWeapon: Weapon = {
      ...baseWeapon,
      type: 'ranged',
    }

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={rangedWeapon}
        effective={baseEffective}
        twfActive={true}
        offhandPenalty={-2}
        onRollDamage={onRollDamage}
      />
    )

    expect(screen.queryByText('Off-hand Attack')).not.toBeInTheDocument()
  })

  it('renders extra Haste Attack at full BAB when hasteActive is true', () => {
    mockRandomRolls([12, 14, 8])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        hasteActive={true}
        onRollDamage={onRollDamage}
      />
    )

    expect(screen.getByText('Haste Active')).toBeInTheDocument()
    expect(screen.getByText('Haste Attack')).toBeInTheDocument()
    expect(screen.getByText('Haste Bonus')).toBeInTheDocument()
    // Both 1° Attack and Haste Attack use full BAB (+10)
    expect(screen.getByText(/d20 \(12\) \+ 10/)).toBeInTheDocument()
    expect(screen.getByText(/d20 \(14\) \+ 10/)).toBeInTheDocument()
  })

  it('detects Haste from effective.activeBuffNames when hasteActive prop is not provided', () => {
    mockRandomRolls([10, 10, 10])

    const hasteEffective: EffectiveWeaponCalculated = {
      ...baseEffective,
      activeBuffNames: ['Haste'],
    }

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={hasteEffective}
        twfActive={false}
        offhandPenalty={0}
        onRollDamage={onRollDamage}
      />
    )

    expect(screen.getByText('Haste Active')).toBeInTheDocument()
    expect(screen.getByText('Haste Attack')).toBeInTheDocument()
  })

  it('detects critical threats and renders "Confirm Crit" button', () => {
    // 1st attack rolls 19 (within 18-20 crit range), 2nd rolls 10
    mockRandomRolls([19, 10])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        onRollDamage={onRollDamage}
      />
    )

    expect(screen.getByText('Crit Threat!')).toBeInTheDocument()
    const confirmButton = screen.getByRole('button', { name: /confirm crit/i })
    expect(confirmButton).toBeInTheDocument()
  })

  it('confirms critical threat on click and displays confirmation roll details', () => {
    // Initial rolls: 19 (crit threat for 1° attack), 10 (2° attack)
    // Next roll for confirmation: 17
    mockRandomRolls([19, 10, 17])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        onRollDamage={onRollDamage}
      />
    )

    const confirmButton = screen.getByRole('button', { name: /confirm crit/i })
    fireEvent.click(confirmButton)

    // Confirmation result: 17 + 10 = 27
    expect(screen.getByText(/Confirm Roll: 27/i)).toBeInTheDocument()
    expect(screen.getByText(/\(d20: 17 \+ 10\)/i)).toBeInTheDocument()

    // Confirm Crit button should now be gone
    expect(screen.queryByRole('button', { name: /confirm crit/i })).not.toBeInTheDocument()

    // Roll Dmg button switches to Roll Crit Dmg
    expect(screen.getByRole('button', { name: /roll crit dmg \(x2\)/i })).toBeInTheDocument()
  })

  it('triggers onRollDamage with correct parameters for normal hit', () => {
    mockRandomRolls([14, 12])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        onRollDamage={onRollDamage}
      />
    )

    const rollDmgButtons = screen.getAllByRole('button', { name: /roll dmg/i })
    expect(rollDmgButtons.length).toBe(2)

    fireEvent.click(rollDmgButtons[0])
    expect(onRollDamage).toHaveBeenCalledWith('+1 Scimitar (1° Attack) Dmg', 4, false)
  })

  it('triggers onRollDamage with isCritical: true when confirmed', () => {
    mockRandomRolls([19, 12, 15])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        onRollDamage={onRollDamage}
      />
    )

    // Confirm the crit on 1° attack
    const confirmButton = screen.getByRole('button', { name: /confirm crit/i })
    fireEvent.click(confirmButton)

    // Click Roll Crit Dmg
    const rollCritDmgButton = screen.getByRole('button', { name: /roll crit dmg \(x2\)/i })
    fireEvent.click(rollCritDmgButton)

    expect(onRollDamage).toHaveBeenCalledWith('+1 Scimitar (1° Attack) Dmg', 4, true)
  })

  it('re-rolls sequence when clicking Re-roll button', () => {
    // First sequence: 10, 10
    // Re-roll sequence: 15, 8
    mockRandomRolls([10, 10, 15, 8])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        onRollDamage={onRollDamage}
      />
    )

    // Initial total for 1° Attack: 10 + 10 = 20
    expect(screen.getAllByText('20').length).toBeGreaterThanOrEqual(1)

    // Click Re-roll
    const rerollButton = screen.getByRole('button', { name: /re-roll/i })
    fireEvent.click(rerollButton)

    // New total for 1° Attack: 15 + 10 = 25
    expect(screen.getByText('25')).toBeInTheDocument()
    // New total for 2° Attack: 8 + 5 = 13
    expect(screen.getByText('13')).toBeInTheDocument()
  })

  it('renders and triggers extra dice (e.g. Sneak Attack) button in footer', () => {
    mockRandomRolls([10, 10])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        sneakAttackDice="2d6"
        extraDiceLabel="Sneak Attack"
        onRollDamage={onRollDamage}
        onRollExtraDice={onRollExtraDice}
      />
    )

    const extraDiceButton = screen.getByRole('button', { name: /roll sneak attack \(2d6\)/i })
    expect(extraDiceButton).toBeInTheDocument()

    fireEvent.click(extraDiceButton)
    expect(onRollExtraDice).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking close button or close routine', () => {
    mockRandomRolls([10, 10])

    render(
      <FullAttackModal
        isOpen={true}
        onClose={onClose}
        weapon={baseWeapon}
        effective={baseEffective}
        twfActive={false}
        offhandPenalty={0}
        onRollDamage={onRollDamage}
      />
    )

    const closeBtn = screen.getByRole('button', { name: /close modal/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    const closeRoutineBtn = screen.getByRole('button', { name: /close routine/i })
    fireEvent.click(closeRoutineBtn)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
