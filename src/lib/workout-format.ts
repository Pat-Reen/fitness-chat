import type { WorkoutRecord } from "@/types";

/**
 * Appended to every workout prompt to enforce a consistent markdown structure.
 */
export const WORKOUT_FORMAT_INSTRUCTIONS = `
Format the entire plan using this EXACT markdown structure:

## Warm-up — [X min]
- [Equipment]: [description of warm-up]

## Block [N]: [Focus area] — [Equipment needed]
| Exercise | Sets × Reps | Rest |
|---|---|---|
| Exercise name | 3 × 20 | 45s |

(Repeat Block sections for each circuit block)

## Cool-down
[Brief cool-down note — 2–3 sentences]

---
*[Duration] · [Goal] · [Focus areas or equipment summary]*

Rules:
- Use exactly this heading hierarchy (##, not ###)
- Always use the pipe-table format for exercises — never use bullet lists for the main workout
- The footer line after --- must always appear at the end
- Do not add any other sections or headings outside this structure
`;

/**
 * Extract a compact summary string and exercise list from a generated workout.
 * Used when saving to Firestore — we do NOT store the full markdown.
 */
export function trimWorkout(
  markdownText: string,
  meta: {
    type: "workout" | "run";
    mode?: "muscle_group" | "equipment";
    duration?: string;
    focusGroups?: string[];
    exercises?: string[];
    equipment?: string[];
    goal: string;
    experience: string;
    distance?: string;
    runType?: string;
  }
): Omit<WorkoutRecord, "id"> {
  const now = Date.now();

  if (meta.type === "run") {
    const summary = `${meta.distance ?? "run"} ${meta.runType && meta.runType !== "Any" ? meta.runType + " " : ""}run (${meta.goal}/${meta.experience})`;
    return {
      type: "run",
      createdAt: now,
      goal: meta.goal,
      experience: meta.experience,
      distance: meta.distance,
      runType: meta.runType,
      summary,
    };
  }

  // Extract exercise names from markdown table rows
  const exercisesFromMarkdown = extractExercisesFromMarkdown(markdownText);
  const exercises =
    exercisesFromMarkdown.length > 0
      ? exercisesFromMarkdown
      : (meta.exercises ?? []);

  const groupLabel = meta.focusGroups?.join("+") ?? meta.equipment?.join(", ") ?? "workout";
  const exercisePreview = exercises.slice(0, 5).join(", ");
  const more = exercises.length > 5 ? ` +${exercises.length - 5} more` : "";
  const summary = `${meta.duration ?? ""} ${groupLabel} (${meta.goal}/${meta.experience}): ${exercisePreview}${more}`.trim();

  return {
    type: "workout",
    mode: meta.mode,
    createdAt: now,
    duration: meta.duration,
    focusGroups: meta.focusGroups,
    exercises,
    equipment: meta.equipment,
    goal: meta.goal,
    experience: meta.experience,
    summary,
  };
}

function extractExercisesFromMarkdown(markdown: string): string[] {
  const exercises: string[] = [];
  // Match table rows like: | Exercise name | 3 × 20 | 45s |
  const tableRowRegex = /^\|\s*([^|]+?)\s*\|\s*\d+\s*[×x]\s*\d+/gm;
  let match;
  while ((match = tableRowRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    // Skip header rows
    if (name.toLowerCase() === "exercise") continue;
    if (!exercises.includes(name)) exercises.push(name);
  }
  return exercises;
}

/**
 * Format saved workout records as a context string for Claude prompts.
 */
export function formatWorkoutHistory(records: WorkoutRecord[]): string {
  if (records.length === 0) return "";
  const lines = records
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((r) => {
      const date = new Date(r.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return `- ${date}: ${r.summary}`;
    });
  return `Recent saved workouts:\n${lines.join("\n")}`;
}
