/**
 * One-time script: seed Cloud Firestore with exercises, equipment, and user docs.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-firestore.ts
 *
 * Required env vars (in .env.local):
 *   GCP_PROJECT_ID
 *   GOOGLE_APPLICATION_CREDENTIALS  (path to service-account key JSON)
 *   PAT_EMAIL, NIA_EMAIL
 *   GARMIN_NIA_EMAIL, GARMIN_NIA_PASSWORD
 */

import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { Firestore } from "@google-cloud/firestore";

const EXERCISES: Record<string, string[]> = {
  Chest: [
    "Barbell Bench Press (Flat)", "Barbell Bench Press (Incline)",
    "Dumbbell Bench Press", "Dumbbell Fly", "Cable Fly / Crossover",
    "Chest Press Machine", "Chest Fly Machine", "Weighted Dips", "Landmine Press",
  ],
  Back: [
    "Lat Pulldown", "Seated Cable Row", "Barbell Bent-Over Row", "T-Bar Row",
    "Dumbbell Bent-Over Row", "Dumbbell Single-Arm Row",
    "Deadlift", "Romanian Deadlift", "Pull-Up / Chin-Up", "Face Pull (Cable)",
  ],
  Legs: [
    "Barbell Back Squat", "Romanian Deadlift", "Leg Press Machine",
    "Leg Extension Machine", "Leg Curl Machine", "Dumbbell Lunge",
    "Reverse Lunge", "Squat", "Smith Machine Squat", "Calf Raise",
    "Step-Up (Plyometric Box)", "Single-Leg RDL", "Bulgarian Split Squat",
    "Weighted Hip Thrust", "Cossack Squat",
  ],
  Shoulders: [
    "Barbell Overhead Press", "Dumbbell Shoulder Press",
    "Dumbbell Lateral Raise", "Cable Lateral Raise", "Face Pull (Cable)",
    "Arnold Press", "Upright Row",
  ],
  Arms: [
    "Barbell Bicep Curl", "Dumbbell Bicep Curl", "Hammer Curl",
    "Cable Bicep Curl", "Tricep Pushdown (Cable)", "Skull Crusher",
    "Dumbbell Overhead Tricep Extension", "Tricep Dip",
    "Straight-Arm Cable Pulldown", "Barbell Bench Press (Flat)",
    "Barbell Bench Press (Incline)", "Dumbbell Bench Press", "Dumbbell Fly",
  ],
  "Core (Equipment)": [
    "Cable Crunch", "Hanging Leg Raise",
    "Russian Twist (Medicine Ball)", "Bench Crunch", "Pallof Press (Cable)",
  ],
  "Mat Core": [
    "Dead Bug", "Hollow Body Hold", "Bird Dog",
    "Full Plank", "Side Plank", "High Side Plank", "Side Plank Reach Through",
    "Bicycle Crunch", "Reverse Crunch", "V-Up",
    "Glute Bridge", "Wall Sit", "Plank Dumbbell Drag",
  ],
  Cardio: [
    "Rowing Machine", "Stationary Bike", "Spin Bike",
    "Elliptical Trainer", "Stair Climber", "Treadmill Run/Walk",
  ],
  "Full Body / Functional": [
    "Kettlebell Swing", "Kettlebell Turkish Get-Up",
    "Barbell Clean & Press", "Burpee", "Deadlift",
  ],
};

const EQUIPMENT = [
  "Pull-up bar", "Mat", "Ab roller", "Heavy kettlebell", "Skipping rope",
  "Resistance band", "Foam roller", "Light dumbbells", "Heavy dumbbells",
  "Exercise bench (inclined/flat/straight-backed)", "Stretch bands", "Rowing machine",
];

async function main() {
  const db = new Firestore({ projectId: process.env.GCP_PROJECT_ID });
  const batch = db.batch();

  // Seed exercises
  for (const [group, items] of Object.entries(EXERCISES)) {
    batch.set(db.collection("exercises").doc(group), { items });
  }

  // Seed equipment
  batch.set(db.collection("equipment").doc("default"), { items: EQUIPMENT });

  await batch.commit();
  console.log("Seeded exercises and equipment.");

  // Seed user docs (keyed by email)
  const patEmail = process.env.PAT_EMAIL;
  const niaEmail = process.env.NIA_EMAIL;

  if (patEmail) {
    await db.collection("users").doc(patEmail).set({
      email: patEmail,
      displayName: "Pat",
      platform: "fitbit",
    }, { merge: true });
    console.log(`Seeded user: Pat (${patEmail})`);
  } else {
    console.log("PAT_EMAIL not set — skipping Pat");
  }

  if (niaEmail) {
    await db.collection("users").doc(niaEmail).set({
      email: niaEmail,
      displayName: "Nia",
      platform: "garmin",
      garminCredentials: {
        email: process.env.GARMIN_NIA_EMAIL ?? "",
        password: process.env.GARMIN_NIA_PASSWORD ?? "",
      },
    }, { merge: true });
    console.log(`Seeded user: Nia (${niaEmail})`);
  } else {
    console.log("NIA_EMAIL not set — skipping Nia");
  }

  console.log("Done.");
}

main().catch(console.error);
