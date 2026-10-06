import type { GameScore, Match, MatchHandicap, ScoreMode } from '$lib/types/tournament';

export function gamesToWin(bestOf: number): number {
  return Math.ceil(bestOf / 2);
}

/** e.g. "Start 0–5 · play to 16"; scratch matches just say what they're played to */
export function describeHandicap(handicap: MatchHandicap): string {
  if (handicap.start_a === 0 && handicap.start_b === 0) return `Play to ${handicap.play_to}`;
  return `Start ${handicap.start_a}–${handicap.start_b} · play to ${handicap.play_to}`;
}

/** The score as shown on a match card: every game in points mode, otherwise games won */
export function formatScore(match: Match, mode: ScoreMode): string {
  if (mode === 'points' && match.game_scores) {
    return match.game_scores.map(g => `${g.a}-${g.b}`).join(', ');
  }
  if (match.games_a !== null && match.games_b !== null) {
    return `${match.games_a}-${match.games_b}`;
  }
  return '';
}

/**
 * Game rows to start the result form with: the stored scores when correcting a
 * result, otherwise the fewest games that can finish the match, each starting
 * from the handicap scores.
 */
export function initialGames(match: Match, bestOf: number): GameScore[] {
  if (match.game_scores && match.game_scores.length > 0) {
    return match.game_scores.map(g => ({ ...g }));
  }
  const start = { a: match.handicap?.start_a ?? 0, b: match.handicap?.start_b ?? 0 };
  return Array.from({ length: gamesToWin(bestOf) }, () => ({ ...start }));
}

/**
 * Games won by each side so far. A game only counts once someone has reached the
 * play-to score, so rows still on their starting scores don't look decided.
 */
export function gamesWon(games: GameScore[], playTo: number): { a: number; b: number } {
  return games.reduce(
    (won, game) => {
      if (Math.max(game.a, game.b) < playTo) return won;
      return {
        a: won.a + (game.a > game.b ? 1 : 0),
        b: won.b + (game.b > game.a ? 1 : 0)
      };
    },
    { a: 0, b: 0 }
  );
}
