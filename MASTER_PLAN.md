# World Cup 2026 Tracker & Betting App — Master Plan

---

## Overview

This document is the single source of truth for how we build the project. Every phase must be reviewed and approved before any code is written. Phases are intentionally small and independently testable.

---

## Phase 0 — Environment & Project Structure

**Goal:** Get both apps running with a clean, scalable folder structure before a single feature is written.

### Folder Structure

```
world-cup-2026/
├── server/                        # Node.js + Express backend
│   ├── src/
│   │   ├── config/                # DB connection, env config, constants
│   │   ├── db/                    # Schema migrations, seed scripts
│   │   ├── middleware/            # Auth guard, error handler, rate limiter
│   │   ├── modules/               # Feature-based modules (auth, matches, bets...)
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── auth.controller.js
│   │   │   │   └── auth.service.js
│   │   │   ├── matches/
│   │   │   ├── groups/
│   │   │   ├── knockout/
│   │   │   └── bets/
│   │   ├── services/              # Cross-cutting services
│   │   │   └── apiCache.service.js   # The 20-min polling service
│   │   └── app.js                 # Express app bootstrap
│   ├── .env
│   └── package.json
│
└── client/                        # React frontend
    ├── public/
    │   └── images/                # World Cup background images (2010–2022)
    ├── src/
    │   ├── api/                   # Axios instance + all API call functions
    │   ├── components/            # Reusable UI components
    │   │   ├── layout/            # Header, Footer, BackgroundCarousel, Overlay
    │   │   └── ui/                # Buttons, Cards, Tabs, Modal, etc.
    │   ├── context/               # React Context (AuthContext)
    │   ├── hooks/                 # Custom hooks (useAuth, useMatches, etc.)
    │   ├── pages/                 # One folder per route/page
    │   │   ├── MatchesToday/
    │   │   ├── MatchesWeek/
    │   │   ├── Overview/
    │   │   ├── Betting/
    │   │   ├── NewRules/
    │   │   ├── Auth/              # Login + Register pages
    │   │   └── NotFound/
    │   ├── router/                # React Router config, ProtectedRoute component
    │   ├── styles/                # Global CSS / CSS variables
    │   └── main.jsx
    └── package.json
```

**Why this structure?**
Each backend module is self-contained (routes + controller + service). Controllers handle HTTP concerns; services contain pure business logic. This separation makes unit testing trivial and keeps files short and focused — a key SOLID principle.

### Key Dependencies

| Side | Package | Purpose |
|---|---|---|
| Server | `express` | HTTP framework |
| Server | `better-sqlite3` | Synchronous SQLite driver (simpler for this scale) |
| Server | `jsonwebtoken` | JWT-based auth |
| Server | `bcrypt` | Password hashing |
| Server | `axios` | Fetching from football-data.org |
| Server | `node-cron` | Scheduling the 20-min cache refresh job |
| Server | `dotenv` | Environment variable management |
| Server | `cors` | Allow React dev server to call backend |
| Client | `react-router-dom` | Client-side routing |
| Client | `axios` | HTTP calls to our own backend |
| Client | `react-query` | Server state, caching, loading/error states |

---

## Phase 1 — Database Schema

**Goal:** Define every table before writing a single route. The schema is the backbone of the entire app.

### Table Definitions

