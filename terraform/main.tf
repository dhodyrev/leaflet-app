terraform {
  backend "gcs" {
    bucket = var.gcp_terraform_state_bucket
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

resource "google_storage_bucket_iam_binding" "public_access" {
  bucket = var.gcp_storage_bucket
  role   = "roles/storage.objectViewer"
  members = [
    "allUsers",
  ]
}
