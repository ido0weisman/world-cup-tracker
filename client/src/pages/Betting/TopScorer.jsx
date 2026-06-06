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
  const navigate = useNavigate();
  const locked   = isLocked();
  const { addToast } = useToast();

  const { data: groupsData, loading: groupsLoading } = useFetch(getAllGroups);
  const { data: betData,    loading: betLoading }     = useFetch(getTopScorerBet);

  const allTeams = groupsData?.groups?.flatMap(g => g.standings.map(s => s.team)) ?? [];

  // Step 1: pick team | Step 2: enter player name
  const [step,       setStep]       = useState(1);
  const [pickedTeam, setPickedTeam] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState('');

  const existing = betData?.bet;

  const filteredTeams = search.trim()
    ? allTeams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : allTeams;

  function handleTeamPick(team) {
    setPickedTeam(team);
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!playerName.trim()) { addToast('Enter a player name.', 'error'); return; }
    setSaving(true);
    try {
      await submitTopScorerBet({ team_id: pickedTeam.id, player_name: playerName.trim() });
      addToast(`Top scorer pick saved — ${playerName} (${pickedTeam.name})`, 'success');
      setStep(1);
      setPickedTeam(null);
      setPlayerName('');
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
      <h1 className="ts-title">⚽ Top Scorer Prediction</h1>
      <p className="ts-sub">
        Pick the player you think will score the most goals. Locks June 15, 2026.
      </p>

      {/* Current pick banner */}
      {existing && (
        <div className="ts-current-pick">
          <span className="ts-current-pick__label">Your current pick</span>
          <div className="ts-current-pick__player">
            {existing.team.flag_url && (
              <img src={existing.team.flag_url} alt={existing.team.name} className="ts-current-pick__flag" />
            )}
            <div>
              <p className="ts-current-pick__name">{existing.player_name}</p>
              <p className="ts-current-pick__team">{existing.team.name}</p>
            </div>
            {!locked && (
              <button className="ts-current-pick__change btn btn--outline"
                onClick={() => { setStep(1); setPickedTeam(null); }}>
                Change
              </button>
            )}
          </div>
        </div>
      )}

      {locked && <p className="ts-locked">🔒 Betting is now closed.</p>}

      {!locked && (
        <>
          {/* ── Step 1: Team Grid ── */}
          {step === 1 && (
            <div>
              <p className="ts-step-label">Step 1 — Select a country</p>
              <input
                className="ts-search"
                placeholder="Search country..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="ts-team-grid">
                {filteredTeams.map(team => (
                  <button
                    key={team.id}
                    className="ts-team-card"
                    onClick={() => handleTeamPick(team)}
                  >
                    {team.flag_url
                      ? <img src={team.flag_url} alt={team.name} className="ts-team-card__flag" />
                      : <span className="ts-team-card__placeholder">🏳️</span>
                    }
                    <span className="ts-team-card__name">{team.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Player Name ── */}
          {step === 2 && pickedTeam && (
            <div className="ts-step2">
              <button className="betting-back" onClick={() => setStep(1)}>← Back to countries</button>

              <div className="ts-selected-team">
                {pickedTeam.flag_url && (
                  <img src={pickedTeam.flag_url} alt={pickedTeam.name} className="ts-selected-team__flag" />
                )}
                <span className="ts-selected-team__name">{pickedTeam.name}</span>
              </div>

              <p className="ts-step-label">Step 2 — Enter the player's name</p>

              <form onSubmit={handleSubmit} className="ts-player-form">
                <input
                  type="text"
                  className="ts-player-input"
                  placeholder="e.g. Kylian Mbappé"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" className="btn btn--primary ts-submit-btn" disabled={saving}>
                  {saving ? 'Saving…' : '✓ Confirm Pick'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TopScorer;
