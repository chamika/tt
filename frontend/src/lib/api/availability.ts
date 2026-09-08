// API Client for Availability Tracker
import type {
  TeamData,
  PlayerSummary,
  ImportTeamRequest,
  ImportTeamResponse,
  UpdateAvailabilityRequest,
  SetFinalSelectionRequest,
  SyncResponse,
  ApiError
} from '$lib/types/availability';

// Re-export types for convenience
export type {
  Team,
  Fixture,
  Player,
  TeamData,
  PlayerSummary,
  SyncResponse,
  SyncPlan,
  SyncPlanNew,
  SyncPlanUpdate,
  SyncPlanDelete
} from '$lib/types/availability';

export type AvailabilityMap = Record<string, boolean>;
export type FinalSelectionsMap = Record<string, string[]>;

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

/**
 * Import a team from ELTTL URL
 */
export async function importTeam(elttlUrl: string): Promise<ImportTeamResponse> {
  const response = await fetch(`${API_BASE_URL}/availability/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ elttlUrl } as ImportTeamRequest)
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || 'Failed to import team');
  }

  return response.json();
}

/**
 * Get team data including fixtures, players, availability, and selections
 */
export async function getTeamData(teamId: string): Promise<TeamData> {
  const response = await fetch(`${API_BASE_URL}/availability/${teamId}`);

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || 'Failed to get team data');
  }

  return response.json();
}

/**
 * Update player availability for a fixture
 */
export async function updateAvailability(
  teamId: string,
  fixtureId: string,
  playerId: string,
  isAvailable: boolean
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/availability/${teamId}/fixture/${fixtureId}/player/${playerId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isAvailable } as UpdateAvailabilityRequest)
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || 'Failed to update availability');
  }
}

/**
 * Set final selection for a fixture (exactly 3 players)
 */
export async function setFinalSelection(
  teamId: string,
  fixtureId: string,
  playerIds: string[]
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/availability/${teamId}/fixture/${fixtureId}/selection`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ playerIds } as SetFinalSelectionRequest)
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || 'Failed to set final selection');
  }
}

/**
 * Get player summary statistics
 */
export async function getPlayerSummary(teamId: string): Promise<PlayerSummary[]> {
  const response = await fetch(`${API_BASE_URL}/availability/${teamId}/summary`);

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || 'Failed to get player summary');
  }

  const data = await response.json();
  return data.summary;
}

/**
 * Sync fixtures from ELTTL URL
 *
 * Pass `{ dryRun: true }` to get back the plan of changes without applying any
 * of them, so the user can review deletions before they happen.
 */
export async function syncFixtures(
  teamId: string,
  options: { dryRun?: boolean } = {}
): Promise<SyncResponse> {
  const response = await fetch(`${API_BASE_URL}/availability/${teamId}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dryRun: options.dryRun ?? false })
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || 'Failed to sync fixtures');
  }

  return response.json();
}
