import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("wright_token")?.value ?? "";
  // Mask middle of key for display, return full for config copy
  const masked = token ? `${token.slice(0, 7)}${"•".repeat(16)}${token.slice(-4)}` : "";
  return NextResponse.json({ key: token, masked });
}
