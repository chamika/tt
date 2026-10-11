// The rules for one game's score. The worker checks results with these, and the
// result form checks each game as it is typed, so both say the same thing.

export interface GameScore {
  a: number;
  b: number;
}

/** The starting scores and finishing score for a match (scratch is 0-0 to 11) */
export interface GameRules {
  start_a: number;
  start_b: number;
  play_to: number;
  warning: string | null;
}

/**
 * The winner's score in a game the loser finished on `loser`: the play-to score,
 * or two clear once the loser reached one short of it (10-all to 11 goes 12-10, 13-11…)
 */
export function winningScore(loser: number, playTo: number): number {
  return loser >= playTo - 1 ? loser + 2 : playTo;
}

/** Why a game's score isn't a finished game under these rules, or null when it is */
export function gameProblem(
  game: GameScore,
  number: number,
  rules: GameRules,
  names: { a: string; b: string }
): string | null {
  const label = `Game ${number}`;

  if (game.a < rules.start_a) {
    return `${label}: ${names.a} starts on ${rules.start_a}, so can't finish on ${game.a}`;
  }
  if (game.b < rules.start_b) {
    return `${label}: ${names.b} starts on ${rules.start_b}, so can't finish on ${game.b}`;
  }
  if (game.a === game.b) {
    return `${label} can't end level`;
  }

  // When the handicaps put a player at or past the finishing score there is no
  // sensible score to check against; the match card already warns about it
  if (rules.warning) return null;

  const { play_to } = rules;
  const winner = Math.max(game.a, game.b);
  const loser = Math.min(game.a, game.b);
  const score = `${game.a}-${game.b}`;

  if (winner < play_to) {
    return `${label}: games are played to ${play_to}, so ${score} isn't finished`;
  }
  if (winner - loser < 2) {
    return `${label}: a game must be won by 2 clear points, so ${score} isn't finished`;
  }
  if (winner !== winningScore(loser, play_to)) {
    return loser <= play_to - 2
      ? `${label}: the game ends when someone reaches ${play_to}, so ${score} isn't possible`
      : `${label}: from ${play_to - 1}-all the game ends at a 2-point lead, so ${score} isn't possible`;
  }
  return null;
}
