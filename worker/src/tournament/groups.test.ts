import { describe, it, expect } from 'vitest';
import { distributeToGroups, parseGroupSource, qualifierLines, roundRobin, validateGroupConfig } from './groups';
import { bracketSize, meetingRound } from './knockout';
import { GROUP_SETTINGS, drawnState, knockoutRound, rankedPlayers } from './testHelpers';

const short = (lines: (string | null)[]) =>
  lines.map(line => {
    const source = parseGroupSource(line);
    return source ? `${String.fromCharCode(65 + source.groupIndex)}${source.position}` : null;
  });

describe('distributeToGroups', () => {
  it('snakes 8 players over 2 groups', () => {
    expect(distributeToGroups(8, 2)).toEqual([0, 1, 1, 0, 0, 1, 1, 0]);
  });

  it('snakes 10 players over 3 groups', () => {
    // A: seeds 1, 6, 7   B: 2, 5, 8   C: 3, 4, 9, 10
    expect(distributeToGroups(10, 3)).toEqual([0, 1, 2, 2, 1, 0, 0, 1, 2, 2]);
  });

  it('keeps group sizes within 1 of each other', () => {
    for (let players = 2; players <= 64; players++) {
      for (let groups = 1; groups <= Math.min(16, players / 2); groups++) {
        const sizes = Array(groups).fill(0);
        distributeToGroups(players, groups).forEach(g => sizes[g]++);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('roundRobin', () => {
  it.each([2, 3, 4, 5, 6, 7, 8])('pairs every player once with %i players', count => {
    const ids = Array.from({ length: count }, (_, i) => `p${i + 1}`);
    const pairings = roundRobin(ids);

    expect(pairings).toHaveLength((count * (count - 1)) / 2);
    expect(new Set(pairings.map(p => `${p.a}-${p.b}`)).size).toBe(pairings.length);

    // Nobody plays twice in a round, and the better seed is player A
    const rounds = new Map<number, string[]>();
    for (const p of pairings) {
      rounds.set(p.round, [...(rounds.get(p.round) ?? []), p.a, p.b]);
      expect(ids.indexOf(p.a)).toBeLessThan(ids.indexOf(p.b));
    }
    for (const players of rounds.values()) {
      expect(new Set(players).size).toBe(players.length);
    }
  });

  it.each([4, 5, 6])('has the top two seeds meet in the last round with %i players', count => {
    const ids = Array.from({ length: count }, (_, i) => `p${i + 1}`);
    const pairings = roundRobin(ids);
    const lastRound = Math.max(...pairings.map(p => p.round));
    expect(pairings.find(p => p.a === 'p1' && p.b === 'p2')!.round).toBe(lastRound);
  });
});

describe('qualifierLines', () => {
  it('crosses over 2 groups, top 2, into semi-finals', () => {
    expect(short(qualifierLines(2, 2))).toEqual(['A1', 'B2', 'B1', 'A2']);
  });

  it('places 4 groups, top 2, into quarter-finals with groups in opposite halves', () => {
    expect(short(qualifierLines(4, 2))).toEqual(['A1', 'C2', 'D1', 'B2', 'B1', 'D2', 'C1', 'A2']);
  });

  it('gives byes to A1 and B1 with 3 groups, top 2', () => {
    expect(short(qualifierLines(3, 2))).toEqual(['A1', null, 'B2', 'C2', 'B1', null, 'C1', 'A2']);
  });

  it.each([
    [1, 2],
    [1, 4],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 2],
    [3, 3],
    [4, 1],
    [4, 2],
    [4, 3],
    [5, 2],
    [6, 2],
    [8, 2],
    [16, 2]
  ])('keeps group-mates apart with %i groups, top %i', (groups, advance) => {
    const lines = qualifierLines(groups, advance);
    const size = bracketSize(groups * advance);
    expect(lines).toHaveLength(size);

    // Every qualifier appears once, the rest are byes, and no match is two byes
    const sources = lines.filter(Boolean);
    expect(sources).toHaveLength(groups * advance);
    expect(new Set(sources).size).toBe(sources.length);
    for (let i = 0; i < size; i += 2) {
      expect(lines[i] ?? lines[i + 1]).not.toBeNull();
    }

    if (groups === 1) return;

    // Players from the same group never meet in the first round
    for (let i = 0; i < size; i += 2) {
      const a = parseGroupSource(lines[i]);
      const b = parseGroupSource(lines[i + 1]);
      if (a && b) expect(a.groupIndex).not.toBe(b.groupIndex);
    }

    // With top 2 and a power-of-two number of groups, group-mates can only meet in the final
    if (advance === 2 && (groups & (groups - 1)) === 0) {
      const finalRound = Math.log2(size);
      for (let g = 0; g < groups; g++) {
        const winner = lines.indexOf(`group:${g}:1`);
        const runnerUp = lines.indexOf(`group:${g}:2`);
        expect(meetingRound(winner, runnerUp)).toBe(finalRound);
      }
    }
  });
});

describe('validateGroupConfig', () => {
  it('accepts 8 players in 2 groups with 2 qualifiers each', () => {
    expect(() => validateGroupConfig(8, 2, 2)).not.toThrow();
  });

  it.each([
    [8, 0, 1, 'Number of groups must be a whole number from 1 to 16'],
    [8, 17, 1, 'Number of groups must be a whole number from 1 to 16'],
    [8, 2, 0, 'Qualifiers per group must be a whole number of 1 or more'],
    [5, 3, 1, '3 groups need at least 6 players'],
    [8, 2, 4, 'the smallest group has 4 players, so at most 3 can qualify'],
    [10, 3, 3, 'the smallest group has 3 players, so at most 2 can qualify'],
    [4, 1, 1, 'At least 2 players must qualify']
  ])('rejects %i players, %i groups, top %i', (players, groups, advance, message) => {
    expect(() => validateGroupConfig(players, groups, advance)).toThrow(message);
  });
});

describe('group draw', () => {
  it('draws 8 players into 2 round-robin groups feeding semi-finals', () => {
    const state = drawnState(GROUP_SETTINGS, rankedPlayers(8));
    const groupOf = (name: string) => state.players.find(p => p.name === name)!.group_index;

    expect(['P1', 'P4', 'P5', 'P8'].map(groupOf)).toEqual([0, 0, 0, 0]);
    expect(['P2', 'P3', 'P6', 'P7'].map(groupOf)).toEqual([1, 1, 1, 1]);
    expect(state.matches.filter(m => m.stage === 'group')).toHaveLength(12);

    const semis = knockoutRound(state, 1);
    expect(semis.map(m => [m.source_a, m.source_b])).toEqual([
      ['group:0:1', 'group:1:2'],
      ['group:1:1', 'group:0:2']
    ]);
    expect(semis.every(m => m.player_a_id === null && m.player_b_id === null)).toBe(true);
  });

  it('rejects groups that are too small for the qualifiers', () => {
    expect(() => drawnState({ ...GROUP_SETTINGS, advance_per_group: 4 }, rankedPlayers(8))).toThrow(
      'at most 3 can qualify'
    );
  });
});
