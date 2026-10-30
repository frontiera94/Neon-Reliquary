import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import type { ItemCategory, CoinPurse } from '../types/inventory'
import { InventoryItemCard } from '../components/inventory/InventoryItemCard'
import { CoinPurseWidget } from '../components/inventory/CoinPurseWidget'
import { EquipmentSlotGrid } from '../components/inventory/EquipmentSlotGrid'
import { STAGGER_CONTAINER, STAGGER_ITEM } from '../lib/motion-presets'

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface mb-1.5 tracking-tight uppercase">
          Inventory & <span className="text-secondary neon-glow-accent">Gear</span>
        </h1>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-secondary rounded-full mb-3" />
        <p className="font-label text-xs sm:text-sm text-tertiary tracking-wide">
          Equipment carried by <span className="text-white font-medium">{char.name}</span>.
        </p>
      </div>

      <motion.div
        variants={STAGGER_CONTAINER}
        initial="initial"
        animate="animate"
        className="space-y-8"
      >
        {/* Equipment slot grid */}
        <motion.section variants={STAGGER_ITEM}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-headline text-lg sm:text-xl text-white font-bold uppercase tracking-wider">Equipment</h2>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <EquipmentSlotGrid
            items={inventory}
            equippedIds={session.equippedItemIds}
            onUnequip={(itemId) => toggleItemEquipped(char.id, itemId)}
          />
        </motion.section>

        {/* Coin purse */}
        <motion.section variants={STAGGER_ITEM}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-headline text-lg sm:text-xl text-white font-bold uppercase tracking-wider">Coin Purse</h2>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <CoinPurseWidget
            coins={coins}
            onAdjust={(denom, delta) => adjustCoin(char.id, denom, delta)}
          />
        </motion.section>

        {/* Item categories */}
        {itemsByCategory.length === 0 ? (
          <p className="font-body text-tertiary italic">No items in inventory.</p>
        ) : (
          itemsByCategory.map(({ cat, items }) => (
            <motion.section variants={STAGGER_ITEM} key={cat}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-headline text-lg sm:text-xl text-white font-bold uppercase tracking-wider">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="flex-1 h-px bg-white/10" />
                <span className="font-label text-[10px] text-primary/80 bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
            </motion.section>
          ))
        )}
      </motion.div>
    </div>
  )
}
