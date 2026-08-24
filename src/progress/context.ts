import { inject, provide, type InjectionKey } from 'vue'

import { progressRepository } from '@/progress/repository'
import type { ProgressRepository } from '@/progress/types'

const PROGRESS_REPOSITORY_KEY: InjectionKey<ProgressRepository> = Symbol(
  'progress-repository'
)

export function provideProgressRepository(
  repository: ProgressRepository = progressRepository
) {
  provide(PROGRESS_REPOSITORY_KEY, repository)
}

export function useProgressRepository() {
  const repository = inject(PROGRESS_REPOSITORY_KEY)

  if (!repository) {
    throw new Error('Progress repository was not provided.')
  }

  return repository
}
