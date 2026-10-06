import type { Match, Round, TournamentFormat, TournamentView } from '$lib/types/tournament';

export interface BracketColumn {
  round: Round;
  matches: Match[];
}

/** Knockout matches as columns, one per round, in bracket order top to bottom */
export function bracketColumns(view: TournamentView): BracketColumn[] {
  return view.rounds.map(round => ({
    round,
    matches: view.matches
      .filter(m => m.stage === 'knockout' && m.round === round.round)
      .sort((x, y) => x.position - y.position)
  }));
}

/** Smallest power of two that fits the entrants (at least 2, a final) */
export function bracketSize(entrants: number): number {
  let size = 2;
  while (size < entrants) size *= 2;
  return size;
}

function firstRoundName(size: number): string {
  if (size === 2) return 'a final';
  if (size === 4) return 'semi-finals';
  if (size === 8) return 'quarter-finals';
  return `a round of ${size}`;
}

/**
 * One-line summary of the knockout the settings will produce, for the setup form,
 * e.g. "8 qualifiers → quarter-finals" or "6 players → quarter-finals, with 2 byes".
 * Null when the numbers don't make a tournament yet.
 */
export function knockoutSummary(
  format: TournamentFormat,
  playerCount: number,
  groupCount: number | null,
  advancePerGroup: number | null
): string | null {
  const entrants = format === 'groups' ? (groupCount ?? 0) * (advancePerGroup ?? 0) : playerCount;
  if (entrants < 2 || (format === 'knockout' && playerCount < 2)) return null;

  const size = bracketSize(entrants);
  const byes = size - entrants;
  const noun = format === 'groups' ? 'qualifiers' : 'players';
  return `${entrants} ${noun} → ${firstRoundName(size)}${byes > 0 ? `, with ${byes} bye${byes === 1 ? '' : 's'}` : ''}`;
}

/** Group sizes for the setup form; groups differ by at most one player */
export function groupSizes(playerCount: number, groupCount: number): number[] {
  return Array.from(
    { length: groupCount },
    (_, g) => Math.floor(playerCount / groupCount) + (g < playerCount % groupCount ? 1 : 0)
  ).sort((x, y) => y - x);
}

export interface MatchLists {
  ready: Match[];
  pending: Match[];
  completed: Match[];
}

/**
 * Matches for the Matches tab: what can be played now, what is waiting for a
 * player, and what is done (most recent first). Byes aren't listed.
 */
export function matchLists(view: TournamentView): MatchLists {
  const playable = view.matches.filter(m => m.status !== 'bye');
  return {
    ready: playable.filter(m => m.status === 'ready'),
    pending: playable.filter(m => m.status === 'pending'),
    completed: playable
      .filter(m => m.status === 'completed')
      .sort((x, y) => (y.completed_at ?? 0) - (x.completed_at ?? 0))
  };
}
