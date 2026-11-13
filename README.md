This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Duelo Arcano (card game)

A two-player online card game at `/cards` (Spanish UI, landscape, mobile-first). Charades and Batalla Naval keep
working signed out; the card game needs an account. Full design: [`docs/cards/CARD_GAME_IMPLEMENTATION_PLAN.md`](docs/cards/CARD_GAME_IMPLEMENTATION_PLAN.md);
progress and open items: [`docs/cards/STATUS.md`](docs/cards/STATUS.md); decisions: [`docs/cards/DECISIONS.md`](docs/cards/DECISIONS.md);
evidence: [`SECURITY_REVIEW.md`](docs/cards/SECURITY_REVIEW.md), [`PERFORMANCE.md`](docs/cards/PERFORMANCE.md); art drop-ins: [`ART_GUIDE.md`](docs/cards/ART_GUIDE.md).

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, Vercel (all environments) | Supabase project URL (Auth + Realtime) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`, Vercel (all environments) | Publishable key, browser-safe (the database is locked to it) |
| `SUPABASE_DB_PASSWORD` (or `SUPABASE_DB_URL`) | `.env.local`, Vercel **Production and Preview** — server only, never `NEXT_PUBLIC_` | Direct Postgres access for the match/collection/deck/store APIs and `db:setup` |

Never add a `service_role` key to the app. Without DB credentials, `npm run dev` falls back to in-memory stores
(matches, collection, decks; lost on restart, no rewards) — fine for UI work, not for production.

### Database

```bash
npm run db:setup
```

Applies every file in `supabase/migrations/` in name order (all idempotent — run it twice to confirm) and seeds the
Charades word bank. Run it against production before deploying a version with new migrations. Every card-game
table has RLS on with no policies and no grants to `anon`/`authenticated`; every function has its `execute` revoked
from client roles: only the server (database owner) reads or writes them.

### Tests

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run test:db
```

```bash
npm run bench
```

`npm test` runs the engine, server, client and route suites (including the security guards and payload budgets);
`npm run test:db` runs the SQL suites on an in-process Postgres (PGlite) — no network, no live database;
`npm run bench` runs the engine benchmark (budget: `applyCommand` p95 ≤ 15 ms). To check the match page's JS budget
(≤ 220 KB gzipped) after a build:

```bash
npm run build && node scripts/route-size.mjs "/cards/match/[id]"
```

### Supabase dashboard (once per project)

1. **Authentication → URL Configuration:** Site URL = the production domain; Redirect URLs `http://localhost:3000/**`
   and `https://<production-domain>/**`.
2. **Authentication → Email Templates:** "Confirm signup" link →
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/cards`; "Reset password" link →
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password`.
3. **Authentication → SMTP:** set up a custom SMTP sender before inviting more than a few players (the built-in sender
   allows only a few emails per hour).
4. **Realtime:** nothing to configure (the game uses broadcast channels only to nudge the opponent; polling keeps it working without them).

### Deploying

Vercel env vars as above → `npm run db:setup` against the production database → deploy. The service worker
(`public/sw.js`) never caches `/cards`, `/auth`, `/account`, `/api/cards` or `/api/account`; bump its `VERSION`
whenever its caching rules change so installed PWAs drop old caches.
