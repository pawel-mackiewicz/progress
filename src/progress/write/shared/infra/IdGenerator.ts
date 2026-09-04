import type { IdGeneratorPort } from '@/progress/write/shared/IdGeneratorPort'

export class IdGenerator implements IdGeneratorPort {
  public generate(): string {
    return crypto.randomUUID()
  }
}
