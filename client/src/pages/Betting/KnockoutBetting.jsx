import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getKnockoutBracket } from '../../api/knockout.api';
import { getKnockoutBets, submitKnockoutBet } from '../../api/bets.api';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { getMatchPreview } from '../../utils/knockoutPreviews';
import { MATCH_LOCALE } from '../../utils/timezone';
import './Betting.css';
import './KnockoutBetting.css';

const STAGE_LABELS = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter Finals', SF: 'Semi Finals', FINAL: 'Final' };
const LOCK_HOURS   = 1;

function isMatchLocked(matchDate) {
  const lockTime = new Date(new Date(matchDate).getTime() - LOCK_HOURS * 60 * 60 * 1000);
  return new Date() >= lockTime;
}

function KnockoutMatchCard({ match, existingBet, preview, onSave }) {
  const { addToast } = useToast();
  const [selected, setSelected] = useState(existingBet?.predicted_winner?.id ?? null);
  const [saving,   setSaving]   = useState(false);

  const home = match.home_team;
  const away = match.away_team;

  // A pick only makes sense once both bracket slots are filled — until then
  // there's no team to select, so the card stays locked regardless of timing.
  const matchupKnown = Boolean(home && away);
  const locked = !matchupKnown || isMatchLocked(match.match_date) || match.status === 'FINISHED';

  async function handlePick(teamId) {
    if (locked) return;
    setSelected(teamId);
    setSaving(true);
    try {
      await submitKnockoutBet({ match_id: match.id, predicted_winner_id: teamId });
      addToast('Knockout pick saved!', 'success');
      onSave();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ko-bet-card">
      <div className="ko-bet-card__header">
        <span className="ko-bet-card__date">
          {new Date(match.match_date).toLocaleDateString(MATCH_LOCALE, { day: 'numeric', month: 'short' })}
        </span>
        <StatusBadge status={match.status} />
      </div>

      <div className="ko-bet-card__teams">
        {[home, away].map((team, i) => {
          if (!team) {
            // Bracket slot not filled yet — show what we already know about who
            // will land here (e.g. "1st place Group A") instead of a bare "TBD",
            // and mark it as locked since there's no team to pick yet.
            return (
              <div key={`preview-${i}`} className="ko-bet-team ko-bet-team--locked ko-bet-team--preview">
                <span className="ko-bet-team__lock">🔒</span>
                <span>{preview?.[i] ?? 'TBD'}</span>
              </div>
            );
          }
          const isSelected = selected === team.id;
          const isWinner   = existingBet?.is_correct === 1 && isSelected;
          const isWrong    = existingBet?.is_correct === 0 && isSelected;

          return (
            <div
              key={team.id}
              className={`ko-bet-team ${isSelected ? 'ko-bet-team--selected' : ''} ${isWinner ? 'ko-bet-team--correct' : ''} ${isWrong ? 'ko-bet-team--wrong' : ''} ${locked ? 'ko-bet-team--locked' : ''}`}
              onClick={() => handlePick(team.id)}
            >
              {team.flag_url && <img src={team.flag_url} alt={team.name} />}
              <span>{team.name}</span>
              {match.status === 'FINISHED' && (
                <span className="ko-bet-team__score">
                  {team.id === match.home_team?.id ? match.home_score : match.away_score}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!matchupKnown && (
        <p className="ko-bet-card__locked">🔒 Picks unlock once this matchup is confirmed</p>
      )}
    </div>
  );
}

function KnockoutBetting() {
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const onSave = () => setRefresh(r => r + 1);

  const { data: bracketData, loading: bracketLoading } = useFetch(getKnockoutBracket);
  const { data: betsData }                             = useFetch(getKnockoutBets, [refresh]);

  if (bracketLoading) return <Spinner />;

  const bracket = bracketData?.bracket ?? {};
  const betsMap = {};
  (betsData?.bets ?? []).forEach(b => { betsMap[b.match_id] = b; });

  const hasMatches = Object.values(bracket).some(m => m.length > 0);

  return (
    <div>
      <button className="betting-back" onClick={() => navigate('/betting')}>← Back</button>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>
        🥊 Knockout Predictions
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Pick the winner of each match. Each match locks 1 hour before kickoff.
      </p>

      {!hasMatches && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
          <p style={{ fontSize: '3rem' }}>⏳</p>
          <p>Knockout matches will appear here once the group stage ends.</p>
        </div>
      )}

      {Object.entries(STAGE_LABELS).map(([stage, label]) => {
        const matches = bracket[stage] ?? [];
        if (matches.length === 0) return null;

        return (
          <div key={stage} className="ko-stage">
            <h2 className="ko-stage__label">{label}</h2>
            <div className="ko-stage__grid">
              {matches.map((match, i) => (
                <KnockoutMatchCard
                  key={match.id}
                  match={match}
                  existingBet={betsMap[match.id]}
                  preview={getMatchPreview(stage, i)}
                  onSave={onSave}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KnockoutBetting;
