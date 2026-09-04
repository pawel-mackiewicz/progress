import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'

import HomeHero from './HomeHero.vue'

const meta = {
  title: 'UI/Progress/HomeHero',
  component: HomeHero,
  parameters: {
    layout: 'fullscreen'
  },
  decorators: [
    () => ({
      template:
        '<div style="max-width: 64rem; padding: 1.5rem; margin: 0 auto"><story /></div>'
    })
  ],
  args: {
    date: new Date(2026, 8, 3),
    isDayComplete: false,
    currentStreak: 0,
    availableShields: 0
  },
  argTypes: {
    date: { control: false }
  }
} satisfies Meta<typeof HomeHero>

export default meta
type Story = StoryObj<typeof meta>

export const FirstDay: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('Gotowy do gry?')).toBeInTheDocument()
    await expect(canvas.getByText('Zacznij serię dzisiaj')).toBeInTheDocument()
    await expect(canvas.getByTestId('shield-balance')).toHaveTextContent(
      '0 tarcz'
    )
  }
}

export const ProtectedStreak: Story = {
  args: {
    currentStreak: 8,
    availableShields: 2
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('seria 8 dni')).toBeInTheDocument()
    await expect(canvas.getByTestId('shield-balance')).toHaveTextContent(
      '2 tarcze'
    )
  }
}

export const DayCompleted: Story = {
  args: {
    isDayComplete: true,
    currentStreak: 3,
    availableShields: 1
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('Dzień zaliczony!')).toBeInTheDocument()
    await expect(canvas.getByText('seria 3 dni')).toBeInTheDocument()
    await expect(canvas.getByTestId('shield-balance')).toHaveTextContent(
      '1 tarcza'
    )
  }
}
