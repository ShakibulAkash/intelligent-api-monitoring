
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Locate our configuration file
const configPath = fileURLToPath(
  new URL("../../data/targets.json", import.meta.url)
);

// Allowed local demo endpoints
const demoPaths = new Set([
  "/demo/patient",
  "/demo/appointment",
  "/demo/billing"
]);

// =====================================
// 1. READ MONITOR CONFIGURATION
// =====================================

export function loadMonitorConfig() {

  const config = JSON.parse(
    readFileSync(configPath, "utf8")
  );

  // Validate monitoring interval
  if (
    !Number.isInteger(config.interval_seconds) ||
    config.interval_seconds < 10 ||
    config.interval_seconds > 3600
  ) {
    throw new Error(
      "interval_seconds must be an integer between 10 and 3600"
    );
  }

  // Validate request timeout
  if (
    !Number.isInteger(config.timeout_ms) ||
    config.timeout_ms < 1000 ||
    config.timeout_ms > 30000
  ) {
    throw new Error(
      "timeout_ms must be between 1000 and 30000"
    );
  }

  // Validate API targets
  if (
    !Array.isArray(config.targets) ||
    config.targets.length === 0 ||
    config.targets.length > 20
  ) {
    throw new Error(
      "targets must contain between 1 and 20 APIs"
    );
  }

  const names = new Set();

  for (const target of config.targets) {

    if (
      !target ||
      typeof target.api_name !== "string" ||
      !target.api_name.trim() ||
      target.api_name.length > 100 ||
      typeof target.url !== "string"
    ) {
      throw new Error(
        "Each target needs a valid api_name and url"
      );
    }

    const url = new URL(target.url);

    // Restrict Step 7 to approved localhost demo URLs
    if (
      url.origin !== "http://127.0.0.1:3000" ||
      !demoPaths.has(url.pathname) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new Error(
        `Target ${target.api_name}: Step 7 supports only approved local demo URLs`
      );
    }

    if (names.has(target.api_name)) {
      throw new Error(
        `Duplicate API name: ${target.api_name}`
      );
    }

    names.add(target.api_name);
  }

  return config;
}

// =====================================
// 2. EXTRACT RETURNED RECORD COUNT
// =====================================

function extractRecordCount(body) {

  if (Array.isArray(body)) {
    return body.length;
  }

  if (!body || typeof body !== "object") {
    return null;
  }

  if (
    Number.isInteger(body.records_returned) &&
    body.records_returned >= 0
  ) {
    return body.records_returned;
  }

  if (Array.isArray(body.records)) {
    return body.records.length;
  }

  return null;
}

// =====================================
// 3. MONITOR A SINGLE API
// =====================================

export async function probeAPI(target, timeoutMs) {

  // Start measuring response time
  const started = performance.now();

  try {

    // Send HTTP GET request
    const response = await fetch(target.url, {
      method: "GET",
      redirect: "error",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    let body = null;

    try {
      body = await response.json();
    } catch {
      // Non-JSON or empty response body
      // will be treated as missing record data.
    }

    // Calculate elapsed time
    const responseTime = Math.round(
      performance.now() - started
    );

    return {
      api_name: target.api_name,
      response_time_ms: responseTime,
      status_code: response.status,
      records_returned: extractRecordCount(body)
    };

  } catch (error) {

    // Handle network failures and timeouts
    console.error(
      `[AUTO] ${target.api_name} connection failed: ${error.name}`
    );

    const responseTime = Math.round(
      performance.now() - started
    );

    return {
      api_name: target.api_name,
      response_time_ms: responseTime,
      status_code: 0,
      records_returned: null
    };
  }
}
