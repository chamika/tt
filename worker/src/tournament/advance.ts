import { conflict, invalid, notFound } from './errors';
import { groupName, parseGroupSource } from './groups';
import { knockoutLabel, knockoutRounds, placePlayer } from './knockout';
import { computeStandings, groupQualifiers } from './standings';
import type {
  GroupStandings,
  Match,
  MatchResult,
  Player,
  StateChanges,
  TournamentState,
  TournamentStatus
} from './types';

/** Mutable copies of the state, plus the ids of what has changed */
interface Workspace {
  state: TournamentState;
  matches: Map<string, Match>;
  players: Map<string, Player>;
  changedMatches: Set<string>;
  changedPlayers: Set<string>;
}

function workspace(state: TournamentState): Workspace {
  const matches = new Map(
    state.matches.map(m => [m.id, { ...m, game_scores: m.game_scores ? m.game_scores.map(g => ({ ...g })) : null }])
  );
  const players = new Map(state.players.map(p => [p.id, { ...p }]));
  return {
    state: { tournament: state.tournament, players: [...players.values()], matches: [...matches.values()] },
    matches,
    players,
    changedMatches: new Set(),
    changedPlayers: new Set()
  };
}

function finish(ws: Workspace): StateChanges {
  return {
    matches: [...ws.changedMatches].map(id => ws.matches.get(id)!),
    players: [...ws.changedPlayers].map(id => ws.players.get(id)!),
    status: tournamentStatus(ws.state)
  };
}

/** The state after `changes` are applied */
export function mergeChanges(state: TournamentState, changes: StateChanges): TournamentState {
  const matches = new Map(changes.matches.map(m => [m.id, m]));
  const players = new Map(changes.players.map(p => [p.id, p]));
  return {
    tournament: { ...state.tournament, status: changes.status },
    matches: state.matches.map(m => matches.get(m.id) ?? m),
    players: state.players.map(p => players.get(p.id) ?? p)
  };
}

/** Whether any real (non-bye) knockout match has a result */
export function knockoutStarted(matches: Match[]): boolean {
  return matches.some(m => m.stage === 'knockout' && !m.is_bye && m.winner_id !== null);
}

export function tournamentStatus(state: TournamentState): TournamentStatus {
  if (state.tournament.status === 'draft') return 'draft';
  const final = state.matches.find(m => m.stage === 'knockout' && m.next_match_id === null);
  return final?.winner_id ? 'completed' : 'in_progress';
}

/** Why a match's result can't be entered or changed right now, or null if it can */
export function resultLock(state: TournamentState, match: Match): string | null {
  if (state.tournament.status === 'draft') return "The tournament hasn't started";
  if (match.is_bye) return "Byes don't have results";

  if (match.stage === 'group') {
    return knockoutStarted(state.matches) ? 'Group results are locked because the knockout has started' : null;
  }

  const next = state.matches.find(m => m.id === match.next_match_id);
  if (next?.winner_id && !next.is_bye) {
    const rounds = knockoutRounds(state.matches);
    const nextLabel = knockoutLabel(next, rounds);
    return `${knockoutLabel(match, rounds)} can't be changed because ${nextLabel} already has a result; clear ${nextLabel} first`;
  }
  return null;
}

export function groupPlayers(state: TournamentState, groupIndex: number): Player[] {
  return state.players.filter(p => p.group_index === groupIndex).sort((x, y) => x.seed - y.seed);
}

export function groupStandings(state: TournamentState, groupIndex: number): GroupStandings {
  const { tournament } = state;
  return computeStandings(
    groupPlayers(state, groupIndex),
    state.matches.filter(m => m.stage === 'group' && m.group_index === groupIndex),
    tournament.score_mode,
    tournament.advance_per_group ?? 1
  );
}

/** Make the knockout lines fed by a group match its current qualifiers (or empty them) */
function refillGroupLines(ws: Workspace, groupIndex: number): void {
  const advance = ws.state.tournament.advance_per_group ?? 1;
  const qualifiers = groupQualifiers(groupStandings(ws.state, groupIndex), advance) ?? [];

  for (const match of ws.state.matches) {
    if (match.stage !== 'knockout') continue;
    for (const slot of ['a', 'b'] as const) {
      const source = parseGroupSource(slot === 'a' ? match.source_a : match.source_b);
      if (!source || source.groupIndex !== groupIndex) continue;
      const wanted = qualifiers[source.position - 1] ?? null;
      const current = slot === 'a' ? match.player_a_id : match.player_b_id;
      if (current !== wanted) {
        placePlayer(ws.matches, match.id, slot, wanted, ws.changedMatches);
      }
    }
  }
}

