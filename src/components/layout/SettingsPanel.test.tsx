// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsPanel } from './SettingsPanel'
import { useSheetQueueStore } from '../../store/useSheetQueueStore'

describe('SettingsPanel Tabs and Sheet Queue Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSheetQueueStore.setState({
      sheets: [
        {
          id: 'sheet-1',
          characterName: 'Noorie',
          playerName: 'Chiara',
          notes: '',
          fileName: 'noorie.pdf',
          fileSize: 1024,
          status: 'new',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      isLoading: false,
      isUploading: false,
      error: null,
      uploadSuccessMessage: null,
    })
  })

  it('renders Strumenti / Tools tab by default and switches to Coda Schede / Sheet Queue', () => {
    render(<SettingsPanel isOpen={true} onClose={() => {}} />)

    // Verify Title and Strumenti tab
    expect(screen.getByRole('heading', { name: /Settings|Impostazioni/i })).toBeInTheDocument()
    expect(screen.getByText(/Custom Roll/i)).toBeInTheDocument()

    // Badge showing 1 new sheet
    expect(screen.getByTestId('settings-sheets-badge')).toHaveTextContent('1')

    // Click Coda Schede tab
    const codaTabBtn = screen.getByRole('button', { name: /Coda Schede|Sheet Queue/i })
    fireEvent.click(codaTabBtn)

    // Now showing Sheet Queue sub-views
    expect(screen.getByRole('button', { name: /Archivio Coda|Queue Archive/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Carica Nuova Scheda|Upload New Sheet/i })).toBeInTheDocument()
    expect(screen.getByText('Noorie')).toBeInTheDocument()
  })

  it('switches between Archivio Coda and Carica Nuova Scheda', () => {
    render(<SettingsPanel isOpen={true} onClose={() => {}} initialTab="sheets" />)

    // Initially in Archivio Coda
    expect(screen.getByText('Noorie')).toBeInTheDocument()

    // Switch to Carica Nuova Scheda
    const uploadSubTabBtn = screen.getByRole('button', { name: /Carica Nuova Scheda|Upload New Sheet/i })
    fireEvent.click(uploadSubTabBtn)

    // Form inputs should now be visible
    expect(screen.getByLabelText(/Personaggio|Character/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Password della campagna|Campaign passphrase/i)).toBeInTheDocument()
  })
})
