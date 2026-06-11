# ⚽ World Cup 2026 Tracker & Predictions App

A full-stack web application for tracking the FIFA World Cup 2026 — live standings, match schedules, and a predictions game for registered users.

---

## 🔴 Live Demo

🔗 **[wc2026-tracker.fly.dev](https://wc2026-tracker.fly.dev/)**

Open the link, register an account, and explore the matches, standings, and predictions features — no setup required. (Hosted as a temporary live demo; if it's ever offline, follow **Run It Locally** below to run the full app on your own machine.)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express — RESTful JSON API, organized by feature module |
| Database | SQLite (via Node.js built-in `node:sqlite`) |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| External Data | [football-data.org](https://www.football-data.org/) API (cached every 20 min) |
| AI Predictions | [Groq API](https://groq.com/) — `llama-3.3-70b-versatile`, free tier |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Scheduler | node-cron |
| Deployment | Docker + [Fly.io](https://fly.io/) |

> 🤖 Built with the help of AI coding assistants — Claude, Codex, and Cursor — used throughout for pair-programming, debugging, and code review.

---

## Features

### 📺 Match Tracking
- 🗓️ **Today's Matches** — Today's schedule with stadium, city, and a one-click Google Calendar button
- 📅 **Full Schedule** — Browse every match with **Upcoming** and **Played** tabs; played games show the final score
- 🔴 **Live Badge** — Cards auto-switch to a LIVE badge for the duration of each match without any backend polling
- ⭐ **Favourite Matches** — Click any match card to pin it with a gold highlight; persists across sessions via localStorage

### 📊 Standings & Bracket
- **Group Stage Overview** — All 12 groups with live standings, auto-updated from the API
- **Knockout Bracket** — Visual bracket that populates as the tournament progresses

### 🎯 Predictions Hub
- **Group Stage Bets** — Predict which two teams advance from each group
- **Knockout Predictions** — Pick the winner of every match from R32 to the Final
- **Top Scorer** — Bet on who finishes the tournament as the top goal scorer
- **🏅 Leaderboard** — Global rankings with your live point total shown in the header

### 🔮 Oracle Duel *(flagship feature)*
Two oracles go head-to-head predicting every match. You bet with or against them for bonus multipliers.

- **Your Oracle** — Build your own prediction algorithm by distributing weight across three categories: team strength (FIFA rankings), recent form, and goals quality. Dozens of unique oracle personalities are generated from your choices.
- **Groq AI Oracle** — A Groq-powered LLM predicts match outcomes independently each morning at 07:00 UTC.
- **Glowing Orb UI** — Each oracle is visualised as a pulsing orb (gold = your algorithm, purple = AI) whose size scales with prediction confidence.
- **Bet Mechanics** — Side with one oracle, both, or defy both for a 2× risk/reward multiplier.
- **Accuracy Tracker** — Win/loss record for each oracle updates as matches finish.

### 🔐 Auth & Profiles
- Register / log in with JWT-based sessions
- Personal profile page
- Country-aware match times — displayed in the user's local timezone

### 📜 New Rules
Interactive cards explaining the 2026 format changes: 48 teams, third-place group qualification, time-wasting rules, and more.

---

## Architecture Highlights

**Caching layer** — React never calls the external API directly. A cron job fetches from football-data.org every 20 minutes and writes to SQLite. All client requests hit our own DB — fast, rate-limit-safe, and resilient to API downtime.

**Oracle scheduling** — A second cron job runs at 07:00 UTC daily. It calls the Groq API for every match scheduled that day, and runs the algorithm oracle locally, upserting both predictions to the `oracle_predictions` table. If Groq fails for any match, the algorithm prediction is still stored and the page degrades gracefully.

**Client-side LIVE detection** — Rather than polling the backend, `MatchCard` computes a derived display status: if the current time falls within the 110-minute window after kickoff and the DB still says `SCHEDULED`, the card renders as LIVE automatically.

---

## Run It Locally

### Prerequisites
- [Node.js v22+](https://nodejs.org/) — the backend uses the built-in `node:sqlite` module
- A free API key from [football-data.org](https://www.football-data.org/client/register) (email signup, under a minute)
- A free API key from [Groq](https://console.groq.com/) (for the AI Oracle — the free tier is sufficient)

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

Fill in the `.env` values:

| Variable | What to put |
|---|---|
| `JWT_SECRET` | Any long random string — signs login tokens |
| `ADMIN_KEY` | Any string you choose — unlocks admin routes |
| `FOOTBALL_API_KEY` | Your free key from football-data.org |
| `FOOTBALL_API_BASE_URL` | `https://api.football-data.org/v4` |
| `GROQ_API_KEY` | Your free key from Groq (AI Oracle) |
| `PORT` | `5000` (or any free port) |
| `DB_PATH` | `./src/db/database.sqlite` |
| `CACHE_INTERVAL_MINUTES` | `20` |

Then start it:
```bash
npm run dev               # Runs on http://localhost:5000
```
The SQLite database and all tables are created automatically on first run.

### 3. Set up the client
```bash
cd client
npm install
npm run dev               # Runs on http://localhost:5173
```

### 4. Open the app
Visit **http://localhost:5173**, register an account, and explore.

### Verify the server is running
```
GET http://localhost:5000/api/health
→ { "status": "ok", "timestamp": "..." }
```

---

## Project Structure

```
world-cup-2026/
├── server/
│   └── src/
│       ├── config/          # Constants, DB connection
│       ├── data/            # FIFA rankings data (JSON)
│       ├── db/              # Migrations (idempotent, run on startup)
│       ├── middleware/       # authGuard, error handler
│       ├── modules/
│       │   ├── auth/        # Register, login, profile
│       │   ├── bets/        # Group, knockout, top scorer bets
│       │   ├── matches/     # Match data endpoints
│       │   ├── oracle/      # Oracle Duel — routes, controller, service
│       │   └── standings/   # Group standings
│       └── services/
│           ├── apiCache.service.js     # Cron + football-data.org sync
│           ├── algorithmOracle.service.js  # FIFA/form/goals algorithm
│           ├── groqOracle.service.js   # Groq AI predictions + cron
│           ├── oracleWeights.service.js    # Weight profiles + oracle names
│           └── scoring.service.js      # Points calculation
│
└── client/
    └── src/
        ├── api/             # Axios instance + per-feature API functions
        ├── components/
        │   ├── layout/      # Header, Footer, Layout
        │   └── ui/          # MatchCard, StatusBadge, Spinner…
        ├── context/         # AuthContext
        ├── hooks/           # useFetch, useFavouriteMatches
        ├── pages/
        │   ├── Betting/     # Betting Hub + Oracle Duel
        │   ├── Home/        # Flag wall + nav tiles
        │   ├── MatchesToday/
        │   ├── MatchesWeek/ # Upcoming / Played tabs
        │   └── …
        └── router/          # React Router + ProtectedRoute
```

---
