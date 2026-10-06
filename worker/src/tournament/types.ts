// Types for Tournament Brackets
//
// Rows (snake_case, what D1 stores) are kept close to the domain types the engine
// works on; the repository converts the few fields that differ (is_bye, game_scores).

export type TournamentFormat = 'knockout' | 'groups';
export type SeedingMode = 'ranking' | 'handicap';
export type ScoreMode = 'points' | 'games' | 'winner';
export type TournamentStatus = 'draft' | 'in_progress' | 'completed';
export type MatchStage = 'group' | 'knockout';
export type Slot = 'a' | 'b';

export const FORMATS: TournamentFormat[] = ['knockout', 'groups'];
export const SEEDING_MODES: SeedingMode[] = ['ranking', 'handicap'];
export const SCORE_MODES: ScoreMode[] = ['points', 'games', 'winner'];
export const BEST_OF_OPTIONS = [1, 3, 5, 7];
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 64;
export const MAX_GROUPS = 16;

/** Settings the organiser chooses when creating or editing a tournament */
export interface TournamentSettings {
  name: string;
  format: TournamentFormat;
  seeding_mode: SeedingMode;
  score_mode: ScoreMode;
  best_of: number;
  group_count: number | null; // groups format only
  advance_per_group: number | null; // groups format only
}

export interface Tournament extends TournamentSettings {
  id: string;
  status: TournamentStatus;
  created_at: number;
  updated_at: number;
}

/** A player as typed in on the setup screen */
export interface PlayerInput {
  name: string;
  ranking?: number | null; // position, 1 = best
  handicap?: number | null; // lower = stronger
}

export interface Player {
  id: string;
  name: string;
  ranking: number | null;
  handicap: number | null;
  seed: number;
  group_index: number | null;
  manual_group_rank: number | null; // set when the organiser resolves a tie
}

export interface GameScore {
  a: number;
  b: number;
}

export interface Match {
  id: string;
  stage: MatchStage;
  group_index: number | null;
  round: number; // 1-based; group = round-robin round, knockout = 1 is the first round
  position: number; // 0-based order within the round
  player_a_id: string | null; // null = not decided yet (or the empty side of a bye)
  player_b_id: string | null;
  // Where a knockout player comes from: 'winner:<matchId>' or 'group:<groupIndex>:<position>'
  source_a: string | null;
  source_b: string | null;
  next_match_id: string | null;
  next_slot: Slot | null;
  is_bye: boolean;
  winner_id: string | null;
  games_a: number | null;
  games_b: number | null;
  game_scores: GameScore[] | null; // points mode only
  completed_at: number | null;
}

export interface TournamentState {
  tournament: Tournament;
  players: Player[];
  matches: Match[];
}

/** A validated result, ready to store */
export interface MatchResult {
  winner_id: string;
  games_a: number | null;
  games_b: number | null;
  game_scores: GameScore[] | null;
}

/** What the API accepts for a result; which fields are used depends on the score mode */
export interface ResultInput {
  winner_id?: string;
  games_a?: number;
  games_b?: number;
  game_scores?: GameScore[];
}

/** Changes to persist after a result is recorded or cleared */
export interface StateChanges {
  matches: Match[];
  players: Player[];
  status: TournamentStatus;
}

// D1 rows

export interface TournamentPlayerRow extends Player {
  tournament_id: string;
  created_at: number;
}

export interface TournamentMatchRow
  extends Omit<Match, 'is_bye' | 'game_scores'> {
  tournament_id: string;
  is_bye: number; // SQLite boolean
  game_scores: string | null; // JSON GameScore[]
  updated_at: number;
}

// API types

export interface CreateTournamentRequest extends TournamentSettings {
  players: PlayerInput[];
}

export interface MatchHandicap {
  start_a: number;
  start_b: number;
  play_to: number;
  warning: string | null;
}

export interface StandingRow {
  player_id: string;
  position: number; // tied players share the position of the first of them
  played: number;
  won: number;
  lost: number;
  match_points: number;
  games_won: number;
  games_lost: number;
  points_won: number;
  points_lost: number;
  tied: boolean; // an unresolved tie the organiser hasn't ordered
}

export interface GroupStandings {
  rows: StandingRow[];
  complete: boolean;
  // Players whose order affects qualification and can't be separated by the rules;
  // the organiser must order them before the group's qualifiers go through
  unresolved_tie: string[] | null;
}

export interface GroupView {
  index: number;
  name: string;
  player_ids: string[];
  standings: GroupStandings;
}

export interface RoundView {
  round: number;
  name: string;
  short_name: string;
}

export type MatchStatus = 'bye' | 'pending' | 'ready' | 'completed';

export interface MatchView extends Match {
  label: string; // e.g. 'QF1', 'Final', 'Group A'
  round_name: string;
  source_a_label: string | null; // e.g. 'Winner QF1', 'A1'
  source_b_label: string | null;
  handicap: MatchHandicap | null; // null until both players are known
  status: MatchStatus;
  locked: boolean; // the result can't be changed any more
  lock_reason: string | null;
}

export interface TournamentView {
  tournament: Tournament;
  players: Player[];
  groups: GroupView[];
  rounds: RoundView[];
  matches: MatchView[];
  champion_id: string | null;
}
