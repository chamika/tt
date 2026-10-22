import { AWAY_LABELS, HOME_LABELS, RUBBER_COUNT, RUBBER_ORDER } from './rubbers';
import type { Rubber, RubberSideView, RubberView, TeamMatch, TeamMatchPlayerView, TeamMatchView } from './types';

function side(labels: string[], allLabels: string[], names: string[]): RubberSideView {
  return { labels, names: labels.map(label => names[allLabels.indexOf(label)]) };
}

/**
 * Everything the card shows, computed from the stored rubbers: who plays each
 * rubber, the running score down the card, players' singles wins and the result.
 * Rubbers can be entered in any order, so the running score after a row counts
 * whichever rubbers up to it have results.
 */
export function buildTeamMatchView(match: TeamMatch, stored: Rubber[]): TeamMatchView {
  const byNumber = new Map(stored.map(r => [r.number, r]));
  const won = new Map<string, number>([...HOME_LABELS, ...AWAY_LABELS].map(label => [label, 0]));
  const score = { home: 0, away: 0 };

  const rubbers: RubberView[] = RUBBER_ORDER.map(slot => {
    const result = byNumber.get(slot.number) ?? null;
    const is_doubles = slot.home === null;

    const homeLabels = is_doubles ? (result?.home_pair?.split('') ?? []) : [slot.home!];
    const awayLabels = is_doubles ? (result?.away_pair?.split('') ?? []) : [slot.away!];

    if (result) {
      score[result.winner]++;
      if (!is_doubles) {
        const winner = result.winner === 'home' ? slot.home! : slot.away!;
        won.set(winner, won.get(winner)! + 1);
      }
    }

    return {
      number: slot.number,
      is_doubles,
      home: side(homeLabels, HOME_LABELS, match.home_players),
      away: side(awayLabels, AWAY_LABELS, match.away_players),
      result,
      running: result ? { ...score } : null
    };
  });

  const players = (labels: string[], names: string[]): TeamMatchPlayerView[] =>
    labels.map((label, i) => ({ label: label as TeamMatchPlayerView['label'], name: names[i], won: won.get(label)! }));

  const played = byNumber.size;
  const complete = played === RUBBER_COUNT;

  return {
    match,
    home_players: players(HOME_LABELS, match.home_players),
    away_players: players(AWAY_LABELS, match.away_players),
    rubbers,
    score,
    played,
    status: complete ? 'completed' : played === 0 ? 'not_started' : 'in_progress',
    outcome: !complete ? null : score.home === score.away ? 'draw' : score.home > score.away ? 'home' : 'away'
  };
}
