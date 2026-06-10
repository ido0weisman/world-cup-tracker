import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getAllMatches } from '../../api/matches.api';
import MatchCard from '../../components/ui/MatchCard';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import { useFavouriteMatches } from '../../hooks/useFavouriteMatches';
import { getTimezoneForCountry, MATCH_LOCALE } from '../../utils/timezone';
import './MatchesWeek.css';
import '../../pages/MatchesToday/MatchesToday.css';

const TABS = [
  { id: 'week',     label: '📅 This Week'           },
  { id: 'schedule', label: '🌍 Tournament Schedule'  },
  { id: 'played',   label: '✅ Games Played'         },
];

const STAGE_LABELS = {
  GROUP: 'Group Stage', R32: 'Round of 32', R16: 'Round of 16',
  QF: 'Quarter Finals', SF: 'Semi Finals',  FINAL: 'Final',
};
const STAGE_ORDER = ['GROUP', 'R32', 'R16', 'QF', 'SF', 'FINAL'];

function describeStages(matches) {
  if (!matches?.length) return null;
  const present = new Set(matches.map(m => m.stage));
  const ordered = STAGE_ORDER.filter(s => present.has(s));
  return ordered.map(s => STAGE_LABELS[s] ?? s).join(' · ');
}

function groupByDate(matches, timezone, reverse = false) {
  const tzOpts = timezone ? { timeZone: timezone } : {};
  const grouped = matches.reduce((acc, match) => {
    const day = new Date(match.match_date).toLocaleDateString(MATCH_LOCALE, {
      weekday: 'long', day: 'numeric', month: 'long', ...tzOpts,
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(match);
    return acc;
  }, {});

  // Played tab: reverse so most recent results appear at the top
  return reverse ? Object.fromEntries(Object.entries(grouped).reverse()) : grouped;
}

function MatchesWeek() {
  const [activeTab, setActiveTab] = useState('week');

  const { data, loading, error } = useFetch(getAllMatches, []);
  const { user } = useAuth();
  const { toggle, isFavourite } = useFavouriteMatches();
  const timezone = getTimezoneForCountry(user?.country);

  const { week, schedule, played } = useMemo(() => {
    const all = data?.matches ?? [];
    const now         = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    return {
      // This week: non-finished matches kicking off within the next 7 days
      week:     all.filter(m => m.status !== 'FINISHED' && new Date(m.match_date).getTime() <= weekFromNow),
      // Full schedule: all non-finished matches
      schedule: all.filter(m => m.status !== 'FINISHED'),
      // Played: all finished matches
      played:   all.filter(m => m.status === 'FINISHED'),
    };
  }, [data]);

  const COUNTS = { week: week.length, schedule: schedule.length, played: played.length };

  const activeMatches = { week, schedule, played }[activeTab];
  const grouped       = groupByDate(activeMatches, timezone, activeTab === 'played');
  const stagesLabel   = describeStages(activeMatches);

  const emptyMessages = {
    week:     { icon: '📅', text: 'No matches scheduled this week.' },
    schedule: { icon: '📅', text: 'No upcoming matches.'            },
    played:   { icon: '⏳', text: 'No matches played yet.'          },
  };

  return (
    <div className="matches-page">
      <h1 className="matches-page__title">Schedule</h1>
      <p className="matches-page__sub">All 104 matches of the 2026 World Cup</p>

      <div className="schedule-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`schedule-tab ${activeTab === tab.id ? 'schedule-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {!loading && (
              <span className="schedule-tab__count">{COUNTS[tab.id]}</span>
            )}
          </button>
        ))}
      </div>

      {stagesLabel && (
        <p className="matches-page__stage-badge">🏆 {stagesLabel}</p>
      )}

      {loading && <Spinner message="Loading matches…" />}
      {error   && <p className="matches-page__error">{error}</p>}

      {!loading && !error && activeMatches.length === 0 && (
        <div className="matches-page__empty">
          <span>{emptyMessages[activeTab].icon}</span>
          <p>{emptyMessages[activeTab].text}</p>
        </div>
      )}

      {Object.entries(grouped).map(([day, matches]) => (
        <div key={day} style={{ marginBottom: '2rem' }}>
          <h2 className="schedule-day-header">{day}</h2>
          <div className="matches-grid">
            {matches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                isFavourite={isFavourite(match.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MatchesWeek;
