import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import type { WorkoutRecord } from "@/types";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .doc(user.uid)
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
