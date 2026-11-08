import type { AppData } from '../types';

export type BootView = 'splash' | 'dashboard' | 'login';

interface BootViewInput {
  hasData: boolean;
  restoring: boolean;
  splashDone: boolean;
}

/**
 * Decides what the app shell shows while the saved session is being restored.
 * Cached data always wins: the dashboard is shown while the refresh runs in the
 * background, and the login page only appears when there is nothing to show.
 */
export function resolveBootView({ hasData, restoring, splashDone }: BootViewInput): BootView {
  if (!splashDone) return 'splash';
  if (hasData) return 'dashboard';
  return restoring ? 'splash' : 'login';
}

interface AuthSignalInput {
  academiaCookies?: Record<string, string> | null;
  savedCreds?: { username?: string } | null;
  cachedData?: AppData | null;
}

/** True when there is something we can use to re-establish an Academia session. */
export function hasAcademiaAuthSignal({ academiaCookies, savedCreds, cachedData }: AuthSignalInput): boolean {
  const dedicatedCookies = academiaCookies ? Object.keys(academiaCookies).length > 0 : false;
  const cachedCookies = cachedData?.session?.academiaCookies
    ? Object.keys(cachedData.session.academiaCookies).length > 0
    : false;

  return Boolean(
    dedicatedCookies ||
    cachedCookies ||
    savedCreds?.username ||
    cachedData?.metadata?.loginBy === 'demo',
  );
}

interface StudentPortalOfferInput {
  hasPortalCookies: boolean;
  skipped: boolean;
}

/** The Student Portal is optional; never re-offer it once the user has skipped. */
export function shouldOfferStudentPortal({ hasPortalCookies, skipped }: StudentPortalOfferInput): boolean {
  return !hasPortalCookies && !skipped;
}
