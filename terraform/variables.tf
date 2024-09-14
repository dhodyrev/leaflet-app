variable "gcp_project_id" {
  type        = string
  description = "The ID of the GCP project"
}

variable "gcp_region" {
  type        = string
  description = "The region where the resources will be created"
}

variable "gcp_storage_bucket" {
  type        = string
  description = "The name of the GCP bucket used to host the site"
}

variable "gcp_terraform_state_bucket" {
  type        = string
  description = "The name of the GCP bucket used for Terraform state"
}
