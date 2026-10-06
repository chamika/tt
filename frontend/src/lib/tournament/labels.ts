import type { ScoreMode, SeedingMode, TournamentFormat, TournamentStatus } from '$lib/types/tournament';

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  knockout: 'Knockout',
  groups: 'Groups → knockout'
};

export const SEEDING_LABELS: Record<SeedingMode, string> = {
  ranking: 'Ranking',
  handicap: 'Handicap'
};

export const SCORE_MODE_LABELS: Record<ScoreMode, string> = {
  points: 'Game scores',
  games: 'Games won',
  winner: 'Winner only'
};

export const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  completed: 'Completed'
};
