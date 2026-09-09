import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import type { LocalDayKey } from '@/progress/date'
import type { DayOutcomeSnapshot } from '@/progress/write/exercises/domain/DayOutcome'

import CompletionCalendar from './CompletionCalendar.vue'

type CompletionCalendarStoryArgs = {
  month: Date
  dayOutcomes: DayOutcomeSnapshot[]
  today: LocalDayKey
  onPrevious: ReturnType<typeof fn>
  onNext: ReturnType<typeof fn>
}

const meta: Meta<CompletionCalendarStoryArgs> = {
  title: 'UI/Progress/CompletionCalendar',
  component: CompletionCalendar,
  args: {
    month: new Date(2026, 7, 1),
    dayOutcomes: [
      { day: '2026-08-25', result: 'FAILED' },
      { day: '2026-08-26', result: 'COMPLETED' },
      { day: '2026-08-27', result: 'COMPLETED' },
      { day: '2026-08-28', result: 'SHIELDED' },
      { day: '2026-08-29', result: 'COMPLETED' },
      { day: '2026-08-30', result: 'COMPLETED' },
      { day: '2026-08-31', result: 'COMPLETED' }
    ] as DayOutcomeSnapshot[],
    today: '2026-09-03' as LocalDayKey,
    onPrevious: fn(),
    onNext: fn()
  },
  argTypes: {
    month: { control: false }
  },
  decorators: [
    () => ({
      template: '<div style="width: min(34rem, 100vw)"><story /></div>'
    })
  ],
  render: (args) => ({
    components: { CompletionCalendar },
    setup: () => ({ args }),
    template: `
      <CompletionCalendar
        :month="args.month"
        :day-outcomes="args.dayOutcomes"
        :today="args.today"
        @previous="args.onPrevious"
        @next="args.onNext"
      />
    `
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const ProtectedWinningStreak: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const protectedDay = canvasElement.querySelector('[data-day="2026-08-28"]')

    await expect(protectedDay).toHaveAttribute(
      'aria-label',
      expect.stringContaining('seria ochroniona tarczą')
    )
    await userEvent.click(
      canvas.getByRole('button', { name: 'Poprzedni miesiąc' })
    )
    await userEvent.click(
      canvas.getByRole('button', { name: 'Następny miesiąc' })
    )
    await expect(args.onPrevious).toHaveBeenCalledOnce()
    await expect(args.onNext).toHaveBeenCalledOnce()
  }
}

export const CurrentMonth: Story = {
  args: {
    month: new Date(2026, 8, 1),
    dayOutcomes: [
      { day: '2026-09-01', result: 'COMPLETED' },
      { day: '2026-09-02', result: 'SHIELDED' }
    ] as DayOutcomeSnapshot[]
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const today = canvasElement.querySelector('[data-day="2026-09-03"]')

    await expect(today).toHaveAttribute(
      'aria-label',
      expect.stringContaining('dzisiaj')
    )
    await expect(
      canvas.getByRole('button', { name: 'Następny miesiąc' })
    ).toBeDisabled()
  }
}
