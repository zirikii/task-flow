/** Default gap between consecutive task positions within a column. */
export const POSITION_GAP = 1000;

/** Minimum gap before we consider a column to need renormalization. */
export const MIN_POSITION_GAP = 0.0001;

/**
 * Compute a fractional position for a task dropped between two neighbours.
 * `before` is the position of the task immediately above (smaller value),
 * `after` is the task immediately below (larger value). `null` means edge.
 */
export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_GAP;
  if (before === null) return after! / 2;
  if (after === null) return before + POSITION_GAP;
  return (before + after) / 2;
}

/** True if the neighbours are too close together to insert between safely. */
export function needsRenormalization(before: number | null, after: number | null): boolean {
  if (before === null || after === null) return false;
  return after - before < MIN_POSITION_GAP;
}

/** Evenly-spaced positions for renormalizing a column of `count` tasks. */
export function renormalizedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) * POSITION_GAP);
}
