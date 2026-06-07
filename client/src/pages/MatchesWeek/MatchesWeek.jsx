import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getMatchesThisWeek, getAllMatches } from '../../api/matches.api';
import MatchCard from '../../components/ui/MatchCard';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import { getTimezoneForCountry } from '../../utils/timezone';
import '../../pages/MatchesToday/MatchesToday.css';

// Groups matches by their local date string for the "by day" layout,
// respecting the user's registered country timezone.
function groupByDate(matches, timezone) {
  const tzOpts = timezone ? { timeZone: timezone } : {};
  return matches.reduce((acc, match) => {
    const day = new Date(match.match_date).toLocaleDateString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long', ...tzOpts,
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(match);
    return acc;
  }, {});
}

function MatchesWeek() {
  const [showAll, setShowAll] = useState(false);

  const { data, loading, error } = useFetch(
    showAll ? getAllMatches : getMatchesThisWeek,
    [showAll]
  );
  const { user } = useAuth();
  const timezone = getTimezoneForCountry(user?.country);

  const grouped = data?.matches ? groupByDate(data.matches, timezone) : {};
  const matchCount = data?.matches?.length ?? 0;

  return (
    <div className="matches-page">
      <h1 className="matches-page__title">
        {showAll ? '🌍 Full Tournament Schedule' : "This Week's Matches"}
      </h1>
      <p className="matches-page__sub">
        {showAll
          ? `Every match of the 2026 World Cup${matchCount ? ` — all ${matchCount} games` : ''}`
          : 'Next 7 days'}
      </p>

      <button
        type="button"
        className="btn btn--outline"
        onClick={() => setShowAll(s => !s)}
        style={{ marginBottom: '1.75rem' }}
      >
        {showAll ? '📅 Back to This Week' : '🌍 Show the entire tournament schedule (all matches)'}
      </button>

      {loading && <Spinner message={showAll ? 'Loading the full tournament schedule…' : "Loading this week's matches…"} />}
      {error   && <p className="matches-page__error">{error}</p>}

      {!loading && !error && matchCount === 0 && (
        <div className="matches-page__empty">
          <span>📅</span>
          <p>{showAll ? 'No matches found.' : 'No matches scheduled this week.'}</p>
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
