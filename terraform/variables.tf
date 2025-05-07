variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "bedrock_model_id" {
  description = "AWS Bedrock model ID"
  type        = string
  default     = "amazon.nova-pro-v1:0"
}

variable "max_tokens" {
  description = "Maximum tokens for Bedrock model response"
  type        = number
  default     = 4096
}

variable "temperature" {
  description = "Temperature for Bedrock model response"
  type        = number
  default     = 0.7
}

variable "top_p" {
  description = "Top P for Bedrock model response"
  type        = number
  default     = 0.9
}

variable "api_stage_name" {
  description = "API Gateway stage name"
  type        = string
  default     = "prod"
}

variable "api_key_value" {
  description = "API Key value for authentication"
  type        = string
  default     = "api-key-value"
  sensitive   = true
}
