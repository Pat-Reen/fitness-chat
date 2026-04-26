import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchGarminActivities } from "@/lib/garmin";

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const activities = await fetchGarminActivities(user.email);
    return NextResponse.json({ activities });
  } catch (err) {
    console.error("Garmin activities error:", err);
    return NextResponse.json({ error: "Failed to fetch Garmin activities" }, { status: 500 });
  }
}
