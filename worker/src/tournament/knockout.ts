import type { Match, RoundView, Slot } from './types';

/** Smallest power of two that fits the entrants (at least 2, a final) */
export function bracketSize(entrants: number): number {
  let size = 2;
  while (size < entrants) size *= 2;
  return size;
}

/**
 * Standard seed placement: the seed number at each bracket line, top to bottom.
 * For 8 that is [1, 8, 4, 5, 2, 7, 3, 6], so first-round matches are 1v8, 4v5,
 * 2v7, 3v6, and seeds 1 and 2 can only meet in the final.
 */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next = order.length * 2;
    order = order.flatMap(seed => [seed, next + 1 - seed]);
  }
  return order;
}

/** The round in which bracket lines x and y would meet (1 = first round) */
export function meetingRound(lineX: number, lineY: number): number {
  return 32 - Math.clz32(lineX ^ lineY);
}

export function roundName(round: number, totalRounds: number): RoundView {
  const remaining = totalRounds - round + 1;
  if (remaining === 1) return { round, name: 'Final', short_name: 'F' };
  if (remaining === 2) return { round, name: 'Semi-final', short_name: 'SF' };
  if (remaining === 3) return { round, name: 'Quarter-final', short_name: 'QF' };
  const players = 2 ** remaining;
  return { round, name: `Round of ${players}`, short_name: `R${players}` };
}

export function knockoutRounds(matches: Match[]): number {
  return matches.reduce((max, m) => (m.stage === 'knockout' ? Math.max(max, m.round) : max), 0);
}

/** e.g. 'Final', 'SF2', 'QF1', 'R16-3' */
export function knockoutLabel(match: Match, totalRounds: number): string {
  const { short_name } = roundName(match.round, totalRounds);
  if (short_name === 'F') return 'Final';
  const separator = short_name.startsWith('R') ? '-' : '';
  return `${short_name}${separator}${match.position + 1}`;
}

/** A bracket line: a known player, a placeholder fed from somewhere else, or null for a bye */
export interface KnockoutEntrant {
  player_id: string | null;
  source: string | null;
}

export function emptyMatch(fields: Pick<Match, 'id' | 'stage' | 'group_index' | 'round' | 'position'>): Match {
  return {
    ...fields,
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
    completed_at: null
  };
}

/**
 * Put a player (or nobody) into a match slot. A bye passes its one player
 * straight through, so the change carries on into the next round.
 *
 * Mutates the matches in `byId`; ids of every touched match are added to `changed`.
 */
export function placePlayer(
  byId: Map<string, Match>,
  matchId: string,
  slot: Slot,
  playerId: string | null,
  changed: Set<string>
): void {
  const match = byId.get(matchId);
  if (!match) throw new Error(`Unknown match ${matchId}`);

  if (slot === 'a') match.player_a_id = playerId;
  else match.player_b_id = playerId;
  changed.add(match.id);

  if (match.is_bye) {
    match.winner_id = playerId;
    if (match.next_match_id && match.next_slot) {
      placePlayer(byId, match.next_match_id, match.next_slot, playerId, changed);
    }
  }
}

/**
 * Build a single-elimination bracket from its first-round lines (length must be
 * a power of two). Later rounds are linked to the matches that feed them, and
 * known players are placed, with byes advancing them automatically.
 */
export function buildKnockout(entrants: (KnockoutEntrant | null)[], newId: () => string): Match[] {
  const size = entrants.length;
  if (size < 2 || (size & (size - 1)) !== 0) {
    throw new Error(`Bracket size must be a power of two, got ${size}`);
  }

  const rounds: Match[][] = [];
  for (let round = 1, count = size / 2; count >= 1; round++, count /= 2) {
    rounds.push(
      Array.from({ length: count }, (_, position) =>
        emptyMatch({ id: newId(), stage: 'knockout', group_index: null, round, position })
      )
    );
  }

  // Link each match to the one its winner goes to
  for (let r = 0; r < rounds.length - 1; r++) {
    rounds[r].forEach((match, position) => {
      const next = rounds[r + 1][Math.floor(position / 2)];
      const slot: Slot = position % 2 === 0 ? 'a' : 'b';
      match.next_match_id = next.id;
      match.next_slot = slot;
      if (slot === 'a') next.source_a = `winner:${match.id}`;
      else next.source_b = `winner:${match.id}`;
    });
  }

  const firstRound = rounds[0];
  firstRound.forEach((match, position) => {
    const a = entrants[position * 2];
    const b = entrants[position * 2 + 1];
    if (!a && !b) throw new Error('A first-round match cannot have two byes');
    match.source_a = a?.source ?? null;
    match.source_b = b?.source ?? null;
    match.is_bye = !a || !b;
  });

  const byId = new Map(rounds.flat().map(m => [m.id, m]));
  const changed = new Set<string>();
  firstRound.forEach((match, position) => {
    const a = entrants[position * 2];
    const b = entrants[position * 2 + 1];
    if (a?.player_id) placePlayer(byId, match.id, 'a', a.player_id, changed);
    if (b?.player_id) placePlayer(byId, match.id, 'b', b.player_id, changed);
  });

  return rounds.flat();
}
