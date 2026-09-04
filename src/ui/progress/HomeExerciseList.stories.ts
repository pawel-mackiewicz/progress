import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { provide, ref } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  routeLocationKey,
  routerKey
} from 'vue-router'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import type { DashboardExercise, RepIncrement } from '@/progress/types'

import HomeExerciseList from './HomeExerciseList.vue'
import { createDashboardExercise } from './storyFixtures'

type HomeExerciseListStoryArgs = {
  exercises: DashboardExercise[]
  expandedExerciseId: string | null
  onAdd: (
    exerciseId: string,
    exerciseName: string,
    amount: RepIncrement
  ) => void
  onEdit: (exerciseId: string) => void
  onToggle: (exerciseId: string) => void
}

const meta: Meta<HomeExerciseListStoryArgs> = {
  title: 'UI/Progress/HomeExerciseList',
  component: HomeExerciseList,
  args: {
    exercises: [
      createDashboardExercise(),
      createDashboardExercise({
        id: 'squats',
        name: 'Przysiady',
        dailyGoal: 30,
        completedReps: 30,
        remainingReps: 0,
        progressPercent: 100,
        isComplete: true
      })
    ],
    expandedExerciseId: 'push-ups',
    onAdd: fn(),
    onEdit: fn(),
    onToggle: fn()
  },
  decorators: [
    () => ({
      template: '<div style="width: min(28rem, 100vw)"><story /></div>'
    })
  ],
  render: (args) => ({
    components: { HomeExerciseList },
    setup() {
      const exercises = ref(args.exercises.map((exercise) => ({ ...exercise })))
      const expandedExerciseId = ref(args.expandedExerciseId)
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          {
            path: '/exercises/new',
            component: { template: '<div />' }
          }
        ]
      })

      provide(routerKey, router)
      // RouterLink expects the installed router's unwrapped reactive route, not
      // the currentRoute ref exposed by the router instance.
      provide(routeLocationKey, router.currentRoute.value as never)

      function toggleExercise(exerciseId: string) {
        args.onToggle(exerciseId)
        expandedExerciseId.value =
          expandedExerciseId.value === exerciseId ? null : exerciseId
      }

      function addReps(
        exerciseId: string,
        exerciseName: string,
        amount: RepIncrement
      ) {
        args.onAdd(exerciseId, exerciseName, amount)
        exercises.value = exercises.value.map((exercise) => {
          if (exercise.id !== exerciseId) {
            return exercise
          }

          const completedReps = exercise.completedReps + amount

          return {
            ...exercise,
            completedReps,
            remainingReps: Math.max(exercise.dailyGoal - completedReps, 0),
            progressPercent: Math.min(
              Math.round((completedReps / exercise.dailyGoal) * 100),
              100
            ),
            isComplete: completedReps >= exercise.dailyGoal
          }
        })
      }

      function editExercise(exerciseId: string) {
        args.onEdit(exerciseId)
      }

      return {
        addReps,
        editExercise,
        exercises,
        expandedExerciseId,
        toggleExercise
      }
    },
    template: `
      <HomeExerciseList
        :exercises="exercises"
        :expanded-exercise-id="expandedExerciseId"
        @add="addReps"
        @edit="editExercise"
        @toggle="toggleExercise"
      />
    `
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const DailyQuestList: Story = {
  args: {
    exercises: [
      createDashboardExercise({
        completedReps: 35,
        remainingReps: 5,
        progressPercent: 88
      }),
      createDashboardExercise({
        id: 'squats',
        name: 'Przysiady',
        dailyGoal: 30,
        completedReps: 30,
        remainingReps: 0,
        progressPercent: 100,
        isComplete: true
      })
    ],
    expandedExerciseId: null
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step('Both quests start as compact rows', async () => {
      await expect(canvas.getAllByRole('listitem')).toHaveLength(2)
      await expect(
        canvas.getByTestId('exercise-toggle-push-ups')
      ).toBeInTheDocument()
      await expect(
        canvas.getByTestId('exercise-toggle-squats')
      ).toBeInTheDocument()
    })

    await step('The athlete expands the first quest', async () => {
      await userEvent.click(canvas.getByTestId('exercise-toggle-push-ups'))
      await expect(
        canvas.queryByTestId('exercise-toggle-push-ups')
      ).not.toBeInTheDocument()
      await waitFor(() =>
        expect(canvas.getByTestId('exercise-card-push-ups')).toBeVisible()
      )
    })

    await step('One final set completes the quest', async () => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Dodaj 5 powtórzeń do Pompki' })
      )
      await expect(args.onAdd).toHaveBeenCalledWith('push-ups', 'Pompki', 5)
      await expect(canvas.getByText('CEL ZALICZONY')).toBeInTheDocument()
      await expect(canvas.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '40'
      )
    })

    await step('Tapping the top of the card collapses it', async () => {
      await userEvent.click(canvas.getByTestId('exercise-collapse-push-ups'))
      await expect(
        canvas.getByTestId('exercise-toggle-push-ups')
      ).toBeInTheDocument()
      await expect(
        canvas.queryByTestId('exercise-card-push-ups')
      ).not.toBeInTheDocument()
    })

    await step('Another quest can be opened and closed', async () => {
      await userEvent.click(canvas.getByTestId('exercise-toggle-squats'))
      await waitFor(() =>
        expect(canvas.getByTestId('exercise-card-squats')).toBeVisible()
      )
      await expect(canvas.getAllByRole('progressbar')).toHaveLength(1)

      await userEvent.click(canvas.getByTestId('exercise-collapse-squats'))
      await expect(
        canvas.getByTestId('exercise-toggle-squats')
      ).toBeInTheDocument()
    })
  }
}

export const NoActiveQuests: Story = {
  args: {
    exercises: [],
    expandedExerciseId: null
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('Brak aktywnych misji')).toBeInTheDocument()
    await expect(
      canvas.getByRole('link', { name: 'Dodaj ćwiczenie' })
    ).toHaveAttribute('href', '/exercises/new')
  }
}
