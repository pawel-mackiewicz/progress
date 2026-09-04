import { expect, test, type Page } from 'playwright/test'

test.describe('a first-time athlete starts tracking daily progress', () => {
  test('discovers how to begin from the empty dashboard', async ({ page }) => {
    await givenTheyOpenTheDashboard(page)

    await thenTheySeeAnInvitationToCreateTheirFirstExercise(page)
  })

  test('gets clear guidance when the exercise details are missing', async ({
    page
  }) => {
    await givenTheyOpenTheDashboard(page)
    await whenTheyChooseToAddAnExercise(page)

    await whenTheyTryToSaveTheEmptyExercise(page)

    await thenTheFormExplainsWhatIsMissing(page)
  })

  test('creates an exercise and completes today’s goal', async ({ page }) => {
    await givenTheyOpenTheDashboard(page)
    await whenTheyChooseToAddAnExercise(page)

    await whenTheyCreateAnExercise(page, {
      name: 'Push-ups',
      dailyGoal: 15
    })

    await thenTheirNewExerciseAppears(page, 'Push-ups')
    await whenTheyChooseToAddAnExercise(page)
    await whenTheyCreateAnExercise(page, {
      name: 'Squats',
      dailyGoal: 20
    })
    await thenTheirNewExerciseAppears(page, 'Squats')
    await whenTheyExpandTheExercise(page, 'Push-ups')
    await thenTheirNewExerciseStartsAtZero(page, {
      name: 'Push-ups',
      dailyGoal: 15
    })
    await whenTheyRecordTenReps(page, 'Push-ups')
    await thenTheySeeFiveRepsRemaining(page, 'Push-ups')
    await whenTheyRecordFiveReps(page, 'Push-ups')

    await thenTheySeeThatTodaysGoalIsComplete(page, 'Push-ups')
    await thenTheCompletedExerciseStaysInPlace(page)
    await whenTheyCollapseTheCompletedExercise(page, 'Push-ups')
    await thenTheCompletedExerciseMovesBelowTheUnfinishedExercise(page)
  })
})

test.describe('an athlete keeps a hard-earned streak alive', () => {
  test('earns a shield and automatically spends it on a missed day', async ({
    page
  }) => {
    await givenTheyOpenTheDashboard(page)
    await givenTheyCompletedThePreviousFourDays(page)
    await whenTheyReturnToTheDashboard(page)

    await thenTheyHaveOneShield(page)

    const protectedHistory = await givenTheyLaterMissedOneDay(page)
    await whenTheyReturnToTheDashboard(page)

    await thenTheShieldProtectedTheirStreak(page, protectedHistory)
  })
})

async function givenTheyOpenTheDashboard(page: Page) {
  await test.step('Given a first-time athlete opens the dashboard', async () => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Progress' })
    ).toBeVisible()
  })
}

async function thenTheySeeAnInvitationToCreateTheirFirstExercise(page: Page) {
  await test.step('Then the empty dashboard invites them to add their first exercise', async () => {
    await expect(
      page.getByRole('heading', { level: 2, name: 'Ready, player one?' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 3, name: 'No active quests' })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Add exercise' })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: 'Victory calendar' })
    ).toBeVisible()
    await expect(page.getByText('0 shields', { exact: true })).toBeVisible()
  })
}

async function givenTheyCompletedThePreviousFourDays(page: Page) {
  await test.step('Given they completed each of the previous four days', async () => {
    await replaceCompletionHistory(page, [-4, -3, -2, -1])
  })
}

async function thenTheyHaveOneShield(page: Page) {
  await test.step('Then their four-day streak has earned one shield', async () => {
    await expect(page.getByText('4 day streak', { exact: true })).toBeVisible()
    await expect(page.getByText('1 shield', { exact: true })).toBeVisible()
  })
}

async function givenTheyLaterMissedOneDay(page: Page) {
  return test.step('When one day is missing from their protected streak', () =>
    replaceCompletionHistory(page, [-6, -5, -4, -3, -1]))
}

async function whenTheyReturnToTheDashboard(page: Page) {
  await test.step('When they return to the dashboard', async () => {
    await page.reload()
  })
}

async function thenTheShieldProtectedTheirStreak(
  page: Page,
  history: { protectedDay: string; today: string }
) {
  await test.step('Then the shield is spent and the protected day is visible', async () => {
    await expect(page.getByText('5 day streak', { exact: true })).toBeVisible()
    await expect(page.getByText('0 shields', { exact: true })).toBeVisible()

    if (history.protectedDay.slice(0, 7) !== history.today.slice(0, 7)) {
      await page.getByRole('button', { name: 'Previous month' }).click()
    }

    const protectedDay = page.locator(`[data-day="${history.protectedDay}"]`)
    await expect(protectedDay).toHaveClass(
      /completion-calendar__day--protected/
    )
    await expect(protectedDay).toHaveAccessibleName(
      /streak protected by a shield/
    )
  })
}

async function replaceCompletionHistory(page: Page, dayOffsets: number[]) {
  return page.evaluate(async (offsets) => {
    function dayKey(date: Date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')

      return `${year}-${month}-${day}`
    }

    function shiftedDay(offset: number) {
      const date = new Date()
      date.setHours(12, 0, 0, 0)
      date.setDate(date.getDate() + offset)

      return dayKey(date)
    }

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('progress')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('dailyCompletions', 'readwrite')
      const completions = transaction.objectStore('dailyCompletions')
      completions.clear()

      for (const offset of offsets) {
        completions.put({
          day: shiftedDay(offset),
          earnedAt: new Date().toISOString(),
          triggerRepLogId: null
        })
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })

    database.close()

    return {
      protectedDay: shiftedDay(-2),
      today: shiftedDay(0)
    }
  }, dayOffsets)
}

