# main.tf

provider "google" {
  project = "leafletapp-435518"
  region  = "europe-north1"
}

resource "google_storage_bucket" "static_website" {
  name                        = "leaflet-site"
  location                    = "EU"
  force_destroy               = true
  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }
  uniform_bucket_level_access = true
}

resource "google_storage_bucket_iam_binding" "public_access" {
  bucket = google_storage_bucket.static_website.name
  role   = "roles/storage.objectViewer"
  members = [
    "allUsers",
  ]
}