#### `users`
```
id            INTEGER  PRIMARY KEY AUTOINCREMENT
full_name     TEXT     NOT NULL
email         TEXT     NOT NULL UNIQUE
age           INTEGER  NOT NULL
gender        TEXT     NOT NULL  -- 'male' | 'female'
password_hash TEXT     NOT NULL
favorite_team TEXT                -- team short code
created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### `teams`
```
id         INTEGER  PRIMARY KEY AUTOINCREMENT
name       TEXT     NOT NULL
short_code TEXT     NOT NULL UNIQUE   -- e.g. 'BRA', 'FRA'
flag_url   TEXT
group_name TEXT     NOT NULL           -- 'A' through 'L'
```

#### `matches`
```
id             INTEGER  PRIMARY KEY AUTOINCREMENT
external_id    TEXT     NOT NULL UNIQUE   -- ID from football-data.org
home_team_id   INTEGER  REFERENCES teams(id)
away_team_id   INTEGER  REFERENCES teams(id)
home_score     INTEGER                    -- NULL until played
away_score     INTEGER                    -- NULL until played
match_date     DATETIME NOT NULL
stadium        TEXT
city           TEXT
stage          TEXT     NOT NULL   -- 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL'
status         TEXT     NOT NULL   -- 'SCHEDULED' | 'LIVE' | 'FINISHED'
updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
```
> **Why store scores?** So we can compute leaderboard points entirely from our own DB without re-calling the external API at scoring time.

#### `group_standings`
```
id             INTEGER  PRIMARY KEY AUTOINCREMENT
group_name     TEXT     NOT NULL
team_id        INTEGER  REFERENCES teams(id)
played         INTEGER  DEFAULT 0
won            INTEGER  DEFAULT 0
drawn          INTEGER  DEFAULT 0
lost           INTEGER  DEFAULT 0
goals_for      INTEGER  DEFAULT 0
goals_against  INTEGER  DEFAULT 0
points         INTEGER  DEFAULT 0
position       INTEGER                  -- 1–4, determined after stage
updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### `api_cache`
```
id          INTEGER  PRIMARY KEY AUTOINCREMENT
cache_key   TEXT     NOT NULL UNIQUE   -- e.g. 'matches', 'standings'
payload     TEXT     NOT NULL           -- raw JSON string from external API
fetched_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```
> **Why a cache table?** It survives server restarts. An in-memory cache would lose data if the process crashes.

#### `predictions_group`
```
id          INTEGER  PRIMARY KEY AUTOINCREMENT
user_id     INTEGER  NOT NULL REFERENCES users(id)
group_name  TEXT     NOT NULL
team1_id    INTEGER  NOT NULL REFERENCES teams(id)   -- predicted to advance
team2_id    INTEGER  NOT NULL REFERENCES teams(id)   -- predicted to advance
submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
UNIQUE(user_id, group_name)   -- one prediction per group per user
```

#### `predictions_knockout`
```
id                   INTEGER  PRIMARY KEY AUTOINCREMENT
user_id              INTEGER  NOT NULL REFERENCES users(id)
match_id             INTEGER  NOT NULL REFERENCES matches(id)
predicted_winner_id  INTEGER  NOT NULL REFERENCES teams(id)
submitted_at         DATETIME DEFAULT CURRENT_TIMESTAMP
UNIQUE(user_id, match_id)    -- one prediction per match per user
```

#### `predictions_top_scorer`
```
id           INTEGER  PRIMARY KEY AUTOINCREMENT
user_id      INTEGER  NOT NULL REFERENCES users(id) UNIQUE   -- one per user
team_id      INTEGER  NOT NULL REFERENCES teams(id)
player_name  TEXT     NOT NULL
submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## Phase 2 — Backend: Core Infrastructure

**Goal:** A running Express server with DB connection, middleware, and the caching engine — zero feature routes yet.

### Steps
1. Bootstrap `app.js`: mount `cors`, `express.json()`, global error handler.
2. Create `config/db.js`: open the SQLite connection, run migrations (create all Phase 1 tables if they don't exist).
3. Create `middleware/auth.middleware.js`: verify JWT, attach `req.user` — reusable guard for protected routes.
4. Create `middleware/error.middleware.js`: catch-all error handler that returns consistent `{ error: message }` JSON responses.
5. Create `services/apiCache.service.js`: the core caching engine.

### Caching Service Architecture

```
On server start:
  1. Check api_cache table — if data is older than 20 min, fetch fresh data.
  2. Fetch from football-data.org (matches, standings).
  3. Normalize the response and upsert into matches + group_standings tables.
  4. Update api_cache with the raw payload + timestamp.
  5. Schedule a cron job: repeat every 20 minutes.

