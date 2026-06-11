# World Cup 2026 — Project Context

Full-stack web app for tracking FIFA World Cup 2026: live standings, match schedule, and a predictions game. Portfolio project targeting LinkedIn / Wix Enter.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite, React Router v6 |
| Backend | Node.js 22 + Express, feature-module structure |
| Database | SQLite via `node:sqlite` (Node 22 built-in — no ORM) |
| Auth | JWT + bcrypt |
| External data | football-data.org API (cached every 20 min via node-cron) |
| AI Oracle | Groq API — `llama-3.3-70b-versatile`, temp 0.3 |
| Deployment | Docker + Fly.io (`wc2026-tracker`), persistent volume at `/data/database.sqlite` |

---

## Project Structure

```
/
├── server/src/
│   ├── config/          # constants.js (all magic numbers), db.js
│   ├── data/            # fifa_rankings.json
│   ├── db/              # migrate.js — idempotent, runs on every startup
│   ├── middleware/       # authGuard, error handler
│   ├── modules/
│   │   ├── auth/        # register, login, profile
│   │   ├── bets/        # group/knockout/top-scorer bets + leaderboard; admin.routes.js
│   │   ├── groups/      # group standings
│   │   ├── knockout/    # knockout bracket
│   │   ├── matches/     # match schedule
│   │   ├── oracle/      # Oracle Duel — routes, controller, service
│   │   └── squads/      # squad data (for Top Scorer picker)
│   └── services/
│       ├── apiCache.service.js        # cron + football-data.org sync; TEAM_NAME_OVERRIDES map
│       ├── algorithmOracle.service.js # user weight-based oracle algorithm
│       ├── groqOracle.service.js      # Groq AI predictions, cron at 06:00 UTC
│       ├── oracleWeights.service.js   # weight profiles + oracle name generation
│       └── scoring.service.js         # match result scoring
│
└── client/src/
    ├── api/             # axios instance + per-feature API functions
    ├── components/ui/   # MatchCard, StatusBadge, Spinner, Skeleton, Toast
    ├── context/         # AuthContext, ToastContext
    ├── hooks/           # useFetch, useFavouriteMatches
    ├── pages/Betting/   # Betting hub, GroupBetting, KnockoutBetting, TopScorer, OracleDuel, Leaderboard
    ├── router/          # AppRouter, ProtectedRoute
    └── utils/           # countries.js, knockoutPreviews.js, timezone.js
```

---

## Key Conventions

**Scoring** — single source of truth in `server/src/config/constants.js`:
- Group stage: 10 pts per correct team in top 2
- R32: 5 · R16: 8 · QF: 12 · SF: 20 · Final: 35
- Top Scorer: 50 pts (player name + team both match)
- Oracle multipliers on base 5: BOTH_AGREED 0.8x (4 pts) · WITH_WINNER 1.2x (6 pts) · DEFY_BOTH 2.0x (10 pts)

**Locking:**
- Group stage + Top Scorer: `2026-06-13T14:00:00Z` — set in `constants.js` AND mirrored in `GroupBetting.jsx` / `TopScorer.jsx`
- Knockout: 1 hour before each match kickoff

**API status values:** football-data.org uses `TIMED` for upcoming matches (not `SCHEDULED`). Both `groqOracle.service.js` SQL and `MatchCard.jsx computeDisplayStatus` handle `TIMED`.

**Team name overrides:** `TEAM_NAME_OVERRIDES` in `apiCache.service.js` intercepts names at cache write time. Add new overrides here — they survive every API refresh.

**Admin endpoints** (header: `x-admin-key: <ADMIN_KEY>`):
- `POST /api/admin/oracle-refresh` — manually trigger Groq predictions for today
- `POST /api/admin/top-scorer` — set tournament top scorer result
- `DELETE /api/admin/user?email=` — delete a single user + all their data
- `GET /api/admin/debug-matches` — inspect raw match rows

**Oracle cron:** 06:00 UTC daily (before earliest WC 2026 kickoff ~16:00 UTC). Also runs once on server startup.

---

## Environment Variables

See `server/.env.example`. All secrets stored as Fly.io secrets in production — never in `fly.toml`.

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signs JWT tokens |
| `ADMIN_KEY` | Protects admin endpoints |
| `FOOTBALL_API_KEY` | football-data.org free tier |
| `FOOTBALL_API_BASE_URL` | `https://api.football-data.org/v4` |
| `GROQ_API_KEY` | Groq free tier (Oracle AI) |
| `DB_PATH` | `./src/db/database.sqlite` locally; `/data/database.sqlite` on Fly.io |

---

## Deploy

```bash
fly deploy          # run from repo root (Dockerfile + fly.toml live here)
fly logs            # tail production logs
fly ssh console     # SSH into container; node check-db.js to inspect the DB
```
