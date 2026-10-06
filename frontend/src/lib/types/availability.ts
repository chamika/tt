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
  // When the player left the squad; null while they are active
  left_at: number | null;
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
  left: boolean; // No longer in the ELTTL squad
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

export interface SyncPlanNew {
  match_date: string;
  day_time: string;
  home_team: string;
  away_team: string;
  venue: string | null;
}

export interface SyncPlanUpdate {
  id: string;
  home_team: string;
  away_team: string;
  old_match_date: string;
  old_day_time: string;
  new_match_date: string;
  new_day_time: string;
  // Data that applying the update would clear
  available_count: number;
  selected_count: number;
}

export interface SyncPlanDelete {
  id: string;
  match_date: string;
  day_time: string;
  home_team: string;
  away_team: string;
  is_past: number; // SQLite boolean (0 or 1)
  // Data that deleting the fixture would take with it
  available_count: number;
  selected_count: number;
}

export interface SyncPlanPlayer {
  id: string;
  name: string;
}

// Squad changes: who joined, who left (hidden, history kept) and who came back
export interface SyncPlanPlayers {
  added: string[];
  left: SyncPlanPlayer[];
  rejoined: SyncPlanPlayer[];
}

export interface SyncPlan {
  new: SyncPlanNew[];
  updated: SyncPlanUpdate[];
  deleted: SyncPlanDelete[];
  unchanged_count: number;
  players: SyncPlanPlayers;
}

export interface SyncResponse {
  success: boolean;
  dry_run: boolean;
  fixtures_updated: number;
  fixtures_unchanged: number;
  fixtures_new: number;
  fixtures_deleted: number;
  players_added: number;
  players_left: number;
  players_rejoined: number;
  updated_fixture_ids: string[];
  plan: SyncPlan;
  message: string;
}

export interface ApiError {
  error: string;
}
