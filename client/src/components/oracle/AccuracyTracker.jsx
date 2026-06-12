function AccuracyTracker({ accuracy, profileName }) {
  const pct = ({ wins, total }) =>
    total > 0 ? Math.round((wins / total) * 100) : null;

  const algoPct = pct(accuracy.algorithm);
  const aiPct   = pct(accuracy.ai);

  return (
    <div className="oracle-accuracy">
      <h3 className="oracle-accuracy__title">📊 Oracle Records</h3>
      <div className="oracle-accuracy__cards">
        <div className="oracle-accuracy__card oracle-accuracy__card--algo">
          <p className="oracle-accuracy__name">⚙️ {profileName ?? 'Your Oracle'}</p>
          <p className="oracle-accuracy__record">
            {accuracy.algorithm.wins}W · {accuracy.algorithm.losses}L
            {algoPct != null && <span className="oracle-accuracy__pct"> · {algoPct}%</span>}
          </p>
          {accuracy.algorithm.total === 0 && (
            <p className="oracle-accuracy__empty">No completed matches yet</p>
          )}
        </div>
        <div className="oracle-accuracy__card oracle-accuracy__card--ai">
          <p className="oracle-accuracy__name">🤖 Groq AI</p>
          <p className="oracle-accuracy__record">
            {accuracy.ai.wins}W · {accuracy.ai.losses}L
            {aiPct != null && <span className="oracle-accuracy__pct"> · {aiPct}%</span>}
          </p>
          {accuracy.ai.total === 0 && (
            <p className="oracle-accuracy__empty">No AI predictions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccuracyTracker;
