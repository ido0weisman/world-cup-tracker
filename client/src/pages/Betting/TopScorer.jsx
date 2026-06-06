import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
import { getTopScorerBet, submitTopScorerBet } from '../../api/bets.api';
import { getTeamSquad } from '../../api/squads.api';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../context/ToastContext';
import './Betting.css';
import './TopScorer.css';

const LOCK_DATE = new Date('2026-06-15T23:59:59Z');
const isLocked  = () => new Date() > LOCK_DATE;

// Position display labels + order
const POSITION_LABELS = {
  Goalkeeper: '🧤 Goalkeepers',
  Defence:    '🛡️ Defenders',
  Midfield:   '⚙️ Midfielders',
  Offence:    '⚡ Forwards',
};
const POSITION_ORDER = ['Goalkeeper', 'Defence', 'Midfield', 'Offence'];

function groupByPosition(players) {
  const groups = {};
  for (const p of players) {
    const pos = p.position ?? 'Unknown';
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(p);
  }
  return POSITION_ORDER
    .filter(pos => groups[pos]?.length)
    .map(pos => ({ position: pos, players: groups[pos] }));
}

function TopScorer() {
  const navigate = useNavigate();
  const locked   = isLocked();
  const { addToast } = useToast();

  const { data: groupsData, loading: groupsLoading } = useFetch(getAllGroups);
  const { data: betData,    loading: betLoading }     = useFetch(getTopScorerBet);

  const allTeams = (groupsData?.groups?.flatMap(g => g.standings.map(s => s.team)) ?? [])
    .sort((a, b) => a.name.localeCompare(b.name));

  // Step 1: pick team | Step 2: pick player from list
  const [step,           setStep]           = useState(1);
  const [pickedTeam,     setPickedTeam]     = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [players,        setPlayers]        = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [search,         setSearch]         = useState('');

  const existing = betData?.bet;

  // Fetch squad when a team is picked
  useEffect(() => {
    if (!pickedTeam) return;
    setPlayers([]);
    setSelectedPlayer(null);
    setPlayersLoading(true);
    getTeamSquad(pickedTeam.short_code)
      .then(data => setPlayers(data.players ?? []))
      .catch(() => setPlayers([]))
      .finally(() => setPlayersLoading(false));
  }, [pickedTeam]);

  const filteredTeams = search.trim()
    ? allTeams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : allTeams;

  function handleTeamPick(team) {
    setPickedTeam(team);
    setStep(2);
  }

  async function handleSubmit() {
    if (!selectedPlayer) { addToast('Select a player first.', 'error'); return; }
    setSaving(true);
    try {
      await submitTopScorerBet({ team_id: pickedTeam.id, player_name: selectedPlayer.name });
      addToast(`Top scorer pick saved — ${selectedPlayer.name} (${pickedTeam.name})`, 'success');
      setStep(1);
      setPickedTeam(null);
      setSelectedPlayer(null);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (groupsLoading || betLoading) return <Spinner />;

  const grouped = groupByPosition(players);

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

          {/* ── Step 2: Player List ── */}
          {step === 2 && pickedTeam && (
            <div className="ts-step2">
              <button className="betting-back" onClick={() => { setStep(1); setPickedTeam(null); }}>
                ← Back to countries
              </button>

              <div className="ts-selected-team">
                {pickedTeam.flag_url && (
                  <img src={pickedTeam.flag_url} alt={pickedTeam.name} className="ts-selected-team__flag" />
                )}
                <span className="ts-selected-team__name">{pickedTeam.name}</span>
              </div>

              <p className="ts-step-label">Step 2 — Choose a player</p>

              {playersLoading && <Spinner message="Loading squad…" />}

              {!playersLoading && players.length === 0 && (
                <p className="ts-no-squad">No squad data available for this team yet.</p>
              )}

              {!playersLoading && grouped.map(({ position, players: posPlayers }) => (
                <div key={position} className="ts-position-group">
                  <p className="ts-position-label">{POSITION_LABELS[position] ?? position}</p>
                  <div className="ts-player-grid">
                    {posPlayers.map(player => (
                      <button
                        key={player.id}
                        className={`ts-player-card ${selectedPlayer?.id === player.id ? 'ts-player-card--selected' : ''}`}
                        onClick={() => setSelectedPlayer(player)}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {selectedPlayer && (
                <div className="ts-confirm-row">
                  <span className="ts-confirm-name">✓ {selectedPlayer.name}</span>
                  <button
                    className="btn btn--primary ts-submit-btn"
                    onClick={handleSubmit}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Confirm Pick'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TopScorer;
