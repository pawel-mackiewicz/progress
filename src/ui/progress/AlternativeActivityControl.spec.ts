import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AlternativeActivityPercentageValue } from '@/progress/write/exercises/domain/AlternativeActivityPercentage'
import { createAppI18n } from '@/ui/i18n'
import AlternativeActivityControl from '@/ui/progress/AlternativeActivityControl.vue'

enableAutoUnmount(afterEach)

describe('an athlete crediting other movement with a slider', () => {
  function givenTheActivitySlider(
    percentage: AlternativeActivityPercentageValue = 0
  ) {
    return mount(AlternativeActivityControl, {
      props: {
        percentage,
        saving: false,
        error: false
      },
      global: { plugins: [createAppI18n('en')] }
    })
  }

  function theRange(control: ReturnType<typeof givenTheActivitySlider>) {
    return control.get('input[type="range"]')
  }

  function theSurface(control: ReturnType<typeof givenTheActivitySlider>) {
    const surface = control.get('[data-testid="alternative-activity-control"]')
    vi.spyOn(surface.element, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 400,
      bottom: 160,
      left: 0,
      width: 400,
      height: 160,
      toJSON: () => ({})
    })
    return surface
  }

  async function whenTheyPressAt(
    control: ReturnType<typeof givenTheActivitySlider>,
    percentage: AlternativeActivityPercentageValue
  ) {
    const surface = theSurface(control)
    const clientX = 28 + 344 * (percentage / 100)

    await surface.trigger('pointerdown', {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX
    })
    return { clientX, surface }
  }

  it('previews the five stops while held and saves only when released', async () => {
    const control = givenTheActivitySlider()
    const interaction = await whenTheyPressAt(control, 0)

    expect(control.classes()).toContain(
      'alternative-activity-control--expanded'
    )
    expect(control.text()).toContain('0')
    expect(control.text()).toContain('25')
    expect(control.text()).toContain('50')
    expect(control.text()).toContain('75')
    expect(control.text()).toContain('100')

    interaction.clientX = 200
    await interaction.surface.trigger('pointermove', {
      isPrimary: true,
      pointerId: 1,
      clientX: interaction.clientX
    })

    expect(control.text()).toContain('50% of today’s plan')
    expect(control.emitted('select')).toBeUndefined()

    await interaction.surface.trigger('pointerup', {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX: interaction.clientX
    })

    expect(control.emitted('select')).toEqual([[50]])
  })

  it('discards the preview when the sliding gesture is cancelled', async () => {
    const control = givenTheActivitySlider(25)
    const interaction = await whenTheyPressAt(control, 75)
    await interaction.surface.trigger('pointercancel')

    expect(control.text()).toContain('25% of today’s plan')
    expect(control.emitted('select')).toBeUndefined()
  })

  it('lets a keyboard user choose the same stepped values', async () => {
    const control = givenTheActivitySlider(25)
    const range = theRange(control)

    await range.trigger('focus')
    ;(range.element as HTMLInputElement).value = '50'
    await range.trigger('input')
    await range.trigger('change')

    expect(control.emitted('select')).toEqual([[50]])
  })

  it('locks the slider and announces that the released value is saving', async () => {
    const control = givenTheActivitySlider(50)

    await control.setProps({ saving: true })

    expect(theRange(control).attributes('disabled')).toBeDefined()
    expect(control.get('[role="status"]').text()).toContain('Saving…')
  })

  it('confirms after the released value has really been saved', async () => {
    const control = givenTheActivitySlider(50)

    await control.setProps({ saving: true })
    await control.setProps({ saving: false })

    expect(control.get('[role="status"]').text()).toContain('Saved')
    expect(control.classes()).toContain('alternative-activity-control--saved')
  })

  it('keeps the slider available for another release after saving fails', async () => {
    const control = givenTheActivitySlider()

    await control.setProps({ error: true })

    expect(control.get('[role="alert"]').text()).toContain(
      'That change could not be saved'
    )

    const interaction = await whenTheyPressAt(control, 100)
    await interaction.surface.trigger('pointerup', {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX: interaction.clientX
    })

    expect(control.emitted('select')).toEqual([[100]])
  })
})
