export const ALTERNATIVE_ACTIVITY_PERCENTAGES = [0, 25, 50, 75, 100] as const

export type AlternativeActivityPercentageValue =
  (typeof ALTERNATIVE_ACTIVITY_PERCENTAGES)[number]

export class InvalidAlternativeActivityPercentageError extends Error {}

export class AlternativeActivityPercentage {
  private constructor(
    public readonly value: AlternativeActivityPercentageValue
  ) {}

  public static from(value: number): AlternativeActivityPercentage {
    const allowedValue = ALTERNATIVE_ACTIVITY_PERCENTAGES.find(
      (percentage) => percentage === value
    )

    if (allowedValue === undefined) {
      throw new InvalidAlternativeActivityPercentageError(
        'Alternative activity percentage must be 0, 25, 50, 75, or 100.'
      )
    }

    return new AlternativeActivityPercentage(allowedValue)
  }

  public effectiveDailyGoalFor(dailyGoal: number): number {
    return Math.round((dailyGoal * (100 - this.value)) / 100)
  }
}
