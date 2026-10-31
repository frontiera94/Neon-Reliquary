// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SheetQueueList } from './SheetQueueList'
import { useSheetQueueStore, type UploadedSheet } from '../../store/useSheetQueueStore'

describe('SheetQueueList', () => {
  const mockSheets: UploadedSheet[] = [
    {
      id: 'sheet-1',
      characterName: 'Knam',
      playerName: 'Andrea',
      notes: 'Passato a lvl 5',
      fileName: 'Knam_lv5.pdf',
      fileSize: 111716,
      status: 'new',
      createdAt: 1714500000000,
      updatedAt: 1714500000000,
    },
    {
      id: 'sheet-2',
      characterName: 'Mariano Cardamomo',
      playerName: 'Marco',
      notes: '',
      fileName: 'Mariano_lvl5.pdf',
      fileSize: 93243,
      status: 'processing',
      createdAt: 1714400000000,
      updatedAt: 1714400000000,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useSheetQueueStore.setState({
      sheets: mockSheets,
      isLoading: false,
      isUploading: false,
      error: null,
      uploadSuccessMessage: null,
    })
  })

  it('renders uploaded sheets with character name, player name, and file size', () => {
    render(<SheetQueueList />)

    expect(screen.getByText('Knam')).toBeInTheDocument()
    expect(screen.getByText(/di Andrea/i)).toBeInTheDocument()
    expect(screen.getByText('Knam_lv5.pdf')).toBeInTheDocument()
    expect(screen.getByText(/109\.1 KB/i)).toBeInTheDocument()
    expect(screen.getByText('"Passato a lvl 5"')).toBeInTheDocument()

    expect(screen.getByText('Mariano Cardamomo')).toBeInTheDocument()
    expect(screen.getByText(/di Marco/i)).toBeInTheDocument()
  })

  it('filters sheets when clicking filter buttons', () => {
    render(<SheetQueueList />)

    // Click "Nuove" filter
    const newFilterBtn = screen.getByRole('button', { name: /Nuove \(1\)/i })
    fireEvent.click(newFilterBtn)

    expect(screen.getByText('Knam')).toBeInTheDocument()
    expect(screen.queryByText('Mariano Cardamomo')).not.toBeInTheDocument()
  })

  it('triggers downloadSheet when clicking PDF download button', () => {
    const downloadMock = vi.fn()
    useSheetQueueStore.setState({ downloadSheet: downloadMock })

    render(<SheetQueueList />)

    const downloadButtons = screen.getAllByRole('button', { name: /PDF/i })
    fireEvent.click(downloadButtons[0])

    expect(downloadMock).toHaveBeenCalledWith('sheet-1', 'Knam_lv5.pdf')
  })

  it('triggers updateSheetStatus when changing status dropdown', async () => {
    const updateMock = vi.fn().mockResolvedValue(true)
    useSheetQueueStore.setState({ updateSheetStatus: updateMock })

    render(<SheetQueueList />)

    const statusSelect = screen.getByLabelText(/Cambia stato scheda Knam/i)
    fireEvent.change(statusSelect, { target: { value: 'archived' } })

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith('sheet-1', 'archived')
    })
  })

  it('triggers deleteSheet when clicking trash button', async () => {
    const deleteMock = vi.fn().mockResolvedValue(true)
    useSheetQueueStore.setState({ deleteSheet: deleteMock })

    render(<SheetQueueList />)

    const deleteBtn = screen.getByRole('button', { name: /Elimina scheda Knam/i })
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('sheet-1')
    })
  })
})
