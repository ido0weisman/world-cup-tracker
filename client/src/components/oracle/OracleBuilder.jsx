import { useState } from 'react';
import { saveOracleProfile } from '../../api/oracle.api';
import { useToast } from '../../context/ToastContext';
import Spinner from '../ui/Spinner';
import { BUILDER_STEPS } from './oracleData';

function OracleBuilder({ initialSelections = {}, onComplete }) {
  const [step, setStep]             = useState(0);
  const [selections, setSelections] = useState(initialSelections);
  const { addToast }                = useToast();
  const [saving, setSaving]         = useState(false);

  const current = BUILDER_STEPS[step];

  async function handleSelect(value) {
    const next = { ...selections, [current.key]: value };
    setSelections(next);

    if (step < BUILDER_STEPS.length - 1) {
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
        {BUILDER_STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`oracle-builder__step-dot ${i <= step ? 'oracle-builder__step-dot--active' : ''}`}
          />
        ))}
      </div>

      <p className="oracle-builder__step-label">Step {step + 1} of {BUILDER_STEPS.length}</p>
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

export default OracleBuilder;
