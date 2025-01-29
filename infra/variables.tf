variable "env_vars" {
  type        = map(string)
  default     = {}
  description = "Map of custom ENV variables to be provided to the application running on Elastic Beanstalk, e.g. env_vars = { DB_USER = 'admin' DB_PASS = 'xxxxxx' }"
}

#ECS values
variable "service_name" {
  type        = string
  default     = "ecs-service"
  description = "Koala service name"
}
variable "image" {
  type        = string
  default     = ""
  description = "ECR registry url"
}

#ECS variables
variable "task_cpu" {
  type        = number
  default     = 512
  description = "ECS task cpu"
}

variable "task_memory" {
  type        = number
  default     = 1024
  description = "ECS task memory"
}

variable "image_tag" {}
