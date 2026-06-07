# ⚽ World Cup 2026 Tracker & Betting App

A full-stack web application for tracking the FIFA World Cup 2026 — live standings, match schedules, and a prediction/betting game for registered users.

---

## 🔴 Live Demo

🔗 **[wc2026-tracker.fly.dev](https://wc2026-tracker.fly.dev/)**

Open the link, register an account, and explore the matches, standings, and betting features — no setup required. (Hosted as a temporary live demo; if it's ever offline, follow **Run It Locally** below to run the full app on your own machine.)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express — RESTful JSON API, organized by feature module |
| Database | SQLite (via Node.js built-in `node:sqlite`) |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| External Data | [football-data.org](https://www.football-data.org/) API (cached every 20 min) |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Scheduler | node-cron |
| Deployment | Docker + [Fly.io](https://fly.io/) |

> 🤖 Built with the help of AI coding assistants — Claude, Codex, and Cursor — used throughout for pair-programming, debugging, and code review.

---

## Features

- 🗓️ **Today's Matches & Schedule** — Live match schedule with stadium/city info; switch between this week's games and the full tournament schedule
- 📊 **Group Stage Overview** — All 12 groups with live standings, auto-updated from the API
- 🏆 **Knockout Bracket** — Visual bracket that populates as the tournament progresses
- 📜 **New Rules** — Interactive cards explaining the 2026 format changes (48 teams, third-place qualification, time-wasting rules, and more)
- 🔐 **User Auth & Profiles** — Register / log in with JWT-based sessions and a personal profile page
- 🎯 **Betting System** — Predict group qualifiers, knockout winners, and the tournament's top scorer
- 🏅 **Leaderboard & Live Score** — See your total points right in the header, check your rank on the leaderboard, and view a built-in breakdown of how scoring works
- 📅 **Add to Calendar** — One-click button to add any match straight to your calendar

---

## Architecture Highlight: Caching Strategy

React **never calls the external API directly**. A Node.js cron job fetches fresh data from football-data.org every 20 minutes and writes it to SQLite. All client requests read from our own database — fast, rate-limit-safe, and resilient to API downtime.

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
