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
    await whenTheyExpandTheExercise(page, 'Push-ups')
    await thenTheirNewExerciseStartsAtZero(page, {
      name: 'Push-ups',
      dailyGoal: 15
    })
    await whenTheyRecordTenReps(page, 'Push-ups')
    await thenTheySeeFiveRepsRemaining(page, 'Push-ups')
    await whenTheyRecordFiveReps(page, 'Push-ups')

    await thenTheySeeThatTodaysGoalIsComplete(page, 'Push-ups')
  })

  test('undoes the most recent set', async ({ page }) => {
    await givenTheyOpenTheDashboard(page)
    await whenTheyChooseToAddAnExercise(page)
    await whenTheyCreateAnExercise(page, {
      name: 'Push-ups',
      dailyGoal: 15
    })
    await thenTheirNewExerciseAppears(page, 'Push-ups')
    await whenTheyExpandTheExercise(page, 'Push-ups')
    await whenTheyRecordTenReps(page, 'Push-ups')
    await thenTheySeeFiveRepsRemaining(page, 'Push-ups')

    await whenTheyUndoTheirLastSet(page)

    await thenTheySeeTheirRepsWereRemoved(page, 'Push-ups')
  })
})

test.describe("an athlete maintains the exercises behind today's plan", () => {
  test('revises a goal without losing the reps already earned today', async ({
    page
  }) => {
    await givenTheyOpenTheDashboard(page)
    await whenTheyChooseToAddAnExercise(page)
    await whenTheyCreateAnExercise(page, {
      name: 'Push-ups',
      dailyGoal: 15
    })
    await whenTheyExpandTheExercise(page, 'Push-ups')
    await whenTheyRecordTenReps(page, 'Push-ups')
    await thenTheySeeFiveRepsRemaining(page, 'Push-ups')

    await whenTheyChooseToEditTheExercise(page, 'Push-ups')
    await thenTheySeeTheExerciseDetails(page, {
      name: 'Push-ups',
      dailyGoal: 15
    })
    await whenTheyReviseTheExercise(page, {
      name: 'Diamond push-ups',
      dailyGoal: 10
    })

    await thenTheRevisedGoalCompletesTodaysPlan(page, 'Diamond push-ups')
    await whenTheyExpandTheExercise(page, 'Diamond push-ups', 'Completed')
    await thenTheExerciseHasProgress(page, {
      name: 'Diamond push-ups',
      completedReps: 10,
      dailyGoal: 10
    })
  })

  test('keeps a duplicate exercise draft editable instead of creating it', async ({
    page
  }) => {
    await givenTheyOpenTheDashboard(page)
    await whenTheyChooseToAddAnExercise(page)
    await whenTheyCreateAnExercise(page, {
      name: 'Push-ups',
      dailyGoal: 15
    })
    await whenTheyChooseToAddAnExercise(page)

    await whenTheyTryToCreateAnExercise(page, {
      name: '  push-UPS  ',
      dailyGoal: 25
    })

    await thenTheDuplicateDraftRemainsEditable(page, {
      name: '  push-UPS  ',
      dailyGoal: 25
    })
    await whenTheyReturnFromTheExerciseForm(page)
    await thenOnlyTheseExercisesAppear(page, ['Push-ups'])
  })

  test('archives only after confirmation and restores the exercise with its reps', async ({
    page
  }) => {
    await givenTheyOpenTheDashboard(page)
    await whenTheyChooseToAddAnExercise(page)
    await whenTheyCreateAnExercise(page, {
      name: 'Pull-ups',
      dailyGoal: 10
    })
    await whenTheyExpandTheExercise(page, 'Pull-ups')
    await whenTheyRecordFiveReps(page, 'Pull-ups')
    await thenTheExerciseHasProgress(page, {
      name: 'Pull-ups',
      completedReps: 5,
      dailyGoal: 10
    })
    await whenTheyChooseToEditTheExercise(page, 'Pull-ups')

    await whenTheyDeclineToArchiveTheExercise(page, 'Pull-ups')
    await thenTheyAreStillEditingTheExercise(page, 'Pull-ups')
    await whenTheyConfirmArchivingTheExercise(page, 'Pull-ups')

    await thenTheExerciseMovesToTheArchive(page)
    await whenTheyOpenTheArchive(page)
    await whenTheyRestoreTheExercise(page, 'Pull-ups')
    await whenTheyExpandTheExercise(page, 'Pull-ups')
    await thenTheExerciseHasProgress(page, {
      name: 'Pull-ups',
      completedReps: 5,
      dailyGoal: 10
    })
  })
})

