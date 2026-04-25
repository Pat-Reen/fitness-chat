# fitness-chat Node.js rewrite (Next.js + TypeScript + Tailwind)

## Resume here (handoff for the next session)

This plan was approved mid-session; P1 was started but not finished. Pick up
on the same branch (`claude/plan-ml-fitness-integration-8Zq3u`).

**What's already done on this branch (commits, oldest → newest):**

- `55df76e` — `ml-integration-plan.md` added (the ML/Vertex/Firestore design;
  still valid — only the *consumer* of the Vertex endpoint changes from
  Streamlit to Next.js).
- `b101e06` — W1 scaffolding for the original Cloud-Run-Streamlit path:
  root `Dockerfile`, root `.dockerignore`, `infra/terraform/` (Cloud Run,
  Firestore, GCS models bucket, Artifact Registry, SAs, WIF, Secret Manager,
  weekly Cloud Scheduler stub), empty `ml/` skeleton with READMEs, and
  `app.py` switched from `st.secrets` to `os.environ` for Fitbit/Garmin
  creds with `FITBIT_REDIRECT_URI` env-configurable. **Non-breaking** for
  the live streamlit.app deployment.
- (this commit) — moved the root `Dockerfile` to `Dockerfile.streamlit`
  (the active app build will live at `web/Dockerfile`), started the Next.js
  scaffold at `web/package.json`, saved this plan to the repo, and wrote
  these notes.

**What is partially started in `web/`:**

- `web/package.json` — Next.js 15.1.3, React 19.0.0, TypeScript 5.7,
  Tailwind 3.4, ESLint, pnpm 9.15. No `pnpm install` has been run, so
  there is no `pnpm-lock.yaml` and no `node_modules` yet.
- Empty subtrees were `mkdir -p`'d locally
  (`web/src/app/activity`, `web/src/components`, `web/src/lib`,
  `web/src/state`) but Git doesn't track empty directories, so they will
  not appear in the commit. Next session: just re-create as files land.

**Resume P1 from here — order of operations:**

1. `cd web && pnpm install` to materialise `node_modules` and produce the
   lockfile. Commit `pnpm-lock.yaml`.
2. Create `web/tsconfig.json` (`strict: true`, paths alias `@/* -> src/*`,
   `moduleResolution: "Bundler"`, `jsx: "preserve"`).
3. Create `web/next.config.mjs` with `{ output: "standalone" }`.
4. Create `web/tailwind.config.ts` (content globs covering `src/**/*.{ts,tsx}`,
   theme `colors.primary` set to `#166534` to match `app.py:GLOBAL_CSS`).
5. Create `web/postcss.config.mjs` with the standard Tailwind + autoprefixer
   block.
6. Create `web/src/app/globals.css` — Tailwind directives plus a small
   layer that ports the few rules from `app.py:17-190` that don't map
   1:1 to utilities (the table styling + the step-pill rules).
7. Create `web/src/app/layout.tsx` (Inter font via `next/font/google`,
   `<StepIndicator/>` slot, `<main>` with the same max-width as
   `block-container { max-width: 720px }` from `app.py:26`).
