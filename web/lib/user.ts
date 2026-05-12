import { cookies } from "next/headers";

export interface UserInfo {
  id?: string;
  email?: string;
  first_name?: string;
}

/**
 * Retrieves the current user information from the wright_user cookie.
 *
 * Reads the wright_user cookie value, parses it as JSON, and returns the UserInfo object. Returns null if the cookie does not exist or if JSON parsing fails.
 * @returns {Promise<UserInfo | null>} A promise that resolves to the UserInfo object if the cookie exists and is valid JSON, or null if the cookie is missing or parsing fails.
 * @example
 * const user = await getCurrentUser();
 */
export async function getCurrentUser(): Promise<UserInfo | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("wright_user")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

/**
 * Retrieves the authentication token from the 'wright_token' cookie.
 *
 * Asynchronously accesses the cookie store and extracts the value of the 'wright_token' cookie if it exists, returning null if the cookie is not found.
 * @returns {Promise<string | null>} A promise that resolves to the token string if the cookie exists, or null if the cookie is not found.
 * @example
 * const token = await getToken();
 */
export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("wright_token")?.value ?? null;
}
