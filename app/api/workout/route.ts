import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { WorkoutRequest } from '@/lib/types'

const client = new Anthropic()

function buildPrompt(req: WorkoutRequest): string {
  const restrictionLine = req.restrictions.trim()
    ? `The user has these restrictions/injuries: ${req.restrictions}. Provide modifications where relevant.`
    : 'The user has no injuries or limitations.'

  const variationLine = req.variation > 0
    ? `\nThis is variation #${req.variation} — make it meaningfully different (different rep schemes, tempo, supersets, ordering) from a standard version.`
    : ''

  if (req.mode === 'muscle') {
    const groupsText = req.focusGroups.join(', ')
    const exerciseList = req.exercises.map(e => `- ${e}`).join('\n')
    return (
      `You are an expert personal trainer. Write a structured ${req.duration} gym workout ` +
      `using ONLY the exercises listed below. The session focuses on: ${groupsText}.\n\n` +
      `User profile:\n` +
      `- Goal: ${req.goal}\n` +
      `- Experience: ${req.experience}\n` +
      `- ${restrictionLine}\n` +
      `${variationLine}\n\n` +
      `Exercises to include:\n${exerciseList}\n\n` +
      `IMPORTANT: The entire session — warm-up, all sets, all rest periods, and cool-down — ` +
      `must fit within ${req.duration}. Choose an appropriate number of sets per exercise so the ` +
      `timing works out. Do not over-program.\n\n` +
      `Format the plan in markdown with:\n` +
      `1. Warm-up: 10–20 minutes on the rowing machine or stationary/spin bike ` +
      `(the user runs on non-gym days so do NOT suggest treadmill/running as a warm-up)\n` +
      `2. Main workout — order exercises logically for a real gym session:\n` +
      `   - Lead with the most demanding compound movements\n` +
      `   - Group exercises by area of the gym to minimise equipment changes and walking\n` +
      `   - Finish with isolation or machine work, then mat/core exercises last\n` +
      `   - You may superset antagonist muscle groups (e.g. chest + back) where it makes sense\n` +
      `   - For each exercise: sets × reps (or duration), rest period\n` +
      `3. A brief cool-down note`
    )
  } else {
    const focusLine = req.focusGroups.length > 0
      ? `Prioritise these muscle groups: ${req.focusGroups.join(', ')}. Fill any remaining time with whatever the equipment allows best.`
      : 'Choose muscle groups and exercises that best suit the available equipment.'
    const equipmentList = req.equipment.map(e => `- ${e}`).join('\n')
    return (
      `You are an expert personal trainer. Write a structured ${req.duration} workout ` +
      `using ONLY the equipment listed below. Do not reference any equipment not in the list.\n\n` +
      `Available equipment:\n${equipmentList}\n\n` +
      `User profile:\n` +
      `- Goal: ${req.goal}\n` +
      `- Experience: ${req.experience}\n` +
      `- ${restrictionLine}\n` +
      `${variationLine}\n\n` +
      `Focus: ${focusLine}\n\n` +
      `IMPORTANT: The entire session — warm-up, all sets, all rest periods, and cool-down — ` +
      `must fit within ${req.duration}. Do not over-program.\n\n` +
      `Format the plan in markdown with:\n` +
      `1. Warm-up: 5–15 min using available cardio equipment (rowing machine or skipping rope ` +
      `if available; otherwise light bodyweight movement). Do NOT suggest running/treadmill.\n` +
      `2. Main workout — choose appropriate exercises for the equipment, ordered logically:\n` +
      `   - Lead with the most demanding compound movements\n` +
      `   - For each exercise: sets × reps (or duration), rest period\n` +
      `3. Cool-down/stretch note (mention foam roller if available)`
    )
  }
}

export async function POST(req: NextRequest) {
  const body: WorkoutRequest = await req.json()
  const prompt = buildPrompt(body)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        })
        for await (const chunk of response) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
