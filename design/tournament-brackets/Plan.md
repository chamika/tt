# Tournament Brackets — Plan

## Context

The home page already shows a disabled **Tournament Brackets — Planned** card (`frontend/src/routes/+page.svelte`). This plan delivers it for club tournaments:

- **Formats:** (1) knockout, (2) group stage (round robin) feeding a knockout (QF → SF → F).
- **Seeding modes**, available with both formats: (a) **ranking**, seeded from player rankings; (b) **handicap**, seeded from handicap points. Every match also shows starting scores and the "play to" score from the existing calculator (`frontend/src/lib/handicap/scoreCalculator.ts`).
- Outcome: an organiser sets up a tournament, shares one link, and anyone with the link can follow the draw and enter results from a phone. Winners advance automatically, and group standings feed the knockout.

### Product decisions
- **Storage:** D1 with a shareable link `/tournament/<uuid>`, following the availability-tracker pattern. No auth: anyone with the link can edit.
- **Result detail:** chosen per tournament at creation: `points` (game scores) | `games` (games won) | `winner` (winner only).
- **Players:** typed in per tournament as a name plus a ranking or handicap. Names can optionally be prefilled from an existing availability team.

### Defaults
- **Ranking** is a position: 1 = best. A blank ranking is allowed; unranked players are drawn randomly below the ranked ones, and tied rankings are drawn randomly among themselves.
- **Handicap:** lower = stronger, matching the calculator (−10 gives points to −5). A handicap is required for every player in handicap mode, and seed 1 is the most negative.
- **Handicap start scores apply to every game in the match.** If a pairing's start score is ≥ its play-to score (e.g. −10 v +15 starts at 25, plays to 21), the app shows a warning badge but does not block.
- **Lifecycle:** `draft` → `in_progress` → `completed`. In draft, the organiser can edit players or settings and re-draw. **Start** locks the structure, and results are rejected while in draft.
- **Groups:** the organiser picks the number of groups and qualifiers per group. Seeds are spread across groups in snake order, and group sizes differ by at most 1. Knockout size = next power of 2 ≥ qualifiers, with byes going to the top qualifiers. Qualifiers from the same group go in opposite halves where possible.
- **Group tie-breaks (ITTF):** match points (win 2 / loss 1), then head-to-head, then games ratio, then points ratio, applied recursively among the tied players. Each tie-break only applies if the tournament's score mode records that data. A tie that can't be resolved is flagged, and the organiser orders those players manually.
- **Best of** 1/3/5/7, default 5. Maximum 64 players.
- **Corrections:**
  - A knockout result can be edited until the next match has a result.
  - A group result can be edited until any knockout match has a result. Editing it re-fills that group's knockout slots.
- **Out of scope for v1:** double elimination, a third-place play-off, doubles, walkovers or retirements, court and time scheduling, printing, and deleting a tournament. The home card text currently says "single or double elimination", so it will be reworded.

## Architecture

The worker is the source of truth. A **pure engine** computes a plan and the database layer applies it, the same pattern as `computeSyncPlan` → apply in `worker/src/sync.ts`. The API returns a fully computed view (round names, slot labels, handicap starts, standings), so the frontend only renders and posts results. Several people can therefore enter different matches at once without overwriting each other: each result is a per-match write, and advancement happens server-side.

**Shared handicap calculator.** The worker needs `calculateScores` to show starts and validate game scores, so the function moves to `shared/handicap/scoreCalculator.ts` at the repo root:
- `frontend/src/lib/handicap/scoreCalculator.ts` becomes a re-export, so the `/handicap` page and its 7 existing tests are unchanged.
- The worker imports it by relative path.
- The frontend needs `server.fs.allow` for `../shared` in `frontend/vite.config.ts`.

### Data model (add to `worker/schema.sql`, mirror in `worker/migrations/0002_tournament_brackets.sql`)
- `tournaments`: id, name, format (`knockout|groups`), seeding_mode (`ranking|handicap`), score_mode (`points|games|winner`), best_of, group_count, advance_per_group, status, created_at, updated_at.
- `tournament_players`: id, tournament_id (FK cascade), name, ranking NULL, handicap NULL, seed, group_index NULL, manual_group_rank NULL (set when the organiser resolves a tie).
- `tournament_matches`: id, tournament_id (FK cascade), stage (`group|knockout`), group_index, round, position, player_a_id NULL, player_b_id NULL (NULL = to be decided), source_a/source_b (e.g. `winner:<matchId>`, `group:0:1`, used for "Winner QF1" or "A1" labels), next_match_id, next_slot (`a|b`), is_bye, winner_id, games_a, games_b, game_scores (JSON, points mode only), completed_at, updated_at.
- Indexes on tournament_id and next_match_id. Handicap starts are **derived on read** and not stored, because handicaps lock at start.

