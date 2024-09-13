# main.tf

provider "google" {
  project = "leafletapp-435518"
  region  = "europe-north1"
}

resource "google_storage_bucket_iam_binding" "public_access" {
  bucket = "leaflet-site"
  role   = "roles/storage.objectViewer"
  members = [
    "allUsers",
  ]
}
