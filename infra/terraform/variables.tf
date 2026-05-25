variable "app_name" {
  description = "Application name"
  default     = "flawless-voice-agent"
}

variable "docker_image" {
  description = "Docker image for the application"
  default     = "flawlessstudio/flawless-voice-agent:latest"
}

variable "min_replicas" {
  description = "Minimum pod replicas"
  default     = 3
}

variable "max_replicas" {
  description = "Maximum pod replicas for 10k concurrent calls"
  default     = 200
}
