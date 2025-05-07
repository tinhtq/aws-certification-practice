# AWS Certification Practice App

## Amazon Q Developer "Quack The Code" Challenge Submission

This project is an interactive AWS Certification practice application enhanced with Amazon Bedrock AI capabilities. It helps AWS certification candidates prepare for various AWS certification exams by providing practice questions with AI-enhanced explanations.

![AWS Certification Practice App](https://example.com/app-screenshot.png)

## Features

- 100+ AWS certification practice questions with detailed explanations
- Interactive quiz interface with real-time score tracking
- AI-enhanced explanations powered by Amazon Bedrock (Nova Pro)
- Automatic correction of answer indices based on explanation analysis
- Relevant AWS documentation links for each question topic
- Mobile-friendly responsive design for studying on any device
- Serverless architecture for scalability and cost efficiency

## Architecture

The application uses a modern serverless architecture with the following components:

1. **Frontend**: HTML, CSS, and JavaScript for the user interface
2. **Backend**: AWS Lambda function for processing requests to Amazon Bedrock
3. **API Gateway**: REST API with API key authentication for secure communication
4. **Amazon Bedrock**: AI service (Nova Pro model) for generating enhanced explanations
5. **Infrastructure as Code**: Terraform for provisioning all AWS resources

![Architecture Diagram](https://example.com/architecture-diagram.png)

## How Amazon Q Developer Helped

Amazon Q Developer was instrumental in building this application:

1. **Code Analysis**: Identified discrepancies in the question data where correct answer indices didn't match explanations. Amazon Q analyzed the patterns across 100 questions and found systematic issues with index mapping.

2. **Infrastructure Development**: Helped create and optimize the Terraform configuration, including setting up proper IAM permissions, API Gateway CORS configuration, and Lambda function settings.

3. **Lambda Function Development**: Assisted with writing the Node.js Lambda function for Bedrock integration, including error handling, response formatting, and proper extraction of model responses.

4. **Frontend Development**: Provided guidance on implementing the UI components, including the quiz interface, explanation display, and documentation links.

5. **Debugging**: Helped troubleshoot API Gateway CORS issues and Lambda function errors by suggesting configuration changes and code improvements.

6. **Documentation**: Generated comprehensive documentation for the project, including setup instructions and architecture explanations.

## Getting Started

### Prerequisites

- AWS Account with access to Amazon Bedrock
- AWS CLI configured with appropriate permissions
- Terraform installed (v1.0.0+)
- Node.js (v14+) and npm installed
- Modern web browser

### Deployment Steps

1. Clone the repository
   ```bash
   git clone https://github.com/tinhtq/aws-certification-practice.git
   cd aws-certification-practice
   ```

2. Navigate to the terraform directory
   ```bash
   cd terraform
   ```

3. Update the terraform.tfvars file with your preferred settings
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your preferred settings
   ```

4. Initialize Terraform
   ```bash
   terraform init
   ```

5. Deploy the infrastructure
   ```bash
   terraform apply
   ```

6. Update the bedrock-helper.js file with the API Gateway URL and API Key from the Terraform outputs
   ```javascript
   // In bedrock-helper.js
   const API_CONFIG = {
       apiUrl: "YOUR_API_GATEWAY_URL/generate-explanation",
       apiKey: "YOUR_API_KEY"
   };
   ```

7. Open index.html in your browser to use the application

## How to Use

1. Start the quiz by clicking "Start Quiz"
2. Answer the questions by selecting the appropriate option(s)
3. Submit your answers to see your score
4. Review incorrect answers with the basic explanation
5. Click "Get AI Explanation" to see an enhanced explanation from Amazon Bedrock
6. Click "Get AWS Docs" to see relevant AWS documentation links for the question topic

## Project Structure

```
aws-certification-practice/
├── index.html              # Main application page
├── styles.css              # CSS styling
├── script.js               # Core application logic
├── bedrock-helper.js       # Amazon Bedrock integration
├── clean_questions.json    # Question data
├── enhanced-explanation.html # Template for AI explanations
├── terraform/              # Infrastructure as Code
│   ├── main.tf             # Main Terraform configuration
│   ├── variables.tf        # Variable definitions
│   ├── outputs.tf          # Output definitions
│   └── lambda/             # Lambda function code
│       ├── index.js        # Lambda handler
│       └── package.json    # Node.js dependencies
└── README.md               # Project documentation
```

## Technical Details

### Amazon Bedrock Integration

The application uses Amazon Bedrock's Nova Pro model to generate enhanced explanations for each question. The Lambda function formats the question, options, and basic explanation into a prompt that instructs the model to provide:

1. Why the correct answer is correct (with technical details)
2. Why each incorrect option is wrong (with specific reasons)
3. Key AWS concepts related to the question
4. Relevant AWS service limitations or best practices
5. Real-world applications of the concepts

### Answer Index Correction

The application includes logic to automatically correct answer indices based on the explanation text. This addresses discrepancies in the original question data where the marked correct answer index doesn't match the explanation.

## Future Enhancements

- User accounts to save progress
- Practice mode vs. exam mode
- Customizable quiz length and difficulty
- Additional question categories
- Performance analytics and weak area identification
- Offline mode with PWA capabilities

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- AWS Community Builders program for support and feedback
- DEV.to and AWS for hosting the Amazon Q Developer challenge
- All contributors who helped test and improve the application
