import type { Rubber, TeamMatch, TeamMatchDetails, TeamMatchRow, TeamMatchRubberRow } from './types';

function rowToMatch(row: TeamMatchRow): TeamMatch {
  return { ...row, home_players: JSON.parse(row.home_players), away_players: JSON.parse(row.away_players) };
}

function rowToRubber(row: TeamMatchRubberRow): Rubber {
  const { match_id: _match, updated_at: _updated, ...rubber } = row;
  return { ...rubber, game_scores: JSON.parse(row.game_scores) };
}

/**
 * D1 storage for team matches.
 *
 * Each rubber is its own row and the match score is worked out on read, so two
 * people entering different rubbers at once never touch the same row.
 */
export class TeamMatchRepository {
  constructor(private db: D1Database) {}

  async get(id: string): Promise<{ match: TeamMatch; rubbers: Rubber[] } | null> {
    const [match, rubbers] = await Promise.all([
      this.db.prepare('SELECT * FROM team_matches WHERE id = ?').bind(id).first<TeamMatchRow>(),
      this.db
        .prepare('SELECT * FROM team_match_rubbers WHERE match_id = ? ORDER BY number')
        .bind(id)
        .all<TeamMatchRubberRow>()
    ]);

    if (!match) return null;
    return { match: rowToMatch(match), rubbers: (rubbers.results || []).map(rowToRubber) };
  }

  async create(id: string, details: TeamMatchDetails, timestamp: number): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO team_matches
          (id, title, match_date, home_team, away_team, home_players, away_players, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        details.title,
        details.match_date,
        details.home_team,
        details.away_team,
        JSON.stringify(details.home_players),
        JSON.stringify(details.away_players),
        timestamp,
        timestamp
      )
      .run();
  }

  async updateDetails(id: string, details: TeamMatchDetails, timestamp: number): Promise<void> {
    await this.db
      .prepare(`
        UPDATE team_matches
        SET title = ?, match_date = ?, home_team = ?, away_team = ?, home_players = ?, away_players = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(
        details.title,
        details.match_date,
        details.home_team,
        details.away_team,
        JSON.stringify(details.home_players),
        JSON.stringify(details.away_players),
        timestamp,
        id
      )
      .run();
  }

  /** Record a rubber's result, or replace the one already there */
  async saveRubber(matchId: string, rubber: Rubber, timestamp: number): Promise<void> {
    await this.db.batch([
      this.db
        .prepare(`
          INSERT INTO team_match_rubbers
            (match_id, number, game_scores, home_games, away_games, winner, home_pair, away_pair, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (match_id, number) DO UPDATE SET
            game_scores = excluded.game_scores,
            home_games = excluded.home_games,
            away_games = excluded.away_games,
            winner = excluded.winner,
            home_pair = excluded.home_pair,
            away_pair = excluded.away_pair,
            updated_at = excluded.updated_at
        `)
        .bind(
          matchId,
          rubber.number,
          JSON.stringify(rubber.game_scores),
          rubber.home_games,
          rubber.away_games,
          rubber.winner,
          rubber.home_pair,
          rubber.away_pair,
          timestamp
        ),
      this.touch(matchId, timestamp)
    ]);
  }

  /** Remove a rubber's result; false if it had none */
  async deleteRubber(matchId: string, number: number, timestamp: number): Promise<boolean> {
    const [deleted] = await this.db.batch([
      this.db.prepare('DELETE FROM team_match_rubbers WHERE match_id = ? AND number = ?').bind(matchId, number),
      this.touch(matchId, timestamp)
    ]);
    return (deleted.meta?.changes ?? 0) > 0;
  }

  private touch(matchId: string, timestamp: number): D1PreparedStatement {
    return this.db.prepare('UPDATE team_matches SET updated_at = ? WHERE id = ?').bind(timestamp, matchId);
  }
}
