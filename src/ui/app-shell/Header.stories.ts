import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { provide, reactive } from 'vue'
import { routeLocationKey, routerKey } from 'vue-router'
import { expect, fn, userEvent, within } from 'storybook/test'

import type { AppRouteName } from '@/ui/router'

import Header from './Header.vue'

type HeaderStoryArgs = {
  routeName: AppRouteName
  showBack: boolean
  backTo: string
  onBack: ReturnType<typeof fn>
  onPush: ReturnType<typeof fn>
}

const meta: Meta<HeaderStoryArgs> = {
  title: 'UI/AppShell/Header',
  component: Header,
  argTypes: {
    routeName: {
      control: { type: 'select' },
      options: [
        'home',
        'exercise-new',
        'exercise-edit'
      ] satisfies AppRouteName[]
    },
    showBack: {
      control: 'boolean'
    },
    backTo: {
      control: 'text'
    }
  },
  args: {
    routeName: 'home',
    showBack: false,
    backTo: '',
    onBack: fn(),
    onPush: fn()
  },
  parameters: {
    layout: 'fullscreen'
  },
  render: (args) => ({
    components: { Header },
    setup() {
      const route = reactive({
        get name() {
          return args.routeName
        },
        path: '/',
        fullPath: '/',
        params: {},
        get meta() {
          return {
            showBack: args.showBack,
            backTo: args.backTo || undefined
          }
        }
      })
      const router = {
        push: args.onPush,
        back: args.onBack
      }

      provide(routeLocationKey, route as never)
      provide(routerKey, router as never)
    },
    template: `
      <div style="min-height: 10rem; padding-top: 4rem; background: var(--color-background); color: var(--color-on-surface);">
        <Header />
      </div>
    `
  })
}

export default meta
type Story = StoryObj<typeof meta>

export const HomeHeader: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('Progress')).toBeInTheDocument()
    await expect(
      canvas.queryByTestId('shell-back-button')
    ).not.toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: 'Sprawdź aktualizacje' })
    ).toBeInTheDocument()
  }
}

export const BackTargetAction: Story = {
  args: {
    showBack: true,
    backTo: '/'
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('shell-back-button'))
    await expect(args.onPush).toHaveBeenCalledWith('/')
    await expect(args.onBack).not.toHaveBeenCalled()
  }
}
