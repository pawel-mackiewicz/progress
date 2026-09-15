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

export const ProgressionAtZero: Story = {
  args: {
    exercise: createDashboardExercise({
      completedReps: 40,
      remainingReps: 0,
      progressPercent: 100,
      progressionThresholdReps: 44,
      remainingRepsToProgression: 4,
      progressionPercent: 0,
      isComplete: true,
      isProgressionReady: false
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText('4 powtórzenia do awansu')
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('progressbar', {
        name: 'Postęp do awansu dla Pompki: 0 z 4 dodatkowych powtórzeń'
      })
    ).toHaveAttribute('aria-valuenow', '0')
  }
}

export const ProgressionInProgress: Story = {
  args: {
    exercise: createDashboardExercise({
      completedReps: 42,
      remainingReps: 0,
      progressPercent: 100,
      progressionThresholdReps: 44,
      remainingRepsToProgression: 2,
      progressionPercent: 50,
      isComplete: true,
      isProgressionReady: false
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText('2 powtórzenia do awansu')
    ).toBeInTheDocument()
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '2'
    )
  }
}

export const ProgressionReady: Story = {
  args: {
    exercise: createDashboardExercise({
      completedReps: 50,
      remainingReps: 0,
      progressPercent: 100,
      progressionThresholdReps: 44,
      remainingRepsToProgression: 0,
      progressionPercent: 100,
      isComplete: true,
      isProgressionReady: true
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('AWANS GOTOWY')).toBeInTheDocument()
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '4'
    )
  }
}
