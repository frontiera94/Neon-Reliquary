import { describe, it, expect } from 'vitest'
import { CHARACTER_LORE_MAP, DEFAULT_LORE, getCharacterLore, isPlaceholderPortrait } from './character-lore'

describe('character-lore', () => {
  it('returns dedicated lore for all 6 party characters and falls back to DEFAULT_LORE', () => {
    for (const id of Object.keys(CHARACTER_LORE_MAP)) {
      const lore = getCharacterLore(id)
      expect(lore.archetype.length).toBeGreaterThan(0)
      expect(lore.highlights.length).toBeGreaterThan(0)
    }
    expect(getCharacterLore('unknown-hero')).toEqual(DEFAULT_LORE)
  })

  it('detects placeholder portraits', () => {
    expect(isPlaceholderPortrait(undefined)).toBe(true)
    expect(isPlaceholderPortrait('https://placehold.co/400x400')).toBe(true)
    expect(isPlaceholderPortrait('https://example.com/placeholder.png')).toBe(true)
    expect(isPlaceholderPortrait('/assets/agelmund.png')).toBe(false)
  })
})
