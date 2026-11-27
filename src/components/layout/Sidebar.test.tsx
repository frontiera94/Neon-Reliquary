// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'

describe('Sidebar component', () => {
  it('keeps the sidebar sticky with fixed viewport height so the bottom character footer never shifts across pages', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/map']}>
        <Sidebar />
      </MemoryRouter>
    )

    const aside = container.querySelector('aside')
    expect(aside).toBeInTheDocument()
    expect(aside).toHaveClass('sticky')
    expect(aside).toHaveClass('top-[var(--topbar-h,4rem)]')
    expect(aside).toHaveClass('h-[calc(100dvh-var(--topbar-h,4rem))]')
    expect(aside).toHaveClass('self-start')

    const footer = screen.getByTestId('sidebar-footer')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveClass('mt-auto')
    expect(footer).toHaveClass('shrink-0')
  })
})
