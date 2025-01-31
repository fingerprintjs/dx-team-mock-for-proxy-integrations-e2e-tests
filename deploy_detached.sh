#!/bin/bash

set -e
# Global variable to store deployment ID
DEPLOYMENT_ID="unset"

# Function to display messages in red color
display_error() {
  local message="$1"
  # Red color code
  RED='\033[0;31m'
  # Reset color code
  NC='\033[0m'
  echo -e "${RED}$message${NC}"
}

# Function to display messages in green color
display_success() {
  local message="$1"
  # Green color code
  GREEN='\033[0;32m'
  # Reset color code
  NC='\033[0m'
  echo -e "${GREEN}$message${NC}"
}

# Function to display usage message
display_usage() {
  display_error "Usage: $0 <AWS_REGION> <ECS_CLUSTER> <IS_RC> [<TD_VERSION>]"
  exit 1
}


# Function to check service events for errors
check_service_events() {
  local service_name="$1"
  # Use the global variable DEPLOYMENT_ID directly without creating a local variable
  local deployment_result=$(aws ecs describe-services --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --services "$service_name" | jq -r --arg ID "$DEPLOYMENT_ID" '.services[0].deployments[] | select(.id == $ID).rolloutState')
  # Add a loop to wait for 5 seconds if deployment_result is IN_PROGRESS in case the deployment is not finished yet
  while [ "$deployment_result" == "IN_PROGRESS" ]; do
    sleep 5
    deployment_result=$(aws ecs describe-services --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --services "$service_name" | jq -r --arg ID "$DEPLOYMENT_ID" '.services[0].deployments[] | select(.id == $ID).rolloutState')
    echo deployment in progress with status: $deployment_result
  done
  # Add a condition to check if deployment_result is different from COMPLETED
  if [ "$deployment_result" != "COMPLETED" ]; then
      display_error "Deployment id: $DEPLOYMENT_ID for $first_service did not complete successfully. Exiting."
      #If the task definition can't be deployed is deregistered to avoid possible re deployments
      if [ -n "$TD_VERSION" ]; then
        #prevent deregistering task temporarly
        display_error "[disabled] Deregistering task definition revision $TD_VERSION"
        #aws ecs deregister-task-definition --region "$AWS_REGION" --task-definition "$TD_VERSION" > /dev/null
      fi
      display_error "Deployment failed resulting in a rollback"
      exit 1
  else
    display_success "Service $service_name deployed and validated"
  fi
}

# Function to deploy and validate a single service
deploy() {
  local service_arn="$1"
  local service=$(basename "$service_arn")

  
  #Check if TD_VERSION is set
  if [ -n "$TD_VERSION" ]; then
    DEPLOYMENT_ID=$(aws ecs update-service --force-new-deployment --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --service "$service" --task-definition "$TD_VERSION" --no-cli-pager | jq -r '.service.deployments[0].id')
    display_success "Deploying service $service in cluster $ECS_CLUSTER from region $AWS_REGION with task definition $TD_VERSION"
    display_success " command: aws ecs update-service --force-new-deployment --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --service "$service" --task-definition "$TD_VERSION" --no-cli-pager "
  else
    DEPLOYMENT_ID=$(aws ecs update-service --force-new-deployment --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --service "$service" --no-cli-pager | jq -r '.service.deployments[0].id')
    display_success "Deploying service $service in cluster $ECS_CLUSTER from region $AWS_REGION without task definition"
    display_success " command: aws ecs update-service --force-new-deployment --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --service "$service" --no-cli-pager "
  fi
  display_success "Deployment: $DEPLOYMENT_ID"
}

# Check if the required arguments are provided
if [ $# -ne 3 ] && [ $# -ne 4 ]; then
  display_usage
fi

# Extract the arguments
AWS_REGION="$1"
ECS_CLUSTER="$2"
IS_RC="$3"
TD_VERSION="$4"

# Record start time
START_TIME=$(date +%s)
if [ -n "$TD_VERSION" ]; then
  display_success "Task definition: $TD_VERSION"
fi

if [ "$IS_RC" -eq 1 ]; then
  display_success "Deploying RC"
  services_array=($(aws ecs list-services --cluster "$ECS_CLUSTER" --region "$AWS_REGION" | jq -r '.serviceArns[] | select(contains("rc"))' | sort))
else
  display_success "Deploying Main"
  services_array=($(aws ecs list-services --cluster "$ECS_CLUSTER" --region "$AWS_REGION" | jq -r '.serviceArns[] | select(contains("rc") | not)' | sort))
fi

# Check if services are found
if [ ${#services_array[@]} -eq 0 ]; then
  display_error "Error: No services found!"
  exit 1
fi
  first_service=($(basename "${services_array[0]}"))
  # Run deploy function in the background
  deploy "$first_service"
  #deploy first service
  aws ecs wait services-stable --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --service "$first_service" 
  # Check service events for errors after waiting for stability
  check_service_events "$first_service"

# Deploy and validate the rest of the services services
for service_arn in "${services_array[@]:1}"; do
  display_success "Deploying remaining services"
  deploy "$service_arn"
done

# Record end time
END_TIME=$(date +%s)

# Calculate and display total execution time
TOTAL_EXECUTION_TIME=$((END_TIME - START_TIME))
display_success "Total execution time: $TOTAL_EXECUTION_TIME seconds"
