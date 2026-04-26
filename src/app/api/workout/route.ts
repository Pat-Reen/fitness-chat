import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/gcp";
import { buildWorkoutPrompt, buildEquipmentWorkoutPrompt } from "@/lib/prompts";
import { formatWorkoutHistory } from "@/lib/workout-format";
import { exerciseToSlug } from "@/lib/exercises";
import type { WorkoutRecord } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GET_EXERCISE_IMAGE_TOOL: Anthropic.Tool = {
  name: "get_exercise_image",
  description:
    "Returns the URL of a pre-generated SVG diagram for a machine or cable exercise. " +
    "Call this for any machine, cable, or cardio machine exercise you include in the plan.",
  input_schema: {
    type: "object" as const,
    properties: {
      exercise_name: {
        type: "string",
        description: "The exact name of the exercise as listed",
      },
    },
    required: ["exercise_name"],
  },
};

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mode, variation = 0 } = body;
    const db = getDb();

    // Load recent workout history for context
    const historySnap = await db
      .collection("users")
      .doc(user.email)
      .collection("workouts")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const history = historySnap.docs.map((d) => d.data() as WorkoutRecord);
    const workoutHistory = formatWorkoutHistory(history);

    const prompt =
      mode === "equipment"
        ? buildEquipmentWorkoutPrompt({
            goal: body.goal,
            experience: body.experience,
            restrictions: body.restrictions ?? "",
            duration: body.duration,
            equipment: body.equipment ?? [],
            focusGroups: body.focusGroups ?? [],
            variation,
            activityContext: body.activityContext ?? "",
            workoutHistory,
          })
        : buildWorkoutPrompt({
            goal: body.goal,
            experience: body.experience,
            restrictions: body.restrictions ?? "",
            duration: body.duration,
            focusGroups: body.focusGroups ?? [],
            exercises: body.exercises ?? [],
            variation,
            activityContext: body.activityContext ?? "",
            workoutHistory,
          });

    // Tool-use loop (non-streaming) to resolve image URLs
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: prompt },
    ];

    let response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      tools: [GET_EXERCISE_IMAGE_TOOL],
      messages,
    });

    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const exerciseName = (block.input as { exercise_name: string }).exercise_name;
          const slug = exerciseToSlug(exerciseName);
          const imgDoc = await db.collection("exercise_images").doc(slug).get();
          const imageUrl = imgDoc.exists
            ? (imgDoc.data()?.imageUrl as string | undefined)
            : null;
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(imageUrl ? { url: imageUrl } : { url: null }),
          };
        })
      );

      messages.push({ role: "user", content: toolResults });
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        tools: [GET_EXERCISE_IMAGE_TOOL],
        messages,
      });
    }

    // Stream final text to client
    const finalText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunkSize = 16;
        for (let i = 0; i < finalText.length; i += chunkSize) {
          controller.enqueue(encoder.encode(finalText.slice(i, i + chunkSize)));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Workout generation error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
