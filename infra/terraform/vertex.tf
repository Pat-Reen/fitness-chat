# Weekly Vertex Pipeline trigger.
#
# The actual KFP pipeline spec lives in ml/pipelines/pipeline.py and is
# compiled + uploaded by the deploy workflow to gs://<models-bucket>/pipelines/.
# Scheduler hits Vertex Pipelines' REST endpoint to kick off a run with the
# ML service account.

resource "google_cloud_scheduler_job" "weekly_training" {
  name        = "fitness-ml-weekly-training"
  description = "Triggers the weekly Vertex Pipeline that retrains the run-prediction model."
  schedule    = var.training_schedule_cron
  time_zone   = var.training_schedule_tz
  region      = var.region

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-aiplatform.googleapis.com/v1/projects/${var.project_id}/locations/${var.region}/pipelineJobs"

    headers = {
      "Content-Type" = "application/json"
    }

    # Body is templated by the deploy workflow (pipeline spec GCS URI + current
    # image tag). Terraform just reserves the schedule slot.
    body = base64encode(jsonencode({
      displayName       = "fitness-ml-weekly"
      templateUri       = "gs://${google_storage_bucket.models.name}/pipelines/latest.json"
      serviceAccount    = google_service_account.ml.email
      runtimeConfig = {
        gcsOutputDirectory = "gs://${google_storage_bucket.models.name}/pipeline-runs/"
      }
    }))

    oauth_token {
      service_account_email = google_service_account.ml.email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }

  depends_on = [google_project_service.apis]
}
