function OracleLanding({ onBuild }) {
  return (
    <div className="oracle-landing">
      <div className="oracle-landing__glow" />
      <h1 className="oracle-landing__title">🔮 Oracle Duel</h1>
      <p className="oracle-landing__sub">
        Answer 3 questions to build your prediction algorithm.<br />
        It battles Groq AI on every match — pick a side, earn points.
      </p>

      <div className="oracle-landing__versus">
        <span className="oracle-landing__versus-side oracle-landing__versus-side--algo">
          ⚙️ <strong>Your Oracle</strong>
          <em>built by you</em>
        </span>
        <span className="oracle-landing__versus-divider">⚡</span>
        <span className="oracle-landing__versus-side oracle-landing__versus-side--ai">
          🤖 <strong>Groq AI</strong>
          <em>independent AI</em>
        </span>
      </div>

      <button className="oracle-landing__build-btn" onClick={onBuild}>
        ⚙️ Build Your Oracle
      </button>
    </div>
  );
}

export default OracleLanding;
