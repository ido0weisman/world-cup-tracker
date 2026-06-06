import './StatusBadge.css';

const LABELS = {
  FINISHED:  'Full Time',
  LIVE:      'Live',
  SCHEDULED: 'Scheduled',
  TIMED:     'Scheduled',
};

function StatusBadge({ status }) {
  const label = LABELS[status] || status;
  return (
    <span className={`status-badge status-badge--${status?.toLowerCase()}`}>
      {status === 'LIVE' && <span className="status-badge__dot" />}
      {label}
    </span>
  );
}

export default StatusBadge;
