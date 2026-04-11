import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/gcp";
import type { WorkoutRecord } from "@/types";

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

  return NextResponse.json({ records });
}
