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

// Points awarded per correct prediction (see MASTER_PLAN.md Phase 6)
const SCORING = {
  GROUP_ADVANCE_PER_TEAM: 5,
  R32_WINNER: 2,
  R16_WINNER: 3,
  QF_WINNER: 5,
  SF_WINNER: 8,
  FINAL_WINNER: 15,
  TOP_SCORER: 20,
};

// Betting lock rules
const LOCK = {
  // Group stage and top scorer lock (ISO date string — midnight UTC)
  GROUP_STAGE_LOCK_DATE: '2026-06-15T23:59:59Z',
  // Hours before a knockout match starts that predictions are locked
  KNOCKOUT_LOCK_HOURS_BEFORE: 1,
  // Hours after the last match of a stage that the next stage unlocks
  KNOCKOUT_UNLOCK_HOURS_AFTER: 1,
};

module.exports = { STAGE, MATCH_STATUS, SCORING, LOCK };
