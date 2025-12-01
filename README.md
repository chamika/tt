# Table Tennis Tools

This project is for building various tools required for table tennis.

1. **Handicap Score Calculator**: A tool to calculate handicap scores for players based on their handicap points.
2. Soon: **ELTTTL Match Availability Tracker**: A tool to track match availability for players in the Edinburgh and Lothians Table Tennis League (ELTTTL).

Project scaffold
-
This repository now contains two main pieces:

- `frontend/` — A SvelteKit (TypeScript) frontend scaffold. The home page (`src/routes/+page.svelte`) contains tiles that link to individual tools (e.g. `/handicap`).
- `worker/` — A Cloudflare Worker scaffold (TypeScript) using `Hono` for lightweight API endpoints. It exposes `/api/handicap` and `/api/health` handlers.

Quick start (local)
-
Prereqs: Node 18+, npm, and `wrangler` for Cloudflare Workers.

1. Frontend

```bash
cd frontend
npm install
npm run dev
```

2. Worker (local dev with Wrangler)

```bash
cd worker
npm install
# supply your Cloudflare account id in wrangler.toml before publishing
npx wrangler dev
```

Deploy notes
- Frontend: build with `npm run build` in `frontend/` and deploy to Cloudflare Pages. SvelteKit supports the Cloudflare adapter for Pages/Workers.
- Worker: publish with `npx wrangler publish` (fill `account_id` in `worker/wrangler.toml`).

Next steps
- Migrate the existing `index.html` UI into `frontend/src/routes/handicap/+page.svelte` (or expand that page to match the current functionality).
- Wire the frontend to the Worker API endpoints and add persistence (Cloudflare KV or Durable Objects) if needed.

