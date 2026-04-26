import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/gcp";
import { getValidFitbitToken, fetchFitbitActivities } from "@/lib/fitbit";
import { fetchGarminActivities } from "@/lib/garmin";
import type { WorkoutRecord, Activity } from "@/types";

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = getDb();
  const snap = await db
    .collection("users")
    .doc(user.email)
    .collection("workouts")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const records: WorkoutRecord[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WorkoutRecord, "id">),
  }));

  // Dates that already have a saved workout — used to deduplicate tracker activities
  const savedDates = new Set(
    records.map((r) => new Date(r.createdAt).toISOString().split("T")[0])
  );

  // Fetch tracker activities; suppress errors so a failed token doesn't break history
  let trackerActivities: Activity[] = [];
  try {
    if (user.platform === "fitbit") {
      const token = await getValidFitbitToken(user.email);
      if (token) trackerActivities = await fetchFitbitActivities(token);
    } else {
      trackerActivities = await fetchGarminActivities(user.email);
    }
  } catch {
    // Non-fatal — show history without tracker activities
  }

  // Only include tracker activities for days that have no saved workout
  const uniqueActivities = trackerActivities.filter((a) => !savedDates.has(a.date));

  return NextResponse.json({ records, trackerActivities: uniqueActivities });
}
