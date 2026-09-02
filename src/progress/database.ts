import Dexie, { type EntityTable } from 'dexie'

import type { DailyCompletion, Exercise, RepLog } from '@/progress/types'

export class ProgressDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  repLogs!: EntityTable<RepLog, 'id'>
  dailyCompletions!: EntityTable<DailyCompletion, 'day'>

  constructor(name = 'progress') {
    super(name)

    this.version(1).stores({
      exercises: 'id, archivedAt, createdAt',
      repLogs: 'id, day, [exerciseId+day], createdAt',
      dailyCompletions: 'day, earnedAt'
    })
  }
}

export const progressDatabase = new ProgressDatabase()

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    return false
  }

  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
