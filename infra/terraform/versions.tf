terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Wire this up when a GCS bucket for state is provisioned (chicken-and-egg on
  # first apply — run locally, then migrate state).
  # backend "gcs" {
  #   bucket = "fitness-chat-tfstate"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
