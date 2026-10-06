import { describe, it, expect } from 'vitest';
import { seedPlayers } from './seeding';
import { createRng } from './random';
import type { PlayerInput } from './types';

const names = (players: { name: string }[]) => players.map(p => p.name);

describe('seedPlayers', () => {
  describe('ranking mode', () => {
    it('seeds by ranking, 1 first', () => {
      const players: PlayerInput[] = [
        { name: 'Cara', ranking: 3 },
        { name: 'Abe', ranking: 1 },
        { name: 'Bea', ranking: 2 }
      ];

      const seeded = seedPlayers(players, 'ranking', createRng(1));

      expect(names(seeded)).toEqual(['Abe', 'Bea', 'Cara']);
      expect(seeded.map(p => p.seed)).toEqual([1, 2, 3]);
    });

    it('puts unranked players below ranked ones, in a random order', () => {
      const players: PlayerInput[] = [
        { name: 'U1' },
        { name: 'Top', ranking: 1 },
        { name: 'U2', ranking: null },
        { name: 'U3' },
        { name: 'Second', ranking: 2 }
      ];

      const orders = new Set<string>();
      for (let seed = 1; seed <= 20; seed++) {
        const seeded = seedPlayers(players, 'ranking', createRng(seed));
        expect(names(seeded).slice(0, 2)).toEqual(['Top', 'Second']);
        expect(new Set(names(seeded).slice(2))).toEqual(new Set(['U1', 'U2', 'U3']));
        orders.add(names(seeded).slice(2).join());
      }
      expect(orders.size).toBeGreaterThan(1);
    });

    it('draws equal rankings at random among themselves', () => {
      const players: PlayerInput[] = [
        { name: 'A', ranking: 1 },
        { name: 'B', ranking: 2 },
        { name: 'C', ranking: 2 },
        { name: 'D', ranking: 3 }
      ];

      const middles = new Set<string>();
      for (let seed = 1; seed <= 20; seed++) {
        const seeded = names(seedPlayers(players, 'ranking', createRng(seed)));
        expect(seeded[0]).toBe('A');
        expect(seeded[3]).toBe('D');
        middles.add(seeded.slice(1, 3).join());
      }
      expect(middles).toEqual(new Set(['B,C', 'C,B']));
    });

    it('is reproducible for the same random seed', () => {
      const players: PlayerInput[] = [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }];
      expect(seedPlayers(players, 'ranking', createRng(7))).toEqual(seedPlayers(players, 'ranking', createRng(7)));
    });

    it('ignores handicaps', () => {
      const seeded = seedPlayers(
        [
          { name: 'A', ranking: 1, handicap: 5 },
          { name: 'B', ranking: 2, handicap: -5 }
        ],
        'ranking',
        createRng(1)
      );
      expect(seeded.map(p => p.handicap)).toEqual([null, null]);
    });

    it.each([0, -1, 1.5, '2'])('rejects ranking %s', ranking => {
      const players = [{ name: 'A', ranking: ranking as number }, { name: 'B' }];
      expect(() => seedPlayers(players, 'ranking', createRng(1))).toThrow(
        'Ranking for A must be a whole number of 1 or more'
      );
    });
  });

  describe('handicap mode', () => {
    it('seeds by handicap with the most negative first', () => {
      const players: PlayerInput[] = [
        { name: 'Plus5', handicap: 5 },
        { name: 'Minus10', handicap: -10 },
        { name: 'Zero', handicap: 0 },
        { name: 'Minus5', handicap: -5 },
        { name: 'Plus10', handicap: 10 }
      ];

      const seeded = seedPlayers(players, 'handicap', createRng(1));

      expect(names(seeded)).toEqual(['Minus10', 'Minus5', 'Zero', 'Plus5', 'Plus10']);
      expect(seeded.map(p => p.ranking)).toEqual([null, null, null, null, null]);
    });

    it('requires a handicap for every player', () => {
      const players: PlayerInput[] = [{ name: 'A', handicap: 0 }, { name: 'B' }];
      expect(() => seedPlayers(players, 'handicap', createRng(1))).toThrow('B needs a handicap');
    });

    it('rejects a handicap that is not a whole number', () => {
      const players: PlayerInput[] = [{ name: 'A', handicap: 2.5 }, { name: 'B', handicap: 0 }];
      expect(() => seedPlayers(players, 'handicap', createRng(1))).toThrow('Handicap for A must be a whole number');
    });
  });

  describe('player list validation', () => {
    it('trims names', () => {
      const seeded = seedPlayers([{ name: '  Ann ' }, { name: 'Bob' }], 'ranking', createRng(1));
      expect(new Set(names(seeded))).toEqual(new Set(['Ann', 'Bob']));
    });

    it('rejects a blank name', () => {
      expect(() => seedPlayers([{ name: 'Ann' }, { name: '  ' }], 'ranking', createRng(1))).toThrow(
        'Player 2 needs a name'
      );
    });

    it('rejects duplicate names, ignoring case', () => {
      expect(() => seedPlayers([{ name: 'Ann' }, { name: 'ann' }], 'ranking', createRng(1))).toThrow(
        'Two players are called ann'
      );
    });

    it('needs at least 2 players', () => {
      expect(() => seedPlayers([{ name: 'Ann' }], 'ranking', createRng(1))).toThrow('at least 2 players');
    });

    it('allows 64 players but not 65', () => {
      const players = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `P${i}` }));
      expect(seedPlayers(players(64), 'ranking', createRng(1))).toHaveLength(64);
      expect(() => seedPlayers(players(65), 'ranking', createRng(1))).toThrow('at most 64 players');
    });
  });
});
