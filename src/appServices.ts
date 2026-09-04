import type { ProgressDatabase } from '@/db'
import { DexieProgressCommands } from '@/progress/commands'
import { DexieProgressQueries } from '@/progress/queries'
import type { ProgressCommands, ProgressQueries } from '@/progress/types'
import { RegisterExerciseUseCase } from '@/progress/write/exercises/application/RegisterExerciseUseCase'
import type { RegisterExerciseCommand } from '@/progress/write/exercises/application/requests/RegisterExerciseCommand'
import { DexieExerciseRepo } from '@/progress/write/exercises/infra/db/DexieExerciseRepo'
import type { UseCase } from '@/progress/write/shared/UseCase'
import { IdGenerator } from '@/progress/write/shared/infra/IdGenerator'
import { SystemClock } from '@/progress/write/shared/infra/SystemClock'
import { DexieUnitOfWork } from '@/progress/write/shared/infra/db/DexieUnitOfWork'

export type AppUseCases = {
  readonly registerExercise: UseCase<RegisterExerciseCommand>
}

export type AppServices = {
  readonly database: ProgressDatabase
  readonly queries: ProgressQueries
  readonly commands: ProgressCommands
  readonly useCases: AppUseCases
}

export function createAppServices(database: ProgressDatabase): AppServices {
  const unitOfWork = new DexieUnitOfWork(database)
  const exerciseRepo = new DexieExerciseRepo(database)
  const idGenerator = new IdGenerator()
  const clock = new SystemClock()

  return {
    database,
    queries: new DexieProgressQueries(database),
    commands: new DexieProgressCommands(database),
    useCases: {
      registerExercise: new RegisterExerciseUseCase(
        unitOfWork,
        exerciseRepo,
        idGenerator,
        clock
      )
    }
  }
}
