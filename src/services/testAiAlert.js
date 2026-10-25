
import { detectAnomalies } from "./anomalyDetector.js";

import { generateAIAlert } from "./aiAlertService.js";

// Sample problematic API response
const sampleAPI = {
  api_name: "AppointmentAPI",
  response_time_ms: 5500,
  status_code: 500,
  records_returned: 0
};

// Step 1: Detect problems
const detection = detectAnomalies(sampleAPI);

console.log("=== DETECTED ANOMALIES ===");
console.log(JSON.stringify(detection, null, 2));

// Step 2: Generate alert message
console.log("\n=== GENERATING ALERT ===");

const alert = await generateAIAlert(
  sampleAPI,
  detection
);

// Step 3: Display final alert
console.log("\n=== FINAL ALERT ===");
console.log("Source:", alert.source);
console.log("Message:", alert.message);
