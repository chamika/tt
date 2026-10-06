import { describe, it, expect } from 'vitest';
import { bracketSize, buildKnockout, knockoutLabel, meetingRound, roundName, seedOrder } from './knockout';
import { drawnState, knockoutRound, nameOf, rankedPlayers, sequentialIds } from './testHelpers';

describe('bracketSize', () => {
  it.each([
    [2, 2],
    [3, 4],
    [5, 8],
    [8, 8],
    [9, 16],
    [17, 32],
    [64, 64]
  ])('%i entrants need a bracket of %i', (entrants, size) => {
    expect(bracketSize(entrants)).toBe(size);
  });
});

describe('seedOrder', () => {
  it('places 8 seeds as 1v8, 4v5, 2v7, 3v6', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it('places 16 seeds in the standard order', () => {
    expect(seedOrder(16)).toEqual([1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]);
  });

  it.each([4, 8, 16, 32, 64])('keeps the top seeds apart in a bracket of %i', size => {
    const order = seedOrder(size);
    const line = (seed: number) => order.indexOf(seed);
    const rounds = Math.log2(size);

    // Every first-round match adds up to size + 1
    for (let i = 0; i < size; i += 2) {
      expect(order[i] + order[i + 1]).toBe(size + 1);
    }
    // Seeds 1 and 2 only meet in the final, seeds 1-4 no earlier than the semi-finals
    expect(meetingRound(line(1), line(2))).toBe(rounds);
    for (const [x, y] of [[1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]) {
      expect(meetingRound(line(x), line(y))).toBeGreaterThanOrEqual(rounds - 1);
    }
  });
});

describe('roundName', () => {
  it('names rounds from the final backwards', () => {
    expect([1, 2, 3, 4, 5].map(r => roundName(r, 5).name)).toEqual([
      'Round of 32',
      'Round of 16',
      'Quarter-final',
      'Semi-final',
      'Final'
    ]);
    expect(roundName(1, 1).name).toBe('Final');
  });
});

describe('knockout draw', () => {
  it.each([2, 3, 5, 6, 8, 9, 16, 17, 64])('lays out a complete bracket for %i players', count => {
    const state = drawnState({}, rankedPlayers(count));
    const size = bracketSize(count);
    const rounds = Math.log2(size);

    for (let round = 1; round <= rounds; round++) {
      expect(knockoutRound(state, round)).toHaveLength(size / 2 ** round);
    }

    // Byes go to the top seeds, one per match at most, and carry them into round 2
    const byes = knockoutRound(state, 1).filter(m => m.is_bye);
    expect(byes).toHaveLength(size - count);
    const byeSeeds = byes.map(m => state.players.find(p => p.id === m.winner_id)!.seed).sort((x, y) => x - y);
    expect(byeSeeds).toEqual(Array.from({ length: size - count }, (_, i) => i + 1));
    for (const bye of byes) {
      const next = state.matches.find(m => m.id === bye.next_match_id)!;
      expect(bye.next_slot === 'a' ? next.player_a_id : next.player_b_id).toBe(bye.winner_id);
    }

    // Every player appears exactly once in round 1
    const placed = knockoutRound(state, 1).flatMap(m => [m.player_a_id, m.player_b_id]).filter(Boolean);
    expect(new Set(placed).size).toBe(count);
  });

  it('gives seeds 1 and 2 the byes with 6 players', () => {
    const state = drawnState({}, rankedPlayers(6));
    const firstRound = knockoutRound(state, 1).map(m => [nameOf(state, m.player_a_id), nameOf(state, m.player_b_id)]);

    expect(firstRound).toEqual([
      ['P1', null],
      ['P4', 'P5'],
      ['P2', null],
      ['P3', 'P6']
    ]);
    expect(knockoutRound(state, 2).map(m => [nameOf(state, m.player_a_id), nameOf(state, m.player_b_id)])).toEqual([
      ['P1', null],
      ['P2', null]
    ]);
  });

  it('links each match to the next round and records the source', () => {
    const matches = buildKnockout(
      seedOrder(4).map(seed => ({ player_id: `p${seed}`, source: null })),
      sequentialIds()
    );
    const [semi1, semi2, final] = matches;

    expect(semi1.next_match_id).toBe(final.id);
    expect(semi1.next_slot).toBe('a');
    expect(semi2.next_slot).toBe('b');
    expect(final.source_a).toBe(`winner:${semi1.id}`);
    expect(final.source_b).toBe(`winner:${semi2.id}`);
    expect(final.next_match_id).toBeNull();
  });

  it('labels matches by round', () => {
    const state = drawnState({}, rankedPlayers(16));
    const labels = state.matches.map(m => knockoutLabel(m, 4));

    expect(labels.slice(0, 2)).toEqual(['R16-1', 'R16-2']);
    expect(labels.slice(8, 10)).toEqual(['QF1', 'QF2']);
    expect(labels.slice(12)).toEqual(['SF1', 'SF2', 'Final']);
  });
});