### Engine — `worker/src/tournament/` (pure, no DB)
| File | Responsibility |
|---|---|
| `seeding.ts` | `seedPlayers(players, mode, rng)`: ordering and validation as listed in the defaults above. The RNG is injectable so tests are deterministic. |
| `knockout.ts` | Bracket of size 2^k with standard placement (8 → 1v8, 4v5, 2v7, 3v6), built recursively. Byes go to the top seeds and auto-advance. Round names come from the bracket end (Final, Semi-final, Quarter-final, Round of 16…). |
| `groups.ts` | Snake distribution and round-robin schedule (circle method, odd sizes rest a player). Builds the knockout skeleton from group positions: winners are seeded first, then runners-up, and so on, with the same-group separation described in the defaults. |
| `standings.ts` | `computeStandings(players, matches, scoreMode)` → rows plus a `tied` flag, applying the ITTF tie-break rules above. |
| `handicap.ts` | `matchHandicap(a, b, mode)` → `{start_a, start_b, play_to, warning}`. It wraps the shared calculator, and ranking mode returns `{0, 0, 11}`. |
| `results.ts` | Validates a result for the score mode: the match is ready, not a bye, and the tournament is in progress. A game is won by reaching play_to with a lead of 2, and after deuce the winning score is exactly the loser's + 2. Neither score is below that player's start score. The game count fits best-of, with no games after the match is decided. |
| `advance.ts` | Returns the match updates for a result: a knockout winner goes to the next slot, a group's qualifiers are placed in their knockout slots once that group is complete and resolved, and the final completes the tournament. It also enforces the correction-lock rules above. |

### Persistence + API
- `worker/src/tournament/database.ts`: a `TournamentRepository` in the style of `DatabaseService`. Multi-row writes go through D1 `batch`, like `batchCreateFixtureWithAvailability`.
- `worker/src/tournament/routes.ts`: a Hono sub-app mounted in `worker/src/index.ts` with `app.route('/api/tournaments', …)`. Move the `log` helper from `index.ts` to `worker/src/log.ts` so both can use it.
  - `POST /api/tournaments`: create a draft and generate the draw → `{id, redirect}`.
  - `GET /api/tournaments/:id`: the full computed view.
  - `PUT /api/tournaments/:id`: edit settings or players and re-draw. Draft only, otherwise 409.
  - `POST /api/tournaments/:id/start`: draft → in_progress.
  - `PUT /api/tournaments/:id/matches/:matchId/result` and `DELETE …/result`: record, edit, or clear a result. Returns the updated view, or 400 or 409 with a precise message.
  - `PUT /api/tournaments/:id/groups/:groupIndex/order`: manual tie resolution, only while a tie is flagged.

### Frontend
- `frontend/src/lib/types/tournament.ts` and `frontend/src/lib/api/tournament.ts`, mirroring `lib/api/availability.ts`.
- Routes:
  - `/tournament` is the landing page: create a tournament, or open one by link, like `/availability`.
  - `/tournament/new` is the setup form. It covers name, format, seeding, result detail and best-of, and for groups the group count and qualifiers, with a live hint such as "8 qualifiers → Quarter-finals". The player list editor shows a rank or handicap column depending on the mode, accepts pasted names, and can prefill from an availability team link using the existing `getTeamData`.
  - `/tournament/[id]` uses tabs, following `availability/[teamId]/+page.svelte`:
    - **Draw:** seeds and settings. In draft it adds Edit, Re-draw and Start.
    - **Groups:** standings tables and the tie-resolution prompt.
    - **Bracket:** desktop shows round columns; mobile shows a round selector.
    - **Matches:** "Up next" and completed matches.
- Components go in `frontend/src/lib/components/tournament/`:
  - `MatchCard`: seeds, players or "Winner QF1", the handicap badge "Start 0–5 · play to 16", and the warning badge.
  - `ResultDialog`: adapts to the score mode, pre-fills game rows with start scores, uses `inputmode="numeric"`, and shows API errors inline.
  - `GroupTable`, `BracketView` and `PlayerListEditor`.
- Reuse the toast in `lib/components/availability/Notification.svelte`.
- Pure helpers in `frontend/src/lib/tournament/bracketLayout.ts` (rounds → columns and connectors), with unit tests.
- Home card: enable it, set `href="/tournament"`, use the badge "New", and reword the description.

