// API Client for Tournament Brackets
import type {
  CreateTournamentRequest,
  CreateTournamentResponse,
  ResultInput,
  TournamentView
} from '$lib/types/tournament';
import type { ApiError } from '$lib/types/availability';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

async function request<T>(path: string, init: RequestInit = {}, fallbackError: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/tournaments${path}`, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: fallbackError }));
    throw new Error(error.error || fallbackError);
  }

  return response.json();
}

/**
 * Create a draft tournament; the worker makes the draw
 */
export function createTournament(body: CreateTournamentRequest): Promise<CreateTournamentResponse> {
  return request('', { method: 'POST', body: JSON.stringify(body) }, 'Failed to create tournament');
}

/**
 * Get the tournament with everything worked out: draw, standings, handicaps, locks
 */
export function getTournament(id: string): Promise<TournamentView> {
  return request(`/${id}`, {}, 'Failed to load tournament');
}

/**
 * Change a draft's settings or players; the draw is made again
 */
export function updateTournament(id: string, body: CreateTournamentRequest): Promise<TournamentView> {
  return request(`/${id}`, { method: 'PUT', body: JSON.stringify(body) }, 'Failed to update tournament');
}

/**
 * Lock the draw and start taking results
 */
export function startTournament(id: string): Promise<TournamentView> {
  return request(`/${id}/start`, { method: 'POST' }, 'Failed to start tournament');
}

/**
 * Record or correct a match result
 */
export function recordResult(id: string, matchId: string, result: ResultInput): Promise<TournamentView> {
  return request(
    `/${id}/matches/${matchId}/result`,
    { method: 'PUT', body: JSON.stringify(result) },
    'Failed to save result'
  );
}

/**
 * Remove a match result
 */
export function clearResult(id: string, matchId: string): Promise<TournamentView> {
  return request(`/${id}/matches/${matchId}/result`, { method: 'DELETE' }, 'Failed to clear result');
}

/**
 * Order players the tie-break rules couldn't separate
 */
export function orderGroup(id: string, groupIndex: number, playerIds: string[]): Promise<TournamentView> {
  return request(
    `/${id}/groups/${groupIndex}/order`,
    { method: 'PUT', body: JSON.stringify({ player_ids: playerIds }) },
    'Failed to save group order'
  );
}
