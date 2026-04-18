import { useEffect } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import type { ItemCategory, CoinPurse } from '../types/inventory'
import { InventoryItemCard } from '../components/inventory/InventoryItemCard'
import { CoinPurseWidget } from '../components/inventory/CoinPurseWidget'
import { EquipmentSlotGrid } from '../components/inventory/EquipmentSlotGrid'

const CATEGORY_ORDER: ItemCategory[] = ['weapon', 'armor', 'consumable', 'gear', 'magic']
const CATEGORY_LABELS: Record<ItemCategory, string> = {
  weapon: 'Weapons',
  armor: 'Armor & Shields',
  consumable: 'Consumables',
  gear: 'Adventuring Gear',
  magic: 'Magic Items',
}

export function InventoryPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const { getSession, initSession, adjustItemQuantity, adjustCoin } = useSessionStore()

  useEffect(() => {
    if (char) initSession(char.id, char.maxHp, char.startingCoins)
  }, [char, initSession])

  if (!char) return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )

  const session = getSession(char.id)
  const coins: CoinPurse = session.coins ?? char.startingCoins ?? { gp: 0, sp: 0, cp: 0 }

  const inventory = char.inventory ?? []

  const itemsByCategory = CATEGORY_ORDER
    .map((cat) => ({
      cat,
      items: inventory.filter((i) => i.category === cat),
    }))
    .filter(({ items }) => items.length > 0)

  return (
    <div className="p-6 md:p-12 lg:p-16">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-12">
        <h1 className="font-headline text-5xl md:text-7xl font-bold text-on-surface mb-4 tracking-tighter uppercase">
          Inventory & <span className="text-secondary neon-glow-gold">Gear</span>
        </h1>
        <div className="h-1 w-24 bg-primary mb-8" />
        <p className="font-body text-tertiary text-lg max-w-2xl leading-relaxed">
          Equipment carried by {char.name}.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
        {/* Equipment slot grid */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="font-headline text-2xl text-secondary uppercase tracking-tight">Equipment</h2>
            <div className="flex-1 h-px bg-secondary/30" />
          </div>
          <EquipmentSlotGrid items={inventory} />
        </section>

        {/* Coin purse */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="font-headline text-2xl text-secondary uppercase tracking-tight">Coin Purse</h2>
            <div className="flex-1 h-px bg-secondary/30" />
          </div>
          <CoinPurseWidget
            coins={coins}
            onAdjust={(denom, delta) => adjustCoin(char.id, denom, delta)}
          />
        </section>

        {/* Item categories */}
        {itemsByCategory.length === 0 ? (
          <p className="font-body text-tertiary italic">No items in inventory.</p>
        ) : (
          itemsByCategory.map(({ cat, items }) => (
            <section key={cat}>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="font-headline text-2xl text-secondary uppercase tracking-tight">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="flex-1 h-px bg-secondary/30" />
                <span className="font-label text-[10px] text-tertiary uppercase tracking-widest">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((item) => {
                  const qty = session.itemQuantities?.[item.id] ?? item.quantity
                  return (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      qty={qty}
                      onAdjust={(delta) => adjustItemQuantity(char.id, item.id, delta)}
                    />
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
