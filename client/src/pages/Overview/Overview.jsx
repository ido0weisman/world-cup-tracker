import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getAllGroups } from '../../api/groups.api';
import { getKnockoutBracket } from '../../api/knockout.api';
import { getMatchPreview } from '../../utils/knockoutPreviews';
import Spinner from '../../components/ui/Spinner';
import './Overview.css';

// ─── Group Stage Tab ──────────────────────────────────────────────────────────

function GroupTable({ group }) {
  return (
    <div className="group-table">
      <h3 className="group-table__name">{group.group_name}</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th className="group-table__team-col">Team</th>
            <th title="Played">P</th>
            <th title="Won">W</th>
            <th title="Drawn">D</th>
            <th title="Lost">L</th>
            <th title="Goal Difference">GD</th>
            <th title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.standings.map((row, i) => (
            <tr key={row.team.id} className={i < 2 ? 'group-table__row--advance' : ''}>
              {/* Show the row's position in the rendered table (1, 2, 3, 4),
                  not the API's stored `position` field — that field can be
                  stale/out of sync with the sort order the rows are actually
                  displayed in, which produced the "scrambled" ranks (e.g.
                  2, 3, 4, 1). The index always matches what's on screen. */}
              <td>{i + 1}</td>
              <td className="group-table__team-cell">
                {row.team.flag_url && (
                  <img src={row.team.flag_url} alt={row.team.name} className="group-table__flag" />
                )}
                <span title={row.team.name}>{row.team.name}</span>
              </td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}</td>
              <td className="group-table__pts">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupStage() {
  const { data, loading, error } = useFetch(getAllGroups);

  if (loading) return <Spinner message="Loading groups…" />;
  if (error)   return <p style={{ color: '#f87171' }}>{error}</p>;

  return (
    <div className="groups-grid">
      {data?.groups?.map(group => (
        <GroupTable key={group.group_name} group={group} />
      ))}
    </div>
  );
}

// ─── Knockout Tab ─────────────────────────────────────────────────────────────

const STAGE_LABELS = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter Finals', SF: 'Semi Finals', FINAL: 'Final' };

function KnockoutMatch({ match, preview }) {
  const slots = [
    { team: match.home_team, score: match.home_score, previewLabel: preview?.[0] },
    { team: match.away_team, score: match.away_score, previewLabel: preview?.[1] },
  ];

  return (
    <div className="ko-match">
      {slots.map(({ team, score, previewLabel }, i) => {
        if (!team) {
          // Bracket slot not filled yet — show what we already know about who
          // will land here (e.g. "1st place Group A") instead of a bare "TBD",
          // mirroring the labels shown on the Knockout Betting page.
          return (
            <div key={`preview-${i}`} className="ko-match__team ko-match__team--preview">
              <span className="ko-match__lock">🔒</span>
              <span>{previewLabel ?? 'TBD'}</span>
            </div>
          );
        }
        return (
          <div key={team.id} className="ko-match__team">
            {team.flag_url && <img src={team.flag_url} alt="" className="ko-match__flag" />}
            <span>{team.name}</span>
            {match.status === 'FINISHED' && <span className="ko-match__score">{score}</span>}
          </div>
        );
      })}
    </div>
  );
}

function KnockoutStage() {
  const { data, loading, error } = useFetch(getKnockoutBracket);

  if (loading) return <Spinner message="Loading bracket…" />;
  if (error)   return <p style={{ color: '#f87171' }}>{error}</p>;

  const bracket = data?.bracket ?? {};
  const hasAnyMatches = Object.values(bracket).some(matches => matches.length > 0);

  if (!hasAnyMatches) {
    return (
      <div className="ko-empty">
        <span>🏆</span>
        <p>The knockout bracket will appear once the group stage is complete.</p>
      </div>
    );
  }

  return (
    <div className="ko-bracket">
      {Object.entries(STAGE_LABELS).map(([stage, label]) => (
        bracket[stage]?.length > 0 && (
          <div key={stage} className="ko-round">
            <h3 className="ko-round__label">{label}</h3>
            <div className="ko-round__matches">
              {bracket[stage].map((match, i) => (
                <KnockoutMatch key={match.id} match={match} preview={getMatchPreview(stage, i)} />
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────

function Overview() {
  const [activeTab, setActiveTab] = useState('groups');

  return (
    <div>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem' }}>
        Tournament Overview
      </h1>

      <div className="overview-tabs">
        <button
          className={`overview-tab ${activeTab === 'groups' ? 'overview-tab--active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Group Stage
        </button>
        <button
          className={`overview-tab ${activeTab === 'knockout' ? 'overview-tab--active' : ''}`}
          onClick={() => setActiveTab('knockout')}
        >
          Knockout Bracket
        </button>
      </div>

      <div className="overview-content">
        {activeTab === 'groups'   && <GroupStage />}
        {activeTab === 'knockout' && <KnockoutStage />}
      </div>
    </div>
  );
}

export default Overview;
