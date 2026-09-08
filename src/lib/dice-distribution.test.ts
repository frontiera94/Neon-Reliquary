import { describe, it, expect } from 'vitest'
import { rollDice } from './dice-engine'

describe('Monte Carlo Statistical Tests for Dice Engine', () => {
  it('passes Pearson Chi-Square goodness-of-fit test for uniform d20 distribution', () => {
    const N = 10000
    const sides = 20
    const expected = N / sides // 500 for each face

    const counts: Record<number, number> = {}
    for (let i = 1; i <= sides; i++) {
      counts[i] = 0
    }

    let sum = 0
    for (let i = 0; i < N; i++) {
      const result = rollDice({ diceType: 20, count: 1, modifier: 0, label: 'Monte Carlo' })
      const val = result.naturalRolls[0]
      counts[val] = (counts[val] ?? 0) + 1
      sum += val
    }

    // 1. Check all faces 1..20 appeared
    for (let i = 1; i <= sides; i++) {
      expect(counts[i]).toBeGreaterThan(0)
    }

    // 2. Calculate Chi-Square statistic: sum((O - E)^2 / E)
    let chiSquare = 0
    for (let i = 1; i <= sides; i++) {
      const observed = counts[i]
      chiSquare += Math.pow(observed - expected, 2) / expected
    }

    // For df = 19, critical value at alpha = 0.001 (99.9% confidence) is 43.82.
    // A fair crypto random generator should have chiSquare < 43.82 with overwhelming probability.
    expect(chiSquare).toBeLessThan(45)

    // 3. Sample Mean should be very close to theoretical expected mean (10.5)
    const sampleMean = sum / N
    expect(sampleMean).toBeGreaterThan(10.2)
    expect(sampleMean).toBeLessThan(10.8)
  })

  it('validates critical threat frequency for 19-20 and 20 ranges', () => {
    const N = 5000

    let critsRange20 = 0
    let critsRange19 = 0

    for (let i = 0; i < N; i++) {
      const roll20 = rollDice({
        diceType: 20,
        count: 1,
        modifier: 0,
        label: 'Threat 20',
        critRange: 20,
      })
      if (roll20.isCriticalThreat) critsRange20++

      const roll19 = rollDice({
        diceType: 20,
        count: 1,
        modifier: 0,
        label: 'Threat 19-20',
        critRange: 19,
      })
      if (roll19.isCriticalThreat) critsRange19++
    }

    // Theoretical probability for nat 20 is 5% (250 / 5000)
    const p20 = critsRange20 / N
    expect(p20).toBeGreaterThan(0.035)
    expect(p20).toBeLessThan(0.065)

    // Theoretical probability for 19-20 is 10% (500 / 5000)
    const p19 = critsRange19 / N
    expect(p19).toBeGreaterThan(0.08)
    expect(p19).toBeLessThan(0.12)
  })

  it('handles multi-dice bell curve distributions (e.g. 3d6)', () => {
    const N = 6000
    // For 3d6: min = 3, max = 18, mean = 10.5, median = 10.5
    let sum = 0
    let count10or11 = 0
    let countExtreme = 0 // 3 or 18

    for (let i = 0; i < N; i++) {
      const result = rollDice({ diceType: 6, count: 3, modifier: 0, label: '3d6 Roll' })
      const val = result.total
      sum += val

      if (val === 10 || val === 11) count10or11++
      if (val === 3 || val === 18) countExtreme++
    }

    const mean = sum / N
    expect(mean).toBeGreaterThan(10.2)
    expect(mean).toBeLessThan(10.8)

    // In 3d6, the center (10 or 11) has ~25% probability
    const centerFreq = count10or11 / N
    expect(centerFreq).toBeGreaterThan(0.20)
    expect(centerFreq).toBeLessThan(0.30)

    // In 3d6, extremes (3 or 18) have ~0.92% probability each (total ~1.85%)
    const extremeFreq = countExtreme / N
    expect(extremeFreq).toBeGreaterThan(0.005)
    expect(extremeFreq).toBeLessThan(0.035)
  })
})
