/**
 * Converts raw API/network errors into user-friendly messages.
 * Never expose status codes, stack traces, or backend implementation details.
 */
export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/401|403|not authorized|api key|apikey/i.test(raw)) {
    return "Invalid or missing API key. Open Settings and update Wright: Api Key.";
  }
  if (/404/i.test(raw)) {
    return "Wright couldn't find that resource. Make sure the file is indexed.";
  }
  if (/429|rate.?limit/i.test(raw)) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (/5\d\d|server error|internal/i.test(raw)) {
    return "The Wright server encountered an error. Please try again in a moment.";
  }
  if (/fetch|network|connect|ECONNREFUSED|ETIMEDOUT|Failed to fetch/i.test(raw)) {
    return "Could not reach the Wright server. Check your internet connection.";
  }
  if (/injection point|inject/i.test(raw)) {
    return "Couldn't locate this function. Place your cursor inside the function and try again.";
  }
  if (/no workspace|workspace folder/i.test(raw)) {
    return "Please open a folder or workspace first.";
  }
  return "Something went wrong. Please try again.";
}

/** Sanitises backend error strings returned in API response bodies. */
export function friendlyApiError(apiError: string | null | undefined): string {
  if (!apiError) return "Something went wrong. Please try again.";
  if (/injection point|inject/i.test(apiError)) {
    return "Couldn't locate this function. Place your cursor inside the function and try again.";
  }
  if (/parse|syntax|invalid/i.test(apiError)) {
    return "The file could not be parsed. Make sure it has no syntax errors.";
  }
  if (/auth|key|forbidden/i.test(apiError)) {
    return "Invalid API key. Open Settings and update Wright: Api Key.";
  }
  return "Something went wrong. Please try again.";
}
