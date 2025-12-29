// Types for Availability Tracker

export interface Team {
  id: string;
  name: string;
  elttl_url: string;
  created_at: number;
  updated_at: number;
}

export interface Fixture {
  id: string;
  team_id: string;
  match_date: string;
  day_time: string;
  home_team: string;
  away_team: string;
  venue?: string;
  is_past: number; // SQLite boolean (0 or 1)
  created_at: number;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  created_at: number;
}

export interface TeamData {
  team: Team;
  fixtures: Fixture[];
  players: Player[];
  availability: Record<string, boolean>; // key: fixtureId_playerId
  finalSelections: Record<string, string[]>; // key: fixtureId, value: playerId[]
}

export interface PlayerSummary {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  gamesScheduled: number;
  totalGames: number;
  selectionRate: number;
}

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

export interface ApiError {
  error: string;
}
