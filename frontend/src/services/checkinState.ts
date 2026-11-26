import type { CheckInResponse } from '../types';

export const LATEST_CHECKIN_KEY = 'calmspace_latest_checkin';
export const HIGH_RISK_EXITED_KEY = 'calmspace_high_risk_exited';

export type CheckInResultResolution =
  | { action: 'redirect_overview' }
  | { action: 'redirect_checkin' }
  | { action: 'render'; result: CheckInResponse };

/**
 * Persist a successful check-in response and clear any prior Safe Exit sticky flag.
 * Failed submissions must NOT call this helper so prior Safe Exit protections remain intact.
 */
export function persistSuccessfulCheckIn(
  response: CheckInResponse,
  store: Pick<Storage, 'setItem' | 'removeItem'> = sessionStorage
): void {
  store.setItem(LATEST_CHECKIN_KEY, JSON.stringify(response));
  store.removeItem(HIGH_RISK_EXITED_KEY);
}

/**
 * Execute the Safe Exit policy: clear cached check-in results and mark the session
 * as safely exited so browser history back cannot re-open the HIGH-risk view.
 */
export function executeSafeExitState(
  store: Pick<Storage, 'setItem' | 'removeItem'> = sessionStorage
): void {
  store.removeItem(LATEST_CHECKIN_KEY);
  store.setItem(HIGH_RISK_EXITED_KEY, 'true');
}

/**
 * Clear all local check-in navigation state (used on full privacy erasure).
 */
export function clearCheckInSessionState(
  store: Pick<Storage, 'removeItem'> = sessionStorage
): void {
  store.removeItem(LATEST_CHECKIN_KEY);
  store.removeItem(HIGH_RISK_EXITED_KEY);
}

/**
 * Determine how CheckInResultPage should resolve on mount or navigation.
 */
export function resolveCheckInResultState(
  locationStateResult: CheckInResponse | undefined,
  store: Pick<Storage, 'getItem'> = sessionStorage
): CheckInResultResolution {
  if (store.getItem(HIGH_RISK_EXITED_KEY) === 'true') {
    return { action: 'redirect_overview' };
  }

  if (locationStateResult) {
    return { action: 'render', result: locationStateResult };
  }

  const stored = store.getItem(LATEST_CHECKIN_KEY);
  if (!stored) {
    return { action: 'redirect_checkin' };
  }

  try {
    return { action: 'render', result: JSON.parse(stored) as CheckInResponse };
  } catch {
    return { action: 'redirect_checkin' };
  }
}
