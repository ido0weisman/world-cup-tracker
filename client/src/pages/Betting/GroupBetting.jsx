import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
import { getGroupBets, submitGroupBet } from '../../api/bets.api';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../context/ToastContext';
import './Betting.css';
import './GroupBetting.css';

const LOCK_DATE = new Date('2026-06-15T23:59:59Z');
const isLocked  = () => new Date() > LOCK_DATE;

function GroupBettingCard({ group, existingBet, onSave }) {
  const { addToast } = useToast();
  const [selected, setSelected] = useState(
    existingBet ? [existingBet.team1.id, existingBet.team2.id] : []
  );
  const [saving, setSaving] = useState(false);
  const locked = isLocked();

  function toggleTeam(teamId) {
    if (locked) return;
    setSelected(prev => {
      if (prev.includes(teamId)) return prev.filter(id => id !== teamId);
      if (prev.length >= 2)     return prev; // max 2
      return [...prev, teamId];
    });
    setMessage('');
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
            <div
              key={row.team.id}
              className={`group-bet-card__team ${isSelected ? 'group-bet-card__team--selected' : ''} ${locked ? 'group-bet-card__team--locked' : ''}`}
              onClick={() => toggleTeam(row.team.id)}
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
  const { data: betsData,   loading: betsLoading, refetch } = useFetch(getGroupBets);

  const [refresh, setRefresh] = useState(0);
  const onSave = () => setRefresh(r => r + 1);

  // Re-fetch bets after a save
  const { data: freshBets } = useFetch(getGroupBets, [refresh]);

  if (groupsLoading || betsLoading) return <Spinner />;

  const betsMap = {};
  (freshBets?.bets ?? betsData?.bets ?? []).forEach(b => { betsMap[b.group_name] = b; });

  return (
    <div>
      <button className="betting-back" onClick={() => navigate('/betting')}>← Back</button>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>
        📊 Group Stage Betting
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Pick 2 teams per group you think will advance. Locks June 15, 2026.
      </p>

      <div className="group-bets-grid">
        {groupsData?.groups?.map(group => (
          <GroupBettingCard
            key={group.group_name}
            group={group}
            existingBet={betsMap[group.group_name]}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
}

export default GroupBetting;
