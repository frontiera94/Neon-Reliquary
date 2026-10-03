import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { nanoid } from 'nanoid'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { BUFF_PRESETS } from '../../lib/buff-presets'
import { CONDITION_INFO } from '../../lib/conditions'
import type { BuffToggle, ConditionType } from '../../types/combat'

interface BuffManagerModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'presets' | 'active' | 'create' | 'conditions'
}

const ALL_CONDITIONS: ConditionType[] = [
  'shaken', 'sickened', 'fatigued', 'exhausted',
  'blinded', 'confused', 'dazed', 'frightened',
  'nauseated', 'paralyzed', 'prone', 'stunned',
]

export function BuffManagerModal({ isOpen, onClose, initialTab = 'presets' }: BuffManagerModalProps) {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => (char ? s.getSession(char.id) : null))
  const { toggleBuff, addCustomBuff, removeCustomBuff, toggleCondition } = useSessionStore()

  const [activeTab, setActiveTab] = useState<'presets' | 'active' | 'create' | 'conditions'>(initialTab)

  // Custom buff form state
  const [name, setName] = useState('')
  const [attackMod, setAttackMod] = useState(0)
  const [damageMod, setDamageMod] = useState(0)
  const [acMod, setAcMod] = useState(0)
  const [saveType, setSaveType] = useState<'all' | 'specific'>('all')
  const [globalSaveMod, setGlobalSaveMod] = useState(0)
  const [fortMod, setFortMod] = useState(0)
  const [refMod, setRefMod] = useState(0)
  const [willMod, setWillMod] = useState(0)
  const [strMod, setStrMod] = useState(0)
  const [dexMod, setDexMod] = useState(0)
  const [conMod, setConMod] = useState(0)
  const [meleeOnly, setMeleeOnly] = useState(false)
  const [extraDice, setExtraDice] = useState('')
  const [color, setColor] = useState<'primary' | 'secondary' | 'error'>('primary')

  if (!isOpen || !char || !session) return null

  const activeBuffIds = session.activeBuffIds
  const customBuffs = session.customBuffs ?? []
  const allAvailableBuffs = [...char.buffs, ...customBuffs]

  function handleCreateBuff(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const abilityMods: BuffToggle['abilityMods'] = {}
    if (strMod !== 0) abilityMods.str = strMod
    if (dexMod !== 0) abilityMods.dex = dexMod
    if (conMod !== 0) abilityMods.con = conMod

    let saveMod: BuffToggle['saveMod'] = undefined
    if (saveType === 'all' && globalSaveMod !== 0) {
      saveMod = globalSaveMod
    } else if (saveType === 'specific' && (fortMod !== 0 || refMod !== 0 || willMod !== 0)) {
      saveMod = { fort: fortMod, ref: refMod, will: willMod }
    }

    const newBuff: BuffToggle = {
      id: `custom-${nanoid(6)}`,
      name: name.trim(),
      active: true,
      attackMod,
      damageMod,
      acMod,
      saveMod,
      abilityMods: Object.keys(abilityMods).length > 0 ? abilityMods : undefined,
      meleeOnly,
      extraDamageDice: extraDice.trim() || undefined,
      color,
      isCustom: true,
    }

    addCustomBuff(char!.id, newBuff)
    // reset form
    setName('')
    setAttackMod(0)
    setDamageMod(0)
    setAcMod(0)
    setGlobalSaveMod(0)
    setFortMod(0)
    setRefMod(0)
    setWillMod(0)
    setStrMod(0)
    setDexMod(0)
    setConMod(0)
    setMeleeOnly(false)
    setExtraDice('')
    setActiveTab('active')
  }

  function handleTogglePreset(preset: BuffToggle) {
    if (!char) return
    const existing = customBuffs.find((b) => b.id === preset.id)
    if (existing) {
      toggleBuff(char.id, preset.id)
    } else {
      // Add to custom buffs and toggle on
      addCustomBuff(char.id, { ...preset, isCustom: true })
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.section
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-surface-container/95 backdrop-blur-2xl border border-white/15 shadow-[0_0_60px_rgba(0,240,255,0.2)] rounded-3xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-surface-container-high/60 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-[10px] font-label uppercase tracking-widest font-bold">
                  Tactical Protocol
                </span>
                <span className="font-label text-[10px] text-slate-400 uppercase tracking-wider">
                  PF1e Stacking
                </span>
              </div>
              <h2 className="font-headline text-lg sm:text-xl uppercase tracking-wider text-white font-bold">
                Combat Buffs & Protocols
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </header>

          {/* Navigation Tabs */}
          <div className="p-2 border-b border-white/10 bg-surface-container-lowest/80 flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl font-label text-xs uppercase tracking-wider text-center transition-all cursor-pointer font-bold ${
                activeTab === 'presets'
                  ? 'bg-primary text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              PF1e Presets
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl font-label text-xs uppercase tracking-wider text-center transition-all cursor-pointer font-bold ${
                activeTab === 'active'
                  ? 'bg-primary text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Active ({activeBuffIds.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl font-label text-xs uppercase tracking-wider text-center transition-all cursor-pointer font-bold ${
                activeTab === 'create'
                  ? 'bg-primary text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              + Custom Buff
            </button>
            <button
              onClick={() => setActiveTab('conditions')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl font-label text-xs uppercase tracking-wider text-center transition-all cursor-pointer font-bold ${
                activeTab === 'conditions'
                  ? 'bg-secondary text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Conditions ({session.conditions.length})
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* TAB: PRESETS */}
            {activeTab === 'presets' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BUFF_PRESETS.map((preset) => {
                  const isActive = activeBuffIds.includes(preset.id)
                  return (
                    <div
                      key={preset.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isActive
                          ? 'border-primary/60 bg-primary/10 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                          : 'border-white/10 bg-surface-container-high/40 hover:border-white/20 hover:bg-surface-container-high/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-headline text-sm font-bold text-white">
                            {preset.name}
                          </h4>
                          <span
                            className={`font-label text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-primary text-black shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                                : 'bg-white/5 border border-white/10 text-slate-400'
                            }`}
                          >
                            {isActive ? 'ACTIVE' : 'READY'}
                          </span>
                        </div>
                        <p className="font-body text-xs text-slate-300 mb-3 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleTogglePreset(preset)}
                        className={`w-full py-2 rounded-xl font-label text-xs uppercase tracking-wider font-bold transition-all cursor-pointer active:scale-[0.98] ${
                          isActive
                            ? 'bg-error text-white hover:bg-error/90 shadow-[0_0_12px_rgba(255,75,96,0.3)]'
                            : 'bg-primary/15 border border-primary/40 text-primary hover:bg-primary hover:text-black hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                        }`}
                      >
                        {isActive ? 'Dismiss Buff' : 'Engage Buff'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* TAB: ACTIVE & CUSTOM */}
            {activeTab === 'active' && (
              <div className="space-y-3">
                {allAvailableBuffs.length === 0 ? (
                  <p className="text-center font-label text-xs text-slate-400 py-8 uppercase tracking-widest">
                    No buffs configured for this character.
                  </p>
                ) : (
                  allAvailableBuffs.map((buff) => {
                    const isActive = activeBuffIds.includes(buff.id)
                    return (
                      <div
                        key={buff.id}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                          isActive
                            ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                            : 'border-white/10 bg-surface-container-high/40'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isActive ? 'bg-primary shadow-[0_0_8px_#00daf3]' : 'bg-slate-600'
                              }`}
                            />
                            <h4 className="font-headline text-sm font-bold text-white truncate">
                              {buff.name}
                            </h4>
                            {buff.isCustom && (
                              <span className="font-label text-[9px] font-bold text-secondary border border-secondary/40 px-1.5 py-0.5 rounded-md bg-secondary/10">
                                CUSTOM
                              </span>
                            )}
                          </div>
                          <p className="font-label text-xs text-slate-300 mt-1">
                            {[
                              buff.attackMod ? `${buff.attackMod > 0 ? '+' : ''}${buff.attackMod} Att` : '',
                              buff.damageMod ? `${buff.damageMod > 0 ? '+' : ''}${buff.damageMod} Dmg` : '',
                              buff.acMod ? `${buff.acMod > 0 ? '+' : ''}${buff.acMod} AC` : '',
                              buff.extraDamageDice ? `+${buff.extraDamageDice} Dice` : '',
                              buff.meleeOnly ? 'Melee only' : '',
                            ]
                              .filter(Boolean)
                              .join(' • ') || buff.description || 'Custom modifier'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => toggleBuff(char.id, buff.id)}
                            className={`px-4 py-1.5 rounded-xl font-label text-xs uppercase font-bold tracking-wider transition-all cursor-pointer active:scale-95 ${
                              isActive
                                ? 'bg-primary text-black shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                                : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {isActive ? 'ON' : 'OFF'}
                          </button>

                          {buff.isCustom && (
                            <button
                              onClick={() => removeCustomBuff(char.id, buff.id)}
                              className="p-1.5 text-slate-400 hover:text-error rounded-lg hover:bg-error/10 transition-colors cursor-pointer"
                              title="Delete custom buff"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* TAB: CREATE CUSTOM BUFF */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreateBuff} className="space-y-4">
                <div>
                  <label className="block font-label text-xs text-slate-300 uppercase tracking-wider font-semibold mb-1.5">
                    Buff / Spell Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Divine Favor, Cat's Grace, Heroism..."
                    className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-3.5 py-2.5 font-body text-sm text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-label text-xs text-slate-300 uppercase tracking-wider font-semibold mb-1.5">
                      Attack Mod
                    </label>
                    <input
                      type="number"
                      value={attackMod}
                      onChange={(e) => setAttackMod(parseInt(e.target.value) || 0)}
                      className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-3 py-2 font-label text-sm text-center text-white focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-label text-xs text-slate-300 uppercase tracking-wider font-semibold mb-1.5">
                      Damage Mod
                    </label>
                    <input
                      type="number"
                      value={damageMod}
                      onChange={(e) => setDamageMod(parseInt(e.target.value) || 0)}
                      className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-3 py-2 font-label text-sm text-center text-white focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-label text-xs text-slate-300 uppercase tracking-wider font-semibold mb-1.5">
                      AC Mod
                    </label>
                    <input
                      type="number"
                      value={acMod}
                      onChange={(e) => setAcMod(parseInt(e.target.value) || 0)}
                      className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-3 py-2 font-label text-sm text-center text-white focus:border-primary outline-none"
                    />
                  </div>
                </div>

                {/* Saves Section */}
                <div className="p-4 rounded-2xl border border-white/10 bg-surface-container-high/40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-label text-xs text-secondary uppercase tracking-wider font-bold">
                      Saving Throws
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSaveType('all')}
                        className={`font-label text-xs uppercase px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          saveType === 'all'
                            ? 'bg-primary text-black shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        All Saves
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveType('specific')}
                        className={`font-label text-xs uppercase px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          saveType === 'specific'
                            ? 'bg-primary text-black shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                            : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        Fort / Ref / Will
                      </button>
                    </div>
                  </div>

                  {saveType === 'all' ? (
                    <div>
                      <input
                        type="number"
                        placeholder="All Saves modifier (+/-)"
                        value={globalSaveMod}
                        onChange={(e) => setGlobalSaveMod(parseInt(e.target.value) || 0)}
                        className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-3 py-2 font-label text-sm text-center text-white focus:border-primary outline-none"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="block font-label text-[10px] text-slate-400 mb-1">FORT</span>
                        <input
                          type="number"
                          value={fortMod}
                          onChange={(e) => setFortMod(parseInt(e.target.value) || 0)}
                          className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-2 py-1.5 font-label text-xs text-center text-white focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <span className="block font-label text-[10px] text-slate-400 mb-1">REF</span>
                        <input
                          type="number"
                          value={refMod}
                          onChange={(e) => setRefMod(parseInt(e.target.value) || 0)}
                          className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-2 py-1.5 font-label text-xs text-center text-white focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <span className="block font-label text-[10px] text-slate-400 mb-1">WILL</span>
                        <input
                          type="number"
                          value={willMod}
                          onChange={(e) => setWillMod(parseInt(e.target.value) || 0)}
                          className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-2 py-1.5 font-label text-xs text-center text-white focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Ability Scores Section */}
                <div className="p-4 rounded-2xl border border-white/10 bg-surface-container-high/40">
                  <span className="block font-label text-xs text-secondary uppercase tracking-wider font-bold mb-3">
                    Ability Score Enhancements (+/-)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block font-label text-[10px] text-slate-400 mb-1">STR</span>
                      <input
                        type="number"
                        value={strMod}
                        onChange={(e) => setStrMod(parseInt(e.target.value) || 0)}
                        className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-2 py-1.5 font-label text-xs text-center text-white focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <span className="block font-label text-[10px] text-slate-400 mb-1">DEX</span>
                      <input
                        type="number"
                        value={dexMod}
                        onChange={(e) => setDexMod(parseInt(e.target.value) || 0)}
                        className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-2 py-1.5 font-label text-xs text-center text-white focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <span className="block font-label text-[10px] text-slate-400 mb-1">CON</span>
                      <input
                        type="number"
                        value={conMod}
                        onChange={(e) => setConMod(parseInt(e.target.value) || 0)}
                        className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-2 py-1.5 font-label text-xs text-center text-white focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-label text-xs text-slate-300 uppercase tracking-wider font-semibold mb-1.5">
                      Extra Damage Dice
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1d6 or 2d6"
                      value={extraDice}
                      onChange={(e) => setExtraDice(e.target.value)}
                      className="w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-3 py-2 font-label text-sm text-white placeholder:text-slate-500 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer font-label text-xs text-slate-300 uppercase">
                      <input
                        type="checkbox"
                        checked={meleeOnly}
                        onChange={(e) => setMeleeOnly(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                      Melee weapons only
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <span className="font-label text-xs text-slate-300 uppercase font-semibold">Accent:</span>
                  {(['primary', 'secondary', 'error'] as const).map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-lg border transition-all cursor-pointer ${
                        c === 'primary' ? 'bg-primary' : c === 'secondary' ? 'bg-secondary' : 'bg-error'
                      } ${color === c ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-80'}`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-4 rounded-xl bg-primary text-black font-label text-sm uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all font-bold cursor-pointer active:scale-[0.99]"
                >
                  Manifest Custom Buff
                </button>
              </form>
            )}

            {/* TAB: CONDITIONS */}
            {activeTab === 'conditions' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_CONDITIONS.map((cond) => {
                  const info = CONDITION_INFO[cond]
                  const isActive = session.conditions.includes(cond)
                  return (
                    <div
                      key={cond}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isActive
                          ? 'border-error/60 bg-error/15 shadow-[0_0_20px_rgba(255,75,96,0.2)]'
                          : 'border-white/10 bg-surface-container-high/40 hover:border-white/20 hover:bg-surface-container-high/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-headline text-base font-bold text-white">
                            {info.name}
                          </h4>
                          <span
                            className={`font-label text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-error text-white shadow-[0_0_8px_rgba(255,75,96,0.4)]'
                                : 'bg-white/5 border border-white/10 text-slate-400'
                            }`}
                          >
                            {isActive ? 'AFFLICTED' : 'CLEAR'}
                          </span>
                        </div>
                        <p className="font-body text-xs text-slate-300 mb-2.5 leading-relaxed">
                          {info.summary}
                        </p>
                        <ul className="space-y-1 font-label text-xs text-slate-300">
                          {info.penalties.map((pen, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-secondary select-none font-bold">•</span>
                              <span className="leading-snug">{pen}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => toggleCondition(char.id, cond)}
                        className={`w-full mt-3.5 py-2 rounded-xl font-label text-xs uppercase tracking-wider font-bold transition-all cursor-pointer active:scale-[0.98] ${
                          isActive
                            ? 'bg-error text-white hover:bg-error/90 shadow-[0_0_12px_rgba(255,75,96,0.3)]'
                            : 'bg-white/5 border border-white/15 text-slate-200 hover:bg-primary/20 hover:text-primary hover:border-primary/50 hover:shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                        }`}
                      >
                        {isActive ? 'Remove Condition' : 'Apply Condition'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  )
}
