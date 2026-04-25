# ml/serving/

Endpoint deploy + the thin client `app.py` imports.

## Files (to be added in W5)

- `deploy_endpoint.py` — called by the pipeline's `deploy` step. Creates the
  Vertex Endpoint if missing; updates the traffic split to send 100% to the
  new model version. Scales to `min_replica_count=0` so the endpoint idles
  cheaply.
- `app_client.py` — imported by `app.py`. Public surface:

  ```python
  from ml.serving.app_client import predict_run, RunPrediction
  pred: RunPrediction | None = predict_run(
      activities=st.session_state.fitbit_activities,
      cardio_scores=st.session_state.fitbit_cardio_scores,
      distance_km=10.0,
      run_type="Easy",
  )
  ```

  Returns `None` on any failure (no endpoint, cold start timeout, missing
  features) so the run flow degrades to its pre-ML behaviour.

## Latency budget

Endpoint cold start ~20-30s on min-replicas-0. The run flow already streams a
Claude response for ~5-10s, so a parallel prediction fetch should finish
before the user reads the first half of the plan. If latency becomes an
issue, bump `min_replica_count` to 1 during the demo window.
