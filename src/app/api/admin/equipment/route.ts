import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = getAdminDb();
  const doc = await db.collection("equipment").doc("default").get();
  const items = doc.exists ? (doc.data()?.items as string[]) : [];
  return NextResponse.json({ items });
}

export async function PUT(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { items } = await req.json();
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection("equipment").doc("default").set({ items });
  return NextResponse.json({ ok: true });
}