test.describe('an athlete clears one exercise while another still needs work', () => {
  test('keeps the completed exercise in place until they collapse it', async ({
    page
  }) => {
    await givenTheyAreTrainingPushUpsBeforeSquats(page)

    await whenTheyCompletePushUps(page)

    await thenTheCompletedExerciseStaysInPlace(page)
    await whenTheyCollapseTheCompletedExercise(page, 'Push-ups')
    await thenTheCompletedExerciseMovesBelowTheUnfinishedExercise(page)
  })

  test('reorders the completed exercise when they switch exercises', async ({
    page
  }) => {
    await givenTheyAreTrainingPushUpsBeforeSquats(page)

    await whenTheyCompletePushUps(page)
    await thenTheCompletedExerciseStaysInPlace(page)
    await whenTheyExpandTheExercise(page, 'Squats')

    await thenSquatsAreOpenAboveTheCompletedExercise(page)
  })
})

test.describe('an athlete keeps a hard-earned streak alive', () => {
  test('closes yesterday and opens a fresh plan simply by returning to the dashboard', async ({
    page
  }) => {
    await page.clock.setFixedTime(new Date('2026-08-24T08:00:00.000Z'))
    await givenTheyOpenTheDashboard(page)
    await whenTheyChooseToAddAnExercise(page)
    await whenTheyCreateAnExercise(page, { name: 'Push-ups', dailyGoal: 15 })
    await whenTheyExpandTheExercise(page, 'Push-ups')
    await whenTheyRecordTenReps(page, 'Push-ups')
    await thenTheySeeFiveRepsRemaining(page, 'Push-ups')
    await whenTheyRecordFiveReps(page, 'Push-ups')
    await thenTheySeeThatTodaysGoalIsComplete(page, 'Push-ups')

    await test.step('When they return the next morning without registering another exercise', async () => {
      await page.clock.setFixedTime(new Date('2026-08-25T08:00:00.000Z'))
      await whenTheyReturnToTheDashboard(page)
    })

    await thenTheirNewExerciseAppears(page, 'Push-ups')
    await whenTheyExpandTheExercise(page, 'Push-ups')
    await thenTheirNewExerciseStartsAtZero(page, {
      name: 'Push-ups',
      dailyGoal: 15
    })
    await expect(page.getByText('1 day streak', { exact: true })).toBeVisible()
    await thenTheCalendarShowsTheCompletedDay(page, '2026-08-24')
    await test.step('Then yesterday is finalized and today has the same exercise plan', async () => {
      await expect
        .poll(() => readTrainingHistory(page))
        .toMatchObject({
          trainingDays: [
            {
              day: '2026-08-24',
              status: 'FINALIZED',
              exercises: [{ name: 'Push-ups', dailyGoal: 15 }]
            },
            {
              day: '2026-08-25',
              status: 'OPEN',
              exercises: [{ name: 'Push-ups', dailyGoal: 15 }]
            }
          ],
          dayOutcomes: [{ day: '2026-08-24', result: 'COMPLETED' }]
        })
    })
  })

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

  test('shows the missed day that broke an unprotected streak', async ({
    page
  }) => {
    await givenTheyOpenTheDashboard(page)
    const failedHistory = await givenTheyMissedADayWithoutAShield(page)

    await whenTheyReturnToTheDashboard(page)

    await thenTheCalendarShowsTheFailedDay(page, failedHistory)
  })
})

async function readTrainingHistory(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('progress')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    try {
      const transaction = database.transaction(
        ['trainingDays', 'dayOutcomes'],
        'readonly'
      )
      const [trainingDays, dayOutcomes] = await Promise.all(
        ['trainingDays', 'dayOutcomes'].map(
          (store) =>
            new Promise<unknown[]>((resolve, reject) => {
              const request = transaction.objectStore(store).getAll()
              request.onsuccess = () => resolve(request.result)
              request.onerror = () => reject(request.error)
            })
        )
      )
      return { trainingDays, dayOutcomes }
    } finally {
      database.close()
    }
  })
}

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
    await replaceProgressHistory(page, {
      completedDayOffsets: [-4, -3, -2, -1],
      protectedDayOffsets: [],
      failedDayOffsets: [],
      stats: {
        currentStreak: 4,
        availableShields: 1,
        completedDaysTowardNextShield: 0
      }
    })
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
    replaceProgressHistory(page, {
      completedDayOffsets: [-6, -5, -4, -3, -1],
      protectedDayOffsets: [-2],
      failedDayOffsets: [],
      stats: {
        currentStreak: 5,
        availableShields: 0,
        completedDaysTowardNextShield: 1
      }
    }))
}

