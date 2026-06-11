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
  GROUP_ADVANCE_PER_TEAM: 10,
  R32_WINNER: 5,
  R16_WINNER: 8,
  QF_WINNER: 12,
  SF_WINNER: 20,
  FINAL_WINNER: 35,
  TOP_SCORER: 50,

  // Oracle Duel multipliers applied on top of the oracle base points.
  // Multipliers are chosen to always produce clean integers with the base of 5.
  // sided_with = 'algorithm' or 'ai' → base × 1.2  (e.g. 5 × 1.2 = 6 pts)
  // sided_with = 'both'              → base × 1.4  (e.g. 5 × 1.4 = 7 pts)
  // sided_with = 'neither'           → base × 2.0  (e.g. 5 × 2.0 = 10 pts)
  ORACLE_WITH_WINNER:     1.2,  // oracles disagreed, you backed one correctly  → 6 pts (base 5)
  ORACLE_BOTH_AGREED:     0.8,  // both agreed, you took the safe consensus pick → 4 pts (base 5)
  ORACLE_DEFY_BOTH:       2.0,  // defied both oracles and proved them wrong     → 10 pts (base 5)
};

// Betting lock rules
const LOCK = {
  // Group stage and top scorer lock — 1 hour before the opening match
  // (Mexico vs South Africa, Estadio Azteca, kickoff 19:00 UTC on June 11, 2026)
  GROUP_STAGE_LOCK_DATE: '2026-06-13T14:00:00Z',
  // Hours before a knockout match starts that predictions are locked
  KNOCKOUT_LOCK_HOURS_BEFORE: 1,
  // Hours after the last match of a stage that the next stage unlocks
  KNOCKOUT_UNLOCK_HOURS_AFTER: 1,
};

module.exports = { STAGE, MATCH_STATUS, SCORING, LOCK };
