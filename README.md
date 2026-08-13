# me2write

me2write is a standalone English writing checker. It estimates CEFR level A1–C2, scores seven writing dimensions, and returns concise strengths, priorities, corrections, and a next-level improvement plan.

The MVP is deliberately independent from me2talk: separate authentication, database tables, deployment, Workers AI usage, and configuration. The products only link to one another in the UI.

`me2write` is implemented and deployed independently from `me2talk`; there is no shared database, auth session, API, LLM quota, or Cloudflare binding.

## Architecture

```text
React + Vite (Cloudflare Pages)
              │ HTTPS + secure cookie
              ▼
Hono HTTP adapter (Cloudflare Worker)
              │
     ┌────────┼──────────┐
     ▼        ▼          ▼
 OAuth     Application   Repository ports
 adapter    services          │
              │               ▼
              ▼          Neon PostgreSQL
         LLMProvider
              │
              ▼
  Workers AI REST adapter
              │
              ▼
   Cloudflare AI account B
```

Cloudflare code is confined to `apps/api/src/index.ts`, runtime configuration, and the Workers AI adapter. CEFR rules, schemas, prompts, services, and repository contracts use platform-neutral TypeScript. A Node HTTP adapter or another PostgreSQL/LLM adapter can replace infrastructure without changing the domain.

## Project layout

```text
apps/api/
  migrations/              PostgreSQL migrations
  src/domain/              CEFR, writing, users, usage
  src/application/         services, errors, provider/repository ports
  src/infrastructure/      Google OAuth, Neon, Workers AI, config
  src/api/                 Hono routes and middleware
apps/web/                  React/Vite Pages frontend
```

## Local setup

Prerequisites: Node.js 22+, pnpm 10+, a Neon database, a Google OAuth web client, a Cloudflare account A for the Worker, and a Cloudflare account B with Workers AI access.

```bash
corepack enable
pnpm install
```

Copy `.env.example` to `apps/api/.dev.vars`, fill in all secret values, and copy the frontend lines to `apps/web/.env.local`. `.dev.vars` and `.env.local` are ignored by Git.

Apply committed migrations with the repeatable runner:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @me2write/api db:migrate
```

The initial MVP currently has one migration only: `apps/api/migrations/0001_initial.sql`. The runner creates `schema_migrations`, applies that init once, and records its version in a transaction. Future schema changes can be added as later numbered migrations without changing this initial file. Neon SQL Editor/`psql` can still be used for an emergency manual apply.

The database starts from one complete, idempotent init migration. Once production exists, treat this file as immutable and add later numbered migrations for changes.

Start both applications:

```bash
pnpm dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`
- Health check: `http://localhost:8787/health`

Workers AI is called through Cloudflare's REST API during local development and therefore consumes usage from account B. There is no paid fallback.

## Environment variables

| Variable | Secret | Required | Purpose |
|---|---:|---:|---|
| `DATABASE_URL` | yes | yes | Dedicated Neon PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | no | yes | Dedicated me2write OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | yes | yes | OAuth client secret |
| `SESSION_SECRET` | yes | yes | At least 32 characters; signs short-lived OAuth state |
| `AI_ACCOUNT_ID` | yes | yes | Account ID of Cloudflare account B that owns Workers AI usage |
| `AI_API_TOKEN` | yes | yes | Account B API token with Workers AI Read and Edit permissions |
| `APP_ORIGIN` | no | yes | Exact frontend origin used by redirects and credentialed CORS |
| `API_ORIGIN` | no | yes | Public API origin used for the OAuth callback URL |
| `ENVIRONMENT` | no | yes | `development` or `production` |
| `LLM_PROVIDER` | no | yes | Must be `cloudflare` in this MVP |
| `LLM_MODEL` | no | yes | One Workers AI model supporting JSON mode |
| `MAX_WRITING_WORDS` | no | yes | Server-enforced limit; default configuration is 1000 |
| `MAX_EVALUATIONS_PER_DAY` | no | no | Per-user rolling 24-hour abuse limit; default is 30 |
| `LLM_MAX_TOKENS` | no | no | Optional global ceiling based on recorded successful total tokens |
| `ADMIN_EMAILS` | no | no | Comma-separated Google emails allowed to query admin usage |
| `VITE_API_ORIGIN` | no | yes | Public API origin compiled into the frontend |

If `LLM_MAX_TOKENS` is absent, no arbitrary application quota is created. Provider quota errors are returned as controlled failures and never trigger another paid provider.

## Google OAuth

Create a dedicated Google OAuth 2.0 **Web application** client for me2write. Configure:

- local redirect URI: `http://localhost:8787/auth/google/callback`
- production redirect URI: `https://api.your-domain.example/auth/google/callback`
- frontend origins as authorized JavaScript origins where Google requests them

The flow uses authorization code + PKCE, signed/expiring state, an `HttpOnly` cookie, Google's stable `sub`, and opaque server-side sessions. Production cookies are `Secure` and `SameSite=Lax`. Do not reuse the me2talk client.

## Neon

