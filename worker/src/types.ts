// TypeScript types for D1 Database and Hono bindings

export interface Env {
  DB: D1Database;
}

// Database models (row types - what's stored in D1)
export interface Team {
  id: string;
  name: string;
  elttl_url: string;
  created_at: number;
  updated_at: number;
}

export interface FixtureRow {
  id: string;
  team_id: string;
  match_date: string;
  day_time: string;
  home_team: string;
  away_team: string;
  venue: string | null;
  created_at: number;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  created_at: number;
}

export interface Availability {
  id: string;
  fixture_id: string;
  player_id: string;
  is_available: number; // SQLite uses INTEGER for boolean (0 or 1)
  updated_at: number;
}

export interface FinalSelection {
  id: string;
  fixture_id: string;
  player_id: string;
  selected_at: number;
}

// API response types (what the API returns to clients)
export interface Fixture extends FixtureRow {
  is_past: number; // Computed field: 0 or 1
}

// API request/response types
export interface ImportTeamRequest {
  elttlUrl: string;
}

export interface ImportTeamResponse {
  success: boolean;
  teamId: string;
  redirect: string;
}

export interface UpdateAvailabilityRequest {
  isAvailable: boolean;
}

export interface SetFinalSelectionRequest {
  playerIds: string[];
}

export interface TeamDataResponse {
  team: Team;
  fixtures: Fixture[];
  players: Player[];
  availability: Record<string, boolean>; // fixture_id_player_id: boolean
  finalSelections: Record<string, string[]>; // fixture_id: player_id[]
}

export interface PlayerSummary {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  gamesScheduled: number;
  totalGames: number;
  selectionRate: number; // percentage
}

export interface PlayerSummaryResponse {
  summary: PlayerSummary[];
}

export interface SyncResponse {
  success: boolean;
  fixtures_updated: number;
  fixtures_unchanged: number;
  fixtures_new: number;
  updated_fixture_ids: string[];
  message: string;
}

// ELTTL scraper types
export interface ScrapedFixture {
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string;
}

export interface ScrapedTeamData {
  teamName: string;
  fixtures: ScrapedFixture[];
  players: string[];
}
