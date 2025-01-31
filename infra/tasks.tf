resource "aws_ecs_task_definition" "service_task" {
  family                   = "${var.service_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  task_role_arn            = aws_iam_role.ecs_task_container.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = templatefile("task_definitions/service_task_definition.json",
    {
      region         = var.region
      service_name   = var.service_name
      image          = "963800667800.dkr.ecr.${var.region}.amazonaws.com/${var.service_name}:${var.image_tag}"
   
      ENVIRONMENT = can(var.env_vars["ENVIRONMENT"]) ? var.env_vars["ENVIRONMENT"] : ""
      
      DATADOG_ENVIRONMENT        = var.env
      TARGET                     = "main"
      DATADOG_API_KEY_SECRET_ARN = "arn:aws:ssm:${var.region}:${var.aws_account}:parameter/dd_api_key"
    }
  )

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }
}
