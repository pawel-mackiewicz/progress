import type { DashboardExercise, Exercise } from '@/progress/types'

export function createDashboardExercise(
  overrides: Partial<DashboardExercise> = {}
): DashboardExercise {
  return {
    id: 'push-ups',
    name: 'Pompki',
    dailyGoal: 40,
    completedReps: 15,
    remainingReps: 25,
    progressPercent: 38,
    isComplete: false,
    yesterdayReps: 10,
    previousMaxReps: 30,
    createdAt: '2026-08-24T08:00:00.000Z',
    updatedAt: '2026-09-03T08:00:00.000Z',
    archivedAt: null,
    ...overrides
  }
}

export function createArchivedExercise(
  overrides: Partial<Exercise> = {}
): Exercise {
  return {
    id: 'burpees',
    name: 'Burpees',
    dailyGoal: 20,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    archivedAt: '2026-09-01T08:00:00.000Z',
    ...overrides
  }
}
