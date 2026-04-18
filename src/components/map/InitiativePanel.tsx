import { useMapStore } from '../../store/useMapStore'
import type { PublicMapState, Token } from '../../types/map'

interface InitiativePanelProps {
  map: PublicMapState
  isReadOnly: boolean
  mapId?: string
  secret?: string
  selectedTokenId?: string | null
  onTokenSelect?: (id: string | null) => void
}

export function InitiativePanel({
  map,
  isReadOnly,
  mapId,
  secret,
  selectedTokenId,
  onTokenSelect,
}: InitiativePanelProps) {
  const { setTokenInitiative, advanceTurn, setInitiativeOrder, scheduleSync } = useMapStore()

  const tokenById = new Map<string, Token>(map.tokens.map((t) => [t.id, t]))

  const tokensInOrder: Token[] = map.initiative.order
    .map((id) => tokenById.get(id))
    .filter((t): t is Token => t !== undefined)

  const orderSet = new Set(map.initiative.order)
  const tokensOutOfOrder: Token[] = map.tokens.filter((t) => !orderSet.has(t.id))

  const sortedInOrder = [...tokensInOrder].sort((a, b) => {
    const ia = a.initiative ?? -Infinity
    const ib = b.initiative ?? -Infinity
    return ib - ia
  })

  function doSync() {
    if (mapId && secret) scheduleSync(mapId, secret)
  }

  function handleInitiativeChange(tokenId: string, raw: string) {
    const parsed = raw === '' ? null : Number(raw)
    setTokenInitiative(tokenId, parsed)
    doSync()
  }

  function handleAddToOrder(token: Token) {
    const raw = window.prompt(`Iniziativa per ${token.name}:`)
    if (raw === null) return
    const value = raw.trim() === '' ? null : Number(raw.trim())
    setInitiativeOrder([...map.initiative.order, token.id])
    setTokenInitiative(token.id, value)
    doSync()
  }

  function handleAdvanceTurn() {
    advanceTurn()
    doSync()
  }

  function handleReorder() {
    const sorted = [...map.initiative.order].sort((a, b) => {
      const ta = tokenById.get(a)
      const tb = tokenById.get(b)
      const ia = ta?.initiative ?? -Infinity
      const ib = tb?.initiative ?? -Infinity
      return ib - ia
    })
    setInitiativeOrder(sorted)
    doSync()
  }

  return (
    <div
      className="flex flex-col h-full bg-surface-container"
      style={{ minWidth: 200, maxWidth: 240 }}
    >
      <div style={{ padding: '12px 12px 8px' }}>
        <div className="font-label text-secondary text-sm uppercase tracking-wider">Iniziativa</div>
        <div className="font-label text-tertiary text-xs mt-1">Round {map.initiative.round}</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedInOrder.map((token, idx) => {
          const originalIndex = map.initiative.order.indexOf(token.id)
          const isActive = originalIndex === map.initiative.currentIndex
          const isSelected = token.id === selectedTokenId

          return (
            <div
              key={token.id}
              className={[
                'flex items-center gap-2 px-3 py-2 cursor-pointer',
                isActive ? 'bg-primary/10 border-l-2 border-primary' : '',
                isSelected ? 'bg-surface-container-high' : '',
              ]
                .join(' ')
                .trim()}
              onClick={() => onTokenSelect?.(token.id)}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: token.color }}
              />
              <span className="font-label text-sm text-white truncate flex-1">{token.name}</span>
              <span className="font-label text-xs text-tertiary whitespace-nowrap">
                {token.hp.current}/{token.hp.max}
              </span>
              {isReadOnly ? (
                <span className="font-label text-xs text-primary ml-auto whitespace-nowrap">
                  {token.initiative ?? '?'}
                </span>
              ) : (
                <input
                  type="number"
                  value={token.initiative ?? ''}
                  onChange={(e) => handleInitiativeChange(token.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-12 text-right bg-transparent font-label text-xs text-primary border-b border-primary/30 outline-none"
                  style={{ borderRadius: 0 }}
                />
              )}
            </div>
          )
        })}

        {tokensOutOfOrder.length > 0 && (
          <>
            <div className="font-label text-tertiary text-xs uppercase tracking-wider px-3 py-1 mt-1 opacity-60">
              Fuori turno
            </div>
            {tokensOutOfOrder.map((token) => (
              <div
                key={token.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer opacity-60"
                onClick={() => onTokenSelect?.(token.id)}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: token.color }}
                />
                <span className="font-label text-sm text-tertiary truncate flex-1">{token.name}</span>
                <span className="font-label text-xs text-tertiary whitespace-nowrap">
                  {token.hp.current}/{token.hp.max}
                </span>
                {!isReadOnly && (
                  <button
                    className="font-label text-xs text-primary ml-auto hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-colors"
                    style={{ borderRadius: 0 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddToOrder(token)
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex flex-col">
          <button
            className="font-label text-xs text-tertiary px-3 py-1 text-left hover:text-primary transition-colors"
            style={{ borderRadius: 0 }}
            onClick={handleReorder}
          >
            Riordina
          </button>
          <button
            className="w-full py-2 bg-primary/20 text-primary font-label text-sm hover:bg-primary/30 hover:shadow-[0_0_12px_rgba(0,218,243,0.3)] transition-colors"
            style={{ borderRadius: 0 }}
            onClick={handleAdvanceTurn}
          >
            → Turno successivo
          </button>
        </div>
      )}
    </div>
  )
}