On any client request:
  → React calls our backend → backend reads from SQLite → instant response
  → External API is NEVER called by a user request. Only the cron job calls it.
```

**Why this approach?** The free API tier has strict rate limits. Polling every 20 minutes means ~72 calls/day regardless of how many users are on the site. It also means our app works even if football-data.org is temporarily down.

---

## Phase 3 — Backend: Authentication Routes

**Goal:** Secure, working register and login endpoints.

### Routes

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create new user |
| POST | `/api/auth/login` | No | Returns JWT |
| GET | `/api/auth/me` | Yes | Returns current user profile |

### Validation Rules (enforced server-side)
- `email`: valid email format, not already in use.
- `password`: 6–12 characters.
- `age`: integer, > 0.
- `gender`: must be `'male'` or `'female'`.

### Auth Flow
1. Register → hash password with `bcrypt` (salt rounds: 12) → store user.
2. Login → compare password hash → sign a JWT with `{ userId, email }` payload, 7-day expiry.
3. Client stores JWT in `localStorage`, sends it as `Authorization: Bearer <token>` on every protected request.

---

## Phase 4 — Backend: Match & Tournament Routes

**Goal:** All read-only data routes for the frontend's public pages.

### Routes

| Method | Path | Auth Required | Description |
|---|---|---|---|
| GET | `/api/matches/today` | No | Today's matches |
| GET | `/api/matches/week` | No | This week's matches |
| GET | `/api/groups` | No | All 12 groups with standings |
| GET | `/api/groups/:name` | No | Single group (e.g. `/api/groups/A`) |
| GET | `/api/knockout` | No | Knockout bracket data |

All routes read from SQLite — they never call the external API directly.

---

## Phase 5 — Backend: Betting Routes

**Goal:** All bet submission and retrieval routes. All require auth.

### Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/bets/group` | Submit group stage picks |
| GET | `/api/bets/group` | Get current user's group picks |
| POST | `/api/bets/knockout` | Submit knockout match winner |
| GET | `/api/bets/knockout` | Get current user's knockout picks |
| POST | `/api/bets/top-scorer` | Submit top scorer prediction |
| GET | `/api/bets/top-scorer` | Get current user's top scorer pick |
| GET | `/api/leaderboard` | Top 25 users by score |

### Locking Logic (enforced server-side)
- **Group Stage & Top Scorer:** Reject any submission after June 15, 2026 23:59 UTC.
- **Knockout rounds:** Query the earliest match of the current stage — reject submissions within 1 hour of that match. A new round unlocks 1 hour after the last match of the previous round finishes.

---

## Phase 6 — Scoring System

**Goal:** Define exactly how points are awarded so the leaderboard is deterministic.

| Prediction Type | Correct Outcome | Points |
|---|---|---|
| Group advance (per team) | Team did advance | 5 pts each (max 10/group, 120 total) |
| Round of 32 winner | Correct winner | 2 pts |
| Round of 16 winner | Correct winner | 3 pts |
| Quarter-Final winner | Correct winner | 5 pts |
| Semi-Final winner | Correct winner | 8 pts |
| Final winner | Correct winner | 15 pts |
| Top Scorer | Correct player | 20 pts |

**Scoring trigger:** A nightly cron job (or triggered by the cache refresh detecting a match moved to `FINISHED`) queries all relevant predictions, compares against actual results, and updates a `total_points` aggregation. The leaderboard queries this aggregation.

> We won't store a separate `leaderboard` table. Instead, the leaderboard route runs a single SQL query joining `users` with the sum of points across all prediction tables. This keeps data normalized and always current.

---

## Phase 7 — Frontend: Core Layout & Routing

**Goal:** A fully navigable shell with background images, overlay, header, footer, and protected routes — no real data yet.

### Components to Build

