import type { DayResult } from '@/progress/write/exercises/domain/DayOutcome'

const COMPLETED_DAYS_PER_SHIELD = 4
const MAX_SHIELDS = 2

export type PlayerStatsSnapshot = {
  currentStreak: number
  availableShields: number
  completedDaysTowardNextShield: number
}

export class PlayerStats {
  private constructor(
    public readonly currentStreak: number,
    public readonly availableShields: number,
    public readonly completedDaysTowardNextShield: number
  ) {}

  public static initial(): PlayerStats {
    return new PlayerStats(0, 0, 0)
  }

  public static restore(snapshot: PlayerStatsSnapshot): PlayerStats {
    return new PlayerStats(
      snapshot.currentStreak,
      snapshot.availableShields,
      snapshot.completedDaysTowardNextShield
    )
  }

  public resultForMiss(): Extract<DayResult, 'SHIELDED' | 'FAILED'> {
    return this.availableShields > 0 ? 'SHIELDED' : 'FAILED'
  }

  public apply(result: DayResult): PlayerStats {
    if (result === 'COMPLETED') {
      const completedDays = this.completedDaysTowardNextShield + 1

      if (completedDays === COMPLETED_DAYS_PER_SHIELD) {
        return new PlayerStats(
          this.currentStreak + 1,
          Math.min(this.availableShields + 1, MAX_SHIELDS),
          0
        )
      }

      return new PlayerStats(
        this.currentStreak + 1,
        this.availableShields,
        completedDays
      )
    }

    if (result === 'SHIELDED') {
      return new PlayerStats(
        this.currentStreak,
        Math.max(this.availableShields - 1, 0),
        0
      )
    }

    return new PlayerStats(0, this.availableShields, 0)
  }

  public toSnapshot(): PlayerStatsSnapshot {
    return {
      currentStreak: this.currentStreak,
      availableShields: this.availableShields,
      completedDaysTowardNextShield: this.completedDaysTowardNextShield
    }
  }
}
