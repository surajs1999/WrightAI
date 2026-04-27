import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { APP_URL } from "@/lib/api";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("wright_token");
  cookieStore.delete("wright_user");
  return NextResponse.redirect(`${APP_URL}/`);
}
