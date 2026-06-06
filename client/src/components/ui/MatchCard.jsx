import StatusBadge from './StatusBadge';
import './MatchCard.css';

// Formats a UTC date string into a readable local date + time
function formatDate(utcString) {
  const d = new Date(utcString);
  return {
    date: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

function TeamSide({ team, score, align }) {
  return (
    <div className={`match-card__team match-card__team--${align}`}>
      {team?.flag_url && (
        <img src={team.flag_url} alt={team.name} className="match-card__flag" />
      )}
      <span className="match-card__team-name">{team?.name ?? 'TBD'}</span>
      <span className="match-card__score">{score ?? '-'}</span>
    </div>
  );
}

function MatchCard({ match }) {
  const { date, time } = formatDate(match.match_date);
  const isFinished = match.status === 'FINISHED';

  return (
    <div className="match-card">
      <div className="match-card__header">
        <span className="match-card__stage">{match.stage}</span>
        <StatusBadge status={match.status} />
      </div>

      <div className="match-card__body">
        <TeamSide team={match.home_team} score={isFinished ? match.home_score : null} align="left" />
        <div className="match-card__center">
          {isFinished
            ? <span className="match-card__vs">FT</span>
            : <span className="match-card__time">{time}</span>
          }
        </div>
        <TeamSide team={match.away_team} score={isFinished ? match.away_score : null} align="right" />
      </div>

      <div className="match-card__footer">
        <span>📅 {date}</span>
        {match.stadium && <span>🏟️ {match.stadium}</span>}
        {match.city    && <span>📍 {match.city}</span>}
      </div>
    </div>
  );
}

export default MatchCard;
