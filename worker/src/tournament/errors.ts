/**
 * An error the API reports to the user as-is, with the HTTP status to use
 * (400 invalid input, 404 not found, 409 not allowed in the current state)
 */
export class TournamentError extends Error {
  constructor(message: string, public readonly status: 400 | 404 | 409 = 400) {
    super(message);
    this.name = 'TournamentError';
  }
}

export function invalid(message: string): TournamentError {
  return new TournamentError(message, 400);
}

export function conflict(message: string): TournamentError {
  return new TournamentError(message, 409);
}

export function notFound(message: string): TournamentError {
  return new TournamentError(message, 404);
}
