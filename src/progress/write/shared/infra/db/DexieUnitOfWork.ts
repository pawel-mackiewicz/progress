import type { ProgressDatabase } from '@/db'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'

export class DexieUnitOfWork implements UnitOfWork {
  public constructor(private readonly database: ProgressDatabase) {}

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    return this.database.transaction('rw', this.database.tables, action)
  }
}
