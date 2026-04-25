# ml/ingestion/

Weekly Fitbit pull + shared feature extraction.

## Files (to be added in W3)

- `fitbit_client.py` — uses `FITBIT_PAT_REFRESH_TOKEN` to mint an access token,
  pulls the last week's activities (`/1/user/-/activities/list.json`) and
  cardio scores (`/1/user/-/cardioscore/date/{range}.json`), upserts into
  Firestore collections `fitbit_activities/{date}` and `fitbit_cardio/{date}`.
- `fitbit_parsing.py` — lifted from `app.py:get_run_context_fitbit`; returns a
  normalised row (distance, pace, HR, sleep, CFS, …) per day so training and
  serving share one extractor.
- `features.py` — builds a training row from a user's Firestore history:
  trailing 7/14/28-day aggregates, CFS + 7d delta, day-of-week, days-since-last-run.
- `Dockerfile` — image used by both the weekly Cloud Run Job and the Vertex
  Pipeline's first step.
