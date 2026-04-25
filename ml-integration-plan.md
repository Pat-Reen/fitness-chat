# ML integration for fitness-chat (Pat / Fitbit)

## Context

`fitbit-mlops-gcp-plan.md` (committed in `ebe5ef8`) is a standalone cert-prep MLOps plan: a binary "low-activity day tomorrow" classifier in a *separate* repo and project. The new ask is different in three material ways:

1. **Different ML target.** Replace the binary classifier with a per-user regression that forecasts the **next 7 days** of (a) running pace and (b) **Fitbit Cardio Fitness Score** (Fitbit's VO2max estimate) — one prediction per day.
2. **Same GCP project as the app.** The ML stack lives alongside the app rather than as an isolated repo, so Pat's app can call it.
3. **App integration.** The Pat-profile run/workout flows must call the model and weave its output into the Claude prompt.

There is also a pre-existing assumption to correct: the app is **not** GCP-ready today. There is no Dockerfile, no `google-cloud-*` deps, secrets are read via `st.secrets`, and the Fitbit OAuth redirect is hardcoded to `https://fitnesschat.streamlit.app/` (`app.py:292`). Migrating to Cloud Run is the first prerequisite — picked deliberately so a service-account JSON key never has to live in Streamlit secrets.

The intended outcome: when Pat opens the run or workout flow, the app fetches a 7-day forecast (per-day predicted pace + Cardio Fitness Score) from a Vertex endpoint, displays a small "expected this week" panel, and injects today's predicted pace + the weekly CFS trajectory into the Claude prompt so the suggested session is calibrated to Pat's predicted trend rather than only the trailing 7 days.

## Repo layout (after change)

Monorepo — same `fitness-chat` repo, ML kept "somewhat separate" via top-level dirs. Same GCP project for both.

```
fitness-chat/
  app.py                          (existing — modified)
  Dockerfile                      NEW — Streamlit on Cloud Run
  requirements.txt                (existing — add google-cloud-aiplatform, google-auth)
  infra/
    terraform/
      main.tf                     project, APIs, GCS, BQ dataset, Artifact Registry, SAs, WIF, Secret Manager bindings
      cloud_run.tf                fitness-chat app service + ml-predict proxy (optional)
  ml/
    ingestion/
      fitbit_client.py            OAuth-refresh-token pull (activities + cardioscore)
      Dockerfile                  Cloud Run Job image
    sql/
      features.sql                rolling 7/14/28d aggregates per day
    pipelines/
      pipeline.py                 KFP v2: ingest -> features -> train -> eval -> register
      components/
    training/
      train.py                    XGBoost multi-output regressor (14 targets: pace_d1..d7, cfs_d1..d7)
      Dockerfile
    serving/
      deploy_endpoint.py
      monitoring_config.py
  .github/workflows/
    deploy-app.yml                build + push fitness-chat container, deploy Cloud Run (WIF)
    deploy-pipeline.yml           trigger Vertex Pipelines on merge
```

## Architecture changes

| Concern | Today | After |
|---|---|---|
| App hosting | streamlit.app | Cloud Run (same GCP project) |
| Secrets | `st.secrets` (Streamlit Cloud) | Secret Manager mounted as env vars; ADC for GCP APIs |
| Fitbit OAuth redirect | `https://fitnesschat.streamlit.app/` (`app.py:292`) | Cloud Run service URL (or custom domain). **Must update Fitbit app config.** |
| Pat's data | Fetched live from Fitbit per-session (`fetch_fitbit_activities`, `app.py:326`) | Same for app context **plus** a daily Cloud Run Job pulls history into GCS/BQ for ML training |
| ML | None | Vertex Endpoint serving an XGBoost multi-output regressor |
| App ↔ ML | n/a | App calls Vertex Endpoint via `google-cloud-aiplatform` using Cloud Run service-account ADC |

## ML task (replaces the binary classifier in the existing plan)

**Per-user (Pat-only) multi-output regression.** Given today's feature vector, predict 14 values:

- `pace_d1 … pace_d7` — predicted average run pace (seconds/km) for each of the next 7 days
- `cfs_d1 … cfs_d7` — predicted Fitbit Cardio Fitness Score for each of the next 7 days

**Run-day sparsity** is the elephant in the room — Pat doesn't run every day, so `pace_dN` for non-run days is undefined. Handle by:
- Training pace heads only on days with a logged run (mask the loss for non-run days).
- At serving time, pair each `pace_dN` with a simple `p_run_dN` head (binary; same model, extra targets) so the UI can dim/skip predicted pace on low-probability days.
- CFS is dense (Fitbit emits it most days), so its 7 heads train normally.

**Features** (built in BigQuery from raw Fitbit pulls):
- Trailing 7/14/28d aggregates of: distance, pace, avg HR, peak-zone minutes, calories, steps, sleep duration, sleep efficiency.
- Current Cardio Fitness Score and 7d delta.
- Day-of-week one-hots for each forecast day.
- Days-since-last-run, run-streak length.

**Why this shape works for the app**: today's run-suggestion flow only needs `pace_d1` and the CFS trajectory; the workout flow only needs the CFS trajectory and the predicted training-load distribution. Single endpoint call covers both.

## App integration

Critical files and exact integration points:

- **`app.py:282` `get_user_profile()`** — gate ML calls to `profile == "pat"`. Other profiles bypass.
- **`app.py:436` `get_run_context_fitbit()`** — leave as-is (still summarises trailing 7d for the prompt). The ML forecast is *additional* context, not a replacement.
- **NEW `ml_client.py`** — small module:
  - `get_pat_forecast(activities, cardio_scores) -> ForecastResult` — builds the feature vector from the same Fitbit pulls already in session state, calls the Vertex endpoint via `google.cloud.aiplatform.Endpoint(...).predict(...)`, returns a typed dataclass with `pace_per_day: list[Optional[int]]` (seconds/km, None when `p_run < 0.3`), `cfs_per_day: list[float]`, `today_pace_target: Optional[int]`, `cfs_trend: Literal["up","flat","down"]`.
  - Cached per-session via `@st.cache_data(ttl=3600)` keyed on `(profile, date.today())`.
  - Wrapped in try/except — if Vertex is down, return `None` and the app falls back to today's behaviour. **No hard dependency on ML being up.**
- **NEW: fetch cardio score** — extend the OAuth callback path (`app.py:1244-1259`) to also pull `/1/user/-/cardioscore/date/[today]/[today-30d].json` into `st.session_state.fitbit_cardio_scores`. Reuse the same access token already obtained.
- **`app.py:623` `build_run_suggestion_stream`** — add `ml_forecast` param. When present, append a block to the prompt: "Model-predicted pace target for today: X:XX /km. Cardio Fitness Score is trending {up/flat/down} over the next 7 days; calibrate effort accordingly." Insert *after* `run_context_line`.
- **`app.py:516, 567` `build_workout_stream` / `build_equipment_workout_stream`** — add `ml_forecast` param; when CFS trend is "down" inject a recovery-bias note, when "up" allow more intensity. Keep this lightweight — one or two sentences in the prompt.
- **`app.py:1088 render_run`** — before streaming, call `get_pat_forecast(...)` for Pat profile. Show a small caption row: `Today target pace: 5:30 /km · Weekly CFS: 42.1 → 43.0 ↗`. Pass the `ForecastResult` into `build_run_suggestion_stream`.
- **`app.py:1166 render_workout`** — same, but only show the CFS trend caption.

The Streamlit-Cloud → Cloud Run move means `st.secrets` references at `app.py:298, 308, 381` need to become `os.environ` reads (Secret Manager → env). Keep the keys identical so the diff is minimal.

## GCP setup (Terraform)

One project, `australia-southeast1`. Resources:

- APIs enabled: `run`, `cloudbuild`, `artifactregistry`, `aiplatform`, `bigquery`, `storage`, `secretmanager`, `cloudscheduler`, `iam`.
- Artifact Registry repo: `fitness-chat-images` (holds both app and ingestion/training images).
- GCS buckets: `<proj>-raw` (Fitbit dumps, Nearline @ 30d), `<proj>-models` (Vertex artifacts).
- BigQuery dataset: `fitness` with tables `raw_activities`, `raw_cardio`, `features_daily`.
- Service accounts:
  - `fitness-chat-app@…` — app on Cloud Run; roles: `aiplatform.user`, `secretmanager.secretAccessor`.
  - `fitness-ingest@…` — Cloud Run Job; roles: `storage.objectAdmin` (raw bucket), `bigquery.dataEditor`, `secretmanager.secretAccessor`.
  - `fitness-train@…` — Vertex Pipelines; roles: `aiplatform.user`, `bigquery.dataViewer`, `storage.objectAdmin` (models bucket).
  - GitHub Actions WIF pool — deploys app + triggers pipeline. No JSON keys.
- Secret Manager: `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`, `FITBIT_PAT_REFRESH_TOKEN` (long-lived for the daily ingestion job), `ANTHROPIC_API_KEY`, `GARMIN_NIA_EMAIL`, `GARMIN_NIA_PASSWORD`.
- Budget alerts at 50/80/100% of AUD 400 — same caps as the existing plan.

## Reuse from existing work

- The `fitbit-mlops-gcp-plan.md` "Reuse" notes about `pds-rag-bot/infra/cloudbuild.yaml` deploy patterns and existing IAM conventions still apply.
- Inside this repo: `fetch_fitbit_activities` (`app.py:326`), `_FITBIT_RUN_KEYWORDS` (`app.py:337`), and `get_run_context_fitbit` (`app.py:436`) all parse the same Fitbit activity payload the ingestion job will land in BQ. Lift the field-extraction logic into a shared `ml/ingestion/fitbit_parsing.py` so the feature pipeline and the live app agree on what counts as a run.

## Phased execution (~6 weeks)

- **W1** — Terraform scaffolding (project, APIs, SAs, WIF, AR, buckets, BQ dataset, Secret Manager). Dockerize `app.py`, deploy to Cloud Run. Update Fitbit app config to new redirect URI. App parity with streamlit.app version.
- **W2** — Ingestion Cloud Run Job + Scheduler (daily Fitbit pull → GCS → BQ). Backfill Pat's history. `features.sql` rolling aggregates view.
- **W3** — XGBoost training script (multi-output, with run-day masking + `p_run` heads). KFP pipeline: ingest → features → train → eval → conditional register. Vertex Experiments logging.
- **W4** — Deploy endpoint. Wire `ml_client.py` into the app behind the Pat profile gate. Add the small forecast caption to `render_run` / `render_workout`. Inject forecast into Claude prompts.
- **W5** — Vertex Model Monitoring v2 (skew + drift), Explainable AI on the endpoint. Cost-watch.
- **W6** — Polish: graceful-degradation on endpoint outage, weekly forecast refresh cache, README + architecture diagram, teardown Makefile.

## Verification (end-to-end)

1. **App migration**: `gcloud run deploy fitness-chat …` succeeds; the deployed URL completes the Fitbit OAuth handshake and shows recent activities for Pat — same UX as streamlit.app.
2. **Ingestion**: trigger the Cloud Run Job manually; verify rows land in `fitness.raw_activities` and `fitness.raw_cardio` for Pat; verify `features_daily` populates via `bq query`.
3. **Training**: run the KFP pipeline from a manual trigger; confirm a model lands in Registry with eval metrics in Experiments. Sanity check: per-day pace MAE on a held-out month should beat a naive "trailing-7d-mean" baseline.
4. **Endpoint**: `curl` (or `aiplatform.Endpoint.predict`) with a sample feature row → returns 21 numbers (7 pace + 7 cfs + 7 p_run).
5. **App ↔ ML**: log in as Pat in the deployed app, go to Run flow → expect the "Today target pace … · Weekly CFS …" caption to render and the generated run plan to reference the predicted pace. Switch to Nia or Other profile → caption is hidden, ML is not called.
6. **Outage fallback**: temporarily revoke the app SA's `aiplatform.user` role → Pat's run flow still works, just without the ML caption (no exception bubbles up).
7. **Monitoring** (cert-prep money shot, kept from original plan): inject skewed rows, confirm drift alert fires.

## Risks / things to flag now

- **Fitbit redirect URI change requires reconfiguring the Fitbit developer app** — anyone with the old streamlit.app URL bookmarked breaks. Schedule the cutover.
- **Per-user model with one user = small data.** Expect modest accuracy on pace heads. The CFS trend is the more reliable signal for prompt-shaping.
- **Cardio Fitness Score is delivered as a range** (e.g. 41–45) on some days — pick midpoint or low-bound consistently in `features.sql`.
- **Endpoint cost** is the dominant burn. Keep the endpoint undeployed except during demo/use; consider Batch Prediction nightly into BQ as a cheaper alternative if always-on cost matters more than freshness.
