workspace    = "fp-infra-stack-app-mock-warden"
platform     = "fpjs-stage-use1"
region       = "us-east-1"
env          = "stage"
tier         = "use1"
aws_account  = "708050157146"
service_name = "mock-warden"

env_vars = {
  "ENVIRONMENT" = "staging"
}

task_cpu    = 512
task_memory = 1024
