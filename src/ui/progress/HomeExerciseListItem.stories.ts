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
    const progress = canvas.getByRole('progressbar', {
      name: 'Postęp dla Pompki: 15 z 40'
    })

    await expect(progress).toHaveAttribute('aria-valuenow', '15')
    await expect(progress).toHaveAttribute('aria-valuemax', '40')
    await userEvent.click(
      canvas.getByRole('button', {
        name: 'Rozwiń Pompki. Status: Do wykonania'
      })
    )
    await expect(args.onToggle).toHaveBeenCalledOnce()
  }
}

export const CollapsedRepsAndOtherActivity: Story = {
  args: {
    exercise: createDashboardExercise({
      effectiveDailyGoal: 20,
      completedReps: 10,
      remainingReps: 10,
      progressPercent: 25,
      alternativeActivityProgressPercent: 50
    })
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step('The compact bar exposes reps and other activity', async () => {
      const progress = canvas.getByRole('progressbar', {
        name: 'Postęp dla Pompki: 10 z 20 wymaganych powtórzeń oraz 50% celu zaliczone inną aktywnością'
      })

      await expect(progress).toHaveAttribute('aria-valuenow', '30')
      await expect(
        progress.querySelector('.home-exercises__progress-alternative')
      ).toBeInTheDocument()
    })
  }
}

export const CollapsedProgressionAtZero: Story = {
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
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step(
      'The athlete sees a completed quest in its compact state',
      async () => {
        await expect(
          canvas.getByRole('button', {
            name: 'Rozwiń Pompki. Status: Wykonane'
          })
        ).toBeInTheDocument()
        await expect(
          canvas.getByRole('progressbar', {
            name: 'Postęp do awansu dla Pompki: 0 z 4 dodatkowych powtórzeń'
          })
        ).toHaveAttribute('aria-valuenow', '0')
        await expect(
          canvas.queryByText('4 powtórzenia do awansu')
        ).not.toBeInTheDocument()
      }
    )

    await step('The completed quest can still be expanded', async () => {
      await userEvent.click(
        canvas.getByRole('button', {
          name: 'Rozwiń Pompki. Status: Wykonane'
        })
      )
      await expect(args.onToggle).toHaveBeenCalledOnce()
    })
  }
}

export const CollapsedProgressionInProgress: Story = {
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
      canvas.queryByText('2 powtórzenia do awansu')
    ).not.toBeInTheDocument()
    await expect(
      canvas.getByRole('progressbar', {
        name: 'Postęp do awansu dla Pompki: 2 z 4 dodatkowych powtórzeń'
      })
    ).toHaveAttribute('aria-valuenow', '2')
  }
}

export const CollapsedProgressionReady: Story = {
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
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step('The earned level-up has its own fiery status', async () => {
      await expect(
        canvas.getByRole('button', {
          name: 'Rozwiń Pompki. Status: Awans gotowy'
        })
      ).toBeInTheDocument()
      await expect(
        canvas.getByTestId('exercise-level-up-icon-push-ups')
      ).toBeInTheDocument()
      await expect(canvas.queryByText('AWANS GOTOWY')).not.toBeInTheDocument()
    })

    await step(
      'The full progression stays visible in the compact row',
      async () => {
        await expect(
          canvas.getByRole('progressbar', {
            name: 'Postęp do awansu dla Pompki: 4 z 4 dodatkowych powtórzeń'
          })
        ).toHaveAttribute('aria-valuenow', '4')
      }
    )
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
      completedReps: 42,
      remainingReps: 0,
      progressPercent: 100,
      progressionThresholdReps: 44,
      remainingRepsToProgression: 2,
      progressionPercent: 50,
      isComplete: true,
      isProgressionReady: false
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
    await expect(
      canvas.getByText('2 powtórzenia do awansu')
    ).toBeInTheDocument()
  }
}
