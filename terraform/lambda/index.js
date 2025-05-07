/**
 * AWS Lambda function for generating AI-enhanced explanations for AWS Data Engineer exam questions
 * using Amazon Bedrock's Nova Pro model.
 */
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

// Initialize the Bedrock client with region from environment variables
const bedrockClient = new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || "us-east-1" 
});

// Default CORS headers for all responses
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Content-Type": "application/json"
};

/**
 * Creates a prompt for the Bedrock model based on the question data
 * @param {Object} questionData - The question data
 * @returns {string} - The formatted prompt
 */
function createPrompt(questionData) {
  const { question, options, correctAnswerIndex, explanation } = questionData;
  const correctAnswer = options[correctAnswerIndex];
  
  return `You are an AWS Certified Data Engineer expert. Provide a detailed explanation for the following AWS exam question:

QUESTION:
${question}

OPTIONS:
${options.join('\n')}

CORRECT ANSWER:
${correctAnswer}

BASIC EXPLANATION:
${explanation}

Please provide:
1. Why this answer is correct (with technical details)
2. Why each of the other options is incorrect (be specific)
3. Key AWS concepts to understand related to this question
4. Any relevant AWS service limitations or best practices
5. Real-world application of this knowledge for a data engineer

Format your response with clear headings and bullet points where appropriate. Include specific AWS service details, limits, and best practices that would help a data engineer understand the concepts deeply.`;
}

/**
 * Creates the request body for the Bedrock model
 * @param {string} promptText - The prompt text
 * @returns {Object} - The request body
 */
function createRequestBody(promptText) {
  return {
    messages: [
      {
        role: "user",
        content: [
          {
            text: promptText
          }
        ]
      }
    ],
    inferenceConfig: {
      maxTokens: parseInt(process.env.MAX_TOKENS || "4096"),
      temperature: parseFloat(process.env.TEMPERATURE || "0.7"),
      topP: parseFloat(process.env.TOP_P || "0.9")
    }
  };
}

/**
 * Extracts the response text from the Bedrock model response
 * @param {Object} responseBody - The response body from Bedrock
 * @returns {string} - The extracted text
 */
function extractResponseText(responseBody) {
  console.log("Response body structure:", JSON.stringify(responseBody, null, 2));
  
  // Handle different response formats
  if (responseBody && typeof responseBody === 'string') {
    return responseBody;
  } else if (responseBody.output && responseBody.output.message && 
             responseBody.output.message.content && 
             Array.isArray(responseBody.output.message.content) && 
             responseBody.output.message.content.length > 0) {
    return responseBody.output.message.content[0].text;
  } else if (responseBody.output && 
             Array.isArray(responseBody.output) && 
             responseBody.output.length > 0 && 
             responseBody.output[0].text) {
    return responseBody.output[0].text;
  } else if (responseBody.generation) {
    return responseBody.generation;
  } else if (responseBody.messages && responseBody.messages.length > 0) {
    if (responseBody.messages[0].content && typeof responseBody.messages[0].content === 'string') {
      return responseBody.messages[0].content;
    } else if (responseBody.messages[0].content && responseBody.messages[0].content.length > 0) {
      return responseBody.messages[0].content[0].text;
    }
  } else if (responseBody.content && responseBody.content.length > 0) {
    return responseBody.content[0].text;
  } else if (responseBody.completion) {
    return responseBody.completion;
  } else if (responseBody.response) {
    return responseBody.response;
  }
  
  // Try to extract text from any possible location as a last resort
  try {
    if (responseBody.output && typeof responseBody.output === 'object') {
      const outputStr = JSON.stringify(responseBody.output);
      if (outputStr.includes('text')) {
        const match = outputStr.match(/"text"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
  } catch (e) {
    console.log("Error while trying to extract text:", e);
  }
  
  throw new Error("Unexpected Bedrock response format");
}

/**
 * Format the response text as HTML
 * @param {string} text - The raw text response
 * @returns {string} - HTML formatted text
 */
function formatResponseAsHtml(text) {
  // Replace markdown-style headers with HTML headers
  text = text.replace(/^# (.*$)/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gm, '<h4>$1</h4>');
  text = text.replace(/^### (.*$)/gm, '<h5>$1</h5>');
  
  // Replace bullet points
  text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');
  
  // Replace numbered lists
  text = text.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>\n)+/g, '<ol>$&</ol>');
  
  // Replace double newlines with paragraph breaks
  text = text.replace(/\n\n/g, '</p><p>');
  
  // Wrap the entire text in a paragraph
  text = '<p>' + text + '</p>';
  
  // Clean up any empty paragraphs
  text = text.replace(/<p><\/p>/g, '');
  
  return text;
}

/**
 * Creates a response object with the given status code and body
 * @param {number} statusCode - The HTTP status code
 * @param {Object} body - The response body
 * @returns {Object} - The formatted response
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

/**
 * Lambda handler function
 * @param {Object} event - The Lambda event object
 * @returns {Object} - The Lambda response object
 */
exports.handler = async (event) => {
  try {
    // Handle preflight OPTIONS request
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, { message: "CORS preflight successful" });
    }
    
    // Parse the request body
    const body = JSON.parse(event.body);
    const { question, options, correctAnswerIndex, explanation } = body;
    
    // Validate input
    if (!question || !options || correctAnswerIndex === undefined || !explanation) {
      return createResponse(400, { error: "Missing required parameters" });
    }
    
    // Get the model ID from environment variables (default to Nova Pro)
    const modelId = process.env.BEDROCK_MODEL_ID || "amazon.nova-pro-v1:0";
    console.log(`Using model: ${modelId}`);
    
    // Create the prompt and request body
    const promptText = createPrompt({ question, options, correctAnswerIndex, explanation });
    const requestBody = createRequestBody(promptText);

    // Invoke the Bedrock model
    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody)
    });

    console.log(`Invoking Bedrock model: ${modelId}`);
    const response = await bedrockClient.send(command);
    
    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract and format the response text
    const responseText = extractResponseText(responseBody);
    const formattedResponse = formatResponseAsHtml(responseText);
    
    // Return the formatted response
    return createResponse(200, { 
      explanation: formattedResponse,
      model: modelId
    });
  } catch (error) {
    console.error("Error generating explanation:", error);
    console.error("Error details:", error.stack);
    
    return createResponse(500, { 
      error: "Error generating explanation", 
      message: error.message 
    });
  }
};
