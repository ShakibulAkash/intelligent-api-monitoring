
import {
  loadMonitorConfig,
  probeAPI
} from "./apiMonitor.js";

import {
  processMonitoringBatch
} from "./monitoringService.js";

import {
  logEvent
} from "../utils/logger.js";

// =====================================
// 1. AUTOMATION STATE
// =====================================

const state = {
  enabled: false,
  checking: false,
  interval_seconds: null,
  target_names: [],
  last_started_at: null,
  last_completed_at: null,
  last_error: null,
  last_summary: null
};

let intervalHandle = null;

// =====================================
// 2. GET AUTOMATION STATUS
// =====================================

export function getAutomationStatus() {

  return {
    ...state,

    target_names: [
      ...state.target_names
    ],

    last_summary: state.last_summary
      ? { ...state.last_summary }
      : null
  };
}

// =====================================
// 3. START AUTOMATIC MONITORING
// =====================================

export function startAutoMonitoring() {

  // Prevent duplicate schedulers
  if (intervalHandle !== null) {
    return;
  }

  let config;

  try {

    config = loadMonitorConfig();

  } catch (error) {

    state.last_error = error.message;

    logEvent(
      "error",
      "automation_configuration_failed",
      {
        reason: error.message
      }
    );

    return;
  }

  state.enabled = true;

  state.interval_seconds =
    config.interval_seconds;

  state.target_names = config.targets.map(
    target => target.api_name
  );

  logEvent(
    "info",
    "automation_started",
    {
      interval_seconds: config.interval_seconds,
      target_count: config.targets.length
    }
  );

  // =====================================
  // 4. AUTOMATIC MONITORING CYCLE
  // =====================================

  async function runCycle() {

    // Prevent overlapping cycles
    if (state.checking) {

      logEvent(
        "warn",
        "monitoring_cycle_skipped",
        {
          reason: "Previous cycle still running"
        }
      );

      return;
    }

    state.checking = true;

    state.last_started_at =
      new Date().toISOString();

    const cycleStart = performance.now();

    try {

      // Request all configured APIs
      const observations = await Promise.all(
        config.targets.map(target =>
          probeAPI(
            target,
            config.timeout_ms
          )
        )
      );

      // Analyze and save monitoring results
      const result = await processMonitoringBatch(
        observations
      );

      // Log individual API results
      for (let i = 0; i < observations.length; i++) {

        const observation = observations[i];
        const analysis = result.results[i];

        const level =
          analysis.severity === "critical"
            ? "error"
            : analysis.severity === "warning"
              ? "warn"
              : "info";

        logEvent(
          level,
          "api_check_completed",
          {
            api_name: observation.api_name,

            response_time_ms:
              observation.response_time_ms,

            status_code:
              observation.status_code,

            severity:
              analysis.severity,

            issue_count:
              analysis.issues.length
          }
        );
      }

      // Record successful cycle
      state.last_completed_at =
        new Date().toISOString();

      state.last_error = null;

      state.last_summary = {
        total_received: result.total_received,

        apis_with_anomalies:
          result.apis_with_anomalies,

        total_issues:
          result.total_issues
      };

      const durationMs = Math.round(
        performance.now() - cycleStart
      );

      logEvent(
        "info",
        "monitoring_cycle_completed",
        {
          checked: result.total_received,

          affected:
            result.apis_with_anomalies,

          issues: result.total_issues,

          duration_ms: durationMs
        }
      );

    } catch (error) {

      state.last_error = error.message;

      logEvent(
        "error",
        "monitoring_cycle_failed",
        {
          reason: error.message
        }
      );

    } finally {

      state.checking = false;
    }
  }

  // Run monitoring immediately
  void runCycle();

  // Repeat at configured interval
  intervalHandle = setInterval(() => {
    void runCycle();
  }, config.interval_seconds * 1000);
}
