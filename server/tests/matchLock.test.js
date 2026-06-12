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
    it('is open more than 1 hour before kickoff', () => {
      vi.setSystemTime(new Date('2026-06-20T10:00:00Z'));
      const info = getMatchLockInfo('2026-06-20T16:00:00Z');
      expect(info.is_locked).toBe(false);
      expect(info.lock_time).toBe('2026-06-20T15:00:00.000Z'); // kickoff − 1h
    });

    it('locks exactly at the 1-hour boundary', () => {
      vi.setSystemTime(new Date('2026-06-20T15:00:00Z'));
      expect(getMatchLockInfo('2026-06-20T16:00:00Z').is_locked).toBe(true);
    });

    it('stays locked after kickoff', () => {
      vi.setSystemTime(new Date('2026-06-20T18:00:00Z'));
      expect(getMatchLockInfo('2026-06-20T16:00:00Z').is_locked).toBe(true);
    });
  });

  describe('assertMatchNotLocked', () => {
    it('throws 423 for a locked match', () => {
      vi.setSystemTime(new Date('2026-06-20T15:30:00Z'));
      const match = { match_date: '2026-06-20T16:00:00Z' };
      expect(() => assertMatchNotLocked(match)).toThrowError(
        expect.objectContaining({ statusCode: 423 })
      );
    });

    it('passes through for an open match', () => {
      vi.setSystemTime(new Date('2026-06-20T10:00:00Z'));
      const match = { match_date: '2026-06-20T16:00:00Z' };
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
