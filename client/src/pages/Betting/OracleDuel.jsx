import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOracleProfile,
  saveOracleProfile,
  getTodayPredictions,
  submitOracleBet,
  getOracleBet,
  getOracleAccuracy,
} from '../../api/oracle.api';
import { useToast } from '../../context/ToastContext';
import Spinner from '../../components/ui/Spinner';
import './Betting.css';
import './OracleDuel.css';

// ─── Card definitions ─────────────────────────────────────────────────────────

const STRENGTH_CARDS = [
  {
    value: 'legacy',
    emoji: '🏆',
    title: 'Legacy & Ranking',
    desc:  'I trust FIFA rankings and historical dominance',
  },
  {
    value: 'hot',
    emoji: '⚡',
    title: 'Hot Right Now',
    desc:  'I trust who\'s playing best in this tournament',
  },
  {
    value: 'goals',
    emoji: '⚽',
    title: 'Goals Tell Everything',
    desc:  'I trust who\'s scoring more, against better teams',
  },
];

const MARKET_CARDS = [
  {
    value: 'trust_market',
    emoji: '💰',
    title: 'The Market Knows Best',
    desc:  'Bookmaker odds carry heavy weight',
  },
  {
    value: 'ignore_market',
    emoji: '🧠',
    title: 'I Think For Myself',
    desc:  'Bookmaker odds are ignored completely',
  },
  {
    value: 'balanced',
    emoji: '⚖️',
    title: 'I Consider Everything',
    desc:  'Bookmaker odds are one factor among many',
  },
];

const UPSET_CARDS = [
  {
    value: 'favorites',
    emoji: '🛡️',
    title: 'Favourites Win For A Reason',
    desc:  'Boost the stronger team\'s probability',
  },
  {
    value: 'upsets',
    emoji: '🐶',
    title: 'Underdog',
    desc:  'Boost the underdog\'s probability',
  },
  {
    value: 'neutral',
    emoji: '🎯',
    title: 'Let The Numbers Decide',
    desc:  'No adjustment — pure data',
  },
];

const STEPS = [
  { key: 'strength_card', label: 'How do you judge a team?',          cards: STRENGTH_CARDS },
  { key: 'market_card',   label: 'Do you follow the bookmaker odds?',  cards: MARKET_CARDS   },
  { key: 'upset_card',    label: "What's your gut feeling on upsets?", cards: UPSET_CARDS   },
];

// ─── Oracle Builder ───────────────────────────────────────────────────────────

function OracleBuilder({ initialSelections = {}, onComplete }) {
  const [step, setStep]         = useState(0);
  const [selections, setSelections] = useState(initialSelections);
  const { addToast }            = useToast();
  const [saving, setSaving]     = useState(false);

  const current = STEPS[step];

  async function handleSelect(value) {
    const next = { ...selections, [current.key]: value };
    setSelections(next);

    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      // All 3 cards chosen — save profile
      setSaving(true);
      try {
        const result = await saveOracleProfile(next);
        onComplete({ ...next, oracle_name: result.oracle_name });
      } catch {
        addToast('Failed to save Oracle profile. Please try again.', 'error');
        setSaving(false);
      }
    }
  }

  return (
    <div className="oracle-builder">
      <div className="oracle-builder__progress">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`oracle-builder__step-dot ${i <= step ? 'oracle-builder__step-dot--active' : ''}`}
          />
        ))}
      </div>

      <p className="oracle-builder__step-label">Step {step + 1} of {STEPS.length}</p>
      <h2 className="oracle-builder__question">{current.label}</h2>

      {saving ? (
        <Spinner message="Awakening your Oracle…" />
      ) : (
        <div className="oracle-builder__cards">
          {current.cards.map(card => (
            <button
              key={card.value}
              className={`oracle-card ${selections[current.key] === card.value ? 'oracle-card--selected' : ''}`}
              onClick={() => handleSelect(card.value)}
            >
              <span className="oracle-card__emoji">{card.emoji}</span>
              <strong className="oracle-card__title">{card.title}</strong>
              <p className="oracle-card__desc">{card.desc}</p>
            </button>
          ))}
        </div>
      )}

      {step > 0 && !saving && (
        <button className="oracle-builder__back btn btn--outline" onClick={() => setStep(s => s - 1)}>
          ← Back
        </button>
      )}
    </div>
  );
}

// ─── Glowing Orb ─────────────────────────────────────────────────────────────

