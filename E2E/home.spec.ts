import { expect, test, type Page } from 'playwright/test'

test.describe('home screen', () => {
  test('a first visitor recognizes the starter shell', async ({ page }) => {
    await aVisitorOpensTheApp(page)
    await theySeeTheHomeStory(page)
    await theyCanTellTheShellIsReady(page)
  })
})

async function aVisitorOpensTheApp(page: Page) {
  await test.step('Given a visitor opens the app at the home route', async () => {
    await page.goto('/')
  })
}

async function theySeeTheHomeStory(page: Page) {
  await test.step('Then the page presents the reusable template identity', async () => {
    await expect(
      page.getByRole('heading', { level: 2, name: 'Vue PWA Template' })
    ).toBeVisible()
    await expect(
      page.getByText('Mobile-first shell ready for your app.')
    ).toBeVisible()
  })
}

async function theyCanTellTheShellIsReady(page: Page) {
  await test.step('And the shell shows the visitor where they are', async () => {
    await expect(
      page.getByRole('heading', { level: 1, name: 'Home' })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  await test.step('And the starter status is ready for real app code', async () => {
    await expect(page.getByText('PWA', { exact: true })).toBeVisible()
    await expect(page.getByText('Enabled', { exact: true })).toBeVisible()
    await expect(page.getByText('Routing', { exact: true })).toBeVisible()
    await expect(page.getByText('Ready', { exact: true })).toBeVisible()
  })
}
