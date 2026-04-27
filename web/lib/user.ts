import { cookies } from "next/headers";

export interface UserInfo {
  id?: string;
  email?: string;
  first_name?: string;
}

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

export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("wright_token")?.value ?? null;
}
