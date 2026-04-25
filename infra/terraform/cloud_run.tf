# Cloud Run service for the Streamlit app.
#
# The container image tag is produced by the GitHub Actions deploy workflow.
# Terraform tracks only the service definition; `image` is set to a placeholder
# that the deploy workflow overrides via `gcloud run services update`.

resource "google_cloud_run_v2_service" "app" {
  name     = "fitness-chat"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.app.email

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}/fitness-chat:placeholder"

      ports {
        container_port = 8080
      }

      env {
        name  = "FITBIT_REDIRECT_URI"
        value = var.fitbit_redirect_uri
      }

      dynamic "env" {
        for_each = toset([
          "FITBIT_CLIENT_ID",
          "FITBIT_CLIENT_SECRET",
          "ANTHROPIC_API_KEY",
          "GARMIN_NIA_EMAIL",
          "GARMIN_NIA_PASSWORD",
        ])
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      # Image tag is managed by the deploy workflow; don't fight it from TF.
      template[0].containers[0].image,
    ]
  }

  depends_on = [
    google_secret_manager_secret_iam_member.app_secret_accessor,
  ]
}

# Public access — fitness-chat is a public web app.
resource "google_cloud_run_v2_service_iam_member" "app_public" {
  project  = google_cloud_run_v2_service.app.project
  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "app_service_url" {
  value = google_cloud_run_v2_service.app.uri
}