## Delivery — 5 PRs, each landed through the `ship` skill (build and tests must pass before push)

1. **Foundations (S)**
   - Write `design/tournament-brackets/Plan.md` and `TODO.md`, following the repo's `design/<feature>/` convention.
   - Move the calculator to `shared/` with a re-export.
   - Extract `log` into `worker/src/log.ts`.
   - **Add `npm test` to the Worker CI job.** Today `.github/workflows/ci.yml` runs only a dry-run build, so worker tests never run in CI. Check that the existing tests pass first.
   - Add the Miniflare D1 test harness (see Integration below).
   - Exit check: frontend `dev`, `build`, `check` and `lint` pass, and `/handicap` still works.
2. **Engine (M):** all modules in `worker/src/tournament/` with unit tests, and no I/O.
3. **Persistence + API (M):** schema and migration, repository, routes, API tests, D1 integration tests, and a new section in `docs/API.md`.
4. **Frontend (L):** routes, components, API client, home card, unit tests for `bracketLayout`, and Playwright E2E.
5. **Docs + demo data (S):** README feature #3, a `docs/USER_GUIDE.md` section, the `TESTING.md` inventory, a demo tournament with fixed UUIDs in `worker/seed.sql` for manual testing, then the manual test pass below.

## Automated tests

**Unit tests (worker vitest, pure engine)**
- **Seeding:**
  - Ranking ascending; ties and unranked players handled with a seeded RNG.
  - Handicap ascending, with negatives first.
  - Rejects a missing handicap, duplicate names, and fewer than 2 or more than 64 players.
- **Knockout:**
  - Covers sizes 2, 3, 5, 6, 8, 9, 16, 17 and 64.
  - Placement for 8 and 16; byes only go to top seeds and only one bye per match.
  - Property: seeds 1 and 2 can only meet in the final, and seeds 1–4 only from the semi-finals.
  - Round names.
- **Groups:**
  - Snake distribution for 8 players in 2 groups and 10 in 3; sizes differ by at most 1.
  - Every pair plays exactly once.
  - Qualifier placement: 4 groups top 2 → QF; 3 groups top 2 → 8-bracket with byes for A1 and B1; 2 groups top 4.
  - Property: no same-group first-round match, and same-group players are in opposite halves when the group count is a power of 2.
  - Rejects invalid configurations: qualifiers ≥ group size, groups with fewer than 2 players.
- **Standings:**
  - A two-way tie decided by head-to-head.
  - A three-way tie decided by games ratio, and another by points ratio.
  - The recursive case: one player separates, and head-to-head decides the remaining two.
  - A winner-only cycle is flagged as tied.
  - Behaviour as each score mode removes tie-break data.
  - Manual order override.
- **Handicap:**
  - Ranking mode → 0-0 to 11.
  - Minus v minus, plus v plus and minus v plus, each in both A/B orientations, against `calculateScores`.
  - Equal handicaps, the 0 boundary, and the start ≥ play_to warning.
  - Add these edge cases to the existing `scoreCalculator.test.ts` as well.
- **Results:**
  - Points mode at play_to 11 and 16: 12-10 ok; 13-10, 11-10 and 11-12 rejected; 18-16 ok at 16; a score below the start score rejected.
  - Too many games or games after the match is decided; best-of 1/3/5/7.
  - Games mode and winner mode.
  - Rejections for a match with an undecided player, a bye, and a draft tournament.
- **Advancement:**
  - A knockout winner fills the next slot.
  - Editing before the next match is played swaps the player; editing after is rejected.
  - The final completes the tournament.
  - A completed group fills only its own slots.
  - A group edit is rejected after a knockout result and re-fills slots before one.

**API tests:** `worker/src/tournament/routes.test.ts`, with `TournamentRepository` mocked as in `index.test.ts`. Cover 400 for bad configs and scores, 404 for an unknown tournament or match, 409 for draft or locked state, and the response shapes.

**Integration tests (real D1, new):**
- `worker/src/test/d1.ts` starts Miniflare in-memory D1, using the copy bundled with wrangler (add `miniflare` as an explicit devDependency). It applies `schema.sql` statement by statement, because D1 `exec` does not handle multi-line statements.
- `tournament.d1.test.ts` drives the real Hono app with `app.request(url, init, { DB })` through these flows:
  - 8-player groups × handicap × points mode: create → start → all group results → knockout filled with A1/B2 → final → status completed.
  - 6-player knockout × ranking: byes auto-advanced.
  - Two QF results entered back-to-back fill both slots of one SF without overwriting each other.
  - The tournament lock: create, start, then `PUT /api/tournaments/:id` returns 409.
  - Deleting a tournament cascades to its players and matches; checked with a direct DB delete.

