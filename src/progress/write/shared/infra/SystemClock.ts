import type { ClockPort } from '@/progress/write/shared/ClockPort'

export class SystemClock implements ClockPort {
  public now(): Date {
    return new Date()
  }
}
