import type { RepIncrement } from '@/progress/types'

export type AddRepCommand = {
  exerciseId: string
  amount: RepIncrement
}
