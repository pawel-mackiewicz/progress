import type { ProgressDatabase } from '@/db'
import { DexieProgressCommands } from '@/progress/commands'
import { DexieProgressQueries } from '@/progress/queries'
import type { ProgressCommands, ProgressQueries } from '@/progress/types'
import { ArchiveExerciseUseCase } from '@/progress/write/exercises/application/ArchiveExerciseUseCase'
import { RegisterExerciseUseCase } from '@/progress/write/exercises/application/RegisterExerciseUseCase'
import { RestoreExerciseUseCase } from '@/progress/write/exercises/application/RestoreExerciseUseCase'
import { UpdateExerciseUseCase } from '@/progress/write/exercises/application/UpdateExerciseUseCase'
import type { ArchiveExerciseCommand } from '@/progress/write/exercises/application/requests/ArchiveExerciseCommand'
import type { RegisterExerciseCommand } from '@/progress/write/exercises/application/requests/RegisterExerciseCommand'
import type { RestoreExerciseCommand } from '@/progress/write/exercises/application/requests/RestoreExerciseCommand'
import type { UpdateExerciseCommand } from '@/progress/write/exercises/application/requests/UpdateExerciseCommand'
import { DexieDailyCompletion } from '@/progress/write/exercises/infra/db/DexieDailyCompletion'
import { DexieExerciseRepo } from '@/progress/write/exercises/infra/db/DexieExerciseRepo'
import { DexieTrainingDayRepo } from '@/progress/write/exercises/infra/db/DexieTrainingDayRepo'
import type { UseCase } from '@/progress/write/shared/UseCase'
import { IdGenerator } from '@/progress/write/shared/infra/IdGenerator'
import { SystemClock } from '@/progress/write/shared/infra/SystemClock'
import { DexieUnitOfWork } from '@/progress/write/shared/infra/db/DexieUnitOfWork'

export type AppUseCases = {
  readonly registerExercise: UseCase<RegisterExerciseCommand>
  readonly updateExercise: UseCase<UpdateExerciseCommand>
  readonly archiveExercise: UseCase<ArchiveExerciseCommand>
  readonly restoreExercise: UseCase<RestoreExerciseCommand>
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
  const trainingDayRepo = new DexieTrainingDayRepo(database)
  const idGenerator = new IdGenerator()
  const clock = new SystemClock()
  const dailyCompletion = new DexieDailyCompletion(database, clock)

  return {
    database,
    queries: new DexieProgressQueries(database),
    commands: new DexieProgressCommands(database),
    useCases: {
      registerExercise: new RegisterExerciseUseCase(
        unitOfWork,
        exerciseRepo,
        trainingDayRepo,
        idGenerator,
        clock
      ),
      updateExercise: new UpdateExerciseUseCase(
        unitOfWork,
        exerciseRepo,
        dailyCompletion,
        clock
      ),
      archiveExercise: new ArchiveExerciseUseCase(
        unitOfWork,
        exerciseRepo,
        dailyCompletion,
        clock
      ),
      restoreExercise: new RestoreExerciseUseCase(
        unitOfWork,
        exerciseRepo,
        clock
      )
    }
  }
}
