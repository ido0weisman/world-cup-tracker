import { useFetch } from '../../hooks/useFetch';
import { getMatchesThisWeek } from '../../api/matches.api';
import MatchCard from '../../components/ui/MatchCard';
import Spinner from '../../components/ui/Spinner';
import '../../pages/MatchesToday/MatchesToday.css';

// Groups matches by their local date string for the "by day" layout
function groupByDate(matches) {
  return matches.reduce((acc, match) => {
    const day = new Date(match.match_date).toLocaleDateString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(match);
    return acc;
  }, {});
}

function MatchesWeek() {
  const { data, loading, error } = useFetch(getMatchesThisWeek);

  const grouped = data?.matches ? groupByDate(data.matches) : {};

  return (
    <div className="matches-page">
      <h1 className="matches-page__title">This Week's Matches</h1>
      <p className="matches-page__sub">Next 7 days</p>

      {loading && <Spinner message="Loading this week's matches…" />}
      {error   && <p className="matches-page__error">{error}</p>}

      {!loading && !error && data?.matches?.length === 0 && (
        <div className="matches-page__empty">
          <span>📅</span>
          <p>No matches scheduled this week.</p>
        </div>
      )}

      {Object.entries(grouped).map(([day, matches]) => (
        <div key={day} style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {day}
          </h2>
          <div className="matches-grid">
            {matches.map(match => <MatchCard key={match.id} match={match} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MatchesWeek;