- **`BackgroundCarousel`**: Cycles through 4 World Cup background images (one per tournament: 2010, 2014, 2018, 2022). Changes image on route change.
- **`DarkOverlay`**: A fixed `position: absolute` div with `background: rgba(0,0,0,0.55)` layered over the background. Ensures text is always readable.
- **`Header`**: App logo/title, main navigation links, auth buttons (top-right: Login / Register, or user avatar + logout when logged in).
- **`Footer`**: Sticky bottom, links to GitHub & LinkedIn, "About" section placeholder.
- **`FactsBanner`**: Rotating "Interesting World Cup Facts" ticker below main content area.
- **`ProtectedRoute`**: HOC wrapper — redirects unauthenticated users to Login when trying to access `/betting`.

### Routes

| Path | Page | Protected |
|---|---|---|
| `/` | Matches Today | No |
| `/week` | Matches This Week | No |
| `/overview` | Group Stage + Knockout tabs | No |
| `/betting` | Betting Hub | **Yes** |
| `/rules` | New Rules | No |
| `/login` | Login | No |
| `/register` | Register | No |

---

## Phase 8 — Frontend: Feature Pages

Built in this order (simplest to most complex):

### 8A — Auth Pages (Login & Register)
Forms with client-side validation mirroring the server rules. On success, store JWT in `AuthContext` + `localStorage` and redirect.

### 8B — Matches Today & Week
Display cards: team flags, score/time, stadium, city. Badge for live matches. Data from `/api/matches/today` and `/api/matches/week`.

### 8C — Overview Page (Two Tabs)
- **Tab A — Group Stage**: 12 group tables in a 3-per-row grid. Each table: team name, flag, P/W/D/L/GD/Pts. Color-coded rows for advancing positions.
- **Tab B — Knockout Bracket**: Visual bracket tree. Renders placeholder boxes for unfilled spots. Populates match-by-match as results come in.

### 8D — New Rules Page
Accordion-style cards. Each rule has a catchy short title visible by default. Click to expand the full rule text. Rules are hardcoded content (no API needed).

### 8E — Betting Hub (Four Tiles)
The landing page shows 4 large clickable tiles. Clicking navigates to each sub-section:

- **Group Stage Betting** (`/betting/groups`): 12 groups displayed. For each, user picks 2 teams via checkbox or toggle. Shows lock countdown to June 15.
- **Knockout Betting** (`/betting/knockout`): Displays each match in the current unlocked stage as a "card duel". User picks the winner. Cards lock individually once their match is within 1 hour.
- **Top Scorer** (`/betting/top-scorer`): Step 1: select country. Step 2: pick a player from their squad (names fetched from API via our backend). Shows lock countdown to June 15.
- **Leaderboard** (`/betting/leaderboard`): Table of top 25 users: rank, name, favorite team flag, group pts, knockout pts, top scorer pts, total.

---

## Phase 9 — UI Polish & Responsiveness

Only after all features work correctly:
- CSS variables for the color system (gold accent, dark navy base).
- Smooth fade transitions between background images.
- Responsive grid breakpoints for mobile (12 groups collapse to 1-per-row on small screens).
- Hover/active states on betting cards.
- Loading skeletons (not spinners) for data-fetch states.
- Toast notifications for bet submission success/failure.

---

## Build Order Summary

| # | Phase | Deliverable |
|---|---|---|
| 0 | Environment | Both apps boot, folder structure in place |
| 1 | DB Schema | All tables created via migration script |
| 2 | Core Backend | Server + DB + caching engine running |
| 3 | Auth Routes | Register, login, JWT guard working |
| 4 | Match Routes | Today/week/groups/knockout data served |
| 5 | Betting Routes | All bet CRUD + lock logic enforced |
| 6 | Scoring Engine | Points computed, leaderboard accurate |
| 7 | React Shell | Layout, routing, auth context working |
| 8 | Feature Pages | All pages built with real data |
| 9 | Polish | UI animations, responsive design |

---

*Each phase begins only after the previous one is reviewed and approved.*
