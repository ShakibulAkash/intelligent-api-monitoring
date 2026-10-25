
import "dotenv/config";
import OpenAI from "openai";

// Instructions for the AI model
export const ALERT_SYSTEM_PROMPT = `
You are an API monitoring assistant.

Write a concise, professional alert using only
the supplied monitoring facts.

Requirements:
1. Mention the API name.
2. Explain the detected problems.
3. Include HTTP status, response time and record
   count when relevant.
4. Suggest one practical troubleshooting action.
5. Do not invent causes or patient information.
6. Respond in 1-2 clear English sentences.
`;

// Create a predefined alert without using AI
function createFallbackAlert(api, detection) {
  const descriptions = detection.issues
    .map(issue => issue.message)
    .join("; ");

  return `${api.api_name}: ${descriptions}. ` +
    "Please check API logs and service availability.";
}

// Generate an alert using AI or fallback
export async function generateAIAlert(api, detection) {

  // Healthy APIs do not need an alert
  if (detection.issues.length === 0) {
    return {
      message: `${api.api_name} is operating normally.`,
      source: "rules"
    };
  }

  // Disable paid AI requests when AI_ENABLED=false
  if (process.env.AI_ENABLED !== "true") {
    return {
      message: createFallbackAlert(api, detection),
      source: "template"
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  // Fall back when no API key is available
  if (!apiKey) {
    console.warn("OpenAI API key is missing.");

    return {
      message: createFallbackAlert(api, detection),
      source: "template"
    };
  }

  try {
    const client = new OpenAI({
      apiKey: apiKey,
      timeout: 20000,
      maxRetries: 0
    });

    const monitoringData = {
      api_name: api.api_name,
      response_time_ms: api.response_time_ms,
      status_code: api.status_code,
      records_returned: api.records_returned ?? null,
      severity: detection.severity,
      issues: detection.issues
    };

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: ALERT_SYSTEM_PROMPT,
      input: JSON.stringify(monitoringData),
      max_output_tokens: 200,
      store: false
    });

    const message = response.output_text?.trim();

    if (!message) {
      throw new Error("AI returned an empty message");
    }

    return {
      message: message,
      source: "openai"
    };

  } catch (error) {

    console.warn("AI generation failed; using template.", {
      status: error.status ?? null,
      code: error.code ?? "unknown"
    });

    return {
      message: createFallbackAlert(api, detection),
      source: "template"
    };
  }
}
