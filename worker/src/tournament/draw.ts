import { invalid } from './errors';
import { distributeToGroups, qualifierLines, roundRobin, validateGroupConfig } from './groups';
import { bracketSize, buildKnockout, emptyMatch, seedOrder, type KnockoutEntrant } from './knockout';
import type { Rng } from './random';
import { seedPlayers } from './seeding';
import {
  BEST_OF_OPTIONS,
  FORMATS,
  SCORE_MODES,
  SEEDING_MODES,
  type Match,
  type Player,
  type PlayerInput,
  type TournamentSettings
} from './types';

export const MAX_TOURNAMENT_NAME_LENGTH = 100;

function oneOf<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (!options.includes(value as T)) {
    throw invalid(`${label} must be one of: ${options.join(', ')}`);
  }
  return value as T;
}

/** Check the organiser's settings, without the group sizes (those depend on the players) */
export function validateSettings(input: Partial<TournamentSettings>): TournamentSettings {
  if (!input || typeof input !== 'object') {
    throw invalid('Tournament settings are missing');
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) {
    throw invalid('Give the tournament a name');
  }
  if (name.length > MAX_TOURNAMENT_NAME_LENGTH) {
    throw invalid(`Tournament names can be up to ${MAX_TOURNAMENT_NAME_LENGTH} characters`);
  }

  const format = oneOf(input.format, FORMATS, 'format');
  const seeding_mode = oneOf(input.seeding_mode, SEEDING_MODES, 'seeding_mode');
  const score_mode = oneOf(input.score_mode, SCORE_MODES, 'score_mode');

  if (!BEST_OF_OPTIONS.includes(input.best_of as number)) {
    throw invalid(`Best of must be one of: ${BEST_OF_OPTIONS.join(', ')}`);
  }

  return {
    name,
    format,
    seeding_mode,
    score_mode,
    best_of: input.best_of as number,
    group_count: format === 'groups' ? (input.group_count ?? null) : null,
    advance_per_group: format === 'groups' ? (input.advance_per_group ?? null) : null
  };
}

/**
 * Seed the players and lay out every match of the tournament.
 *
 * Knockout: players go straight into the bracket by seed, with byes for the top seeds.
 * Groups: players are spread over the groups in snake order, every group plays a
 * round robin, and the knockout is laid out with placeholders for the qualifiers.
 */
export function createDraw(
  settingsInput: Partial<TournamentSettings>,
  playerInputs: PlayerInput[],
  rng: Rng,
  newId: () => string
): { settings: TournamentSettings; players: Player[]; matches: Match[] } {
  const settings = validateSettings(settingsInput);
  const seeded = seedPlayers(playerInputs, settings.seeding_mode, rng);

  const players: Player[] = seeded.map(p => ({
    id: newId(),
    name: p.name,
    ranking: p.ranking,
    handicap: p.handicap,
    seed: p.seed,
    group_index: null,
    manual_group_rank: null
  }));

  if (settings.format === 'knockout') {
    const size = bracketSize(players.length);
    const entrants: (KnockoutEntrant | null)[] = seedOrder(size).map(seed =>
      seed <= players.length ? { player_id: players[seed - 1].id, source: null } : null
    );
    return { settings, players, matches: buildKnockout(entrants, newId) };
  }

  validateGroupConfig(players.length, settings.group_count, settings.advance_per_group);
  const groupCount = settings.group_count!;
  const advance = settings.advance_per_group!;

  distributeToGroups(players.length, groupCount).forEach((group, i) => {
    players[i].group_index = group;
  });

  const groupMatches: Match[] = [];
  for (let g = 0; g < groupCount; g++) {
    const members = players.filter(p => p.group_index === g).map(p => p.id);
    for (const pairing of roundRobin(members)) {
      groupMatches.push({
        ...emptyMatch({
          id: newId(),
          stage: 'group',
          group_index: g,
          round: pairing.round,
          position: pairing.position
        }),
        player_a_id: pairing.a,
        player_b_id: pairing.b
      });
    }
  }

  const entrants = qualifierLines(groupCount, advance).map(source =>
    source ? { player_id: null, source } : null
  );

  return { settings, players, matches: [...groupMatches, ...buildKnockout(entrants, newId)] };
}
