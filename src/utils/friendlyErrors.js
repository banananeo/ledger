const providerLabel = (provider) => provider === 'student-portal' ? 'Student Portal' : 'Academia';

/** Turn authentication and CAPTCHA failures into clear next steps. */
export function friendlyLoginError(error, provider, action = 'login') {
  const service = providerLabel(provider);
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  const lower = message.toLowerCase();
  const status = Number(error?.statusCode ?? error?.status);

  if (action === 'captcha' && (!message || error?.name === 'TypeError' || /failed to fetch|network|timeout|unreachable/i.test(message))) {
    return `We couldn't load the ${service} security code. Check your internet connection and try again.`;
  }
  if (/captcha/.test(lower) && /expired|session/.test(lower)) {
    return 'That security code has expired. Load a new code and try again.';
  }
  if (/captcha/.test(lower) && /invalid|wrong|incorrect/.test(lower)) {
    return 'That security code was not accepted. Enter the new code shown and try again.';
  }
  if (/captcha/.test(lower) && /required|verification/.test(lower)) {
    return `The ${service} needs a security code before it can sign you in. Please try again.`;
  }
  if (error?.name === 'TypeError' || /failed to fetch|network error|server is unreachable|timed out|timeout/i.test(message)) {
    return `We couldn't reach ${service}. Check your internet connection and try again shortly.`;
  }
  if (status === 429 || /too many attempts|rate limited/.test(lower)) {
    return 'There have been too many sign-in attempts. Please wait a minute and try again.';
  }
  if (status === 401 || status === 403 || /invalid credentials|incorrect password|invalid srm net id|username or password incorrect|authentication failed/.test(lower)) {
    return `Those ${service} sign-in details were not accepted. Check your Net ID and password, then try again.`;
  }
  if (/username and password are required|net id and password are required/.test(lower)) {
    return 'Enter both your Net ID and password to continue.';
  }
  if (status >= 500 || /service is unreachable|temporarily unavailable/.test(lower)) {
    return `${service} is having a temporary problem. Please try signing in again in a little while.`;
  }
  if (action === 'captcha') {
    return `We couldn't load the ${service} security code. Please try again.`;
  }
  return `We couldn't sign you in to ${service}. Check your details and try again.`;
}

/** Explain brief-generation outages in plain language, with a little humor for overloads. */
export function friendlyBriefError(error) {
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  const lower = message.toLowerCase();
  const status = Number(error?.statusCode ?? error?.status);

  if (/not configured|api key/.test(lower)) {
    return 'Ledger AI is not available just yet. Please try again later.';
  }
  if (status === 503 || /high demand|overloaded|at capacity|resource exhausted|service is busy/.test(lower)) {
    return 'Ledger AI is having a very popular day—its study-plan queue is longer than the lunch line. Give it a minute, then try again.';
  }
  if (status === 429 || /rate limited|too many requests/.test(lower)) {
    return 'Ledger AI has a full queue right now. Give it a moment to catch its breath, then try again.';
  }
  if (error?.name === 'TypeError' || /failed to fetch|network error/.test(lower)) {
    return "Ledger AI couldn't connect just now. Check your internet and give it another try.";
  }
  return "Ledger AI couldn't prepare your brief right now. Please try again.";
}
