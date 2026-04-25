# ML integration for fitness-chat (Pat / Fitbit)

## Context

`fitbit-mlops-gcp-plan.md` (committed in `ebe5ef8`) is a standalone cert-prep MLOps plan: a binary "low-activity day tomorrow" classifier in a *separate* repo and project. The new ask is different in these ways:

1. **Different ML target.** Replace the binary classifier with a regression that predicts (a) running pace and (b) **Fitbit Cardio Fitness Score** (Fitbit's VO2max estimate) for an upcoming run.
2. **Same GCP project as the app.** The ML stack lives alongside the app rather than as an isolated repo, so the app can call it.
3. **App integration — run flow only.** The Pat-profile *run* flow calls the model and weaves its prediction into the Claude prompt. Workout flow is out of scope for now.
4. **Weekly training cadence.** Cloud Scheduler → Vertex Pipeline retrains once a week. The endpoint is otherwise static.
5. **Generic model, Pat-only inference (for now).** Trained on Pat's Fitbit history (only data we have), but features are normalised so the same model serves any user whose equivalent fields can be extracted from Fitbit or Garmin. First integration is gated to Pat; Nia (Garmin) is a later hookup.
6. **Firestore as primary store.** Match the Cloud Run + Firestore pattern used by the user's other apps. GCS only for Vertex model artifacts. No BigQuery in scope.

There is also a pre-existing assumption to correct: the app is **not** GCP-ready today. There is no Dockerfile, no `google-cloud-*` deps, secrets are read via `st.secrets`, and the Fitbit OAuth redirect is hardcoded to `https://fitnesschat.streamlit.app/` (`app.py:292`). Migrating to Cloud Run is the first prerequisite — picked deliberately so a service-account JSON key never has to live in Streamlit secrets.

The intended outcome: when Pat picks a run, the app fetches a prediction (expected pace + Cardio Fitness Score for that run) from a Vertex endpoint, displays a small "expected today" caption, and injects the predicted pace into the Claude run-suggestion prompt so the plan is calibrated to Pat's current trajectory rather than only the trailing 7 days.

## Repo layout (after change)

Monorepo — same `fitness-chat` repo, ML kept "somewhat separate" via top-level dirs. Same GCP project for both.

```
fitness-chat/
  app.py                          (existing — modified)
  Dockerfile                      NEW — Streamlit on Cloud Run
  requirements.txt                (existing — add google-cloud-aiplatform, google-cloud-firestore)
  infra/
    terraform/
      main.tf                     project, APIs, GCS bucket (models), Firestore, Artifact Registry, SAs, WIF, Secret Manager
      cloud_run.tf                fitness-chat app service
      vertex.tf                   weekly Cloud Scheduler → Vertex Pipeline trigger
  ml/
    ingestion/
      fitbit_client.py            OAuth-refresh-token pull (activities + cardioscore) → Firestore
      features.py                 build feature rows from Firestore docs (no SQL)
      Dockerfile                  Cloud Run Job image (also used by weekly training)
    training/
      train.py                    XGBoost multi-output regressor (pace + CFS for upcoming run)
      Dockerfile
    pipelines/
      pipeline.py                 KFP v2: pull-fitbit → features → train → eval → register → deploy
    serving/
      deploy_endpoint.py
      app_client.py               thin SDK imported by app.py for inference
  .github/workflows/
    deploy-app.yml                build + push fitness-chat container, deploy Cloud Run (WIF)
    deploy-pipeline.yml           publish Vertex Pipeline spec on merge
```

## Architecture changes

| Concern | Today | After |
|---|---|---|
| App hosting | streamlit.app | Cloud Run (same GCP project) |
| Secrets | `st.secrets` (Streamlit Cloud) | Secret Manager mounted as env vars; ADC for GCP APIs |
| Fitbit OAuth redirect | `https://fitnesschat.streamlit.app/` (`app.py:292`) | Cloud Run service URL (or custom domain). **Must update Fitbit app config.** |
| Pat's data | Fetched live from Fitbit per-session (`fetch_fitbit_activities`, `app.py:326`) | Same for app context **plus** a weekly Cloud Run Job pulls history into Firestore for ML training |
| ML | None | Vertex Endpoint serving an XGBoost regressor |
| App ↔ ML | n/a | App calls Vertex Endpoint via `google-cloud-aiplatform` using Cloud Run service-account ADC |
| Persistence | None (Streamlit session only) | Firestore for Fitbit raw activities/cardio scores, user-config, cached predictions; GCS for model artifacts |

## ML task (replaces the binary classifier in the existing plan)

**Regression for an upcoming run.** Given a feature vector describing a user's state today plus the planned session metadata (distance, run type), predict:

- `predicted_pace_sec_per_km` — expected average pace for this session
- `predicted_cfs` — expected Cardio Fitness Score for the day

The model is **user-agnostic** — inputs are normalised stats (trailing 7/14/28d distance, pace, avg HR, peak-zone minutes, calories, steps, sleep duration/efficiency, current Cardio Fitness Score, 7d CFS delta, day-of-week, days-since-last-run, run-streak length, target distance). Training uses only Pat's history because that is the only data available, but at inference time the same feature extractor is run against either Fitbit (Pat) or Garmin (Nia) raw payloads.

First integration wires the endpoint into Pat's run flow only. Nia (Garmin) hookup follows once a Garmin feature extractor is built.

**Why the simpler shape**: the app only needs one prediction per run selection, not a 7-day forecast. Keeps the training job cheap, the endpoint payload tiny, and side-steps the run-day-sparsity problem entirely.

## App integration (run flow only)

Critical files and exact integration points:

- **`app.py:282` `get_user_profile()`** — gate ML calls to `profile == "pat"`. Other profiles bypass the model entirely.
- **`app.py:436` `get_run_context_fitbit()`** — leave as-is (still summarises trailing 7d for the prompt). The ML prediction is *additional* context, not a replacement.
- **NEW `ml/serving/app_client.py`** — small module imported by `app.py`:
  - `predict_run(activities, cardio_scores, distance_km, run_type) -> RunPrediction | None` — builds the feature vector from the same Fitbit pulls already in session state plus the chosen session metadata, calls the Vertex endpoint via `google.cloud.aiplatform.Endpoint(...).predict(...)`, returns a typed dataclass with `pace_sec_per_km: int`, `cfs: float`, `cfs_delta_7d: float`.
  - Cached per-session via `@st.cache_data(ttl=3600)` keyed on `(profile, date.today(), distance_km, run_type)`.
  - Wrapped in try/except — if Vertex is down, return `None` and the app falls back to today's behaviour. **No hard dependency on ML being up.**
- **NEW: fetch cardio score** — extend the OAuth callback path (`app.py:1244-1259`) to also pull `/1/user/-/cardioscore/date/[today-30d]/[today].json` into `st.session_state.fitbit_cardio_scores`. Reuse the same access token already obtained.
- **`app.py:623` `build_run_suggestion_stream`** — add `ml_prediction` param. When present, append a line to the prompt: "Model-predicted pace for this session: X:XX /km (based on your recent training load and cardio fitness)." Insert *after* `run_context_line`.
- **`app.py:1088 render_run`** — for Pat profile, call `predict_run(...)` after the user confirms distance/type and before streaming. Show a small caption row: `Predicted pace: 5:30 /km · CFS 42.1 (↗ +0.9 in 7d)`. Pass the `RunPrediction` into `build_run_suggestion_stream`.

Workout flow (`app.py:516, 567, 1166`) is intentionally **not** touched in this iteration.

The Streamlit-Cloud → Cloud Run move means `st.secrets` references at `app.py:298, 308, 381` need to become `os.environ` reads (Secret Manager → env). Keep the keys identical so the diff is minimal — Streamlit Cloud also surfaces top-level secrets as env vars, so this is non-breaking for the current deployment.

## GCP setup (Terraform)

One project, `australia-southeast1`. Resources:

- APIs enabled: `run`, `cloudbuild`, `artifactregistry`, `aiplatform`, `firestore`, `storage`, `secretmanager`, `cloudscheduler`, `iam`.
- Artifact Registry repo: `fitness-chat-images` (holds app, ingestion, and training images).
- GCS bucket: `<proj>-models` (Vertex model artifacts + pipeline staging).
- Firestore (Native mode): collections `fitbit_activities/{date}`, `fitbit_cardio/{date}`, `predictions/{yyyymmdd_user}`, `users/{userId}` (Fitbit refresh token, prefs).
- Service accounts:
  - `fitness-chat-app@…` — app on Cloud Run; roles: `aiplatform.user`, `datastore.user`, `secretmanager.secretAccessor`.
  - `fitness-ml@…` — weekly training Cloud Run Job + Vertex Pipeline; roles: `aiplatform.user`, `datastore.user`, `storage.objectAdmin` (models bucket), `secretmanager.secretAccessor`.
  - GitHub Actions WIF pool — deploys app + publishes pipeline. No JSON keys.
- Secret Manager: `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`, `FITBIT_PAT_REFRESH_TOKEN` (long-lived for the training-job's Fitbit pull), `ANTHROPIC_API_KEY`, `GARMIN_NIA_EMAIL`, `GARMIN_NIA_PASSWORD`.
- Cloud Scheduler: weekly cron (e.g. Sun 02:00 Australia/Sydney) → triggers the Vertex Pipeline which re-pulls Fitbit, rebuilds features, trains, evaluates, and redeploys the endpoint if metrics improve.
- Budget alerts at 50/80/100% of AUD 400 — same caps as the existing plan.

## Reuse from existing work

- Cloud Run + Firestore pattern from the user's other apps — lift the deploy workflow shape and IAM conventions rather than rebuild.
- Inside this repo: `fetch_fitbit_activities` (`app.py:326`), `_FITBIT_RUN_KEYWORDS` (`app.py:337`), and `get_run_context_fitbit` (`app.py:436`) all parse the Fitbit activity payload the training job also needs. Lift the field-extraction logic into `ml/ingestion/fitbit_parsing.py` so the training pipeline and the live app agree on what counts as a run. The same module will grow a Garmin extractor when Nia's profile is wired up.

## Phased execution

- **W1 (this PR — scaffolding only)** — Dockerfile for `app.py`, `infra/terraform/` skeleton (project, APIs, SAs, WIF, AR, models bucket, Firestore, Secret Manager, weekly Scheduler stub), empty `ml/` tree, swap `st.secrets` → `os.environ`, add `google-cloud-aiplatform` and `google-cloud-firestore` deps. No behavioural change to the current streamlit.app deployment.
- **W2** — Real Terraform values + `terraform apply` into a new GCP project. Build + deploy the app container to Cloud Run. Update Fitbit app config to the new redirect URI. App parity with streamlit.app version.
- **W3** — Weekly Fitbit pull job: Cloud Run Job image in `ml/ingestion/`, writes activities + cardio scores to Firestore. Manual backfill of Pat's history (last 2 years).
- **W4** — Feature extractor + XGBoost training script. KFP pipeline wires pull → features → train → eval → register → deploy. Cloud Scheduler weekly trigger.
- **W5** — `ml/serving/app_client.py`, wire into `render_run` behind the Pat profile gate, inject prediction into the Claude prompt. Small caption in UI.
- **W6** — Vertex Model Monitoring v2 (skew + drift), README + architecture diagram, teardown Makefile.

## Verification (end-to-end)

1. **App migration**: `gcloud run deploy fitness-chat …` succeeds; the deployed URL completes the Fitbit OAuth handshake and shows recent activities for Pat — same UX as streamlit.app.
2. **Ingestion**: trigger the training job manually; verify Firestore `fitbit_activities` and `fitbit_cardio` collections populate for Pat.
3. **Training**: run the Vertex Pipeline from a manual trigger; confirm a model lands in Registry with eval metrics in Experiments. Sanity check: pace MAE on a held-out month should beat a naive "trailing-7d-mean" baseline.
4. **Endpoint**: `curl` (or `aiplatform.Endpoint.predict`) with a sample feature row → returns `{predicted_pace_sec_per_km, predicted_cfs}`.
5. **App ↔ ML**: log in as Pat in the deployed app, go to Run flow, pick a distance → expect the "Predicted pace … · CFS …" caption and a run plan that references the predicted pace. Switch to Nia or Other profile → caption hidden, ML not called.
6. **Outage fallback**: temporarily revoke the app SA's `aiplatform.user` role → Pat's run flow still works, just without the ML caption (no exception bubbles up).
7. **Weekly retrain**: Cloud Scheduler cron fires on Sunday → pipeline run visible in Vertex console → new model registered → endpoint updated.

## Risks / things to flag now

- **Fitbit redirect URI change requires reconfiguring the Fitbit developer app** — anyone with the old streamlit.app URL bookmarked breaks. Schedule the cutover.
- **Per-user training with one user = small data.** Expect modest accuracy. The model is useful as a calibration signal for the prompt, not as a precise pace target.
- **Cardio Fitness Score is delivered as a range** (e.g. 41–45) on some days — pick midpoint or low-bound consistently in the feature extractor.
- **Endpoint cost** is the dominant burn. Scale Vertex endpoint to min-replica-0 with cold start, or consider Batch Prediction if always-on latency isn't required. The app's `try/except` fallback makes cold-start gaps survivable.
- **Generic model with Pat-only training data may generalise poorly to Nia.** The feature extractor must produce *identical* shapes/units from both providers, and Nia's first predictions should be treated as skeptical until a second user's data is available.
