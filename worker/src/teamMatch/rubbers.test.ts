import { describe, it, expect } from 'vitest';
import { TournamentError } from '../tournament/errors';
import { AWAY_LABELS, HOME_LABELS, RUBBER_ORDER, isDoubles, validateDetails, validateRubber } from './rubbers';
import type { GameScore, TeamMatchDetails } from './types';

const DETAILS: TeamMatchDetails = {
  title: 'Division 3',
  match_date: '2026-10-22',
  home_team: 'Hornets',
  away_team: 'Wasps',
  home_players: ['Ann', 'Bea', 'Cat'],
  away_players: ['Xan', 'Yaz', 'Zoe']
};

const homeWin: GameScore = { a: 11, b: 5 };
const awayWin: GameScore = { a: 5, b: 11 };

function rejection(fn: () => unknown): TournamentError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(TournamentError);
    return error as TournamentError;
  }
  throw new Error('Expected a rejection');
}

describe('RUBBER_ORDER', () => {
  it('follows the ELTTL match card', () => {
    expect(RUBBER_ORDER.map(r => (r.home ? `${r.home}${r.away}` : '&'))).toEqual([
      'AX', 'BY', 'CZ', 'BX', 'AZ', 'CY', '&', 'BZ', 'CX', 'AY'
    ]);
  });

  it('has every home player meet every away player once, and one doubles at 7', () => {
    const singles = RUBBER_ORDER.filter(r => r.home !== null).map(r => `${r.home}${r.away}`);
    const everyPairing = HOME_LABELS.flatMap(h => AWAY_LABELS.map(a => `${h}${a}`));
    expect([...singles].sort()).toEqual(everyPairing.sort());
    expect(RUBBER_ORDER.filter(r => r.home === null).map(r => r.number)).toEqual([7]);
    expect(isDoubles(7)).toBe(true);
    expect(isDoubles(1)).toBe(false);
  });
});

describe('validateDetails', () => {
  it('trims names and keeps the player order', () => {
    const details = validateDetails({
      ...DETAILS,
      title: '  ',
      match_date: '',
      home_team: ' Hornets ',
      home_players: [' Ann', 'Bea ', 'Cat']
    });
    expect(details).toEqual({ ...DETAILS, title: null, match_date: null });
  });

  it.each([
    [{ home_team: ' ' }, 'Enter the home team name'],
    [{ away_players: ['Xan', 'Yaz'] }, 'Wasps needs exactly 3 players'],
    [{ home_players: ['Ann', 'Bea', 'Cat', 'Dot'] }, 'Hornets needs exactly 3 players'],
    [{ away_players: ['Xan', '', 'Zoe'] }, 'Enter the name of player Y'],
    [{ home_players: ['Ann', 'ann', 'Cat'] }, 'ann is in Hornets twice'],
    [{ match_date: '2026-02-30' }, 'The date must be a real date'],
    [{ match_date: '2026-13-01' }, 'The date must be a real date'],
    [{ title: 'x'.repeat(101) }, 'The title can be up to 100 characters']
  ])('rejects %o', (overrides, message) => {
    const error = rejection(() => validateDetails({ ...DETAILS, ...overrides }));
    expect(error.status).toBe(400);
    expect(error.message).toContain(message);
  });

  it('allows the same name in both teams', () => {
    expect(validateDetails({ ...DETAILS, away_players: ['Ann', 'Yaz', 'Zoe'] }).away_players[0]).toBe('Ann');
  });
});

describe('validateRubber', () => {
  it('records a singles win in three, four and five games', () => {
    expect(validateRubber(DETAILS, 1, { game_scores: [homeWin, homeWin, homeWin] })).toEqual({
      number: 1,
      game_scores: [homeWin, homeWin, homeWin],
      home_games: 3,
      away_games: 0,
      winner: 'home',
      home_pair: null,
      away_pair: null
    });
    expect(validateRubber(DETAILS, 2, { game_scores: [homeWin, awayWin, awayWin, awayWin] }).winner).toBe('away');
    const five = validateRubber(DETAILS, 3, {
      game_scores: [homeWin, awayWin, { a: 12, b: 10 }, awayWin, { a: 18, b: 16 }]
    });
    expect([five.home_games, five.away_games, five.winner]).toEqual([3, 2, 'home']);
  });

  it.each([
    [[{ a: 11, b: 10 }, homeWin, homeWin], 'won by 2 clear points'],
    [[{ a: 13, b: 10 }, homeWin, homeWin], "isn't possible"],
    [[{ a: 9, b: 7 }, homeWin, homeWin], "isn't finished"],
    [[homeWin, homeWin], 'these scores make it 2-0'],
    [[homeWin, homeWin, homeWin, awayWin], "game 4 can't be entered"],
    [[{ a: 11.5, b: 3 }, homeWin, homeWin], 'whole numbers'],
    [[], 'Enter the score of each game']
  ])('rejects %o', (games, message) => {
    const error = rejection(() => validateRubber(DETAILS, 1, { game_scores: games }));
    expect(error.status).toBe(400);
    expect(error.message).toContain(message);
  });

  it('names the players in game errors', () => {
    expect(rejection(() => validateRubber(DETAILS, 5, { game_scores: [{ a: 11, b: 10 }] })).message).toContain(
      'Game 1'
    );
  });

  it('needs both doubles pairs and stores them in label order', () => {
    const games = [awayWin, awayWin, awayWin];
    const rubber = validateRubber(DETAILS, 7, { game_scores: games, home_pair: 'CA', away_pair: 'xy' });
    expect([rubber.home_pair, rubber.away_pair, rubber.winner]).toEqual(['AC', 'XY', 'away']);

    expect(rejection(() => validateRubber(DETAILS, 7, { game_scores: games, away_pair: 'XY' })).message).toBe(
      'Choose the two Hornets players in the doubles'
    );
    for (const pair of ['XX', 'XYZ', 'X', 'AX']) {
      expect(
        rejection(() => validateRubber(DETAILS, 7, { game_scores: games, home_pair: 'AB', away_pair: pair })).message
      ).toBe('Choose the two Wasps players in the doubles');
    }
  });

  it('rejects doubles pairs on a singles rubber', () => {
    expect(
      rejection(() => validateRubber(DETAILS, 4, { game_scores: [homeWin, homeWin, homeWin], home_pair: 'AB' }))
        .message
    ).toContain('singles');
  });

  it.each([0, 11, 1.5, NaN])('rejects rubber number %s as not found', number => {
    expect(rejection(() => validateRubber(DETAILS, number, { game_scores: [homeWin] })).status).toBe(404);
  });
});
