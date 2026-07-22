# Ishbor — Skill-Based Job Portal (Secure Assessment Engine)

A monorepo for a skill-verification job portal. Candidates earn a **Verified** badge
by passing a proctored, anti-cheat assessment whose scoring lives entirely on the server.

## Architecture

```
ishbor.uz/
├── backend/     Node + Express + TypeScript + Mongoose + Socket.io + Vitest
├── frontend/    Next.js 15 (App Router) + TS + Tailwind + shadcn/ui + next-intl
├── docker-compose.yml
└── .github/workflows/ci.yml
```

### Security model (source of truth = server)
- `correctAnswer` is `select: false` on the Question schema — it never leaves the server.
- Scoring is **recalculated server-side** in `submitTest` using the hidden answer key.
- **Per-candidate option shuffling**: options are reordered per session; the permutation is stored server-side and submitted (displayed) indices are translated back before scoring — so answer positions can't be memorised or shared.
- Session timing (`startTime` / `deadline`) is server-authoritative; late submissions are flagged `expired`.
- Anti-cheat:
  - **REST** `/api/test/tab-switch` increments `tabSwitchCount`; over the limit the session is `terminated`.
  - **Socket.io heartbeat** watchdog terminates a session if the client stops beating (tab closed / offline).
  - **Client lockdown**: fullscreen enforcement, blocked copy/paste/context-menu, and dev-tools/print shortcuts. Leaving fullscreen counts as a violation. (Deterrents — the server stays authoritative.)

### Internationalisation
Three locales via `next-intl` with routed prefixes: **Uzbek** (`/uz`, default), **Russian** (`/ru`), **English** (`/en`). Messages live in `frontend/messages/*.json`; switch language from the header.

### Scoring (weighted)
| Difficulty | Points |
|-----------|--------|
| junior    | 1      |
| middle    | 2      |
| senior    | 3      |

Percentage = earned / max. Level: `<80%` fail · `80–89%` Junior · `90–99%` Middle · `100%` Senior.

## Getting started

Requires Node 20+ and a running MongoDB.

```bash
# 1. Install everything (npm workspaces)
npm install

# 2. Backend env
cp backend/.env.example backend/.env      # then edit MONGO_URI / JWT_SECRET
npm run seed -w backend                    # load sample questions

# 3. Frontend env
cp frontend/.env.local.example frontend/.env.local

# 4. Run both together
npm run dev
```

- Backend → http://localhost:5000  (health: `/api/health`)
- Frontend → http://localhost:3000

## API

| Method | Route                         | Auth | Purpose                              |
|--------|-------------------------------|------|--------------------------------------|
| POST   | `/api/auth/register`          | –    | Create account, returns JWT          |
| POST   | `/api/auth/login`             | –    | Log in, returns JWT                  |
| POST   | `/api/test/start`             | ✓    | Start a session, returns questions   |
| POST   | `/api/test/submit`            | ✓    | Server-side scoring + result         |
| POST   | `/api/test/tab-switch`        | ✓    | Record an anti-cheat violation       |
| GET    | `/api/test/session/:id`       | ✓    | Read own session state               |

Socket.io (same origin) handshake auth: `{ token, sessionId }`; events: `heartbeat`, `tab-switch`, `session:terminated`.

## Testing

```bash
npm run test -w backend            # Vitest: scoring, shuffle, and full API flow
npm run test:coverage -w backend   # with coverage
```

- **Unit**: `scoringService` (weighting, levels, rounding) and option-shuffle round-trip.
- **Integration**: real in-memory MongoDB (`mongodb-memory-server`) + `supertest` exercising
  `start → submit`, verifying the answer key never leaks, forged answers are ignored, and levels are promoted.
  These cases self-skip if the Mongo binary can't be provisioned offline; CI caches it so they always run there.

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR:
- **backend** — typecheck → test → build (with a cached Mongo binary)
- **frontend** — typecheck → lint → build

## Docker 

```bash
# Builds mongo + backend + frontend and wires them together
JWT_SECRET=your_secret docker compose up --build
```

- MongoDB with a persistent volume + healthcheck
- Backend image: multi-stage TypeScript build, runs as non-root
- Frontend image: Next.js **standalone** output for a minimal runtime
