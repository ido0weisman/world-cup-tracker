import StatusBadge from './StatusBadge';
import './MatchCard.css';

// Maps WC 2026 venue names → specific city + country.
// Checked against the official 2026 host city list.
const VENUE_MAP = [
  // 🇺🇸 USA
  { keywords: ['MetLife', 'New Jersey', 'East Rutherford'], location: '🇺🇸 New York / New Jersey' },
  { keywords: ['AT&T', 'Arlington', 'Dallas'],              location: '🇺🇸 Dallas, USA'           },
  { keywords: ['SoFi', 'Inglewood'],                        location: '🇺🇸 Los Angeles, USA'      },
  { keywords: ['Rose Bowl', 'Pasadena'],                    location: '🇺🇸 Los Angeles, USA'      },
  { keywords: ["Levi's", 'Levi', 'Santa Clara'],            location: '🇺🇸 San Francisco, USA'    },
  { keywords: ['Lincoln Financial', 'Philadelphia'],        location: '🇺🇸 Philadelphia, USA'     },
  { keywords: ['Gillette', 'Foxborough', 'Boston'],         location: '🇺🇸 Boston, USA'           },
  { keywords: ['Allegiant', 'Las Vegas'],                   location: '🇺🇸 Las Vegas, USA'        },
  { keywords: ['Arrowhead', 'Kansas City'],                 location: '🇺🇸 Kansas City, USA'      },
  { keywords: ['Hard Rock', 'Miami'],                       location: '🇺🇸 Miami, USA'            },
  { keywords: ['Lumen', 'Seattle'],                         location: '🇺🇸 Seattle, USA'          },
  { keywords: ['Mercedes-Benz', 'Atlanta'],                 location: '🇺🇸 Atlanta, USA'          },
  // 🇲🇽 Mexico
  { keywords: ['Azteca', 'Mexico City'],                    location: '🇲🇽 Mexico City, Mexico'   },
  { keywords: ['Akron', 'Guadalajara'],                     location: '🇲🇽 Guadalajara, Mexico'   },
  { keywords: ['BBVA', 'Monterrey'],                        location: '🇲🇽 Monterrey, Mexico'     },
  // 🇨🇦 Canada
  { keywords: ['BC Place', 'Vancouver'],                    location: '🇨🇦 Vancouver, Canada'     },
  { keywords: ['BMO', 'Toronto'],                           location: '🇨🇦 Toronto, Canada'       },
];

function getLocation(stadium) {
  if (!stadium) return null;
  const text = stadium.toLowerCase();
  for (const { keywords, location } of VENUE_MAP) {
    if (keywords.some(k => text.includes(k.toLowerCase()))) return location;
  }
  return null;
}

function formatDate(utcString) {
  const d = new Date(utcString);
  return {
    date: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

function MatchCard({ match }) {
  const { date, time } = formatDate(match.match_date);
  const isFinished = match.status === 'FINISHED';
  const location   = getLocation(match.stadium);
  const home = match.home_team;
  const away = match.away_team;

  return (
    <div className="match-card">
      <div className="match-card__header">
        <span className="match-card__stage">{match.stage}</span>
        <StatusBadge status={match.status} />
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
        {match.stadium && <span>🏟️ {match.stadium}</span>}
        {location && <span>📍 {location}</span>}
      </div>
    </div>
  );
}

export default MatchCard;
