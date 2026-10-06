import { invalid } from './errors';
import { bracketSize, meetingRound, seedOrder } from './knockout';
import { MAX_GROUPS } from './types';

export function groupLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function groupName(index: number): string {
  return `Group ${groupLetter(index)}`;
}

/** Source of a knockout line fed by a group finishing position (1-based) */
export function groupSource(groupIndex: number, position: number): string {
  return `group:${groupIndex}:${position}`;
}

export function parseGroupSource(source: string | null): { groupIndex: number; position: number } | null {
  const match = source?.match(/^group:(\d+):(\d+)$/);
  return match ? { groupIndex: Number(match[1]), position: Number(match[2]) } : null;
}

export function validateGroupConfig(playerCount: number, groupCount: unknown, advancePerGroup: unknown): void {
  if (typeof groupCount !== 'number' || !Number.isInteger(groupCount) || groupCount < 1 || groupCount > MAX_GROUPS) {
    throw invalid(`Number of groups must be a whole number from 1 to ${MAX_GROUPS}`);
  }
  if (typeof advancePerGroup !== 'number' || !Number.isInteger(advancePerGroup) || advancePerGroup < 1) {
    throw invalid('Qualifiers per group must be a whole number of 1 or more');
  }

  const smallest = Math.floor(playerCount / groupCount);
  if (smallest < 2) {
    throw invalid(`${groupCount} groups need at least ${groupCount * 2} players`);
  }
  if (advancePerGroup >= smallest) {
    throw invalid(
      `With ${groupCount} group${groupCount === 1 ? '' : 's'} the smallest group has ${smallest} players, ` +
        `so at most ${smallest - 1} can qualify from each group`
    );
  }
  if (groupCount * advancePerGroup < 2) {
    throw invalid('At least 2 players must qualify for the knockout');
  }
}

/**
 * Snake (serpentine) distribution: seeds 1..G go to groups A..G, the next G go
 * back from G to A, and so on. Returns the group index for each player, in seed order.
 */
export function distributeToGroups(playerCount: number, groupCount: number): number[] {
  return Array.from({ length: playerCount }, (_, i) => {
    const row = Math.floor(i / groupCount);
    const column = i % groupCount;
    return row % 2 === 0 ? column : groupCount - 1 - column;
  });
}

export interface Pairing {
  round: number;
  position: number;
  a: string;
  b: string;
}

/**
 * Round-robin schedule using the circle method. Players are given in seed
 * order; with an odd number, one player rests each round. The better seed is
 * always player A, and the top two seeds meet in the last round.
 */
export function roundRobin(playerIds: string[]): Pairing[] {
  const rank = new Map(playerIds.map((id, i) => [id, i]));
  let circle: (string | null)[] = playerIds.length % 2 === 0 ? [...playerIds] : [...playerIds, null];
  const n = circle.length;
  const pairings: Pairing[] = [];

  for (let round = 1; round < n; round++) {
    let position = 0;
    for (let i = 0; i < n / 2; i++) {
      const x = circle[i];
      const y = circle[n - 1 - i];
      if (x === null || y === null) continue;
      const [a, b] = rank.get(x)! < rank.get(y)! ? [x, y] : [y, x];
      pairings.push({ round, position: position++, a, b });
    }
    // Keep the first player fixed and rotate the rest one step
    circle = [circle[0], circle[n - 1], ...circle.slice(1, n - 1)];
  }

  return pairings;
}

/**
 * Knockout lines for the group qualifiers, top to bottom, as group sources
 * ('group:<g>:<position>'), with null for byes.
 *
 * Group winners take seeds 1..G in group order. Each later finishing position
 * takes the next G seeds, assigned so that players from the same group meet as
 * late as possible (opposite halves when the numbers allow).
 */
export function qualifierLines(groupCount: number, advancePerGroup: number): (string | null)[] {
  const size = bracketSize(groupCount * advancePerGroup);
  const order = seedOrder(size);
  const lineOfSeed = new Map(order.map((seed, line) => [seed, line]));
  const lines: (string | null)[] = Array(size).fill(null);
  const placed: number[][] = Array.from({ length: groupCount }, () => []);

  for (let position = 1; position <= advancePerGroup; position++) {
    const free = Array.from({ length: groupCount }, (_, i) => lineOfSeed.get((position - 1) * groupCount + i + 1)!);

    if (position === 1) {
      free.forEach((line, g) => {
        lines[line] = groupSource(g, 1);
        placed[g].push(line);
      });
      continue;
    }

    // Greedy: repeatedly make the assignment that keeps a group's players apart the longest
    const groups = new Set(Array.from({ length: groupCount }, (_, g) => g));
    const available = [...free];
    while (groups.size > 0) {
      let best: { g: number; line: number; score: number } | null = null;
      for (const g of groups) {
        for (const line of available) {
          const score = Math.min(...placed[g].map(other => meetingRound(line, other)));
          if (!best || score > best.score) best = { g, line, score };
        }
      }
      lines[best!.line] = groupSource(best!.g, position);
      placed[best!.g].push(best!.line);
      groups.delete(best!.g);
      available.splice(available.indexOf(best!.line), 1);
    }
  }

  return lines;
}
