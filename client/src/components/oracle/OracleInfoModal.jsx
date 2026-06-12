import { NAMES_BY_GROUP } from './oracleData';

function OracleInfoModal({ onClose }) {
  return (
    <div className="oracle-info-overlay" onClick={onClose}>
      <div className="oracle-info-modal" onClick={e => e.stopPropagation()}>
        <button className="oracle-info-modal__close" onClick={onClose}>✕</button>

        <h2 className="oracle-info-modal__title">⚔️ How Oracle Duel Works</h2>

        {/* The two oracles */}
        <div className="oracle-info-section">
          <div className="oracle-info-oracles">
            <div className="oracle-info-oracle oracle-info-oracle--algo">
              <span className="oracle-info-oracle__icon">⚙️</span>
              <div>
                <strong>Your Oracle</strong>
                <p>Built from your 3 card choices. It weighs FIFA rankings, current form, goals quality, and bookmaker odds — according to your philosophy. 27 possible personalities.</p>
              </div>
            </div>
            <div className="oracle-info-oracle oracle-info-oracle--ai">
              <span className="oracle-info-oracle__icon">🤖</span>
              <div>
                <strong>Groq AI</strong>
                <p>An independent LLM analyst (Llama 3.3 70B). It predicts every match fresh each morning with no knowledge of your Oracle's choices — a true rival.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div className="oracle-info-section">
          <h3 className="oracle-info-section__title">⚡ Points Per Correct Bet</h3>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>
            Points depend on how confident the AI was — not on oracle agreement.
          </p>
          <div className="oracle-info-scoring">
            <div className="oracle-info-score">
              <span className="oracle-info-score__mult oracle-info-score__mult--agree">3 pts</span>
              <span>AI ≥ 70% confident — you backed the AI's pick (Group / R32)</span>
            </div>
            <div className="oracle-info-score">
              <span className="oracle-info-score__mult oracle-info-score__mult--algo">6 pts</span>
              <span>AI under 70% confident — you backed the AI's pick (Group / R32)</span>
            </div>
            <div className="oracle-info-score">
              <span className="oracle-info-score__mult oracle-info-score__mult--algo">8 pts</span>
              <span>AI under 70% confident — you went against the AI (Group / R32)</span>
            </div>
            <div className="oracle-info-score">
              <span className="oracle-info-score__mult oracle-info-score__mult--defy">12 pts</span>
              <span>AI ≥ 70% confident — you defied the AI and were right (Group / R32)</span>
            </div>
            <div className="oracle-info-score" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                Points scale up in later rounds. The badge on each match card shows exact pts for that game.
              </span>
            </div>
          </div>
        </div>

        {/* All 27 oracle names */}
        <div className="oracle-info-section">
          <h3 className="oracle-info-section__title">🔮 All 27 Oracle Names</h3>
          <p className="oracle-info-names-hint">Your name is determined by your 3 card choices when you build your Oracle.</p>
          {NAMES_BY_GROUP.map(group => (
            <div key={group.strength} className="oracle-info-names-group">
              <h4 className="oracle-info-names-group__title">
                {group.strength} <span>— {group.desc}</span>
              </h4>
              <div className="oracle-info-names-grid">
                {group.names.map(n => (
                  <div key={n.name} className="oracle-info-name-row">
                    <strong className="oracle-info-name-row__name">{n.name}</strong>
                    <span className="oracle-info-name-row__tags">
                      {n.market} · {n.upset}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OracleInfoModal;