8. Create `web/src/app/page.tsx` that `redirect("/activity")`s.
9. Create `web/src/app/activity/page.tsx` rendering only the title + a
   placeholder for the profile picker (no logic yet — that's P2).
10. Create `web/src/components/StepIndicator.tsx` — pixel-port of
    `render_step_indicator` (`app.py:709-749`).
11. Create `web/Dockerfile` (Node 20, Next.js standalone output:
    multi-stage `deps → builder → runner`, `EXPOSE 8080`, `CMD ["node", "server.js"]`).
12. Create `web/.dockerignore` (`node_modules`, `.next`, `.git`, etc.) and
    `web/.gitignore` (`node_modules`, `.next`, `.env*.local`,
    `next-env.d.ts`, `tsconfig.tsbuildinfo`).
13. Verify `pnpm dev` boots locally and `/activity` renders.
14. Commit as the P1 finish.

**Then proceed to P2** per the "Phased execution" section below — port stages
without external API calls, using `FlowContext` for shared state.

**Files / line refs the next session needs the most:**

- `app.py:17-190` — `GLOBAL_CSS` to translate to Tailwind / globals.css.
- `app.py:200-260` — exercise list + muscle-group mapping (port to
  `web/src/lib/exercises.ts`).
- `app.py:265-272` — `sanitise_restrictions` (port to `web/src/lib/sanitize.ts`).
- `app.py:516-668` — the three `build_*_stream` prompt strings (port to
  `web/src/lib/anthropic.ts`).
- `app.py:709-749` — step indicator markup.
- `app.py:755-1232` — the `render_*` stage functions.
- `app.py:1244-1259` — Fitbit OAuth callback logic for the Next.js route
  handler.

**Don't forget at cutover (P8):**

- Update `infra/terraform/cloud_run.tf` so the Cloud Run service points at
  the new `web/Dockerfile` image. The service name (`fitness-chat`) and
  env-var wiring are unchanged.
- Add the Cloud Run URL to the Fitbit dev app's allowed redirect URIs
  *before* deploying; remove the streamlit.app one only after parity.
- Delete `app.py`, `requirements.txt`, `Dockerfile.streamlit`, the
  Streamlit bits of `.devcontainer/devcontainer.json`.

---

## Context

The Streamlit app (`app.py`, 1275 lines) works, but the user's other apps are Node.js — the divergent stack makes shared CI/deploy patterns, monitoring, and library reuse painful. We're rewriting the UI as **Next.js 15 App Router + TypeScript (strict) + Tailwind CSS** on Cloud Run. The existing Streamlit deployment stays live on streamlit.app until the Node version reaches parity; cut-over is a later, deliberate step.

The previously-approved ML-integration design (`ml-integration-plan.md`, committed) is unchanged in shape: Firestore + GCS + Vertex endpoint + weekly Scheduler-driven training + run-flow-only integration, Pat-only for now. Only the *consumer* changes — instead of the Streamlit `app.py` calling Vertex, a Next.js route handler does.

Goal: feature-parity UI on Node, deployable to Cloud Run, with the Fitbit OAuth + Garmin + Claude streaming + Vertex call paths all landed before the existing Streamlit deploy is retired.

## Stack decisions (locked in)

- **Framework**: Next.js 15, App Router, React 19 (or 18 if 19 is rough at scaffold time).
- **Language**: TypeScript, `strict: true`.
- **Styling**: Tailwind CSS. Port the current green-accent look (`#166534` primary, Inter font, rounded pills) by translating the Streamlit `GLOBAL_CSS` block in `app.py:17-190` to Tailwind utilities + a small `globals.css`.
- **Anthropic SDK**: `@anthropic-ai/sdk` server-side in route handlers. Use `cache_control: { type: "ephemeral" }` on the long static portions of system prompts — same material as the Streamlit prompts in `build_workout_stream`, `build_equipment_workout_stream`, `build_run_suggestion_stream`.
- **Fitbit**: direct OAuth via route handlers (no third-party SDK; the current Python code calls raw HTTPS).
- **Garmin**: `garmin-connect` npm package server-side, called from a route handler (mirrors `garminconnect` Python).
- **GCP**: `@google-cloud/aiplatform` for Vertex endpoint calls, `@google-cloud/firestore` for session/token storage.
- **Package manager**: pnpm.
- **Tests**: Playwright for one golden-path E2E run later; none in the initial scaffold.

## Repo layout (during coexistence)

```
fitness-chat/
  app.py                         (kept, untouched — runs on streamlit.app)
  requirements.txt               (kept)
  Dockerfile                     → rename to Dockerfile.streamlit (not used; streamlit.app doesn't consume it, but keep for reference)
  .dockerignore                  (kept, still references ml + infra excludes)
  ml-integration-plan.md         (kept)
  fitbit-mlops-gcp-plan.md       (kept)
  infra/terraform/               (kept — see "Infra adjustments" below)
  ml/                            (kept — unchanged)

  web/                           NEW — the Next.js app
    package.json
    pnpm-lock.yaml
    tsconfig.json
    next.config.mjs              { output: "standalone" }
    tailwind.config.ts
    postcss.config.mjs
    Dockerfile                   Node 20, standalone Next output
    .dockerignore
    src/
      app/
        layout.tsx               root layout, Inter font, StepIndicator slot
        page.tsx                 redirects to /activity
        globals.css              Tailwind base + the few custom rules that don't map cleanly
        activity/page.tsx        profile select + Fitbit connect / Garmin auto-connect
        preferences/page.tsx     goal, experience, restrictions, duration, run vs workout
        run/page.tsx             distance + type select, then streamed run plan
        selection/page.tsx       muscle-group + exercise select
        equipment/page.tsx       equipment select
        workout/page.tsx         streamed workout plan
        api/
          auth/fitbit/start/route.ts    302 to Fitbit OAuth
          auth/fitbit/callback/route.ts code exchange, store refresh token, set session cookie
          garmin/activities/route.ts    login + fetch (Nia profile)
          workout/stream/route.ts       POST → streamed Claude response
          run/stream/route.ts           POST → streamed Claude response
          predict/run/route.ts          POST → Vertex endpoint (later, once model exists)
      components/
        StepIndicator.tsx
        WorkoutPlanRenderer.tsx        react-markdown with the table styling
        PrintButton.tsx
        forms/*.tsx                    each stage's form
      lib/
        anthropic.ts                   streaming helpers + prompt builders
        fitbit.ts                      OAuth, activity fetch, cardio score fetch, parsing
        garmin.ts                      login + parsing
        vertex.ts                      Endpoint client (mirrors ml/serving/app_client.py)
        firestore.ts                   typed wrappers for users/ and sessions/
        session.ts                     signed-cookie session id helpers
        sanitize.ts                    port of sanitise_restrictions (app.py:265)
      state/
        FlowContext.tsx                React Context holding goal/experience/etc — the analogue of st.session_state
        useFlowPersist.ts              optional: snapshot FlowContext into a Firestore session doc
```

## State management strategy

Streamlit's `st.session_state` (`app.py:675`) is per-browser-tab memory. The Next.js equivalent:

- **Flow state** (goal, experience, restrictions, focus_groups, selected exercises, equipment, current stage, workout/run markdown, variation counter) → React Context (`FlowContext.tsx`) at the root layout. Navigation between stages is real Next.js routing, not internal `st.session_state.stage` switching.
- **Auth state** (Fitbit access + refresh tokens, cached activities, cardio scores) → server-side only, in Firestore `sessions/{sessionId}`, addressed by a signed HttpOnly cookie. The client never sees raw tokens.
- **Session id** → generated on first request, signed with an app secret in `session.ts`.

Rationale: keep tokens off the client (tighter than Streamlit's current in-memory storage on a Streamlit Cloud worker), but don't overbuild — most flow state is happy as React state.

## Claude streaming

- Route handler returns `new Response(readableStream, { headers: { "content-type": "text/event-stream" }})` or plain chunked text — latter is simpler since the client just appends strings.
- Server bridges `anthropic.messages.stream({...})` → a `ReadableStream<string>` that yields each `text_stream` delta.
- Client component uses `fetch()` + `response.body.getReader()` in a `useEffect`, appends chunks to state, and re-renders the markdown via `react-markdown`.
- No `ai` SDK dependency — plain fetch-stream is a dozen lines and has no chat-format assumptions.

## Feature parity checklist (Streamlit → Next.js)

Mapped stage by stage so nothing is dropped:

| Streamlit | Next.js route | Ported from |
|---|---|---|
| `render_activity` (`app.py:755`) | `/activity` | profile select (Pat/Nia/Other), Fitbit connect button (link), Garmin auto-connect on Nia select |
| `render_preferences` (`app.py:817`) | `/preferences` | goal, experience, restrictions, duration/distance, run vs workout, back nav |
| `render_run` (`app.py:1088`) | `/run` | distance + type, streams `/api/run/stream` |
| `render_selection` (`app.py:924`) | `/selection` | muscle groups → exercise list (data ported to `lib/exercises.ts`) |
| `render_equipment` (`app.py:999`) | `/equipment` | equipment multiselect + focus groups |
| `render_activity_type` (`app.py:1051`) | covered inside `/preferences` | consolidated — no separate page needed |
| `render_workout` (`app.py:1166`) | `/workout` | streams `/api/workout/stream` (handles both muscle-based and equipment-based via a `mode` field) |
| `render_step_indicator` (`app.py:709`) | `<StepIndicator/>` client component in layout | pixel-port the pill styling |
| `sanitise_restrictions` (`app.py:265`) | `lib/sanitize.ts` | 1:1 port |
| `fetch_fitbit_activities` (`app.py:326`) | `lib/fitbit.ts` `fetchActivities` | 1:1 port |
| `fitbit_activity_summary` + `get_run_context_fitbit` (`app.py:339`, `436`) | `lib/fitbit.ts` | 1:1 port; keep the same `_FITBIT_RUN_KEYWORDS` substring matching |
| `fetch_garmin_activities` + `garmin_activity_summary` (`app.py:379`, `388`) | `lib/garmin.ts` | 1:1 port using `garmin-connect` |
| `build_workout_stream`, `build_equipment_workout_stream`, `build_run_suggestion_stream` (`app.py:516`, `567`, `623`) | `lib/anthropic.ts` | port the prompt strings verbatim; wrap in `anthropic.messages.stream` |
| Fitbit OAuth callback (`app.py:1244-1259`) | `/api/auth/fitbit/callback/route.ts` | ports the code exchange, then also fetches 30d of cardio scores (planned in `ml-integration-plan.md`) and stores in Firestore |

The exercise list (`app.py:200-260` — I didn't read it in this session, I inferred its existence from the `selected` / `focus_groups` usage) and the muscle-group → exercises mapping port as a static TS object in `src/lib/exercises.ts`.

## Infra adjustments

The existing Terraform (`infra/terraform/`) stays mostly intact:

- **`cloud_run.tf`**: the `fitness-chat` service now runs the Next.js image. Port stays 8080 (set `PORT=8080` in the Next.js Dockerfile's `CMD`). Env var wiring is unchanged — the new code reads the same `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, `GARMIN_NIA_EMAIL`, `GARMIN_NIA_PASSWORD`, `FITBIT_REDIRECT_URI` from `process.env`.
- **`main.tf`**: no changes needed. Firestore, GCS, Secret Manager, SAs, WIF all reusable.
- **Deploy workflow** (not yet written): `.github/workflows/deploy-app.yml` builds `web/Dockerfile`, pushes to Artifact Registry, runs `gcloud run services update`. Uses WIF to impersonate `fitness-chat-app@…`.
- **Fitbit dev app**: during coexistence, register *both* redirect URIs (`https://fitnesschat.streamlit.app/` and the Cloud Run URL). At cutover, remove the Streamlit one.
- **Root `/Dockerfile`** (currently Streamlit-targeted from the W1 commit): rename to `Dockerfile.streamlit` so it's obvious it's the legacy path. The active Cloud Run deploy uses `web/Dockerfile`.

## Phased execution

- **P1 — Scaffold** (this PR, one commit): `web/` with `package.json`, `tsconfig.json` (strict), `tailwind.config.ts`, `next.config.mjs`, empty `src/app/layout.tsx` + `page.tsx` rendering the title and step indicator only, `Dockerfile`, `.dockerignore`. Local `pnpm dev` boots. No feature parity yet. Rename `/Dockerfile` → `/Dockerfile.streamlit`.
- **P2 — Static flow**: port stages 1-by-1 without external API calls. FlowContext + routes for activity → preferences → selection/equipment → workout, using hard-coded stub data. Step indicator working. Styling matches Streamlit.
- **P3 — Claude streaming**: `lib/anthropic.ts` + `/api/workout/stream` + `/api/run/stream`. Client fetch-stream helper. Both workout paths render end-to-end.
- **P4 — Fitbit OAuth + activity context**: route handlers, Firestore session storage, `lib/fitbit.ts` parsing, wire into the workout/run prompts so Pat's recent activity summary is included (matches current Streamlit behaviour).
- **P5 — Garmin**: `lib/garmin.ts`, Nia auto-connect.
- **P6 — Cloud Run deploy**: build + push image, `terraform apply` (Next.js image), add Cloud Run URL to Fitbit dev app. App reachable at Cloud Run URL with full parity.
- **P7 — ML integration** (gated on the model existing per `ml-integration-plan.md`): `lib/vertex.ts`, `/api/predict/run`, caption in `/run`, inject into `lib/anthropic.ts` run prompt.
- **P8 — Cutover**: remove `app.py`, `requirements.txt`, `Dockerfile.streamlit`, `.devcontainer` Streamlit bits. Remove streamlit.app redirect from Fitbit dev app. Archive or delete the legacy files.

## Verification

- **P1**: `cd web && pnpm dev` → Inter font, green primary, step indicator renders at `/activity`.
- **P2**: full stage navigation clicks through to a placeholder workout page. No network calls needed.
- **P3**: generate a workout end-to-end locally with real `ANTHROPIC_API_KEY` in `.env.local` → markdown streams, tables render, `Regenerate` bumps the variation counter and re-streams a different plan.
- **P4**: Fitbit OAuth round-trip completes against a locally-exposed ngrok URL (or Cloud Run URL once P6 lands). Pat profile shows recent activities in the summary.
- **P5**: Nia profile auto-pulls Garmin activities.
- **P6**: Cloud Run service URL returns the app; Fitbit OAuth works against the Cloud Run redirect URI; Claude streaming works over HTTPS.
- **P7**: Pat's run flow shows "Predicted pace: X:XX /km · CFS …" caption, Claude prompt includes the predicted pace, fallback path kicks in when Vertex is unreachable.
- **Cross-cutting**: TypeScript `pnpm build` passes with `--strict`. Docker image build + `docker run -p 8080:8080` reproduces the Cloud Run behaviour locally.

## Risks / things to flag now

- **1275-line `app.py` is easy to undercount.** The exercise list (roughly `app.py:200-260`) and the two big prompt strings are mechanical ports but tedious; budget a full day for stage-by-stage UI work.
- **Fitbit OAuth redirect URI whitelisting.** During coexistence, both URIs must be registered. If only one can be, choose streamlit.app until cutover, and keep the Cloud Run version tested against a staging Fitbit app.
- **Garmin `garmin-connect` npm package reliability.** It's unofficial and has historically broken on upstream changes; if it breaks, the Nia profile in Next.js regresses. Mitigation: version-pin + smoke test in CI.
- **Claude streaming over Cloud Run.** Cloud Run supports streaming responses up to the request timeout (default 5 min; raise to 10+ if needed). Set the service `timeout` explicitly in Terraform.
- **No auth on the app itself.** Current Streamlit version is publicly reachable and relies on the profile-dropdown honour system. The rewrite keeps that posture — don't add real auth in this rewrite unless explicitly requested.
- **Exercise data duplication.** If `app.py` still runs on streamlit.app during coexistence, the exercise list lives in two places (Python and TS). Sync by hand during the short coexistence window; deleted from Python at cutover.
