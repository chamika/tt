import type { GroupStandings, Match, Player, ScoreMode, StandingRow } from './types';

type Tally = Omit<StandingRow, 'player_id' | 'position' | 'tied'>;

function tally(playerId: string, matches: Match[]): Tally {
  const t: Tally = {
    played: 0,
    won: 0,
    lost: 0,
    match_points: 0,
    games_won: 0,
    games_lost: 0,
    points_won: 0,
    points_lost: 0
  };

  for (const match of matches) {
    if (!match.winner_id) continue;
    const side = match.player_a_id === playerId ? 'a' : match.player_b_id === playerId ? 'b' : null;
    if (!side) continue;

    t.played++;
    if (match.winner_id === playerId) {
      t.won++;
      t.match_points += 2;
    } else {
      t.lost++;
      t.match_points += 1;
    }

    const own = side === 'a' ? match.games_a : match.games_b;
    const other = side === 'a' ? match.games_b : match.games_a;
    t.games_won += own ?? 0;
    t.games_lost += other ?? 0;

    for (const game of match.game_scores ?? []) {
      t.points_won += side === 'a' ? game.a : game.b;
      t.points_lost += side === 'a' ? game.b : game.a;
    }
  }

  return t;
}

function ratio(won: number, lost: number): number {
  if (lost === 0) return won === 0 ? 0 : Infinity;
  return won / lost;
}

/** Tie-break criteria in ITTF order, limited to what the score mode records */
function criteria(mode: ScoreMode): ((t: Tally) => number)[] {
  const list = [(t: Tally) => t.match_points];
  if (mode !== 'winner') list.push(t => ratio(t.games_won, t.games_lost));
  if (mode === 'points') list.push(t => ratio(t.points_won, t.points_lost));
  return list;
}

/**
 * Separate tied players using only the matches between them (ITTF 3.7.5).
 * As soon as a criterion splits the group, each smaller group is resolved
 * again from the first criterion, counting only matches among its own members.
 * Returns ordered buckets; a bucket with more than one player is still tied.
 */
function breakTie(ids: string[], matches: Match[], mode: ScoreMode): string[][] {
  if (ids.length <= 1) return [ids];

  const members = new Set(ids);
  const between = matches.filter(
    m => m.winner_id && members.has(m.player_a_id ?? '') && members.has(m.player_b_id ?? '')
  );

  for (const criterion of criteria(mode)) {
    const values = new Map(ids.map(id => [id, criterion(tally(id, between))]));
    const distinct = [...new Set(values.values())].sort((x, y) => (x === y ? 0 : x > y ? -1 : 1));
    if (distinct.length > 1) {
      return distinct.flatMap(value =>
        breakTie(ids.filter(id => values.get(id) === value), matches, mode)
      );
    }
  }

  return [ids];
}

/**
 * Group table with positions.
 *
 * Players are ordered by match points (win 2, loss 1), with ties broken as in
 * `breakTie`. While the group is still being played, any remaining ties are
 * shown in seed order. Once it is complete, a remaining tie is flagged, and if
 * it affects who qualifies or where they are placed it must be ordered manually
 * (`manual_group_rank`) before the qualifiers go through.
 *
 * @param players The group's players in seed order
 * @param matches The group's matches
 * @param advancePerGroup How many players qualify from the group
 */
export function computeStandings(
  players: Player[],
  matches: Match[],
  mode: ScoreMode,
  advancePerGroup: number
): GroupStandings {
  const complete = matches.length > 0 && matches.every(m => m.winner_id);
  const ids = players.map(p => p.id);
  const byId = new Map(players.map(p => [p.id, p]));
  const overall = new Map(ids.map(id => [id, tally(id, matches)]));

  // Bucket by overall match points, then break ties within each bucket
  const points = [...new Set(ids.map(id => overall.get(id)!.match_points))].sort((x, y) => y - x);
  const buckets = points.flatMap(value =>
    breakTie(ids.filter(id => overall.get(id)!.match_points === value), matches, mode)
  );

  const rows: StandingRow[] = [];
  let unresolved: string[] | null = null;

  for (const bucket of buckets) {
    const position = rows.length + 1;

    if (bucket.length === 1) {
      rows.push({ player_id: bucket[0], position, ...overall.get(bucket[0])!, tied: false });
      continue;
    }

    const manuallyOrdered = bucket.every(id => byId.get(id)!.manual_group_rank !== null);
    if (manuallyOrdered || !complete) {
      // Input order is seed order, so an unordered tie mid-group stays in seed order
      const ordered = manuallyOrdered
        ? [...bucket].sort((x, y) => byId.get(x)!.manual_group_rank! - byId.get(y)!.manual_group_rank!)
        : bucket;
      ordered.forEach((id, i) => {
        rows.push({ player_id: id, position: position + i, ...overall.get(id)!, tied: false });
      });
      continue;
    }

    for (const id of bucket) {
      rows.push({ player_id: id, position, ...overall.get(id)!, tied: true });
    }
    if (!unresolved && position <= advancePerGroup) {
      unresolved = bucket;
    }
  }

  return { rows, complete, unresolved_tie: unresolved };
}

/** Players who go through from a group, in finishing order, once that is settled */
export function groupQualifiers(standings: GroupStandings, advancePerGroup: number): string[] | null {
  if (!standings.complete || standings.unresolved_tie) return null;
  return standings.rows.slice(0, advancePerGroup).map(row => row.player_id);
}
