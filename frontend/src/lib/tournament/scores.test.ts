import { describe, it, expect } from 'vitest';
import { checkGames, describeHandicap, formatScore, initialGames, otherSideAfterTyping, rowsWanted } from './scores';
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

const scratch = { start_a: 0, start_b: 0, play_to: 11, warning: null };
const names = { a: 'Ann', b: 'Bob' };

describe('otherSideAfterTyping', () => {
  it('fills in the winner from a losing score', () => {
    expect(otherSideAfterTyping(7, 0, 11)).toBe(11);
    expect(otherSideAfterTyping(0, 0, 11)).toBe(11);
  });

  it('goes to two clear from one short of play-to', () => {
    expect(otherSideAfterTyping(10, 0, 11)).toBe(12);
    // Handicap: starting on 18, playing to 20
    expect(otherSideAfterTyping(19, 0, 20)).toBe(21);
  });

  it('leaves scores that could be either player’s, or no score, for the person to fill in', () => {
    expect(otherSideAfterTyping(11, 0, 11)).toBe(0);
    expect(otherSideAfterTyping(21, 18, 20)).toBe(18);
    expect(otherSideAfterTyping(null, 5, 16)).toBe(5);
  });
});

describe('checkGames', () => {
  it('counts finished games and finds the one that won the match', () => {
    const check = checkGames([{ a: 11, b: 7 }, { a: 9, b: 11 }, { a: 12, b: 10 }, { a: 11, b: 3 }], 5, scratch, names);
    expect(check.problems).toEqual([null, null, null, null]);
    expect(check.won).toEqual({ a: 3, b: 1 });
    expect(check.decidedAt).toBe(3);
  });

  it('says what is wrong with each game, using the server’s wording', () => {
    const check = checkGames([{ a: 11, b: 10 }, { a: null, b: 11 }, { a: 0, b: 16 }], 5, { ...scratch, start_b: 16, play_to: 17 }, names);
    expect(check.problems).toEqual([
      'Game 1: Bob starts on 16, so can\'t finish on 10',
      'Game 2: enter both scores',
      "Game 3: games are played to 17, so 0-16 isn't finished"
    ]);
    expect(check.decidedAt).toBeNull();
  });

  it('flags games after the match was won', () => {
    const check = checkGames([{ a: 11, b: 1 }, { a: 11, b: 2 }, { a: 11, b: 3 }], 3, scratch, names);
    expect(check.decidedAt).toBe(1);
    expect(check.problems[2]).toBe("The match was won after game 2, so this game can't be entered");
  });
});

describe('rowsWanted', () => {
  const blank = () => true;

  it('adds the next game once every row is finished and the match is still open', () => {
    const check = checkGames([{ a: 11, b: 7 }, { a: 7, b: 11 }], 3, scratch, names);
    expect(rowsWanted(check, 3, blank)).toBe(3);
  });

  it('waits while a game is unfinished, and never goes past best of', () => {
    expect(rowsWanted(checkGames([{ a: 11, b: 7 }, { a: 0, b: 0 }], 3, scratch, names), 3, blank)).toBe(2);
    expect(rowsWanted(checkGames([{ a: 11, b: 7 }], 1, scratch, names), 1, blank)).toBe(1);
  });

  it('drops a blank row added while a score was half typed, but not the rows the form opened with', () => {
    // Best of 5 at 2-1: game 4 was briefly 2-20 while "22" was typed, which added game 5
    const games = [{ a: 20, b: 14 }, { a: 15, b: 20 }, { a: 21, b: 19 }, { a: 22, b: 9 }, { a: 0, b: 9 }];
    const rules = { start_a: 0, start_b: 9, play_to: 20, warning: null };
    expect(rowsWanted(checkGames(games, 5, rules, names), 5, (i) => i === 4)).toBe(4);
    // Typing into the first of three opening rows keeps all three
    expect(rowsWanted(checkGames([{ a: 3, b: 0 }, { a: 0, b: 0 }, { a: 0, b: 0 }], 5, scratch, names), 5, (i) => i > 0)).toBe(3);
  });

  it('drops blank rows after the winning game but keeps ones that were typed in', () => {
    const games = [{ a: 11, b: 1 }, { a: 11, b: 2 }, { a: 0, b: 0 }, { a: 0, b: 0 }];
    const check = checkGames(games, 3, scratch, names);
    expect(rowsWanted(check, 3, blank)).toBe(2);
    expect(rowsWanted(check, 3, (i) => i !== 2)).toBe(3);
  });
});
