# Fitness Chat

AI-powered personalised workout and run planner. Built with Next.js, deployed on Google Cloud Run, backed by Cloud Firestore and Cloud Storage.

> **Original Streamlit app:** [`app.py`](./app.py) is kept for reference. The active app is the Next.js version in `src/`.

## Features

- **Google sign-in** — authorised users only (Pat and Nia by default, scalable via Firestore)
- **Workout planner** — by muscle group or by equipment; Claude generates structured plans with a consistent table format
- **Run planner** — personalised run plans with pacing guidance using recent activity data
- **Fitness tracker integration** — Fitbit (OAuth, tokens auto-refresh from Firestore) and Garmin Connect (auto-login from stored credentials)
- **Exercise images** — simple SVG diagrams for machine/cable exercises, generated once by Claude and served from Cloud Storage; embedded in workout plans via Claude tool use
- **Workout history** — saved per-user in Firestore; recent summaries fed back into Claude as context for future workouts
- **Admin UI** — edit exercises/equipment lists, manage exercise images (regenerate or upload custom SVGs)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 16 (App Router, TypeScript, Tailwind CSS) |
| Auth | next-auth v5 · Google OAuth |
| Database | Cloud Firestore |
| File storage | Cloud Storage (GCS) |
| Hosting | Cloud Run |
| AI | Anthropic Claude (claude-sonnet-4-6) |

## Quick Start

See **[SETUP.md](./SETUP.md)** for full setup and deployment instructions.

```bash
cp .env.local.example .env.local
# fill in all values in .env.local
npm install
npm run dev       # http://localhost:3000
```

## Project Structure

```
src/
├── app/                     # Pages + API routes
│   ├── page.tsx             # Main workout flow (stage machine)
│   ├── login/               # Google sign-in page
│   ├── history/             # Saved workout history
│   ├── admin/               # Exercise/equipment/image management
│   └── api/
│       ├── auth/            # next-auth handlers
│       ├── workout/         # Generate + save workouts (Claude tool use)
│       ├── run/             # Generate run plans (streaming)
│       ├── fitbit/          # OAuth + activities
│       ├── garmin/          # Activities (auto-login)
│       ├── exercise-images/ # Generate/regenerate/upload SVGs
│       ├── admin/           # Edit exercises and equipment
│       ├── history/         # Fetch saved workouts
│       └── profile/         # Current user profile
├── components/
│   ├── stages/              # ActivityStage → WorkoutDisplay/RunDisplay
│   └── admin/               # ExerciseGroupEditor, EquipmentEditor, ImageManager
├── lib/
│   ├── gcp.ts               # Firestore + Storage singleton clients
│   ├── auth.ts              # requireAuth() helper for API routes
│   ├── exercises.ts         # EXERCISES dict, EQUIPMENT list, machine list
│   ├── prompts.ts           # Prompt builders for workout/run generation
│   ├── workout-format.ts    # Format template + trimWorkout() for Firestore saves
│   ├── fitbit.ts            # Token load/refresh, OAuth helpers
│   ├── garmin.ts            # Garmin activity fetching
│   └── image-generation.ts  # Claude SVG generation + GCS upload
├── auth.ts                  # next-auth config (Google provider + allowlist check)
├── proxy.ts                 # Route guard middleware
└── types/index.ts           # Shared TypeScript types

scripts/
├── seed-firestore.ts        # One-time: seed exercises, equipment, user docs
└── generate-exercise-images.ts  # One-time: generate + upload 23 SVG diagrams
```

## License

MIT
