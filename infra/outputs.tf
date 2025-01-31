output "task_revision_main" {
  value = "${aws_ecs_task_definition.service_task.family}:${aws_ecs_task_definition.service_task.revision}"
}
