import Anthropic from "@anthropic-ai/sdk";

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

  // Extract SVG from response
  const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) throw new Error(`No SVG found in Claude response for: ${exerciseName}`);

  return svgMatch[0];
}
