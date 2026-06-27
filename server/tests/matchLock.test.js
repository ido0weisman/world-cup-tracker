import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getMatchLockInfo,
  assertMatchNotLocked,
  getGroupStageLockInfo,
  assertGroupStageOpen,
} from '../src/utils/matchLock.js';

// Lock rules are pure time arithmetic — pinning the clock with fake timers
// makes every assertion deterministic, no matter when the suite runs.
describe('matchLock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('getMatchLockInfo', () => {
    // All "open" cases below are pinned after KNOCKOUT_OPEN_DATE
    // (2026-06-28T01:00:00Z) so they're only exercising the per-match
    // kickoff window, not the global stage gate.

    it('is open more than 1 hour before kickoff', () => {
      vi.setSystemTime(new Date('2026-06-30T10:00:00Z'));
      const info = getMatchLockInfo('2026-06-30T16:00:00Z');
      expect(info.is_locked).toBe(false);
      expect(info.lock_time).toBe('2026-06-30T15:00:00.000Z'); // kickoff − 1h
    });

    it('locks exactly at the 1-hour boundary', () => {
      vi.setSystemTime(new Date('2026-06-30T15:00:00Z'));
      expect(getMatchLockInfo('2026-06-30T16:00:00Z').is_locked).toBe(true);
    });

    it('stays locked after kickoff', () => {
      vi.setSystemTime(new Date('2026-06-30T18:00:00Z'));
      expect(getMatchLockInfo('2026-06-30T16:00:00Z').is_locked).toBe(true);
    });

    it('stays locked before the global knockout-open date, even with a known matchup far from kickoff', () => {
      // Kickoff is days away, well outside the 1h pre-kickoff window, but the
      // stage hasn't opened yet -- this is the bug being fixed.
      vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));
      const info = getMatchLockInfo('2026-07-04T16:00:00Z');
      expect(info.is_locked).toBe(true);
      expect(info.opens_at).toBe('2026-06-28T01:00:00.000Z');
    });

    it('opens exactly at the global knockout-open date', () => {
      vi.setSystemTime(new Date('2026-06-28T01:00:00Z'));
      const info = getMatchLockInfo('2026-07-04T16:00:00Z');
      expect(info.is_locked).toBe(false);
    });
  });

  describe('assertMatchNotLocked', () => {
    it('throws 423 for a match within the pre-kickoff lock window', () => {
      vi.setSystemTime(new Date('2026-06-30T15:30:00Z'));
      const match = { match_date: '2026-06-30T16:00:00Z' };
      expect(() => assertMatchNotLocked(match)).toThrowError(
        expect.objectContaining({ statusCode: 423 })
      );
    });

    it('throws 423 before the global knockout-open date even when kickoff is far away', () => {
      vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));
      const match = { match_date: '2026-07-04T16:00:00Z' };
      expect(() => assertMatchNotLocked(match)).toThrowError(
        expect.objectContaining({ statusCode: 423 })
      );
    });

    it('passes through for an open match', () => {
      vi.setSystemTime(new Date('2026-06-30T10:00:00Z'));
      const match = { match_date: '2026-06-30T16:00:00Z' };
      expect(() => assertMatchNotLocked(match)).not.toThrow();
    });
  });

  describe('group stage lock', () => {
    it('is open before the lock date', () => {
      vi.setSystemTime(new Date('2026-06-13T13:59:59Z'));
      expect(getGroupStageLockInfo().is_locked).toBe(false);
      expect(() => assertGroupStageOpen()).not.toThrow();
    });

    it('locks after the lock date and throws 423', () => {
      vi.setSystemTime(new Date('2026-06-13T14:00:01Z'));
      expect(getGroupStageLockInfo().is_locked).toBe(true);
      expect(() => assertGroupStageOpen()).toThrowError(
        expect.objectContaining({ statusCode: 423 })
      );
    });
  });
});
