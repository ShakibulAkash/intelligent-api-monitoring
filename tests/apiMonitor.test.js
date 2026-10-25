
import http from "node:http";

import {
  before,
  after,
  test
} from "node:test";

import assert from "node:assert/strict";

import {
  probeAPI,
  loadMonitorConfig
} from "../src/services/apiMonitor.js";

let mockServer;
let baseUrl;

// =====================================
// 1. CREATE TEMPORARY TEST SERVER
// =====================================

before(async () => {

  mockServer = http.createServer(async (req, res) => {

    res.setHeader(
      "Content-Type",
      "application/json"
    );

    // Healthy API
    if (req.url === "/healthy") {
      res.statusCode = 200;

      res.end(JSON.stringify({
        records_returned: 15
      }));

      return;
    }

    // HTTP 503 API
    if (req.url === "/failure") {
      res.statusCode = 503;

      res.end(JSON.stringify({
        records_returned: 0
      }));

      return;
    }

    // API that returns an array
    if (req.url === "/list") {
      res.end(JSON.stringify([
        { id: 1 },
        { id: 2 }
      ]));

      return;
    }

    // API with missing record count
    if (req.url === "/missing") {
      res.end(JSON.stringify({
        message: "No count"
      }));

      return;
    }

    // Simulated slow API
    if (req.url === "/slow") {

      await new Promise(resolve =>
        setTimeout(resolve, 250)
      );

      if (!res.destroyed) {
        res.end(JSON.stringify({
          records_returned: 1
        }));
      }

      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({
      records_returned: 0
    }));
  });

  // Use an available local port automatically
  await new Promise((resolve, reject) => {

    mockServer.once("error", reject);

    mockServer.listen(
      0,
      "127.0.0.1",
      resolve
    );
  });

  baseUrl =
    `http://127.0.0.1:${mockServer.address().port}`;
});

// =====================================
// 2. STOP TEST SERVER AFTER TESTING
// =====================================

after(async () => {

  mockServer.closeAllConnections();

  await new Promise(resolve =>
    mockServer.close(resolve)
  );
});

// =====================================
// 3. AUTOMATED TEST CASES
// =====================================

test("monitor configuration is valid", () => {

  const config = loadMonitorConfig();

  assert.equal(
    config.interval_seconds,
    30
  );

  assert.equal(
    config.targets.length,
    3
  );
});

test("reads a healthy API response", async () => {

  const result = await probeAPI({
    api_name: "HealthyMock",
    url: `${baseUrl}/healthy`
  }, 1000);

  assert.equal(result.api_name, "HealthyMock");
  assert.equal(result.status_code, 200);
  assert.equal(result.records_returned, 15);

  assert.ok(result.response_time_ms >= 0);
});

test("reads HTTP 503 failure", async () => {

  const result = await probeAPI({
    api_name: "FailedMock",
    url: `${baseUrl}/failure`
  }, 1000);

  assert.equal(result.status_code, 503);
  assert.equal(result.records_returned, 0);
});

test("counts JSON array records", async () => {

  const result = await probeAPI({
    api_name: "ListMock",
    url: `${baseUrl}/list`
  }, 1000);

  assert.equal(result.records_returned, 2);
});

test("detects missing record count", async () => {

  const result = await probeAPI({
    api_name: "MissingMock",
    url: `${baseUrl}/missing`
  }, 1000);

  assert.equal(result.records_returned, null);
});

test("reports timeout as internal status 0", async () => {

  const result = await probeAPI({
    api_name: "SlowMock",
    url: `${baseUrl}/slow`
  }, 30);

  assert.equal(result.status_code, 0);
  assert.equal(result.records_returned, null);
});
