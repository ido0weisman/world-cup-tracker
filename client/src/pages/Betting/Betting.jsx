import { Routes, Route, useNavigate } from 'react-router-dom';
import GroupBetting from './GroupBetting';
import KnockoutBetting from './KnockoutBetting';
import TopScorer from './TopScorer';
import Leaderboard from './Leaderboard';
import './Betting.css';

const TILES = [
  {
    path:    'groups',
    icon:    '📊',
    title:   'Group Stage',
    desc:    'Pick 2 teams per group to advance. Locked on June 15.',
    color:   '#1a6b3c',
  },
  {
    path:    'knockout',
    icon:    '🥊',
    title:   'Knockout Rounds',
    desc:    'Predict the winner of each match. Locks 1 hour before kickoff.',
    color:   '#1a3a6b',
  },
  {
    path:    'top-scorer',
    icon:    '⚽',
    title:   'Top Scorer',
    desc:    'Pick the player who will score the most goals. Locked on June 15.',
    color:   '#6b1a1a',
  },
  {
    path:    'leaderboard',
    icon:    '🏅',
    title:   'Leaderboard',
    desc:    'See the top 25 predictors and where you rank.',
    color:   '#5a1a6b',
  },
];

function BettingHub() {
  const navigate = useNavigate();
  return (
    <div>
      <h1 className="betting__title">Betting Hub</h1>
      <p className="betting__sub">Select a category to place or view your predictions</p>
      <div className="betting-tiles">
        {TILES.map(tile => (
          <div
            key={tile.path}
            className="betting-tile"
            style={{ '--tile-color': tile.color }}
            onClick={() => navigate(tile.path)}
          >
            <span className="betting-tile__icon">{tile.icon}</span>
            <h2 className="betting-tile__title">{tile.title}</h2>
            <p className="betting-tile__desc">{tile.desc}</p>
            <span className="betting-tile__cta">Go →</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// The /betting route uses nested routing — each tile navigates to a sub-path
function Betting() {
  return (
    <Routes>
      <Route index        element={<BettingHub />} />
      <Route path="groups"      element={<GroupBetting />} />
      <Route path="knockout"    element={<KnockoutBetting />} />
      <Route path="top-scorer"  element={<TopScorer />} />
      <Route path="leaderboard" element={<Leaderboard />} />
    </Routes>
  );
}

export default Betting;
