import { getAdminDb } from "./firebase-admin";
import type { Activity, GarminCredentials } from "@/types";

/**
 * Fetch Garmin activities for a user using stored credentials.
 * The garmin-connect library is CommonJS; we import dynamically to avoid ESM issues.
 */
export async function fetchGarminActivities(uid: string): Promise<Activity[]> {
  const db = getAdminDb();
  const doc = await db.collection("users").doc(uid).get();
  const creds = doc.data()?.garminCredentials as GarminCredentials | undefined;
  if (!creds) throw new Error("No Garmin credentials stored for this user");

  // Dynamic import for CJS compatibility
  const { GarminConnect } = await import("garmin-connect");
  const client = new GarminConnect({ username: creds.email, password: creds.password });
  await client.login(creds.email, creds.password);

  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - 7);
  const startDate = afterDate.toISOString().split("T")[0];

  const raw = await client.getActivities(0, 20);

  const activities: Activity[] = (raw as unknown as Record<string, unknown>[])
    .filter((a) => {
      const start = String(a.startTimeLocal ?? "");
      return start >= startDate;
    })
    .map((a) => ({
      date: String(a.startTimeLocal ?? "").split(" ")[0],
      type: String((a.activityType as Record<string, unknown> | undefined)?.typeKey ?? a.activityName ?? "Activity"),
      duration:
        a.duration != null
          ? `${Math.round(Number(a.duration) / 60)} min`
          : undefined,
      distance:
        a.distance != null
          ? `${Number(Number(a.distance) / 1000).toFixed(2)} km`
          : undefined,
      pace:
        a.averageSpeed != null && Number(a.averageSpeed) > 0
          ? formatPace(Number(a.averageSpeed))
          : undefined,
      heartRate:
        a.averageHR != null ? `${a.averageHR} bpm avg` : undefined,
      calories:
        a.calories != null ? Number(a.calories) : undefined,
      trainingEffect:
        a.aerobicTrainingEffect != null
          ? `TE ${Number(a.aerobicTrainingEffect).toFixed(1)}`
          : undefined,
      elevationGain:
        a.elevationGain != null
          ? `${Math.round(Number(a.elevationGain))}m gain`
          : undefined,
    }));

  return activities;
}

function formatPace(speedMps: number): string {
  if (speedMps <= 0) return "";
  const minPerKm = 1000 / 60 / speedMps;
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}
