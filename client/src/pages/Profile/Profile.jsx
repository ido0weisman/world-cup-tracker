import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
import { updateMe } from '../../api/auth.api';
import { useToast } from '../../context/ToastContext';
import { COUNTRIES } from '../../utils/countries';
import Spinner from '../../components/ui/Spinner';
import './Profile.css';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function Profile() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const { data: groupsData, loading } = useFetch(getAllGroups);

  const allTeams = useMemo(
    () => (groupsData?.groups?.flatMap(g => g.standings.map(s => s.team)) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name)),
    [groupsData]
  );

  const favoriteTeam = useMemo(() => {
    if (!user?.favorite_team) return null;
    return allTeams.find(t => t.name === user.favorite_team) ?? null;
  }, [user?.favorite_team, allTeams]);

  // Country & favourite team are the only two profile fields a user can
  // change after signup — everything else (name, email, age, gender) stays
  // fixed. `form` only holds values while editing; the displayed values
  // always come from `user` until a save succeeds.
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({ country: '', favorite_team: '' });
  const [saving,  setSaving]  = useState(false);

  function startEditing() {
    setForm({ country: user.country || '', favorite_team: user.favorite_team || '' });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { user: updated } = await updateMe({
        country:       form.country || null,
        favorite_team: form.favorite_team || null,
      });
      updateUser(updated);
      addToast('Profile updated!', 'success');
      setEditing(false);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <Spinner />;

  return (
    <div className="profile">
      <h1 className="profile__title">👤 My Profile</h1>

      <div className="profile__card">
        {/* Avatar / name hero */}
        <div className="profile__hero">
          <div className="profile__avatar">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="profile__name">{user.full_name}</p>
            <p className="profile__email">{user.email}</p>
          </div>
        </div>

        <div className="profile__divider" />

        {/* Details grid */}
        <div className="profile__grid">
          <div className="profile__field">
            <span className="profile__label">Age</span>
            <span className="profile__value">{user.age ?? '—'}</span>
          </div>
          <div className="profile__field">
            <span className="profile__label">Gender</span>
            <span className="profile__value">{capitalize(user.gender)}</span>
          </div>
          <div className="profile__field">
            <span className="profile__label">Country</span>
            {editing ? (
              <select
                className="profile__edit-select"
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              >
                <option value="">Select your country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <span className="profile__value">{user.country || '—'}</span>
            )}
          </div>
          <div className="profile__field">
            <span className="profile__label">Member Since</span>
            <span className="profile__value">{formatDate(user.created_at)}</span>
          </div>
        </div>

        {/* Favourite team */}
        <div className="profile__divider" />
        <div className="profile__field profile__field--team">
          <span className="profile__label">Favourite Team</span>
          {editing ? (
            <select
              className="profile__edit-select"
              value={form.favorite_team}
              onChange={e => setForm(f => ({ ...f, favorite_team: e.target.value }))}
            >
              <option value="">None / Neutral</option>
              {allTeams.map(team => (
                <option key={team.id} value={team.name}>{team.name}</option>
              ))}
            </select>
          ) : loading ? (
            <span className="profile__value">Loading…</span>
          ) : favoriteTeam ? (
            <div className="profile__team">
              {favoriteTeam.flag_url && (
                <img
                  src={favoriteTeam.flag_url}
                  alt={favoriteTeam.name}
                  className="profile__team-flag"
                />
              )}
              <span className="profile__team-name">{favoriteTeam.name}</span>
            </div>
          ) : (
            <span className="profile__value">{user.favorite_team || '—'}</span>
          )}
        </div>

        {/* Edit controls — country & favourite team are the only fields a
            user can change after signup (everything else stays fixed). */}
        <div className="profile__divider" />
        <div className="profile__actions">
          {editing ? (
            <>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--outline" onClick={startEditing}>
              ✏️ Edit Country & Favourite Team
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
