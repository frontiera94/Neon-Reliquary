import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import type { ItemCategory, CoinPurse, InventoryItem } from '../types/inventory'
import type { DiceType } from '../types/dice'
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
  const {
    getSession,
    initSession,
    adjustItemQuantity,
    adjustCoin,
    toggleItemEquipped,
    addCustomItem,
    removeCustomItem,
  } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // New Item form state
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<ItemCategory>('consumable')
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemWeight, setNewItemWeight] = useState<string>('')
  const [newItemDesc, setNewItemDesc] = useState('')

  useEffect(() => {
    if (char) {
      const defaultEquipped = (char.inventory ?? []).filter((i) => i.equipped).map((i) => i.id)
      initSession(char.id, char.maxHp, char.startingCoins, defaultEquipped)
    }
  }, [char, initSession])

  const session = char ? getSession(char.id) : null
  const coins: CoinPurse = session?.coins ?? char?.startingCoins ?? { gp: 0, sp: 0, cp: 0 }

  const baseInventory = char?.inventory ?? []
  const customItems = session?.customItems ?? []
  const allItems: InventoryItem[] = useMemo(
    () => [...baseInventory, ...customItems],
    [baseInventory, customItems]
  )

  const totalWeight = useMemo(() => {
    if (!session) return 0
    return allItems.reduce((acc, item) => {
      const qty = session.itemQuantities?.[item.id] ?? item.quantity
      return acc + (item.weight ?? 0) * qty
    }, 0)
  }, [allItems, session])

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [allItems, selectedCategory, search])

  const itemsByCategory = useMemo(() => {
    return CATEGORY_ORDER
      .filter((cat) => selectedCategory === 'all' || selectedCategory === cat)
      .map((cat) => ({
        cat,
        items: filteredItems.filter((i) => i.category === cat),
      }))
      .filter(({ items }) => items.length > 0)
  }, [filteredItems, selectedCategory])

  if (!char || !session) {
    return (
      <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
        No character selected
      </div>
    )
  }

  const handleUseConsumable = (item: InventoryItem) => {
    adjustItemQuantity(char.id, item.id, -1)
    // Check if name or description contains a dice formula like 1d8+1 or 2d6
    const match = `${item.name} ${item.description || ''}`.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i)
    if (match) {
      const count = parseInt(match[1], 10)
      const sides = parseInt(match[2], 10) as DiceType
      const sign = match[3] === '-' ? -1 : 1
      const bonus = match[4] ? sign * parseInt(match[4], 10) : 0
      openRoll({
        diceType: sides,
        count,
        modifier: bonus,
        label: `Use: ${item.name}`,
        breakdown: [
          { label: `${count}d${sides}`, value: 0 },
          ...(bonus !== 0 ? [{ label: 'Modifier', value: bonus }] : []),
        ],
      })
    }
  }

  const handleCreateLoot = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    const weightNum = parseFloat(newItemWeight)
    const item: InventoryItem = {
      id: `loot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: Math.max(1, newItemQty),
      weight: !isNaN(weightNum) && weightNum > 0 ? weightNum : undefined,
      description: newItemDesc.trim(),
    }

    addCustomItem(char.id, item)
    setNewItemName('')
    setNewItemCategory('consumable')
    setNewItemQty(1)
    setNewItemWeight('')
    setNewItemDesc('')
    setShowAddModal(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface mb-1.5 tracking-tight uppercase">
            Inventory & <span className="text-secondary neon-glow-accent">Gear</span>
          </h1>
          <div className="h-1 w-20 bg-gradient-to-r from-primary to-secondary rounded-full mb-3" />
          <p className="font-label text-xs sm:text-sm text-tertiary tracking-wide">
            Equipment carried by <span className="text-white font-medium">{char.name}</span>.
          </p>
        </div>

        {/* Quick actions & stats */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-surface-container border border-white/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">fitness_center</span>
            <span className="font-label text-xs text-tertiary uppercase tracking-wider">Weight:</span>
            <span className="font-label text-xs font-bold text-white tabular-nums">
              {totalWeight.toFixed(1)} lbs
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border border-primary/40 text-white font-label text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-primary">add</span>
            <span>+ Aggiungi Loot</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface-container/60 rounded-2xl border border-white/10">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca oggetti, pozioni, pergamene..."
            className="w-full bg-surface-container-high/70 rounded-xl pl-9 pr-4 py-2 font-label text-xs text-on-surface placeholder:text-tertiary/60 outline-none border border-white/5 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-label text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : 'bg-surface-container border border-white/10 text-tertiary hover:text-white'
            }`}
          >
            Tutti ({allItems.length})
          </button>
          {CATEGORY_ORDER.map((cat) => {
            const count = allItems.filter((i) => i.category === cat).length
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-label text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'bg-surface-container border border-white/10 text-tertiary hover:text-white'
                }`}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </button>
            )
          })}
        </div>
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
            items={allItems}
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
          <div className="py-12 text-center">
            <p className="font-body text-tertiary italic text-sm">
              {search || selectedCategory !== 'all'
                ? 'Nessun oggetto corrispondente ai filtri.'
                : 'No items in inventory.'}
            </p>
          </div>
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
                  const isCustom = customItems.some((ci) => ci.id === item.id)

                  return (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      qty={qty}
                      isEquipped={isItemEquipped}
                      onAdjust={(delta) => adjustItemQuantity(char.id, item.id, delta)}
                      onToggleEquip={() => toggleItemEquipped(char.id, item.id)}
                      onUse={() => handleUseConsumable(item)}
                      onRemove={isCustom ? () => removeCustomItem(char.id, item.id) : undefined}
                    />
                  )
                })}
              </div>
            </motion.section>
          ))
        )}
      </motion.div>

      {/* Add Custom Item / Loot Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-surface-container border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-headline text-lg font-bold text-white uppercase tracking-wider">
                  Aggiungi Loot / Oggetto
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-tertiary hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateLoot} className="space-y-4">
                <div>
                  <label className="block font-label text-[11px] uppercase tracking-wider text-tertiary mb-1">
                    Nome Oggetto *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="es. Pozione di Cura Ferite Leggere (1d8+1)"
                    className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3.5 py-2 font-label text-xs text-white placeholder:text-tertiary/50 focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-label text-[11px] uppercase tracking-wider text-tertiary mb-1">
                      Categoria
                    </label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value as ItemCategory)}
                      className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3 py-2 font-label text-xs text-white focus:border-primary focus:outline-none"
                    >
                      {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-label text-[11px] uppercase tracking-wider text-tertiary mb-1">
                      Quantità
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3 py-2 font-label text-xs text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-label text-[11px] uppercase tracking-wider text-tertiary mb-1">
                    Peso (lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={newItemWeight}
                    onChange={(e) => setNewItemWeight(e.target.value)}
                    placeholder="0.5"
                    className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3.5 py-2 font-label text-xs text-white placeholder:text-tertiary/50 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-label text-[11px] uppercase tracking-wider text-tertiary mb-1">
                    Descrizione / Formula
                  </label>
                  <textarea
                    rows={2}
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    placeholder="es. Cura 1d8+1 danni. Azione standard per bere."
                    className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3.5 py-2 font-label text-xs text-white placeholder:text-tertiary/50 focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-tertiary hover:text-white font-label text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-black font-label text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
                  >
                    Salva Loot
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
