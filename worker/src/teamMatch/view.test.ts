import { describe, it, expect } from 'vitest';
import type { Rubber, Side, TeamMatch } from './types';
import { buildTeamMatchView } from './view';

const MATCH: TeamMatch = {
  id: 'tm-1',
  title: null,
  match_date: null,
  home_team: 'Hornets',
  away_team: 'Wasps',
  home_players: ['Ann', 'Bea', 'Cat'],
  away_players: ['Xan', 'Yaz', 'Zoe'],
  created_at: 0,
  updated_at: 0
};

function rubber(number: number, winner: Side, pairs: { home?: string; away?: string } = {}): Rubber {
  const game = winner === 'home' ? { a: 11, b: 4 } : { a: 4, b: 11 };
  return {
    number,
    game_scores: [game, game, game],
    home_games: winner === 'home' ? 3 : 0,
    away_games: winner === 'away' ? 3 : 0,
    winner,
    home_pair: pairs.home ?? null,
    away_pair: pairs.away ?? null
  };
}

/** Rubbers 1-10 won by the given sides, in card order */
const allOf = (winners: Side[]) =>
  winners.map((w, i) => rubber(i + 1, w, i === 6 ? { home: 'AC', away: 'YZ' } : {}));

describe('buildTeamMatchView', () => {
  it('lays out an empty card in the ELTTL order', () => {
    const view = buildTeamMatchView(MATCH, []);
    expect(view.status).toBe('not_started');
    expect(view.outcome).toBeNull();
    expect(view.score).toEqual({ home: 0, away: 0 });
    expect(view.rubbers).toHaveLength(10);
    expect(view.rubbers[0]).toMatchObject({
      number: 1,
      is_doubles: false,
      home: { labels: ['A'], names: ['Ann'] },
      away: { labels: ['X'], names: ['Xan'] },
      result: null,
      running: null
    });
    expect(view.rubbers[9].home.names).toEqual(['Ann']);
    expect(view.rubbers[9].away.names).toEqual(['Yaz']);
    // The doubles pair isn't known until it's entered
    expect(view.rubbers[6]).toMatchObject({ is_doubles: true, home: { labels: [] }, away: { labels: [] } });
  });

  it('keeps a running score over the rubbers entered so far', () => {
    const view = buildTeamMatchView(MATCH, [rubber(1, 'home'), rubber(2, 'away'), rubber(5, 'home')]);
    expect(view.rubbers.map(r => r.running)).toEqual([
      { home: 1, away: 0 },
      { home: 1, away: 1 },
      null,
      null,
      { home: 2, away: 1 },
      null,
      null,
      null,
      null,
      null
    ]);
    expect(view.status).toBe('in_progress');
    expect(view.played).toBe(3);
    expect(view.outcome).toBeNull();
  });

  it('names the doubles pair once it is entered', () => {
    const view = buildTeamMatchView(MATCH, [rubber(7, 'away', { home: 'AC', away: 'YZ' })]);
    expect(view.rubbers[6].home).toEqual({ labels: ['A', 'C'], names: ['Ann', 'Cat'] });
    expect(view.rubbers[6].away).toEqual({ labels: ['Y', 'Z'], names: ['Yaz', 'Zoe'] });
  });

  it('declares a home win at 6-4', () => {
    const view = buildTeamMatchView(
      MATCH,
      allOf(['home', 'home', 'home', 'home', 'home', 'home', 'away', 'away', 'away', 'away'])
    );
    expect(view.score).toEqual({ home: 6, away: 4 });
    expect(view.status).toBe('completed');
    expect(view.outcome).toBe('home');
  });

  it('declares a 5-5 draw', () => {
    const view = buildTeamMatchView(
      MATCH,
      allOf(['home', 'away', 'home', 'away', 'home', 'away', 'home', 'away', 'home', 'away'])
    );
    expect(view.score).toEqual({ home: 5, away: 5 });
    expect(view.outcome).toBe('draw');
    expect(view.rubbers[9].running).toEqual({ home: 5, away: 5 });
  });

  it("counts players' singles wins, not the doubles", () => {
    // Home wins every rubber: A plays rubbers 1, 5, 10; B 2, 4, 8; C 3, 6, 9
    const view = buildTeamMatchView(MATCH, allOf(Array(10).fill('home')));
    expect(view.home_players).toEqual([
      { label: 'A', name: 'Ann', won: 3 },
      { label: 'B', name: 'Bea', won: 3 },
      { label: 'C', name: 'Cat', won: 3 }
    ]);
    expect(view.away_players.map(p => p.won)).toEqual([0, 0, 0]);

    const awayOnlyRubberOne = buildTeamMatchView(MATCH, [rubber(1, 'away'), rubber(7, 'away', { home: 'AB', away: 'XY' })]);
    expect(awayOnlyRubberOne.away_players.map(p => p.won)).toEqual([1, 0, 0]);
  });
});
