import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
import './Home.css';

const NAV_TILES = [
  { to: '/today',    icon: '🗓️',  title: "Today's Matches",  desc: 'Live scores & today\'s schedule'  },
  { to: '/week',     icon: '📅',  title: 'Schedule',          desc: 'This week\'s matches — or browse the full tournament schedule' },
  { to: '/overview', icon: '📊',  title: 'Overview',          desc: 'Group tables & knockout bracket'  },
  { to: '/betting',  icon: '🎯',  title: 'Betting Hub',       desc: 'Make your predictions & check the leaderboard' },
];

// Fixed number of flags per row in the decorative wall. Using a fixed count
// (rather than searching for whichever column count yields the biggest flag,
// like the old version did) guarantees the size we compute here matches the
// column count the actual flex-wrap layout settles on — that mismatch was
// exactly what made the grid taller than the visible area, with the extra
// rows clipped by overflow:hidden and faded by the mask gradient.
const FLAG_WALL_COLUMNS = 6;

// These teams are left out of the decorative flag wall so the remaining count
// (42) divides evenly into FLAG_WALL_COLUMNS — a full 6×7 grid with no ragged
// partial row at the bottom.
const FLAG_WALL_EXCLUDED_TEAMS = ['Iran', 'Egypt', 'Iraq', 'Jordan', 'Tunisia', 'Saudi Arabia'];

// Calculates the largest flag size (3:2 ratio) that fits `count` flags
// arranged in a FLAG_WALL_COLUMNS-wide grid within the available viewport area.
function calcFlagSize(count) {
  if (count === 0) return { width: 100, height: 67 };
  const GAP    = 10;
  const PAD_H  = 40;  // 20px padding each side
  const PAD_V  = 40;
  const HDR    = 65;  // approximate header height
  const FTR    = 50;  // approximate footer height
  const availW = window.innerWidth  - PAD_H;
  const availH = window.innerHeight - HDR - FTR - PAD_V;

  const cols = FLAG_WALL_COLUMNS;
  const rows = Math.ceil(count / cols);
  const fw   = (availW - (cols - 1) * GAP) / cols;   // max width at `cols` columns
  const fh   = (availH - (rows - 1) * GAP) / rows;   // max height at `rows` rows
  // Flag ratio is 3:2 → fw = 1.5 * fh
  const width  = Math.max(60, Math.floor(Math.min(fw, fh * 1.5)));
  const height = Math.floor(width * 2 / 3);
  return { width, height };
}

function Home() {
  const navigate = useNavigate();
  const { data } = useFetch(getAllGroups);

  const allTeams = data?.groups?.flatMap(g => g.standings.map(s => s.team)) ?? [];
  const flagWallTeams = allTeams.filter(team => !FLAG_WALL_EXCLUDED_TEAMS.includes(team.name));

  // Recalculate whenever the number of teams changes (data load)
  const flagSize = useMemo(() => calcFlagSize(flagWallTeams.length), [flagWallTeams.length]);

  return (
    <div className="home">
      {/* Decorative flag wall — one flag per team, sized to fill the viewport */}
      {flagWallTeams.length > 0 && (
        <div className="home__flag-wall">
          {flagWallTeams.map((team, i) => (
            team.flag_url && (
              <img
                key={i}
                src={team.flag_url}
                alt={team.name}
                className="home__flag-item"
                style={{ width: flagSize.width, height: flagSize.height }}
              />
            )
          ))}
        </div>
      )}

      {/* Hero */}
      <div className="home__hero">
        <p className="home__eyebrow">• USA • CANADA • MEXICO •</p>
        <h1 className="home__title">World Cup 2026<br />Tracker</h1>
        <p className="home__subtitle">
          Follow every match · Predict every result · Top the leaderboard
        </p>

        <div className="home__tiles">
          {NAV_TILES.map(tile => (
            <button
              key={tile.to}
              className="home__tile"
              onClick={() => navigate(tile.to)}
            >
              <span className="home__tile-icon">{tile.icon}</span>
              <div>
                <p className="home__tile-title">{tile.title}</p>
                <p className="home__tile-desc">{tile.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
