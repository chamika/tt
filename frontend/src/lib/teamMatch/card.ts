import type { Rubber, RubberSideView, TeamMatchView } from '$lib/types/teamMatch';

/** The doubles pairs a side can field from its three players, e.g. AB, AC, BC */
export function pairOptions(labels: readonly string[]): string[] {
  const pairs: string[] = [];
  labels.forEach((first, i) => labels.slice(i + 1).forEach((second) => pairs.push(`${first}${second}`)));
  return pairs;
}

/** A rubber's games as written on the card, e.g. "11-7, 9-11, 11-5" (home first) */
export function formatGames(rubber: Rubber): string {
  return rubber.game_scores.map((g) => `${g.a}-${g.b}`).join(', ');
}

/** Who plays a side of a rubber: "Ann", "Ann & Cat", or the team for a doubles not yet entered */
export function sideText(side: RubberSideView, team: string): string {
  return side.names.length > 0 ? side.names.join(' & ') : team;
}

/** The headline once all 10 rubbers are in: "Hornets win 6–4" or "Draw 5–5" */
export function outcomeText(view: TeamMatchView): string | null {
  const { home, away } = view.score;
  switch (view.outcome) {
    case 'home':
      return `${view.match.home_team} win ${home}–${away}`;
    case 'away':
      return `${view.match.away_team} win ${away}–${home}`;
    case 'draw':
      return `Draw ${home}–${away}`;
    default:
      return null;
  }
}

export function statusText(view: TeamMatchView): string {
  if (view.status === 'completed') return 'Completed';
  if (view.status === 'not_started') return 'Not started';
  return `${view.played} of ${view.rubbers.length} played`;
}
