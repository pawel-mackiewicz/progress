import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import type { Exercise } from '@/progress/types'

import HomeArchivedExercises from './HomeArchivedExercises.vue'
import { createArchivedExercise } from './storyFixtures'

type HomeArchivedExercisesStoryArgs = {
  exercises: Exercise[]
  onRestore: ReturnType<typeof fn>
}

const meta: Meta<HomeArchivedExercisesStoryArgs> = {
  title: 'UI/Progress/HomeArchivedExercises',
  component: HomeArchivedExercises,
  args: {
    exercises: [
      createArchivedExercise(),
      createArchivedExercise({
        id: 'jumping-jacks',
        name: 'Pajacyki',
        dailyGoal: 50
      })
    ],
    onRestore: fn()
  },
  decorators: [
    () => ({
      template: '<div style="width: min(28rem, 100vw)"><story /></div>'
    })
  ],
  render: (args) => ({
    components: { HomeArchivedExercises },
    setup: () => ({ args }),
    template:
      '<HomeArchivedExercises :exercises="args.exercises" @restore="args.onRestore" />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const ArchivedQuests: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByText('Archiwum (2)'))
    await userEvent.click(
      canvas.getByRole('button', { name: 'Przywróć ćwiczenie Burpees' })
    )
    await expect(args.onRestore).toHaveBeenCalledWith('burpees')
  }
}

export const EmptyArchive: Story = {
  args: {
    exercises: []
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByText(/Archiwum/)).not.toBeInTheDocument()
  }
}
