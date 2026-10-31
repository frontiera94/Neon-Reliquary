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

  it('renders all required form fields', () => {
    render(<SheetUploadForm />)

    expect(screen.getByPlaceholderText(/es\. Agelmund/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/es\. Fabio/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Password della campagna/i)).toBeInTheDocument()
    expect(screen.getByText(/Seleziona o trascina il file PDF/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Carica Scheda e Notifica Master/i })).toBeInTheDocument()
  })

  it('shows error if submitting without a file or fields', async () => {
    render(<SheetUploadForm />)

    const charInput = screen.getByPlaceholderText(/es\. Agelmund/i)
    fireEvent.change(charInput, { target: { value: 'Agelmund' } })

    const playerInput = screen.getByPlaceholderText(/es\. Fabio/i)
    fireEvent.change(playerInput, { target: { value: 'Fabio' } })

    const passInput = screen.getByPlaceholderText(/Password della campagna/i)
    fireEvent.change(passInput, { target: { value: 'secret' } })

    const submitBtn = screen.getByRole('button', { name: /Carica Scheda e Notifica Master/i })
    fireEvent.click(submitBtn)

    expect(await screen.findByText(/Seleziona il file PDF/i)).toBeInTheDocument()
  })

  it('rejects file that does not have .pdf extension', async () => {
    const { container } = render(<SheetUploadForm />)

    const fileInput = container.querySelector('#sheet-pdf-upload-input') as HTMLInputElement
    const badFile = new File(['hello world'], 'sheet.txt', { type: 'text/plain' })

    fireEvent.change(fileInput, { target: { files: [badFile] } })

    expect(await screen.findByText(/Solo file con estensione \.pdf sono accettati/i)).toBeInTheDocument()
  })

  it('submits form successfully when all inputs and PDF file are valid', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ ok: true })
    useSheetQueueStore.setState({ uploadSheet: uploadMock })

    const onSuccessMock = vi.fn()
    const { container } = render(<SheetUploadForm onSuccess={onSuccessMock} />)

    fireEvent.change(screen.getByPlaceholderText(/es\. Agelmund/i), { target: { value: 'Agelmund' } })
    fireEvent.change(screen.getByPlaceholderText(/es\. Fabio/i), { target: { value: 'Fabio' } })
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
          playerName: 'Fabio',
          password: 'reliquary_secret',
        })
      )
      expect(onSuccessMock).toHaveBeenCalledTimes(1)
    })
  })
})
