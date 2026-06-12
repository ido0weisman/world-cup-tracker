import { useState, useEffect } from 'react';
import { submitOracleBet, getOracleBet } from '../../api/oracle.api';
import { useToast } from '../../context/ToastContext';
import GlowOrb from './GlowOrb';

function MatchDuelCard({ item, existingBet, onBetPlaced, profile }) {
  const { match, prediction } = item;
  const { addToast }          = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [localBet, setLocalBet]     = useState(existingBet);

  // useState only reads its argument on the FIRST render — if the parent
  // refreshes the bets map later (e.g. after scoring updates), the new
  // existingBet prop would be silently ignored without this sync.
  useEffect(() => {
    setLocalBet(existingBet);
  }, [existingBet]);

  const algoPred     = prediction.algorithm;
  const aiPred       = prediction.ai;
  const aiConfidence = prediction.ai_confidence ?? null;

  // Point tiers and lock state are computed by the SERVER (same code that
  // scores the bets) — this component only displays them.
  const points     = prediction.points;
  const isLocked   = match.is_locked;
  const isFinished = match.status === 'FINISHED';

  // Which team does the AI favour? (display only)
  const aiBacksHome  = aiPred ? aiPred.home_prob >= aiPred.away_prob : null;
  const aiPickedTeam = aiPred
    ? (aiBacksHome ? match.home_team_name : match.away_team_name)
    : null;

  async function placeBet(pickedTeamId) {
    setSubmitting(true);
    try {
      await submitOracleBet({ match_id: match.id, picked_winner_id: pickedTeamId });
      const updated = await getOracleBet(match.id);
      setLocalBet(updated.bet);
      addToast('Oracle bet placed!', 'success');
      onBetPlaced?.();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to place bet.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Derive picked team name from existing bet for display
  const pickedName = localBet
    ? (localBet.picked_winner_id === match.home_team_id ? match.home_team_name : match.away_team_name)
    : null;

  return (
    <div className="duel-card">
      <div className="duel-card__stage">{match.stage}</div>

      {/* Teams header */}
      <div className="duel-card__teams">
        <div className="duel-card__team">
          {match.home_flag && <img src={match.home_flag} alt={match.home_team_name} className="duel-card__flag" />}
          <span>{match.home_team_name}</span>
        </div>
        <span className="duel-card__vs">VS</span>
        <div className="duel-card__team duel-card__team--away">
          <span>{match.away_team_name}</span>
          {match.away_flag && <img src={match.away_flag} alt={match.away_team_name} className="duel-card__flag" />}
        </div>
      </div>

      {/* ── Side-by-side Oracle Duel ── */}
      <div className="duel-card__oracle-cols">

        {/* Your Oracle — left column */}
        <div className="duel-card__oracle-col duel-card__oracle-col--algo">
          <p className="duel-card__col-header">⚙️ {profile?.oracle_name ?? 'Your Oracle'}</p>
          <GlowOrb prob={algoPred.home_prob} color="gold"   label={match.home_team_name} flag={match.home_flag} />
          <GlowOrb prob={algoPred.away_prob} color="gold"   label={match.away_team_name} flag={match.away_flag} />
        </div>

        {/* VS divider */}
        <div className="duel-card__col-divider"><span>VS</span></div>

        {/* Groq AI — right column */}
        <div className="duel-card__oracle-col duel-card__oracle-col--ai">
          <p className="duel-card__col-header">🤖 Groq AI</p>
          {aiPred ? (
            <>
              <GlowOrb prob={aiPred.home_prob} color="purple" label={match.home_team_name} flag={match.home_flag} />
              <GlowOrb prob={aiPred.away_prob} color="purple" label={match.away_team_name} flag={match.away_flag} />
            </>
          ) : (
            <div className="duel-card__ai-pending">
              ⏳ Prediction pending
              <span>Runs nightly at 06:00 UTC</span>
            </div>
          )}
        </div>

      </div>

      {/* AI confidence badge — point tiers come straight from the server */}
      {aiPred && (
        <div className={`duel-card__confidence ${points.is_high_confidence ? 'duel-card__confidence--high' : 'duel-card__confidence--low'}`}>
          <span className="duel-card__confidence-label">
            🤖 AI is <strong>{aiConfidence}%</strong> confident — {aiPickedTeam} favoured
          </span>
          <span className="duel-card__confidence-tiers">
            Back AI: {points.with_ai} pts  ·  Defy: {points.against_ai} pts
          </span>
        </div>
      )}

      {/* Bet section — two team buttons with dynamic point labels */}
      {!isFinished && !isLocked && profile && (
        <div className="duel-card__bet-section">
          <p className="duel-card__bet-label">
            {localBet ? '🔄 Change your pick:' : 'Pick a winner:'}
          </p>
          <div className="duel-card__bet-buttons">
            {[
              { teamId: match.home_team_id, name: match.home_team_name, flag: match.home_flag, aibacks: aiBacksHome === true },
              { teamId: match.away_team_id, name: match.away_team_name, flag: match.away_flag, aibacks: aiBacksHome === false },
            ].map(team => {
              const pts = !aiPred ? points.base : team.aibacks ? points.with_ai : points.against_ai;
              return (
                <button
                  key={team.teamId}
                  className={`btn btn--oracle-team ${team.aibacks ? 'btn--oracle-team--with-ai' : 'btn--oracle-team--against-ai'}`}
                  disabled={submitting}
                  onClick={() => placeBet(team.teamId)}
                >
                  <span className="duel-card__bet-team">
                    {team.flag && <img src={team.flag} alt={team.name} className="duel-card__flag" />}
                    {team.name}
                    {team.aibacks && <span className="duel-card__ai-pick">🤖</span>}
                  </span>
                  <span className="duel-card__bet-pts">{pts} pts</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Existing bet — always shown once placed */}
      {localBet && (
        <div className="duel-card__existing-bet">
          <span>{isLocked || isFinished ? 'Your bet: ' : 'Current: '}</span>
          <strong>{pickedName}</strong>
          <span className={`duel-card__sided ${localBet.sided_with === 'with_ai' ? 'duel-card__sided--with' : localBet.sided_with === 'against_ai' ? 'duel-card__sided--against' : ''}`}>
            {localBet.sided_with === 'with_ai' ? ' · with AI' : localBet.sided_with === 'against_ai' ? ' · defied AI' : ''}
          </span>
          {localBet.is_correct === 1 && <span className="duel-card__result duel-card__result--win"> ✓ Correct</span>}
          {localBet.is_correct === 0 && <span className="duel-card__result duel-card__result--loss"> ✗ Wrong</span>}
        </div>
      )}

      {(isLocked && !localBet) && (
        <p className="duel-card__locked">🔒 Predictions closed</p>
      )}
    </div>
  );
}

export default MatchDuelCard;