**E2E tests (Playwright):** `frontend/e2e/tournament.test.ts`. Each test creates its own tournament through the API so it doesn't depend on seed data, then checks the UI.
- Knockout × ranking with 6 players: the draft bracket shows byes for seeds 1 and 2 → start → enter results through the UI → the champion is shown.
- Groups × handicap with 8 players in points mode: match cards show starts matching the calculator, and an invalid deuce score shows an inline error. Groups are finished through the API, then the bracket shows the A1/B2 labels and a QF can be entered.
- Winner mode with a 3-player cycle: the tie prompt appears → manual order → the knockout is filled.
- Setup validation: a missing handicap and qualifiers ≥ group size are blocked.
- The home card links to `/tournament`.
- A mobile-viewport project (`devices['iPhone 13']`) for the bracket and the result dialog.

## Manual tests (to run after PR 4 on the staging/preview deploy)

Phone-based checks (M8, M9) should be batched into one handoff: devices, links, what to tap, and what gets checked afterwards.

| # | Scenario | Expected |
|---|---|---|
| M1 | Setup validation: blank names, duplicate names, 1 player, 65 players, handicap mode with one handicap missing, groups with qualifiers ≥ smallest group | Each one is blocked with a clear message. Valid configs show the "N qualifiers → <round>" hint. |
| M2 | Knockout × ranking, 6 players, ranks 1–4 plus 2 blank | Seeds 1 and 2 get byes. The two unranked players are seeds 5 and 6, and Re-draw only reshuffles those two. Play through to the final; the champion is shown and the status is Completed. |
| M3 | Knockout × handicap, 5 players with handicaps −10, −5, 0, +5, +10 | Seed order is −10 … +10. For every match, the starts and play-to match `/handicap` with the same two values (check minus v minus, plus v plus and minus v plus). Matches with an undecided player show no handicap until both players are known. |
| M4 | Groups × ranking, 10 players, 3 groups, top 2, games mode | Groups have 4, 3 and 3 players, with snake seeding visible. The knockout is an 8-bracket with byes for A1 and B1, and no first-round match has two players from the same group. A3 cannot be entered as a qualifier. |
| M5 | Groups × handicap, 8 players, 2 groups, top 2, points mode, best of 3 | Game rows are pre-filled with start scores. Try 13-10 at play to 11 and 15-15 → 16-15 at play to 16: both rejected with clear messages. 17-15 is accepted. The knockout (SF) fills as each group finishes, and A1 and A2 are in opposite halves. |
| M6 | Each score mode × a three-way tie (A>B, B>C, C>A) | Points mode: decided by games, then points ratio. Games mode: decided by games ratio or flagged. Winner mode: always flagged → manual order → slots filled. |
| M7 | Corrections | Change a QF result before its SF is played → the SF player is swapped. After the SF result → editing is blocked with an explanation. A group edit after a knockout result → blocked. Clearing a result works and is reflected downstream. |
| M8 | **Two phones on the same link** | Phone 1 enters QF1 while phone 2 enters QF2. After a refresh, both show both results and the SF has both players. Draft editing on one phone while the other has already started returns a 409 message, not a crash. |
| M9 | **Responsive and theme**, phone at 375px, tablet and desktop, light and dark | 16- and 32-player brackets are readable (columns on desktop, round selector on phone). There is no horizontal page scroll. A long name (30 characters) truncates cleanly, the result dialog is usable with the numeric keypad, and toasts are visible in both themes. |
| M10 | Deploy | Re-running `db:migrate:staging` on the existing staging DB succeeds and availability data is intact. The CF Pages preview build resolves `shared/` and `/handicap` still calculates. |
| M11 | Regression | The availability tracker still imports, edits availability and selections, and syncs on staging. |
| M12 | Share link | Open `/tournament/<id>` in a private window: the full view loads. An unknown id shows a not-found state, not a spinner that never ends. |

## Verification per PR
- `cd worker && npm test`: unit, API and D1 integration tests. Then `npx wrangler deploy --dry-run --outdir=dist`.
- `cd frontend && npm run check && npm run lint && npm run test:unit && npm run build`.
- E2E: run the worker (`npm run db:migrate:local && npm run seed && npm run dev`), then `cd frontend && npm run test:e2e`.
- PR 4 onwards: check the flows in a local browser (`run` skill or Chrome tools) before the manual pass, then do the manual table above on the preview deploy.
