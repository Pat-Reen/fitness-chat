import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import { generateExerciseSvg, DEFAULT_IMAGE_STYLE } from "@/lib/image-generation";
import { exerciseToSlug } from "@/lib/exercises";
import type { ExerciseImage } from "@/types";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db.collection("exercise_images").get();
  const images: ExerciseImage[] = snap.docs.map((d) => ({
    slug: d.id,
    ...(d.data() as Omit<ExerciseImage, "slug">),
  }));
  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const { exerciseName } = await req.json();
    if (!exerciseName) {
      return NextResponse.json({ error: "exerciseName required" }, { status: 400 });
    }

    const db = getAdminDb();
    const storage = getAdminStorage();

    // Load current style prompt
    const styleDoc = await db.collection("image_style").doc("default").get();
    const stylePrompt = styleDoc.exists
      ? (styleDoc.data()?.prompt as string)
      : DEFAULT_IMAGE_STYLE;

    // Generate SVG via Claude
    const svg = await generateExerciseSvg(exerciseName, stylePrompt);

    // Upload to Firebase Storage
    const slug = exerciseToSlug(exerciseName);
    const bucket = storage.bucket();
    const file = bucket.file(`exercises/${slug}.svg`);
    await file.save(Buffer.from(svg, "utf-8"), {
      metadata: { contentType: "image/svg+xml", cacheControl: "public, max-age=31536000" },
    });
    await file.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/exercises/${slug}.svg`;

    // Save metadata to Firestore
    const record: Omit<ExerciseImage, "slug"> = {
      exerciseName,
      imageUrl,
      generatedAt: Date.now(),
      style: stylePrompt,
    };
    await db.collection("exercise_images").doc(slug).set(record);

    return NextResponse.json({ slug, imageUrl, ok: true });
  } catch (err) {
    console.error("Image generation error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
