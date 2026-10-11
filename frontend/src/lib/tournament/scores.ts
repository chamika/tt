import type { GameScore, Match, MatchHandicap, ScoreMode } from '$lib/types/tournament';
import { gameProblem, winningScore, type GameRules } from '../../../../shared/tournament/gameRules';

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

/** A game row in the result form; a box someone has cleared is null */
export interface GameEntry {
  a: number | null;
  b: number | null;
}

/** Scratch rules, for matches without a handicap */
export function rulesFor(match: Match): GameRules {
  return match.handicap ?? { start_a: 0, start_b: 0, play_to: 11, warning: null };
}

/**
 * The other box after one player's score is typed. A score short of play-to can
 * only be the loser's, so the winner's score follows from it. Anything else could
 * be either player's, so the other box goes back to its start to be filled in.
 */
export function otherSideAfterTyping(typed: number | null, otherStart: number, playTo: number): number {
  if (typed === null || !Number.isInteger(typed) || typed < 0 || typed >= playTo) return otherStart;
  return winningScore(typed, playTo);
}

export interface GamesCheck {
  /** What is wrong with each game, null when it is a finished game */
  problems: (string | null)[];
  won: { a: number; b: number };
  /** Index of the game that won the match, null while it's still open */
  decidedAt: number | null;
}

/** Each game against the rules, and the match as far as the finished games go */
export function checkGames(
  games: GameEntry[],
  bestOf: number,
  rules: GameRules,
  names: { a: string; b: string }
): GamesCheck {
  const needed = gamesToWin(bestOf);
  const won = { a: 0, b: 0 };
  let decidedAt: number | null = null;

  const problems = games.map((game, i) => {
    if (decidedAt !== null) return `The match was won after game ${decidedAt + 1}, so this game can't be entered`;
    if (game.a === null || game.b === null) return `Game ${i + 1}: enter both scores`;
    const problem = gameProblem({ a: game.a, b: game.b }, i + 1, rules, names);
    if (problem) return problem;
    won[game.a > game.b ? 'a' : 'b']++;
    if (won.a === needed || won.b === needed) decidedAt = i;
    return null;
  });

  return { problems, won, decidedAt };
}

/**
 * How many game rows the form wants after a change. Once every row is a finished
 * game but nobody has won yet, the next game is added. Blank rows go after the game
 * that won the match, and after an unfinished one, so a row added while a score was
 * half typed (the "2" of "22") doesn't stay; the rows the form opened with are kept
 */
export function rowsWanted(check: GamesCheck, bestOf: number, isBlank: (index: number) => boolean): number {
  let count = check.problems.length;
  const open = check.problems.findIndex((p) => p !== null);
  if (check.decidedAt === null && open === -1) return Math.min(count + 1, bestOf);

  const keep = check.decidedAt !== null ? check.decidedAt + 1 : Math.max(open + 1, gamesToWin(bestOf));
  while (count > keep && isBlank(count - 1)) count--;
  return count;
}
