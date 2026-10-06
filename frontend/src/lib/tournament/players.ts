import type { PlayerInput, SeedingMode } from '$lib/types/tournament';

/** A row of the player list editor; `value` is the ranking or handicap as typed */
export interface PlayerRow {
  name: string;
  value: string;
}

/**
 * Turn pasted text into player rows: one player per line, optionally followed by
 * a ranking or handicap after a comma or tab ("Alice Anderson, -5").
 */
export function parsePlayerList(text: string): PlayerRow[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.*?)\s*[,\t]\s*(-?\d+)\s*$/);
      return match ? { name: match[1].trim(), value: match[2] } : { name: line, value: '' };
    });
}

/**
 * Players for the API, from the editor rows. Rows without a name are ignored,
 * and the value goes in as a ranking or handicap depending on the mode.
 * Returns an error message for a value that isn't a whole number.
 */
export function buildPlayerInputs(
  rows: PlayerRow[],
  mode: SeedingMode
): { players: PlayerInput[]; error: null } | { players: null; error: string } {
  const players: PlayerInput[] = [];

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;

    const raw = row.value.trim();
    let value: number | null = null;
    if (raw !== '') {
      if (!/^-?\d+$/.test(raw)) {
        const label = mode === 'ranking' ? 'Ranking' : 'Handicap';
        return { players: null, error: `${label} for ${name} must be a whole number` };
      }
      value = Number(raw);
    }

    players.push(mode === 'ranking' ? { name, ranking: value } : { name, handicap: value });
  }

  return { players, error: null };
}

/** Editor rows for an existing tournament's players, in seed order */
export function rowsFromPlayers(
  players: { name: string; ranking: number | null; handicap: number | null }[],
  mode: SeedingMode
): PlayerRow[] {
  return players.map(p => {
    const value = mode === 'ranking' ? p.ranking : p.handicap;
    return { name: p.name, value: value === null ? '' : String(value) };
  });
}
