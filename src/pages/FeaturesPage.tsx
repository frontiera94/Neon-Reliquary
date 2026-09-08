import { useCharacterStore } from '../store/useCharacterStore'
import type { Feat } from '../types/features'

export function FeaturesPage() {
  const char = useCharacterStore((s) => s.activeCharacter())

  if (!char) return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )

  const signatureAbility = char.classAbilities.find((a) => a.isSignature)

  return (
    <div className="p-6 md:p-12 lg:p-16">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-12">
        <h1 className="font-headline text-5xl md:text-7xl font-bold text-white mb-4 tracking-tighter uppercase">
          Features & <span className="text-secondary neon-glow-accent">Abilities</span>
        </h1>
        <div className="h-1.5 w-24 bg-gradient-to-r from-primary to-secondary mb-8 rounded-full" />
        <p className="font-body text-tertiary text-lg max-w-2xl leading-relaxed">
          The innate powers and forged techniques of {char.name}.
        </p>
      </div>

      {/* Bento grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Summary stats */}
        <div className="md:col-span-4 bg-surface-container-high/90 backdrop-blur-sm p-6 flex flex-col justify-between border border-white/10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div>
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-primary font-bold block mb-2">
              Total Unlocked
            </span>
            <div className="font-headline text-5xl font-black text-white">{char.feats.length}</div>
          </div>
          <div className="mt-8">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary font-bold block mb-2">
              Class Abilities
            </span>
            <div className="font-headline text-3xl font-bold text-white">{char.classAbilities.length.toString().padStart(2, '0')}</div>
          </div>
        </div>

        {/* Featured ability */}
        {signatureAbility && (
          <div className="md:col-span-8 relative overflow-hidden bg-surface-container/90 backdrop-blur-sm min-h-[200px] border border-white/10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-secondary/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8">
              <span className="font-label text-[10px] uppercase tracking-[0.2em] text-primary bg-primary/20 border border-primary/30 px-2.5 py-1 mb-3 inline-block rounded-md font-bold">
                Active Signature
              </span>
              <h3 className="font-headline text-3xl font-bold text-white uppercase">
                {signatureAbility.name}
              </h3>
              <p className="font-body text-tertiary text-sm mt-2 max-w-sm">
                {signatureAbility.description}
              </p>
            </div>
          </div>
        )}

        {/* Feat accordion */}
        <div className="md:col-span-12 space-y-3 mt-4">
          {char.feats.map((feat) => (
            <FeatAccordionItem key={feat.id} feat={feat} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FeatAccordionItem({ feat }: { feat: Feat }) {
  return (
    <div className="group border border-white/10 rounded-xl overflow-hidden bg-surface-container-low/90 backdrop-blur-sm hover:border-primary/40 transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
      <details className="w-full">
        <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-surface-container transition-colors list-none">
          <div className="flex items-center gap-6">
            <span className="font-label text-secondary font-bold text-lg w-8 flex-shrink-0">
              {feat.index.toString().padStart(2, '0')}
            </span>
            <div>
              <h4 className="font-headline text-xl font-bold text-white group-hover:text-primary uppercase tracking-tight transition-colors">
                {feat.name}
              </h4>
              <p className="font-body text-tertiary text-sm italic">{feat.shortDesc}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-primary transition-transform flex-shrink-0 ml-4 group-open:rotate-180">
            expand_more
          </span>
        </summary>
        <div className="px-14 pb-8 pt-2 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="font-body text-tertiary leading-relaxed text-sm">
              {feat.fullDesc}
            </div>
            {feat.bonusValue !== undefined && feat.bonusMax !== undefined && (
              <div className="bg-surface-container-lowest p-4 border border-white/10 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="font-label text-[10px] uppercase text-primary font-bold">
                    {feat.bonusLabel ?? 'Bonus'}
                  </span>
                  <span className="font-label text-white font-bold">{feat.bonusValue >= 0 ? `+${feat.bonusValue}` : feat.bonusValue}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(feat.bonusValue / feat.bonusMax) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  )
}
