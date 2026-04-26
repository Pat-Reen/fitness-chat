import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb, getImagesBucket } from "@/lib/gcp";
import { generateExerciseSvg, DEFAULT_IMAGE_STYLE } from "@/lib/image-generation";
import type { ExerciseImage } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { slug } = await params;
  const db = getDb();
  const bucket = getImagesBucket();

  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // Custom upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

      const bytes = await file.arrayBuffer();
      const storageFile = bucket.file(`exercises/${slug}.svg`);
      await storageFile.save(Buffer.from(bytes), {
        metadata: { contentType: "image/svg+xml", cacheControl: "public, max-age=31536000" },
      });
      await storageFile.makePublic();
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/exercises/${slug}.svg`;
      await db.collection("exercise_images").doc(slug).update({ imageUrl, generatedAt: Date.now() });
      return NextResponse.json({ imageUrl, ok: true });
    }

    // Regenerate
    const { exerciseName } = await req.json();
    const styleDoc = await db.collection("image_style").doc("default").get();
    const stylePrompt = styleDoc.exists
      ? (styleDoc.data()?.prompt as string)
      : DEFAULT_IMAGE_STYLE;

    const svg = await generateExerciseSvg(exerciseName, stylePrompt);
    const storageFile = bucket.file(`exercises/${slug}.svg`);
    await storageFile.save(Buffer.from(svg, "utf-8"), {
      metadata: { contentType: "image/svg+xml", cacheControl: "public, max-age=31536000" },
    });
    await storageFile.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/exercises/${slug}.svg`;

    const update: Partial<Omit<ExerciseImage, "slug">> = {
      imageUrl,
      generatedAt: Date.now(),
      style: stylePrompt,
    };
    await db.collection("exercise_images").doc(slug).update(update);
    return NextResponse.json({ imageUrl, ok: true });
  } catch (err) {
    console.error("Image update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
