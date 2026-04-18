import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { calcEffectiveWeapon } from '../lib/combat-calc'
import { parseDiceFormula } from '../lib/dice-engine'
import { CombatHPWidget } from '../components/combat/CombatHPWidget'
import { SummonSection } from '../components/combat/SummonSection'
import { SummonedCreaturePanel } from '../components/combat/SummonedCreaturePanel'
import { WeaponCard } from '../components/combat/WeaponCard'

export function CombatPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => char ? s.getSession(char.id) : null)
  const { toggleBuff, adjustHp, initSession, setAmmo, setSummon, adjustSummonHp, clearSummon } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)

  if (!char) return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )
  if (!session) { initSession(char.id, char.maxHp); return null }

  const activeBuffIds = session.activeBuffIds
  const twfActive = char.buffs.some((b) => b.isTwf && activeBuffIds.includes(b.id))
  const hasTwfFeat = char.feats.some((f) => /two.weapon fighting/i.test(f.name))
  const offhandPenalty = hasTwfFeat ? 0 : -4
  const extraDiceBuff = char.buffs.find((b) => b.extraDamageDice && activeBuffIds.includes(b.id))
  const sneakAttackDice = extraDiceBuff?.extraDamageDice
  const extraDiceLabel = extraDiceBuff
    ? extraDiceBuff.name.split(' ').slice(0, 2).join(' ')
    : 'Extra Dmg'
  const totalAcMod = char.buffs
    .filter((b) => activeBuffIds.includes(b.id))
    .reduce((sum, b) => sum + b.acMod, 0)

  const summonableSpells = char.spells.filter((s) => s.summonOptions && s.summonOptions.length > 0)
  const activeSummon = session.activeSummon
  const activeSummonOption = activeSummon
    ? summonableSpells.flatMap((s) => s.summonOptions ?? []).find((o) => o.id === activeSummon.optionId) ?? null
    : null

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Global Buff Bar */}
      <section className="w-full">
        <div className="flex flex-col md:flex-row gap-3">
          {char.buffs.map((buff) => {
            const isActive = activeBuffIds.includes(buff.id)
            const hex = { primary: '#00daf3', secondary: '#e9c349', error: '#ffb4ab' }[buff.color ?? 'primary'] ?? '#00daf3'
            return (
              <button
                key={buff.id}
                onClick={() => toggleBuff(char.id, buff.id)}
                className="flex flex-1 items-center justify-between p-5 border transition-all cursor-pointer text-left bg-surface-container hover:bg-surface-container-high"
                style={isActive ? {
                  borderColor: hex,
                  backgroundColor: `${hex}1a`,
                  boxShadow: `0 0 20px ${hex}40`,
                } : { borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <div className="flex items-center gap-3">
                  {/* Active indicator dot */}
                  <div
                    className="w-3 h-3 flex-shrink-0 transition-all"
                    style={isActive
                      ? { backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }
                      : { backgroundColor: 'rgba(255,255,255,0.15)' }}
                  />
                  <div>
                    <p
                      className="font-headline text-base font-bold uppercase tracking-widest transition-colors"
                      style={{ color: isActive ? hex : undefined }}
                    >
                      {buff.name}
                    </p>
                    <p
                      className="font-label text-[11px] mt-0.5 transition-colors"
                      style={{ color: isActive ? hex : undefined }}
                    >
                      {isActive ? [
                        buff.attackMod !== 0 ? `${buff.attackMod > 0 ? '+' : ''}${buff.attackMod} Att` : '',
                        buff.damageMod !== 0 ? `+${buff.damageMod} Dmg` : '',
                        buff.acMod !== 0 ? `${buff.acMod > 0 ? '+' : ''}${buff.acMod} AC` : '',
                      ].filter(Boolean).join(' / ') || 'Active'
                      : <span className="text-tertiary">Inactive</span>}
                    </p>
                  </div>
                </div>
                {/* Toggle badge */}
                <span
                  className="font-label text-[10px] uppercase tracking-widest px-3 py-1.5 flex-shrink-0 border transition-all"
                  style={isActive
                    ? { color: hex, borderColor: hex, boxShadow: `0 0 8px ${hex}` }
                    : { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  {isActive ? 'ON' : 'OFF'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* HP Widget */}
      <CombatHPWidget
        hp={session.currentHp}
        maxHp={char.maxHp}
        ac={char.armorClass.total + totalAcMod}
        onAdjust={(d) => adjustHp(char.id, d, char.maxHp)}
      />

      {/* Summon Ally Picker — only for characters with SNA spells */}
      {summonableSpells.length > 0 && (
        <SummonSection
          spells={summonableSpells}
          activeSummonId={activeSummon?.optionId ?? null}
          onSelect={(spellId, opt) => {
            if (activeSummon?.optionId === opt.id) {
              clearSummon(char.id)
            } else {
              setSummon(char.id, { spellId, optionId: opt.id, currentHp: opt.hp })
            }
          }}
        />
      )}

      {/* Weapon Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {char.weapons.map((weapon) => {
          const effective = calcEffectiveWeapon(weapon, char.buffs, activeBuffIds)
          const ammo = weapon.type === 'ranged'
            ? (session.ammo[weapon.id] ?? weapon.currentAmmo ?? weapon.maxAmmo ?? 0)
            : undefined
          return (
            <WeaponCard
              key={weapon.id}
              weapon={weapon}
              effective={effective}
              ammo={ammo}
              maxAmmo={weapon.maxAmmo}
              twfActive={twfActive}
              offhandPenalty={offhandPenalty}
              sneakAttackDice={sneakAttackDice}
              extraDiceLabel={extraDiceLabel}
              onAttackRoll={() => openRoll({
                diceType: 20,
                count: 1,
                modifier: effective.attackBonus[0],
                label: `${weapon.name} Attack`,
                critRange: weapon.critRange,
              })}
              onOffhandRoll={() => openRoll({
                diceType: 20,
                count: 1,
                modifier: effective.attackBonus[0] + offhandPenalty,
                label: `${weapon.name} Off-hand`,
                critRange: weapon.critRange,
              })}
              onDamageRoll={() => {
                const { count, sides, bonus } = parseDiceFormula(weapon.damageDice)
                openRoll({
                  diceType: sides,
                  count,
                  modifier: effective.damageBonus + bonus,
                  label: `${weapon.name} Damage`,
                })
              }}
              onSneakAttackRoll={sneakAttackDice ? () => {
                const { count, sides } = parseDiceFormula(sneakAttackDice)
                openRoll({ diceType: sides, count, modifier: 0, label: 'Sneak Attack' })
              } : undefined}
              onAmmoChange={weapon.type === 'ranged' ? (v) => setAmmo(char.id, weapon.id, v) : undefined}
            />
          )
        })}
      </div>

      {/* Summoned Creature Panel */}
      {activeSummonOption && activeSummon && (
        <>
          {/* Divider */}
          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-primary/40" />
            <span className="font-label text-[10px] text-primary uppercase tracking-[0.25em] flex-shrink-0">
              Summoned Ally
            </span>
            <div className="flex-1 h-px bg-primary/40" />
          </div>

          <SummonedCreaturePanel
            option={activeSummonOption}
            currentHp={activeSummon.currentHp}
            onAdjustHp={(d) => adjustSummonHp(char.id, d)}
            onDismiss={() => clearSummon(char.id)}
            openRoll={openRoll}
          />
        </>
      )}
    </div>
  )
}
