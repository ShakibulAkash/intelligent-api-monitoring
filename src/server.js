
import "dotenv/config";

import express from "express";

import { fileURLToPath } from "node:url";

import {
  processMonitoringBatch,
  InputError
} from "./services/monitoringService.js";

import {
  getActiveAlerts,
  getRecentChecks
} from "./db/database.js";

import {
  startAutoMonitoring,
  getAutomationStatus
} from "./services/scheduler.js";

// =====================================
// 1. INITIALIZE SERVER
// =====================================

const app = express();

const PORT = 3000;

const publicFolder = fileURLToPath(
  new URL("../public/", import.meta.url)
);

// Accept JSON requests
app.use(express.json({ limit: "100kb" }));

// Serve frontend dashboard
app.use(express.static(publicFolder));

// =====================================
// 2. LOCAL DEMO API ENDPOINTS
// =====================================

// Track the simulated appointment API state
let appointmentRecovered = false;

// Demo Patient API: Healthy
app.get("/demo/patient", (req, res) => {

  res.json({
    records_returned: 50
  });
});

// Demo Appointment API:
// Initially returns HTTP 503
app.get("/demo/appointment", (req, res) => {

  res.status(
    appointmentRecovered ? 200 : 503
  ).json({
    records_returned:
      appointmentRecovered ? 35 : 0
  });
});

// Demo Billing API:
// Deliberately responds after 3500 ms
app.get("/demo/billing", async (req, res) => {

  await new Promise(resolve =>
    setTimeout(resolve, 3500)
  );

  res.json({
    records_returned: 12
  });
});

// Change appointment API to healthy
app.post("/demo/appointment/recover", (req, res) => {

  appointmentRecovered = true;

  res.json({
    success: true,
    message: "DemoAppointmentAPI set to healthy"
  });
});

// Change appointment API back to failing
app.post("/demo/appointment/fail", (req, res) => {

  appointmentRecovered = false;

  res.json({
    success: true,
    message: "DemoAppointmentAPI set to failing"
  });
});

// =====================================
// 3. HEALTH CHECK
// =====================================

app.get("/health", (req, res) => {

  res.json({
    status: "OK",
    message: "API Monitoring Server is healthy"
  });
});

// =====================================
// 4. AUTOMATION STATUS
// =====================================

app.get("/automation/status", (req, res) => {

  res.json({
    success: true,
    automation: getAutomationStatus()
  });
});

// =====================================
// 5. MANUAL API MONITORING
// =====================================

app.post("/monitor", async (req, res) => {

  try {

    const result = await processMonitoringBatch(
      req.body
    );

    res.status(200).json(result);

  } catch (error) {

    // Invalid client input
    if (error instanceof InputError) {

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Monitoring error:", error);

    res.status(500).json({
      success: false,
      message: "Could not complete monitoring or save results"
    });
  }
});

// =====================================
// 6. FETCH ACTIVE ALERTS
// =====================================

app.get("/alerts", (req, res) => {

  try {

    const alerts = getActiveAlerts();

    res.json({
      success: true,
      total_alerts: alerts.length,
      alerts: alerts
    });

  } catch (error) {

    console.error("Reading alerts failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve alerts"
    });
  }
});

// =====================================
// 7. FETCH MONITORING HISTORY
// =====================================

app.get("/checks", (req, res) => {

  try {

    const checks = getRecentChecks();

    res.json({
      success: true,
      total_checks: checks.length,
      checks: checks
    });

  } catch (error) {

    console.error("Reading checks failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve monitoring checks"
    });
  }
});

// =====================================
// 8. HANDLE UNKNOWN ROUTES
// =====================================

app.use((req, res) => {

  res.status(404).json({
    success: false,
    message: "Endpoint not found"
  });
});

// =====================================
// 9. ERROR HANDLING
// =====================================

app.use((error, req, res, next) => {

  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {

    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body"
    });
  }

  if (error.type === "entity.too.large") {

    return res.status(413).json({
      success: false,
      message: "Request body is too large"
    });
  }

  console.error("Unexpected server error:", error);

  res.status(500).json({
    success: false,
    message: "Unexpected server error"
  });
});

// =====================================
// 10. START SERVER AND SCHEDULER
// =====================================

// Local development only
app.listen(PORT, "127.0.0.1", () => {

  console.log(
    `Dashboard ready: http://localhost:${PORT}`
  );

  console.log("SQLite database ready");

  console.log(
    "AI enabled:",
    process.env.AI_ENABLED === "true"
  );

  // Start scheduled API monitoring
  startAutoMonitoring();
});
