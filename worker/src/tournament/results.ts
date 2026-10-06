import { conflict, invalid } from './errors';
import type { GameScore, Match, MatchHandicap, MatchResult, ResultInput, Tournament } from './types';

export function gamesToWin(bestOf: number): number {
  return Math.ceil(bestOf / 2);
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function validateGame(
  game: GameScore,
  number: number,
  handicap: MatchHandicap,
  names: { a: string; b: string }
): void {
  const label = `Game ${number}`;

  if (game.a < handicap.start_a) {
    throw invalid(`${label}: ${names.a} starts on ${handicap.start_a}, so can't finish on ${game.a}`);
  }
  if (game.b < handicap.start_b) {
    throw invalid(`${label}: ${names.b} starts on ${handicap.start_b}, so can't finish on ${game.b}`);
  }
  if (game.a === game.b) {
    throw invalid(`${label} can't end level`);
  }

  // When the handicaps put a player at or past the finishing score there is no
  // sensible score to check against; the match card already warns about it
  if (handicap.warning) return;

  const { play_to } = handicap;
  const winner = Math.max(game.a, game.b);
  const loser = Math.min(game.a, game.b);
  const score = `${game.a}-${game.b}`;

  if (winner < play_to) {
    throw invalid(`${label}: games are played to ${play_to}, so ${score} isn't finished`);
  }
  if (winner - loser < 2) {
    throw invalid(`${label}: a game must be won by 2 clear points, so ${score} isn't finished`);
  }
  if (loser <= play_to - 2 && winner !== play_to) {
    throw invalid(`${label}: the game ends when someone reaches ${play_to}, so ${score} isn't possible`);
  }
  if (loser >= play_to - 1 && winner !== loser + 2) {
    throw invalid(`${label}: from ${play_to - 1}-all the game ends at a 2-point lead, so ${score} isn't possible`);
  }
}

/**
 * Check a result against the tournament's score mode and turn it into what is
 * stored. Points mode checks every game against the match's starting scores and
 * play-to score; games mode checks the games add up to a best-of finish.
 */
export function validateResult(
  tournament: Tournament,
  match: Match,
  input: ResultInput,
  handicap: MatchHandicap,
  names: { a: string; b: string }
): MatchResult {
  if (tournament.status === 'draft') {
    throw conflict('Start the tournament before entering results');
  }
  if (match.is_bye) {
    throw conflict("Byes don't have results");
  }
  const a = match.player_a_id;
  const b = match.player_b_id;
  if (!a || !b) {
    throw conflict('Both players must be known before entering a result');
  }
  if (!input || typeof input !== 'object') {
    throw invalid('Enter a result');
  }

  const bestOf = tournament.best_of;
  const needed = gamesToWin(bestOf);

  if (tournament.score_mode === 'winner') {
    if (input.winner_id !== a && input.winner_id !== b) {
      throw invalid('Choose the winner of this match');
    }
    return { winner_id: input.winner_id, games_a: null, games_b: null, game_scores: null };
  }

  if (tournament.score_mode === 'games') {
    const { games_a, games_b } = input;
    if (!isScore(games_a) || !isScore(games_b)) {
      throw invalid('Enter the number of games each player won');
    }
    if (Math.max(games_a, games_b) !== needed || Math.min(games_a, games_b) >= needed) {
      throw invalid(`Best of ${bestOf} is won by the first to ${needed} games, e.g. ${needed}-${needed - 1}`);
    }
    return { winner_id: games_a > games_b ? a : b, games_a, games_b, game_scores: null };
  }

  const games = input.game_scores;
  if (!Array.isArray(games) || games.length === 0) {
    throw invalid('Enter the score of each game');
  }

  let wonA = 0;
  let wonB = 0;
  games.forEach((game, i) => {
    if (wonA === needed || wonB === needed) {
      throw invalid(`The match was won after game ${i}, so game ${i + 1} can't be entered`);
    }
    if (!isScore(game?.a) || !isScore(game?.b)) {
      throw invalid(`Game ${i + 1}: scores must be whole numbers`);
    }
    validateGame(game, i + 1, handicap, names);
    if (game.a > game.b) wonA++;
    else wonB++;
  });

  if (wonA < needed && wonB < needed) {
    throw invalid(`Best of ${bestOf} is won by the first to ${needed} games; these scores make it ${wonA}-${wonB}`);
  }

  return {
    winner_id: wonA > wonB ? a : b,
    games_a: wonA,
    games_b: wonB,
    game_scores: games.map(game => ({ a: game.a, b: game.b }))
  };
}
