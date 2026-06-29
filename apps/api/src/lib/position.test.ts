import { describe, expect, it } from 'vitest';
import {
  MIN_POSITION_GAP,
  needsRenormalization,
  POSITION_GAP,
  positionBetween,
  renormalizedPositions,
} from './position';

describe('positionBetween', () => {
  it('returns the default gap for an empty column', () => {
    expect(positionBetween(null, null)).toBe(POSITION_GAP);
  });

  it('inserts before the first task (top edge)', () => {
    expect(positionBetween(null, 1000)).toBe(500);
  });

  it('appends after the last task (bottom edge)', () => {
    expect(positionBetween(1000, null)).toBe(2000);
  });

  it('inserts at the midpoint between two neighbours', () => {
    expect(positionBetween(1000, 2000)).toBe(1500);
  });
});

describe('needsRenormalization', () => {
  it('is false at the edges', () => {
    expect(needsRenormalization(null, 1000)).toBe(false);
    expect(needsRenormalization(1000, null)).toBe(false);
  });

  it('is true when neighbours are closer than the minimum gap', () => {
    expect(needsRenormalization(1000, 1000 + MIN_POSITION_GAP / 2)).toBe(true);
  });

  it('is false when there is enough room', () => {
    expect(needsRenormalization(1000, 2000)).toBe(false);
  });
});

describe('renormalizedPositions', () => {
  it('produces evenly spaced ascending positions', () => {
    expect(renormalizedPositions(3)).toEqual([POSITION_GAP, POSITION_GAP * 2, POSITION_GAP * 3]);
  });
});
