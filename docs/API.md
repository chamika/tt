# Availability Tracker API Documentation

Complete reference for the ELTTL Availability Tracker REST API.

## Base URL

**Development**: `http://localhost:8787`  
**Production**: `https://your-worker.workers.dev`

## Authentication

Currently, no authentication is required. Future versions may include team-based access control.

## Response Format

All responses are in JSON format with appropriate HTTP status codes.

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

## Endpoints

### 1. Health Check

Check if the API is operational.

**Endpoint**: `GET /api/health`

**Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": 1735556130000
}
```

**Headers**:
- `Cache-Control: public, max-age=60`

---

### 2. Import Team

Import a team from ELTTL website URL. Creates team, fixtures, players, and initializes availability tracking.

**Endpoint**: `POST /api/availability/import`

**Request Body**:
```json
{
  "elttlUrl": "https://elttl.interactive.co.uk/teams/view/123"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "teamId": "550e8400-e29b-41d4-a716-446655440000",
  "redirect": "/availability/550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid URL format
- `500 Internal Server Error`: Scraping or database error

**Example**:
```bash
curl -X POST http://localhost:8787/api/availability/import \
  -H "Content-Type: application/json" \
  -d '{"elttlUrl": "https://elttl.interactive.co.uk/teams/view/123"}'
```

**Notes**:
- If team already exists, returns existing teamId
- Scrapes: team name, fixtures (date, time, teams, venue), player names
- Only the active squad is imported - players listed under "Former Members" on the ELTTL page are ignored
- Initializes all availability as `false` (not available)
- Automatically determines if fixtures are in the past

---

### 3. Get Team Data

Retrieve complete team data including fixtures, players, availability, and selections.

**Endpoint**: `GET /api/availability/:teamId`

**Path Parameters**:
- `teamId` (string, UUID): Team identifier

**Response**: `200 OK`
```json
{
  "team": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Hackney Heroes",
    "elttl_url": "https://elttl.interactive.co.uk/teams/view/123",
    "created_at": 1735556130000,
    "updated_at": 1735556130000
  },
  "fixtures": [
    {
      "id": "fixture-uuid-1",
      "team_id": "550e8400-e29b-41d4-a716-446655440000",
      "match_date": "2025-01-15",
      "day_time": "Wed 15 Jan 2025 19:30",
      "home_team": "Hackney Heroes",
      "away_team": "Bethnal Green Bashers",
      "venue": "The Gym, Hackney",
      "is_past": 0,
      "created_at": 1735556130000
    }
  ],
  "players": [
    {
      "id": "player-uuid-1",
      "team_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Smith",
      "created_at": 1735556130000
    }
  ],
  "availability": {
    "fixture-uuid-1_player-uuid-1": true,
    "fixture-uuid-1_player-uuid-2": false
  },
  "finalSelections": {
    "fixture-uuid-1": ["player-uuid-1", "player-uuid-2", "player-uuid-3"]
  }
}
```

**Error Responses**:
- `404 Not Found`: Team does not exist

**Headers**:
- `Cache-Control: public, max-age=30, stale-while-revalidate=60`

**Example**:
```bash
curl http://localhost:8787/api/availability/550e8400-e29b-41d4-a716-446655440000
```

**Notes**:
- `availability` is a flat object with keys as `{fixtureId}_{playerId}`
- `finalSelections` maps fixtureId to array of up to 3 playerIds
- Fixtures are ordered by date (ascending)
- Players are ordered alphabetically by name

---

### 4. Update Player Availability

Mark a player as available or unavailable for a specific fixture.

**Endpoint**: `PATCH /api/availability/:teamId/fixture/:fixtureId/player/:playerId`

**Path Parameters**:
- `teamId` (string, UUID): Team identifier
- `fixtureId` (string, UUID): Fixture identifier
- `playerId` (string, UUID): Player identifier

**Request Body**:
```json
{
  "isAvailable": true
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "fixtureId": "fixture-uuid-1",
  "playerId": "player-uuid-1",
  "isAvailable": true
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body (isAvailable must be boolean)
- `404 Not Found`: Fixture or player not found, or doesn't belong to team
- `500 Internal Server Error`: Database error

**Example**:
```bash
curl -X PATCH http://localhost:8787/api/availability/team-id/fixture/fixture-id/player/player-id \
  -H "Content-Type: application/json" \
  -d '{"isAvailable": true}'
```

**Notes**:
- Automatically updates timestamp
- Validates fixture and player belong to specified team
- Idempotent operation (safe to call multiple times)

---

### 5. Set Final Selection

Set the final 3 players selected for a fixture. Replaces any previous selection.

**Endpoint**: `POST /api/availability/:teamId/fixture/:fixtureId/selection`

**Path Parameters**:
- `teamId` (string, UUID): Team identifier
- `fixtureId` (string, UUID): Fixture identifier

**Request Body**:
```json
{
  "playerIds": [
    "player-uuid-1",
    "player-uuid-2",
    "player-uuid-3"
  ]
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "fixtureId": "fixture-uuid-1",
  "playerIds": ["player-uuid-1", "player-uuid-2", "player-uuid-3"]
}
```

**Error Responses**:
- `400 Bad Request`: 
  - playerIds is not an array
  - More than 3 players selected
  - Selected player not marked as available
- `404 Not Found`: 
  - Fixture doesn't exist or doesn't belong to team
  - Player doesn't exist or doesn't belong to team
- `500 Internal Server Error`: Database error

**Example**:
```bash
curl -X POST http://localhost:8787/api/availability/team-id/fixture/fixture-id/selection \
  -H "Content-Type: application/json" \
  -d '{"playerIds": ["player-1", "player-2", "player-3"]}'
```

**Validation Rules**:
1. Must select 0-3 players (0 to clear selection)
2. All selected players must be marked as available
3. All players must belong to the team
4. Previous selections are automatically cleared

**Notes**:
- Clears existing selections before creating new ones
- Atomic operation (all-or-nothing)
- Empty array clears all selections for the fixture

---

### 6. Get Player Summary

Retrieve statistics for all players including games played, scheduled, and selection rates.

**Endpoint**: `GET /api/availability/:teamId/summary`

**Path Parameters**:
- `teamId` (string, UUID): Team identifier

**Response**: `200 OK`
```json
{
  "summary": [
    {
      "playerId": "player-uuid-1",
      "playerName": "John Smith",
      "gamesPlayed": 5,
      "gamesScheduled": 3,
      "totalGames": 8,
      "selectionRate": 67
    },
    {
      "playerId": "player-uuid-2",
      "playerName": "Jane Doe",
      "gamesPlayed": 4,
      "gamesScheduled": 2,
      "totalGames": 6,
      "selectionRate": 50
    }
  ]
}
```

**Error Responses**:
- `404 Not Found`: Team does not exist

**Headers**:
- `Cache-Control: public, max-age=60, stale-while-revalidate=120`

**Example**:
```bash
curl http://localhost:8787/api/availability/550e8400-e29b-41d4-a716-446655440000/summary
```

**Calculation Logic**:
- `gamesPlayed`: Past fixtures where player was in final selection
- `gamesScheduled`: Future fixtures where player is in final selection
- `totalGames`: Sum of played and scheduled
- `selectionRate`: Percentage of total fixtures where player was selected (rounded)

**Notes**:
- Players are returned in the order they appear in the database (typically alphabetical)
- Selection rate is 0% if no fixtures exist
- Only counts fixtures with final selections made

---

## Data Types

### Team
```typescript
{
  id: string;              // UUID
  name: string;            // Team name from ELTTL
  elttl_url: string;       // Original ELTTL URL
  created_at: number;      // Unix timestamp (milliseconds)
  updated_at: number;      // Unix timestamp (milliseconds)
}
```

### Fixture
```typescript
{
  id: string;              // UUID
  team_id: string;         // UUID reference to team
  match_date: string;      // ISO date format (YYYY-MM-DD)
  day_time: string;        // Human readable date/time
  home_team: string;       // Home team name
  away_team: string;       // Away team name
  venue: string | null;    // Venue name or null
  is_past: 0 | 1;         // 0 = future, 1 = past
  created_at: number;      // Unix timestamp (milliseconds)
}
```

### Player
```typescript
{
  id: string;              // UUID
  team_id: string;         // UUID reference to team
  name: string;            // Player name
  created_at: number;      // Unix timestamp (milliseconds)
}
```

### Availability
```typescript
{
  id: string;              // UUID
  fixture_id: string;      // UUID reference to fixture
  player_id: string;       // UUID reference to player
  is_available: 0 | 1;    // 0 = not available, 1 = available
  updated_at: number;      // Unix timestamp (milliseconds)
}
```

### Final Selection
```typescript
{
  id: string;              // UUID
  fixture_id: string;      // UUID reference to fixture
  player_id: string;       // UUID reference to player
  selected_at: number;     // Unix timestamp (milliseconds)
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Future versions will include:
- 100 requests per minute per IP
- 10 imports per hour per IP
- 429 status code when limits exceeded

## CORS

CORS is enabled for all origins. Production deployments should restrict to specific origins.

## Compression

All responses are automatically compressed with gzip/brotli when supported by the client.

## Caching

Cache headers are set on appropriate endpoints:
- Health check: 1 minute
- Team data: 30 seconds with stale-while-revalidate
- Player summary: 1 minute with stale-while-revalidate

Clients should respect these headers for optimal performance.

## Error Handling

All errors follow this structure:
```json
{
  "error": "Human-readable error message"
}
```

Standard HTTP status codes are used:
- `200`: Success
- `400`: Bad Request (validation error)
- `404`: Not Found
- `500`: Internal Server Error

## Logging

All API operations are logged with structured JSON including:
- Request details (method, path, params)
- Response status and duration
- Error messages and stack traces
- Performance metrics

Logs are accessible via Cloudflare Workers dashboard.

---

## Changelog

### v1.0.0 (December 2025)
- Initial API release
- Import, CRUD, and summary endpoints
- Structured logging and caching
- Compression support

---

**API Version**: 1.0.0  
**Last Updated**: December 2025
