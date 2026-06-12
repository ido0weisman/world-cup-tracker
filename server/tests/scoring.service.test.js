import { describe, it, expect } from 'vitest';
import { getOraclePointTiers } from '../src/services/scoring.service.js';

// These values are the public scoring contract shown to users (info modal,
// bet buttons). If a SCORING constant changes intentionally, update these
// expectations in the same commit — that's the point of the test.
describe('getOraclePointTiers', () => {
  describe('stage base points', () => {
    it.each([
      ['GROUP', 5],
      ['R32',   5],
      ['R16',   8],
      ['QF',   12],
      ['SF',   20],
      ['FINAL', 35],
    ])('%s has base %i', (stage, base) => {
      expect(getOraclePointTiers(stage, null).base).toBe(base);
    });

    it('falls back to R32 base for unknown stages', () => {
      expect(getOraclePointTiers('THIRD_PLACE', null).base).toBe(5);
    });
  });

  describe('no AI prediction', () => {
    it('awards flat base points on both sides', () => {
      const t = getOraclePointTiers('GROUP', null);
      expect(t).toEqual({ base: 5, with_ai: 5, against_ai: 5, is_high_confidence: false });
    });
  });

  describe('high confidence (>= 70)', () => {
    it('pays little for backing the AI, a lot for defying it', () => {
      const t = getOraclePointTiers('GROUP', 75);
      expect(t.with_ai).toBe(3);      // 5 × 0.6
      expect(t.against_ai).toBe(12);  // 5 × 2.4
      expect(t.is_high_confidence).toBe(true);
    });

    it('scales with stage base (FINAL)', () => {
      const t = getOraclePointTiers('FINAL', 88);
      expect(t.with_ai).toBe(21);     // 35 × 0.6
      expect(t.against_ai).toBe(84);  // 35 × 2.4
    });

    it('treats exactly 70 as high confidence (boundary)', () => {
      expect(getOraclePointTiers('GROUP', 70).is_high_confidence).toBe(true);
    });
  });

  describe('low confidence (< 70)', () => {
    it('pays moderately either way', () => {
      const t = getOraclePointTiers('GROUP', 55);
      expect(t.with_ai).toBe(6);      // 5 × 1.2
      expect(t.against_ai).toBe(8);   // 5 × 1.6
      expect(t.is_high_confidence).toBe(false);
    });

    it('treats 69 as low confidence (boundary)', () => {
      expect(getOraclePointTiers('GROUP', 69).is_high_confidence).toBe(false);
    });
  });
});
