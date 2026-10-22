import { gameProblem, type GameRules } from '../../../shared/tournament/gameRules';
import { invalid, notFound } from '../tournament/errors';
import type { AwayLabel, HomeLabel, Rubber, RubberInput, Side, TeamMatchDetails } from './types';

export const HOME_LABELS: HomeLabel[] = ['A', 'B', 'C'];
export const AWAY_LABELS: AwayLabel[] = ['X', 'Y', 'Z'];
export const PLAYERS_PER_TEAM = 3;
export const RUBBER_COUNT = 10;
export const BEST_OF = 5;
export const MAX_TITLE_LENGTH = 100;
export const MAX_NAME_LENGTH = 60;

/** Every rubber is played off scratch */
const SCRATCH: GameRules = { start_a: 0, start_b: 0, play_to: 11, warning: null };

export interface RubberSlot {
  number: number;
  home: HomeLabel | null; // null for the doubles
  away: AwayLabel | null;
}

/** The order printed on the ELTTL match card; rubber 7 is the doubles */
export const RUBBER_ORDER: RubberSlot[] = (
  [
    ['A', 'X'],
    ['B', 'Y'],
    ['C', 'Z'],
    ['B', 'X'],
    ['A', 'Z'],
    ['C', 'Y'],
    [null, null],
    ['B', 'Z'],
    ['C', 'X'],
    ['A', 'Y']
  ] as const
).map(([home, away], i) => ({ number: i + 1, home, away }));

export function isDoubles(number: number): boolean {
  return RUBBER_ORDER[number - 1]?.home === null;
}

function gamesToWin(bestOf: number): number {
  return Math.ceil(bestOf / 2);
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function cleanName(value: unknown, label: string, max: number): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) throw invalid(`Enter the ${label}`);
  if (name.length > max) throw invalid(`The ${label} can be up to ${max} characters`);
  return name;
}

function cleanTeam(players: unknown, labels: string[], team: string): string[] {
  if (!Array.isArray(players) || players.length !== PLAYERS_PER_TEAM) {
    throw invalid(`${team} needs exactly ${PLAYERS_PER_TEAM} players`);
  }
  const names = players.map((p, i) => cleanName(p, `name of player ${labels[i]}`, MAX_NAME_LENGTH));
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) throw invalid(`${name} is in ${team} twice`);
    seen.add(key);
  }
  return names;
}

function cleanDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
  // Out-of-range days roll over (2026-02-30 is 2 March), so check it comes back the same
  if (!date || Number.isNaN(date.getTime()) || !date.toISOString().startsWith(value as string)) {
    throw invalid('The date must be a real date, e.g. 2026-10-22');
  }
  return value as string;
}

/** Check the teams, players, title and date, and tidy them for storing */
export function validateDetails(input: Partial<TeamMatchDetails>): TeamMatchDetails {
  if (!input || typeof input !== 'object') {
    throw invalid('Match details are missing');
  }

  const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim() : null;
  if (title && title.length > MAX_TITLE_LENGTH) {
    throw invalid(`The title can be up to ${MAX_TITLE_LENGTH} characters`);
  }

  const home_team = cleanName(input.home_team, 'home team name', MAX_NAME_LENGTH);
  const away_team = cleanName(input.away_team, 'away team name', MAX_NAME_LENGTH);

  return {
    title,
    match_date: cleanDate(input.match_date),
    home_team,
    away_team,
    home_players: cleanTeam(input.home_players, HOME_LABELS, home_team),
    away_players: cleanTeam(input.away_players, AWAY_LABELS, away_team)
  };
}

/** The rubber's place on the card, or 404 for a number that isn't on it */
export function rubberSlot(number: number): RubberSlot {
  const slot = Number.isInteger(number) ? RUBBER_ORDER[number - 1] : undefined;
  if (!slot) throw notFound(`There is no rubber ${number}; rubbers are numbered 1 to ${RUBBER_COUNT}`);
  return slot;
}

/** A doubles pair as stored, e.g. 'AB', or why it isn't one */
function cleanPair(value: unknown, labels: string[], team: string): string {
  const letters = typeof value === 'string' ? value.toUpperCase().split('') : [];
  const valid = letters.length === 2 && letters[0] !== letters[1] && letters.every(l => labels.includes(l));
  if (!valid) throw invalid(`Choose the two ${team} players in the doubles`);
  return letters.sort().join('');
}

/** Who is playing a side of a rubber, as the result form names them */
export function sideNames(details: TeamMatchDetails, slot: RubberSlot): { a: string; b: string } {
  if (slot.home === null || slot.away === null) {
    return { a: details.home_team, b: details.away_team };
  }
  return {
    a: details.home_players[HOME_LABELS.indexOf(slot.home)],
    b: details.away_players[AWAY_LABELS.indexOf(slot.away)]
  };
}

/**
 * Check a rubber's game scores (best of 5, off scratch to 11) and, for the
 * doubles, which two players played for each side. Returns what is stored.
 */
export function validateRubber(details: TeamMatchDetails, number: number, input: RubberInput): Rubber {
  const slot = rubberSlot(number);
  if (!input || typeof input !== 'object') {
    throw invalid('Enter the score of each game');
  }

  let home_pair: string | null = null;
  let away_pair: string | null = null;
  if (slot.home === null) {
    home_pair = cleanPair(input.home_pair, HOME_LABELS, details.home_team);
    away_pair = cleanPair(input.away_pair, AWAY_LABELS, details.away_team);
  } else if (input.home_pair || input.away_pair) {
    throw invalid(`Rubber ${number} is a singles, so it has no doubles pairs`);
  }

  const games = input.game_scores;
  if (!Array.isArray(games) || games.length === 0) {
    throw invalid('Enter the score of each game');
  }

  const names = sideNames(details, slot);
  const needed = gamesToWin(BEST_OF);
  const won: Record<Side, number> = { home: 0, away: 0 };

  games.forEach((game, i) => {
    if (won.home === needed || won.away === needed) {
      throw invalid(`The rubber was won after game ${i}, so game ${i + 1} can't be entered`);
    }
    if (!isScore(game?.a) || !isScore(game?.b)) {
      throw invalid(`Game ${i + 1}: scores must be whole numbers`);
    }
    const problem = gameProblem(game, i + 1, SCRATCH, names);
    if (problem) throw invalid(problem);
    won[game.a > game.b ? 'home' : 'away']++;
  });

  if (won.home < needed && won.away < needed) {
    throw invalid(
      `A rubber is best of ${BEST_OF}, won by the first to ${needed} games; these scores make it ${won.home}-${won.away}`
    );
  }

  return {
    number,
    game_scores: games.map(game => ({ a: game.a, b: game.b })),
    home_games: won.home,
    away_games: won.away,
    winner: won.home > won.away ? 'home' : 'away',
    home_pair,
    away_pair
  };
}
