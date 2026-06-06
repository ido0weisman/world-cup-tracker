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

  return (
    <div>
      <button className="betting-back" onClick={() => navigate('/betting')}>← Back</button>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>
        🏅 Leaderboard
      </h1>

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
