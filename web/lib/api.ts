export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://wrightai-api.fly.dev";

export const APP_URL =
  process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function apiHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Wright-API-Key": token,
  };
}
