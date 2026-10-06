// Builders shared by the tournament engine tests
import { createDraw } from './draw';
import { createRng } from './random';
import type { Match, PlayerInput, Tournament, TournamentSettings, TournamentState } from './types';

export function sequentialIds(prefix = 'id'): () => string {
  let next = 0;
  return () => `${prefix}-${++next}`;
}

/** Players named P1..Pn ranked 1..n, so seed = number */
export function rankedPlayers(count: number): PlayerInput[] {
  return Array.from({ length: count }, (_, i) => ({ name: `P${i + 1}`, ranking: i + 1 }));
}

export const KNOCKOUT_SETTINGS: TournamentSettings = {
  name: 'Club Championship',
  format: 'knockout',
  seeding_mode: 'ranking',
  score_mode: 'games',
  best_of: 5,
  group_count: null,
  advance_per_group: null
};

export const GROUP_SETTINGS: TournamentSettings = {
  ...KNOCKOUT_SETTINGS,
  format: 'groups',
  group_count: 2,
  advance_per_group: 2
};

/** A drawn tournament, already started unless a status is given */
export function drawnState(
  settings: Partial<TournamentSettings>,
  players: PlayerInput[],
  status: Tournament['status'] = 'in_progress'
): TournamentState {
  const draw = createDraw({ ...KNOCKOUT_SETTINGS, ...settings }, players, createRng(1), sequentialIds('m'));
  return {
    tournament: { ...draw.settings, id: 't-1', status, created_at: 0, updated_at: 0 },
    players: draw.players,
    matches: draw.matches
  };
}

export function playerId(state: TournamentState, name: string): string {
  const player = state.players.find(p => p.name === name);
  if (!player) throw new Error(`No player ${name}`);
  return player.id;
}

export function nameOf(state: TournamentState, id: string | null): string | null {
  return id === null ? null : (state.players.find(p => p.id === id)?.name ?? null);
}

/** Knockout matches of a round, in bracket order */
export function knockoutRound(state: TournamentState, round: number): Match[] {
  return state.matches
    .filter(m => m.stage === 'knockout' && m.round === round)
    .sort((x, y) => x.position - y.position);
}

export function groupMatches(state: TournamentState, groupIndex: number): Match[] {
  return state.matches.filter(m => m.stage === 'group' && m.group_index === groupIndex);
}
