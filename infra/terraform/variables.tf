variable "project_id" {
  description = "GCP project ID that hosts both the fitness-chat app and the ML stack."
  type        = string
}

variable "region" {
  description = "Primary region for Cloud Run, Artifact Registry, Vertex AI, and the models bucket."
  type        = string
  default     = "australia-southeast1"
}

variable "github_repo" {
  description = "owner/name of the GitHub repo, used to scope the Workload Identity Federation binding."
  type        = string
  default     = "Pat-Reen/fitness-chat"
}

variable "fitbit_redirect_uri" {
  description = "OAuth redirect URI configured in the Fitbit developer app. Must match the Cloud Run service URL (or custom domain) once deployed."
  type        = string
}

variable "training_schedule_cron" {
  description = "Cron expression (Cloud Scheduler format, Australia/Sydney) for the weekly Vertex training pipeline trigger."
  type        = string
  default     = "0 2 * * 0" # Sunday 02:00
}

variable "training_schedule_tz" {
  description = "Time zone for the weekly training cron."
  type        = string
  default     = "Australia/Sydney"
}
