import Anthropic from "@anthropic-ai/sdk";
import { getImagesBucket, getDb } from "./gcp";
import { exerciseToSlug } from "./exercises";
import type { ExerciseImage } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const DEFAULT_IMAGE_STYLE =
  "Minimal SVG diagram, viewBox 0 0 200 200, 2px black strokes on white background, " +
  "simple geometric stick figure showing correct body position, labeled equipment outline, " +
  "no fill colours, no gradients, clean line art only. Include a small text label at the bottom.";

/**
 * Generate an SVG diagram for a machine/cable exercise using Claude.
 * Returns the raw SVG string.
 */
export async function generateExerciseSvg(
  exerciseName: string,
  stylePrompt: string = DEFAULT_IMAGE_STYLE
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content:
          `Generate an SVG diagram showing how to perform the exercise: "${exerciseName}".\n\n` +
          `Style requirements: ${stylePrompt}\n\n` +
          `Requirements:\n` +
          `- Output ONLY the SVG code, starting with <svg and ending with </svg>\n` +
          `- No markdown, no explanation, no code fences\n` +
          `- viewBox must be "0 0 200 200"\n` +
          `- Show the key equipment and the stick figure in the starting position\n` +
          `- Include a label text element at the bottom with the exercise name\n` +
          `- Keep it simple and recognisable`,
      },
    ],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) throw new Error(`No SVG found in Claude response for: ${exerciseName}`);
  return svgMatch[0];
}

/**
 * Generate an SVG, upload it to GCS, and record metadata in Firestore.
 * Returns the public GCS URL.
 */
export async function generateAndSaveExerciseImage(
  exerciseName: string,
  stylePrompt?: string
): Promise<string> {
  const db = getDb();
  const bucket = getImagesBucket();

  // Load style from Firestore if not provided
  if (!stylePrompt) {
    const styleDoc = await db.collection("image_style").doc("default").get();
    stylePrompt = styleDoc.exists
      ? (styleDoc.data()?.prompt as string)
      : DEFAULT_IMAGE_STYLE;
  }

  const svg = await generateExerciseSvg(exerciseName, stylePrompt);
  const slug = exerciseToSlug(exerciseName);

  const file = bucket.file(`exercises/${slug}.svg`);
  await file.save(Buffer.from(svg, "utf-8"), {
    metadata: {
      contentType: "image/svg+xml",
      cacheControl: "public, max-age=31536000",
    },
  });
  await file.makePublic();

  const imageUrl = `https://storage.googleapis.com/${bucket.name}/exercises/${slug}.svg`;

  const record: Omit<ExerciseImage, "slug"> = {
    exerciseName,
    imageUrl,
    generatedAt: Date.now(),
    style: stylePrompt,
  };
  await db.collection("exercise_images").doc(slug).set(record);

  return imageUrl;
}
