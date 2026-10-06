import { describe, it, expect } from 'vitest';
import { gamesToWin, validateResult } from './results';
import { emptyMatch } from './knockout';
import type { GameScore, Match, MatchHandicap, Tournament } from './types';

const SCRATCH: MatchHandicap = { start_a: 0, start_b: 0, play_to: 11, warning: null };
const NAMES = { a: 'Ann', b: 'Bob' };

function tournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 't-1',
    name: 'Test',
    format: 'knockout',
    seeding_mode: 'ranking',
    score_mode: 'points',
    best_of: 5,
    group_count: null,
    advance_per_group: null,
    status: 'in_progress',
    created_at: 0,
    updated_at: 0,
    ...overrides
  };
}

function readyMatch(overrides: Partial<Match> = {}): Match {
  return {
    ...emptyMatch({ id: 'm-1', stage: 'knockout', group_index: null, round: 1, position: 0 }),
    player_a_id: 'ann',
    player_b_id: 'bob',
    ...overrides
  };
}

const games = (...scores: [number, number][]): GameScore[] => scores.map(([a, b]) => ({ a, b }));

function points(scores: GameScore[], options: { bestOf?: number; handicap?: MatchHandicap } = {}) {
  return validateResult(
    tournament({ best_of: options.bestOf ?? 5 }),
    readyMatch(),
    { game_scores: scores },
    options.handicap ?? SCRATCH,
    NAMES
  );
}

describe('gamesToWin', () => {
  it.each([
    [1, 1],
    [3, 2],
    [5, 3],
    [7, 4]
  ])('best of %i is won with %i games', (bestOf, needed) => {
    expect(gamesToWin(bestOf)).toBe(needed);
  });
});

