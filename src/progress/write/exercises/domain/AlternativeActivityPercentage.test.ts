import { describe, expect, it } from 'vitest'

import {
  ALTERNATIVE_ACTIVITY_PERCENTAGES,
  AlternativeActivityPercentage,
  InvalidAlternativeActivityPercentageError
} from '@/progress/write/exercises/domain/AlternativeActivityPercentage'

describe('credit earned through an alternative activity', () => {
  it.each(ALTERNATIVE_ACTIVITY_PERCENTAGES)(
    'accepts the selectable %s percent contribution',
    (value) => {
      expect(AlternativeActivityPercentage.from(value).value).toBe(value)
    }
  )

  it.each([-1, 10, 50.5, 101, Number.NaN])(
    'rejects unsupported contribution %s',
    (value) => {
      expect(() => AlternativeActivityPercentage.from(value)).toThrowError(
        InvalidAlternativeActivityPercentageError
      )
    }
  )

  it('rounds the remaining work to the nearest whole rep', () => {
    const contribution = AlternativeActivityPercentage.from(75)

    expect(contribution.effectiveDailyGoalFor(5)).toBe(1)
    expect(contribution.effectiveDailyGoalFor(10)).toBe(3)
  })
})
