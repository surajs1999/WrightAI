export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://wrightai-api.fly.dev";

export const APP_URL =
  process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Creates an HTTP headers object with Content-Type and API key authentication for Wright API requests.
 *
 * Constructs a HeadersInit object containing the standard JSON content type header and the Wright API authentication key header. This function is typically used to prepare headers for HTTP requests to the Wright API.
 *
 * @param {string} token - The Wright API authentication token to be included in the X-Wright-API-Key header.
 * @returns {HeadersInit} An object containing HTTP headers with Content-Type set to application/json and X-Wright-API-Key set to the provided token.
 * @example
 * const headers = apiHeaders('my-api-token-12345');
 */
export function apiHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Wright-API-Key": token,
  };
}
