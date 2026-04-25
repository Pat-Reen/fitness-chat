# ml/pipelines/

Weekly Vertex Pipeline that retrains the run-prediction model.

## Files (to be added in W4)

- `pipeline.py` — KFP v2 definition:
  1. `pull-fitbit` — runs the ingestion image, upserts last week's Fitbit data
     into Firestore.
  2. `build-features` — reads Pat's Firestore history, emits a Parquet feature
     table to GCS.
  3. `train` — fits XGBoost (see `../training/`), logs to Experiments.
  4. `evaluate` — computes held-out MAE; gates on it beating the last
     deployed model.
  5. `register` — uploads artefacts to Vertex Model Registry with a `candidate`
     alias.
  6. `deploy` — conditional on eval passing, promotes `candidate` → `champion`
     on the existing endpoint.

## Trigger

Cloud Scheduler → Vertex Pipelines REST (`infra/terraform/vertex.tf`). Default
cron: `0 2 * * 0` Australia/Sydney (Sunday 02:00).

The pipeline spec is compiled from `pipeline.py` and uploaded to
`gs://<proj>-models/pipelines/latest.json` by the deploy workflow
(`.github/workflows/deploy-pipeline.yml`, added in W4).
