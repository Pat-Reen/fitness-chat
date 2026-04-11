import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import { generateExerciseSvg } from "@/lib/image-generation";
import type { ExerciseImage } from "@/types";

// PATCH: replace image (upload file or regenerate)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { slug } = await params;
  const db = getAdminDb();
  const storage = getAdminStorage();

  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // Upload custom image
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      const bucket = storage.bucket();
      const storageFile = bucket.file(`exercises/${slug}.svg`);
      await storageFile.save(Buffer.from(bytes), {
        metadata: { contentType: "image/svg+xml", cacheControl: "public, max-age=31536000" },
      });
      await storageFile.makePublic();
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/exercises/${slug}.svg`;
      await db.collection("exercise_images").doc(slug).update({ imageUrl, generatedAt: Date.now() });
      return NextResponse.json({ imageUrl, ok: true });
    }

    // JSON body: regenerate
    const body = await req.json();
    const { exerciseName } = body;

    const styleDoc = await db.collection("image_style").doc("default").get();
    const stylePrompt = styleDoc.exists
      ? (styleDoc.data()?.prompt as string)
      : undefined;

    const svg = await generateExerciseSvg(exerciseName, stylePrompt);

    const bucket = storage.bucket();
    const storageFile = bucket.file(`exercises/${slug}.svg`);
    await storageFile.save(Buffer.from(svg, "utf-8"), {
      metadata: { contentType: "image/svg+xml", cacheControl: "public, max-age=31536000" },
    });
    await storageFile.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/exercises/${slug}.svg`;

    const update: Partial<ExerciseImage> = {
      imageUrl,
      generatedAt: Date.now(),
      ...(stylePrompt ? { style: stylePrompt } : {}),
    };
    await db.collection("exercise_images").doc(slug).update(update);

    return NextResponse.json({ imageUrl, ok: true });
  } catch (err) {
    console.error("Image update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
