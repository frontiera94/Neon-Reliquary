import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { calcEffectiveWeapon, formatAttackBonus, formatDamage } from '../lib/combat-calc'
import { parseDiceFormula } from '../lib/dice-engine'
import type { Weapon } from '../types/combat'

export function CombatPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const session = useSessionStore((s) => char ? s.getSession(char.id) : null)
  const { toggleBuff, adjustHp, initSession, setAmmo } = useSessionStore()
  const openRoll = useDiceStore((s) => s.openRoll)

  if (!char) return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )
  if (!session) { initSession(char.id, char.maxHp); return null }

  const activeBuffIds = session.activeBuffIds

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
        ac={char.armorClass.total}
        onAdjust={(d) => adjustHp(char.id, d, char.maxHp)}
      />

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
              onAttackRoll={() => openRoll({
                diceType: 20,
                count: 1,
                modifier: effective.attackBonus[0],
                label: `${weapon.name} Attack`,
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
              onAmmoChange={weapon.type === 'ranged' ? (v) => setAmmo(char.id, weapon.id, v) : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}


function CombatHPWidget({
  hp, maxHp, ac, onAdjust,
}: {
  hp: number
  maxHp: number
  ac: number
  onAdjust: (delta: number) => void
}) {
  const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  return (
    <section className="bg-surface-container p-6 flex flex-col md:flex-row items-center gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onAdjust(-1)}
          className="w-12 h-12 bg-surface-container-high hover:bg-error-container text-primary hover:text-on-error transition-all active:scale-95 flex items-center justify-center"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <div className="text-center">
          <span className="font-label text-4xl font-black text-primary">{hp}</span>
          <span className="font-label text-tertiary text-lg"> / {maxHp}</span>
        </div>
        <button
          onClick={() => onAdjust(1)}
          className="w-12 h-12 bg-surface-container-high hover:bg-primary-container text-primary hover:text-on-primary transition-all active:scale-95 flex items-center justify-center"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {/* HP Bar */}
      <div className="flex-1 w-full">
        <div className="h-3 bg-surface-container-lowest overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #00daf3 0%, #93000a 100%)',
            }}
          />
        </div>
      </div>

      {/* AC */}
      <div className="bg-surface-container-high px-6 py-4 text-center">
        <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">AC</p>
        <p className="font-label text-3xl font-bold text-on-surface">{ac}</p>
      </div>
    </section>
  )
}

function WeaponCard({
  weapon,
  effective,
  ammo,
  maxAmmo,
  onAttackRoll,
  onDamageRoll,
  onAmmoChange,
}: {
  weapon: Weapon
  effective: ReturnType<typeof calcEffectiveWeapon>
  ammo?: number
  maxAmmo?: number
  onAttackRoll: () => void
  onDamageRoll: () => void
  onAmmoChange?: (v: number) => void
}) {
  const borderColor = weapon.type === 'melee' ? 'border-primary' : 'border-secondary'
  return (
    <div className={`bg-surface-container p-6 relative group transition-all hover:bg-surface-container-high border-l-4 ${borderColor}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className={`text-[10px] font-label uppercase tracking-[0.2em] mb-1 block ${weapon.type === 'melee' ? 'text-primary' : 'text-secondary'}`}>
            {weapon.type === 'melee' ? 'Melee' : 'Ranged'}
          </span>
          <h3 className="text-2xl font-headline font-bold text-on-surface">{weapon.name}</h3>
          <div className="flex gap-2 mt-2 flex-wrap">
            {weapon.tags.map((tag) => (
              <span key={tag} className="bg-surface-container-lowest px-2 py-1 text-[10px] font-label text-secondary border border-secondary/20 uppercase tracking-widest">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-label text-tertiary uppercase opacity-50 mb-1">Critical</p>
          <p className="text-lg font-label text-secondary-fixed-dim font-bold">
            {weapon.critRange < 20 ? `${weapon.critRange}-20` : '20'} / x{weapon.critMultiplier}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className={`grid gap-4 ${weapon.type === 'ranged' ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <button
          onClick={onAttackRoll}
          className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-primary to-primary-container text-on-primary hover:shadow-[0_0_30px_rgba(0,218,243,0.2)] transition-all active:scale-95"
        >
          <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-80">Attack</span>
          <span className="text-3xl font-black font-label">{formatAttackBonus(effective.attackBonus)}</span>
        </button>
        <button
          onClick={onDamageRoll}
          className="flex flex-col items-center justify-center py-6 bg-surface-container-lowest border border-outline-variant/30 text-secondary hover:bg-surface-container-highest transition-all"
        >
          <span className="text-[10px] font-label uppercase tracking-widest mb-1 opacity-60">Damage</span>
          <span className="text-2xl font-bold font-label">
            {formatDamage(weapon.damageDice, effective.damageBonus)}
          </span>
        </button>

        {/* Ammo tracker */}
        {weapon.type === 'ranged' && maxAmmo !== undefined && ammo !== undefined && onAmmoChange && (
          <div className="flex flex-col items-center justify-center bg-surface-container-lowest border border-outline-variant/20 py-2 px-3 gap-1">
            <p className="font-label text-[10px] text-tertiary uppercase tracking-widest mb-1">Ammo</p>
            <div className="flex flex-wrap gap-0.5 justify-center">
              {Array.from({ length: maxAmmo }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onAmmoChange(i < ammo ? ammo - 1 : ammo + 1)}
                  className={`w-2 h-5 transition-all ${i < ammo ? 'bg-secondary' : 'bg-surface-container-high'}`}
                  aria-label={`Ammo ${i + 1}`}
                />
              ))}
            </div>
            <p className="font-label text-xs text-secondary mt-1">{ammo}/{maxAmmo}</p>
          </div>
        )}
      </div>
    </div>
  )
}
