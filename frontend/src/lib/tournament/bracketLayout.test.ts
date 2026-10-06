import { describe, it, expect } from 'vitest';
import { bracketColumns, groupSizes, knockoutSummary, matchLists } from './bracketLayout';
import type { Match, TournamentView } from '$lib/types/tournament';

function match(overrides: Partial<Match>): Match {
  return {
    id: 'm',
    stage: 'knockout',
    group_index: null,
    round: 1,
    position: 0,
    player_a_id: null,
    player_b_id: null,
    source_a: null,
    source_b: null,
    next_match_id: null,
    next_slot: null,
    is_bye: false,
    winner_id: null,
    games_a: null,
    games_b: null,
    game_scores: null,
    completed_at: null,
    label: '',
    round_name: '',
    source_a_label: null,
    source_b_label: null,
    handicap: null,
    status: 'pending',
    locked: false,
    lock_reason: null,
    ...overrides
  };
}

function view(matches: Match[]): TournamentView {
  return {
    tournament: {} as TournamentView['tournament'],
    players: [],
    groups: [],
    rounds: [
      { round: 1, name: 'Semi-final', short_name: 'SF' },
      { round: 2, name: 'Final', short_name: 'F' }
    ],
    matches,
    champion_id: null
  };
}

describe('bracketColumns', () => {
  it('puts knockout matches in a column per round, in bracket order', () => {
    const columns = bracketColumns(
      view([
        match({ id: 'g', stage: 'group', round: 1 }),
        match({ id: 'final', round: 2 }),
        match({ id: 'sf2', round: 1, position: 1 }),
        match({ id: 'sf1', round: 1, position: 0 })
      ])
    );

    expect(columns.map(c => c.round.name)).toEqual(['Semi-final', 'Final']);
    expect(columns.map(c => c.matches.map(m => m.id))).toEqual([['sf1', 'sf2'], ['final']]);
  });
});

describe('knockoutSummary', () => {
  it.each([
    ['knockout', 2, null, null, '2 players → a final'],
    ['knockout', 6, null, null, '6 players → quarter-finals, with 2 byes'],
    ['knockout', 8, null, null, '8 players → quarter-finals'],
    ['knockout', 9, null, null, '9 players → a round of 16, with 7 byes'],
    ['groups', 8, 2, 2, '4 qualifiers → semi-finals'],
    ['groups', 16, 4, 2, '8 qualifiers → quarter-finals'],
    ['groups', 10, 3, 2, '6 qualifiers → quarter-finals, with 2 byes'],
    ['groups', 9, 3, 1, '3 qualifiers → semi-finals, with 1 bye']
  ] as const)('%s with %i players, %s groups, top %s: %s', (format, players, groups, advance, summary) => {
    expect(knockoutSummary(format, players, groups, advance)).toBe(summary);
  });

  it('has nothing to say until there are enough players or qualifiers', () => {
    expect(knockoutSummary('knockout', 1, null, null)).toBeNull();
    expect(knockoutSummary('groups', 8, 1, 1)).toBeNull();
    expect(knockoutSummary('groups', 8, null, 2)).toBeNull();
  });
});

describe('groupSizes', () => {
  it('splits players as evenly as possible, largest first', () => {
    expect(groupSizes(10, 3)).toEqual([4, 3, 3]);
    expect(groupSizes(8, 2)).toEqual([4, 4]);
  });
});

describe('matchLists', () => {
  it('splits playable matches by status, most recent results first, leaving out byes', () => {
    const lists = matchLists(
      view([
        match({ id: 'bye', status: 'bye' }),
        match({ id: 'ready', status: 'ready' }),
        match({ id: 'waiting', status: 'pending' }),
        match({ id: 'older', status: 'completed', completed_at: 1 }),
        match({ id: 'newer', status: 'completed', completed_at: 2 })
      ])
    );

    expect(lists.ready.map(m => m.id)).toEqual(['ready']);
    expect(lists.pending.map(m => m.id)).toEqual(['waiting']);
    expect(lists.completed.map(m => m.id)).toEqual(['newer', 'older']);
  });
});
