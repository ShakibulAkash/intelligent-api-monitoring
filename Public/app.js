
// =====================================
// 1. SAMPLE API RESPONSES
// =====================================

const sampleData = [
  {
    api_name: "PatientDataAPI",
    response_time_ms: 1200,
    status_code: 200,
    records_returned: 50
  },
  {
    api_name: "AppointmentAPI",
    response_time_ms: 5500,
    status_code: 500,
    records_returned: 0
  },
  {
    api_name: "BillingAPI",
    response_time_ms: 4200,
    status_code: 200,
    records_returned: 25
  }
];

// =====================================
// 2. GET HTML ELEMENTS
// =====================================

const elements = {
  serverStatus: document.getElementById("serverStatus"),
  refreshBtn: document.getElementById("refreshBtn"),
  lastUpdated: document.getElementById("lastUpdated"),

  totalAlerts: document.getElementById("totalAlerts"),
  criticalAlerts: document.getElementById("criticalAlerts"),
  warningAlerts: document.getElementById("warningAlerts"),
  checksCount: document.getElementById("checksCount"),

  payloadInput: document.getElementById("payloadInput"),
  monitorBtn: document.getElementById("monitorBtn"),
  sampleBtn: document.getElementById("sampleBtn"),
  requestFeedback: document.getElementById("requestFeedback"),

  alertsContainer: document.getElementById("alertsContainer"),
  checksBody: document.getElementById("checksBody")
};

// =====================================
// 3. CREATE HTML ELEMENTS SAFELY
// =====================================

function createElement(tag, className = "", text = null) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== null && text !== undefined) {
    element.textContent = String(text);
  }

  return element;
}

// =====================================
// 4. MAKE BACKEND REQUESTS
// =====================================

async function requestJSON(url, options = {}) {

  const response = await fetch(url, options);

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Server returned invalid JSON (HTTP ${response.status})`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (HTTP ${response.status})`
    );
  }

  return data;
}

// =====================================
// 5. SERVER CONNECTION STATUS
// =====================================

function updateServerStatus(isOnline) {

  const indicator = createElement(
    "span",
    "status-dot"
  );

  const label = createElement(
    "span",
    "",
    isOnline ? "Backend Online" : "Backend Offline"
  );

  elements.serverStatus.replaceChildren(
    indicator,
    label
  );

  elements.serverStatus.classList.toggle(
    "is-offline",
    !isOnline
  );
}

// =====================================
// 6. FORMAT DATE AND TIME
// =====================================

