locals {
  apis = [
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "aiplatform.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
  ]

  secrets = [
    "FITBIT_CLIENT_ID",
    "FITBIT_CLIENT_SECRET",
    "FITBIT_PAT_REFRESH_TOKEN",
    "ANTHROPIC_API_KEY",
    "GARMIN_NIA_EMAIL",
    "GARMIN_NIA_PASSWORD",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# ---------------------------------------------------------------------------
# Artifact Registry — one repo holds all images (app, ingestion, training)
# ---------------------------------------------------------------------------

resource "google_artifact_registry_repository" "images" {
  repository_id = "fitness-chat-images"
  location      = var.region
  format        = "DOCKER"
  description   = "Container images for fitness-chat app, ingestion, and training."

  depends_on = [google_project_service.apis]
}

# ---------------------------------------------------------------------------
# Firestore (Native mode) — app DB for Fitbit raw data, user config, predictions
# ---------------------------------------------------------------------------

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis]
}

# ---------------------------------------------------------------------------
# GCS — Vertex model artifacts + pipeline staging
# ---------------------------------------------------------------------------

resource "google_storage_bucket" "models" {
  name                        = "${var.project_id}-models"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  depends_on = [google_project_service.apis]
}

# ---------------------------------------------------------------------------
# Secret Manager — one resource per logical secret; values set out-of-band
# ---------------------------------------------------------------------------

resource "google_secret_manager_secret" "app_secrets" {
  for_each  = toset(local.secrets)
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# ---------------------------------------------------------------------------
# Service accounts
# ---------------------------------------------------------------------------

resource "google_service_account" "app" {
  account_id   = "fitness-chat-app"
  display_name = "fitness-chat Cloud Run app"
}

resource "google_service_account" "ml" {
  account_id   = "fitness-ml"
  display_name = "fitness-chat ML training + ingestion"
}

# App SA — call Vertex, read Firestore, read Secret Manager
resource "google_project_iam_member" "app_aiplatform" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_secret_manager_secret_iam_member" "app_secret_accessor" {
  for_each  = google_secret_manager_secret.app_secrets
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}

# ML SA — write Firestore, run Vertex pipelines + endpoints, read/write models bucket, read secrets
resource "google_project_iam_member" "ml_aiplatform" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.ml.email}"
}

resource "google_project_iam_member" "ml_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.ml.email}"
}

resource "google_storage_bucket_iam_member" "ml_models_admin" {
  bucket = google_storage_bucket.models.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.ml.email}"
}

resource "google_secret_manager_secret_iam_member" "ml_secret_accessor" {
  for_each  = google_secret_manager_secret.app_secrets
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.ml.email}"
}

# ---------------------------------------------------------------------------
# Workload Identity Federation — GitHub Actions deploy without JSON keys
# ---------------------------------------------------------------------------

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "attribute.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Let the GitHub repo impersonate both SAs for deploys
resource "google_service_account_iam_member" "github_app_impersonation" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

resource "google_service_account_iam_member" "github_ml_impersonation" {
  service_account_id = google_service_account.ml.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "app_service_account_email" {
  value = google_service_account.app.email
}

output "ml_service_account_email" {
  value = google_service_account.ml.email
}

output "artifact_registry_repo" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "models_bucket" {
  value = google_storage_bucket.models.name
}

output "workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}
