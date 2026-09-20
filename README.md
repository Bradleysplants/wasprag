# wasprag (Botani-Buddy)

Two apps live in this repo:

| Dir | What | Stack |
| --- | --- | --- |
| `plantrag/` | Botani-Buddy: RAG plant-care chat app with PayPal subscriptions | [Wasp](https://wasp.sh) 0.16.x (React + Node + Prisma), PostgreSQL + pgvector |
| `WaspClient/` | Strapi CMS the app syncs users/plant data to | Strapi 5.13.1, Postgres |

## Prerequisites

- Node.js 22 (`nvm use` reads `.nvmrc` in each app). Strapi supports Node <= 22.x; Wasp 0.16 needs >= 22.12.
- npm (lockfiles are `package-lock.json`; use `npm ci`).
- PostgreSQL with the `pgvector` extension (for `plantrag`), or Docker to let Wasp provision one.
- [Wasp CLI](https://wasp.sh/docs/quick-start) **0.16.x** (see `wasp: { version: "^0.16.3" }` in `plantrag/main.wasp`).
  Later Wasp releases (0.17+) are not compatible without a migration.
  Install: `curl -sSL https://get.wasp.sh/installer.sh | sh -s -- -v 0.16.3`.

## Run locally

### WaspClient (Strapi CMS)

```bash
cd WaspClient
nvm use
cp .env.example .env      # replace every "changeme" (openssl rand -base64 32); needs a reachable Postgres
npm ci
npm run develop           # admin at http://localhost:1337/admin
# production-style: npm run build && npm run start
```

### plantrag (Wasp app)

```bash
cd plantrag
nvm use
cp .env.server.example .env.server   # fill in keys (see comments inside)
cp .env.client.example .env.client
wasp start db             # terminal 1: dev Postgres (needs Docker); leave running
wasp db migrate-dev       # terminal 2: apply migrations
wasp start                # client http://localhost:3000, server http://localhost:3001
```

`wasp start` compiles the app into `.wasp/` and installs npm dependencies for you.
On a fresh clone do **not** run `npm ci` first: `package.json` depends on
`wasp: file:.wasp/out/sdk/wasp`, which only exists after Wasp compiles the project.

Production build: `wasp build` (output in `.wasp/build/`).

## Environment variables

Real `.env*` files are gitignored. Templates: `WaspClient/.env.example`,
`plantrag/.env.server.example`, `plantrag/.env.client.example`.

Note: `schema.prisma` uses `vector(384)`; `EMBEDDING_MODEL` must produce 384-dimension vectors.

## Tests

`plantrag/__tests__/*.cjs` are manual PayPal / subscription smoke scripts (no test runner is configured):

```bash
node plantrag/__tests__/testSubscriptionLogic.cjs   # pure logic, no credentials
```

The PayPal scripts need `dotenv` and `node-fetch` installed and real sandbox credentials.
