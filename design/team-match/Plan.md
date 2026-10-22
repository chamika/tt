# Team Match Card — Plan

## Context

The club also plays league-style team matches. Each is a fixture between two teams of three, scored on the ELTTL match card (the paper ELTTL match card):

- Home players **A, B, C** play away players **X, Y, Z** over **10 rubbers**: 9 singles and 1 doubles.
- Each rubber is **best of 5**. The card keeps a running **H–A** score and counts each player's singles wins ("Won" column).
- All 10 rubbers are always played, so a **5–5 draw** is possible.

The rubber order printed on the card, which becomes a constant:

| # | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Home | A | B | C | B | A | C | doubles | B | C | A |
| Away | X | Y | Z | X | Z | Y | doubles | Z | X | Y |

**Product decision:** this is a **new, standalone feature**: one match between two teams, a digital version of the paper card. It does not plug into knockouts, groups or tournaments, and there is no handicap. You reach it from the Tournament area as another category, but it has its own routes, API and tables. The result is a home win, a draw or an away win.

**Outcome:** someone creates a match card with the two teams and six players and shares the link. People at the tables enter rubber scores on their phones in any order. The card shows the running score, the players' wins and the final result (home win, away win or draw).

### Defaults (stated, not asked)
- Exactly 3 players per team, no reserves. No NPC and no player-of-the-match.
- Games are scored in points, like the card (e.g. 11-7), played from scratch to 11 with the existing deuce rules.
- Rubbers can be entered in any order, since tables play in parallel. The running score for row n counts the completed rubbers up to n.
- The doubles pair for each side (two of the three players) is chosen when rubber 7 is entered, and it is required.
- There is no draft or start step. The details (title, date, team and player names) can be edited at any time. Rubbers refer to positions (A/B/C, X/Y/Z), not names, so renaming fixes a typo without touching any results.
- Anyone with the link can edit, the same as tournaments.
- The match is **completed** when all 10 rubbers have results. The outcome is home, away, or a draw at 5–5.
- **Out of scope:** handicap, a points-free (games-only) entry mode, team leagues or tables, linking to ELTTL fixtures or availability, and deleting a match.

## Architecture

The same pattern as tournaments: the worker is the source of truth, a pure module computes the view, and the frontend renders it and posts per-rubber writes. Each rubber is its own row, and the overall score is **derived on read, never stored**. That means two phones entering different rubbers at the same moment can't conflict, and nothing needs reconciling.

### Data model: new tables only
Add these to `worker/schema.sql` and mirror them in `worker/migrations/0004_team_matches.sql`, both as `CREATE TABLE IF NOT EXISTS`. Existing tables don't change.
- `team_matches`: `id` (TEXT PK), `title` (TEXT NULL, e.g. the division or occasion), `match_date` (TEXT NULL, `YYYY-MM-DD`), `home_team`, `away_team`, `home_players` and `away_players` (each a JSON array of 3 names, in A/B/C and X/Y/Z order), `created_at`, `updated_at`.
- `team_match_rubbers`: `match_id` (FK → team_matches, ON DELETE CASCADE), `number` (1–10), `game_scores` (JSON `GameScore[]`, with `a` = home), `home_games`, `away_games`, `winner` (CHECK IN ('home','away')), `home_pair` and `away_pair` (TEXT NULL, e.g. `AB` or `XZ`, rubber 7 only), `updated_at`. PRIMARY KEY (`match_id`, `number`).
- Index: the PK covers lookups by `match_id`.

### Worker: `worker/src/teamMatch/` (new folder, mirrors `tournament/`)
| File | Responsibility |
|---|---|
| `types.ts` | Row, input and view types (`TeamMatch`, `Rubber`, `RubberInput`, `TeamMatchView`, `RubberView`). |
| `rubbers.ts` | Pure functions. `RUBBER_ORDER`: the table above, with rubber 7 flagged as doubles. `BEST_OF = 5`. `validateDetails(input)`: names trimmed and non-empty with length limits, exactly 3 players per side, distinct within a team, and `match_date` a valid date or null. `validateRubber(number, input, names)`: checks the number is 1–10 and the game scores, and for rubber 7 requires a valid pair per side; other rubbers reject pairs. Returns what gets stored. |
| `view.ts` | `buildTeamMatchView(match, rubbers)` returns 10 rubber rows. Each row has labels (`A`, `X`, or `A & B` for doubles), names, scores, the winner, and the running H–A score. It also returns the total score, `played`, status (`not_started`, `in_progress` or `completed`), the outcome (`home`, `away`, `draw` or null), and singles wins per player. |
| `database.ts` | `TeamMatchRepository`, in the style of `TournamentRepository`: `create`, `get` (the match plus its rubbers), `updateDetails`, `upsertRubber` (`INSERT … ON CONFLICT(match_id, number) DO UPDATE`), and `deleteRubber`. |
| `routes.ts` | A Hono sub-app, mounted in `worker/src/index.ts` with `app.route('/api/team-matches', …)`, using the same `respondWithError`/`readJson` shape as `tournament/routes.ts`. |

**Reuse:**
- **Game validation.** `validateRubber` calls `gameProblem` from `shared/tournament/gameRules.ts` directly, with scratch rules `{start_a: 0, start_b: 0, play_to: 11}`, plus its own first-to-3 loop (about 15 lines). Tournament code (`worker/src/tournament/results.ts` and the rest) is **not modified**.
- **Errors.** Import `invalid`, `notFound` and `TournamentError` from `worker/src/tournament/errors.ts` instead of duplicating them.
- **Helpers.** `log` from `worker/src/log.ts`; `generateUUID` and `now` from `worker/src/utils`.

