import { FreshnessStatus } from '../types';

export interface FreshnessResult {
  status: FreshnessStatus;
  elapsedMinutes: number | null;
  displayLabel: string;
  isStale: boolean;
  rawTimestamp?: string;
}

/**
 * Evaluates the freshness of a verified_at timestamp.
 * 
 * Rules:
 * - Recent: < 15 minutes ago
 * - Aging: 15 to 60 minutes ago
 * - Stale: > 60 minutes ago
 * - Unknown: No timestamp provided or invalid
 */
export function evaluateFreshness(
  timestamp?: string | null,
  referenceNow: Date = new Date(),
  thresholds = { recentMins: 15, agingMins: 60 }
): FreshnessResult {
  if (!timestamp) {
    return {
      status: 'unknown',
      elapsedMinutes: null,
      displayLabel: 'Verification pending',
      isStale: true,
    };
  }

  const parsed = new Date(timestamp);
  if (isNaN(parsed.getTime())) {
    return {
      status: 'unknown',
      elapsedMinutes: null,
      displayLabel: 'Invalid timestamp',
      isStale: true,
      rawTimestamp: timestamp,
    };
  }

  const diffMs = referenceNow.getTime() - parsed.getTime();
  // If timestamp is slightly in future (clock skew), treat as 0
  const elapsedMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (elapsedMinutes < thresholds.recentMins) {
    const timeLabel = elapsedMinutes === 0 ? 'just now' : `${elapsedMinutes}m ago`;
    return {
      status: 'recent',
      elapsedMinutes,
      displayLabel: `Verified ${timeLabel}`,
      isStale: false,
      rawTimestamp: timestamp,
    };
  }

  if (elapsedMinutes <= thresholds.agingMins) {
    return {
      status: 'aging',
      elapsedMinutes,
      displayLabel: `Verified ${elapsedMinutes}m ago`,
      isStale: false,
      rawTimestamp: timestamp,
    };
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const timeLabel = hours === 1 ? '1h ago' : `${hours}h ago`;
  return {
    status: 'stale',
    elapsedMinutes,
    displayLabel: `Last verified ${timeLabel} (Stale)`,
    isStale: true,
    rawTimestamp: timestamp,
  };
}
