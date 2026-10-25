
import test from "node:test";
import assert from "node:assert/strict";

import {
  validateApiResponse,
  detectAnomalies
} from "../src/services/anomalyDetector.js";

// A reusable healthy API response
const healthyApi = () => ({
  api_name: "PatientDataAPI",
  response_time_ms: 1200,
  status_code: 200,
  records_returned: 50
});

// =====================================
// INPUT VALIDATION TESTS
// =====================================

test("accepts a valid API response", () => {
  assert.equal(
    validateApiResponse(healthyApi()),
    null
  );
});

test("rejects non-object input", () => {
  assert.notEqual(validateApiResponse(null), null);
  assert.notEqual(validateApiResponse([]), null);
});

test("rejects an empty API name", () => {
  assert.notEqual(
    validateApiResponse({
      ...healthyApi(),
      api_name: " "
    }),
    null
  );
});

test("rejects negative response time", () => {
  assert.notEqual(
    validateApiResponse({
      ...healthyApi(),
      response_time_ms: -1
    }),
    null
  );
});

test("rejects invalid HTTP status", () => {
  assert.notEqual(
    validateApiResponse({
      ...healthyApi(),
      status_code: 999
    }),
    null
  );
});

test("accepts status 0 for connection failure", () => {
  assert.equal(
    validateApiResponse({
      ...healthyApi(),
      status_code: 0
    }),
    null
  );
});

test("rejects negative record counts", () => {
  assert.notEqual(
    validateApiResponse({
      ...healthyApi(),
      records_returned: -10
    }),
    null
  );
});

// =====================================
// ANOMALY DETECTION TESTS
// =====================================

test("marks a normal API as healthy", () => {
  const result = detectAnomalies(healthyApi());

  assert.equal(result.severity, "healthy");
  assert.deepEqual(result.issues, []);
});

test("detects HTTP 503 as critical", () => {
  const result = detectAnomalies({
    ...healthyApi(),
    status_code: 503
  });

  assert.equal(result.severity, "critical");

  assert.ok(
    result.issues.some(
      issue => issue.type === "HTTP_ERROR"
    )
  );
});

test("detects HTTP 404 as warning", () => {
  const result = detectAnomalies({
    ...healthyApi(),
    status_code: 404
  });

  assert.equal(result.severity, "warning");
});

test("detects response time above 3000 ms", () => {
  const result = detectAnomalies({
    ...healthyApi(),
    response_time_ms: 3500
  });

  assert.ok(
    result.issues.some(
      issue => issue.type === "SLOW_RESPONSE"
    )
  );
});

test("3000 ms exactly is not slow", () => {
  const result = detectAnomalies({
    ...healthyApi(),
    response_time_ms: 3000
  });

  assert.equal(result.severity, "healthy");
});

test("detects zero records", () => {
  const result = detectAnomalies({
    ...healthyApi(),
    records_returned: 0
  });

  assert.ok(
    result.issues.some(
      issue => issue.type === "ZERO_RECORDS"
    )
  );
});

test("detects missing record count", () => {
  const api = healthyApi();
  delete api.records_returned;

  const result = detectAnomalies(api);

  assert.ok(
    result.issues.some(
      issue => issue.type === "MISSING_RECORDS"
    )
  );
});

test("detects network failures as critical", () => {
  const result = detectAnomalies({
    ...healthyApi(),
    status_code: 0,
    records_returned: null
  });

  assert.equal(result.severity, "critical");

  assert.ok(
    result.issues.some(
      issue => issue.type === "CONNECTION_ERROR"
    )
  );
});

test("detects three issues in original example", () => {
  const result = detectAnomalies({
    api_name: "AppointmentAPI",
    response_time_ms: 5500,
    status_code: 500,
    records_returned: 0
  });

  assert.equal(result.severity, "critical");
  assert.equal(result.issues.length, 3);
});
