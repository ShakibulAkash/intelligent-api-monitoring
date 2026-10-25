
export function validateApiResponse(api) {

  // Validate input object
  if (
    !api ||
    typeof api !== "object" ||
    Array.isArray(api)
  ) {
    return "Each API response must be a JSON object";
  }

  // Validate API name
  if (
    typeof api.api_name !== "string" ||
    !api.api_name.trim() ||
    api.api_name.length > 100
  ) {
    return "Invalid or missing api_name (maximum 100 characters)";
  }

  // Validate response time
  if (
    typeof api.response_time_ms !== "number" ||
    !Number.isFinite(api.response_time_ms) ||
    api.response_time_ms < 0
  ) {
    return "Invalid or missing response_time_ms";
  }

  // 0 represents a network failure
  // Other values must be valid HTTP status codes
  if (
    !Number.isInteger(api.status_code) ||
    !(
      api.status_code === 0 ||
      (
        api.status_code >= 100 &&
        api.status_code <= 599
      )
    )
  ) {
    return "Invalid status_code (use 0 for network errors or 100-599 for HTTP responses)";
  }

  // Validate record count
  if (
    api.records_returned != null &&
    (
      !Number.isInteger(api.records_returned) ||
      api.records_returned < 0
    )
  ) {
    return "Invalid records_returned";
  }

  return null;
}

// =====================================
// ANOMALY DETECTION
// =====================================

export function detectAnomalies(api) {

  const issues = [];

  const LIMIT_MS = 3000;

  // Rule 1: Network connection errors
  if (api.status_code === 0) {

    issues.push({
      type: "CONNECTION_ERROR",
      severity: "critical",
      message: "API could not be reached or request timed out"
    });

  } else if (api.status_code >= 500) {

    // Rule 2: HTTP server errors
    issues.push({
      type: "HTTP_ERROR",
      severity: "critical",
      message: `Server error: HTTP ${api.status_code}`
    });

  } else if (api.status_code >= 400) {

    // Rule 3: HTTP client errors
    issues.push({
      type: "HTTP_ERROR",
      severity: "warning",
      message: `Client error: HTTP ${api.status_code}`
    });
  }

  // Rule 4: High response time
  if (api.response_time_ms > LIMIT_MS) {

    issues.push({
      type: "SLOW_RESPONSE",
      severity: "warning",
      message: `Response time ${api.response_time_ms} ms exceeds ${LIMIT_MS} ms`
    });
  }

  // Rule 5: Missing record count
  if (api.records_returned == null) {

    issues.push({
      type: "MISSING_RECORDS",
      severity: "warning",
      message: "Record count is missing"
    });

  } else if (api.records_returned === 0) {

    // Rule 6: Zero records
    issues.push({
      type: "ZERO_RECORDS",
      severity: "warning",
      message: "API returned zero records"
    });
  }

  // Determine overall severity
  let severity = "healthy";

  if (issues.some(issue => issue.severity === "critical")) {
    severity = "critical";

  } else if (issues.length > 0) {
    severity = "warning";
  }

  return {
    api_name: api.api_name,
    severity: severity,
    issues: issues
  };
}
