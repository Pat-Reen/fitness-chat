import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/gcp";

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = getDb();
  const doc = await db.collection("equipment").doc("default").get();
  const items = doc.exists ? (doc.data()?.items as string[]) : [];
  return NextResponse.json({ items });
}

export async function PUT(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { items } = await req.json();
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const db = getDb();
  await db.collection("equipment").doc("default").set({ items });
  return NextResponse.json({ ok: true });
}
