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

### 7. Sync Fixtures

Re-scrape the team's ELTTL page and reconcile the stored fixtures with it: add fixtures that
have appeared, update ones that have been rescheduled, and delete ones ELTTL no longer lists.

**Endpoint**: `POST /api/availability/:teamId/sync`

**Path Parameters**:
- `teamId` (string, UUID): Team identifier

**Request Body** (optional):
```json
{
  "dryRun": true
}
```
- `dryRun` (boolean, default `false`): When `true`, the plan is computed and returned but
  nothing is written. Use this to show the user what would change before applying it.
  An absent or malformed body is treated as `{ "dryRun": false }`.

**Response**: `200 OK`
```json
{
  "success": true,
  "dry_run": true,
  "fixtures_new": 1,
  "fixtures_updated": 1,
  "fixtures_deleted": 1,
  "fixtures_unchanged": 4,
  "updated_fixture_ids": ["fixture-uuid-2"],
  "plan": {
    "new": [
      {
        "match_date": "2026-10-07",
        "day_time": "Oct 7 Wed 18:45",
        "home_team": "Penicuik IV",
        "away_team": "West Lothian VI",
        "venue": null
      }
    ],
    "updated": [
      {
        "id": "fixture-uuid-2",
        "home_team": "Penicuik IV",
        "away_team": "Corstorphine IV",
        "old_match_date": "2026-10-14",
        "old_day_time": "Oct 14 Wed 18:45",
        "new_match_date": "2026-10-15",
        "new_day_time": "Oct 15 Thu 19:00",
        "available_count": 2,
        "selected_count": 0
      }
    ],
    "deleted": [
      {
        "id": "fixture-uuid-3",
        "match_date": "2026-10-21",
        "day_time": "Oct 21 Wed 18:45",
        "home_team": "Penicuik IV",
        "away_team": "Haddington IV",
        "is_past": 0,
        "available_count": 1,
        "selected_count": 3
      }
    ],
    "unchanged_count": 4
  },
  "message": "Pending changes: 1 new, 1 updated, 1 deleted, 4 unchanged"
}
```

**Error Responses**:
- `404 Not Found`: Team does not exist
- `500 Internal Server Error`: ELTTL page could not be fetched or parsed

**Example**:
```bash
# Preview what a sync would do
curl -X POST http://localhost:8787/api/availability/550e8400-e29b-41d4-a716-446655440000/sync \
  -H 'Content-Type: application/json' -d '{"dryRun":true}'

# Apply it
curl -X POST http://localhost:8787/api/availability/550e8400-e29b-41d4-a716-446655440000/sync
```

**Matching Logic**:
- A scraped fixture is matched to a stored one by `home_team` + `away_team` (exact, case
  sensitive). ELTTL exposes no fixture identifier, so this pairing is all that is available.
- Matched, same date and time → unchanged, nothing is written.
- Matched, different date or time → the fixture is updated and its availability and final
  selection are cleared, since the team may no longer be able to play on the new date.
- Not matched → a new fixture is created with a blank availability grid.
- Stored but absent from ELTTL → the fixture is deleted along with its availability and
  final selections.

**Notes**:
- `available_count` and `selected_count` report the data an update or deletion would destroy,
  so a client can warn before applying the plan.
- `is_past` is computed from `match_date`; past fixtures are deleted too when ELTTL drops them.
- The plan returned by a dry run and by the applied sync are computed the same way, but the
  ELTTL page is re-scraped on each call, so a late change on ELTTL can still shift the result.

---

## Tournament Brackets

Club tournaments shared by link: a knockout, or round-robin groups feeding a knockout. The
worker owns the draw, validates results, moves winners on and works out group standings;
every endpoint except create returns the full computed **tournament view** (below), so a
client only renders it.

A tournament is a `draft` until it is started. A draft can be edited and redrawn but takes no
results; once `in_progress` the draw is locked. It becomes `completed` when the final has a
result (and goes back to `in_progress` if that result is cleared).

### 8. Create Tournament

**Endpoint**: `POST /api/tournaments`

**Request Body**:
```json
{
  "name": "Club Championship",
  "format": "groups",
  "seeding_mode": "handicap",
  "score_mode": "points",
  "best_of": 5,
  "group_count": 2,
  "advance_per_group": 2,
  "players": [
    { "name": "Alice Anderson", "handicap": -6 },
    { "name": "Bob Brown", "handicap": 4 }
  ]
}
```
- `format`: `knockout` or `groups` (round-robin groups, then a knockout)
- `seeding_mode`: `ranking` (seeded by `ranking`, 1 = best; blank rankings are drawn randomly
  below the ranked players) or `handicap` (seeded by `handicap`, most negative first; required
  for every player, and every match shows starting scores and the score to play to)