/** A changed group result invalidates any manual tie order in that group */
function clearManualOrder(ws: Workspace, groupIndex: number): void {
  for (const player of ws.state.players) {
    if (player.group_index === groupIndex && player.manual_group_rank !== null) {
      player.manual_group_rank = null;
      ws.changedPlayers.add(player.id);
    }
  }
}

function findMatch(ws: Workspace, matchId: string): Match {
  const match = ws.matches.get(matchId);
  if (!match) throw notFound('Match not found');
  return match;
}

/**
 * Record (or replace) a validated result and carry it through the tournament:
 * a knockout winner moves into the next round, and a finished group sends its
 * qualifiers into their knockout lines.
 */
export function applyResult(
  state: TournamentState,
  matchId: string,
  result: MatchResult,
  now: number
): StateChanges {
  const ws = workspace(state);
  const match = findMatch(ws, matchId);

  const lock = resultLock(ws.state, match);
  if (lock) throw conflict(lock);

  const previousWinner = match.winner_id;
  Object.assign(match, result, { completed_at: now });
  ws.changedMatches.add(match.id);

  if (match.stage === 'knockout') {
    if (match.next_match_id && match.next_slot && previousWinner !== result.winner_id) {
      placePlayer(ws.matches, match.next_match_id, match.next_slot, result.winner_id, ws.changedMatches);
    }
  } else {
    clearManualOrder(ws, match.group_index!);
    refillGroupLines(ws, match.group_index!);
  }

  return finish(ws);
}

/** Remove a result, and take its winner back out of anything it fed */
export function clearResult(state: TournamentState, matchId: string): StateChanges {
  const ws = workspace(state);
  const match = findMatch(ws, matchId);

  const lock = resultLock(ws.state, match);
  if (lock) throw conflict(lock);
  if (!match.winner_id) throw conflict('This match has no result to clear');

  Object.assign(match, { winner_id: null, games_a: null, games_b: null, game_scores: null, completed_at: null });
  ws.changedMatches.add(match.id);

  if (match.stage === 'knockout') {
    if (match.next_match_id && match.next_slot) {
      placePlayer(ws.matches, match.next_match_id, match.next_slot, null, ws.changedMatches);
    }
  } else {
    clearManualOrder(ws, match.group_index!);
    refillGroupLines(ws, match.group_index!);
  }

  return finish(ws);
}

/**
 * Re-derive every group's knockout lines from the stored results.
 *
 * Two people entering a group's last two results at the same moment each see
 * the group as unfinished, so neither fills its knockout lines. Running this
 * after every write, on freshly read state, repairs that: the last writer sees
 * all the results.
 */
export function reconcileGroupLines(state: TournamentState): StateChanges {
  const ws = workspace(state);
  const { tournament } = state;
  if (tournament.format === 'groups' && tournament.status !== 'draft' && !knockoutStarted(state.matches)) {
    for (let g = 0; g < (tournament.group_count ?? 0); g++) {
      refillGroupLines(ws, g);
    }
  }
  return finish(ws);
}

/**
 * The organiser's order for players the tie-break rules couldn't separate.
 * Only the players in the group's current unresolved tie can be ordered.
 */
export function resolveGroupTie(state: TournamentState, groupIndex: number, orderedPlayerIds: string[]): StateChanges {
  if (state.tournament.format !== 'groups') {
    throw invalid('This tournament has no groups');
  }
  const ws = workspace(state);
  if (groupPlayers(ws.state, groupIndex).length === 0) {
    throw notFound('Group not found');
  }
  if (knockoutStarted(ws.state.matches)) {
    throw conflict('Group positions are locked because the knockout has started');
  }

  const tie = groupStandings(ws.state, groupIndex).unresolved_tie;
  if (!tie) {
    throw conflict(`There is no tie to resolve in ${groupName(groupIndex)}`);
  }

  const sameSet =
    Array.isArray(orderedPlayerIds) &&
    orderedPlayerIds.length === tie.length &&
    new Set(orderedPlayerIds).size === tie.length &&
    orderedPlayerIds.every(id => tie.includes(id));
  if (!sameSet) {
    const names = tie.map(id => ws.players.get(id)!.name).join(', ');
    throw invalid(`Order exactly the tied players: ${names}`);
  }

  orderedPlayerIds.forEach((id, i) => {
    ws.players.get(id)!.manual_group_rank = i + 1;
    ws.changedPlayers.add(id);
  });
  refillGroupLines(ws, groupIndex);

  return finish(ws);
}