describe('validateResult', () => {
  describe('when the match cannot take a result', () => {
    it('rejects results before the tournament starts', () => {
      expect(() =>
        validateResult(tournament({ status: 'draft' }), readyMatch(), { game_scores: [] }, SCRATCH, NAMES)
      ).toThrow('Start the tournament before entering results');
    });

    it('rejects a result for a bye', () => {
      expect(() =>
        validateResult(tournament(), readyMatch({ is_bye: true, player_b_id: null }), {}, SCRATCH, NAMES)
      ).toThrow("Byes don't have results");
    });

    it('rejects a result while a player is still to be decided', () => {
      expect(() => validateResult(tournament(), readyMatch({ player_b_id: null }), {}, SCRATCH, NAMES)).toThrow(
        'Both players must be known'
      );
    });

    it('uses 409 for state problems and 400 for bad input', () => {
      const statusOf = (fn: () => unknown) => {
        try {
          fn();
        } catch (error) {
          return (error as { status: number }).status;
        }
        return null;
      };

      expect(statusOf(() => validateResult(tournament({ status: 'draft' }), readyMatch(), {}, SCRATCH, NAMES))).toBe(409);
      expect(statusOf(() => points(games([5, 11])))).toBe(400);
    });
  });

  describe('points mode, playing to 11', () => {
    it('accepts a 3-1 win and works out the games', () => {
      expect(points(games([11, 7], [9, 11], [11, 5], [12, 10]))).toEqual({
        winner_id: 'ann',
        games_a: 3,
        games_b: 1,
        game_scores: games([11, 7], [9, 11], [11, 5], [12, 10])
      });
    });

    it('gives the match to player B when B wins', () => {
      expect(points(games([3, 11], [3, 11], [3, 11])).winner_id).toBe('bob');
    });

    it.each([
      [[12, 10], null],
      [[11, 9], null],
      [[11, 0], null],
      [[15, 13], null],
      [[13, 10], 'Game 1: from 10-all the game ends at a 2-point lead, so 13-10 isn\'t possible'],
      [[11, 10], 'Game 1: a game must be won by 2 clear points, so 11-10 isn\'t finished'],
      [[11, 12], 'Game 1: a game must be won by 2 clear points, so 11-12 isn\'t finished'],
      [[10, 8], 'Game 1: games are played to 11, so 10-8 isn\'t finished'],
      [[13, 5], 'Game 1: the game ends when someone reaches 11, so 13-5 isn\'t possible'],
      [[11, 11], "Game 1 can't end level"]
    ])('game score %j', (score, error) => {
      const [a, b] = score as [number, number];
      const scores = games([a, b], [11, 0], [11, 0]);
      if (error) {
        expect(() => points(scores)).toThrow(error as string);
      } else {
        expect(points(scores).winner_id).toBeDefined();
      }
    });

    it('rejects scores that are not whole numbers', () => {
      expect(() => points([{ a: 11.5, b: 3 }])).toThrow('Game 1: scores must be whole numbers');
      expect(() => points([{ a: -1, b: 11 }])).toThrow('Game 1: scores must be whole numbers');
    });

    it('rejects games after the match is decided', () => {
      expect(() => points(games([11, 1], [11, 2], [11, 3], [11, 4]))).toThrow(
        "The match was won after game 3, so game 4 can't be entered"
      );
    });

    it('rejects an unfinished match', () => {
      expect(() => points(games([11, 1], [11, 2], [1, 11]))).toThrow(
        'Best of 5 is won by the first to 3 games; these scores make it 2-1'
      );
    });

    it('rejects no games at all', () => {
      expect(() => points([])).toThrow('Enter the score of each game');
    });

    it.each([
      [1, games([11, 5])],
      [3, games([11, 5], [5, 11], [11, 5])],
      [7, games([11, 5], [11, 5], [11, 5], [5, 11], [11, 5])]
    ])('accepts a finished best of %i', (bestOf, scores) => {
      expect(points(scores, { bestOf }).winner_id).toBe('ann');
    });
  });

  describe('points mode with handicap starts', () => {
    const MINUS_V_MINUS: MatchHandicap = { start_a: 0, start_b: 5, play_to: 16, warning: null };

    it('accepts games played to 16, including deuce', () => {
      expect(points(games([16, 10], [18, 16], [17, 15]), { handicap: MINUS_V_MINUS })).toMatchObject({
        winner_id: 'ann',
        games_a: 3,
        games_b: 0
      });
    });

    it.each([
      [[16, 15], 'a game must be won by 2 clear points, so 16-15 isn\'t finished'],
      [[11, 6], 'games are played to 16, so 11-6 isn\'t finished'],
      [[16, 3], 'Bob starts on 5, so can\'t finish on 3'],
      [[19, 16], 'from 15-all the game ends at a 2-point lead, so 19-16 isn\'t possible']
    ])('rejects %j', (score, error) => {
      const [a, b] = score as [number, number];
      expect(() => points(games([a, b], [16, 5], [16, 5]), { handicap: MINUS_V_MINUS })).toThrow(error);
    });

    it('only checks for a winner when the handicaps leave no sensible finishing score', () => {
      const broken: MatchHandicap = { start_a: 0, start_b: 25, play_to: 21, warning: 'check the handicaps' };
      expect(points(games([5, 25], [5, 26], [5, 27]), { handicap: broken }).winner_id).toBe('bob');
    });
  });

  describe('games mode', () => {
    const gamesResult = (games_a: unknown, games_b: unknown, best_of = 5) =>
      validateResult(
        tournament({ score_mode: 'games', best_of }),
        readyMatch(),
        { games_a: games_a as number, games_b: games_b as number },
        SCRATCH,
        NAMES
      );

    it('accepts a best-of finish', () => {
      expect(gamesResult(3, 1)).toEqual({ winner_id: 'ann', games_a: 3, games_b: 1, game_scores: null });
      expect(gamesResult(2, 3).winner_id).toBe('bob');
      expect(gamesResult(1, 0, 1).winner_id).toBe('ann');
    });

    it.each([
      [2, 1],
      [4, 1],
      [3, 3],
      [0, 0]
    ])('rejects %i-%i in a best of 5', (a, b) => {
      expect(() => gamesResult(a, b)).toThrow('Best of 5 is won by the first to 3 games, e.g. 3-2');
    });

    it('rejects missing or invalid numbers', () => {
      expect(() => gamesResult(undefined, 1)).toThrow('Enter the number of games each player won');
      expect(() => gamesResult('3', 1)).toThrow('Enter the number of games each player won');
    });
  });

  describe('winner mode', () => {
    const winner = (winner_id: string | undefined) =>
      validateResult(tournament({ score_mode: 'winner' }), readyMatch(), { winner_id }, SCRATCH, NAMES);

    it('accepts either player', () => {
      expect(winner('bob')).toEqual({ winner_id: 'bob', games_a: null, games_b: null, game_scores: null });
    });

    it('rejects someone not in the match', () => {
      expect(() => winner('carl')).toThrow('Choose the winner of this match');
      expect(() => winner(undefined)).toThrow('Choose the winner of this match');
    });
  });
});
