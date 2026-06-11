// Central place for all magic numbers and configuration values.
// Importing from here (instead of hardcoding) makes future changes a one-liner.

const STAGE = {
  GROUP: 'GROUP',
  R32: 'R32',
  R16: 'R16',
  QF: 'QF',
  SF: 'SF',
  FINAL: 'FINAL',
};

const MATCH_STATUS = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  FINISHED: 'FINISHED',
};

// Points awarded per correct prediction
const SCORING = {
  GROUP_ADVANCE_PER_TEAM: 10,
  R32_WINNER: 5,
  R16_WINNER: 8,
  QF_WINNER: 12,
  SF_WINNER: 20,
  FINAL_WINNER: 35,
  TOP_SCORER: 50,

  // Oracle Duel -- confidence-based multipliers (base = 5 for GROUP/R32).
  // Points depend on how confident the AI was, not on oracle agreement.
  ORACLE_CONFIDENCE_HIGH:    70,   // AI confidence threshold (max(home_prob, away_prob) >= 70)
  ORACLE_HIGH_WITH_AI:      0.6,   // AI >= 70% confident, user backed the AI   -> 3 pts
  ORACLE_HIGH_AGAINST_AI:   2.4,   // AI >= 70% confident, user defied the AI   -> 12 pts
  ORACLE_LOW_WITH_AI:       1.2,   // AI < 70% confident, user backed the AI    -> 6 pts
  ORACLE_LOW_AGAINST_AI:    1.6,   // AI < 70% confident, user defied the AI    -> 8 pts
};

// Betting lock rules
const LOCK = {
  // Group stage and top scorer lock -- June 13, 2026 at 14:00 UTC
  GROUP_STAGE_LOCK_DATE: '2026-06-13T14:00:00Z',
  // Hours before a knockout match starts that predictions are locked
  KNOCKOUT_LOCK_HOURS_BEFORE: 1,
  KNOCKOUT_UNLOCK_HOURS_AFTER: 1,
};

module.exports = { STAGE, MATCH_STATUS, SCORING, LOCK };
