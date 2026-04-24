# Fitbit MLOps on GCP — Cert-Prep Learning Project

> Standalone plan, intended to be copied into a new repo (`fitbit-mlops-gcp`). Not part of the `planning` repo's ongoing content.

## Context

~AUD 400 of GCP credits in hand, targeting the **GCP Professional ML Engineer** certification (Phase 3, Months 3–4 of the CV roadmap). The existing portfolio (adviser-bot LLM, PDS RAG bot — both Cloud Run GenAI) is GenAI/RAG-heavy; this project deliberately fills the **classical tabular MLOps** gap. Primary goal is **cert-prep breadth** — hands-on time with as many Vertex services as credibly possible — with the project doubling as a shareable portfolio piece.

Fitbit is the chosen dataset because the **Fitbit Web API** (OAuth) gives a clean, live ingestion pipeline against personal wearable data: steps, heart rate, sleep, activity, calories at daily granularity. Personal data, so the repo is public but the data stays private.

## ML Task

**Binary classification: "Will tomorrow be a low-activity day (<6000 steps)?"** from a 7–14 day rolling feature window (step/HR/sleep/calorie aggregates, day-of-week, sleep-debt).

Why this target:

- Clean AutoML-vs-custom comparison.
- Daily granularity gives enough rows to iterate cheaply.
- **Easy to force drift** by injecting skewed rows — essential for demonstrating Model Monitoring, which is the cert's money topic.

## Architecture (one service per step, cert-relevant)

| Step | GCP Service |
|---|---|
| Daily Fitbit OAuth pull | **Cloud Run Job** + **Cloud Scheduler** |
| Token/secret storage | **Secret Manager** (+ Workload Identity Federation for GitHub Actions) |
| Raw landing | **GCS** (Parquet, Nearline lifecycle at 30d) |
| Curated + features | **BigQuery** (SQL rolling windows) |
| Feature store | **Vertex AI Feature Store** (BQ-backed offline; online enabled only during serving demo week) |
| Experiment tracking | **Vertex AI Experiments** + TensorBoard |
| Training A | **Vertex AI AutoML Tabular** |
| Training B | **Vertex AI Custom Training** (XGBoost prebuilt container) + **Vizier** HP tuning |
| Orchestration | **Vertex AI Pipelines (KFP v2)** — ingest → features → train → eval → conditional register |
| Model versioning | **Vertex AI Model Registry** with `champion` / `challenger` aliases |
| Online serving | **Vertex AI Endpoint** with 50/50 traffic split across AutoML + XGBoost versions |
| Batch serving | **Vertex AI Batch Prediction** (BQ → BQ) |
| Monitoring | **Vertex AI Model Monitoring v2** (feature skew + prediction drift) |
| Explainability | **Vertex Explainable AI** (Shapley attributions on endpoint) |
| CI/CD | **GitHub Actions** → **Artifact Registry** via **WIF** (no JSON keys) |
| IaC | **Terraform** for project/buckets/SAs/WIF — one-shot teardown for cost safety |
| Cost guardrails | **Budget alerts** at 50/80/100%; region `australia-southeast1` |

**Explicitly skipped** (gratuitous at this scale): Dataflow, Dataproc, TFX standalone, GPUs/TPUs. Study these separately.

## Cert-Topic Coverage

Covered: data prep, feature store, AutoML vs custom, HP tuning (Vizier), pipelines, registry/versioning, online + batch serving, traffic splitting, monitoring (skew/drift), explainability, IAM/Secret Manager/WIF, budgets, responsible AI (day-of-week bias check).

**NOT covered — study separately:** TPU/GPU distributed training, Dataflow streaming, recommendation systems, large-scale NLP/vision, Dataproc/Spark ML, edge/TF Lite, Document AI.

## Budget (AUD, 6–8 weeks)

