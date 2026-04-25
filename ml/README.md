# ml/

Fitbit-trained run-prediction model + the weekly pipeline that retrains it.
Design lives in `../ml-integration-plan.md`.

## Layout

- `ingestion/` — pulls Fitbit activity + cardio-score history into Firestore
  and exposes the shared `fitbit_parsing.py` feature extractor (the same
  logic the app uses at `app.py:get_run_context_fitbit`, lifted here so the
  pipeline and app can't disagree on what counts as a run).
- `training/` — XGBoost regressor: predicts pace (seconds/km) and Cardio
  Fitness Score for an upcoming run given current training-load features.
- `pipelines/` — KFP v2 pipeline wiring ingest → features → train → eval →
  register → deploy. Triggered weekly by Cloud Scheduler (see
  `../infra/terraform/vertex.tf`).
- `serving/` — endpoint deploy helpers plus `app_client.py`, the thin inference
  SDK `app.py` imports for the Pat-profile run flow.

## Scope note

Training data is **Pat-only** (the only user whose Fitbit history we have).
Features are normalised so the same model serves any user whose equivalent
fields can be extracted from Fitbit or Garmin. The first app integration is
gated to Pat; Nia (Garmin) comes online once `fitbit_parsing.py` gains a
Garmin extractor.
