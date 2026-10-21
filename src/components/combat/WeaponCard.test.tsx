// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WeaponCard } from './WeaponCard'
import type { Weapon } from '../../types/combat'
import type { EffectiveWeaponCalculated } from '../../lib/stat-calc'

const meleeWeapon: Weapon = {
  id: 'weap-dagger',
  name: 'Gold Plated Dagger (Small)',
  type: 'melee',
  attackBonus: [10],
  damageDice: '1d3',
  damageBonus: 5,
  critRange: 19,
  critMultiplier: 2,
  tags: ['Finesse', 'Dex to Damage', 'Weapon Focus'],
}

const rangedWeapon: Weapon = {
  id: 'weap-thrown-dagger',
  name: 'Dagger (Thrown, Small)',
  type: 'ranged',
  attackBonus: [10],
  damageDice: '1d3',
  damageBonus: -2,
  critRange: 19,
  critMultiplier: 2,
  tags: ['Thrown', 'Weapon Focus', 'Range 10 ft.'],
  maxAmmo: 5,
  currentAmmo: 5,
}

const effectiveMelee: EffectiveWeaponCalculated = {
  attackBonus: [10],
  damageBonus: 5,
  acMod: 0,
  activeBuffNames: [],
  attackBreakdown: [{ label: 'Base', value: 10 }],
  damageBreakdown: [{ label: 'Base', value: 5 }],
}

const effectiveRanged: EffectiveWeaponCalculated = {
  attackBonus: [10],
  damageBonus: -2,
  acMod: 0,
  activeBuffNames: [],
  attackBreakdown: [{ label: 'Base', value: 10 }],
  damageBreakdown: [{ label: 'Base', value: -2 }],
}

describe('WeaponCard component', () => {
  it('renders melee weapon with balanced side-by-side Attack and Damage buttons', () => {
    const onAttackRoll = vi.fn()
    const onDamageRoll = vi.fn()

    render(
      <WeaponCard
        weapon={meleeWeapon}
        effective={effectiveMelee}
        twfActive={false}
        offhandPenalty={0}
        onAttackRoll={onAttackRoll}
        onOffhandRoll={vi.fn()}
        onDamageRoll={onDamageRoll}
      />
    )

    expect(screen.getByText('Gold Plated Dagger (Small)')).toBeInTheDocument()
    expect(screen.getByText('Melee')).toBeInTheDocument()
    expect(screen.getByText('19-20 / x2')).toBeInTheDocument()
    expect(screen.getByText('+10')).toBeInTheDocument()
    expect(screen.getByText('1d3 + 5')).toBeInTheDocument()

    // Clicking attack button triggers onAttackRoll
    const atkBtn = screen.getByText('+10').closest('button')
    fireEvent.click(atkBtn!)
    expect(onAttackRoll).toHaveBeenCalledWith(0)

    // Clicking damage button triggers onDamageRoll
    const dmgBtn = screen.getByText('1d3 + 5').closest('button')
    fireEvent.click(dmgBtn!)
    expect(onDamageRoll).toHaveBeenCalled()
  })

  it('renders ranged weapon with ammo tracker in the header specs area', () => {
    const onAmmoChange = vi.fn()

    render(
      <WeaponCard
        weapon={rangedWeapon}
        effective={effectiveRanged}
        ammo={5}
        maxAmmo={5}
        twfActive={false}
        offhandPenalty={0}
        onAttackRoll={vi.fn()}
        onOffhandRoll={vi.fn()}
        onDamageRoll={vi.fn()}
        onAmmoChange={onAmmoChange}
      />
    )

    expect(screen.getByText('Dagger (Thrown, Small)')).toBeInTheDocument()
    expect(screen.getByText('Ranged')).toBeInTheDocument()
    expect(screen.getByText('5/5')).toBeInTheDocument()
    expect(screen.getByText('1d3 - 2')).toBeInTheDocument()

    // Ammo pips are present and interactive
    const ammoPip = screen.getByLabelText('Ammo 5')
    expect(ammoPip).toBeInTheDocument()
    fireEvent.click(ammoPip)
    expect(onAmmoChange).toHaveBeenCalledWith(4)
  })

  it('renders Two-Weapon Fighting with Primary and Off-hand attack buttons in attack pod', () => {
    const onAttackRoll = vi.fn()
    const onOffhandRoll = vi.fn()

    render(
      <WeaponCard
        weapon={meleeWeapon}
        effective={effectiveMelee}
        twfActive={true}
        offhandPenalty={0}
        onAttackRoll={onAttackRoll}
        onOffhandRoll={onOffhandRoll}
        onDamageRoll={vi.fn()}
      />
    )

    expect(screen.getByText('Primary Attack')).toBeInTheDocument()
    expect(screen.getByText('Off-hand')).toBeInTheDocument()

    const offhandBtn = screen.getByText('Off-hand').closest('button')
    fireEvent.click(offhandBtn!)
    expect(onOffhandRoll).toHaveBeenCalled()
  })

  it('renders Sneak Attack extra damage button alongside base damage', () => {
    const onDamageRoll = vi.fn()
    const onSneakAttackRoll = vi.fn()

    render(
      <WeaponCard
        weapon={meleeWeapon}
        effective={effectiveMelee}
        twfActive={false}
        offhandPenalty={0}
        sneakAttackDice="2d6"
        extraDiceLabel="Sneak Atk"
        onAttackRoll={vi.fn()}
        onOffhandRoll={vi.fn()}
        onDamageRoll={onDamageRoll}
        onSneakAttackRoll={onSneakAttackRoll}
      />
    )

    expect(screen.getByText('1d3 + 5')).toBeInTheDocument()
    expect(screen.getByText('Sneak Atk')).toBeInTheDocument()
    expect(screen.getByText('2d6')).toBeInTheDocument()

    const sneakBtn = screen.getByText('2d6').closest('button')
    fireEvent.click(sneakBtn!)
    expect(onSneakAttackRoll).toHaveBeenCalled()
  })
})
