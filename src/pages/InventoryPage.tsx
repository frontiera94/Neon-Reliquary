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
  const { getSession, initSession, adjustItemQuantity, adjustCoin, toggleItemEquipped } = useSessionStore()

  useEffect(() => {
    if (char) {
      const defaultEquipped = (char.inventory ?? []).filter((i) => i.equipped).map((i) => i.id)
      initSession(char.id, char.maxHp, char.startingCoins, defaultEquipped)
    }
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
    <div className="p-2.5 sm:p-4 md:p-8 lg:p-12">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-3 sm:mb-6 md:mb-8">
        <h1 className="font-headline text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-on-surface mb-1 sm:mb-2 tracking-tighter uppercase">
          Inventory & <span className="text-secondary neon-glow-accent">Gear</span>
        </h1>
        <div className="h-1 w-16 sm:w-24 bg-gradient-to-r from-primary to-secondary rounded-full mb-2 sm:mb-4" />
        <p className="font-body text-tertiary text-xs sm:text-base max-w-2xl leading-relaxed">
          Equipment carried by {char.name}.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8 md:space-y-10">
        {/* Equipment slot grid */}
        <section>
          <div className="flex items-center gap-2.5 sm:gap-4 mb-2.5 sm:mb-4">
            <h2 className="font-headline text-base sm:text-xl md:text-2xl text-white font-bold uppercase tracking-tight">Equipment</h2>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <EquipmentSlotGrid
            items={inventory}
            equippedIds={session.equippedItemIds}
            onUnequip={(itemId) => toggleItemEquipped(char.id, itemId)}
          />
        </section>

        {/* Coin purse */}
        <section>
          <div className="flex items-center gap-2.5 sm:gap-4 mb-2.5 sm:mb-4">
            <h2 className="font-headline text-base sm:text-xl md:text-2xl text-white font-bold uppercase tracking-tight">Coin Purse</h2>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <CoinPurseWidget
            coins={coins}
            onAdjust={(denom, delta) => adjustCoin(char.id, denom, delta)}
          />
        </section>

        {/* Item categories */}
        {itemsByCategory.length === 0 ? (
          <p className="font-body text-tertiary italic text-xs sm:text-sm">No items in inventory.</p>
        ) : (
          itemsByCategory.map(({ cat, items }) => (
            <section key={cat}>
              <div className="flex items-center gap-2 sm:gap-4 mb-2.5 sm:mb-4">
                <h2 className="font-headline text-base sm:text-xl md:text-2xl text-white font-bold uppercase tracking-tight">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="flex-1 h-px bg-white/10" />
                <span className="font-label text-[10px] sm:text-xs text-primary/80 bg-primary/10 border border-primary/20 px-2 sm:px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3.5">
                {items.map((item) => {
                  const qty = session.itemQuantities?.[item.id] ?? item.quantity
                  const isItemEquipped = session.equippedItemIds
                    ? session.equippedItemIds.includes(item.id)
                    : (item.equipped ?? false)
                  return (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      qty={qty}
                      isEquipped={isItemEquipped}
                      onAdjust={(delta) => adjustItemQuantity(char.id, item.id, delta)}
                      onToggleEquip={() => toggleItemEquipped(char.id, item.id)}
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
