import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/gcp";
import { trimWorkout } from "@/lib/workout-format";

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { markdownText, ...meta } = body;

    const record = trimWorkout(markdownText ?? "", {
      type: meta.type ?? "workout",
      mode: meta.mode,
      duration: meta.duration,
      focusGroups: meta.focusGroups,
      exercises: meta.exercises,
      equipment: meta.equipment,
      goal: meta.goal ?? "",
      experience: meta.experience ?? "",
      distance: meta.distance,
      runType: meta.runType,
    });

    const db = getDb();
    const ref = await db
      .collection("users")
      .doc(user.email)
      .collection("workouts")
      .add(record);

    return NextResponse.json({ id: ref.id, ok: true });
  } catch (err) {
    console.error("Save error:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
