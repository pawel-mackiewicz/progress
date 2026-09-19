import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fireEvent, fn, within } from 'storybook/test'

import AlternativeActivityControl from './AlternativeActivityControl.vue'

const meta = {
  title: 'UI/Progress/AlternativeActivityControl',
  component: AlternativeActivityControl,
  decorators: [
    () => ({
      template: '<div style="width: min(34rem, 100vw)"><story /></div>'
    })
  ],
  args: {
    percentage: 0,
    saving: false,
    error: false,
    onActivate: fn(),
    onSelect: fn()
  },
  render: (args) => ({
    components: { AlternativeActivityControl },
    setup: () => ({ args }),
    template: `
      <AlternativeActivityControl
        :error="args.error"
        :percentage="args.percentage"
        :saving="args.saving"
        @activate="args.onActivate"
        @select="args.onSelect"
      />
    `
  })
} satisfies Meta<typeof AlternativeActivityControl>

export default meta
type Story = StoryObj<typeof meta>

export const PressAndSlide: Story = {
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement)
    const slider = canvas.getByRole('slider', {
      name: /Inna aktywność.*Naciśnij, przesuń i puść/
    })

    await step('The athlete focuses the compact activity control', async () => {
      slider.focus()

      await expect(args.onActivate).toHaveBeenCalledOnce()
      await expect(canvas.getByText('25')).toBeInTheDocument()
      await expect(canvas.getByText('50')).toBeInTheDocument()
      await expect(canvas.getByText('75')).toBeInTheDocument()
    })

    await step(
      'They move through the same five stops without a dialog',
      async () => {
        ;(slider as HTMLInputElement).value = '50'
        await fireEvent.input(slider)
        await fireEvent.change(slider)

        await expect(args.onSelect).toHaveBeenLastCalledWith(50)
        await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
      }
    )
  }
}

export const PartlyCounted: Story = {
  args: {
    percentage: 50
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('50% dzisiejszego planu')).toBeInTheDocument()
  }
}

export const SavingReleasedValue: Story = {
  args: {
    percentage: 50,
    saving: true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('slider')).toBeDisabled()
    await expect(canvas.getByRole('status')).toHaveTextContent('Zapisywanie…')
  }
}

export const SaveFailed: Story = {
  args: {
    percentage: 75,
    error: true
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Nie udało się zapisać zmiany. Spróbuj ponownie.'
    )
    await expect(canvas.getByRole('slider')).toBeEnabled()
  }
}

export const FullyCounted: Story = {
  args: {
    percentage: 100
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('100% planu zaliczone')).toBeInTheDocument()
  }
}
