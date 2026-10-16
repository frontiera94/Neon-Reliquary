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

  function doSync() {
    if (mapId && secret) scheduleSync(mapId, secret)
  }

  function handleInitiativeChange(tokenId: string, raw: string) {
    const parsed = raw === '' ? null : Number(raw)
    setTokenInitiative(tokenId, parsed)
    doSync()
  }

  function handleAddToOrder(token: Token) {
    setInitiativeOrder([...map.initiative.order, token.id])
    if (token.initiative === null || token.initiative === undefined) {
      setTokenInitiative(token.id, 0)
    }
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
      className="flex flex-col h-full bg-surface-container/90 backdrop-blur-md border-l border-white/10"
      style={{ minWidth: 200, maxWidth: 240 }}
    >
      <div style={{ padding: '12px 12px 8px' }}>
        <div className="font-label text-secondary text-sm uppercase tracking-wider font-bold">Iniziativa</div>
        <div className="font-label text-tertiary text-xs mt-1">Round {map.initiative.round}</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tokensInOrder.map((token, index) => {
          const isActive = index === map.initiative.currentIndex
          const isSelected = token.id === selectedTokenId

          return (
            <div
              key={token.id}
              className={[
                'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                isActive ? 'bg-primary/10 border-l-2 border-primary font-semibold' : 'hover:bg-white/5',
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
                <span className="font-label text-xs text-primary ml-auto whitespace-nowrap font-bold">
                  {token.initiative ?? '?'}
                </span>
              ) : (
                <input
                  type="number"
                  value={token.initiative ?? ''}
                  onChange={(e) => handleInitiativeChange(token.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-12 text-right bg-surface-container-lowest font-label text-xs text-primary border border-primary/30 rounded px-1 py-0.5 outline-none focus:border-primary"
                />
              )}
            </div>
          )
        })}

        {tokensOutOfOrder.length > 0 && (
          <>
            <div className="font-label text-tertiary text-xs uppercase tracking-wider px-3 py-1 mt-2 opacity-60">
              Fuori turno
            </div>
            {tokensOutOfOrder.map((token) => (
              <div
                key={token.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
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
                    className="font-label text-xs text-primary ml-auto hover:bg-primary/20 rounded p-1 transition-colors cursor-pointer"
                    title={`Aggiungi ${token.name} all'iniziativa`}
                    aria-label={`Aggiungi ${token.name} all'iniziativa`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddToOrder(token)
                    }}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex flex-col p-2 gap-1.5 border-t border-white/10">
          <button
            className="font-label text-xs text-tertiary px-3 py-1.5 text-left hover:text-primary hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            onClick={handleReorder}
          >
            Riordina per Iniziativa
          </button>
          <button
            className="w-full py-2 bg-primary/20 text-primary font-label text-sm font-semibold rounded-xl hover:bg-primary/30 hover:shadow-[0_0_12px_rgba(0,218,243,0.3)] transition-all cursor-pointer"
            onClick={handleAdvanceTurn}
          >
            → Turno successivo
          </button>
        </div>
      )}
    </div>
  )
}
