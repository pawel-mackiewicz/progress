import Dexie, { type EntityTable, type Table } from 'dexie'

import type {
  PersistedDayOutcome,
  PersistedExercise,
  PersistedPlayerStats,
  PersistedRepLog,
  PersistedTrainingDay
} from '@/progress/infra/db/PersistedProgress'
import { shiftLocalDay, toLocalDayKey, type LocalDayKey } from '@/progress/date'
import { DayOutcome } from '@/progress/write/exercises/domain/DayOutcome'
import { PlayerStats } from '@/progress/write/exercises/domain/PlayerStats'

export const PLAYER_STATS_KEY = 'current'

export class ProgressDatabase extends Dexie {
  exercises!: EntityTable<PersistedExercise, 'id'>
  repLogs!: EntityTable<PersistedRepLog, 'id'>
  trainingDays!: EntityTable<PersistedTrainingDay, 'day'>
  dayOutcomes!: EntityTable<PersistedDayOutcome, 'day'>
  playerStats!: Table<PersistedPlayerStats, string>

  public constructor(name = 'progress', now: () => Date = () => new Date()) {
    super(name)

    this.version(1).stores({
      exercises: 'id, archivedAt, createdAt',
      repLogs: 'id, day, [exerciseId+day], createdAt',
      dailyCompletions: 'day, earnedAt'
    })

    this.version(2).stores({
      trainingDays: 'day'
    })

    this.version(3)
      .stores({
        dayOutcomes: 'day',
        playerStats: ''
      })
      .upgrade(async (transaction) => {
        const completions = await transaction
          .table<{ day: LocalDayKey }>('dailyCompletions')
          .toArray()
        const yesterday = shiftLocalDay(toLocalDayKey(now()), -1)
        const completedDays = new Set(
          completions
            .map((completion) => completion.day)
            .filter((day) => day <= yesterday)
        )
        const firstCompletedDay = [...completedDays].sort()[0]
        let stats = PlayerStats.initial()

        if (firstCompletedDay) {
          const outcomes: PersistedDayOutcome[] = []

          for (
            let day = firstCompletedDay;
            day <= yesterday;
            day = shiftLocalDay(day, 1)
          ) {
            const transition = stats.apply(completedDays.has(day))
            stats = transition.stats
            outcomes.push(new DayOutcome(day, transition.result).toSnapshot())
          }

          await transaction
            .table<PersistedDayOutcome>('dayOutcomes')
            .bulkPut(outcomes)
        }

        await transaction
          .table<PersistedPlayerStats, string>('playerStats')
          .put(stats.toSnapshot(), PLAYER_STATS_KEY)
      })

    this.version(4).stores({
      dailyCompletions: null
    })
  }
}
