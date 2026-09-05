import type { DailyCompletionPort } from '@/progress/write/exercises/application/ports/DailyCompletionPort'
import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { UpdateExerciseCommand } from '@/progress/write/exercises/application/requests/UpdateExerciseCommand'
import {
  DuplicateExerciseNameError,
  type Exercise,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export class UpdateExerciseUseCase implements UseCase<UpdateExerciseCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly dailyCompletion: DailyCompletionPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(command: UpdateExerciseCommand): Promise<void> {
    await this.unitOfWork.execute(async () => {
      const exercise = await this.findExercise(command.id)
      await this.ensureNameIsAvailable(command)
      await this.updateExercise(exercise, command)
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

  private async ensureNameIsAvailable(
    command: UpdateExerciseCommand
  ): Promise<void> {
    if (await this.exerciseRepo.existsActiveByName(command.name, command.id)) {
      throw new DuplicateExerciseNameError(
        'An active exercise with this name already exists.'
      )
    }
  }

  private async updateExercise(
    exercise: Exercise,
    command: UpdateExerciseCommand
  ): Promise<void> {
    await this.exerciseRepo.save(
      exercise.updateDetails(command, this.clock.now())
    )
  }

  private async checkWhetherDayIsComplete(
    day: UpdateExerciseCommand['day']
  ): Promise<void> {
    await this.dailyCompletion.awardIfAllGoalsAreComplete(day)
  }
}
