import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import type { ProgressedExerciseForCelebration } from '@/progress/write/exercises/application/PrepareTodayTrainingDayUseCase'

import ProgressionCelebration from './ProgressionCelebration.vue'

type ProgressionCelebrationStoryArgs = {
  exercises: ProgressedExerciseForCelebration[]
  onDismiss: ReturnType<typeof fn>
}

const pushUpsProgression: ProgressedExerciseForCelebration = {
  exerciseId: 'push-ups',
  name: 'Pompki',
  level: 2,
  previousDailyGoal: 15,
  nextDailyGoal: 16
}

const meta: Meta<ProgressionCelebrationStoryArgs> = {
  title: 'UI/Progress/ProgressionCelebration',
  component: ProgressionCelebration,
  parameters: {
    layout: 'fullscreen'
  },
  args: {
    exercises: [pushUpsProgression],
    onDismiss: fn()
  },
  render: (args) => ({
    components: { ProgressionCelebration },
    setup: () => ({ args }),
    template:
      '<ProgressionCelebration :exercises="args.exercises" @dismiss="args.onDismiss" />'
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const EarnedGoalIncrease: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const dialog = canvas.getByRole('dialog')
    const action = canvas.getByRole('button', {
      name: 'Zacznij dzisiejszą misję'
    })

    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await waitFor(async () => {
      await expect(
        canvas.getByRole('heading', { name: 'Poziom wyżej!' })
      ).toBeVisible()
    })
    await expect(dialog).toHaveTextContent('Pompki')
    await expect(dialog).toHaveTextContent('POZIOM 2')
    await expect(dialog).toHaveTextContent('15')
    await expect(dialog).toHaveTextContent('16')
    await expect(action).toHaveFocus()

    await userEvent.click(action)

    await expect(args.onDismiss).toHaveBeenCalledOnce()
  }
}

export const SeveralGoalsAtOnce: Story = {
  args: {
    exercises: [
      pushUpsProgression,
      {
        exerciseId: 'squats',
        name: 'Przysiady ze sztangą',
        level: 2,
        previousDailyGoal: 30,
        nextDailyGoal: 33
      },
      {
        exerciseId: 'plank',
        name: 'Deska',
        level: 2,
        previousDailyGoal: 90,
        nextDailyGoal: 99
      }
    ]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByRole('listitem')).toHaveLength(3)
    await expect(
      canvas.getByText(
        'Ćwiczenie „Przysiady ze sztangą” osiągnęło poziom 2. Cel dzienny wzrósł z 30 do 33 powtórzeń.'
      )
    ).toBeInTheDocument()
  }
}

export const NoEarnedProgression: Story = {
  args: {
    exercises: []
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
  }
}
