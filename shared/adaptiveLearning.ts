export interface LearningOutcome {
  predictedMinutes: number;
  actualMinutes: number;
  garmentType: string;
  createdAt: string;
}

export interface LearningSuggestion {
  ready: boolean;
  multiplier: number;
  adjustedMinutes: number;
  sampleSize: number;
  scope: 'garment' | 'shop';
  confidence: 'collecting' | 'low' | 'medium' | 'high';
  explanation: string;
}

const MINIMUM_SAMPLES = 5;
const MINIMUM_SEGMENT_SAMPLES = 5;
const PRIOR_WEIGHT = 3;
const HALF_LIFE_DAYS = 120;

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(maximum, Math.max(minimum, value))
);

export function buildLearningSuggestion(
  outcomes: LearningOutcome[],
  predictedMinutes: number,
  garmentType: string,
  now = new Date(),
): LearningSuggestion {
  const valid = outcomes.filter((outcome) => (
    Number.isFinite(outcome.predictedMinutes) &&
    Number.isFinite(outcome.actualMinutes) &&
    outcome.predictedMinutes > 0 &&
    outcome.actualMinutes > 0 &&
    !Number.isNaN(Date.parse(outcome.createdAt))
  ));
  const segment = valid.filter((outcome) => outcome.garmentType === garmentType);
  const selected = segment.length >= MINIMUM_SEGMENT_SAMPLES ? segment : valid;
  const scope: LearningSuggestion['scope'] = selected === segment ? 'garment' : 'shop';

  if (selected.length < MINIMUM_SAMPLES || !Number.isFinite(predictedMinutes) || predictedMinutes <= 0) {
    return {
      ready: false,
      multiplier: 1,
      adjustedMinutes: predictedMinutes,
      sampleSize: selected.length,
      scope,
      confidence: 'collecting',
      explanation: `Log ${Math.max(0, MINIMUM_SAMPLES - selected.length)} more completed run${MINIMUM_SAMPLES - selected.length === 1 ? '' : 's'} to unlock a personal suggestion.`,
    };
  }

  let weightedLogRatio = 0;
  let totalWeight = PRIOR_WEIGHT;
  for (const outcome of selected) {
    const ageDays = Math.max(0, (now.getTime() - Date.parse(outcome.createdAt)) / 86_400_000);
    const recencyWeight = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    // Cap extreme runs so a missed pause or bad time entry cannot dominate the model.
    const ratio = clamp(outcome.actualMinutes / outcome.predictedMinutes, 0.5, 2);
    weightedLogRatio += Math.log(ratio) * recencyWeight;
    totalWeight += recencyWeight;
  }

  const multiplier = clamp(Math.exp(weightedLogRatio / totalWeight), 0.75, 1.35);
  const confidence: LearningSuggestion['confidence'] = selected.length >= 20
    ? 'high'
    : selected.length >= 10
      ? 'medium'
      : 'low';
  const direction = multiplier >= 1 ? 'longer' : 'shorter';
  const percent = Math.round(Math.abs(multiplier - 1) * 100);

  return {
    ready: true,
    multiplier,
    adjustedMinutes: predictedMinutes * multiplier,
    sampleSize: selected.length,
    scope,
    confidence,
    explanation: percent < 3
      ? `Your ${scope === 'garment' ? garmentType : 'shop'} results are tracking close to the calculator estimate.`
      : `Your recent ${scope === 'garment' ? garmentType : 'shop'} runs suggest planning about ${percent}% ${direction}.`,
  };
}
