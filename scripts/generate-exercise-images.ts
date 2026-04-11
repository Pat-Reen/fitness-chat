/**
 * One-time script: generate SVG images for all machine exercises,
 * upload to Cloud Storage, and record metadata in Cloud Firestore.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/generate-exercise-images.ts
 *
 * Required env vars (in .env.local):
 *   GCP_PROJECT_ID
 *   GCS_BUCKET_NAME
 *   ANTHROPIC_API_KEY
 *   GOOGLE_APPLICATION_CREDENTIALS  (path to service-account key JSON)
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import Anthropic from "@anthropic-ai/sdk";
import { Firestore } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";

const MACHINE_EXERCISES = [
  "Cable Fly / Crossover",
  "Seated Cable Row",
  "Lat Pulldown",
  "Face Pull (Cable)",
  "Cable Lateral Raise",
  "Cable Bicep Curl",
  "Tricep Pushdown (Cable)",
  "Straight-Arm Cable Pulldown",
  "Cable Crunch",
  "Pallof Press (Cable)",
  "Chest Press Machine",
  "Chest Fly Machine",
  "Leg Press Machine",
  "Leg Extension Machine",
  "Leg Curl Machine",
  "Smith Machine Squat",
  "T-Bar Row",
  "Rowing Machine",
  "Stationary Bike",
  "Spin Bike",
  "Elliptical Trainer",
  "Stair Climber",
  "Treadmill Run/Walk",
];

const DEFAULT_STYLE =
  "Minimal SVG diagram, viewBox 0 0 200 200, 2px black strokes on white background, " +
  "simple geometric stick figure showing correct body position, labeled equipment outline, " +
  "no fill colours, no gradients, clean line art only. Include a small text label at the bottom.";

function exerciseToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function generateSvg(client: Anthropic, name: string, style: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content:
        `Generate an SVG diagram showing how to perform: "${name}".\n\n` +
        `Style: ${style}\n\n` +
        `- Output ONLY raw SVG (starting <svg, ending </svg>)\n` +
        `- viewBox="0 0 200 200"\n` +
        `- Simple stick figure + labeled equipment\n` +
        `- Label at the bottom with exercise name`,
    }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const match = text.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) throw new Error(`No SVG in response for: ${name}`);
  return match[0];
}

async function main() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new Error("GCS_BUCKET_NAME not set");

  const db = new Firestore({ projectId: process.env.GCP_PROJECT_ID });
  const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
  const bucket = storage.bucket(bucketName);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Load or seed the style prompt
  const styleDoc = await db.collection("image_style").doc("default").get();
  const style = styleDoc.exists ? (styleDoc.data()?.prompt as string) : DEFAULT_STYLE;
  if (!styleDoc.exists) {
    await db.collection("image_style").doc("default").set({ prompt: DEFAULT_STYLE });
    console.log("Created image_style/default");
  }

  const outDir = path.join(__dirname, "../.generated-svgs");
  fs.mkdirSync(outDir, { recursive: true });

  for (const name of MACHINE_EXERCISES) {
    const slug = exerciseToSlug(name);

    const existing = await db.collection("exercise_images").doc(slug).get();
    if (existing.exists) {
      console.log(`  skip  ${name}`);
      continue;
    }

    console.log(`  gen   ${name} ...`);
    try {
      const svg = await generateSvg(client, name, style);
      fs.writeFileSync(path.join(outDir, `${slug}.svg`), svg);

      const file = bucket.file(`exercises/${slug}.svg`);
      await file.save(Buffer.from(svg, "utf-8"), {
        metadata: { contentType: "image/svg+xml", cacheControl: "public, max-age=31536000" },
      });
      await file.makePublic();

      const imageUrl = `https://storage.googleapis.com/${bucketName}/exercises/${slug}.svg`;
      await db.collection("exercise_images").doc(slug).set({
        exerciseName: name, imageUrl, generatedAt: Date.now(), style,
      });

      console.log(`  done  ${name}`);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ERROR ${name}:`, err);
    }
  }

  console.log("\nAll done.");
}

main().catch(console.error);