function GlowOrb({ prob, color, label, flag }) {
  const [displayed, setDisplayed] = useState(0);

  // Count-up animation
  useEffect(() => {
    setDisplayed(0);
    const target   = prob ?? 50;
    const duration = 900;
    const steps    = 40;
    const interval = duration / steps;
    let current    = 0;

    const timer = setInterval(() => {
      current += target / steps;
      if (current >= target) {
        setDisplayed(target);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(current));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [prob]);

  // Orb size scales 60px (50% confidence) → 110px (88% confidence)
  const size = prob != null ? 60 + Math.round((prob - 50) * 1.0) : 75;
  const clampedSize = Math.max(60, Math.min(110, size));

  return (
    <div className="oracle-orb-wrap">
      <div
        className="oracle-orb"
        style={{
          '--orb-color':   color,
          '--orb-size':    `${clampedSize}px`,
        }}
      >
        {flag && <img src={flag} alt="" className="oracle-orb__flag" />}
      </div>
      <p className="oracle-orb__pct">{displayed}%</p>
      <p className="oracle-orb__label">{label}</p>
    </div>
  );
}

// Compute the integer points a user would earn for an Oracle bet on this stage.
// Mirrors the server-side logic in scoring.service.js exactly.
const ORACLE_BASE = { GROUP: 5, R32: 5, R16: 8, QF: 12, SF: 20, FINAL: 35 };
function oraclePts(stage, multiplier) {
  return Math.round((ORACLE_BASE[stage] ?? 5) * multiplier);
}

// ─── Single match duel card ───────────────────────────────────────────────────

function MatchDuelCard({ item, existingBet, onBetPlaced, profile }) {
  const { match, prediction } = item;
  const { addToast }          = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [localBet, setLocalBet]     = useState(existingBet);

  const home = match;
  const away = match;

  const algoPred = prediction.algorithm;
  const aiPred   = prediction.ai;

  const isLocked  = new Date() >= new Date(new Date(match.match_date).getTime() - 60 * 60 * 1000);
  const isFinished = match.status === 'FINISHED';

  // Which side does each Oracle back?
  const algoBacksHome = algoPred.home_prob >= algoPred.away_prob;
  const aiBacksHome   = aiPred ? aiPred.home_prob >= aiPred.away_prob : null;
  const bothAgree     = aiPred && algoBacksHome === aiBacksHome;

  let verdictText = '';
  if (aiPred) {
    if (bothAgree) {
      const backed = algoBacksHome ? match.home_team_name : match.away_team_name;
      verdictText = `✅ BOTH ORACLES BACK ${backed.toUpperCase()}`;
    } else {
      verdictText = '⚡ THE ORACLES DISAGREE — Who do you trust?';
    }
  } else {
    const backed = algoBacksHome ? match.home_team_name : match.away_team_name;
    verdictText = `🔮 YOUR ORACLE BACKS ${backed.toUpperCase()}`;
  }

  async function placeBet(pickedTeamId, sidedWith) {
    setSubmitting(true);
    try {
      await submitOracleBet({
        match_id:         match.id,
        picked_winner_id: pickedTeamId,
        sided_with:       sidedWith,
      });
      const updated = await getOracleBet(match.id);
      setLocalBet(updated.bet);
      addToast('Oracle bet placed!', 'success');
      onBetPlaced?.();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to place bet.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="duel-card">
      <div className="duel-card__stage">{match.stage}</div>

      {/* Teams header */}
      <div className="duel-card__teams">
        <div className="duel-card__team">
          {match.home_flag && <img src={match.home_flag} alt={match.home_team_name} className="duel-card__flag" />}
          <span>{match.home_team_name}</span>
        </div>
        <span className="duel-card__vs">VS</span>
        <div className="duel-card__team duel-card__team--away">
          <span>{match.away_team_name}</span>
          {match.away_flag && <img src={match.away_flag} alt={match.away_team_name} className="duel-card__flag" />}
        </div>
      </div>

      {/* ── Side-by-side Oracle Duel ── */}
      <div className="duel-card__oracle-cols">

        {/* Your Oracle — left column */}
        <div className="duel-card__oracle-col duel-card__oracle-col--algo">
          <p className="duel-card__col-header">⚙️ {profile?.oracle_name ?? 'Your Oracle'}</p>
          <GlowOrb prob={algoPred.home_prob} color="gold" label={match.home_team_name} flag={match.home_flag} />
          <GlowOrb prob={algoPred.away_prob} color="gold" label={match.away_team_name} flag={match.away_flag} />
        </div>

        {/* VS divider */}
        <div className="duel-card__col-divider"><span>VS</span></div>

        {/* Groq AI — right column */}
        <div className="duel-card__oracle-col duel-card__oracle-col--ai">
          <p className="duel-card__col-header">🤖 Groq AI</p>
          {aiPred ? (
            <>
              <GlowOrb prob={aiPred.home_prob} color="purple" label={match.home_team_name} flag={match.home_flag} />
              <GlowOrb prob={aiPred.away_prob} color="purple" label={match.away_team_name} flag={match.away_flag} />
            </>
          ) : (
            <div className="duel-card__ai-pending">
              ⏳ Prediction pending
              <span>Runs nightly at 06:00 UTC</span>
            </div>
          )}
        </div>

      </div>

      {/* Verdict */}
      <p className={`duel-card__verdict ${bothAgree ? 'duel-card__verdict--agree' : 'duel-card__verdict--disagree'}`}>
        {verdictText}
      </p>

      {/* Bet section — visible until 1 hour before kickoff, even to change an existing bet */}
      {!isFinished && !isLocked && profile && (
        <div className="duel-card__bet-section">
          <p className="duel-card__bet-label">
            {localBet ? '🔄 Change your side:' : 'Who do you side with?'}
          </p>
          <div className="duel-card__bet-buttons">
            {/* Pick a winner siding with Algorithm Oracle */}
            <button
              className="btn btn--oracle-algo"
              disabled={submitting}
              onClick={() => {
                const pick = algoBacksHome ? match.home_team_id : match.away_team_id;
                const side = aiPred && bothAgree ? 'both' : 'algorithm';
                placeBet(pick, side);
              }}
            >
              ⚙️ Back Your Oracle
              <span className="duel-card__bet-pts">{oraclePts(match.stage, bothAgree ? 1.4 : 1.2)} pts</span>
            </button>

            {aiPred && !bothAgree && (
              <button
                className="btn btn--oracle-ai"
                disabled={submitting}
                onClick={() => {
                  const pick = aiBacksHome ? match.home_team_id : match.away_team_id;
                  placeBet(pick, 'ai');
                }}
              >
                🤖 Back the AI
                <span className="duel-card__bet-pts">{oraclePts(match.stage, 1.2)} pts</span>
              </button>
            )}

            {/* Defy both — user manually picks the underdog */}
            <button
              className="btn btn--oracle-defy"
              disabled={submitting}
              onClick={() => {
                // Defy = pick whichever team the algorithm thinks is less likely
                const pick = algoBacksHome ? match.away_team_id : match.home_team_id;
                placeBet(pick, 'neither');
              }}
            >
              ⚡ Defy Both
              <span className="duel-card__bet-pts">{oraclePts(match.stage, 2.0)} pts</span>
            </button>
          </div>
        </div>
      )}

      {/* Existing bet — always shown once placed */}
      {localBet && (
        <div className="duel-card__existing-bet">
          <span>{isLocked || isFinished ? 'Your bet: ' : 'Current: '}</span>
          <strong>{localBet.sided_with === 'algorithm' ? '⚙️ Your Oracle' : localBet.sided_with === 'ai' ? '🤖 Groq AI' : localBet.sided_with === 'both' ? '✅ Both Oracles' : '⚡ Defied Both'}</strong>
          {localBet.is_correct === 1 && <span className="duel-card__result duel-card__result--win"> ✓ Correct</span>}
          {localBet.is_correct === 0 && <span className="duel-card__result duel-card__result--loss"> ✗ Wrong</span>}
        </div>
      )}

      {(isLocked && !localBet) && (
        <p className="duel-card__locked">🔒 Predictions closed</p>
      )}
    </div>
  );
}

// ─── Accuracy Tracker ────────────────────────────────────────────────────────

function AccuracyTracker({ accuracy, profileName }) {
  const pct = ({ wins, total }) =>
    total > 0 ? Math.round((wins / total) * 100) : null;

  const algoPct = pct(accuracy.algorithm);
  const aiPct   = pct(accuracy.ai);

  return (
    <div className="oracle-accuracy">
      <h3 className="oracle-accuracy__title">📊 Oracle Records</h3>
      <div className="oracle-accuracy__cards">
        <div className="oracle-accuracy__card oracle-accuracy__card--algo">
          <p className="oracle-accuracy__name">⚙️ {profileName ?? 'Your Oracle'}</p>
          <p className="oracle-accuracy__record">
            {accuracy.algorithm.wins}W · {accuracy.algorithm.losses}L
            {algoPct != null && <span className="oracle-accuracy__pct"> · {algoPct}%</span>}
          </p>
          {accuracy.algorithm.total === 0 && (
            <p className="oracle-accuracy__empty">No completed matches yet</p>
          )}
        </div>
        <div className="oracle-accuracy__card oracle-accuracy__card--ai">
          <p className="oracle-accuracy__name">🤖 Groq AI</p>
          <p className="oracle-accuracy__record">
            {accuracy.ai.wins}W · {accuracy.ai.losses}L
            {aiPct != null && <span className="oracle-accuracy__pct"> · {aiPct}%</span>}
          </p>
          {accuracy.ai.total === 0 && (
            <p className="oracle-accuracy__empty">No AI predictions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Info Modal ──────────────────────────────────────────────────────────────

const NAMES_BY_GROUP = [
  {
    strength: '🏆 Legacy & Ranking',
    desc: 'trusts FIFA history & rankings',
    names: [
      { market: 'Trusts bookmakers',  upset: 'Backs favourites', name: 'The Banker'         },
      { market: 'Trusts bookmakers',  upset: 'Backs underdogs',  name: 'The Contrarian'     },
      { market: 'Trusts bookmakers',  upset: 'Pure data',        name: 'The Conservative'   },
      { market: 'Ignores bookmakers', upset: 'Backs favourites', name: 'The Purist'         },
      { market: 'Ignores bookmakers', upset: 'Backs underdogs',  name: 'The Historian'      },
      { market: 'Ignores bookmakers', upset: 'Pure data',        name: 'The Scholar'        },
      { market: 'Balanced approach',  upset: 'Backs favourites', name: 'The Veteran'        },
      { market: 'Balanced approach',  upset: 'Backs underdogs',  name: 'The Maverick'       },
      { market: 'Balanced approach',  upset: 'Pure data',        name: 'The Traditionalist' },
    ],
  },
  {
    strength: '⚡ Hot Right Now',
    desc: 'trusts current tournament form',
    names: [
      { market: 'Trusts bookmakers',  upset: 'Backs favourites', name: 'The Pundit'     },
      { market: 'Trusts bookmakers',  upset: 'Backs underdogs',  name: 'The Gambler'    },
      { market: 'Trusts bookmakers',  upset: 'Pure data',        name: 'The Speculator' },
      { market: 'Ignores bookmakers', upset: 'Backs favourites', name: 'The Hawk'       },
      { market: 'Ignores bookmakers', upset: 'Backs underdogs',  name: 'The Rebel'      },
      { market: 'Ignores bookmakers', upset: 'Pure data',        name: 'The Instinct'   },
      { market: 'Balanced approach',  upset: 'Backs favourites', name: 'The Strategist' },
      { market: 'Balanced approach',  upset: 'Backs underdogs',  name: 'The Wildcard'   },
      { market: 'Balanced approach',  upset: 'Pure data',        name: 'The Tactician'  },
    ],
  },
  {
    strength: '⚽ Goals Tell Everything',
    desc: 'trusts goals scored & quality',
    names: [
      { market: 'Trusts bookmakers',  upset: 'Backs favourites', name: 'The Calculator' },
      { market: 'Trusts bookmakers',  upset: 'Backs underdogs',  name: 'The Alchemist'  },
      { market: 'Trusts bookmakers',  upset: 'Pure data',        name: 'The Quant'      },
      { market: 'Ignores bookmakers', upset: 'Backs favourites', name: 'The Professor'  },
      { market: 'Ignores bookmakers', upset: 'Backs underdogs',  name: 'The Disruptor'  },
      { market: 'Ignores bookmakers', upset: 'Pure data',        name: 'The Analyst'    },
      { market: 'Balanced approach',  upset: 'Backs favourites', name: 'The Engineer'   },
      { market: 'Balanced approach',  upset: 'Backs underdogs',  name: 'The Visionary'  },
      { market: 'Balanced approach',  upset: 'Pure data',        name: 'The Oracle'     },
    ],
  },
];

function InfoModal({ onClose }) {
  return (
    <div className="oracle-info-overlay" onClick={onClose}>
      <div className="oracle-info-modal" onClick={e => e.stopPropagation()}>
        <button className="oracle-info-modal__close" onClick={onClose}>✕</button>

        <h2 className="oracle-info-modal__title">⚔️ How Oracle Duel Works</h2>

        {/* The two oracles */}
        <div className="oracle-info-section">
          <div className="oracle-info-oracles">
            <div className="oracle-info-oracle oracle-info-oracle--algo">
              <span className="oracle-info-oracle__icon">⚙️</span>
              <div>
                <strong>Your Oracle</strong>
                <p>Built from your 3 card choices. It weighs FIFA rankings, current form, goals quality, and bookmaker odds — according to your philosophy. 27 possible personalities.</p>
              </div>
            </div>
            <div className="oracle-info-oracle oracle-info-oracle--ai">
              <span className="oracle-info-oracle__icon">🤖</span>
              <div>
                <strong>Groq AI</strong>
                <p>An independent LLM analyst (Llama 3.3 70B). It predicts every match fresh each morning with no knowledge of your Oracle's choices — a true rival.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div className="oracle-info-section">
          <h3 className="oracle-info-section__title">⚡ Points Per Correct Bet</h3>
          <div className="oracle-info-scoring">
            <div className="oracle-info-score">
              <span className="oracle-info-score__mult oracle-info-score__mult--algo">6 pts</span>
              <span>Sided with your Oracle — and it was right (Group / R32)</span>
            </div>
            <div className="oracle-info-score">
              <span className="oracle-info-score__mult oracle-info-score__mult--agree">7 pts</span>
              <span>Both Oracles agreed — you sided with them (Group / R32)</span>
            </div>
            <div className="oracle-info-score">
              <span className="oracle-info-score__mult oracle-info-score__mult--defy">10 pts</span>
              <span>Defied both Oracles — and proved them wrong (Group / R32)</span>
            </div>
            <div className="oracle-info-score" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                Points scale up in QF (×2), SF (×3) and Final (×5).
              </span>
            </div>
          </div>
        </div>

        {/* All 27 oracle names */}
        <div className="oracle-info-section">
          <h3 className="oracle-info-section__title">🔮 All 27 Oracle Names</h3>
          <p className="oracle-info-names-hint">Your name is determined by your 3 card choices when you build your Oracle.</p>
          {NAMES_BY_GROUP.map(group => (
            <div key={group.strength} className="oracle-info-names-group">
              <h4 className="oracle-info-names-group__title">
                {group.strength} <span>— {group.desc}</span>
              </h4>
              <div className="oracle-info-names-grid">
                {group.names.map(n => (
                  <div key={n.name} className="oracle-info-name-row">
                    <strong className="oracle-info-name-row__name">{n.name}</strong>
                    <span className="oracle-info-name-row__tags">
                      {n.market} · {n.upset}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Landing screen (first visit) ────────────────────────────────────────────

function OracleLanding({ onBuild }) {
  return (
    <div className="oracle-landing">
      <div className="oracle-landing__glow" />
      <h1 className="oracle-landing__title">🔮 Oracle Duel</h1>
      <p className="oracle-landing__sub">
        Answer 3 questions to build your prediction algorithm.<br />
        It battles Groq AI on every match — pick a side, earn points.
      </p>

      <div className="oracle-landing__versus">
        <span className="oracle-landing__versus-side oracle-landing__versus-side--algo">
          ⚙️ <strong>Your Oracle</strong>
          <em>built by you</em>
        </span>
        <span className="oracle-landing__versus-divider">⚡</span>
        <span className="oracle-landing__versus-side oracle-landing__versus-side--ai">
          🤖 <strong>Groq AI</strong>
          <em>independent AI</em>
        </span>
      </div>

      <button className="oracle-landing__build-btn" onClick={onBuild}>
        ⚙️ Build Your Oracle
      </button>
    </div>
  );
}

// ─── Main Oracle Duel page ────────────────────────────────────────────────────

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
      setPredictions(predsData.predictions ?? []);
      setAccuracy(accData);

      // Pre-load any existing bets for today's matches
      const betMap = {};
      await Promise.all(
        (predsData.predictions ?? []).map(async ({ match }) => {
          try {
            const r = await getOracleBet(match.id);
            if (r.bet) betMap[match.id] = r.bet;
          } catch { /* no bet for this match */ }
        })
      );
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

  // ── Duel screen ─────────────────────────────────────────────────────────────
  return (
    <div className="oracle-page">
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

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