- `score_mode`: what a result records - `points` (every game's score), `games` (games won) or
  `winner` (winner only). Group tie-breaks use as much of this as there is.
- `best_of`: 1, 3, 5 or 7
- `group_count` (1-16) and `advance_per_group`: groups format only. Fewer players must qualify
  from each group than are in the smallest group.
- `players`: 2 to 64, with unique names

**Response**: `201 Created`
```json
{
  "success": true,
  "id": "6f1c2d3e-...",
  "redirect": "/tournament/6f1c2d3e-..."
}
```

**Error Responses**:
- `400 Bad Request`: invalid settings or players, with a message saying what to fix

### 9. Get Tournament

**Endpoint**: `GET /api/tournaments/:id`

**Response**: `200 OK` - the tournament view:
```json
{
  "tournament": { "id": "...", "name": "...", "format": "groups", "status": "in_progress", "...": "settings" },
  "players": [
    { "id": "...", "name": "Alice Anderson", "ranking": null, "handicap": -6, "seed": 1, "group_index": 0, "manual_group_rank": null }
  ],
  "groups": [
    {
      "index": 0,
      "name": "Group A",
      "player_ids": ["..."],
      "standings": {
        "rows": [
          { "player_id": "...", "position": 1, "played": 3, "won": 3, "lost": 0, "match_points": 6,
            "games_won": 9, "games_lost": 2, "points_won": 120, "points_lost": 80, "tied": false }
        ],
        "complete": true,
        "unresolved_tie": null
      }
    }
  ],
  "rounds": [{ "round": 1, "name": "Semi-final", "short_name": "SF" }, { "round": 2, "name": "Final", "short_name": "F" }],
  "matches": [
    {
      "id": "...",
      "stage": "knockout",
      "label": "SF1",
      "round": 1,
      "round_name": "Semi-final",
      "player_a_id": "...",
      "player_b_id": null,
      "source_a_label": "A1",
      "source_b_label": "B2",
      "handicap": null,
      "status": "pending",
      "winner_id": null,
      "games_a": null,
      "games_b": null,
      "game_scores": null,
      "locked": false,
      "lock_reason": null,
      "...": "bracket links (next_match_id, next_slot, is_bye, source_a, source_b)"
    }
  ],
  "champion_id": null
}
```
- `matches[].status`: `bye`, `pending` (a player still to be decided), `ready` or `completed`
- `matches[].handicap`: `{ "start_a", "start_b", "play_to", "warning" }` once both players are
  known. Ranking tournaments play off scratch (`0`, `0`, `11`). `warning` is set when a starting
  score reaches the play-to score, which means the handicaps need checking.
- `matches[].locked` / `lock_reason`: whether, and why, the result can't be entered or changed
- Group standings: match points (win 2, loss 1), then ITTF tie-breaks among the tied players -
  head-to-head, games ratio, points ratio - restarting among whoever is still level.
  `unresolved_tie` lists players the rules can't separate, when it affects who qualifies or
  where; the group's qualifiers wait until they are ordered (endpoint 14).

**Error Responses**: `404 Not Found`

### 10. Update a Draft

Change the settings or players. The whole draw is made again.

**Endpoint**: `PUT /api/tournaments/:id` - same body as Create. **Response**: the tournament view.

**Error Responses**: `400` invalid settings, `404`, `409` the tournament has started

### 11. Start Tournament

**Endpoint**: `POST /api/tournaments/:id/start` - **Response**: the tournament view.

**Error Responses**: `404`, `409` already started

### 12. Record a Result

Record or correct a match result. Winners move into the next round, and a finished group sends
its qualifiers into the knockout.

**Endpoint**: `PUT /api/tournaments/:id/matches/:matchId/result`

**Request Body**, by `score_mode`:
```json
{ "game_scores": [{ "a": 11, "b": 7 }, { "a": 9, "b": 11 }, { "a": 12, "b": 10 }, { "a": 11, "b": 4 }] }
{ "games_a": 3, "games_b": 1 }
{ "winner_id": "player-uuid" }
```
In `points` mode every game is checked against the match's handicap: neither player can finish
below their starting score, the winner reaches the play-to score with a 2-point lead, and from
deuce the game ends at exactly a 2-point lead. The games must make a finished best-of match.

**Response**: the tournament view.

**Error Responses**:
- `400`: the score isn't possible, with a message naming the game and the problem
- `404`: tournament or match not found
- `409`: the tournament hasn't started, the match is a bye or still waiting for a player, or the
  result is locked - a knockout result once the next match has a result, a group result once
  any knockout match has a result

### 13. Clear a Result

**Endpoint**: `DELETE /api/tournaments/:id/matches/:matchId/result` - **Response**: the tournament view.

The winner is taken back out of the next round (or the group's qualifiers out of the
knockout). Locked in the same way as recording a result.

### 14. Order a Group Tie

Set the order of players the tie-break rules couldn't separate.

**Endpoint**: `PUT /api/tournaments/:id/groups/:groupIndex/order`

**Request Body**:
```json
{ "player_ids": ["first-uuid", "second-uuid", "third-uuid"] }
```
The list must be exactly the group's `unresolved_tie`. A later change to any of the group's
results clears the order.

**Response**: the tournament view.

**Error Responses**: `400` not the tied players, `404` group not found, `409` no tie to order
or the knockout has started

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
- `201`: Created
- `400`: Bad Request (validation error)
- `404`: Not Found
- `409`: Conflict (not allowed in the current state, e.g. a result for a tournament that hasn't started)
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

### v1.2.0 (October 2026)
- Added Tournament Brackets: `/api/tournaments` endpoints for knockout and group tournaments,
  seeded by ranking or handicap

### v1.1.0 (September 2026)
- Added `POST /api/availability/:teamId/sync`
- Sync now deletes fixtures that ELTTL no longer lists
- Added `dryRun` so changes can be previewed before being applied

### v1.0.0 (December 2025)
- Initial API release
- Import, CRUD, and summary endpoints
- Structured logging and caching
- Compression support

---

**API Version**: 1.2.0  
**Last Updated**: October 2026