async function givenTheyMissedADayWithoutAShield(page: Page) {
  return test.step('Given they missed yesterday without a shield', () =>
    replaceProgressHistory(page, {
      completedDayOffsets: [],
      protectedDayOffsets: [],
      failedDayOffsets: [-1],
      stats: {
        currentStreak: 0,
        availableShields: 0,
        completedDaysTowardNextShield: 0
      }
    }))
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

async function thenTheCalendarShowsTheFailedDay(
  page: Page,
  history: { failedDay: string; today: string }
) {
  await test.step('Then the calendar records the unprotected missed day', async () => {
    if (history.failedDay.slice(0, 7) !== history.today.slice(0, 7)) {
      await page.getByRole('button', { name: 'Previous month' }).click()
    }

    const failedDay = page.locator(`[data-day="${history.failedDay}"]`)
    await expect(failedDay).toHaveClass(/completion-calendar__day--failed/)
    await expect(failedDay).toHaveAccessibleName(/goals not completed/)
  })
}

async function replaceProgressHistory(
  page: Page,
  history: {
    completedDayOffsets: number[]
    protectedDayOffsets: number[]
    failedDayOffsets: number[]
    stats: {
      currentStreak: number
      availableShields: number
      completedDaysTowardNextShield: number
    }
  }
) {
  return page.evaluate(async (progressHistory) => {
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
      const transaction = database.transaction(
        ['dayOutcomes', 'playerStats'],
        'readwrite'
      )
      const outcomes = transaction.objectStore('dayOutcomes')
      const playerStats = transaction.objectStore('playerStats')
      outcomes.clear()
      playerStats.clear()

      for (const offset of progressHistory.completedDayOffsets) {
        outcomes.put({ day: shiftedDay(offset), result: 'COMPLETED' })
      }

      for (const offset of progressHistory.protectedDayOffsets) {
        outcomes.put({ day: shiftedDay(offset), result: 'SHIELDED' })
      }

      for (const offset of progressHistory.failedDayOffsets) {
        outcomes.put({ day: shiftedDay(offset), result: 'FAILED' })
      }

      playerStats.put(progressHistory.stats, 'current')

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })

    database.close()

    return {
      protectedDay: shiftedDay(-2),
      failedDay: shiftedDay(progressHistory.failedDayOffsets[0] ?? 0),
      today: shiftedDay(0)
    }
  }, history)
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

