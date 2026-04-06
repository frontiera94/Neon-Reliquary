import { motion } from 'framer-motion'
import type { DiceType } from '../../types/dice'

interface Props {
  diceType: DiceType
}

export function DiceRollingAnimation({ diceType }: Props) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Spinning dice icon */}
      <motion.div
        animate={{ rotate: 360, scale: [1, 1.2, 0.9, 1.1, 1] }}
        transition={{ rotate: { duration: 0.6, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.4, repeat: Infinity } }}
        className="relative"
        style={{ filter: 'drop-shadow(0 0 16px rgba(0,218,243,0.8))' }}
      >
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '5rem' }}>
          casino
        </span>
      </motion.div>

      {/* Motion blur trail */}
      <div
        className="w-48 h-4"
        style={{ background: 'linear-gradient(to right, transparent, rgba(0,218,243,0.25), transparent)', filter: 'blur(8px)' }}
      />

      {/* Running numbers */}
      <motion.span
        key={Date.now()}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.15, repeat: Infinity }}
        className="font-label text-4xl font-black text-primary/60"
      >
        d{diceType}
      </motion.span>

      {/* Particle sparks */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 bg-primary rounded-full"
            animate={{ y: [-8, 8, -8], opacity: [0, 1, 0] }}
            transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08 }}
          />
        ))}
      </div>
    </div>
  )
}
