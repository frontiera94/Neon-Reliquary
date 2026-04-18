import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useMapStore } from '../store/useMapStore'
import { fetchMap } from '../lib/map-api'
import { MapCanvas } from '../components/map/MapCanvas'
import { InitiativePanel } from '../components/map/InitiativePanel'

export function MapViewPage() {
  const { id } = useParams<{ id: string }>()
  const map = useMapStore((s) => s.map)

  useEffect(() => {
    if (!id) return
    const poll = async () => {
      try {
        const data = await fetchMap(id)
        const current = useMapStore.getState().map
        if (!current || current.updatedAt !== data.updatedAt) {
          useMapStore.getState().setMap(data)
        }
      } catch {
      }
    }
    poll()
    const timer = setInterval(poll, 2000)
    return () => {
      clearInterval(timer)
      useMapStore.getState().clearMap()
    }
  }, [id])

  return (
    <div className="flex h-screen bg-surface relative">
      <div className="absolute top-3 left-3 z-10 font-label text-xs text-tertiary bg-surface-container px-2 py-1">
        PLAYER VIEW
      </div>

      {!map ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-label text-tertiary">In attesa della mappa...</span>
        </div>
      ) : (
        <>
          <div className="flex-1">
            <MapCanvas map={map} isReadOnly={true} />
          </div>
          <div className="w-52 shrink-0 overflow-y-auto border-l border-surface-container-high">
            <InitiativePanel map={map} isReadOnly={true} />
          </div>
        </>
      )}
    </div>
  )
}