async function whenTheyChooseToAddAnExercise(page: Page) {
  await test.step('When they choose to add an exercise', async () => {
    await page.getByRole('link', { name: 'Add exercise' }).click()
    await expect(page).toHaveURL(/\/exercises\/new$/)
    await expect(
      page.getByRole('heading', { level: 2, name: 'Add an exercise' })
    ).toBeVisible()
  })
}

async function whenTheyTryToSaveTheEmptyExercise(page: Page) {
  await test.step('And they try to save without entering any details', async () => {
    await page.getByRole('button', { name: 'Save exercise' }).click()
  })
}

async function thenTheFormExplainsWhatIsMissing(page: Page) {
  await test.step('Then the form explains both missing requirements', async () => {
    await expect(page.getByText('Enter an exercise name.')).toBeVisible()
    await expect(
      page.getByText('The goal must be a positive whole number.')
    ).toBeVisible()
    await expect(page.getByLabel('Exercise name')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    await expect(page.getByLabel('Daily reps goal')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
  })
}

async function whenTheyCreateAnExercise(
  page: Page,
  exercise: { name: string; dailyGoal: number }
) {
  await test.step(`And they create ${exercise.name} with a daily goal of ${exercise.dailyGoal}`, async () => {
    await page.getByLabel('Exercise name').fill(exercise.name)
    await page.getByLabel('Daily reps goal').fill(String(exercise.dailyGoal))
    await page.getByRole('button', { name: 'Save exercise' }).click()
    await expect(page).toHaveURL(/\/$/)
  })
}

async function thenTheirNewExerciseAppears(page: Page, exerciseName: string) {
  await test.step('Then their new exercise appears on the dashboard', async () => {
    await expect(
      page.getByRole('button', {
        name: `Expand ${exerciseName}. Status: Not completed`
      })
    ).toBeVisible()
  })
}

async function whenTheyExpandTheExercise(page: Page, exerciseName: string) {
  await test.step('When they expand the exercise to see its details', async () => {
    await page
      .getByRole('button', {
        name: `Expand ${exerciseName}. Status: Not completed`
      })
      .click()
  })
}

async function thenTheirNewExerciseStartsAtZero(
  page: Page,
  exercise: { name: string; dailyGoal: number }
) {
  await test.step('Then its details show no reps recorded yet', async () => {
    await expect(
      page.getByRole('heading', { level: 3, name: exercise.name })
    ).toBeVisible()

    const progress = progressFor(page, exercise.name)
    await expect(progress).toHaveAccessibleName(
      `Progress for ${exercise.name}: 0 of ${exercise.dailyGoal}`
    )
    await expect(progress).toHaveAttribute('aria-valuenow', '0')
    await expect(progress).toHaveAttribute(
      'aria-valuemax',
      String(exercise.dailyGoal)
    )
  })
}

async function whenTheyRecordTenReps(page: Page, exerciseName: string) {
  await test.step('When they record their first ten reps', async () => {
    await page
      .getByRole('button', { name: `Add 10 reps to ${exerciseName}` })
      .click()
  })
}

async function thenTheySeeFiveRepsRemaining(page: Page, exerciseName: string) {
  await test.step('Then the dashboard shows five reps remaining', async () => {
    await expect(progressFor(page, exerciseName)).toHaveAttribute(
      'aria-valuenow',
      '10'
    )
    await expect(page.getByText('5 to go', { exact: true })).toBeVisible()
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: `Added +10 to ${exerciseName}` })
    ).toBeVisible()
  })
}

async function whenTheyRecordFiveReps(page: Page, exerciseName: string) {
  await test.step('When they record the final five reps', async () => {
    await page
      .getByRole('button', { name: `Add 5 reps to ${exerciseName}` })
      .click()
  })
}

async function thenTheySeeThatTodaysGoalIsComplete(
  page: Page,
  exerciseName: string
) {
  await test.step("Then today's goal is complete and their streak begins", async () => {
    await expect(
      page.getByRole('heading', { level: 2, name: 'Day cleared!' })
    ).toBeVisible()
    await expect(progressFor(page, exerciseName)).toHaveAttribute(
      'aria-valuenow',
      '15'
    )
    await expect(page.getByText('GOAL CLEARED', { exact: true })).toBeVisible()
    await expect(page.getByText('1 day streak', { exact: true })).toBeVisible()
    await expect(page.getByText('0 shields', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('status').filter({ hasText: 'Quest complete!' })
    ).toBeVisible()
  })
}

async function thenTheCompletedExerciseStaysInPlace(page: Page) {
  await test.step('And the open completed exercise stays where they were working', async () => {
    await expect(exerciseNames(page)).toHaveText(['Push-ups', 'Squats'])
  })
}

async function whenTheyCollapseTheCompletedExercise(
  page: Page,
  exerciseName: string
) {
  await test.step('When they close the completed exercise', async () => {
    await page
      .getByRole('button', {
        name: `Collapse ${exerciseName}. Status: Completed`
      })
      .click()
  })
}

async function thenTheCompletedExerciseMovesBelowTheUnfinishedExercise(
  page: Page
) {
  await test.step('Then it moves below the exercise that still needs work', async () => {
    await expect(exerciseNames(page)).toHaveText(['Squats', 'Push-ups'])
  })
}

function exerciseNames(page: Page) {
  return page.locator('.home-exercises__summary strong')
}

function progressFor(page: Page, exerciseName: string) {
  return page.getByRole('progressbar', {
    name: new RegExp(`^Progress for ${exerciseName}:`)
  })
}
