import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { DiceType } from '../../types/dice'

interface Props {
  diceType: DiceType
}

export function DiceRollingAnimation({ diceType }: Props) {
  const [cyclingNumber, setCyclingNumber] = useState<number>(() => Math.floor(Math.random() * diceType) + 1)

  useEffect(() => {
    const timer = setInterval(() => {
      setCyclingNumber(Math.floor(Math.random() * diceType) + 1)
    }, 60)
    return () => clearInterval(timer)
  }, [diceType])

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 3D Spinning dice icon with energy rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer energy shockwave ring */}
        <motion.div
          animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.7, 0.3], rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="absolute w-28 h-28 rounded-full border border-dashed border-primary/40 pointer-events-none"
        />
        {/* Inner secondary ring */}
        <motion.div
          animate={{ scale: [1.2, 0.9, 1.2], opacity: [0.2, 0.6, 0.2], rotate: -360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          className="absolute w-24 h-24 rounded-full border border-secondary/30 pointer-events-none"
        />

        <motion.div
          animate={{
            rotate: [0, 90, 180, 270, 360],
            scale: [1, 1.15, 0.92, 1.08, 1],
          }}
          transition={{
            rotate: { duration: 0.6, repeat: Infinity, ease: 'linear' },
            scale: { duration: 0.45, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="relative z-10"
          style={{ filter: 'drop-shadow(0 0 20px rgba(0,240,255,0.85))' }}
        >
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '5rem' }}>
            casino
          </span>
        </motion.div>
      </div>

      {/* Motion blur trail */}
      <div
        className="w-48 h-3 rounded-full"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(0,240,255,0.4), rgba(217,70,239,0.3), transparent)',
          filter: 'blur(6px)',
        }}
      />

      {/* Rapid cycling number and dice badge */}
      <div className="flex flex-col items-center gap-1">
        <motion.span
          key={cyclingNumber}
          className="font-label text-4xl font-black text-primary tracking-tight tabular-nums"
          style={{ textShadow: '0 0 16px rgba(0,240,255,0.7)' }}
        >
          {cyclingNumber}
        </motion.span>
        <span className="font-label text-xs uppercase tracking-widest text-tertiary">
          d{diceType}
        </span>
      </div>

      {/* Particle sparks */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: i % 2 === 0 ? '#00f0ff' : '#d946ef',
              boxShadow: i % 2 === 0 ? '0 0 6px #00f0ff' : '0 0 6px #d946ef',
            }}
            animate={{ y: [-10, 10, -10], opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08 }}
          />
        ))}
      </div>
    </div>
  )
}
