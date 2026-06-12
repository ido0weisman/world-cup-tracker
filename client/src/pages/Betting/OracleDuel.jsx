import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOracleProfile,
  getTodayPredictions,
  getOracleAccuracy,
} from '../../api/oracle.api';
import Spinner from '../../components/ui/Spinner';
import OracleBuilder from '../../components/oracle/OracleBuilder';
import OracleLanding from '../../components/oracle/OracleLanding';
import OracleInfoModal from '../../components/oracle/OracleInfoModal';
import MatchDuelCard from '../../components/oracle/MatchDuelCard';
import AccuracyTracker from '../../components/oracle/AccuracyTracker';
import './Betting.css';
import './OracleDuel.css';

// Page orchestrator: owns the view state (landing / builder / duel) and the
// data loading; all rendering is delegated to the components/oracle/ pieces.
function OracleDuel() {
  const navigate = useNavigate();

  const [view,        setView]        = useState('loading'); // loading | landing | builder | duel
  const [profile,     setProfile]     = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [bets,        setBets]        = useState({});
  const [accuracy,    setAccuracy]    = useState(null);
  const [error,       setError]       = useState('');
  const [showInfo,    setShowInfo]    = useState(false);

  const loadDuelData = useCallback(async () => {
    try {
      const [predsData, accData] = await Promise.all([
        getTodayPredictions(),
        getOracleAccuracy(),
      ]);
      const items = predsData.predictions ?? [];
      setPredictions(items);
      setAccuracy(accData);

      // Each item already carries the user's bet (embedded server-side),
      // so no extra per-match requests are needed.
      const betMap = {};
      for (const { match, bet } of items) {
        if (bet) betMap[match.id] = bet;
      }
      setBets(betMap);
    } catch {
      setError('Failed to load Oracle predictions.');
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const { profile: p } = await getOracleProfile();
        setProfile(p);
        if (p) {
          await loadDuelData();
          setView('duel');
        } else {
          setView('landing');
        }
      } catch {
        setView('landing');
      }
    }
    init();
  }, [loadDuelData]);

  async function handleBuilderComplete(newProfile) {
    setProfile(newProfile);
    await loadDuelData();
    setView('duel');
  }

  if (view === 'loading') return <Spinner message="Consulting the Oracle…" />;

  if (view === 'builder') {
    return (
      <div className="oracle-page">
        <button className="betting-back" onClick={() => setView(profile ? 'duel' : 'landing')}>
          ← Back
        </button>
        <OracleBuilder
          initialSelections={profile ? {
            strength_card: profile.strength_card,
            market_card:   profile.market_card,
            upset_card:    profile.upset_card,
          } : {}}
          onComplete={handleBuilderComplete}
        />
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <div className="oracle-page">
        <button className="betting-back" onClick={() => navigate('/betting')}>
          ← Predictions Hub
        </button>
        <OracleLanding onBuild={() => setView('builder')} />
      </div>
    );
  }

  return (
    <div className="oracle-page">
      {showInfo && <OracleInfoModal onClose={() => setShowInfo(false)} />}

      <div className="oracle-page__header">
        <button className="betting-back" onClick={() => navigate('/betting')}>
          ← Predictions Hub
        </button>
        <div className="oracle-page__header-right">
          <button className="oracle-info-btn" onClick={() => setShowInfo(true)} title="How it works">
            ?
          </button>
          <button className="btn btn--outline oracle-page__rebuild" onClick={() => setView('builder')}>
            ⚙️ {profile ? 'Rebuild Oracle' : 'Build Your Oracle'}
          </button>
        </div>
      </div>

      <h1 className="oracle-page__title">⚔️ Oracle Duel</h1>
      {profile && (
        <p className="oracle-page__sub">
          Your Oracle: <strong>{profile.oracle_name}</strong>
        </p>
      )}

      {error && <p className="oracle-page__error">{error}</p>}

      {predictions.length === 0 && !error && (
        <div className="oracle-page__empty">
          <p>😴 No matches scheduled today.</p>
          <p>Check back on match days for Oracle predictions.</p>
        </div>
      )}

      <div className="oracle-duel-grid">
        {predictions.map(item => (
          <MatchDuelCard
            key={item.match.id}
            item={item}
            profile={profile}
            existingBet={bets[item.match.id] ?? null}
            onBetPlaced={loadDuelData}
          />
        ))}
      </div>

      {accuracy && (
        <AccuracyTracker accuracy={accuracy} profileName={profile?.oracle_name} />
      )}
    </div>
  );
}

export default OracleDuel;
