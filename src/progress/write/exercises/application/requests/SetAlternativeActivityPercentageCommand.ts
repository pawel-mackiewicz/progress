import type { LocalDayKey } from '@/progress/date'
import type { AlternativeActivityPercentageValue } from '@/progress/write/exercises/domain/AlternativeActivityPercentage'

export type SetAlternativeActivityPercentageCommand = {
  day: LocalDayKey
  percentage: AlternativeActivityPercentageValue
}
