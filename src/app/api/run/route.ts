import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildRunPrompt } from "@/lib/prompts";
import { formatWorkoutHistory } from "@/lib/workout-format";
import type { WorkoutRecord } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { variation = 0 } = body;
    const db = getAdminDb();

    // Load recent history for context
    const historySnap = await db
      .collection("users")
      .doc(user.uid)
      .collection("workouts")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const history = historySnap.docs.map((d) => d.data() as WorkoutRecord);
    const workoutHistory = formatWorkoutHistory(history);

    const prompt = buildRunPrompt({
      goal: body.goal,
      experience: body.experience,
      restrictions: body.restrictions ?? "",
      distance: body.distance ?? "5k",
      runType: body.runType ?? "Any",
      variation,
      runContext: body.runContext ?? "",
      workoutHistory,
    });

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const streamResponse = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const event of streamResponse) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Run generation error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
