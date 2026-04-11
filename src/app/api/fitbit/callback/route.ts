import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { exchangeCode, saveFitbitTokens } from "@/lib/fitbit";

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?fitbit=error", req.url));
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/fitbit/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    await saveFitbitTokens(uid, tokens);
    return NextResponse.redirect(new URL("/", req.url));
  } catch (err) {
    console.error("Fitbit callback error:", err);
    return NextResponse.redirect(new URL("/?fitbit=error", req.url));
  }
}