Create a separate Neon project/database or, at minimum, a dedicated database/schema and credentials for me2write. The API uses parameterized PostgreSQL queries through `@neondatabase/serverless`. Tables are `users`, `sessions`, `writing_evaluations`, and `llm_usage`.

The evaluation claim is atomic and `request_id` is unique. A browser retry can return the already-completed result without paying for another inference. Processing and failed duplicate requests return controlled conflicts.

## Cross-account Workers AI and API deployment

The Worker runs in Cloudflare account A and calls the Workers AI REST endpoint for account B. No `AI` binding is configured because bindings are scoped to the Worker account. The adapter sends `AI_API_TOKEN` only in the server-side `Authorization: Bearer` header.

Generate Worker runtime types whenever `wrangler.jsonc` changes:

```bash
pnpm --filter @me2write/api types
```

In account B, create an API token from Workers AI's **Use REST API** flow, or create a custom token with both `Workers AI - Read` and `Workers AI - Edit`. Set the account B ID and token as Worker secrets in account A; never add them to `wrangler.jsonc`:

```bash
cd apps/api
pnpm wrangler secret put DATABASE_URL --env production
pnpm wrangler secret put GOOGLE_CLIENT_ID --env production
pnpm wrangler secret put GOOGLE_CLIENT_SECRET --env production
pnpm wrangler secret put SESSION_SECRET --env production
pnpm wrangler secret put AI_ACCOUNT_ID --env production
pnpm wrangler secret put AI_API_TOKEN --env production
```

Replace the example production origins/admin list in `wrangler.jsonc`, then validate and deploy:

```bash
pnpm build
pnpm deploy
```

`wrangler.jsonc` uses the current compatibility date, `nodejs_compat`, generated binding types, and structured logs/traces. `/health` performs no database or AI work.

### Production deployment checklist

1. Create the dedicated Neon database and run the initial migration:

   ```bash
   DATABASE_URL="postgresql://..." pnpm --filter @me2write/api db:migrate
   ```

2. Create a dedicated Google OAuth web client and register the production callback URL.
3. In account B, create a Workers AI API token with Read and Edit permissions and copy its Account ID.
4. Create/deploy the Worker in account A and set all production secrets, including `AI_ACCOUNT_ID` and `AI_API_TOKEN`, with `wrangler secret put`.
5. Replace the example production origins and admin allowlist in `wrangler.jsonc`.
6. Run `pnpm check` and `pnpm --filter @me2write/api deploy`.
7. Create the Cloudflare Pages project from `apps/web`, set `VITE_API_ORIGIN`, build with `pnpm build`, and publish `dist`.
8. Verify `GET https://api.your-domain.example/health`, Google login, one evaluation charged to account B, logout, and `/admin/llm-usage` with an allowlisted account.

Production secrets must never be placed in `vars`, source files, Pages client variables, or committed `.env` files. Only public frontend configuration such as `VITE_API_ORIGIN` belongs in Pages environment variables.

## Pages deployment

Create a Cloudflare Pages project with:

- root directory: `apps/web`
- build command: `pnpm build`
- output directory: `dist`
- environment variable: `VITE_API_ORIGIN=https://api.your-domain.example`

The included `_redirects` supports direct navigation to `/admin/llm-usage`. Configure the API's `APP_ORIGIN` to the exact Pages/custom-domain origin; credentialed CORS intentionally does not use `*`.

## Change the model or add a provider

Change the active model in the single `LLM_MODEL` runtime variable. The default model supports Workers AI JSON mode. To move AI usage to another Cloudflare account, rotate the `AI_ACCOUNT_ID` and `AI_API_TOKEN` secrets without changing application or domain code.

To add a provider, implement `LLMProvider` in a new infrastructure adapter and select it at application composition. Translate provider output/usage inside that adapter and return the normalized result. Do not add provider SDK details to the evaluation service, domain, or routes; do not silently enable fallback.

## Quality checks

```bash
pnpm check
```

The initial suite intentionally covers only high-value pure validation. Type checking, linting, test, and production builds are the main MVP gates.

## Keeping the specification current

`me2write_spec.md` is the product contract. Every feature or behavior change must update the relevant specification section and add a dated entry to its implementation change log. Update this README in the same change when architecture, environment variables, migrations, local setup, or deployment changes. A feature is not considered complete until code, tests, the specification, and operational documentation agree.

## Security and operational notes

- All inputs and generated output are runtime-validated; the frontend renders plain React text, never raw HTML.
- Request bodies and essay word count are bounded server-side.
- User identity and admin authorization are derived server-side.
- Essays, secrets, OAuth/session tokens, and raw provider output are not written to general logs.
- Usage records capture nullable token/provider units, success, provider/model, evaluation, and normalized error type.
- Stale sessions should be periodically deleted with an operator-run SQL maintenance task if volume warrants it.

## Known MVP limitations

- Google is the only identity provider.
- Evaluation is synchronous; there are no queues, progress percentages, or background jobs.
- Quota enforcement uses recorded total tokens and may allow one in-flight request beyond the ceiling under concurrency; provider quota remains the hard stop.
- No writing history/progress UI, subscriptions, provider fallback, classroom features, or shared me2talk SSO.
- Admin authorization is a server-side email allowlist rather than full RBAC.
