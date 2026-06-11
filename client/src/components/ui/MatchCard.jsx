import StatusBadge from './StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getTimezoneForCountry, MATCH_LOCALE } from '../../utils/timezone';
import './MatchCard.css';

// Maps WC 2026 venue names → host city + country label.
// Stadium name is already shown separately, so location shows city + country for context.
const VENUE_MAP = [
  // 🇺🇸 USA
  { keywords: ['MetLife', 'New Jersey', 'East Rutherford'], city: 'New York',       country: '🇺🇸 USA' },
  { keywords: ['AT&T', 'Arlington', 'Dallas'],              city: 'Dallas',         country: '🇺🇸 USA' },
  { keywords: ['SoFi', 'Inglewood'],                        city: 'Los Angeles',    country: '🇺🇸 USA' },
  { keywords: ['Rose Bowl', 'Pasadena'],                    city: 'Los Angeles',    country: '🇺🇸 USA' },
  { keywords: ["Levi's", 'Levi', 'Santa Clara'],            city: 'San Francisco',  country: '🇺🇸 USA' },
  { keywords: ['Lincoln Financial', 'Philadelphia'],        city: 'Philadelphia',   country: '🇺🇸 USA' },
  { keywords: ['Gillette', 'Foxborough', 'Boston'],         city: 'Boston',         country: '🇺🇸 USA' },
  { keywords: ['Allegiant', 'Las Vegas'],                   city: 'Las Vegas',      country: '🇺🇸 USA' },
  { keywords: ['Arrowhead', 'Kansas City'],                 city: 'Kansas City',    country: '🇺🇸 USA' },
  { keywords: ['Hard Rock', 'Miami'],                       city: 'Miami',          country: '🇺🇸 USA' },
  { keywords: ['Lumen', 'Seattle'],                         city: 'Seattle',        country: '🇺🇸 USA' },
  { keywords: ['Mercedes-Benz', 'Atlanta'],                 city: 'Atlanta',        country: '🇺🇸 USA' },
  // 🇲🇽 Mexico
  { keywords: ['Azteca', 'Mexico City'],                    city: 'Mexico City',    country: '🇲🇽 Mexico' },
  { keywords: ['Akron', 'Guadalajara'],                     city: 'Guadalajara',    country: '🇲🇽 Mexico' },
  { keywords: ['BBVA', 'Monterrey'],                        city: 'Monterrey',      country: '🇲🇽 Mexico' },
  // 🇨🇦 Canada
  { keywords: ['BC Place', 'Vancouver'],                    city: 'Vancouver',      country: '🇨🇦 Canada' },
  { keywords: ['BMO', 'Toronto'],                           city: 'Toronto',        country: '🇨🇦 Canada' },
];

function getLocation(stadium) {
  if (!stadium) return null;
  const text = stadium.toLowerCase();
  for (const entry of VENUE_MAP) {
    if (entry.keywords.some(k => text.includes(k.toLowerCase()))) {
      return { city: entry.city, country: entry.country };
    }
  }
  return null;
}

// Builds a Google Calendar "add event" URL from a match object.
// Dates must be in YYYYMMDDTHHmmssZ format (UTC).
function toGCalDate(utcString) {
  return utcString.replace(/[-:]/g, '').replace('.000', '');
}

function buildCalendarUrl(match) {
  const home  = match.home_team?.name ?? 'TBD';
  const away  = match.away_team?.name ?? 'TBD';
  const start = toGCalDate(match.match_date);

  // Add 2 hours for the end time
  const endDate = new Date(new Date(match.match_date).getTime() + 2 * 60 * 60 * 1000);
  const end     = toGCalDate(endDate.toISOString());

  const title    = `${home} vs ${away} — FIFA World Cup 2026`;
  const details  = `${match.stage} match at ${match.stadium ?? 'TBD'}`;
  const location = match.stadium ?? '';

  const params = new URLSearchParams({
    action:   'TEMPLATE',
    text:     title,
    dates:    `${start}/${end}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

function formatDate(utcString, timezone) {
  const d = new Date(utcString);
  const tzOpts = timezone ? { timeZone: timezone } : {};
  return {
    date: d.toLocaleDateString(MATCH_LOCALE, { weekday: 'short', day: 'numeric', month: 'short', ...tzOpts }),
    time: d.toLocaleTimeString(MATCH_LOCALE, { hour: '2-digit', minute: '2-digit', ...tzOpts }),
  };
}

// Returns the status the UI should display.
// The DB only stores SCHEDULED/LIVE/FINISHED; we don't poll for live updates,
// so if a match's kickoff was within the last 110 minutes we show LIVE locally.
function computeDisplayStatus(match) {
  if (match.status === 'FINISHED' || match.status === 'LIVE' || match.status === 'IN_PLAY') return match.status;
  // football-data.org uses 'TIMED' for upcoming matches (same as SCHEDULED)
  if ((match.status === 'TIMED' || match.status === 'SCHEDULED') && match.match_date) {
    const kickoff = new Date(match.match_date).getTime();
    const now     = Date.now();
    if (now >= kickoff && now <= kickoff + 110 * 60 * 1000) return 'LIVE';
  }
  return match.status;
}

function MatchCard({ match, isFavourite = false, onToggle }) {
  const { user } = useAuth();
  const timezone = getTimezoneForCountry(user?.country);
  const { date, time } = formatDate(match.match_date, timezone);
  const displayStatus = computeDisplayStatus(match);
  const isFinished    = displayStatus === 'FINISHED';
  const location      = getLocation(match.stadium);
  const home = match.home_team;
  const away = match.away_team;

  function handleCardClick() {
    onToggle?.(match.id);
  }

  return (
    <div
      className={`match-card${isFavourite ? ' match-card--favourite' : ''}`}
      onClick={handleCardClick}
      style={{ cursor: onToggle ? 'pointer' : 'default' }}
    >
      {isFavourite && <span className="match-card__fav-badge">⭐</span>}
      <div className="match-card__header">
        <span className="match-card__stage">{match.stage}</span>
        <StatusBadge status={displayStatus} />
      </div>

      <div className="match-card__body">
        {/* Home team */}
        <div className="match-card__team match-card__team--home">
          {home?.flag_url && <img src={home.flag_url} alt={home?.name} className="match-card__flag" />}
          <span className="match-card__name">{home?.name ?? 'TBD'}</span>
        </div>

        {/* Center: score or time */}
        <div className="match-card__center">
          {isFinished ? (
            <div className="match-card__score-block">
              <span className="match-card__score">{match.home_score}</span>
              <span className="match-card__sep">–</span>
              <span className="match-card__score">{match.away_score}</span>
            </div>
          ) : (
            <span className="match-card__time">{time}</span>
          )}
        </div>

        {/* Away team */}
        <div className="match-card__team match-card__team--away">
          <span className="match-card__name">{away?.name ?? 'TBD'}</span>
          {away?.flag_url && <img src={away.flag_url} alt={away?.name} className="match-card__flag" />}
        </div>
      </div>

      <div className="match-card__footer">
        <span>📅 {date}</span>
        {location && <span>📍 {location.city}, {location.country}</span>}
        {match.stadium && <span>🏟️ {match.stadium}</span>}
        {!isFinished && (
          <a
            href={buildCalendarUrl(match)}
            target="_blank"
            rel="noopener noreferrer"
            className="match-card__cal-btn"
            onClick={e => e.stopPropagation()} // prevent favourite toggle when clicking cale