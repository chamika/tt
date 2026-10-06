import { groupPlayers, groupStandings, resultLock } from './advance';
import { groupLetter, groupName, parseGroupSource } from './groups';
import { matchHandicap } from './handicap';
import { knockoutLabel, knockoutRounds, roundName } from './knockout';
import type { GroupView, Match, MatchStatus, MatchView, TournamentState, TournamentView } from './types';

function matchStatus(match: Match): MatchStatus {
  if (match.is_bye) return 'bye';
  if (match.winner_id) return 'completed';
  return match.player_a_id && match.player_b_id ? 'ready' : 'pending';
}

/** Group matches first (by group, round, position), then the knockout by round */
function compareMatches(x: Match, y: Match): number {
  if (x.stage !== y.stage) return x.stage === 'group' ? -1 : 1;
  return (
    (x.group_index ?? 0) - (y.group_index ?? 0) ||
    x.round - y.round ||
    x.position - y.position
  );
}

/**
 * Everything the frontend shows, computed from the stored state: labels, round
 * names, where undecided players come from, handicap starts, standings and locks.
 */
export function buildView(state: TournamentState): TournamentView {
  const { tournament } = state;
  const totalRounds = knockoutRounds(state.matches);
  const matchesById = new Map(state.matches.map(m => [m.id, m]));
  const playersById = new Map(state.players.map(p => [p.id, p]));

  const sourceLabel = (source: string | null): string | null => {
    if (!source) return null;
    const group = parseGroupSource(source);
    if (group) return `${groupLetter(group.groupIndex)}${group.position}`;
    const feeder = matchesById.get(source.replace(/^winner:/, ''));
    return feeder ? `Winner ${knockoutLabel(feeder, totalRounds)}` : null;
  };

  const groups: GroupView[] = [];
  if (tournament.format === 'groups') {
    for (let g = 0; g < (tournament.group_count ?? 0); g++) {
      groups.push({
        index: g,
        name: groupName(g),
        player_ids: groupPlayers(state, g).map(p => p.id),
        standings: groupStandings(state, g)
      });
    }
  }

  const matches: MatchView[] = [...state.matches].sort(compareMatches).map(match => {
    const a = match.player_a_id ? playersById.get(match.player_a_id) : undefined;
    const b = match.player_b_id ? playersById.get(match.player_b_id) : undefined;
    const lockReason = resultLock(state, match);

    return {
      ...match,
      label: match.stage === 'knockout' ? knockoutLabel(match, totalRounds) : groupName(match.group_index!),
      round_name: match.stage === 'knockout' ? roundName(match.round, totalRounds).name : `Round ${match.round}`,
      source_a_label: sourceLabel(match.source_a),
      source_b_label: sourceLabel(match.source_b),
      handicap: a && b ? matchHandicap(tournament.seeding_mode, a.handicap, b.handicap) : null,
      status: matchStatus(match),
      locked: lockReason !== null,
      lock_reason: lockReason
    };
  });

  const final = state.matches.find(m => m.stage === 'knockout' && m.next_match_id === null);

  return {
    tournament,
    players: [...state.players].sort((x, y) => x.seed - y.seed),
    groups,
    rounds: Array.from({ length: totalRounds }, (_, i) => roundName(i + 1, totalRounds)),
    matches,
    champion_id: final?.winner_id ?? null
  };
}
