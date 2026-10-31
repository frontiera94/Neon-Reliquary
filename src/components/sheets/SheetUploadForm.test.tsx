// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SheetUploadForm } from './SheetUploadForm'
import { useSheetQueueStore } from '../../store/useSheetQueueStore'

describe('SheetUploadForm', () => {
  beforeEach(() => {
    useSheetQueueStore.setState({
      sheets: [],
      isLoading: false,
      isUploading: false,
      error: null,
      uploadSuccessMessage: null,
    })
    vi.clearAllMocks()
  })

  it('renders character dropdown and required form fields without player name input', () => {
    render(<SheetUploadForm />)

    // Character dropdown is rendered
    expect(screen.getByLabelText(/Personaggio/i)).toBeInTheDocument()
    // Default campaign characters are present in dropdown
    expect(screen.getByRole('option', { name: /Agelmund/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Knam/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Mariano Cardamomo/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Mazikeen Noctis/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Noorie/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Shotrix Blackburn/i })).toBeInTheDocument()

    // Player name input must NOT exist
    expect(screen.queryByPlaceholderText(/es\. Fabio/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Nome Giocatore/i)).not.toBeInTheDocument()

    expect(screen.getByPlaceholderText(/Password della campagna/i)).toBeInTheDocument()
    expect(screen.getByText(/Seleziona o trascina il file PDF/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Carica Scheda e Notifica Master/i })).toBeInTheDocument()
  })

  it('shows error if submitting without selecting character or file', async () => {
    render(<SheetUploadForm />)

    const passInput = screen.getByPlaceholderText(/Password della campagna/i)
    fireEvent.change(passInput, { target: { value: 'secret' } })

    const submitBtn = screen.getByRole('button', { name: /Carica Scheda e Notifica Master/i })
    fireEvent.click(submitBtn)

    expect(await screen.findByText(/Seleziona un personaggio dal menu a tendina/i)).toBeInTheDocument()
  })

  it('rejects file that does not have .pdf extension', async () => {
    const { container } = render(<SheetUploadForm />)

    const fileInput = container.querySelector('#sheet-pdf-upload-input') as HTMLInputElement
    const badFile = new File(['hello world'], 'sheet.txt', { type: 'text/plain' })

    fireEvent.change(fileInput, { target: { files: [badFile] } })

    expect(await screen.findByText(/Solo file con estensione \.pdf sono accettati/i)).toBeInTheDocument()
  })

  it('submits form successfully when selecting character from dropdown and attaching PDF', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ ok: true })
    useSheetQueueStore.setState({ uploadSheet: uploadMock })

    const onSuccessMock = vi.fn()
    const { container } = render(<SheetUploadForm onSuccess={onSuccessMock} />)

    // Select character from dropdown
    fireEvent.change(screen.getByLabelText(/Personaggio/i), { target: { value: 'Agelmund' } })
    fireEvent.change(screen.getByPlaceholderText(/Password della campagna/i), { target: { value: 'reliquary_secret' } })

    const fileInput = container.querySelector('#sheet-pdf-upload-input') as HTMLInputElement
    const pdfFile = new File(['%PDF-1.4 dummy'], 'Agelmund_lvl5.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [pdfFile] } })

    const submitBtn = screen.getByRole('button', { name: /Carica Scheda e Notifica Master/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          characterName: 'Agelmund',
          password: 'reliquary_secret',
        })
      )
      expect(onSuccessMock).toHaveBeenCalledTimes(1)
    })
  })

  it('allows custom character name when selecting __other__', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ ok: true })
    useSheetQueueStore.setState({ uploadSheet: uploadMock })

    const { container } = render(<SheetUploadForm />)

    // Select "Altro..."
    fireEvent.change(screen.getByLabelText(/Personaggio/i), { target: { value: '__other__' } })

    // Input for custom character name should now be visible
    const customInput = screen.getByPlaceholderText(/es\. Valerius/i)
    expect(customInput).toBeInTheDocument()
    fireEvent.change(customInput, { target: { value: 'Valerius Darkblade' } })

    fireEvent.change(screen.getByPlaceholderText(/Password della campagna/i), { target: { value: 'reliquary_secret' } })

    const fileInput = container.querySelector('#sheet-pdf-upload-input') as HTMLInputElement
    const pdfFile = new File(['%PDF-1.4 dummy'], 'Valerius.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [pdfFile] } })

    fireEvent.click(screen.getByRole('button', { name: /Carica Scheda e Notifica Master/i }))

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledWith(
        expect.objectContaining({
          characterName: 'Valerius Darkblade',
          password: 'reliquary_secret',
        })
      )
    })
  })
})
