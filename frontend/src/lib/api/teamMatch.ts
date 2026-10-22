// API Client for the Team Match Card
import type {
  CreateTeamMatchResponse,
  RubberInput,
  TeamMatchDetails,
  TeamMatchView
} from '$lib/types/teamMatch';
import type { ApiError } from '$lib/types/availability';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

async function request<T>(path: string, init: RequestInit = {}, fallbackError: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/team-matches${path}`, {
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
 * Create a match card for two teams of three
 */
export function createTeamMatch(body: TeamMatchDetails): Promise<CreateTeamMatchResponse> {
  return request('', { method: 'POST', body: JSON.stringify(body) }, 'Failed to create the match');
}

/**
 * Get the card with the running score, players' wins and result worked out
 */
export function getTeamMatch(id: string): Promise<TeamMatchView> {
  return request(`/${id}`, {}, 'Failed to load the match');
}

/**
 * Correct the title, date, team or player names; results are kept
 */
export function updateTeamMatch(id: string, body: TeamMatchDetails): Promise<TeamMatchView> {
  return request(`/${id}`, { method: 'PUT', body: JSON.stringify(body) }, 'Failed to update the match');
}

/**
 * Record or correct a rubber
 */
export function recordRubber(id: string, number: number, input: RubberInput): Promise<TeamMatchView> {
  return request(`/${id}/rubbers/${number}`, { method: 'PUT', body: JSON.stringify(input) }, 'Failed to save the rubber');
}

/**
 * Remove a rubber's result
 */
export function clearRubber(id: string, number: number): Promise<TeamMatchView> {
  return request(`/${id}/rubbers/${number}`, { method: 'DELETE' }, 'Failed to clear the rubber');
}
