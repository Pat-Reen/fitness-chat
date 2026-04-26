import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/gcp";
import { generateAndSaveExerciseImage } from "@/lib/image-generation";
import type { ExerciseImage } from "@/types";

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const db = getDb();
  const snap = await db.collection("exercise_images").get();
  const images: ExerciseImage[] = snap.docs.map((d) => ({
    slug: d.id,
    ...(d.data() as Omit<ExerciseImage, "slug">),
  }));
  return NextResponse.json({ images });
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const { exerciseName } = await req.json();
    if (!exerciseName) {
      return NextResponse.json({ error: "exerciseName required" }, { status: 400 });
    }
    const imageUrl = await generateAndSaveExerciseImage(exerciseName);
    return NextResponse.json({ imageUrl, ok: true });
  } catch (err) {
    console.error("Image generation error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
