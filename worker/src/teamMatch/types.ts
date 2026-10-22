// Types for the Team Match Card
//
// One league-style fixture between two teams of three, scored like the ELTTL
// match card: home A, B, C play away X, Y, Z over 9 singles and 1 doubles.

import type { GameScore } from '../tournament/types';

export type { GameScore };

export type Side = 'home' | 'away';
export type HomeLabel = 'A' | 'B' | 'C';
export type AwayLabel = 'X' | 'Y' | 'Z';
export type TeamMatchStatus = 'not_started' | 'in_progress' | 'completed';
export type TeamMatchOutcome = Side | 'draw';

/** What the organiser types in; also what PUT accepts to correct it */
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

/** A rubber's result, as stored */
export interface Rubber {
  number: number; // 1-10, the row on the card
  game_scores: GameScore[]; // a = home
  home_games: number;
  away_games: number;
  winner: Side;
  home_pair: string | null; // doubles only, e.g. 'AB'
  away_pair: string | null; // doubles only, e.g. 'XZ'
}

/** What the API accepts for a rubber */
export interface RubberInput {
  game_scores?: GameScore[];
  home_pair?: string | null;
  away_pair?: string | null;
}

// D1 rows

export interface TeamMatchRow extends Omit<TeamMatch, 'home_players' | 'away_players'> {
  home_players: string; // JSON string[]
  away_players: string;
}

export interface TeamMatchRubberRow extends Omit<Rubber, 'game_scores'> {
  match_id: string;
  game_scores: string; // JSON GameScore[]
  updated_at: number;
}

// API types

export interface TeamMatchPlayerView {
  label: HomeLabel | AwayLabel;
  name: string;
  won: number; // singles rubbers won, the card's "Won" column
}

export interface RubberSideView {
  labels: string[]; // ['A'], or the doubles pair ['A', 'C'] once it's known
  names: string[];
}

export interface RubberView {
  number: number;
  is_doubles: boolean;
  home: RubberSideView;
  away: RubberSideView;
  result: Rubber | null;
  // The match score after this row, counting the rubbers entered up to it; null until this one has a result
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
  outcome: TeamMatchOutcome | null; // set once all 10 rubbers have results
}
