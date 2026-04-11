import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = getAdminDb();
  const snap = await db.collection("exercises").get();
  const exercises: Record<string, string[]> = {};
  snap.docs.forEach((d) => {
    exercises[d.id] = d.data().items as string[];
  });
  return NextResponse.json({ exercises });
}

export async function PUT(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { groupName, items } = await req.json();
  if (!groupName || !Array.isArray(items)) {
    return NextResponse.json({ error: "groupName and items required" }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection("exercises").doc(groupName).set({ items });
  return NextResponse.json({ ok: true });
}
