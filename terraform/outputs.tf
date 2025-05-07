output "api_gateway_url" {
  value = "${aws_api_gateway_stage.bedrock_stage.invoke_url}${aws_api_gateway_resource.bedrock_resource.path}"
  description = "The URL of the API Gateway endpoint"
}

output "api_key" {
  value     = aws_api_gateway_api_key.api_key.value
  sensitive = true
  description = "The API key for authentication"
}

output "lambda_function_name" {
  value = aws_lambda_function.bedrock_lambda.function_name
  description = "The name of the Lambda function"
}
