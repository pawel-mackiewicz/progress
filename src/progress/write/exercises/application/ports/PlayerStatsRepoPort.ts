import { PlayerStats } from '@/progress/write/exercises/domain/PlayerStats'

export interface PlayerStatsRepoPort {
  get(): Promise<PlayerStats>
  save(stats: PlayerStats): Promise<void>
}

export class FakePlayerStatsRepo implements PlayerStatsRepoPort {
  public readonly savedStats: PlayerStats[] = []
  private existingStats: PlayerStats = PlayerStats.initial()

  public seed(stats: PlayerStats): void {
    this.existingStats = stats
  }

  public async get(): Promise<PlayerStats> {
    return this.savedStats.at(-1) ?? this.existingStats
  }

  public async save(stats: PlayerStats): Promise<void> {
    this.savedStats.push(stats)
  }
}
