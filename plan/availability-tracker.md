# ELTTL Availability Tracker Plan
## Goal Description
Implement a feature to track player availability for the Edinburgh and Lothians Table Tennis League (ELTTL). Users will provide a team fixture link, and the system will scrape the schedule, allowing players to mark their availability via a shareable, private link.
## User Review Required
> [!IMPORTANT]
> - **KV Namespace**: A new Cloudflare KV namespace needs to be created. I will use the binding name `AVAILABILITY_KV`.
> - **Scraping Reliability**: Scraping external sites is fragile. If ELTTL changes their HTML structure, this will break.
> - **Testing**: I will add `vitest` to the worker for unit testing the scraping logic.
## Proposed Changes
### Worker (Backend)
#### [MODIFY] [wrangler.toml](file:///Users/chamika/source/tt/worker/wrangler.toml)
- Add KV binding `AVAILABILITY_KV`.
- Add `cheerio` dependency.
#### [NEW] [src/scraper.ts](file:///Users/chamika/source/tt/worker/src/scraper.ts)
- Implement logic to fetch and parse the ELTTL team fixture page.
- Extract: Team names, Player names, Match Details (Date, Time, Home/Away).
#### [NEW] [src/store.ts](file:///Users/chamika/source/tt/worker/src/store.ts)
- Helper functions to interact with `AVAILABILITY_KV`.
- Methods: `createTracker`, `getTracker`, `updateAvailability`.
#### [MODIFY] [src/index.ts](file:///Users/chamika/source/tt/worker/src/index.ts)
- Add API endpoints:
    - `POST /api/tracker`: Create a new tracker from a fixture URL.
      - **Request**:
        ```json
        { "url": "https://elttl.interactive.co.uk/teams/view/839" }
        ```
      - **Response**:
        ```json
        {
          "id": "generated-uuid",
          "teamName": "Penicuik IV",
          "players": ["Player A", "Player B"],
          "matches": [
            { "date": "2025-10-01", "home": "Team A", "away": "Team B" }
          ]
        }
        ```
    - `GET /api/tracker/:id`: Retrieve tracker data and availability.
      - **Response**:
        ```json
        {
          "id": "generated-uuid",
          "url": "https://...",
          "teamName": "Penicuik IV",
          "players": ["Player A", "Player B"],
          "matches": [
            {
              "date": "2025-10-01",
              "home": "Team A",
              "away": "Team B",
              "availability": {
                "Player A": "yes",
                "Player B": "no"
              }
            }
          ]
        }
        ```
    - `POST /api/availability/:id`: Update player availability.
      - **Request**:
        ```json
        {
          "matchIndex": 0,
          "playerName": "Player A",
          "status": "yes" // or "no", "maybe"
        }
        ```
      - **Response**: `200 OK`
### Frontend (SvelteKit)
#### [NEW] [src/routes/availability/+page.svelte](file:///Users/chamika/source/tt/frontend/src/routes/availability/+page.svelte)
- Landing page for the feature.
- Input field for "Team Fixture Link".
- "Create Tracker" button.
#### [NEW] [src/routes/availability/[id]/+page.svelte](file:///Users/chamika/source/tt/frontend/src/routes/availability/%5Bid%5D/+page.svelte)
- The main tracker UI.
- **Mobile-friendly View**:
    - List of matches. Each match item expands to show players.
    - Simple toggle/buttons for Availability (Yes/No/Maybe).
    - Summary view showing who is playing next.
### Tests
#### [NEW] [worker/test/scraper.test.ts](file:///Users/chamika/source/tt/worker/test/scraper.test.ts)
- Unit tests for the scraping logic using sample HTML.
## Verification Plan
### Automated Tests
- Run worker unit tests: `npm test` (will add script).
### Manual Verification
1.  **Create Tracker**:
    -   Go to `/availability`.
    -   Enter valid ELTTL URL (e.g., `https://elttl.interactive.co.uk/teams/view/839`).
    -   Verify backend returns a specific ID.
2.  **View Tracker**:
    -   Navigate to the generated link.
    -   Verify matches and players are listed correctly.
3.  **Update Availability**:
    -   Toggle availability for a player in a match.
    -   Refresh page to verify persistence.
4.  **Mobile View**:
    -   Use browser dev tools to simulate mobile width.
    -   Verify layout is usable (no horizontal scrolling for tables).
