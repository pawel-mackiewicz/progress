export type LocalDayKey = `${number}-${number}-${number}`

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

export function toLocalDayKey(date = new Date()): LocalDayKey {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}` as LocalDayKey
}

export function fromLocalDayKey(day: LocalDayKey): Date {
  const [year, month, date] = day.split('-').map(Number)

  return new Date(year, month - 1, date)
}

export function shiftLocalDay(day: LocalDayKey, amount: number): LocalDayKey {
  const date = fromLocalDayKey(day)
  date.setDate(date.getDate() + amount)

  return toLocalDayKey(date)
}

export function monthRange(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  return {
    firstDay,
    firstDayKey: toLocalDayKey(firstDay),
    lastDayKey: toLocalDayKey(lastDay)
  }
}
