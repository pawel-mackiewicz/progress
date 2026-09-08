import type { DayResult } from '@/progress/write/exercises/domain/DayOutcome'

const COMPLETED_DAYS_PER_SHIELD = 4
const MAX_SHIELDS = 2

export type PlayerStatsSnapshot = {
  currentStreak: number
  availableShields: number
  completedDaysTowardNextShield: number
}

export type AppliedDay = {
  stats: PlayerStats
  result: DayResult
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

  /**
   * Applies one finalized calendar day to the athlete's progression.
   * `true` means every planned exercise goal was reached. `false` means the
   * day was missed and will become SHIELDED or FAILED based on the current
   * shield balance.
   */
  public apply(isComplete: boolean): AppliedDay {
    if (isComplete) {
      const completedDays = this.completedDaysTowardNextShield + 1

      if (completedDays === COMPLETED_DAYS_PER_SHIELD) {
        return {
          stats: new PlayerStats(
            this.currentStreak + 1,
            Math.min(this.availableShields + 1, MAX_SHIELDS),
            0
          ),
          result: 'COMPLETED'
        }
      }

      return {
        stats: new PlayerStats(
          this.currentStreak + 1,
          this.availableShields,
          completedDays
        ),
        result: 'COMPLETED'
      }
    }

    if (this.availableShields > 0) {
      return {
        stats: new PlayerStats(
          this.currentStreak,
          this.availableShields - 1,
          0
        ),
        result: 'SHIELDED'
      }
    }

    return {
      stats: new PlayerStats(0, 0, 0),
      result: 'FAILED'
    }
  }

  public toSnapshot(): PlayerStatsSnapshot {
    return {
      currentStreak: this.currentStreak,
      availableShields: this.availableShields,
      completedDaysTowardNextShield: this.completedDaysTowardNextShield
    }
  }
}
