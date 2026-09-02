import { inject, provide, type InjectionKey } from 'vue'

import { progressCommands } from '@/progress/commands'
import { progressQueries } from '@/progress/queries'
import type { ProgressCommands, ProgressQueries } from '@/progress/types'

const PROGRESS_QUERIES_KEY: InjectionKey<ProgressQueries> =
  Symbol('progress-queries')
const PROGRESS_COMMANDS_KEY: InjectionKey<ProgressCommands> =
  Symbol('progress-commands')

export function provideProgressServices(
  queries: ProgressQueries = progressQueries,
  commands: ProgressCommands = progressCommands
) {
  provide(PROGRESS_QUERIES_KEY, queries)
  provide(PROGRESS_COMMANDS_KEY, commands)
}

export function useProgressQueries() {
  const queries = inject(PROGRESS_QUERIES_KEY)

  if (!queries) {
    throw new Error('Progress queries were not provided.')
  }

  return queries
}

export function useProgressCommands() {
  const commands = inject(PROGRESS_COMMANDS_KEY)

  if (!commands) {
    throw new Error('Progress commands were not provided.')
  }

  return commands
}