| Item | Est. |
|---|---|
| Endpoint (n1-standard-2, ~2 wks uptime) | 120 |
| AutoML Tabular (node-hours capped) | 80 |
| Custom training + Vizier (~20 trials) | 40 |
| Feature Store online (1 demo week only) | 35 |
| Pipelines + Workbench (idle shutdown) | 30 |
| GCS + BQ + Artifact Registry | 15 |
| Logging/Monitoring/Scheduler/Cloud Run | 10 |
| **Buffer** | **70** |
| **Total** | **~400** |

**Top cost risks + mitigations:**

1. **Endpoint left deployed** → `make undeploy` after every demo; budget alert at 50%.
2. **Feature Store online node** → enable only during serving/monitoring demo week; tear down immediately.
3. **Workbench left running** → managed notebook with 60-min idle shutdown; prefer Colab Enterprise for ad-hoc exploration.

## Phased Plan

- **W1** — Terraform scaffolding, Fitbit OAuth Cloud Run Job, GCS raw → BQ curated. *Demo: `bq query` over daily features.*
- **W2** — Feature Store offline views, KFP skeleton (ingest + features). *Demo: pipeline green in console.*
- **W3** — AutoML Tabular path, Model Registry entry, Experiments logging. *Demo: metrics in Experiments UI.*
- **W4** — Custom XGBoost container + Vizier, register as `challenger`. *Demo: two versions, two aliases.*
- **W5** — Endpoint with 50/50 split, Explainable AI on, batch prediction to BQ. *Demo: curl + SHAP.*
- **W6** — Monitoring v2 config + drift injector. *Demo: alert email fires.*
- **W7** (buffer) — GitHub Actions + WIF, teardown Makefile, README + architecture diagram. *Demo: PR merge → pipeline run.*
- **W8** (optional) — Responsible-AI section, cost retro, sit exam.

## Repo Structure

```
fitbit-mlops-gcp/
  terraform/                     project, buckets, SAs, WIF pool
    main.tf
  ingestion/
    fitbit_client.py             OAuth refresh + daily pull
    Dockerfile                   Cloud Run Job image
  sql/
    features.sql                 rolling 7/14d aggregates
  pipelines/
    components/                  KFP components
    pipeline.py                  compiled KFP pipeline
  training/
    automl_job.py
    custom/
      train.py                   XGBoost
      Dockerfile
      hptune.py                  Vizier spec
  serving/
    deploy_endpoint.py
    monitoring_config.py         skew + drift thresholds
    drift_injector.py            forces alert
  .github/workflows/
    ci.yml
    deploy-pipeline.yml          WIF OIDC → trigger pipeline
  Makefile                       deploy / undeploy / teardown
  README.md                      architecture diagram + running cost log
```

## Reuse from Existing Work

- **Cloud Run + Artifact Registry + GitHub Actions** patterns from adviser-bot and pds-rag-bot — lift the deploy workflow shape, don't rebuild from scratch. `pds-rag-bot/infra/cloudbuild.yaml` is the closest analogue.
- **GCP project + IAM conventions** already established for those two projects — add a new project under the same billing account so credits apply cleanly and the WIF identity-federation pattern can be reused.

## Verification (end-to-end smoke test)

1. `make ingest` → Cloud Run Job pulls last 7 days, GCS raw lands, BQ view populated.
2. Merge PR → GitHub Actions (via WIF) triggers `pipeline.py` on Vertex Pipelines.
3. Pipeline completes; new model version in Registry with `challenger` alias; run visible in Experiments.
4. `make deploy` promotes `champion`, deploys endpoint with 50/50 traffic split.
5. `curl` endpoint with a sample payload → prediction + SHAP attributions returned.
6. `make inject-drift` writes skewed rows to the prediction logging table.
7. Cloud Monitoring alert email fires for drift within the monitoring window — **this is the cert-prep money shot**.
8. `make teardown` → undeploys endpoint, disables Feature Store online node, stops Workbench. Confirm billing dashboard drops to near-zero burn.
