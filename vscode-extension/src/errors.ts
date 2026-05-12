/**
 * Converts raw API/network errors into user-friendly messages.
 * Never expose status codes, stack traces, or backend implementation details.
 */
/**
 * Converts an unknown error into a user-friendly message by pattern-matching common error types.
 *
 * @param err - The error to convert, which can be an Error object, string, or any other type.
 * @returns A user-friendly error message describing the issue and suggesting remediation steps.
 */
/**
 * Converts an unknown error into a user-friendly error message by pattern-matching common error types.
 *
 * Examines the error message or string representation of an error and returns a human-readable message tailored to specific error conditions such as authentication failures, network errors, rate limiting, server errors, resource not found, injection point issues, and workspace problems. Falls back to a generic error message if no specific pattern is matched.
 *
 * @param {unknown} err - The error to convert, which can be an Error instance, string, or any other type.
 * @returns {string} A user-friendly error message describing the issue and suggesting how to resolve it.
 * @example
 * const message = friendlyError(new Error('401 Unauthorized')); // Returns: "Invalid or missing API key. Open Settings and update Wright: Api Key."
 */
/**
 * Converts an unknown error into a user-friendly error message with contextual guidance based on error patterns.
 *
 * Analyzes the error message or string representation and matches it against common error patterns (authentication, rate limiting, server errors, network issues, etc.) to return a helpful, actionable message for the user. Falls back to a generic message if no pattern matches.
 *
 * @param {unknown} err - The error object or value to convert into a friendly message. Can be an Error instance, string, or any other type.
 * @returns {string} A user-friendly error message with contextual guidance based on the error type detected.
 * @example
 * const message = friendlyError(new Error('401 Unauthorized')); // Returns: "Invalid or missing API key. Open Settings and update Wright: Api Key."
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
export /**
 * Converts an API error string into a user-friendly error message based on pattern matching.
 *
 * Analyzes the provided API error string using regular expression patterns to identify common error categories (injection point errors, parse/syntax errors, authentication errors) and returns an appropriate human-readable message for each category. Returns a generic error message for null, undefined, or unrecognized error strings.
 *
 * @param {string | null | undefined} apiError - The raw API error message to convert into a user-friendly format.
 * @returns {string} A user-friendly error message that corresponds to the identified error category or a generic fallback message.
 * @example
 * friendlyApiError("injection point not found") // Returns: "Couldn't locate this function. Place your cursor inside the function and try again."
 */
/**
 * Converts a raw API error message into a user-friendly error message.
 *
 * Analyzes the API error string using pattern matching to identify specific error types (injection point errors, parsing errors, authentication errors) and returns an appropriate user-friendly message for each case.
 *
 * @param {string | null | undefined} apiError - The raw error message from the API, or null/undefined if no error message is available.
 * @returns {string} A user-friendly error message appropriate for the type of error detected, or a generic error message if the error type cannot be determined.
 * @example
 * const message = friendlyApiError('injection point not found'); // Returns: "Couldn't locate this function. Place your cursor inside the function and try again."
 */
function friendlyApiError(apiError: string | null | undefined): string {
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