**API:**
- `POST /api/team-matches` → `{id, redirect: '/team-match/<id>'}`, 201.
- `GET /api/team-matches/:id` → `TeamMatchView` (no-cache), or 404.
- `PUT /api/team-matches/:id` → edit the details; returns the view.
- `PUT /api/team-matches/:id/rubbers/:number` with `{game_scores, home_pair?, away_pair?}` → the view, or 400 with a precise message.
- `DELETE /api/team-matches/:id/rubbers/:number` → the view. Returns 409 if the rubber has no result.

### Frontend
- `frontend/src/lib/types/teamMatch.ts` and `frontend/src/lib/api/teamMatch.ts`, mirroring `lib/api/tournament.ts`.
- **Routes:**
  - `/team-match/new`: the setup form. It has an optional title and date, then Home team with A/B/C and Away team with X/Y/Z. On a phone it is a single column of six name inputs.
  - `/team-match/[id]`: the card. The header shows the teams, the large H–A score and a status or outcome badge ("Home win", "Draw 5–5"…), plus Copy link and Edit details. Below that, the players with their singles wins. Then the 10 rubbers: stacked cards on a phone, a card-like table on desktop. Each row shows the number, `A v X` with names, the game scores, a winner highlight and the running score. Tapping a row opens the dialog.
- **Components** in `frontend/src/lib/components/teamMatch/`:
  - `TeamMatchForm.svelte` handles both create and edit.
  - `RubberCard.svelte` is one row.
  - `RubberDialog.svelte` handles game entry. It reuses the pure helpers in `frontend/src/lib/tournament/scores.ts` (`checkGames`, `otherSideAfterTyping`, `rowsWanted` and `gamesToWin`), so typing behaves exactly like the tournament result dialog: winner's score auto-fill, inline per-game errors and `inputmode="numeric"`. For rubber 7 it adds two pair pickers (choose 2 of 3 per side). It has a Clear button, and API errors show inline.
  - The toast reuses `lib/components/availability/Notification.svelte`.
- **Entry point:** on the `/tournament` landing page, add a second "Team match card" section (short description plus a "Create a Team Match" link). Make the paste-a-link opener route by the `/team-match/` path segment, not the UUID alone, because the UUID can't tell a tournament from a team match. Reword the home `ToolCard` description to mention team matches. No new home card.

## Delivery: 2 stacked PRs through the `ship` skill (build and tests must pass before push)

1. **Worker + data (M):**
   - `design/team-match/Plan.md` and `TODO.md` (this plan).
   - The schema and migration 0004.
   - `worker/src/teamMatch/*`, mounted in `index.ts` next to the tournaments mount (line 539).
   - Unit, route and D1 tests.
   - A `docs/API.md` section.
   - The PR description says that **prod needs migration 0004 applied**, run by the owner when merging.
2. **Frontend (M):** types, API client, the two routes, the components, the landing entry and home card wording, unit tests and Playwright E2E. Also a `README` and `docs/USER_GUIDE.md` section, plus a demo match with a fixed UUID in `worker/seed.sql`.

## Tests

**Worker unit (vitest):**
- `rubbers.test.ts`, covering `RUBBER_ORDER` first: each home player meets each away player exactly once, rubber 7 is the only doubles, and the order matches the card. Then:
  - Validation: 11-9 ok, 12-10 ok, 11-10 rejected, 13-10 rejected; first to 3 of 5; no game after the rubber is decided; fewer than 3 games won rejected.
  - Rubber 7 without pairs rejected; a pair that isn't 2 distinct players of that side rejected; a pair on a singles rubber rejected.
  - Details: blank names, 2 or 4 players, a duplicate within a team, and a bad date.
- `view.test.ts`: the running score with gaps (rubbers 1, 2 and 5 entered), a 6–4 home win, a 5–5 draw, `not_started`/`in_progress`/`completed`, doubles labels `A & C`, and singles wins excluding doubles.

**Routes and D1 integration:** `worker/src/teamMatch/teamMatch.d1.test.ts`, on the existing `worker/src/test/d1.ts` harness, following `tournament.d1.test.ts`:
- create → GET → 10 rubbers entered in shuffled order → a 5–5 draw and status completed.
- Correcting a rubber changes the score; clearing returns it to in_progress.
- Renaming a player keeps the results.
- Two different rubbers written back-to-back both survive.
- 404 for an unknown match or a rubber number of 11; 400 for bad scores; 409 for clearing an empty rubber.
- Deleting the match cascades to its rubbers.

**Frontend:** unit tests for any new pure helpers, e.g. the pair options and a score-summary formatter. `svelte-check` and lint.

**E2E:** `frontend/e2e/teamMatch.test.ts`. It creates a match through the API, then:
- enters rubber 1 through the UI and checks the running score;
- enters rubber 7 with the doubles pickers;
- checks that an invalid deuce score shows an inline error;
- fills the rest through the API and checks that "Draw 5–5" is shown;
- clicks through from `/tournament` to "Create a Team Match".

It runs on the existing mobile-viewport project too.

## Verification
- `npm --prefix worker test`, then `cd worker && npx wrangler deploy --dry-run --outdir=dist`.
- `npm --prefix frontend run check`, `run lint`, `run test:unit`, and `run test:e2e`. For E2E, run the worker in the background first: `cd worker && npm run db:migrate:local && npm run seed && npx wrangler dev --local --port 8787`, waiting on `curl -s localhost:8787/api/health`.
- In a local browser (the `run` skill or Chrome tools), at 375px and desktop width in both light and dark: create a match, enter a few rubbers including the doubles, edit a name, and check that a 5–5 card shows a draw with no horizontal scroll.
- After PR 1 merges: a read-only check that the staging tables exist, `PRAGMA table_info(team_matches)`. Apply 0004 to staging. Prod only with the owner's go-ahead.
