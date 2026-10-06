import { describe, it, expect } from 'vitest';
import { applyResult, clearResult, mergeChanges, reconcileGroupLines, resolveGroupTie, groupStandings } from './advance';
import { validateResult } from './results';
import {
  GROUP_SETTINGS,
  drawnState,
  groupMatches,
  knockoutRound,
  nameOf,
  playerId,
  rankedPlayers
} from './testHelpers';
import type { Match, MatchStage, TournamentState } from './types';

const SCRATCH = { start_a: 0, start_b: 0, play_to: 11, warning: null };

/** The match between two players; players who met in a group can meet again in the knockout */
function findMatch(state: TournamentState, x: string, y: string, stage?: MatchStage): Match {
  const ids = [playerId(state, x), playerId(state, y)];
  const match = state.matches.find(
    m => (!stage || m.stage === stage) && ids.includes(m.player_a_id!) && ids.includes(m.player_b_id!)
  );
  if (!match) throw new Error(`No match between ${x} and ${y}`);
  return match;
}

/** Record `winner` beating `loser` 3-1 (games mode) and return the new state */
function beat(state: TournamentState, winner: string, loser: string, stage?: MatchStage): TournamentState {
  const match = findMatch(state, winner, loser, stage);
  const winnerIsA = match.player_a_id === playerId(state, winner);
  const result = validateResult(
    state.tournament,
    match,
    winnerIsA ? { games_a: 3, games_b: 1 } : { games_a: 1, games_b: 3 },
    SCRATCH,
    { a: 'A', b: 'B' }
  );
  return mergeChanges(state, applyResult(state, match.id, result, 1000));
}

function clear(state: TournamentState, match: Match): TournamentState {
  return mergeChanges(state, clearResult(state, match.id));
}

/** Names in each match of a knockout round, e.g. [['P1', 'P4'], ['P2', 'P3']] */
function roundNames(state: TournamentState, round: number) {
  return knockoutRound(state, round).map(m => [nameOf(state, m.player_a_id), nameOf(state, m.player_b_id)]);
}

describe('knockout advancement', () => {
  const semis = () => drawnState({}, rankedPlayers(4));

  it('moves each winner into the right slot of the next round', () => {
    let state = semis();
    expect(roundNames(state, 1)).toEqual([['P1', 'P4'], ['P2', 'P3']]);

    state = beat(state, 'P4', 'P1');
    expect(roundNames(state, 2)).toEqual([['P4', null]]);

    state = beat(state, 'P2', 'P3');
    expect(roundNames(state, 2)).toEqual([['P4', 'P2']]);
    expect(state.tournament.status).toBe('in_progress');
  });

  it('reports only the matches that changed', () => {
    const state = semis();
    const sf1 = findMatch(state, 'P1', 'P4');
    const result = validateResult(state.tournament, sf1, { games_a: 3, games_b: 0 }, SCRATCH, { a: 'A', b: 'B' });

    const changes = applyResult(state, sf1.id, result, 1000);

    expect(changes.matches.map(m => m.id).sort()).toEqual([sf1.id, sf1.next_match_id].sort());
    expect(changes.matches.find(m => m.id === sf1.id)).toMatchObject({ winner_id: playerId(state, 'P1'), completed_at: 1000 });
    // The original state is untouched
    expect(state.matches.find(m => m.id === sf1.id)!.winner_id).toBeNull();
  });

  it('swaps the player in the next round when a result is corrected in time', () => {
    let state = beat(semis(), 'P1', 'P4');
    state = beat(state, 'P4', 'P1');
    expect(roundNames(state, 2)).toEqual([['P4', null]]);
  });

  it('keeps the next round as it is when only the score is corrected', () => {
    let state = beat(semis(), 'P1', 'P4');
    const sf1 = findMatch(state, 'P1', 'P4');
    const result = validateResult(state.tournament, sf1, { games_a: 3, games_b: 2 }, SCRATCH, { a: 'A', b: 'B' });
    const changes = applyResult(state, sf1.id, result, 2000);

    expect(changes.matches.map(m => m.id)).toEqual([sf1.id]);
    state = mergeChanges(state, changes);
    expect(roundNames(state, 2)).toEqual([['P1', null]]);
  });

  it('locks a result once the next match has one', () => {
    let state = beat(semis(), 'P1', 'P4');
    state = beat(state, 'P2', 'P3');
    state = beat(state, 'P1', 'P2');

    expect(() => beat(state, 'P4', 'P1')).toThrow(
      "SF1 can't be changed because Final already has a result; clear Final first"
    );
    expect(() => clear(state, findMatch(state, 'P1', 'P4'))).toThrow('clear Final first');
  });

  it('completes the tournament with the final, and reopens it if the final is cleared', () => {
    let state = beat(semis(), 'P1', 'P4');
    state = beat(state, 'P2', 'P3');
    state = beat(state, 'P2', 'P1');
    expect(state.tournament.status).toBe('completed');

    state = clear(state, findMatch(state, 'P1', 'P2'));
    expect(state.tournament.status).toBe('in_progress');
  });

  it('takes a cleared winner back out of the next round', () => {
    let state = beat(semis(), 'P1', 'P4');
    state = clear(state, findMatch(state, 'P1', 'P4'));

    expect(roundNames(state, 2)).toEqual([[null, null]]);
    expect(findMatch(state, 'P1', 'P4')).toMatchObject({ winner_id: null, games_a: null, completed_at: null });
  });

  it('refuses to clear a match with no result', () => {
    const state = semis();
    expect(() => clear(state, findMatch(state, 'P1', 'P4'))).toThrow('This match has no result to clear');
  });

  it('refuses results for byes and before the start', () => {
    const withByes = drawnState({}, rankedPlayers(3));
    const bye = knockoutRound(withByes, 1).find(m => m.is_bye)!;
    expect(() => clear(withByes, bye)).toThrow("Byes don't have results");

    const draft = drawnState({}, rankedPlayers(4), 'draft');
    expect(() =>
      applyResult(draft, findMatch(draft, 'P1', 'P4').id, { winner_id: 'x', games_a: 3, games_b: 0, game_scores: null }, 0)
    ).toThrow("The tournament hasn't started");
  });

  it('reports an unknown match as not found', () => {
    expect(() => clearResult(semis(), 'nope')).toThrow('Match not found');
  });
});

