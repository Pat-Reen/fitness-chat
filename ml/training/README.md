# ml/training/

XGBoost regressor for run-pace + Cardio Fitness Score prediction.

## Files (to be added in W4)

- `train.py` — reads the feature table produced by `ml/ingestion/features.py`,
  fits a multi-output XGBoost model (targets: `pace_sec_per_km`, `cfs`),
  logs metrics to Vertex Experiments, writes the model artifact to
  `gs://<proj>-models/runs/{timestamp}/`.
- `Dockerfile` — Vertex custom-training image; the KFP pipeline calls this.

## Target

Per-run prediction, not a 7-day forecast. Inputs combine the user's trailing
training load (7/14/28-day aggregates + current CFS) with the planned session
metadata (distance_km, run_type). Training rows are one per Pat run — a few
hundred at most, so keep the model small (`max_depth=4`, ~200 trees, early
stopping).

## Sanity baseline

Beat a naive "last-7-runs mean pace" baseline on a held-out month. If the
model doesn't clear that, the prompt is probably better off without ML.