async function givenTheyAreTrainingPushUpsBeforeSquats(page: Page) {
  await test.step('Given they are training Push-ups before Squats', async () => {
    await givenTheyOpenTheDashboard(page)
    await whenTheyChooseToAddAnExercise(page)
    await whenTheyCreateAnExercise(page, {
      name: 'Push-ups',
      dailyGoal: 15
    })
    await whenTheyChooseToAddAnExercise(page)
    await whenTheyCreateAnExercise(page, {
      name: 'Squats',
      dailyGoal: 20
    })
    await whenTheyExpandTheExercise(page, 'Push-ups')
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

async function whenTheyTryToCreateAnExercise(
  page: Page,
  exercise: { name: string; dailyGoal: number }
) {
  await test.step(`When they try to create another exercise named ${exercise.name.trim()}`, async () => {
    await page.getByLabel('Exercise name').fill(exercise.name)
    await page.getByLabel('Daily reps goal').fill(String(exercise.dailyGoal))
    await page.getByRole('button', { name: 'Save exercise' }).click()
  })
}

async function whenTheyChooseToEditTheExercise(
  page: Page,
  exerciseName: string
) {
  await test.step(`When they choose to edit ${exerciseName}`, async () => {
    await page.getByRole('button', { name: `Edit ${exerciseName}` }).click()
    await expect(page).toHaveURL(/\/exercises\/[^/]+\/edit$/)
    await expect(
      page.getByRole('heading', { level: 2, name: 'Edit exercise' })
    ).toBeVisible()
  })
}

async function thenTheySeeTheExerciseDetails(
  page: Page,
  exercise: { name: string; dailyGoal: number }
) {
  await test.step('Then the form is populated with the current exercise details', async () => {
    await expect(page.getByLabel('Exercise name')).toHaveValue(exercise.name)
    await expect(page.getByLabel('Daily reps goal')).toHaveValue(
      String(exercise.dailyGoal)
    )
  })
}

async function whenTheyReviseTheExercise(
  page: Page,
  exercise: { name: string; dailyGoal: number }
) {
  await test.step(`And they revise it to ${exercise.name} with a daily goal of ${exercise.dailyGoal}`, async () => {
    await page.getByLabel('Exercise name').fill(exercise.name)
    await page.getByLabel('Daily reps goal').fill(String(exercise.dailyGoal))
    await page.getByRole('button', { name: 'Save exercise' }).click()
    await expect(page).toHaveURL(/\/$/)
  })
}

async function thenTheRevisedGoalCompletesTodaysPlan(
  page: Page,
  exerciseName: string
) {
  await test.step("Then today's existing reps satisfy the revised goal", async () => {
    await expect(
      page.getByRole('heading', { level: 2, name: 'Day cleared!' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: `Expand ${exerciseName}. Status: Completed`
      })
    ).toBeVisible()
    await expect(
      page.getByRole('status').filter({ hasText: 'Quest complete!' })
    ).toBeVisible()
  })
}

async function thenTheDuplicateDraftRemainsEditable(
  page: Page,
  exercise: { name: string; dailyGoal: number }
) {
  await test.step('Then the duplicate warning appears without discarding their draft', async () => {
    await expect(page).toHaveURL(/\/exercises\/new$/)
    await expect(
      page.getByRole('alert').filter({
        hasText: 'An active exercise with this name already exists.'
      })
    ).toBeVisible()
    await expect(page.getByLabel('Exercise name')).toHaveValue(exercise.name)
    await expect(page.getByLabel('Daily reps goal')).toHaveValue(
      String(exercise.dailyGoal)
    )
  })
}

async function whenTheyReturnFromTheExerciseForm(page: Page) {
  await test.step('When they return to the dashboard without saving the duplicate', async () => {
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/$/)
  })
}

async function thenOnlyTheseExercisesAppear(
  page: Page,
  expectedNames: string[]
) {
  await test.step("Then only the original exercises appear in today's plan", async () => {
    await expect(exerciseNames(page)).toHaveText(expectedNames)
  })
}

async function whenTheyDeclineToArchiveTheExercise(
  page: Page,
  exerciseName: string
) {
  await test.step(`When they decline to archive ${exerciseName}`, async () => {
    const dialogHandled = page.waitForEvent('dialog').then(async (dialog) => {
      expect(dialog.message()).toBe(
        `Archive “${exerciseName}”? Its history will stay safe.`
      )
      await dialog.dismiss()
    })

    await page.getByRole('button', { name: 'Archive exercise' }).click()
    await dialogHandled
  })
}

async function thenTheyAreStillEditingTheExercise(
  page: Page,
  exerciseName: string
) {
  await test.step('Then the exercise remains active and unchanged', async () => {
    await expect(page).toHaveURL(/\/exercises\/[^/]+\/edit$/)
    await expect(page.getByLabel('Exercise name')).toHaveValue(exerciseName)
  })
}

async function whenTheyConfirmArchivingTheExercise(
  page: Page,
  exerciseName: string
) {
  await test.step(`When they confirm archiving ${exerciseName}`, async () => {
    const dialogHandled = page.waitForEvent('dialog').then(async (dialog) => {
      expect(dialog.message()).toBe(
        `Archive “${exerciseName}”? Its history will stay safe.`
      )
      await dialog.accept()
    })

    await page.getByRole('button', { name: 'Archive exercise' }).click()
    await dialogHandled
    await expect(page).toHaveURL(/\/$/)
  })
}

async function thenTheExerciseMovesToTheArchive(page: Page) {
  await test.step("Then the exercise leaves today's plan and appears in the archive", async () => {
    await expect(exerciseNames(page)).toHaveCount(0)
    await expect(page.getByText('Archived (1)', { exact: true })).toBeVisible()
  })
}

async function whenTheyOpenTheArchive(page: Page) {
  await test.step('When they open the archive', async () => {
    await page.getByText('Archived (1)', { exact: true }).click()
  })
}

async function whenTheyRestoreTheExercise(page: Page, exerciseName: string) {
  await test.step(`When they restore ${exerciseName}`, async () => {
    await expect(
      page.getByRole('button', { name: `Restore ${exerciseName}` })
    ).toBeVisible()
    await page.getByRole('button', { name: `Restore ${exerciseName}` }).click()
    await expect(
      page.getByRole('button', {
        name: `Expand ${exerciseName}. Status: Not completed`
      })
    ).toBeVisible()
    await expect(
      page.getByText('Archived (1)', { exact: true })
    ).not.toBeVisible()
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

async function whenTheyExpandTheExercise(
  page: Page,
  exerciseName: string,
  status: 'Not completed' | 'Completed' = 'Not completed'
) {
  await test.step('When they expand the exercise to see its details', async () => {
    await page
      .getByRole('button', {
        name: `Expand ${exerciseName}. Status: ${status}`
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
      page.getByRole('button', {
        name: `Collapse details for ${exercise.name}`
      })
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
  await test.step('When they record five reps', async () => {
    await page
      .getByRole('button', { name: `Add 5 reps to ${exerciseName}` })
      .click()
  })
}

async function thenTheExerciseHasProgress(
  page: Page,
  exercise: { name: string; completedReps: number; dailyGoal: number }
) {
  await test.step(`Then ${exercise.name} keeps ${exercise.completedReps} of ${exercise.dailyGoal} reps`, async () => {
    const progress = progressFor(page, exercise.name)
    await expect(progress).toHaveAccessibleName(
      `Progress for ${exercise.name}: ${exercise.completedReps} of ${exercise.dailyGoal}`
    )
    await expect(progress).toHaveAttribute(
      'aria-valuenow',
      String(exercise.completedReps)
    )
    await expect(progress).toHaveAttribute(
      'aria-valuemax',
      String(exercise.dailyGoal)
    )
  })
}

async function whenTheyUndoTheirLastSet(page: Page) {
  await test.step('When they undo their last set', async () => {
    await page.getByRole('button', { name: 'Undo' }).click()
  })
}

async function thenTheySeeTheirRepsWereRemoved(
  page: Page,
  exerciseName: string
) {
  await test.step('Then that set is removed from today’s progress', async () => {
    await expect(progressFor(page, exerciseName)).toHaveAttribute(
      'aria-valuenow',
      '0'
    )
    await expect(page.getByText('15 to go', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Undo' })).not.toBeVisible()
  })
}

async function whenTheyCompletePushUps(page: Page) {
  await test.step('When they complete Push-ups', async () => {
    await whenTheyRecordTenReps(page, 'Push-ups')
    await thenTheySeeFiveRepsRemaining(page, 'Push-ups')
    await whenTheyRecordFiveReps(page, 'Push-ups')
    await thenTheySeeThatTheExerciseIsCompleteWhileTheDayStillNeedsWork(
      page,
      'Push-ups'
    )
  })
}

async function thenTheySeeThatTheExerciseIsCompleteWhileTheDayStillNeedsWork(
  page: Page,
  exerciseName: string
) {
  await test.step(`Then ${exerciseName} is complete while today's quest remains open`, async () => {
    await expect(
      page.getByRole('heading', { level: 2, name: 'Ready, player one?' })
    ).toBeVisible()
    await expect(progressFor(page, exerciseName)).toHaveAttribute(
      'aria-valuenow',
      '15'
    )
    await expect(page.getByText('GOAL CLEARED', { exact: true })).toBeVisible()
    await expect(page.getByText('Start your streak today')).toBeVisible()
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: `Added +5 to ${exerciseName}` })
    ).toBeVisible()
  })
}

async function thenTheySeeThatTodaysGoalIsComplete(
  page: Page,
  exerciseName: string
) {
  await test.step("Then today's goal is complete while its stats await finalization", async () => {
    await expect(
      page.getByRole('heading', { level: 2, name: 'Day cleared!' })
    ).toBeVisible()
    await expect(progressFor(page, exerciseName)).toHaveAttribute(
      'aria-valuenow',
      '15'
    )
    await expect(page.getByText('GOAL CLEARED', { exact: true })).toBeVisible()
    await expect(page.getByText('Start your streak today')).toBeVisible()
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
        name: `Collapse details for ${exerciseName}`
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

async function thenSquatsAreOpenAboveTheCompletedExercise(page: Page) {
  await test.step('Then Squats are open above the completed exercise', async () => {
    await expect(exerciseNames(page)).toHaveText(['Squats', 'Push-ups'])
    await expect(
      page.getByRole('button', {
        name: 'Collapse details for Squats'
      })
    ).toBeVisible()
  })
}

async function thenTheCalendarShowsTheCompletedDay(page: Page, day: string) {
  await test.step('Then the victory calendar marks that completed day', async () => {
    const completedDay = page.locator(`[data-day="${day}"]`)
    await expect(completedDay).toHaveClass(/completion-calendar__day--complete/)
    await expect(completedDay).toHaveAccessibleName(/all goals completed/)
  })
}

function exerciseNames(page: Page) {
  return page.locator('.home-exercises__summary strong, .exercise-card__name')
}

function progressFor(page: Page, exerciseName: string) {
  return page.getByRole('progressbar', {
    name: new RegExp(`^Progress for ${exerciseName}:`)
  })
}
