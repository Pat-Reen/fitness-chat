import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFitbitAuthUrl } from "@/lib/fitbit";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/fitbit/callback`;
  const url = getFitbitAuthUrl(redirectUri);
  return NextResponse.redirect(url);
}
