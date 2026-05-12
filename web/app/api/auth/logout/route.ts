import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { APP_URL } from "@/lib/api";

/**
 * Handles GET requests to log out a user by deleting authentication cookies and redirecting to the home page.
 *
 * This Next.js API route handler clears the 'wright_token' and 'wright_user' cookies from the cookie store and redirects the user to the application's root URL, effectively logging them out of the application.
 * @returns {Promise<NextResponse>} A NextResponse object that redirects the user to the application's home page (APP_URL).
 * @example
 * // This is a Next.js API route handler, called via:
 * // GET /api/auth/logout
 */
export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("wright_token");
  cookieStore.delete("wright_user");
  return NextResponse.redirect(`${APP_URL}/`);
}
