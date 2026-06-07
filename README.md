# ⚽ World Cup 2026 Tracker & Betting App

A full-stack web application for tracking the FIFA World Cup 2026 — live standings, match schedules, and a prediction/betting game for registered users.

---

## 🔴 Live Demo

> 🚧 **Upcoming...** — a hosted demo link will be posted here.

In the meantime, follow **Run It Locally** below to try the full app on your own machine — it only takes a few minutes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (via Node.js built-in `node:sqlite`) |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| External Data | [football-data.org](https://www.football-data.org/) API (cached every 20 min) |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Scheduler | node-cron |

---

## Features

- 🗓️ **Today's & This Week's Matches** — Live match schedule with stadium and city info
- 📊 **Group Stage Overview** — All 12 groups with live standings, auto-updated from the API
- 🏆 **Knockout Bracket** — Visual bracket that populates as the tournament progresses
- 📜 **New Rules** — Interactive cards explaining the 2026 rule changes
- 🔐 **User Auth** — Register / login with JWT-based sessions
- 🎯 **Betting System** — Predict group qualifiers, knockout winners, and top scorer
- 🏅 **Leaderboard** — Top 25 users ranked by prediction accuracy

---

## Architecture Highlight: Caching Strategy

React **never calls the external API directly**. A Node.js cron job fetches fresh data from football-data.org every 20 minutes and writes it to SQLite. All client requests read from our own database — fast, rate-limit-safe, and resilient to API downtime.

---

## Build Phases

| # | Phase | Status |
|---|---|---|
| 0 | Environment setup & project scaffold | ✅ Done |
| 1 | Database schema & migrations | ✅ Done |
| 2 | Core backend infrastructure (caching engine) | ✅ Done |
| 3 | Auth routes (register, login, JWT guard) | ✅ Done |
| 4 | Match & tournament routes | ✅ Done |
| 5 | Betting routes & lock logic | ✅ Done |
| 6 | Scoring engine & leaderboard | ✅ Done |
| 7 | React shell (layout, routing, auth context) | ✅ Done |
| 8 | Feature pages (all 5 pages + betting hub) | ✅ Done |
| 9 | UI polish, animations, responsive design | ⏳ Next |

---

## Run It Locally

### Prerequisites
- [Node.js v22+](https://nodejs.org/) — the backend uses the built-in `node:sqlite` module
- A free API key from [football-data.org](https://www.football-data.org/client/register) (just an email signup, takes under a minute)

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/world-cup-2026.git
cd world-cup-2026
```

### 2. Set up the server
```bash
cd server
cp .env.example .env
npm install
```

Open the new `.env` file and fill in the values:

| Variable | What to put |
|---|---|
| `JWT_SECRET` | Any long random string — signs login tokens |
| `ADMIN_KEY` | Any string you choose — unlocks the admin routes |
| `FOOTBALL_API_KEY` | Your free key from football-data.org |
| `FOOTBALL_API_BASE_URL` | `https://api.football-data.org/v4` |
| `PORT` | `5000` (or any free port) |
| `DB_PATH` | `./src/db/database.sqlite` |
| `CACHE_INTERVAL_MINUTES` | `20` — how often the server refreshes data from the API |

Then start it:
```bash
npm run dev               # Runs on http://localhost:5000
```
The SQLite database and tables are created automatically on first run.

### 3. Set up the client
In a second terminal:
```bash
cd client
npm install
npm run dev               # Runs on http://localhost:5173
```

### 4. Open the app
Visit **http://localhost:5173**, register an account, and explore the matches, standings, and betting features.

### Verify the server is running
```
GET http://localhost:5000/api/health
→ { "status": "ok", "timestamp": "..." }
```

---

## Project Structure

```
world-cup-2026/
├── server/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/          # DB connection, constants
│   │   ├── db/              # Migrations
│   │   ├── middleware/      # Auth guard, error handler
│   │   ├── modules/         # Feature modules (auth, matches, bets...)
│   │   └── services/        # API caching engine
│   └── app.js
│
└── client/                  # React + Vite frontend
    └── src/
        ├── api/             # Axios instance
        ├── components/      # Layout + UI components
        ├── context/         # Auth context
        ├── hooks/           # Custom hooks
        ├── pages/           # One folder per route
        └── router/          # React Router + ProtectedRoute
```

---
