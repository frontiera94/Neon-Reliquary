import { describe, it, expect } from 'vitest'
import {
  TACTICAL_SPRING,
  SNAPPY_SPRING,
  GENTLE_SPRING,
  PAGE_VARIANTS,
  STAGGER_CONTAINER,
  STAGGER_ITEM,
  CRIT_HIT_SHAKE,
  FUMBLE_GLITCH_SHAKE,
} from './motion-presets'

describe('motion-presets', () => {
  it('defines responsive spring constants without sluggishness', () => {
    expect(TACTICAL_SPRING.type).toBe('spring')
    expect(TACTICAL_SPRING.stiffness).toBeGreaterThanOrEqual(400)
    expect(TACTICAL_SPRING.damping).toBeGreaterThanOrEqual(25)

    expect(SNAPPY_SPRING.type).toBe('spring')
    expect(SNAPPY_SPRING.stiffness).toBeGreaterThan(TACTICAL_SPRING.stiffness as number)

    expect(GENTLE_SPRING.type).toBe('spring')
  })

  it('defines tactical page transition variants', () => {
    expect(PAGE_VARIANTS).toHaveProperty('initial')
    expect(PAGE_VARIANTS).toHaveProperty('animate')
    expect(PAGE_VARIANTS).toHaveProperty('exit')

    const initial = PAGE_VARIANTS.initial as Record<string, unknown>
    expect(initial.opacity).toBe(0)
    expect(initial.y).toBe(6)

    const animate = PAGE_VARIANTS.animate as Record<string, unknown>
    expect(animate.opacity).toBe(1)
    expect(animate.y).toBe(0)
  })

  it('defines staggered container & item reveal parameters', () => {
    const container = STAGGER_CONTAINER.animate as { transition: { staggerChildren: number } }
    expect(container.transition.staggerChildren).toBeLessThanOrEqual(0.05)

    const item = STAGGER_ITEM.initial as Record<string, unknown>
    expect(item.opacity).toBe(0)
    expect(item.y).toBe(10)
  })

  it('defines critical impact and fumble glitch keyframe sets', () => {
    expect(CRIT_HIT_SHAKE).toHaveProperty('animate')
    expect(FUMBLE_GLITCH_SHAKE).toHaveProperty('animate')

    const critAnimate = CRIT_HIT_SHAKE.animate as Record<string, unknown>
    expect(Array.isArray(critAnimate.scale)).toBe(true)
    expect(Array.isArray(critAnimate.x)).toBe(true)

    const fumbleAnimate = FUMBLE_GLITCH_SHAKE.animate as Record<string, unknown>
    expect(Array.isArray(fumbleAnimate.x)).toBe(true)
  })
})
