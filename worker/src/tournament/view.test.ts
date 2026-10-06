import { describe, it, expect } from 'vitest';
import { buildView } from './view';
import { applyResult, mergeChanges } from './advance';
import { GROUP_SETTINGS, drawnState, playerId, rankedPlayers } from './testHelpers';
import type { MatchView, TournamentState } from './types';

const byLabel = (matches: MatchView[], label: string) => matches.find(m => m.label === label)!;

function win(state: TournamentState, matchId: string, winner: string): TournamentState {
  const changes = applyResult(
    state,
    matchId,
    { winner_id: playerId(state, winner), games_a: 3, games_b: 0, game_scores: null },
    1000
  );
  return mergeChanges(state, changes);
}

describe('buildView', () => {
  describe('knockout with handicaps', () => {
    // Seeds by handicap: H-10 (1), H-5 (2), H0 (3), H5 (4), H10 (5), H15 (6)
    const players = [-10, -5, 0, 5, 10, 15].map(h => ({ name: `H${h}`, handicap: h }));
    const state = () => drawnState({ seeding_mode: 'handicap' }, players);

    it('names rounds and labels matches', () => {
      const view = buildView(state());

      expect(view.rounds.map(r => r.name)).toEqual(['Quarter-final', 'Semi-final', 'Final']);
      expect(view.matches.map(m => m.label)).toEqual(['QF1', 'QF2', 'QF3', 'QF4', 'SF1', 'SF2', 'Final']);
      expect(view.matches.map(m => m.round_name)).toEqual([
        'Quarter-final',
        'Quarter-final',
        'Quarter-final',
        'Quarter-final',
        'Semi-final',
        'Semi-final',
        'Final'
      ]);
    });

    it('describes each match', () => {
      const view = buildView(state());

      // QF1 is seed 1's bye; QF2 is seed 4 (H5) v seed 5 (H10)
      expect(byLabel(view.matches, 'QF1')).toMatchObject({ status: 'bye', handicap: null });
      expect(byLabel(view.matches, 'QF2')).toMatchObject({
        status: 'ready',
        handicap: { start_a: 0, start_b: 5, play_to: 11, warning: null }
      });

      // SF1: seed 1 has come through the bye; the other player is still to be decided
      expect(byLabel(view.matches, 'SF1')).toMatchObject({
        status: 'pending',
        source_a_label: 'Winner QF1',
        source_b_label: 'Winner QF2',
        handicap: null
      });
    });

    it('shows the handicap once both players are known', () => {
      let s = state();
      const qf2 = byLabel(buildView(s).matches, 'QF2');
      s = win(s, qf2.id, 'H10');

      // H-10 v H10: minus v plus, 0-20 to 21
      expect(byLabel(buildView(s).matches, 'SF1').handicap).toEqual({
        start_a: 0,
        start_b: 20,
        play_to: 21,
        warning: null
      });
    });

    it('locks every result while the tournament is a draft', () => {
      const view = buildView(drawnState({ seeding_mode: 'handicap' }, players, 'draft'));
      expect(view.matches.every(m => m.locked && m.lock_reason === "The tournament hasn't started")).toBe(true);
    });

    it('names the champion', () => {
      let s = drawnState({}, rankedPlayers(2));
      expect(buildView(s).champion_id).toBeNull();

      s = win(s, s.matches[0].id, 'P2');
      const view = buildView(s);
      expect(view.champion_id).toBe(playerId(s, 'P2'));
      expect(view.tournament.status).toBe('completed');
    });
  });

  describe('groups', () => {
    it('lists groups with standings and labels qualifier lines by group position', () => {
      const view = buildView(drawnState(GROUP_SETTINGS, rankedPlayers(8)));

      expect(view.groups.map(g => g.name)).toEqual(['Group A', 'Group B']);
      expect(view.groups[0].player_ids.map(id => view.players.find(p => p.id === id)!.name)).toEqual([
        'P1',
        'P4',
        'P5',
        'P8'
      ]);
      expect(view.groups[0].standings.rows).toHaveLength(4);

      // Group matches come first, then the knockout
      expect(view.matches.slice(0, 12).every(m => m.stage === 'group')).toBe(true);
      expect(view.matches[0]).toMatchObject({ label: 'Group A', round_name: 'Round 1', status: 'ready' });

      expect(byLabel(view.matches, 'SF1')).toMatchObject({ source_a_label: 'A1', source_b_label: 'B2' });
      expect(byLabel(view.matches, 'SF2')).toMatchObject({ source_a_label: 'B1', source_b_label: 'A2' });
    });

    it('has no groups for a knockout tournament', () => {
      expect(buildView(drawnState({}, rankedPlayers(4))).groups).toEqual([]);
    });
  });
});
