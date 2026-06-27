const { LOCK } = require('../config/constants');
const createError = require('./createError');

// Single source of truth for betting-lock rules. Services use the assert
// functions to enforce locks; read endpoints attach the info objects to
// their responses so the client can DISPLAY lock state without re-deriving
// it from its own copy of the rules.

// Per-match lock: closes a fixed number of hours before kickoff. Also gated by
// a global knockout-stage open date -- a bracket slot being filled in doesn't
// mean predictions are open yet; the whole stage stays closed until
// KNOCKOUT_OPEN_DATE regardless of how early a matchup becomes known.
function getMatchLockInfo(matchDate) {
  const opensAt = new Date(LOCK.KNOCKOUT_OPEN_DATE);
  const lockTime = new Date(
    new Date(matchDate).getTime() - LOCK.KNOCKOUT_LOCK_HOURS_BEFORE * 60 * 60 * 1000
  );
  const now = new Date();
  return {
    opens_at:  opensAt.toISOString(),
    lock_time: lockTime.toISOString(),
    is_locked: now < opensAt || now >= lockTime,
  };
}

function assertMatchNotLocked(match, message) {
  const lockInfo = getMatchLockInfo(match.match_date);
  if (lockInfo.is_locked) {
    const reason = new Date() < new Date(LOCK.KNOCKOUT_OPEN_DATE)
      ? `Knockout predictions open ${lockInfo.opens_at}.`
      : `Predictions for this match are closed (locks ${LOCK.KNOCKOUT_LOCK_HOURS_BEFORE}h before kickoff).`;
    throw createError(message ?? reason, 423);
  }
}

// Global lock shared by group-stage and top-scorer predictions.
function getGroupStageLockInfo() {
  return {
    lock_date: LOCK.GROUP_STAGE_LOCK_DATE,
    is_locked: new Date() > new Date(LOCK.GROUP_STAGE_LOCK_DATE),
  };
}

function assertGroupStageOpen() {
  if (getGroupStageLockInfo().is_locked) {
    throw createError('Group stage predictions are now closed.', 423);
  }
}

module.exports = {
  getMatchLockInfo,
  assertMatchNotLocked,
  getGroupStageLockInfo,
  assertGroupStageOpen,
};
