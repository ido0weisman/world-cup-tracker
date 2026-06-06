import { useFetch } from '../../hooks/useFetch';
import { getMatchesToday } from '../../api/matches.api';
import MatchCard from '../../components/ui/MatchCard';
import { MatchCardSkeleton } from '../../components/ui/Skeleton';
import './MatchesToday.css';

function MatchesToday() {
  const { data, loading, error } = useFetch(getMatchesToday);

  return (
    <div className="matches-page">
      <h1 className="matches-page__title">Today's Matches</h1>
      <p className="matches-page__sub">
        {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {error && <p className="matches-page__error">{error}</p>}

      {!loading && !error && data?.matches?.length === 0 && (
        <div className="matches-page__empty">
          <span>😴</span>
          <p>No matches scheduled for today. Enjoy the rest!</p>
        </div>
      )}

      <div className="matches-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <MatchCardSkeleton key={i} />)
          : data?.matches?.map(match => <MatchCard key={match.id} match={match} />)
        }
      </div>
    </div>
  );
}

export default MatchesToday;
