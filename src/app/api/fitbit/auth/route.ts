import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFitbitAuthUrl } from "@/lib/fitbit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/fitbit/callback`;
  return NextResponse.redirect(getFitbitAuthUrl(redirectUri));
}
