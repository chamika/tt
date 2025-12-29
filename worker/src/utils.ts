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
 * Assumes current year if date has passed in current year, otherwise next year
 */
export function parseMatchDate(dateStr: string, year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const date = new Date(`${dateStr} ${currentYear}`);
  
  // If the date is in the past (more than a week ago), assume next year
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (date.getTime() < weekAgo) {
    date.setFullYear(currentYear + 1);
  }
  
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
