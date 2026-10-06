import { calculateScores } from '../../../shared/handicap/scoreCalculator';
import type { MatchHandicap, SeedingMode } from './types';

const SCRATCH: MatchHandicap = { start_a: 0, start_b: 0, play_to: 11, warning: null };

/**
 * Starting scores and the score to play to, for every game of a match.
 * Ranking tournaments play off scratch (0-0 to 11); handicap tournaments use
 * the same calculator as the Handicap Calculator page.
 */
export function matchHandicap(
  mode: SeedingMode,
  handicapA: number | null,
  handicapB: number | null
): MatchHandicap {
  if (mode === 'ranking') return { ...SCRATCH };

  const result = calculateScores(handicapA, handicapB);
  const start_a = result.startingScorePlayer1;
  const start_b = result.startingScorePlayer2;
  const play_to = result.playToScore;

  return {
    start_a,
    start_b,
    play_to,
    warning:
      Math.max(start_a, start_b) >= play_to
        ? `A player starts on ${Math.max(start_a, start_b)} but games are played to ${play_to}; check the handicaps`
        : null
  };
}
