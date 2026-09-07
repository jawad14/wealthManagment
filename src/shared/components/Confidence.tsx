import { formatPercent } from '@/shared/lib/money';

export interface ConfidenceProps {
  /** Match confidence 0–1, or null when the matcher produced no suggestion. */
  readonly score: number | null;
  /** Scores at or below this render in the "low" (amber) treatment. */
  readonly lowThreshold?: number;
}

/**
 * Confidence bar for machine-suggested matches.
 *
 * Design rule: "suggestions look different from facts" — anything a matcher
 * proposed carries this bar; posted records never do.
 */
export function Confidence({ score, lowThreshold = 0.6 }: ConfidenceProps) {
  const isLow = score === null || score <= lowThreshold;
  return (
    <span className={isLow ? 'conf low' : 'conf'}>
      <span className="bar">
        <i style={{ width: score === null ? 0 : `${Math.round(score * 100)}%` }} />
      </span>
      {score === null ? '—' : formatPercent(score, 0)}
    </span>
  );
}
