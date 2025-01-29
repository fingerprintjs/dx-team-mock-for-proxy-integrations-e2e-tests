# Attach the required IAM policies to the task execution role
resource "aws_iam_role_policy_attachment" "task_execution_role_attachment" {
  role       = aws_iam_role.ecs_task_container.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_container" {
  name = "${var.service_name}-task-execution"
  role = aws_iam_role.ecs_task_container.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sts:*"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Effect   = "Allow"
        Resource = "*"

      },
      {
        Action = [
          "logs:DescribeLogGroups",
          "logs:GetLogGroupFields",
          "logs:StartQuery",
          "logs:StopQuery",
          "logs:GetQueryResults",
          "logs:GetLogEvents",
          "logs:CreateLogStream",
        ]
        Effect   = "Allow"
        Resource = "*"

      },
      {
        Action   = "tag:GetResources"
        Effect   = "Allow"
        Resource = "*"

      },
      {
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_role" "ecs_task_container" {
  name = "${var.tier}-${var.service_name}-${var.env}-container"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sts:AssumeRole"
        ]
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.tier}-${var.service_name}-${var.env}"

  assume_role_policy = jsonencode({


    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "sts:AssumeRole"
        ]
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}


resource "aws_iam_role_policy" "ecs_task_execution_role" {
  name = "${var.service_name}-task-execution"
  role = aws_iam_role.ecs_task_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "GetAuthorizationToken"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Sid = "WriteLogs"
        Action = [
          "logs:*"
        ]
        Effect = "Allow"
        Resource = [
          "*"
        ]
      },
      {
        Sid = "SSM"
        Action = [
          "ssm:DescribeParameters",
          "ssm:GetParameters"
        ]
        Effect = "Allow"
        Resource = [
          "*"
        ]
      }
    ]
  })
}