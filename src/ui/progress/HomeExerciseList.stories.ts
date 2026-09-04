import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { provide } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  routeLocationKey,
  routerKey
} from 'vue-router'
import { expect, fn, userEvent, within } from 'storybook/test'

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
      provide(routeLocationKey, router.currentRoute as never)

      return { args }
    },
    template: `
      <HomeExerciseList
        :exercises="args.exercises"
        :expanded-exercise-id="args.expandedExerciseId"
        @add="args.onAdd"
        @edit="args.onEdit"
        @toggle="args.onToggle"
      />
    `
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const DailyQuestList: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByRole('listitem')).toHaveLength(2)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Dodaj 1 powtórzenie do Pompki' })
    )
    await expect(args.onAdd).toHaveBeenCalledWith('push-ups', 'Pompki', 1)
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
