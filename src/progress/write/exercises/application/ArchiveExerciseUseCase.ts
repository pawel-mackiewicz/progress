import type { DailyCompletionPort } from '@/progress/write/exercises/application/ports/DailyCompletionPort'
import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { ArchiveExerciseCommand } from '@/progress/write/exercises/application/requests/ArchiveExerciseCommand'
import {
  type Exercise,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export class ArchiveExerciseUseCase implements UseCase<ArchiveExerciseCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly dailyCompletion: DailyCompletionPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(command: ArchiveExerciseCommand): Promise<void> {
    await this.unitOfWork.execute(async () => {
      const exercise = await this.findExercise(command.id)
      await this.archiveExercise(exercise)
      await this.checkWhetherDayIsComplete(command.day)
    })
  }

  private async findExercise(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findById(id)

    if (!exercise) {
      throw new ExerciseNotFoundError('Exercise not found.')
    }

    return exercise
  }

  private async archiveExercise(exercise: Exercise): Promise<void> {
    await this.exerciseRepo.save(exercise.archive(this.clock.now()))
  }

  private async checkWhetherDayIsComplete(
    day: ArchiveExerciseCommand['day']
  ): Promise<void> {
    await this.dailyCompletion.awardIfAllGoalsAreComplete(day)
  }
}
