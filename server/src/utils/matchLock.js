const { LOCK } = require('../config/constants');
const createError = require('./createError');

// Single source of truth for betting-lock rules. Services use the assert
// functions to enforce locks; read endpoints attach the info objects to
// their responses so the client can DISPLAY lock state without re-deriving
// it from its own copy of the rules.

// Per-match lock: closes a fixed number of hours before kickoff.
function getMatchLockInfo(matchDate) {
  const lockTime = new Date(
    new Date(matchDate).getTime() - LOCK.KNOCKOUT_LOCK_HOURS_BEFORE * 60 * 60 * 1000
  );
  return {
    lock_time: lockTime.toISOString(),
    is_locked: new Date() >= lockTime,
  };
}

function assertMatchNotLocked(match, message) {
  if (getMatchLockInfo(match.match_date).is_locked) {
    throw createError(
      message ??
        `Predictions for this match are closed (locks ${LOCK.KNOCKOUT_LOCK_HOURS_BEFORE}h before kickoff).`,
      423
    );
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
