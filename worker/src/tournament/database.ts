import type {
  Match,
  Player,
  StateChanges,
  Tournament,
  TournamentMatchRow,
  TournamentPlayerRow,
  TournamentSettings,
  TournamentState,
  TournamentStatus
} from './types';

// Match columns a result or advancement can change
const MUTABLE_MATCH_COLUMNS = [
  'player_a_id',
  'player_b_id',
  'winner_id',
  'games_a',
  'games_b',
  'game_scores',
  'completed_at'
] as const;

type MutableMatchColumn = (typeof MUTABLE_MATCH_COLUMNS)[number];

// Appended to the statements that redraw a draft, so that if the tournament is
// started in the meantime the whole batch changes nothing (binds the tournament id)
const ONLY_IF_DRAFT = "EXISTS (SELECT 1 FROM tournaments WHERE id = ? AND status = 'draft')";

function rowToMatch(row: TournamentMatchRow): Match {
  const { tournament_id: _tournament, updated_at: _updated, ...match } = row;
  return {
    ...match,
    is_bye: row.is_bye === 1,
    game_scores: row.game_scores ? JSON.parse(row.game_scores) : null
  };
}

function rowToPlayer(row: TournamentPlayerRow): Player {
  const { tournament_id: _tournament, created_at: _created, ...player } = row;
  return player;
}

function columnValue(match: Match, column: MutableMatchColumn): string | number | null {
  if (column === 'game_scores') {
    return match.game_scores ? JSON.stringify(match.game_scores) : null;
  }
  return match[column];
}

/**
 * D1 storage for tournaments.
 *
 * A tournament is always read whole (it is at most a few hundred rows), worked
 * on by the pure engine, and written back as a batch so every change lands
 * together or not at all.
 */
export class TournamentRepository {
  constructor(private db: D1Database) {}

  async getState(tournamentId: string): Promise<TournamentState | null> {
    const [tournament, players, matches] = await Promise.all([
      this.db.prepare('SELECT * FROM tournaments WHERE id = ?').bind(tournamentId).first<Tournament>(),
      this.db
        .prepare('SELECT * FROM tournament_players WHERE tournament_id = ? ORDER BY seed ASC')
        .bind(tournamentId)
        .all<TournamentPlayerRow>(),
      this.db
        .prepare('SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY stage, group_index, round, position')
        .bind(tournamentId)
        .all<TournamentMatchRow>()
    ]);

    if (!tournament) return null;

    return {
      tournament,
      players: (players.results || []).map(rowToPlayer),
      matches: (matches.results || []).map(rowToMatch)
    };
  }

  private insertPlayer(tournamentId: string, player: Player, timestamp: number, onlyIfDraft = false): D1PreparedStatement {
    return this.db
      .prepare(`
        INSERT INTO tournament_players
          (id, tournament_id, name, ranking, handicap, seed, group_index, manual_group_rank, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? ${onlyIfDraft ? `WHERE ${ONLY_IF_DRAFT}` : ''}
      `)
      .bind(
        player.id,
        tournamentId,
        player.name,
        player.ranking,
        player.handicap,
        player.seed,
        player.group_index,
        player.manual_group_rank,
        timestamp,
        ...(onlyIfDraft ? [tournamentId] : [])
      );
  }

  private insertMatch(tournamentId: string, match: Match, timestamp: number, onlyIfDraft = false): D1PreparedStatement {
    return this.db
      .prepare(`
        INSERT INTO tournament_matches
          (id, tournament_id, stage, group_index, round, position, player_a_id, player_b_id,
           source_a, source_b, next_match_id, next_slot, is_bye, winner_id, games_a, games_b,
           game_scores, completed_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ${onlyIfDraft ? `WHERE ${ONLY_IF_DRAFT}` : ''}
      `)
      .bind(
        match.id,
        tournamentId,
        match.stage,
        match.group_index,
        match.round,
        match.position,
        match.player_a_id,
        match.player_b_id,
        match.source_a,
        match.source_b,
        match.next_match_id,
        match.next_slot,
        match.is_bye ? 1 : 0,
        match.winner_id,
        match.games_a,
        match.games_b,
        columnValue(match, 'game_scores'),
        match.completed_at,
        timestamp,
        ...(onlyIfDraft ? [tournamentId] : [])
      );
  }

