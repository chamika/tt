import { invalid } from './errors';
import { shuffle, type Rng } from './random';
import { MAX_PLAYERS, MIN_PLAYERS, type PlayerInput, type SeedingMode } from './types';

export const MAX_NAME_LENGTH = 60;

export interface SeededPlayer {
  name: string;
  ranking: number | null;
  handicap: number | null;
  seed: number;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Validate the typed-in players and keep only the value the seeding mode uses
 * (ranking or handicap), so an unused column never leaks into the draw.
 */
export function normalisePlayers(
  players: PlayerInput[],
  mode: SeedingMode
): Omit<SeededPlayer, 'seed'>[] {
  if (!Array.isArray(players)) {
    throw invalid('players must be a list');
  }
  if (players.length < MIN_PLAYERS) {
    throw invalid(`A tournament needs at least ${MIN_PLAYERS} players`);
  }
  if (players.length > MAX_PLAYERS) {
    throw invalid(`A tournament can have at most ${MAX_PLAYERS} players`);
  }

  const seen = new Set<string>();

  return players.map((player, index) => {
    const name = typeof player?.name === 'string' ? player.name.trim() : '';
    if (!name) {
      throw invalid(`Player ${index + 1} needs a name`);
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw invalid(`${name.slice(0, 20)}… is too long; names can be up to ${MAX_NAME_LENGTH} characters`);
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      throw invalid(`Two players are called ${name}; names must be unique`);
    }
    seen.add(key);

    if (mode === 'ranking') {
      if (isBlank(player.ranking)) {
        return { name, ranking: null, handicap: null };
      }
      const ranking = player.ranking;
      if (typeof ranking !== 'number' || !Number.isInteger(ranking) || ranking < 1) {
        throw invalid(`Ranking for ${name} must be a whole number of 1 or more`);
      }
      return { name, ranking, handicap: null };
    }

    if (isBlank(player.handicap)) {
      throw invalid(`${name} needs a handicap`);
    }
    const handicap = player.handicap;
    if (typeof handicap !== 'number' || !Number.isInteger(handicap)) {
      throw invalid(`Handicap for ${name} must be a whole number`);
    }
    return { name, ranking: null, handicap };
  });
}

/**
 * Order players into seeds.
 *
 * - ranking: ascending (1 = best). Equal rankings are drawn at random among
 *   themselves, and unranked players are drawn at random below the ranked ones.
 * - handicap: ascending, so the most negative (strongest) handicap is seed 1.
 *   Equal handicaps are drawn at random among themselves.
 */
export function seedPlayers(players: PlayerInput[], mode: SeedingMode, rng: Rng): SeededPlayer[] {
  const normalised = normalisePlayers(players, mode);
  const value = (player: Omit<SeededPlayer, 'seed'>) =>
    mode === 'ranking' ? player.ranking : player.handicap;

  // Shuffle first, then stable-sort: ties keep their random order
  return shuffle(normalised, rng)
    .sort((x, y) => {
      const vx = value(x);
      const vy = value(y);
      if (vx === vy) return 0;
      if (vx === null) return 1;
      if (vy === null) return -1;
      return vx - vy;
    })
    .map((player, index) => ({ ...player, seed: index + 1 }));
}
