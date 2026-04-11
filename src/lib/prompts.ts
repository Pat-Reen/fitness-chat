import { WORKOUT_FORMAT_INSTRUCTIONS } from "./workout-format";

function sanitiseRestrictions(text: string): string {
  return text
    .replace(/[\n\r\x00]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function buildWorkoutPrompt(params: {
  goal: string;
  experience: string;
  restrictions: string;
  duration: string;
  focusGroups: string[];
  exercises: string[];
  variation: number;
  activityContext?: string;
  workoutHistory?: string;
}): string {
  const {
    goal,
    experience,
    restrictions,
    duration,
    focusGroups,
    exercises,
    variation,
    activityContext = "",
    workoutHistory = "",
  } = params;

  const clean = sanitiseRestrictions(restrictions);
  const restrictionLine = clean
    ? `The user has these restrictions/injuries: ${clean}. Provide modifications where relevant.`
    : "The user has no injuries or limitations.";

  const variationLine =
    variation > 0
      ? `\nThis is variation #${variation} — make it meaningfully different (different rep schemes, tempo, supersets, ordering) from a standard version.`
      : "";

  const exerciseList = exercises.map((e) => `- ${e}`).join("\n");

  const activityLine = activityContext
    ? `\nRecent workouts (from fitness tracker, last 7 days):\n${activityContext}\nNote: generic names like 'Strength', 'Structured Workout', or 'Weights' mean a general gym/strength session. HR data and training effect (TE) scores (1=easy, 5=max) indicate session intensity. Factor all of this in — avoid overworking muscle groups likely trained in the last 48 hours, and consider overall fatigue from recent high-intensity sessions.\n`
    : "";

  const historyLine = workoutHistory
    ? `\n${workoutHistory}\nUse the above workout history to avoid repeating the same exercises or structures too frequently.\n`
    : "";

  return (
    `You are an expert personal trainer. Write a structured ${duration} gym workout ` +
    `using ONLY the exercises listed below. The session focuses on: ${focusGroups.join(", ")}.\n\n` +
    `User profile:\n- Goal: ${goal}\n- Experience: ${experience}\n- ${restrictionLine}\n` +
    activityLine +
    historyLine +
    variationLine +
    `\n\nExercises to include:\n${exerciseList}\n\n` +
    `IMPORTANT: The entire session — warm-up, all sets, all rest periods, and cool-down — ` +
    `must fit within ${duration}. Choose an appropriate number of sets per exercise so the ` +
    `timing works out. Do not over-program.\n\n` +
    `Warm-up should be 10–20 minutes on the rowing machine or stationary/spin bike ` +
    `(the user runs on non-gym days so do NOT suggest treadmill/running as a warm-up).\n` +
    `Default to 20 reps per set unless the movement type demands otherwise.\n` +
    `Group the workout into blocks of 3–4 exercises, circuit-style (alternate within each block).\n` +
    `Lead with the most demanding compound movements. Group by area of the gym.\n` +
    `Finish with isolation or machine work, then mat/core exercises last.\n\n` +
    WORKOUT_FORMAT_INSTRUCTIONS
  );
}

export function buildEquipmentWorkoutPrompt(params: {
  goal: string;
  experience: string;
  restrictions: string;
  duration: string;
  equipment: string[];
  focusGroups: string[];
  variation: number;
  activityContext?: string;
  workoutHistory?: string;
}): string {
  const {
    goal,
    experience,
    restrictions,
    duration,
    equipment,
    focusGroups,
    variation,
    activityContext = "",
    workoutHistory = "",
  } = params;

  const clean = sanitiseRestrictions(restrictions);
  const restrictionLine = clean
    ? `The user has these restrictions/injuries: ${clean}. Provide modifications where relevant.`
    : "The user has no injuries or limitations.";

  const variationLine =
    variation > 0
      ? `\nThis is variation #${variation} — make it meaningfully different (different rep schemes, tempo, supersets, ordering) from a standard version.`
      : "";

  const focusLine =
    focusGroups.length > 0
      ? `Prioritise these muscle groups: ${focusGroups.join(", ")}. Fill any remaining time with whatever the equipment allows best.`
      : "No specific focus requested — design a balanced full-body session that hits all major muscle groups (push, pull, legs, core) as evenly as the equipment allows.";

  const equipmentList = equipment.map((e) => `- ${e}`).join("\n");

  const activityLine = activityContext
    ? `\nRecent workouts (from fitness tracker, last 7 days):\n${activityContext}\nNote: generic names like 'Strength', 'Structured Workout', or 'Weights' mean a general gym/strength session. HR data and training effect (TE) scores (1=easy, 5=max) indicate session intensity. Factor all of this in — avoid overworking muscle groups likely trained in the last 48 hours, and consider overall fatigue from recent high-intensity sessions.\n`
    : "";

  const historyLine = workoutHistory
    ? `\n${workoutHistory}\nUse the above workout history to avoid repeating the same exercises or structures too frequently.\n`
    : "";

  return (
    `You are an expert personal trainer. Write a structured ${duration} workout ` +
    `using ONLY the equipment listed below. Do not reference any equipment not in the list.\n\n` +
    `Available equipment:\n${equipmentList}\n\n` +
    `User profile:\n- Goal: ${goal}\n- Experience: ${experience}\n- ${restrictionLine}\n` +
    activityLine +
    historyLine +
    variationLine +
    `\n\nFocus: ${focusLine}\n\n` +
    `Default to 20 reps per set for most exercises unless the movement type demands otherwise.\n` +
    `IMPORTANT: The entire session — warm-up, all sets, all rest periods, and cool-down — ` +
    `must fit within ${duration}. Do not over-program.\n` +
    `Warm-up: 5–15 min using available cardio equipment (rowing machine or skipping rope ` +
    `if available; otherwise light bodyweight movement). Do NOT suggest running/treadmill.\n` +
    `Group the workout into blocks of 3–4 exercises, circuit-style.\n` +
    `Lead with the most demanding compound movements.\n\n` +
    WORKOUT_FORMAT_INSTRUCTIONS
  );
}

export function buildRunPrompt(params: {
  goal: string;
  experience: string;
  restrictions: string;
  distance: string;
  runType: string;
  variation: number;
  runContext?: string;
  workoutHistory?: string;
}): string {
  const {
    goal,
    experience,
    restrictions,
    distance,
    runType,
    variation,
    runContext = "",
    workoutHistory = "",
  } = params;

  const clean = sanitiseRestrictions(restrictions);
  const restrictionLine = clean
    ? `The user has these restrictions/injuries: ${clean}. Provide modifications where relevant.`
    : "The user has no injuries or limitations.";

  const variationLine =
    variation > 0
      ? `\nThis is variation #${variation} — suggest a meaningfully different run structure or session.`
      : "";

  const runTypeLine =
    runType && runType !== "Any"
      ? `The user wants a ${runType.toLowerCase()} run — structure the session around this.\n`
      : "";

  const runContextLine = runContext
    ? `\nRecent run history (last 7 days):\n${runContext}\nUse this data — distance, pace, HR, training effect — to gauge current fitness and training load. Plan a session that balances training stimulus with recovery.\n`
    : "No recent run data available — suggest a run appropriate for the user's goal and experience level.\n";

  const historyLine = workoutHistory
    ? `\n${workoutHistory}\n`
    : "";

  return (
    `You are an expert running coach. Plan a ${distance} run for today.\n\n` +
    `User profile:\n- Goal: ${goal}\n- Experience: ${experience}\n- ${restrictionLine}\n` +
    runTypeLine +
    runContextLine +
    historyLine +
    `If ${distance} seems like a significant jump from the user's recent distances ` +
    `(e.g. beyond normal progression or risky given recent fatigue), ` +
    `briefly flag this at the start — but still provide a full plan for the requested ${distance}.\n` +
    variationLine +
    `\n\nProvide a structured run plan in markdown with:\n` +
    `1. **Run Type** (e.g. Easy Recovery, Tempo, Intervals, Long Run, Fartlek, Hill Reps, Sprint Session)\n` +
    `   — Explain why this suits today given recent training load\n` +
    `2. **Structure** — warm-up, main effort, cool-down with specific paces or effort levels ` +
    `(use min/km referencing recent pace data, or RPE 1–10 if no data)\n` +
    `3. **Target Distance** — ${distance}, broken down across the structure above\n` +
    `4. **Key Metrics to Watch** — target HR zones, pace windows, or effort cues\n` +
    `5. **Post-run** — brief recovery note (stretches, nutrition timing)\n\n` +
    `Keep pacing guidance concrete and practical, referencing the user's actual recent pace where available.\n\n` +
    `End with a footer line:\n` +
    `---\n` +
    `*${distance} · ${goal} · ${experience}*`
  );
}
