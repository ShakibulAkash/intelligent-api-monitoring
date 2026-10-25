
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Locate database folder
const dataFolder = fileURLToPath(
  new URL("../../data/", import.meta.url)
);

// Create data folder if needed
mkdirSync(dataFolder, { recursive: true });

// Open existing database or create a new one
const dbPath = join(dataFolder, "monitoring.db");

export const db = new DatabaseSync(dbPath);

// =====================================
// 1. CREATE DATABASE TABLES
// =====================================

db.exec(`
  CREATE TABLE IF NOT EXISTS api_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_name TEXT NOT NULL,
    response_time_ms REAL NOT NULL,
    status_code INTEGER NOT NULL,
    records_returned INTEGER,
    severity TEXT NOT NULL,
    checked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_name TEXT NOT NULL,
    severity TEXT NOT NULL
      CHECK (severity IN ('warning', 'critical')),
    issues_json TEXT NOT NULL,
    response_time_ms REAL NOT NULL,
    status_code INTEGER NOT NULL,
    records_returned INTEGER,
    active INTEGER NOT NULL DEFAULT 1
      CHECK (active IN (0, 1)),
    occurrences INTEGER NOT NULL DEFAULT 1,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    resolved_at TEXT,
    alert_message TEXT NOT NULL DEFAULT '',
    generation_source TEXT NOT NULL DEFAULT 'template'
  );

  CREATE UNIQUE INDEX IF NOT EXISTS one_active_alert_per_api
  ON alerts(api_name)
  WHERE active = 1;
`);

// =====================================
// 2. UPDATE OLD DATABASE STRUCTURE
// =====================================

// Check existing alert table columns
const alertColumns = new Set(
  db.prepare("PRAGMA table_info(alerts)")
    .all()
    .map(column => column.name)
);

// Add message column if missing
if (!alertColumns.has("alert_message")) {
  db.exec(`
    ALTER TABLE alerts
    ADD COLUMN alert_message TEXT NOT NULL DEFAULT ''
  `);
}

// Add generation source column if missing
if (!alertColumns.has("generation_source")) {
  db.exec(`
    ALTER TABLE alerts
    ADD COLUMN generation_source TEXT NOT NULL
    DEFAULT 'template'
  `);
}

// =====================================
// 3. PREPARE DATABASE QUERIES
// =====================================

// Save monitoring checks
const insertCheck = db.prepare(`
  INSERT INTO api_checks (
    api_name,
    response_time_ms,
    status_code,
    records_returned,
    severity,
    checked_at
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Find existing active alert
const findActiveAlert = db.prepare(`
  SELECT id
  FROM alerts
  WHERE api_name = ? AND active = 1
`);

// Insert new alert
const insertAlert = db.prepare(`
  INSERT INTO alerts (
    api_name,
    severity,
    issues_json,
    response_time_ms,
    status_code,
    records_returned,
    alert_message,
    generation_source,
    first_seen,
    last_seen
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Update existing active alert
const updateAlert = db.prepare(`
  UPDATE alerts
  SET
    severity = ?,
    issues_json = ?,
    response_time_ms = ?,
    status_code = ?,
    records_returned = ?,
    alert_message = ?,
    generation_source = ?,
    occurrences = occurrences + 1,
    last_seen = ?
  WHERE id = ? AND active = 1
`);

// Resolve an alert
const resolveAlert = db.prepare(`
  UPDATE alerts
  SET active = 0, resolved_at = ?
  WHERE api_name = ? AND active = 1
`);

// =====================================
// 4. SAVE MONITORING RESULTS
// =====================================

export function saveMonitoringBatch(
  apiResponses,
  results,
  generatedAlerts
) {

  // Check that the three arrays match
  if (
    !Array.isArray(apiResponses) ||
    !Array.isArray(results) ||
    !Array.isArray(generatedAlerts) ||
    apiResponses.length !== results.length ||
    results.length !== generatedAlerts.length
  ) {
    throw new Error(
      "API inputs, results and alerts must have matching lengths"
    );
  }

  const timestamp = new Date().toISOString();

  // Start transaction
  db.exec("BEGIN TRANSACTION");

  try {

    for (let i = 0; i < apiResponses.length; i++) {

      const api = apiResponses[i];
      const result = results[i];
      const alert = generatedAlerts[i];

      // Save every monitoring check
      insertCheck.run(
        api.api_name,
        api.response_time_ms,
        api.status_code,
        api.records_returned ?? null,
        result.severity,
        timestamp
      );

      // If healthy, resolve old active alerts
      if (result.issues.length === 0) {
        resolveAlert.run(timestamp, api.api_name);
        continue;
      }

      // An unhealthy API must have an alert message
      if (
        !alert ||
        typeof alert.message !== "string" ||
        !alert.message.trim()
      ) {
        throw new Error(
          `Missing generated alert for ${api.api_name}`
        );
      }

      const issuesJson = JSON.stringify(result.issues);

      const source = alert.source === "openai"
        ? "openai"
        : "template";

      const existing = findActiveAlert.get(api.api_name);

      if (existing) {

        // Update old active alert
        updateAlert.run(
          result.severity,
          issuesJson,
          api.response_time_ms,
          api.status_code,
          api.records_returned ?? null,
          alert.message,
          source,
          timestamp,
          existing.id
        );

      } else {

        // Save a new alert
        insertAlert.run(
          api.api_name,
          result.severity,
          issuesJson,
          api.response_time_ms,
          api.status_code,
          api.records_returned ?? null,
          alert.message,
          source,
          timestamp,
          timestamp
        );
      }
    }

    // Commit all changes
    db.exec("COMMIT");

  } catch (error) {

    // Undo incomplete database changes
    db.exec("ROLLBACK");
    throw error;
  }
}

// =====================================
// 5. FETCH ACTIVE ALERTS
// =====================================

export function getActiveAlerts() {

  const rows = db.prepare(`
    SELECT *
    FROM alerts
    WHERE active = 1
    ORDER BY last_seen DESC
  `).all();

  return rows.map(({ issues_json, ...row }) => ({
    ...row,
    issues: JSON.parse(issues_json)
  }));
}

// =====================================
// 6. FETCH RECENT MONITORING CHECKS
// =====================================

export function getRecentChecks() {

  return db.prepare(`
    SELECT *
    FROM api_checks
    ORDER BY id DESC
    LIMIT 20
  `).all();
}
