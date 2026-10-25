
import {
  mkdirSync,
  appendFileSync
} from "node:fs";

import { join } from "node:path";

import { fileURLToPath } from "node:url";

// Locate the logs directory
const logFolder = fileURLToPath(
  new URL("../../logs/", import.meta.url)
);

// Create logs folder automatically
mkdirSync(logFolder, { recursive: true });

// Log file location
const logFile = join(
  logFolder,
  "monitoring.log"
);

// =====================================
// STRUCTURED LOGGING FUNCTION
// =====================================

export function logEvent(
  level,
  event,
  details = {}
) {

  // Accept only supported log levels
  const validLevels = [
    "info",
    "warn",
    "error"
  ];

  const safeLevel = validLevels.includes(level)
    ? level
    : "info";

  // Create structured log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: safeLevel,
    event: event,
    ...details
  };

  // Convert log object into JSON text
  const logLine = JSON.stringify(logEntry);

  // Save log into file
  try {

    appendFileSync(
      logFile,
      logLine + "\n",
      "utf8"
    );

  } catch (error) {

    console.error(
      "Failed to write log file:",
      error.message
    );
  }

  // Display log in VS Code Terminal
  const method = safeLevel === "error"
    ? "error"
    : safeLevel === "warn"
      ? "warn"
      : "log";

  console[method](
    `[${safeLevel.toUpperCase()}] ${event}`,
    details
  );
}
