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

function Home() {
  const navigate = useNavigate();
  const { data } = useFetch(getAllGroups);

  const allTeams = data?.groups?.flatMap(g => g.standings.map(s => s.team)) ?? [];

  return (
    <div className="home">
      {/* Decorative flag wall — renders once teams are loaded */}
      {allTeams.length > 0 && (
        <div className="home__flag-wall">
          {[...allTeams, ...allTeams].map((team, i) => (
            team.flag_url && (
              <img
                key={i}
                src={team.flag_url}
                alt={team.name}
                className="home__flag-item"
              />
            )
          ))}
        </div>
      )}

      {/* Hero */}
      <div className="home__hero">
        <p className="home__eyebrow">⚽ FIFA • USA • CANADA • MEXICO • 2026</p>
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
