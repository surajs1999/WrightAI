import { cookies } from "next/headers";

export interface UserInfo {
  id?: string;
  email?: string;
  first_name?: string;
}

/**
 * Retrieves the currently authenticated user by parsing the 'wright_user' cookie value.
 *
 * Reads the server-side cookie store asynchronously and attempts to deserialize the 'wright_user' cookie as a UserInfo object. Returns null if the cookie is absent or if JSON parsing fails.
 * @returns {Promise<UserInfo | null>} A promise that resolves to a UserInfo object if the cookie exists and is valid JSON, or null if the cookie is missing or malformed.
 * @example
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log(user.name); // e.g., 'Jane Doe'
 * } else {
 *   console.log('No authenticated user found.');
 * }
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
 * Retrieves the authentication token from the cookie store, returning null if not found.
 *
 * Asynchronously accesses the cookie store and attempts to read the value of the 'wright_token' cookie. If the cookie does not exist or its value is undefined, the function returns null instead.
 * @returns {Promise<string | null>} A promise that resolves to the string value of the 'wright_token' cookie, or null if the cookie is absent or has no value.
 * @example
 * const token = await getToken();
 * if (token) {
 *   console.log('Authenticated with token:', token);
 * } else {
 *   console.log('No authentication token found.');
 * }
 */


export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("wright_token")?.value ?? null;
}
