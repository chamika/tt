import { describe, it, expect } from 'vitest';
import { computeStandings, groupQualifiers } from './standings';
import { emptyMatch } from './knockout';
import type { Match, Player, ScoreMode } from './types';

/** Players with ids equal to their names, seeded in the order given */
function players(...ids: string[]): Player[] {
  return ids.map((id, i) => ({
    id,
    name: id,
    ranking: null,
    handicap: null,
    seed: i + 1,
    group_index: 0,
    manual_group_rank: null
  }));
}

let nextId = 0;

/** A group match; `games` is [a, b], `points` lists each game as [a, b] */
function match(a: string, b: string, result?: { games?: [number, number]; points?: [number, number][]; winner?: string }): Match {
  const m: Match = {
    ...emptyMatch({ id: `m${++nextId}`, stage: 'group', group_index: 0, round: 1, position: 0 }),
    player_a_id: a,
    player_b_id: b
  };
  if (!result) return m;

  const games =
    result.games ??
    (result.points
      ? (result.points.reduce(([x, y], [pa, pb]) => (pa > pb ? [x + 1, y] : [x, y + 1]), [0, 0]) as [number, number])
      : null);
  m.winner_id = result.winner ?? (games![0] > games![1] ? a : b);
  m.games_a = games?.[0] ?? null;
  m.games_b = games?.[1] ?? null;
  m.game_scores = result.points?.map(([pa, pb]) => ({ a: pa, b: pb })) ?? null;
  return m;
}

const order = (standings: ReturnType<typeof computeStandings>) => standings.rows.map(r => r.player_id);
const positions = (standings: ReturnType<typeof computeStandings>) => standings.rows.map(r => r.position);