function formatDate(value) {

  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

// =====================================
// 7. SHOW FEEDBACK MESSAGES
// =====================================

function showFeedback(message, isError = false) {

  elements.requestFeedback.textContent = message;

  elements.requestFeedback.className = isError
    ? "feedback feedback-error"
    : "feedback feedback-success";
}

// =====================================
// 8. UPDATE SUMMARY STATISTICS
// =====================================

function renderStatistics(alerts, checks) {

  const critical = alerts.filter(
    alert => alert.severity === "critical"
  ).length;

  const warning = alerts.filter(
    alert => alert.severity === "warning"
  ).length;

  elements.totalAlerts.textContent = alerts.length;
  elements.criticalAlerts.textContent = critical;
  elements.warningAlerts.textContent = warning;
  elements.checksCount.textContent = checks.length;
}

// =====================================
// 9. DISPLAY ACTIVE ALERTS
// =====================================

function renderAlerts(alerts) {

  elements.alertsContainer.replaceChildren();

  if (alerts.length === 0) {

    const empty = createElement(
      "div",
      "empty-state",
      "No active alerts. All currently tracked incidents are resolved."
    );

    elements.alertsContainer.appendChild(empty);
    return;
  }

  alerts.forEach(alert => {

    const isCritical = alert.severity === "critical";

    const card = createElement(
      "article",
      isCritical
        ? "alert-item critical"
        : "alert-item"
    );

    // Alert heading
    const top = createElement("div", "alert-top");

    const apiName = createElement(
      "strong",
      "alert-api",
      alert.api_name
    );

    const severity = createElement(
      "span",
      isCritical
        ? "pill pill-critical"
        : "pill pill-warning",
      alert.severity
    );

    top.append(apiName, severity);

    // Alert description
    const message = createElement(
      "p",
      "alert-message",
      alert.alert_message ||
        "No saved message yet. Recheck this API to update the alert."
    );

    // List detected issues
    const issueList = createElement(
      "ul",
      "issue-list"
    );

    const issues = Array.isArray(alert.issues)
      ? alert.issues
      : [];

    issues.forEach(issue => {
      const item = createElement(
        "li",
        "",
        issue.message || issue.type || "Unknown issue"
      );

      issueList.appendChild(item);
    });

    // Show message generation source
    const source = alert.generation_source === "openai"
      ? "AI Generated"
      : "Template";

    const meta = createElement(
      "div",
      "alert-meta",
      `Source: ${source} | Last seen: ${formatDate(alert.last_seen)} | Occurrences: ${alert.occurrences ?? 1}`
    );

    card.append(top, message, issueList, meta);

    elements.alertsContainer.appendChild(card);
  });
}

// =====================================
// 10. DISPLAY MONITORING HISTORY
// =====================================

function renderChecks(checks) {

  elements.checksBody.replaceChildren();

  if (checks.length === 0) {

    const row = document.createElement("tr");

    const cell = createElement(
      "td",
      "",
      "No monitoring checks have been recorded yet."
    );

    cell.colSpan = 5;

    row.appendChild(cell);
    elements.checksBody.appendChild(row);

    return;
  }

  checks.forEach(check => {

    const row = document.createElement("tr");

    const apiCell = createElement(
      "td",
      "",
      check.api_name
    );

    const timeCell = createElement(
      "td",
      "",
      `${check.response_time_ms} ms`
    );

    const statusCell = createElement(
      "td",
      "",
      check.status_code
    );

    const severityCell = document.createElement("td");

    let severityClass = "pill pill-warning";

    if (check.severity === "critical") {
      severityClass = "pill pill-critical";
    } else if (check.severity === "healthy") {
      severityClass = "pill pill-healthy";
    }

    const severityBadge = createElement(
      "span",
      severityClass,
      check.severity
    );

    severityCell.appendChild(severityBadge);

    const dateCell = createElement(
      "td",
      "",
      formatDate(check.checked_at)
    );

    row.append(
      apiCell,
      timeCell,
      statusCell,
      severityCell,
      dateCell
    );

    elements.checksBody.appendChild(row);
  });
}

// =====================================
// 11. LOAD DATA FROM SQLITE VIA API
// =====================================

let refreshInProgress = false;

async function refreshDashboard() {

  if (refreshInProgress) {
    return;
  }

  refreshInProgress = true;
  elements.refreshBtn.disabled = true;

  try {

    const [alertsResponse, checksResponse] =
      await Promise.all([
        requestJSON("/alerts"),
        requestJSON("/checks")
      ]);

    const alerts = alertsResponse.alerts;
    const checks = checksResponse.checks;

    renderStatistics(alerts, checks);
    renderAlerts(alerts);
    renderChecks(checks);

    updateServerStatus(true);

    elements.lastUpdated.textContent =
      new Date().toLocaleTimeString();

  } catch (error) {

    updateServerStatus(false);

    showFeedback(
      `Could not load dashboard: ${error.message}`,
      true
    );

  } finally {

    refreshInProgress = false;
    elements.refreshBtn.disabled = false;
  }
}

// =====================================
// 12. ANALYZE API RESPONSES
// =====================================

async function analyzeResponses() {

  let payload;

  // Convert user input from text to JSON
  try {

    payload = JSON.parse(elements.payloadInput.value);

  } catch {

    showFeedback(
      "Invalid JSON. Please check your input format.",
      true
    );

    return;
  }

  elements.monitorBtn.disabled = true;
  elements.monitorBtn.textContent = "Analyzing...";

  try {

    const result = await requestJSON("/monitor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    showFeedback(
      `Analysis completed! Checked ${result.total_received} API responses. Found ${result.apis_with_anomalies} affected APIs and ${result.total_issues} issues.`
    );

    // Load updated alerts and history
    await refreshDashboard();

  } catch (error) {

    showFeedback(error.message, true);

  } finally {

    elements.monitorBtn.disabled = false;
    elements.monitorBtn.textContent = "Analyze Responses";
  }
}

// =====================================
// 13. BUTTON EVENTS
// =====================================

// Load example JSON data
elements.sampleBtn.addEventListener("click", () => {

  elements.payloadInput.value = JSON.stringify(
    sampleData,
    null,
    2
  );

  elements.requestFeedback.textContent = "";
});

// Analyze button
elements.monitorBtn.addEventListener(
  "click",
  analyzeResponses
);

// Refresh button
elements.refreshBtn.addEventListener(
  "click",
  refreshDashboard
);

// =====================================
// 14. INITIALIZE DASHBOARD
// =====================================

// Put sample JSON into textarea
elements.payloadInput.value = JSON.stringify(
  sampleData,
  null,
  2
);

// Load saved monitoring data
refreshDashboard();

// Refresh database views every 20 seconds
setInterval(refreshDashboard, 20000);
