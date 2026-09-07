import Dexie, { type EntityTable } from 'dexie'

import type {
  PersistedDailyCompletion,
  PersistedExercise,
  PersistedRepLog,
  PersistedTrainingDay
} from '@/progress/infra/db/PersistedProgress'

export class ProgressDatabase extends Dexie {
  exercises!: EntityTable<PersistedExercise, 'id'>
  repLogs!: EntityTable<PersistedRepLog, 'id'>
  dailyCompletions!: EntityTable<PersistedDailyCompletion, 'day'>
  trainingDays!: EntityTable<PersistedTrainingDay, 'day'>

  public constructor(name = 'progress') {
    super(name)

    this.version(1).stores({
      exercises: 'id, archivedAt, createdAt',
      repLogs: 'id, day, [exerciseId+day], createdAt',
      dailyCompletions: 'day, earnedAt'
    })

    this.version(2).stores({
      trainingDays: 'day'
    })
  }
}
