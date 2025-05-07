provider "aws" {
  region = var.aws_region
}

# IAM Role for Lambda function
resource "aws_iam_role" "lambda_role" {
  name = "bedrock_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Lambda to access Bedrock
resource "aws_iam_policy" "lambda_bedrock_policy" {
  name        = "lambda_bedrock_policy"
  description = "Policy for Lambda to access Bedrock"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "bedrock:InvokeModel",
          "bedrock:ListFoundationModels"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Attach the policy to the role
resource "aws_iam_role_policy_attachment" "lambda_bedrock_attachment" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_bedrock_policy.arn
}

# Lambda function for Bedrock integration
resource "aws_lambda_function" "bedrock_lambda" {
  filename      = "${path.module}/lambda/bedrock_lambda.zip"
  function_name = "bedrock_explanation_generator"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 512
  
  # Add source_code_hash to detect changes in the Lambda code
  source_code_hash = filebase64sha256("${path.module}/lambda/bedrock_lambda.zip")

  environment {
    variables = {
      BEDROCK_MODEL_ID = var.bedrock_model_id
      MAX_TOKENS       = var.max_tokens
      TEMPERATURE      = var.temperature
      TOP_P            = var.top_p
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_bedrock_attachment
  ]
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "bedrock_api" {
  name        = "bedrock-explanation-api"
  description = "API for generating explanations using AWS Bedrock"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway Resource
resource "aws_api_gateway_resource" "bedrock_resource" {
  rest_api_id = aws_api_gateway_rest_api.bedrock_api.id
  parent_id   = aws_api_gateway_rest_api.bedrock_api.root_resource_id
  path_part   = "generate-explanation"
}

# API Gateway Method
resource "aws_api_gateway_method" "bedrock_method" {
  rest_api_id   = aws_api_gateway_rest_api.bedrock_api.id
  resource_id   = aws_api_gateway_resource.bedrock_resource.id
  http_method   = "POST"
  authorization = "NONE"
  api_key_required = true
}

# API Gateway Integration
resource "aws_api_gateway_integration" "bedrock_integration" {
  rest_api_id             = aws_api_gateway_rest_api.bedrock_api.id
  resource_id             = aws_api_gateway_resource.bedrock_resource.id
  http_method             = aws_api_gateway_method.bedrock_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.bedrock_lambda.invoke_arn
}

# Add CORS headers to the POST method response
resource "aws_api_gateway_method_response" "post_200" {
  rest_api_id = aws_api_gateway_rest_api.bedrock_api.id
  resource_id = aws_api_gateway_resource.bedrock_resource.id
  http_method = aws_api_gateway_method.bedrock_method.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bedrock_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.bedrock_api.execution_arn}/*/${aws_api_gateway_method.bedrock_method.http_method}${aws_api_gateway_resource.bedrock_resource.path}"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "bedrock_deployment" {
  depends_on = [
    aws_api_gateway_integration.bedrock_integration,
    aws_api_gateway_integration.options_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.bedrock_api.id

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "bedrock_stage" {
  deployment_id = aws_api_gateway_deployment.bedrock_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.bedrock_api.id
  stage_name    = var.api_stage_name
}

# Enable CORS for the entire API
resource "aws_api_gateway_gateway_response" "cors" {
  rest_api_id   = aws_api_gateway_rest_api.bedrock_api.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin" = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
  }
}

# API Key for authentication
resource "aws_api_gateway_api_key" "api_key" {
  name = "bedrock-api-key"
  value = var.api_key_value
}

# Usage plan for API key
resource "aws_api_gateway_usage_plan" "usage_plan" {
  name = "bedrock-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.bedrock_api.id
    stage  = aws_api_gateway_stage.bedrock_stage.stage_name
  }

  quota_settings {
    limit  = 100
    period = "DAY"
  }

  throttle_settings {
    burst_limit = 5
    rate_limit  = 10
  }
}

# Associate API key with usage plan
resource "aws_api_gateway_usage_plan_key" "usage_plan_key" {
  key_id        = aws_api_gateway_api_key.api_key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.usage_plan.id
}

# Enable CORS for the API Gateway resource
resource "aws_api_gateway_method" "options_method" {
  rest_api_id   = aws_api_gateway_rest_api.bedrock_api.id
  resource_id   = aws_api_gateway_resource.bedrock_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_integration" {
  rest_api_id = aws_api_gateway_rest_api.bedrock_api.id
  resource_id = aws_api_gateway_resource.bedrock_resource.id
  http_method = aws_api_gateway_method.options_method.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.bedrock_api.id
  resource_id = aws_api_gateway_resource.bedrock_resource.id
  http_method = aws_api_gateway_method.options_method.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true,
    "method.response.header.Access-Control-Allow-Methods" = true,
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.bedrock_api.id
  resource_id = aws_api_gateway_resource.bedrock_resource.id
  http_method = aws_api_gateway_method.options_method.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'",
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
