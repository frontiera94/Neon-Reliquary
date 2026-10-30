import type { Transition, Variants } from 'framer-motion'

/**
 * Snappy tactical spring transitions (150-250ms feel).
 * Designed for immediate combat responsiveness without sluggish bounce.
 */
export const TACTICAL_SPRING: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 34,
  mass: 0.8,
}

export const SNAPPY_SPRING: Transition = {
  type: 'spring',
  stiffness: 680,
  damping: 32,
  mass: 0.6,
}

export const GENTLE_SPRING: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 0.9,
}

/**
 * Page route transition variants.
 * Fast fade and subtle lift (180ms) for instant tactical context changes.
 */
export const PAGE_VARIANTS: Variants = {
  initial: {
    opacity: 0,
    y: 6,
    filter: 'blur(3px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.12,
      ease: 'easeIn',
    },
  },
}

/**
 * Staggered container & item reveal for Bento layouts & tactical grids.
 */
export const STAGGER_CONTAINER: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
}

export const STAGGER_ITEM: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.985,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: TACTICAL_SPRING,
  },
}

/**
 * Shake / Impact animations for Critical Hits (Nat 20) and Fumbles (Nat 1).
 */
export const CRIT_HIT_SHAKE: Variants = {
  initial: { scale: 0.85, opacity: 0 },
  animate: {
    scale: [0.85, 1.15, 0.97, 1.04, 1],
    x: [0, -6, 6, -3, 3, 0],
    opacity: 1,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

export const FUMBLE_GLITCH_SHAKE: Variants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: {
    scale: [0.9, 1.05, 0.98, 1],
    x: [0, -10, 10, -7, 7, -3, 3, 0],
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
}
