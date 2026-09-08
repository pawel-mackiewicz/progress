import { PLAYER_STATS_KEY, type ProgressDatabase } from '@/db'
import type { PlayerStatsRepoPort } from '@/progress/write/exercises/application/ports/PlayerStatsRepoPort'
import { PlayerStats } from '@/progress/write/exercises/domain/PlayerStats'

export class DexiePlayerStatsRepo implements PlayerStatsRepoPort {
  public constructor(private readonly database: ProgressDatabase) {}

  public async get(): Promise<PlayerStats> {
    const snapshot = await this.database.playerStats.get(PLAYER_STATS_KEY)

    return snapshot ? PlayerStats.restore(snapshot) : PlayerStats.initial()
  }

  public async save(stats: PlayerStats): Promise<void> {
    await this.database.playerStats.put(stats.toSnapshot(), PLAYER_STATS_KEY)
  }
}
