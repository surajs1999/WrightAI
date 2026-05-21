export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://wrightai-api.fly.dev";

export const APP_URL =
  process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Constructs a standard HTTP headers object containing the Content-Type and Wright API key for authenticated API requests.
 *
 * @param {string} token - The Wright API authentication token to include in the 'X-Wright-API-Key' header.
 * @returns {HeadersInit} An object containing 'Content-Type' set to 'application/json' and 'X-Wright-API-Key' set to the provided token, suitable for use as HTTP request headers.
 * @example
 * const headers = apiHeaders('my-secret-api-token-123');
 * fetch('https://api.wright.com/endpoint', { method: 'GET', headers });
 */



export function apiHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Wright-API-Key": token,
  };
}
