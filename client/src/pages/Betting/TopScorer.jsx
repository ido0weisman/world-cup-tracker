import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
import { getTopScorerBet, submitTopScorerBet } from '../../api/bets.api';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../context/ToastContext';
import './Betting.css';
import './TopScorer.css';

const LOCK_DATE = new Date('2026-06-15T23:59:59Z');
const isLocked  = () => new Date() > LOCK_DATE;

function TopScorer() {
  const navigate  = useNavigate();
  const locked    = isLocked();

  const { data: groupsData, loading: groupsLoading } = useFetch(getAllGroups);
  const { data: betData,    loading: betLoading }    = useFetch(getTopScorerBet);

  // All teams flattened from all groups
  const allTeams = groupsData?.groups?.flatMap(g => g.standings.map(s => s.team)) ?? [];

  const [teamId,     setTeamId]     = useState('');
  const [playerName, setPlayerName] = useState('');
  const { addToast } = useToast();
  const [saving,  setSaving]  = useState(false);

  // Pre-fill form if a bet already exists
  const existing = betData?.bet;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!teamId || !playerName.trim()) { setMessage('Select a team and enter a player name.'); return; }
    setSaving(true);
    try {
      await submitTopScorerBet({ team_id: Number(teamId), player_name: playerName.trim() });
      addToast('Top scorer pick saved!', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (groupsLoading || betLoading) return <Spinner />;

  return (
    <div>
      <button className="betting-back" onClick={() => navigate('/betting')}>← Back</button>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>
        ⚽ Top Scorer Prediction
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Pick the player you think will score the most goals. Locks June 15, 2026.
      </p>

      {existing && (
        <div className="top-scorer__current">
          <span>Your current pick:</span>
          {existing.team.flag_url && <img src={existing.team.flag_url} alt="" />}
          <strong>{existing.player_name}</strong>
          <span className="top-scorer__team-name">({existing.team.name})</span>
        </div>
      )}

      {locked ? (
        <p className="top-scorer__locked">🔒 Betting is now closed for the top scorer.</p>
      ) : (
        <form onSubmit={handleSubmit} className="top-scorer__form">
          <div className="top-scorer__field">
            <label>Select Country</label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)} required>
              <option value="">Choose a team…</option>
              {allTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>

          <div className="top-scorer__field">
            <label>Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="e.g. Kylian Mbappé"
              required
            />
          </div>

          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Update Pick' : 'Save Pick'}
          </button>

        </form>
      )}
    </div>
  );
}

export default TopScorer;