  /** Store a new draft tournament with its draw */
  async create(
    id: string,
    settings: TournamentSettings,
    players: Player[],
    matches: Match[],
    timestamp: number
  ): Promise<Tournament> {
    const tournament: Tournament = { ...settings, id, status: 'draft', created_at: timestamp, updated_at: timestamp };

    await this.db.batch([
      this.db
        .prepare(`
          INSERT INTO tournaments
            (id, name, format, seeding_mode, score_mode, best_of, group_count, advance_per_group,
             status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          id,
          settings.name,
          settings.format,
          settings.seeding_mode,
          settings.score_mode,
          settings.best_of,
          settings.group_count,
          settings.advance_per_group,
          tournament.status,
          timestamp,
          timestamp
        ),
      ...players.map(p => this.insertPlayer(id, p, timestamp)),
      ...matches.map(m => this.insertMatch(id, m, timestamp))
    ]);

    return tournament;
  }

  /**
   * Replace a draft's settings, players and matches with a new draw.
   * Returns false, having changed nothing, if the tournament is no longer a draft.
   */
  async replaceDraw(
    tournamentId: string,
    settings: TournamentSettings,
    players: Player[],
    matches: Match[],
    timestamp: number
  ): Promise<boolean> {
    // Every statement checks the status itself; the batch runs as one transaction
    const [updated] = await this.db.batch([
      this.db
        .prepare(`
          UPDATE tournaments
          SET name = ?, format = ?, seeding_mode = ?, score_mode = ?, best_of = ?, group_count = ?,
              advance_per_group = ?, updated_at = ?
          WHERE id = ? AND status = 'draft'
        `)
        .bind(
          settings.name,
          settings.format,
          settings.seeding_mode,
          settings.score_mode,
          settings.best_of,
          settings.group_count,
          settings.advance_per_group,
          timestamp,
          tournamentId
        ),
      this.db
        .prepare(`DELETE FROM tournament_matches WHERE tournament_id = ? AND ${ONLY_IF_DRAFT}`)
        .bind(tournamentId, tournamentId),
      this.db
        .prepare(`DELETE FROM tournament_players WHERE tournament_id = ? AND ${ONLY_IF_DRAFT}`)
        .bind(tournamentId, tournamentId),
      ...players.map(p => this.insertPlayer(tournamentId, p, timestamp, true)),
      ...matches.map(m => this.insertMatch(tournamentId, m, timestamp, true))
    ]);

    return (updated.meta?.changes ?? 0) > 0;
  }

  /** Move a tournament from one status to another; false if it wasn't in `from` any more */
  async transitionStatus(
    tournamentId: string,
    from: TournamentStatus,
    to: TournamentStatus,
    timestamp: number
  ): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE tournaments SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
      .bind(to, timestamp, tournamentId, from)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  /**
   * Write the engine's changes. Only the columns that actually changed are
   * updated, so two results entered at once that feed different slots of the
   * same next-round match don't overwrite each other.
   */
  async saveChanges(before: TournamentState, changes: StateChanges, timestamp: number): Promise<void> {
    const { id: tournamentId } = before.tournament;
    const previousMatches = new Map(before.matches.map(m => [m.id, m]));
    const previousPlayers = new Map(before.players.map(p => [p.id, p]));
    const statements: D1PreparedStatement[] = [];

    for (const match of changes.matches) {
      const previous = previousMatches.get(match.id);
      const columns = MUTABLE_MATCH_COLUMNS.filter(
        column => !previous || columnValue(previous, column) !== columnValue(match, column)
      );
      if (columns.length === 0) continue;

      statements.push(
        this.db
          .prepare(
            `UPDATE tournament_matches SET ${columns.map(c => `${c} = ?`).join(', ')}, updated_at = ? ` +
              'WHERE id = ? AND tournament_id = ?'
          )
          .bind(...columns.map(c => columnValue(match, c)), timestamp, match.id, tournamentId)
      );
    }

    for (const player of changes.players) {
      if (previousPlayers.get(player.id)?.manual_group_rank === player.manual_group_rank) continue;
      statements.push(
        this.db
          .prepare('UPDATE tournament_players SET manual_group_rank = ? WHERE id = ? AND tournament_id = ?')
          .bind(player.manual_group_rank, player.id, tournamentId)
      );
    }

    if (statements.length === 0 && changes.status === before.tournament.status) return;

    statements.push(
      this.db
        .prepare('UPDATE tournaments SET status = ?, updated_at = ? WHERE id = ?')
        .bind(changes.status, timestamp, tournamentId)
    );

    await this.db.batch(statements);
  }
}
