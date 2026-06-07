import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getLeaderboard } from '../../api/bets.api';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import './Betting.css';
import './Leaderboard.css';

function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error } = useFetch(getLeaderboard);
  const [showScoring, setShowScoring] = useState(false);

  return (
    <div>
      <button className="betting-back" onClick={() => navigate('/betting')}>← Back</button>

      <div className="leaderboard__title-row">
        <h1 style={{ color: 'var(--color-gold)', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
          🏅 Leaderboard
        </h1>
        <button
          type="button"
          className="leaderboard__info-btn"
          onClick={() => setShowScoring(s => !s)}
          aria-expanded={showScoring}
        >
          ℹ️ How is the score calculated?
        </button>
      </div>

      {showScoring && (
        <div className="leaderboard__scoring-panel">
          <h2 className="leaderboard__scoring-title">How points are earned</h2>
          <ul className="leaderboard__scoring-list">
            <li><strong>Group stage —</strong> 5 pts for each of your two picks that finishes in the top 2 of its group (10 pts max per group, once the group has kicked off).</li>
            <li><strong>Round of 32 —</strong> 2 pts for each correct match winner.</li>
            <li><strong>Round of 16 —</strong> 3 pts for each correct match winner.</li>
            <li><strong>Quarter-finals —</strong> 5 pts for each correct match winner.</li>
            <li><strong>Semi-finals —</strong> 8 pts for each correct match winner.</li>
            <li><strong>Final —</strong> 15 pts for the correct winner.</li>
            <li><strong>Top scorer —</strong> 20 pts if you predict both the player and their team correctly.</li>
          </ul>
          <p className="leaderboard__scoring-note">
            Your total is the sum of all four categories — Groups, Knockout, Top Scorer — and updates live as
            results come in.
          </p>
        </div>
      )}

      {loading && <Spinner message="Loading leaderboard…" />}
      {error   && <p style={{ color: '#f87171' }}>{error}</p>}

      {!loading && !error && (
        <div className="leaderboard">
          <div className="leaderboard__header-row">
            <span>#</span>
            <span>Player</span>
            <span>Groups</span>
            <span>Knockout</span>
            <span>Top Scorer</span>
            <span>Total</span>
          </div>
          {data?.leaderboard?.map(row => (
            <div
              key={row.id}
              className={`leaderboard__row ${row.id === user?.id ? 'leaderboard__row--me' : ''}`}
            >
              <span className="leaderboard__rank">
                {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
              </span>
              <span className="leaderboard__name">
                {row.full_name}
                {row.id === user?.id && <span className="leaderboard__you"> (You)</span>}
              </span>
              <span>{row.group_points}</span>
              <span>{row.knockout_points}</span>
              <span>{row.top_scorer_points}</span>
              <span className="leaderboard__total">{row.total_points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
