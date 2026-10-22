export interface LoginStageMetric {
  stage: string;
  durationMs: number;
  status: 'SUCCESS' | 'FAILURE' | 'CACHE_HIT' | 'SKIPPED';
  detail?: string;
  timestamp: number;
}

const loginStageMetrics: LoginStageMetric[] = [];

const isDevLoggingEnabled = (): boolean => {
  try {
    const env = (typeof import.meta !== 'undefined' && (import.meta as any).env)
      ? (import.meta as any).env
      : (typeof process !== 'undefined' ? process.env : {});
    return env?.DEV === true || env?.NODE_ENV !== 'production' || env?.VITE_LOGIN_PERF_LOG === 'true';
  } catch {
    return true;
  }
};

/**
 * Development-only timing logger for EduMentorX login stages.
 * Never logs passwords, tokens, or sensitive credentials.
 */
export function logLoginStage(
  stage: string,
  durationMs: number,
  status: 'SUCCESS' | 'FAILURE' | 'CACHE_HIT' | 'SKIPPED' = 'SUCCESS',
  detail?: string
): number {
  const roundedMs = +Math.max(0, durationMs).toFixed(2);
  const entry: LoginStageMetric = {
    stage,
    durationMs: roundedMs,
    status,
    detail,
    timestamp: Date.now(),
  };
  loginStageMetrics.push(entry);

  if (isDevLoggingEnabled()) {
    const suffix = detail ? ` (${detail})` : '';
    console.log(`[LOGIN-PERF] ${stage}: ${roundedMs}ms [${status}]${suffix}`);
  }
  return roundedMs;
}

export function getLoginStageMetrics(): LoginStageMetric[] {
  return [...loginStageMetrics];
}

export function clearLoginStageMetrics(): void {
  loginStageMetrics.length = 0;
}