describe('group qualification', () => {
  // Group A: P1, P4, P5, P8   Group B: P2, P3, P6, P7
  const groupsOf8 = () => drawnState(GROUP_SETTINGS, rankedPlayers(8));

  /** Everyone in the group beats everyone ranked below them */
  function playGroupBySeed(state: TournamentState, names: string[]): TournamentState {
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        state = beat(state, names[i], names[j]);
      }
    }
    return state;
  }

  it('fills a group\'s knockout lines as soon as that group is finished', () => {
    let state = playGroupBySeed(groupsOf8(), ['P1', 'P4', 'P5', 'P8']);
    expect(roundNames(state, 1)).toEqual([['P1', null], [null, 'P4']]);

    state = playGroupBySeed(state, ['P2', 'P3', 'P6', 'P7']);
    expect(roundNames(state, 1)).toEqual([['P1', 'P3'], ['P2', 'P4']]);
  });

  it('waits for every match in the group', () => {
    let state = groupsOf8();
    state = beat(state, 'P1', 'P4');
    state = beat(state, 'P1', 'P5');
    expect(roundNames(state, 1)).toEqual([[null, null], [null, null]]);
  });

  it('re-fills the lines when a group result is corrected before the knockout starts', () => {
    let state = playGroupBySeed(groupsOf8(), ['P1', 'P4', 'P5', 'P8']);
    // P5 now beats P4 and P1, so P5 tops the group and P1 is second
    state = beat(state, 'P5', 'P4');
    state = beat(state, 'P5', 'P1');

    expect(roundNames(state, 1)).toEqual([['P5', null], [null, 'P1']]);
  });

  it('empties the lines again when a group result is cleared', () => {
    let state = playGroupBySeed(groupsOf8(), ['P1', 'P4', 'P5', 'P8']);
    state = clear(state, findMatch(state, 'P1', 'P4'));
    expect(roundNames(state, 1)).toEqual([[null, null], [null, null]]);
  });

  it('locks group results once a knockout match has a result', () => {
    let state = playGroupBySeed(groupsOf8(), ['P1', 'P4', 'P5', 'P8']);
    state = playGroupBySeed(state, ['P2', 'P3', 'P6', 'P7']);
    state = beat(state, 'P1', 'P3');

    expect(() => beat(state, 'P4', 'P1', 'group')).toThrow('Group results are locked because the knockout has started');
    expect(() => clear(state, findMatch(state, 'P1', 'P5', 'group'))).toThrow('Group results are locked');
  });

  it('sends a qualifier with a bye straight into the next round', () => {
    // 3 groups, top 2 = 6 qualifiers in an 8-line bracket: A1 and B1 get byes
    let state = drawnState({ ...GROUP_SETTINGS, group_count: 3 }, rankedPlayers(9));
    const groupA = state.players.filter(p => p.group_index === 0).map(p => p.name);
    state = playGroupBySeed(state, groupA);

    const a1 = groupA[0];
    expect(roundNames(state, 1)[0]).toEqual([a1, null]);
    expect(roundNames(state, 2)[0][0]).toBe(a1);
    expect(state.tournament.status).toBe('in_progress');
  });

  describe('ties the organiser has to order', () => {
    // 6 players in 2 groups of 3, top 1, winner only: A = P1, P4, P5
    const cycleInGroupA = () => {
      let state = drawnState(
        { ...GROUP_SETTINGS, score_mode: 'winner', advance_per_group: 1 },
        rankedPlayers(6)
      );
      for (const [winner, loser] of [['P1', 'P4'], ['P4', 'P5'], ['P5', 'P1']]) {
        const match = findMatch(state, winner, loser);
        const changes = applyResult(
          state,
          match.id,
          { winner_id: playerId(state, winner), games_a: null, games_b: null, game_scores: null },
          1000
        );
        state = mergeChanges(state, changes);
      }
      return state;
    };

    it('holds the qualifiers back until the tie is ordered', () => {
      let state = cycleInGroupA();
      expect(groupStandings(state, 0).unresolved_tie).toHaveLength(3);
      expect(roundNames(state, 1)).toEqual([[null, null]]);

      const order = ['P5', 'P1', 'P4'].map(name => playerId(state, name));
      state = mergeChanges(state, resolveGroupTie(state, 0, order));

      expect(groupStandings(state, 0).rows.map(r => nameOf(state, r.player_id))).toEqual(['P5', 'P1', 'P4']);
      expect(roundNames(state, 1)).toEqual([['P5', null]]);
    });

    it('forgets the manual order when a group result changes', () => {
      let state = cycleInGroupA();
      state = mergeChanges(state, resolveGroupTie(state, 0, ['P5', 'P1', 'P4'].map(name => playerId(state, name))));

      const match = findMatch(state, 'P1', 'P4');
      const changes = clearResult(state, match.id);
      expect(changes.players.map(p => p.manual_group_rank)).toEqual([null, null, null]);

      state = mergeChanges(state, changes);
      expect(roundNames(state, 1)).toEqual([[null, null]]);
    });

    it('only accepts exactly the tied players', () => {
      const state = cycleInGroupA();
      expect(() => resolveGroupTie(state, 0, [playerId(state, 'P1'), playerId(state, 'P4')])).toThrow(
        'Order exactly the tied players: P1, P4, P5'
      );
    });

    it('refuses when there is nothing to order', () => {
      const state = cycleInGroupA();
      expect(() => resolveGroupTie(state, 1, [])).toThrow('There is no tie to resolve in Group B');
      expect(() => resolveGroupTie(state, 5, [])).toThrow('Group not found');
    });

    it('refuses for a knockout-only tournament', () => {
      expect(() => resolveGroupTie(drawnState({}, rankedPlayers(4)), 0, [])).toThrow('This tournament has no groups');
    });
  });

  it('repairs knockout lines that concurrent writes left empty', () => {
    // Two people enter group A's last two results from the same starting state
    let before = groupsOf8();
    for (const [winner, loser] of [['P1', 'P4'], ['P1', 'P5'], ['P1', 'P8'], ['P4', 'P5']]) {
      before = beat(before, winner, loser);
    }
    const first = beat(before, 'P4', 'P8');
    const second = beat(before, 'P5', 'P8');
    const p48 = findMatch(first, 'P4', 'P8');
    const p58 = findMatch(second, 'P5', 'P8');
    const stored: TournamentState = {
      ...before,
      matches: before.matches.map(m => (m.id === p48.id ? p48 : m.id === p58.id ? p58 : m))
    };
    expect(roundNames(stored, 1)).toEqual([[null, null], [null, null]]);

    const repaired = mergeChanges(stored, reconcileGroupLines(stored));

    expect(roundNames(repaired, 1)).toEqual([['P1', null], [null, 'P4']]);
    expect(reconcileGroupLines(repaired).matches).toEqual([]);
  });

  it('plays a whole group tournament through to a champion', () => {
    let state = playGroupBySeed(groupsOf8(), ['P1', 'P4', 'P5', 'P8']);
    state = playGroupBySeed(state, ['P2', 'P3', 'P6', 'P7']);
    expect(groupMatches(state, 0).every(m => m.winner_id)).toBe(true);

    state = beat(state, 'P1', 'P3');
    state = beat(state, 'P4', 'P2');
    state = beat(state, 'P4', 'P1', 'knockout');

    expect(state.tournament.status).toBe('completed');
    expect(nameOf(state, knockoutRound(state, 2)[0].winner_id)).toBe('P4');
  });
});
