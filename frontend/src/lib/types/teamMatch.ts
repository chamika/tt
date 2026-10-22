// Types for the Team Match Card, mirroring worker/src/teamMatch/types.ts
import type { GameScore } from './tournament';

export type { GameScore };

export type Side = 'home' | 'away';
export type TeamMatchStatus = 'not_started' | 'in_progress' | 'completed';
export type TeamMatchOutcome = Side | 'draw';

export const HOME_LABELS = ['A', 'B', 'C'] as const;
export const AWAY_LABELS = ['X', 'Y', 'Z'] as const;
export const BEST_OF = 5;
export const RUBBER_COUNT = 10;

/** What the organiser types in; also what an edit sends */
export interface TeamMatchDetails {
  title: string | null;
  match_date: string | null; // YYYY-MM-DD
  home_team: string;
  away_team: string;
  home_players: string[]; // [A, B, C]
  away_players: string[]; // [X, Y, Z]
}

export interface TeamMatch extends TeamMatchDetails {
  id: string;
  created_at: number;
  updated_at: number;
}

export interface Rubber {
  number: number;
  game_scores: GameScore[]; // a = home
  home_games: number;
  away_games: number;
  winner: Side;
  home_pair: string | null;
  away_pair: string | null;
}

export interface RubberInput {
  game_scores: GameScore[];
  home_pair?: string;
  away_pair?: string;
}

export interface TeamMatchPlayerView {
  label: string;
  name: string;
  won: number;
}

export interface RubberSideView {
  labels: string[];
  names: string[];
}

export interface RubberView {
  number: number;
  is_doubles: boolean;
  home: RubberSideView;
  away: RubberSideView;
  result: Rubber | null;
  running: { home: number; away: number } | null;
}

export interface TeamMatchView {
  match: TeamMatch;
  home_players: TeamMatchPlayerView[];
  away_players: TeamMatchPlayerView[];
  rubbers: RubberView[];
  score: { home: number; away: number };
  played: number;
  status: TeamMatchStatus;
  outcome: TeamMatchOutcome | null;
}

export interface CreateTeamMatchResponse {
  success: boolean;
  id: string;
  redirect: string;
}