describe('computeStandings', () => {
  it('orders by match points: 2 for a win, 1 for a loss', () => {
    const standings = computeStandings(
      players('A', 'B', 'C', 'D'),
      [
        match('A', 'B', { games: [3, 0] }),
        match('A', 'C', { games: [3, 1] }),
        match('A', 'D', { games: [3, 2] }),
        match('B', 'C', { games: [3, 0] }),
        match('B', 'D', { games: [3, 0] }),
        match('D', 'C', { games: [3, 0] })
      ],
      'games',
      2
    );

    expect(order(standings)).toEqual(['A', 'B', 'D', 'C']);
    expect(standings.rows.map(r => r.match_points)).toEqual([6, 5, 4, 3]);
    expect(standings.rows[0]).toMatchObject({ played: 3, won: 3, lost: 0, games_won: 9, games_lost: 3 });
    expect(standings.complete).toBe(true);
    expect(standings.unresolved_tie).toBeNull();
  });

  it('breaks a two-way tie on head-to-head', () => {
    // A and B both win twice, but A beat B; C and D both win once, but C beat D
    const standings = computeStandings(
      players('A', 'B', 'C', 'D'),
      [
        match('A', 'B', { winner: 'A' }),
        match('A', 'C', { winner: 'A' }),
        match('A', 'D', { winner: 'D' }),
        match('B', 'C', { winner: 'B' }),
        match('B', 'D', { winner: 'B' }),
        match('C', 'D', { winner: 'C' })
      ],
      'winner',
      2
    );

    expect(order(standings)).toEqual(['A', 'B', 'C', 'D']);
    expect(positions(standings)).toEqual([1, 2, 3, 4]);
  });

  describe('three-way tie (A beat B, B beat C, C beat A; all beat D)', () => {
    it('is broken on games ratio between the tied players', () => {
      const standings = computeStandings(
        players('A', 'B', 'C', 'D'),
        [
          match('A', 'B', { games: [3, 0] }),
          match('B', 'C', { games: [3, 1] }),
          match('A', 'C', { games: [2, 3] }),
          // Lopsided wins over D would change an overall games ratio, but don't count here
          match('A', 'D', { games: [3, 2] }),
          match('B', 'D', { games: [3, 0] }),
          match('C', 'D', { games: [3, 2] })
        ],
        'games',
        2
      );

      // Among A, B, C: A 5-3, C 4-5, B 3-4
      expect(order(standings)).toEqual(['A', 'C', 'B', 'D']);
    });

    const cycleOnPoints = () => [
      match('A', 'B', { points: [[11, 5], [11, 5], [11, 5]] }),
      match('B', 'C', { points: [[11, 9], [11, 9], [11, 9]] }),
      match('A', 'C', { points: [[3, 11], [3, 11], [3, 11]] }),
      match('A', 'D', { points: [[11, 0], [11, 0], [11, 0]] }),
      match('B', 'D', { points: [[11, 0], [11, 0], [11, 0]] }),
      match('C', 'D', { points: [[11, 0], [11, 0], [11, 0]] })
    ];

    it('is broken on points ratio when the games are level', () => {
      const standings = computeStandings(players('A', 'B', 'C', 'D'), cycleOnPoints(), 'points', 2);

      // Points among A, B, C: C 60-42, A 42-48, B 48-60
      expect(order(standings)).toEqual(['C', 'A', 'B', 'D']);
      expect(standings.unresolved_tie).toBeNull();
    });

    it.each<ScoreMode>(['games', 'winner'])('is flagged in %s mode, which has no points to compare', mode => {
      const standings = computeStandings(players('A', 'B', 'C', 'D'), cycleOnPoints(), mode, 2);

      expect(order(standings)).toEqual(['A', 'B', 'C', 'D']);
      expect(positions(standings)).toEqual([1, 1, 1, 4]);
      expect(standings.rows.map(r => r.tied)).toEqual([true, true, true, false]);
      expect(standings.unresolved_tie).toEqual(['A', 'B', 'C']);
      expect(groupQualifiers(standings, 2)).toBeNull();
    });

    it('follows a manual order once the organiser sets one', () => {
      const group = players('A', 'B', 'C', 'D');
      group[0].manual_group_rank = 3;
      group[1].manual_group_rank = 1;
      group[2].manual_group_rank = 2;

      const standings = computeStandings(group, cycleOnPoints(), 'winner', 2);

      expect(order(standings)).toEqual(['B', 'C', 'A', 'D']);
      expect(positions(standings)).toEqual([1, 2, 3, 4]);
      expect(standings.unresolved_tie).toBeNull();
      expect(groupQualifiers(standings, 2)).toEqual(['B', 'C']);
    });
  });

  it('restarts the tie-break among the players still level once others separate', () => {
    // A, B, C and D all win 3. Among those four, A and B win 2 and C and D win 1,
    // so each pair is then decided on its own head-to-head (A beat B, C beat D).
    // B has the better games ratio across all four, which must not put B above A.
    const standings = computeStandings(
      players('A', 'B', 'C', 'D', 'E', 'F'),
      [
        match('A', 'B', { games: [3, 2] }),
        match('A', 'C', { games: [3, 2] }),
        match('A', 'D', { games: [0, 3] }),
        match('B', 'C', { games: [3, 0] }),
        match('B', 'D', { games: [3, 0] }),
        match('C', 'D', { games: [3, 2] }),
        match('A', 'E', { games: [0, 3] }),
        match('A', 'F', { games: [3, 0] }),
        match('B', 'E', { games: [3, 0] }),
        match('B', 'F', { games: [0, 3] }),
        match('C', 'E', { games: [3, 0] }),
        match('C', 'F', { games: [3, 0] }),
        match('D', 'E', { games: [3, 0] }),
        match('D', 'F', { games: [3, 0] }),
        match('E', 'F', { games: [3, 0] })
      ],
      'games',
      2
    );

    expect(order(standings)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(standings.rows.slice(0, 4).every(r => r.won === 3)).toBe(true);
  });

  it('shows a tie below the qualifying places without asking for an order', () => {
    // A and B qualify; C, D and E beat each other in a circle and can't be separated
    const standings = computeStandings(
      players('A', 'B', 'C', 'D', 'E'),
      [
        ...['B', 'C', 'D', 'E'].map(other => match('A', other, { winner: 'A' })),
        ...['C', 'D', 'E'].map(other => match('B', other, { winner: 'B' })),
        match('C', 'D', { winner: 'C' }),
        match('D', 'E', { winner: 'D' }),
        match('C', 'E', { winner: 'E' })
      ],
      'winner',
      2
    );

    expect(order(standings)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(positions(standings)).toEqual([1, 2, 3, 3, 3]);
    expect(standings.rows.map(r => r.tied)).toEqual([false, false, true, true, true]);
    expect(standings.unresolved_tie).toBeNull();
    expect(groupQualifiers(standings, 2)).toEqual(['A', 'B']);
  });

  it('flags a level pair that straddles the qualifying places', () => {
    // 3-player cycle: everyone 1 win, nothing to separate them in winner mode
    const standings = computeStandings(
      players('A', 'B', 'C'),
      [match('A', 'B', { winner: 'A' }), match('B', 'C', { winner: 'B' }), match('A', 'C', { winner: 'C' })],
      'winner',
      1
    );

    expect(standings.unresolved_tie).toEqual(['A', 'B', 'C']);
  });

  it('keeps seed order for level players while the group is still being played', () => {
    const standings = computeStandings(
      players('A', 'B', 'C', 'D'),
      [match('A', 'B'), match('C', 'D', { winner: 'D' }), match('A', 'C'), match('B', 'D'), match('A', 'D'), match('B', 'C')],
      'winner',
      2
    );

    // D has 2 points and C 1 (for the loss); A and B haven't played yet
    expect(order(standings)).toEqual(['D', 'C', 'A', 'B']);
    expect(positions(standings)).toEqual([1, 2, 3, 4]);
    expect(standings.rows.every(r => !r.tied)).toBe(true);
    expect(standings.complete).toBe(false);
    expect(groupQualifiers(standings, 2)).toBeNull();
  });
});
