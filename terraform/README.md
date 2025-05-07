# AWS Bedrock Integration with Terraform

This directory contains Terraform configuration to deploy a serverless backend for AWS Bedrock integration with the AWS Data Engineer Certification Practice app.

## Architecture

The solution consists of:

1. **AWS Lambda Function**: Calls AWS Bedrock API to generate explanations
2. **API Gateway**: Exposes the Lambda function as a REST API
3. **API Key Authentication**: Secures the API with an API key

## Deployment Instructions

### Prerequisites

1. Install [Terraform](https://www.terraform.io/downloads.html) (v1.0.0 or later)
2. Configure AWS CLI with appropriate credentials
3. Build the Lambda deployment package

### Build Lambda Package

1. Navigate to the lambda directory:
   ```
   cd lambda
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create the deployment package:
   ```
   npm run build
   ```

### Deploy with Terraform

1. Create a `terraform.tfvars` file based on the example:
   ```
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` to set your desired configuration values, especially:
   - `aws_region`: The AWS region to deploy to
   - `api_key_value`: A secure API key for authentication

3. Initialize Terraform:
   ```
   terraform init
   ```

4. Plan the deployment:
   ```
   terraform plan
   ```

5. Apply the configuration:
   ```
   terraform apply
   ```

6. After deployment, note the outputs:
   - `api_gateway_url`: The URL of the API Gateway endpoint
   - `api_key`: The API key for authentication

### Update Frontend Code

After deploying the infrastructure, update the `bedrock-helper.js` file in the main application directory to use the API Gateway endpoint:

```javascript
// Update the callBedrockAPI function to use the API Gateway endpoint
async function callBedrockAPI(question, options, correctAnswerIndex, basicExplanation) {
  try {
    const apiUrl = "YOUR_API_GATEWAY_URL"; // Replace with the output from Terraform
    const apiKey = "YOUR_API_KEY"; // Replace with the output from Terraform
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        question,
        options,
        correctAnswerIndex,
        explanation: basicExplanation
      })
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    return data.explanation;
  } catch (error) {
    console.error("Error calling Bedrock API:", error);
    throw error;
  }
}
```

## Cleanup

To remove all deployed resources:

```
terraform destroy
```
