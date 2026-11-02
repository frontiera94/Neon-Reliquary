// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageToggle } from './LanguageToggle'
import { useLanguageStore } from '../../store/useLanguageStore'

describe('LanguageToggle Component', () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: 'en' })
  })

  it('renders compact toggle with EN active by default', () => {
    render(<LanguageToggle variant="compact" />)

    const enBtn = screen.getByRole('button', { name: /English language/i })
    const itBtn = screen.getByRole('button', { name: /Lingua italiana/i })

    expect(enBtn).toHaveAttribute('aria-pressed', 'true')
    expect(itBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches language to Italian when IT button is clicked', () => {
    render(<LanguageToggle variant="compact" />)

    const itBtn = screen.getByRole('button', { name: /Lingua italiana/i })
    fireEvent.click(itBtn)

    expect(useLanguageStore.getState().language).toBe('it')
    expect(itBtn).toHaveAttribute('aria-pressed', 'true')

    const enBtn = screen.getByRole('button', { name: /English language/i })
    expect(enBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders full variant with English and Italian text buttons', () => {
    render(<LanguageToggle variant="full" />)

    const enBtn = screen.getByRole('button', { name: /Switch to English/i })
    const itBtn = screen.getByRole('button', { name: /Passa all'Italiano/i })

    expect(enBtn).toHaveAttribute('aria-pressed', 'true')
    expect(itBtn).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(itBtn)
    expect(useLanguageStore.getState().language).toBe('it')
    expect(itBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
