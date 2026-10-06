// Types for Tournament Brackets (mirrors worker/src/tournament/types.ts)

export type TournamentFormat = 'knockout' | 'groups';
export type SeedingMode = 'ranking' | 'handicap';
export type ScoreMode = 'points' | 'games' | 'winner';
export type TournamentStatus = 'draft' | 'in_progress' | 'completed';
export type MatchStage = 'group' | 'knockout';
export type MatchStatus = 'bye' | 'pending' | 'ready' | 'completed';

export const BEST_OF_OPTIONS = [1, 3, 5, 7];
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 64;
export const MAX_GROUPS = 16;

export interface TournamentSettings {
  name: string;
  format: TournamentFormat;
  seeding_mode: SeedingMode;
  score_mode: ScoreMode;
  best_of: number;
  group_count: number | null;
  advance_per_group: number | null;
}

export interface Tournament extends TournamentSettings {
  id: string;
  status: TournamentStatus;
  created_at: number;
  updated_at: number;
}

export interface PlayerInput {
  name: string;
  ranking?: number | null;
  handicap?: number | null;
}

export interface Player {
  id: string;
  name: string;
  ranking: number | null;
  handicap: number | null;
  seed: number;
  group_index: number | null;
  manual_group_rank: number | null;
}

export interface GameScore {
  a: number;
  b: number;
}

export interface MatchHandicap {
  start_a: number;
  start_b: number;
  play_to: number;
  warning: string | null;
}

export interface Match {
  id: string;
  stage: MatchStage;
  group_index: number | null;
  round: number;
  position: number;
  player_a_id: string | null;
  player_b_id: string | null;
  source_a: string | null;
  source_b: string | null;
  next_match_id: string | null;
  next_slot: 'a' | 'b' | null;
  is_bye: boolean;
  winner_id: string | null;
  games_a: number | null;
  games_b: number | null;
  game_scores: GameScore[] | null;
  completed_at: number | null;
  label: string;
  round_name: string;
  source_a_label: string | null;
  source_b_label: string | null;
  handicap: MatchHandicap | null;
  status: MatchStatus;
  locked: boolean;
  lock_reason: string | null;
}

export interface StandingRow {
  player_id: string;
  position: number;
  played: number;
  won: number;
  lost: number;
  match_points: number;
  games_won: number;
  games_lost: number;
  points_won: number;
  points_lost: number;
  tied: boolean;
}

export interface GroupStandings {
  rows: StandingRow[];
  complete: boolean;
  unresolved_tie: string[] | null;
}

export interface Group {
  index: number;
  name: string;
  player_ids: string[];
  standings: GroupStandings;
}

export interface Round {
  round: number;
  name: string;
  short_name: string;
}

export interface TournamentView {
  tournament: Tournament;
  players: Player[];
  groups: Group[];
  rounds: Round[];
  matches: Match[];
  champion_id: string | null;
}

export interface CreateTournamentRequest extends TournamentSettings {
  players: PlayerInput[];
}

export interface CreateTournamentResponse {
  success: boolean;
  id: string;
  redirect: string;
}

export interface ResultInput {
  winner_id?: string;
  games_a?: number;
  games_b?: number;
  game_scores?: GameScore[];
}
