import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import type { DashboardExercise } from '@/progress/types'

import HomeExerciseListItem from './HomeExerciseListItem.vue'
import { createDashboardExercise } from './storyFixtures'

type HomeExerciseListItemStoryArgs = {
  exercise: DashboardExercise
  expanded: boolean
  onAdd: ReturnType<typeof fn>
  onEdit: ReturnType<typeof fn>
  onToggle: ReturnType<typeof fn>
}

const meta: Meta<HomeExerciseListItemStoryArgs> = {
  title: 'UI/Progress/HomeExerciseListItem',
  component: HomeExerciseListItem,
  args: {
    exercise: createDashboardExercise(),
    expanded: false,
    onAdd: fn(),
    onEdit: fn(),
    onToggle: fn()
  },
  decorators: [
    () => ({
      template:
        '<ul style="width: min(28rem, 100vw); margin: 0; padding: 0; list-style: none"><story /></ul>'
    })
  ],
  render: (args) => ({
    components: { HomeExerciseListItem },
    setup: () => ({ args }),
    template: `
      <HomeExerciseListItem
        :exercise="args.exercise"
        :expanded="args.expanded"
        @add="args.onAdd"
        @edit="args.onEdit"
        @toggle="args.onToggle"
      />
    `
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const CollapsedQuest: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument()
    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Rozwiń Pompki. Status: Do wykonania'
      })
    )
    await expect(args.onToggle).toHaveBeenCalledOnce()
  }
}

export const ExpandedQuest: Story = {
  args: {
    expanded: true
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.queryByTestId('exercise-toggle-push-ups')
    ).not.toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: 'Zwiń szczegóły: Pompki' })
    ).toBeInTheDocument()
    await expect(canvas.getByRole('progressbar')).toBeInTheDocument()
    await userEvent.click(
      canvas.getByRole('button', { name: 'Dodaj 5 powtórzeń do Pompki' })
    )
    await userEvent.click(canvas.getByRole('button', { name: 'Edytuj Pompki' }))
    await userEvent.click(
      canvas.getByRole('button', { name: 'Zwiń szczegóły: Pompki' })
    )
    await expect(args.onAdd).toHaveBeenCalledWith(5)
    await expect(args.onEdit).toHaveBeenCalledOnce()
    await expect(args.onToggle).toHaveBeenCalledOnce()
  }
}

export const CompletedQuest: Story = {
  args: {
    exercise: createDashboardExercise({
      completedReps: 40,
      remainingReps: 0,
      progressPercent: 100,
      isComplete: true
    }),
    expanded: true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.queryByTestId('exercise-toggle-push-ups')
    ).not.toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: 'Zwiń szczegóły: Pompki' })
    ).toBeInTheDocument()
    await expect(canvas.getByText('CEL ZALICZONY')).toBeInTheDocument()
  }
}
