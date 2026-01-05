import type { Env, Team, FixtureRow, Player, Availability, FinalSelection } from './types';
import { generateUUID, now } from './utils';

/**
 * Database service for D1 operations
 */
export class DatabaseService {
  constructor(private db: D1Database) {}

  // Teams
  async createTeam(name: string, elttlUrl: string): Promise<Team> {
    const id = generateUUID();
    const timestamp = now();
    
    await this.db
      .prepare('INSERT INTO teams (id, name, elttl_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, name, elttlUrl, timestamp, timestamp)
      .run();

    return {
      id,
      name,
      elttl_url: elttlUrl,
      created_at: timestamp,
      updated_at: timestamp
    };
  }

  async getTeam(teamId: string): Promise<Team | null> {
    const result = await this.db
      .prepare('SELECT * FROM teams WHERE id = ?')
      .bind(teamId)
      .first<Team>();
    
    return result;
  }

  async getTeamByUrl(elttlUrl: string): Promise<Team | null> {
    const result = await this.db
      .prepare('SELECT * FROM teams WHERE elttl_url = ?')
      .bind(elttlUrl)
      .first<Team>();
    
    return result;
  }

  // Fixtures
  async createFixture(
    teamId: string,
    matchDate: string,
    dayTime: string,
    homeTeam: string,
    awayTeam: string,
    venue?: string
  ): Promise<FixtureRow> {
    const id = generateUUID();
    const timestamp = now();

    await this.db
      .prepare(`
        INSERT INTO fixtures (id, team_id, match_date, day_time, home_team, away_team, venue, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, teamId, matchDate, dayTime, homeTeam, awayTeam, venue || null, timestamp)
      .run();

    return {
      id,
      team_id: teamId,
      match_date: matchDate,
      day_time: dayTime,
      home_team: homeTeam,
      away_team: awayTeam,
      venue: venue || null,
      created_at: timestamp
    };
  }

  async getFixtures(teamId: string): Promise<FixtureRow[]> {
    const result = await this.db
      .prepare('SELECT * FROM fixtures WHERE team_id = ? ORDER BY match_date ASC')
      .bind(teamId)
      .all<FixtureRow>();
    
    return result.results || [];
  }

  async getFixture(fixtureId: string): Promise<FixtureRow | null> {
    const result = await this.db
      .prepare('SELECT * FROM fixtures WHERE id = ?')
      .bind(fixtureId)
      .first<FixtureRow>();
    
    return result;
  }

  async getFixtureByTeams(teamId: string, homeTeam: string, awayTeam: string): Promise<FixtureRow | null> {
    const result = await this.db
      .prepare('SELECT * FROM fixtures WHERE team_id = ? AND home_team = ? AND away_team = ?')
      .bind(teamId, homeTeam, awayTeam)
      .first<FixtureRow>();
    
    return result;
  }

  async updateFixtureDate(fixtureId: string, matchDate: string, dayTime: string): Promise<void> {
    await this.db
      .prepare('UPDATE fixtures SET match_date = ?, day_time = ? WHERE id = ?')
      .bind(matchDate, dayTime, fixtureId)
      .run();
  }

  async clearAvailabilityForFixture(fixtureId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM availability WHERE fixture_id = ?')
      .bind(fixtureId)
      .run();
  }

  // Players
  async createPlayer(teamId: string, name: string): Promise<Player> {
    const id = generateUUID();
    const timestamp = now();

    await this.db
      .prepare('INSERT INTO players (id, team_id, name, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, teamId, name, timestamp)
      .run();

    return {
      id,
      team_id: teamId,
      name,
      created_at: timestamp
    };
  }

  async getPlayers(teamId: string): Promise<Player[]> {
    const result = await this.db
      .prepare('SELECT * FROM players WHERE team_id = ? ORDER BY name ASC')
      .bind(teamId)
      .all<Player>();
    
    return result.results || [];
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const result = await this.db
      .prepare('SELECT * FROM players WHERE id = ?')
      .bind(playerId)
      .first<Player>();
    
    return result;
  }

  // Availability
  async createAvailability(fixtureId: string, playerId: string, isAvailable: boolean): Promise<Availability> {
    const id = generateUUID();
    const timestamp = now();

    await this.db
      .prepare('INSERT INTO availability (id, fixture_id, player_id, is_available, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, fixtureId, playerId, isAvailable ? 1 : 0, timestamp)
      .run();

    return {
      id,
      fixture_id: fixtureId,
      player_id: playerId,
      is_available: isAvailable ? 1 : 0,
      updated_at: timestamp
    };
  }

  async updateAvailability(fixtureId: string, playerId: string, isAvailable: boolean): Promise<void> {
    const timestamp = now();

    await this.db
      .prepare('UPDATE availability SET is_available = ?, updated_at = ? WHERE fixture_id = ? AND player_id = ?')
      .bind(isAvailable ? 1 : 0, timestamp, fixtureId, playerId)
      .run();
  }

  async getAvailability(teamId: string): Promise<Availability[]> {
    const result = await this.db
      .prepare(`
        SELECT a.* FROM availability a
        JOIN fixtures f ON a.fixture_id = f.id
        WHERE f.team_id = ?
      `)
      .bind(teamId)
      .all<Availability>();
    
    return result.results || [];
  }

  async getAvailabilityForFixture(fixtureId: string): Promise<Availability[]> {
    const result = await this.db
      .prepare('SELECT * FROM availability WHERE fixture_id = ?')
      .bind(fixtureId)
      .all<Availability>();
    
    return result.results || [];
  }

  // Final Selections
  async createFinalSelection(fixtureId: string, playerId: string): Promise<FinalSelection> {
    const id = generateUUID();
    const timestamp = now();

    await this.db
      .prepare('INSERT INTO final_selections (id, fixture_id, player_id, selected_at) VALUES (?, ?, ?, ?)')
      .bind(id, fixtureId, playerId, timestamp)
      .run();

    return {
      id,
      fixture_id: fixtureId,
      player_id: playerId,
      selected_at: timestamp
    };
  }

  async clearFinalSelections(fixtureId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM final_selections WHERE fixture_id = ?')
      .bind(fixtureId)
      .run();
  }

  // Batch operations for sync
  async batchUpdateFixture(
    fixtureId: string,
    matchDate: string,
    dayTime: string,
    playerIds: string[]
  ): Promise<void> {
    const timestamp = now();

    // Build batch of statements
    const statements = [
      // Update fixture date
      this.db.prepare('UPDATE fixtures SET match_date = ?, day_time = ? WHERE id = ?')
        .bind(matchDate, dayTime, fixtureId),
      // Clear availability
      this.db.prepare('DELETE FROM availability WHERE fixture_id = ?')
        .bind(fixtureId),
      // Clear final selections
      this.db.prepare('DELETE FROM final_selections WHERE fixture_id = ?')
        .bind(fixtureId),
    ];

    // Add availability inserts for each player
    for (const playerId of playerIds) {
      const availId = generateUUID();
      statements.push(
        this.db.prepare('INSERT INTO availability (id, fixture_id, player_id, is_available, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind(availId, fixtureId, playerId, 0, timestamp)
      );
    }

    // Execute all statements in a batch
    await this.db.batch(statements);
  }

  async batchCreateFixtureWithAvailability(
    teamId: string,
    matchDate: string,
    dayTime: string,
    homeTeam: string,
    awayTeam: string,
    venue: string | undefined,
    playerIds: string[]
  ): Promise<FixtureRow> {
    const fixtureId = generateUUID();
    const timestamp = now();

    // Build batch of statements
    const statements = [
      // Create fixture
      this.db.prepare(`
        INSERT INTO fixtures (id, team_id, match_date, day_time, home_team, away_team, venue, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(fixtureId, teamId, matchDate, dayTime, homeTeam, awayTeam, venue || null, timestamp),
    ];

    // Add availability inserts for each player
    for (const playerId of playerIds) {
      const availId = generateUUID();
      statements.push(
        this.db.prepare('INSERT INTO availability (id, fixture_id, player_id, is_available, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind(availId, fixtureId, playerId, 0, timestamp)
      );
    }

    // Execute all statements in a batch
    await this.db.batch(statements);

    return {
      id: fixtureId,
      team_id: teamId,
      match_date: matchDate,
      day_time: dayTime,
      home_team: homeTeam,
      away_team: awayTeam,
      venue: venue || null,
      created_at: timestamp
    };
  }

  async getFinalSelections(teamId: string): Promise<FinalSelection[]> {
    const result = await this.db
      .prepare(`
        SELECT fs.* FROM final_selections fs
        JOIN fixtures f ON fs.fixture_id = f.id
        WHERE f.team_id = ?
      `)
      .bind(teamId)
      .all<FinalSelection>();
    
    return result.results || [];
  }

  async getFinalSelectionsByFixture(fixtureId: string): Promise<FinalSelection[]> {
    const result = await this.db
      .prepare('SELECT * FROM final_selections WHERE fixture_id = ?')
      .bind(fixtureId)
      .all<FinalSelection>();
    
    return result.results || [];
  }
}
