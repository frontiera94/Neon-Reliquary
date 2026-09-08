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
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.section
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-surface-container border border-primary/40 shadow-[0_0_50px_rgba(0,218,243,0.2)] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-high">
            <div>
              <h2 className="font-headline text-lg uppercase tracking-widest text-primary font-bold">
                Combat Buffs & Protocols
              </h2>
              <p className="font-label text-[11px] text-tertiary uppercase tracking-wider">
                PF1e Dynamic Tactical Stacking
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-tertiary hover:text-white p-1 transition-colors"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </header>

          {/* Navigation Tabs */}
          <div className="flex border-b border-outline-variant/30 bg-surface-container-low overflow-x-auto">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 min-w-[110px] py-3 px-3 font-label text-xs uppercase tracking-wider text-center transition-all border-b-2 ${
                activeTab === 'presets'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-tertiary hover:text-white'
              }`}
            >
              PF1e Presets
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 min-w-[110px] py-3 px-3 font-label text-xs uppercase tracking-wider text-center transition-all border-b-2 ${
                activeTab === 'active'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-tertiary hover:text-white'
              }`}
            >
              Active ({activeBuffIds.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 min-w-[110px] py-3 px-3 font-label text-xs uppercase tracking-wider text-center transition-all border-b-2 ${
                activeTab === 'create'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-tertiary hover:text-white'
              }`}
            >
              + Custom Buff
            </button>
            <button
              onClick={() => setActiveTab('conditions')}
              className={`flex-1 min-w-[110px] py-3 px-3 font-label text-xs uppercase tracking-wider text-center transition-all border-b-2 ${
                activeTab === 'conditions'
                  ? 'border-secondary text-secondary bg-secondary/5'
                  : 'border-transparent text-tertiary hover:text-white'
              }`}
            >
              Conditions ({session.conditions.length})
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* TAB: PRESETS */}
            {activeTab === 'presets' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BUFF_PRESETS.map((preset) => {
                  const isActive = activeBuffIds.includes(preset.id)
                  return (
                    <div
                      key={preset.id}
                      className={`p-4 border transition-all flex flex-col justify-between ${
                        isActive
                          ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,218,243,0.15)]'
                          : 'border-outline-variant/30 bg-surface-container-low hover:border-outline'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-headline text-sm font-bold text-on-surface">
                            {preset.name}
                          </h4>
                          <span
                            className={`font-label text-[9px] uppercase px-1.5 py-0.5 border ${
                              isActive
                                ? 'border-primary text-primary'
                                : 'border-outline text-tertiary'
                            }`}
                          >
                            {isActive ? 'ACTIVE' : 'READY'}
                          </span>
                        </div>
                        <p className="font-body text-xs text-on-surface-variant/80 mb-3">
                          {preset.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleTogglePreset(preset)}
                        className={`w-full py-2 font-label text-xs uppercase tracking-widest transition-all ${
                          isActive
                            ? 'bg-error/20 border border-error text-error hover:bg-error/30'
                            : 'bg-primary/20 border border-primary text-primary hover:bg-primary/30'
                        }`}
                      >
                        {isActive ? 'DISMISS BUFF' : 'ENGAGE BUFF'}
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
                  <p className="text-center font-label text-xs text-tertiary py-8 uppercase tracking-widest">
                    No buffs configured for this character.
                  </p>
                ) : (
                  allAvailableBuffs.map((buff) => {
                    const isActive = activeBuffIds.includes(buff.id)
                    return (
                      <div
                        key={buff.id}
                        className={`p-4 border transition-all flex items-center justify-between gap-4 ${
                          isActive
                            ? 'border-primary bg-primary/10'
                            : 'border-outline-variant/20 bg-surface-container-low opacity-75'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isActive ? 'bg-primary shadow-[0_0_8px_#00daf3]' : 'bg-tertiary/40'
                              }`}
                            />
                            <h4 className="font-headline text-sm font-bold text-on-surface truncate">
                              {buff.name}
                            </h4>
                            {buff.isCustom && (
                              <span className="font-label text-[9px] text-secondary border border-secondary/40 px-1">
                                CUSTOM
                              </span>
                            )}
                          </div>
                          <p className="font-label text-xs text-tertiary mt-1">
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
                            className={`px-3 py-1.5 font-label text-xs uppercase tracking-wider border transition-all ${
                              isActive
                                ? 'border-primary text-primary bg-primary/20 hover:bg-primary/30'
                                : 'border-outline text-tertiary hover:text-white'
                            }`}
                          >
                            {isActive ? 'ON' : 'OFF'}
                          </button>

                          {buff.isCustom && (
                            <button
                              onClick={() => removeCustomBuff(char.id, buff.id)}
                              className="p-1.5 text-tertiary hover:text-error transition-colors"
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
                  <label className="block font-label text-xs text-secondary uppercase tracking-wider mb-1">
                    Buff / Spell Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Divine Favor, Cat's Grace, Heroism..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 px-3 py-2 font-body text-sm text-on-surface focus:border-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-label text-xs text-tertiary uppercase tracking-wider mb-1">
                      Attack Mod
                    </label>
                    <input
                      type="number"
                      value={attackMod}
                      onChange={(e) => setAttackMod(parseInt(e.target.value) || 0)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 px-3 py-2 font-label text-sm text-center text-on-surface focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-label text-xs text-tertiary uppercase tracking-wider mb-1">
                      Damage Mod
                    </label>
                    <input
                      type="number"
                      value={damageMod}
                      onChange={(e) => setDamageMod(parseInt(e.target.value) || 0)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 px-3 py-2 font-label text-sm text-center text-on-surface focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-label text-xs text-tertiary uppercase tracking-wider mb-1">
                      AC Mod
                    </label>
                    <input
                      type="number"
                      value={acMod}
                      onChange={(e) => setAcMod(parseInt(e.target.value) || 0)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 px-3 py-2 font-label text-sm text-center text-on-surface focus:border-primary outline-none"
                    />
                  </div>
                </div>

                {/* Saves Section */}
                <div className="p-3 border border-outline-variant/20 bg-surface-container-low">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-label text-xs text-secondary uppercase tracking-wider">
                      Saving Throws
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSaveType('all')}
                        className={`font-label text-[10px] uppercase px-2 py-0.5 border ${
                          saveType === 'all' ? 'border-primary text-primary' : 'border-outline text-tertiary'
                        }`}
                      >
                        All Saves
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveType('specific')}
                        className={`font-label text-[10px] uppercase px-2 py-0.5 border ${
                          saveType === 'specific' ? 'border-primary text-primary' : 'border-outline text-tertiary'
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
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 px-3 py-2 font-label text-sm text-center text-on-surface focus:border-primary outline-none"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="block font-label text-[10px] text-tertiary mb-1">FORT</span>
                        <input
                          type="number"
                          value={fortMod}
                          onChange={(e) => setFortMod(parseInt(e.target.value) || 0)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 px-2 py-1 font-label text-xs text-center text-on-surface focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <span className="block font-label text-[10px] text-tertiary mb-1">REF</span>
                        <input
                          type="number"
                          value={refMod}
                          onChange={(e) => setRefMod(parseInt(e.target.value) || 0)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 px-2 py-1 font-label text-xs text-center text-on-surface focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <span className="block font-label text-[10px] text-tertiary mb-1">WILL</span>
                        <input
                          type="number"
                          value={willMod}
                          onChange={(e) => setWillMod(parseInt(e.target.value) || 0)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 px-2 py-1 font-label text-xs text-center text-on-surface focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Ability Scores Section */}
                <div className="p-3 border border-outline-variant/20 bg-surface-container-low">
                  <span className="block font-label text-xs text-secondary uppercase tracking-wider mb-2">
                    Ability Score Enhancements (+/-)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block font-label text-[10px] text-tertiary mb-1">STR</span>
                      <input
                        type="number"
                        value={strMod}
                        onChange={(e) => setStrMod(parseInt(e.target.value) || 0)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 px-2 py-1 font-label text-xs text-center text-on-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <span className="block font-label text-[10px] text-tertiary mb-1">DEX</span>
                      <input
                        type="number"
                        value={dexMod}
                        onChange={(e) => setDexMod(parseInt(e.target.value) || 0)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 px-2 py-1 font-label text-xs text-center text-on-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <span className="block font-label text-[10px] text-tertiary mb-1">CON</span>
                      <input
                        type="number"
                        value={conMod}
                        onChange={(e) => setConMod(parseInt(e.target.value) || 0)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 px-2 py-1 font-label text-xs text-center text-on-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-label text-xs text-tertiary uppercase tracking-wider mb-1">
                      Extra Damage Dice
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1d6 or 2d6"
                      value={extraDice}
                      onChange={(e) => setExtraDice(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 px-3 py-2 font-label text-sm text-on-surface focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer font-label text-xs text-tertiary uppercase">
                      <input
                        type="checkbox"
                        checked={meleeOnly}
                        onChange={(e) => setMeleeOnly(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      Melee weapons only
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <span className="font-label text-xs text-tertiary uppercase">Accent:</span>
                  {(['primary', 'secondary', 'error'] as const).map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 border transition-all ${
                        c === 'primary' ? 'bg-primary' : c === 'secondary' ? 'bg-secondary' : 'bg-error'
                      } ${color === c ? 'ring-2 ring-white scale-110' : 'opacity-60'}`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-4 bg-primary text-on-primary font-label text-sm uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all font-bold"
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
                      className={`p-4 border transition-all flex flex-col justify-between ${
                        isActive
                          ? 'border-error bg-error/10 shadow-[0_0_15px_rgba(255,180,171,0.2)]'
                          : 'border-outline-variant/30 bg-surface-container-low hover:border-outline'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-headline text-sm font-bold text-on-surface">
                            {info.name}
                          </h4>
                          <span
                            className={`font-label text-[9px] uppercase px-1.5 py-0.5 border ${
                              isActive
                                ? 'border-error text-error font-bold'
                                : 'border-outline text-tertiary'
                            }`}
                          >
                            {isActive ? 'AFFLICTED' : 'CLEAR'}
                          </span>
                        </div>
                        <p className="font-body text-xs text-on-surface-variant mb-2">
                          {info.summary}
                        </p>
                        <ul className="space-y-0.5 font-label text-[10px] text-tertiary">
                          {info.penalties.map((pen, i) => (
                            <li key={i}>• {pen}</li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => toggleCondition(char.id, cond)}
                        className={`w-full mt-3 py-1.5 font-label text-xs uppercase tracking-widest border transition-all ${
                          isActive
                            ? 'bg-error/20 border-error text-error hover:bg-error/30'
                            : 'border-outline text-tertiary hover:text-white hover:border-primary'
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
