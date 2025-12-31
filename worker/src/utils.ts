import type { Env } from './types';

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}

/**
 * Parse date string (e.g., "Sep 16") and convert to ISO format
 * Handles season transition: August-March (Aug of current year through March of next year)
 * 
 * Logic:
 * - If import happens Aug-Dec (months 8-12): Season runs from current year through next year
 * - If import happens Jan-Jul (months 1-7): Season runs from previous year through current year
 */
export function parseMatchDate(dateStr: string, referenceDate?: Date): string {
  const now = referenceDate || new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Parse the fixture date string (e.g., "Sep 16" -> month=9, day=16)
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 2) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
  const monthStr = parts[0];
  const day = parseInt(parts[1], 10);
  
  const monthMap: Record<string, number> = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  };
  const fixtureMonth = monthMap[monthStr];
  
  if (!fixtureMonth) {
    throw new Error(`Invalid month in date string: ${dateStr}`);
  }
  
  if (isNaN(day) || day < 1 || day > 31) {
    throw new Error(`Invalid day in date string: ${dateStr}`);
  }
  
  // Determine the season year range
  let seasonStartYear: number;
  
  if (currentMonth >= 8) {
    // Import is Aug-Dec: Season is current year through next year
    seasonStartYear = currentYear;
  } else {
    // Import is Jan-Jul: Season is previous year through current year
    seasonStartYear = currentYear - 1;
  }
  
  // Determine which year this fixture belongs to
  let fixtureYear: number;
  
  if (fixtureMonth >= 8) {
    // Aug-Dec fixtures are in the season start year
    fixtureYear = seasonStartYear;
  } else {
    // Jan-Jul fixtures are in the season end year (next year)
    fixtureYear = seasonStartYear + 1;
  }
  
  // Create date in UTC to avoid timezone issues
  const date = new Date(Date.UTC(fixtureYear, fixtureMonth - 1, day));
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Check if a date is in the past
 */
export function isPastDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Validate ELTTL URL format
 */
export function isValidELTTLUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === 'elttl.interactive.co.uk' &&
      urlObj.pathname.startsWith('/teams/view/') &&
      /\/teams\/view\/\d+$/.test(urlObj.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Create database key for availability lookup
 */
export function getAvailabilityKey(fixtureId: string, playerId: string): string {
  return `${fixtureId}_${playerId}`;
}

/**
 * Error response helper
 */
export function errorResponse(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}

/**
 * Success response helper
 */
export function successResponse(data: any, status: number = 200) {
  return Response.json(data, { status });
}
