import { describe, expect, it } from 'vitest';
import { buildLearningSuggestion, type LearningOutcome } from './adaptiveLearning';

const makeOutcomes = (count: number, ratio: number, garmentType = 'Tshirt'): LearningOutcome[] => (
  Array.from({ length: count }, (_, index) => ({
    predictedMinutes: 100,
    actualMinutes: 100 * ratio,
    garmentType,
    createdAt: new Date(Date.UTC(2026, 6, 20 - index)).toISOString(),
  }))
);

describe('buildLearningSuggestion', () => {
  it('waits for five valid completed runs', () => {
    const result = buildLearningSuggestion(makeOutcomes(4, 1.2), 60, 'Tshirt', new Date('2026-07-21T00:00:00Z'));
    expect(result.ready).toBe(false);
    expect(result.sampleSize).toBe(4);
  });

  it('returns a conservative, explainable correction', () => {
    const result = buildLearningSuggestion(makeOutcomes(10, 1.2), 60, 'Tshirt', new Date('2026-07-21T00:00:00Z'));
    expect(result.ready).toBe(true);
    expect(result.scope).toBe('garment');
    expect(result.confidence).toBe('medium');
    expect(result.adjustedMinutes).toBeGreaterThan(60);
    expect(result.multiplier).toBeLessThan(1.2);
  });

  it('caps bad time entries and falls back to shop-wide data', () => {
    const result = buildLearningSuggestion(
      [...makeOutcomes(5, 8, 'Polo'), ...makeOutcomes(2, 1.1, 'Hat')],
      100,
      'Hat',
      new Date('2026-07-21T00:00:00Z'),
    );
    expect(result.scope).toBe('shop');
    expect(result.multiplier).toBeLessThanOrEqual(1.35);
  });
});
