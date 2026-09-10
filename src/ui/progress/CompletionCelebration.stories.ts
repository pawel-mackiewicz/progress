import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, waitFor, within } from 'storybook/test'

import CompletionCelebration from './CompletionCelebration.vue'

const meta = {
  title: 'UI/Progress/CompletionCelebration',
  component: CompletionCelebration,
  parameters: {
    layout: 'fullscreen'
  },
  args: {
    visible: true
  }
} satisfies Meta<typeof CompletionCelebration>

export default meta
type Story = StoryObj<typeof meta>

export const DayCompleted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const announcement = canvas.getByRole('status')

    await expect(announcement).toHaveAttribute('aria-live', 'assertive')
    await expect(announcement).toHaveAttribute('aria-atomic', 'true')
    await waitFor(async () => {
      await expect(
        canvas.getByRole('heading', { level: 2, name: 'Misja wykonana!' })
      ).toBeVisible()
    })
    await expect(announcement).toHaveTextContent(
      'Wszystkie paski pełne. Seria trwa.'
    )
  }
}

export const DayStillInProgress: Story = {
  args: {
    visible: false
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole('status')).not.toBeInTheDocument()
  }
}
