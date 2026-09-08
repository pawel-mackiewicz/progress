import { describe, expect, it } from 'vitest'

import { PlayerStats } from '@/progress/write/exercises/domain/PlayerStats'

function applyCompletedDays(stats: PlayerStats, count: number) {
  let updated = stats

  for (let completedDay = 0; completedDay < count; completedDay += 1) {
    updated = updated.apply(true).stats
  }

  return updated
}

describe('an athlete’s finalized progression', () => {
  it('records a day where every planned goal was reached as completed', () => {
    const completedDay = PlayerStats.initial().apply(true)

    expect(completedDay.result).toBe('COMPLETED')
    expect(completedDay.stats.toSnapshot()).toEqual({
      currentStreak: 1,
      availableShields: 0,
      completedDaysTowardNextShield: 1
    })
  })

  it('earns one shield for every four new completed days', () => {
    const stats = applyCompletedDays(PlayerStats.initial(), 4)

    expect(stats.toSnapshot()).toEqual({
      currentStreak: 4,
      availableShields: 1,
      completedDaysTowardNextShield: 0
    })
  })

  it('caps inventory at two and discards each extra four-day reward', () => {
    const stats = applyCompletedDays(PlayerStats.initial(), 12)

    expect(stats.toSnapshot()).toEqual({
      currentStreak: 12,
      availableShields: 2,
      completedDaysTowardNextShield: 0
    })
  })

  it('spends a shield while preserving the streak and resetting reward progress', () => {
    const beforeMiss = PlayerStats.restore({
      currentStreak: 6,
      availableShields: 1,
      completedDaysTowardNextShield: 2
    })

    const protectedDay = beforeMiss.apply(false)

    expect(protectedDay.result).toBe('SHIELDED')
    expect(protectedDay.stats.toSnapshot()).toEqual({
      currentStreak: 6,
      availableShields: 0,
      completedDaysTowardNextShield: 0
    })
  })

  it('lets an unprotected failed day reset the streak and reward progress', () => {
    const beforeMiss = PlayerStats.restore({
      currentStreak: 3,
      availableShields: 0,
      completedDaysTowardNextShield: 3
    })

    const failedDay = beforeMiss.apply(false)

    expect(failedDay.result).toBe('FAILED')
    expect(failedDay.stats.toSnapshot()).toEqual({
      currentStreak: 0,
      availableShields: 0,
      completedDaysTowardNextShield: 0
    })
  })
})
