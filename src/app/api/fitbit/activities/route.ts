import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getValidFitbitToken, fetchFitbitActivities } from "@/lib/fitbit";

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const accessToken = await getValidFitbitToken(user.email);
    if (!accessToken) {
      return NextResponse.json({ error: "No Fitbit token" }, { status: 401 });
    }
    const activities = await fetchFitbitActivities(accessToken);
    return NextResponse.json({ activities });
  } catch (err) {
    console.error("Fitbit activities error:", err);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
