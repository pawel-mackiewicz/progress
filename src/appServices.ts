import type { ProgressDatabase } from '@/db'
import { DexieProgressQueries } from '@/progress/queries'
import type { ProgressQueries } from '@/progress/types'
import {
  AddRepUseCase,
  type AddRepResult
} from '@/progress/write/exercises/application/AddRepUseCase'
import {
  ArchiveExerciseUseCase,
  type ArchiveExerciseResult
} from '@/progress/write/exercises/application/ArchiveExerciseUseCase'
import {
  PrepareTodayTrainingDayUseCase,
  type PreparedTodayTrainingDay
} from '@/progress/write/exercises/application/PrepareTodayTrainingDayUseCase'
import { RegisterExerciseUseCase } from '@/progress/write/exercises/application/RegisterExerciseUseCase'
import { RestoreExerciseUseCase } from '@/progress/write/exercises/application/RestoreExerciseUseCase'
import { UndoRepUseCase } from '@/progress/write/exercises/application/UndoRepUseCase'
import {
  UpdateExerciseUseCase,
  type UpdateExerciseResult
} from '@/progress/write/exercises/application/UpdateExerciseUseCase'
import type { AddRepCommand } from '@/progress/write/exercises/application/requests/AddRepCommand'
import type { ArchiveExerciseCommand } from '@/progress/write/exercises/application/requests/ArchiveExerciseCommand'
import type { RegisterExerciseCommand } from '@/progress/write/exercises/application/requests/RegisterExerciseCommand'
import type { RestoreExerciseCommand } from '@/progress/write/exercises/application/requests/RestoreExerciseCommand'
import type { UndoRepCommand } from '@/progress/write/exercises/application/requests/UndoRepCommand'
import type { UpdateExerciseCommand } from '@/progress/write/exercises/application/requests/UpdateExerciseCommand'
import { DexieDayOutcomeRepo } from '@/progress/write/exercises/infra/db/DexieDayOutcomeRepo'
import { DexieExerciseRepo } from '@/progress/write/exercises/infra/db/DexieExerciseRepo'
import { DexiePlayerStatsRepo } from '@/progress/write/exercises/infra/db/DexiePlayerStatsRepo'
import { DexieTrainingDayRepo } from '@/progress/write/exercises/infra/db/DexieTrainingDayRepo'
import type { UseCase } from '@/progress/write/shared/UseCase'
import { IdGenerator } from '@/progress/write/shared/infra/IdGenerator'
import { SystemClock } from '@/progress/write/shared/infra/SystemClock'
import { DexieUnitOfWork } from '@/progress/write/shared/infra/db/DexieUnitOfWork'

export type AppUseCases = {
  readonly prepareTodayTrainingDay: UseCase<void, PreparedTodayTrainingDay>
  readonly addRep: UseCase<AddRepCommand, AddRepResult>
  readonly undoRep: UseCase<UndoRepCommand>
  readonly registerExercise: UseCase<RegisterExerciseCommand>
  readonly updateExercise: UseCase<UpdateExerciseCommand, UpdateExerciseResult>
  readonly archiveExercise: UseCase<
    ArchiveExerciseCommand,
    ArchiveExerciseResult
  >
  readonly restoreExercise: UseCase<RestoreExerciseCommand>
}

export type AppServices = {
  readonly database: ProgressDatabase
  readonly queries: ProgressQueries
  readonly useCases: AppUseCases
}

export function createAppServices(database: ProgressDatabase): AppServices {
  const unitOfWork = new DexieUnitOfWork(database)
  const exerciseRepo = new DexieExerciseRepo(database)
  const trainingDayRepo = new DexieTrainingDayRepo(database)
  const playerStatsRepo = new DexiePlayerStatsRepo(database)
  const dayOutcomeRepo = new DexieDayOutcomeRepo(database)
  const idGenerator = new IdGenerator()
  const clock = new SystemClock()

  return {
    database,
    queries: new DexieProgressQueries(database),
    useCases: {
      prepareTodayTrainingDay: new PrepareTodayTrainingDayUseCase(
        unitOfWork,
        exerciseRepo,
        trainingDayRepo,
        playerStatsRepo,
        dayOutcomeRepo,
        clock
      ),
      addRep: new AddRepUseCase(
        unitOfWork,
        exerciseRepo,
        trainingDayRepo,
        idGenerator,
        clock
      ),
      undoRep: new UndoRepUseCase(unitOfWork, trainingDayRepo, clock),
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
        trainingDayRepo,
        clock
      ),
      archiveExercise: new ArchiveExerciseUseCase(
        unitOfWork,
        exerciseRepo,
        trainingDayRepo,
        clock
      ),
      restoreExercise: new RestoreExerciseUseCase(
        unitOfWork,
        exerciseRepo,
        trainingDayRepo,
        clock
      )
    }
  }
}
