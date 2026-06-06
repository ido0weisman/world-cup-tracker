# ⚽ World Cup 2026 Tracker & Betting App

A full-stack web application for tracking the FIFA World Cup 2026 — live standings, match schedules, and a prediction/betting game for registered users.

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
| 5 | Betting routes & lock logic | ⏳ Next |
| 6 | Scoring engine & leaderboard | ⏳ Pending |
| 7 | React shell (layout, routing, auth context) | ✅ Done |
| 8 | Feature pages (all 5 pages + betting hub) | ⏳ Pending |
| 9 | UI polish, animations, responsive design | ⏳ Pending |

---

## Getting Started

### Prerequisites
- Node.js v22+ (project uses built-in `node:sqlite`)
- A free API key from [football-data.org](https://www.football-data.org/)

### Server
```bash
cd server
cp .env.example .env      # Fill in your API key and JWT secret
npm install
npm run dev               # Runs on http://localhost:5000
```

### Client
```bash
cd client
npm install
npm run dev               # Runs on http://localhost:5173
```

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

*Built as a portfolio project to demonstrate full-stack skills with React, Node.js, SQLite, and REST API design.*
