import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
import './Home.css';

const NAV_TILES = [
  { to: '/today',    icon: '🗓️',  title: "Today's Matches",  desc: 'Live scores & today\'s schedule'  },
  { to: '/week',     icon: '📅',  title: 'This Week',         desc: 'Upcoming matches for the next 7 days' },
  { to: '/overview', icon: '📊',  title: 'Overview',          desc: 'Group tables & knockout bracket'  },
  { to: '/betting',  icon: '🎯',  title: 'Betting Hub',       desc: 'Make your predictions & check the leaderboard' },
];

// Calculates the largest flag size (3:2 ratio) that fits all `count` flags
// within the available viewport area, trying every column count.
function calcFlagSize(count) {
  if (count === 0) return { width: 100, height: 67 };
  const GAP    = 10;
  const PAD_H  = 40;  // 20px padding each side
  const PAD_V  = 40;
  const HDR    = 65;  // approximate header height
  const FTR    = 50;  // approximate footer height
  const availW = window.innerWidth  - PAD_H;
  const availH = window.innerHeight - HDR - FTR - PAD_V;

  let bestFW = 60; // minimum floor
  for (let c = 4; c <= count; c++) {
    const r  = Math.ceil(count / c);
    const fw = (availW - (c - 1) * GAP) / c;          // max width at c columns
    const fh = (availH - (r - 1) * GAP) / r;          // max height at r rows
    // Flag ratio is 3:2 → fw = 1.5 * fh
    const size = Math.min(fw, fh * 1.5);
    if (size > bestFW) bestFW = size;
  }
  const fw = Math.floor(bestFW);
  const fh = Math.floor(fw * 2 / 3);
  return { width: fw, height: fh };
}

function Home() {
  const navigate = useNavigate();
  const { data } = useFetch(getAllGroups);

  const allTeams = data?.groups?.flatMap(g => g.standings.map(s => s.team)) ?? [];

  // Recalculate whenever the number of teams changes (data load)
  const flagSize = useMemo(() => calcFlagSize(allTeams.length), [allTeams.length]);

  return (
    <div className="home">
      {/* Decorative flag wall — one flag per team, sized to fill the viewport */}
      {allTeams.length > 0 && (
        <div className="home__flag-wall">
          {allTeams.map((team, i) => (
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
