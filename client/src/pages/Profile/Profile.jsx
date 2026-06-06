import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
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
  const { user } = useAuth();
  const { data: groupsData, loading } = useFetch(getAllGroups);

  const favoriteTeam = useMemo(() => {
    if (!user?.favorite_team || !groupsData?.groups) return null;
    const allTeams = groupsData.groups.flatMap(g => g.standings.map(s => s.team));
    return allTeams.find(t => t.name === user.favorite_team) ?? null;
  }, [user?.favorite_team, groupsData]);

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
            <span className="profile__value">{user.country || '—'}</span>
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
          {loading ? (
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
      </div>
    </div>
  );
}

export default Profile;
