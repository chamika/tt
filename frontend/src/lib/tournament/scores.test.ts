import { describe, it, expect } from 'vitest';
import { describeHandicap, formatScore, gamesWon, initialGames } from './scores';
import type { Match } from '$lib/types/tournament';

const base = {
  game_scores: null,
  games_a: null,
  games_b: null,
  handicap: null
} as unknown as Match;

describe('describeHandicap', () => {
  it('shows starting scores and the play-to score', () => {
    expect(describeHandicap({ start_a: 0, start_b: 5, play_to: 16, warning: null })).toBe('Start 0–5 · play to 16');
  });

  it('just says what a scratch match is played to', () => {
    expect(describeHandicap({ start_a: 0, start_b: 0, play_to: 11, warning: null })).toBe('Play to 11');
  });
});

describe('formatScore', () => {
  it('lists every game in points mode', () => {
    const match = { ...base, games_a: 2, games_b: 1, game_scores: [{ a: 11, b: 7 }, { a: 9, b: 11 }, { a: 12, b: 10 }] };
    expect(formatScore(match, 'points')).toBe('11-7, 9-11, 12-10');
  });

  it('shows games won in games mode, and nothing without a result', () => {
    expect(formatScore({ ...base, games_a: 3, games_b: 1 }, 'games')).toBe('3-1');
    expect(formatScore(base, 'winner')).toBe('');
  });
});

describe('initialGames', () => {
  it('starts each game from the handicap scores, with the fewest games that finish the match', () => {
    const match = { ...base, handicap: { start_a: 0, start_b: 5, play_to: 16, warning: null } };
    expect(initialGames(match, 5)).toEqual([
      { a: 0, b: 5 },
      { a: 0, b: 5 },
      { a: 0, b: 5 }
    ]);
    expect(initialGames(match, 1)).toHaveLength(1);
  });

  it('starts from the stored scores when correcting a result', () => {
    const match = { ...base, game_scores: [{ a: 11, b: 3 }] };
    expect(initialGames(match, 1)).toEqual([{ a: 11, b: 3 }]);
  });
});

describe('gamesWon', () => {
  it('counts games someone has reached the play-to score in', () => {
    expect(gamesWon([{ a: 11, b: 3 }, { a: 3, b: 11 }, { a: 12, b: 10 }, { a: 0, b: 0 }], 11)).toEqual({ a: 2, b: 1 });
  });

  it('ignores games still on their handicap starting scores', () => {
    expect(gamesWon([{ a: 0, b: 16 }, { a: 0, b: 16 }], 17)).toEqual({ a: 0, b: 0 });
  });
});
