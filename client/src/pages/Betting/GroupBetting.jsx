import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
import { getBettingConfig, getGroupBets, submitGroupBet } from '../../api/bets.api';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../context/ToastContext';
import './Betting.css';
import './GroupBetting.css';

function GroupBettingCard({ group, existingBet, locked, onSave }) {
  const { addToast } = useToast();
  const [selected, setSelected] = useState(
    existingBet ? [existingBet.team1.id, existingBet.team2.id] : []
  );
  const [saving, setSaving] = useState(false);

  function toggleTeam(teamId) {
    if (locked) return;
    setSelected(prev => {
      if (prev.includes(teamId)) return prev.filter(id => id !== teamId);
      if (prev.length >= 2)     return prev; // max 2
      return [...prev, teamId];
    });
  }

  async function handleSave() {
    if (selected.length !== 2) { addToast('Pick exactly 2 teams.', 'error'); return; }
    setSaving(true);
    try {
      await submitGroupBet({ group_name: group.group_name, team1_id: selected[0], team2_id: selected[1] });
      addToast(`${group.group_name} pick saved!`, 'success');
      onSave();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="group-bet-card">
      <h3 className="group-bet-card__name">{group.group_name}</h3>
      <div className="group-bet-card__teams">
        {group.standings.map(row => {
          const isSelected = selected.includes(row.team.id);
          return (
            // role/tabIndex/onKeyDown make the styled div behave like a real
            // button for keyboard and screen-reader users.
            <div
              key={row.team.id}
              role="button"
              tabIndex={locked ? -1 : 0}
              aria-pressed={isSelected}
              aria-disabled={locked}
              className={`group-bet-card__team ${isSelected ? 'group-bet-card__team--selected' : ''} ${locked ? 'group-bet-card__team--locked' : ''}`}
              onClick={() => toggleTeam(row.team.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleTeam(row.team.id);
                }
              }}
            >
              {row.team.flag_url && <img src={row.team.flag_url} alt="" />}
              <span>{row.team.name}</span>
              {isSelected && <span className="group-bet-card__check">✓</span>}
            </div>
          );
        })}
      </div>
      {!locked && (
        <div className="group-bet-card__footer">
          <span className="group-bet-card__hint">{selected.length}/2 selected</span>
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || selected.length !== 2}
          >
            {saving ? 'Saving…' : 'Save Pick'}
          </button>
        </div>
      )}
      {locked && <p className="group-bet-card__locked">🔒 Locked</p>}
    </div>
  );
}

function GroupBetting() {
  const navigate = useNavigate();
  const { data: groupsData, loading: groupsLoading } = useFetch(getAllGroups);
  const { data: betsData,   loading: betsLoading }   = useFetch(getGroupBets);
  // Lock state comes from the server — single source of truth for betting rules.
  const { data: config,     loading: configLoading } = useFetch(getBettingConfig);

  const [refresh, setRefresh] = useState(0);
  const onSave = () => setRefresh(r => r + 1);

  // Re-fetch bets after a save
  const { data: freshBets } = useFetch(getGroupBets, [refresh]);

  if (groupsLoading || betsLoading || configLoading) return <Spinner />;

  const locked   = config?.group_stage?.is_locked ?? false;
  const lockDate = config?.group_stage?.lock_date
    ? new Date(config.group_stage.lock_date).toLocaleString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
      })
    : null;

  const betsMap = {};
  (freshBets?.bets ?? betsData?.bets ?? []).forEach(b => { betsMap[b.group_name] = b; });

  return (
    <div>
      <button className="betting-back" onClick={() => navigate('/betting')}>← Back</button>
      <h1 className="betting-page__title">📊 Group Stage Predictions</h1>
      <p className="betting-page__sub">
        Pick 2 teams per group you think will advance.{lockDate && ` Locks ${lockDate}.`}
      </p>

      <div className="group-bets-grid">
        {groupsData?.groups?.map(group => (
          <GroupBettingCard
            key={group.group_name}
            group={group}
            existingBet={betsMap[group.group_name]}
            locked={locked}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
}

export default GroupBetting;
