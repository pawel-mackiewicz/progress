import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import type { DashboardExercise } from '@/progress/types'

import ExerciseCard from './ExerciseCard.vue'
import { createDashboardExercise } from './storyFixtures'

type ExerciseCardStoryArgs = {
  exercise: DashboardExercise
  onAdd: ReturnType<typeof fn>
  onEdit: ReturnType<typeof fn>
}

const meta: Meta<ExerciseCardStoryArgs> = {
  title: 'UI/Progress/ExerciseCard',
  component: ExerciseCard,
  args: {
    exercise: createDashboardExercise(),
    onAdd: fn(),
    onEdit: fn()
  },
  decorators: [
    () => ({
      template: '<div style="width: min(28rem, 100vw)"><story /></div>'
    })
  ],
  render: (args) => ({
    components: { ExerciseCard },
    setup: () => ({ args }),
    template:
      '<ExerciseCard :exercise="args.exercise" @add="args.onAdd" @edit="args.onEdit" />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const QuestInProgress: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '15'
    )
    await userEvent.click(
      canvas.getByRole('button', { name: 'Dodaj 10 powtórzeń do Pompki' })
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Edytuj Pompki' }))
    await expect(args.onAdd).toHaveBeenCalledWith(10)
    await expect(args.onEdit).toHaveBeenCalledOnce()
  }
}

export const QuestCompleted: Story = {
  args: {
    exercise: createDashboardExercise({
      completedReps: 45,
      remainingReps: 0,
      progressPercent: 100,
      isComplete: true
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('CEL ZALICZONY')).toBeInTheDocument()
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40'
    )
  }
}
