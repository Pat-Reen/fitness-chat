/**
 * One-time script: generate SVG images for all machine exercises and upload to Firebase Storage.
 *
 * Prerequisites:
 *   - Set ANTHROPIC_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *     in .env.local (or export them in your shell)
 *   - npm install dotenv (or use: npx dotenv-cli -e .env.local -- npx ts-node ...)
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/generate-exercise-images.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import Anthropic from "@anthropic-ai/sdk";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

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
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateSvg(
  client: Anthropic,
  exerciseName: string,
  stylePrompt: string
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
  if (!svgMatch) throw new Error(`No SVG in response for: ${exerciseName}`);
  return svgMatch[0];
}

async function main() {
  if (getApps().length === 0) {
    const svcAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!svcAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
    initializeApp({
      credential: cert(JSON.parse(svcAccount)),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  const db = getFirestore();
  const storage = getStorage();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Load or seed global style prompt
  const styleDoc = await db.collection("image_style").doc("default").get();
  const stylePrompt = styleDoc.exists
    ? (styleDoc.data()?.prompt as string)
    : DEFAULT_STYLE;

  if (!styleDoc.exists) {
    await db.collection("image_style").doc("default").set({ prompt: DEFAULT_STYLE });
    console.log("Seeded image_style/default");
  }

  // Create local output dir for inspection
  const outDir = path.join(__dirname, "../.generated-svgs");
  fs.mkdirSync(outDir, { recursive: true });

  const results: Record<string, string> = {};

  for (const exerciseName of MACHINE_EXERCISES) {
    const slug = exerciseToSlug(exerciseName);

    // Skip if already exists
    const existing = await db.collection("exercise_images").doc(slug).get();
    if (existing.exists) {
      console.log(`  skip  ${exerciseName} (already exists)`);
      results[exerciseName] = existing.data()?.imageUrl as string;
      continue;
    }

    console.log(`  gen   ${exerciseName}...`);
    try {
      const svg = await generateSvg(client, exerciseName, stylePrompt);

      // Save locally
      fs.writeFileSync(path.join(outDir, `${slug}.svg`), svg);

      // Upload to Firebase Storage
      const bucket = storage.bucket();
      const file = bucket.file(`exercises/${slug}.svg`);
      await file.save(Buffer.from(svg, "utf-8"), {
        metadata: {
          contentType: "image/svg+xml",
          cacheControl: "public, max-age=31536000",
        },
      });
      await file.makePublic();

      const imageUrl = `https://storage.googleapis.com/${bucket.name}/exercises/${slug}.svg`;

      // Save to Firestore
      await db.collection("exercise_images").doc(slug).set({
        exerciseName,
        imageUrl,
        generatedAt: Date.now(),
        style: stylePrompt,
      });

      results[exerciseName] = imageUrl;
      console.log(`  done  ${exerciseName} → ${imageUrl}`);

      // Brief pause to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ERROR ${exerciseName}:`, err);
    }
  }

  // Write summary JSON
  const summaryPath = path.join(__dirname, "../src/lib/exercise-images.json");
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\nDone! Summary written to ${summaryPath}`);
}

main().catch(console.error);
