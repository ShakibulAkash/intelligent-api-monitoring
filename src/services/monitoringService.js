
import {
  validateApiResponse,
  detectAnomalies
} from "./anomalyDetector.js";

import {
  generateAIAlert
} from "./aiAlertService.js";

import {
  saveMonitoringBatch
} from "../db/database.js";

// Custom error for invalid user input
export class InputError extends Error {}

// =====================================
// PROCESS A COMPLETE MONITORING BATCH
// =====================================

export async function processMonitoringBatch(apiResponses) {

  // Step 1: Validate batch size
  if (
    !Array.isArray(apiResponses) ||
    apiResponses.length < 1 ||
    apiResponses.length > 100
  ) {
    throw new InputError(
      "Please provide an array containing 1 to 100 API responses."
    );
  }

  // Step 2: Validate each API
  const seenNames = new Set();

  for (let i = 0; i < apiResponses.length; i++) {

    const error = validateApiResponse(apiResponses[i]);

    if (error) {
      throw new InputError(
        `API response ${i + 1}: ${error}`
      );
    }

    const name = apiResponses[i].api_name.trim();

    if (seenNames.has(name)) {
      throw new InputError(
        `Duplicate api_name in batch: ${name}`
      );
    }

    seenNames.add(name);
  }

  // Step 3: Detect anomalies
  const results = apiResponses.map(detectAnomalies);

  // Step 4: Generate alert messages
  const generatedAlerts = [];

  for (let i = 0; i < results.length; i++) {

    if (results[i].issues.length > 0) {

      const alert = await generateAIAlert(
        apiResponses[i],
        results[i]
      );

      generatedAlerts.push(alert);

    } else {

      generatedAlerts.push(null);
    }
  }

  // Step 5: Save everything to SQLite
  saveMonitoringBatch(
    apiResponses,
    results,
    generatedAlerts
  );

  // Step 6: Return monitoring results
  return {
    success: true,
    message: "API monitoring analysis completed and saved",

    total_received: apiResponses.length,

    apis_with_anomalies: results.filter(
      result => result.issues.length > 0
    ).length,

    total_issues: results.reduce(
      (sum, result) => sum + result.issues.length,
      0
    ),

    results: results.map((result, i) => ({
      ...result,

      alert_message:
        generatedAlerts[i]?.message ?? null,

      generation_source:
        generatedAlerts[i]?.source ?? null
    }))
  };
}
