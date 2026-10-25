
# PulseMonitor — Intelligent API Monitoring & Alert System

An API monitoring and anomaly detection system built using
Node.js, Express.js, SQLite, HTML, CSS, JavaScript, and
OpenAI API integration.

The system analyzes API responses, detects abnormal
behavior, generates human-readable alerts, and stores
monitoring results in a SQLite database.

## 1. Project Overview

PulseMonitor is designed to identify operational problems
in API integrations.

It supports:

- Manual API response monitoring
- Automatic scheduled API monitoring
- HTTP error detection
- Slow response detection
- Missing or zero record detection
- Network failure and timeout detection
- Human-readable alert generation
- OpenAI integration with fallback templates
- SQLite database storage
- Automatic alert resolution
- Monitoring history
- Structured operational logging
- Web-based monitoring dashboard

## 2. Technology Stack

Backend:
- Node.js
- Express.js

Database:
- SQLite (node:sqlite)

AI Integration:
- OpenAI JavaScript SDK
- OpenAI Responses API
- Template-based fallback alerts

Frontend:
- HTML5
- CSS3
- Vanilla JavaScript

Testing:
- Node.js built-in test runner
- REST Client

Development:
- Visual Studio Code
- Git and GitHub

## 3. Requirements

Install:

- Node.js 24 LTS
- npm

Git is optional for running the project but useful
for cloning and version control.

## 4. Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/intelligent-api-monitoring.git
```

Open the project directory:

```bash
cd intelligent-api-monitoring
```

Install dependencies:

```bash
npm install
```

On Windows PowerShell, use `npm.cmd` if `npm` is
blocked by the execution policy.

Create a local .env file by copying .env.example.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Mac/Linux:

```bash
cp .env.example .env
```

Do not overwrite an existing .env file containing
configuration you want to keep.

## 5. Environment Variables

The .env file contains:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
AI_ENABLED=false
```

When AI_ENABLED=false, the application generates
predefined fallback alerts without making paid
OpenAI API requests.

To enable OpenAI-generated alerts, configure a
valid API key, ensure API credits are available,
and set AI_ENABLED=true.

OpenAI API usage may incur charges.

Never commit the .env file to GitHub.

## 6. Running the Application

Start the backend:

```bash
npm start
```

On Windows PowerShell:

```powershell
npm.cmd start
```

Open the dashboard:

http://localhost:3000

The server runs locally on port 3000.

Keep the terminal open while using the application.

## 7. API Endpoints

POST /monitor
Analyzes one batch of API response data.

GET /alerts
Returns currently active anomalies.

GET /checks
Returns the latest 20 monitoring checks.

GET /health
Returns backend health information.

GET /automation/status
Returns automatic monitoring status.

GET /demo/patient
Local healthy API demonstration.

GET /demo/appointment
Local appointment API demonstration.

GET /demo/billing
Local slow-response API demonstration.

POST /demo/appointment/recover
Changes the local appointment demo to healthy.

POST /demo/appointment/fail
Changes the local appointment demo to failing.

The demo endpoints are intended for local development only.

## 8. Example Monitoring Request

POST /monitor

Request body:

```json
[
  {
    "api_name": "PatientDataAPI",
    "response_time_ms": 1200,
    "status_code": 200,
    "records_returned": 50
  },
  {
    "api_name": "AppointmentAPI",
    "response_time_ms": 5500,
    "status_code": 500,
    "records_returned": 0
  }
]
```

The monitoring engine identifies:

PatientDataAPI:
- Healthy

AppointmentAPI:
- HTTP 500 server error
- Slow response (5500 ms)
- Zero records
- Overall severity: critical

## 9. Anomaly Detection Rules

Response time > 3000 ms:
Warning

HTTP 400–499:
Warning

HTTP 500–599:
Critical

Network failure (internal status 0):
Critical

Missing record count:
Warning

Zero records:
Warning

If multiple issues exist, the highest severity
determines the overall API status.

These are configurable project rules, not universal
thresholds for every real-world API.

## 10. Automatic API Monitoring

The automatic scheduler reads:

data/targets.json

The default configuration checks three local demo
APIs every 30 seconds.

The scheduler:

1. Sends HTTP requests.
2. Measures response times.
3. Reads HTTP status and record counts.
4. Detects anomalies.
5. Generates alert messages.
6. Stores results in SQLite.
7. Updates active incidents.
8. Resolves recovered incidents.

The scheduler operates while the Node.js server
process is running.

The browser dashboard refreshes saved data
approximately every 20 seconds.

## 11. Database

Database file:

data/monitoring.db

SQLite tables:

api_checks:
Stores monitoring observations and health status.

alerts:
Stores detected incidents, alert messages,
severity, generation source, timestamps,
occurrence counts, and resolution status.

An active alert is updated when the same API
continues experiencing issues.

When the API becomes healthy, its active alert
is resolved while historical records remain stored.

The local database file is excluded from Git.

## 12. AI Alert Generation

The system includes OpenAI API integration.

AI messages are generated from anomaly details,
including API name, response time, HTTP status,
record count, and detected issues.

The AI is instructed to avoid inventing causes
or patient information.

If AI is disabled or an API request fails,
the system uses predefined fallback templates.

Alert sources are identified as:

openai:
Generated by the LLM.

template:
Generated using fallback logic.

A fallback alert must not be represented as
a successfully generated LLM response.

## 13. Frontend Dashboard

The dashboard displays:

- Active alert count
- Critical alert count
- Warning alert count
- Recent monitoring checks
- JSON monitoring input
- Generated alert descriptions
- Alert severity
- Alert source
- Monitoring history

## 14. Logging

Structured JSON logs are stored in:

logs/monitoring.log

Logged events include:

- automation_started
- api_check_completed
- monitoring_cycle_completed
- monitoring_cycle_failed
- monitoring_cycle_skipped

Log files are excluded from Git.

## 15. Automated Testing

Run:

```bash
npm test
```

On Windows PowerShell:

```powershell
npm.cmd test
```

The automated test suite contains 22 tests covering:

- Input validation
- HTTP error classification
- Response-time thresholds
- Missing and zero records
- Network failure detection
- Monitoring configuration
- HTTP response handling
- Record-count extraction
- Request timeout handling

The tests do not require an OpenAI API key.

Database and full dashboard integration should
also be checked manually before submission.

## 16. Project Structure

```text
intelligent-api-monitoring/
├── data/
│   └── targets.json
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   ├── db/
│   │   ├── database.js
│   │   └── testDatabase.js
│   ├── services/
│   │   ├── aiAlertService.js
│   │   ├── anomalyDetector.js
│   │   ├── apiMonitor.js
│   │   ├── monitoringService.js
│   │   ├── scheduler.js
│   │   └── testAiAlert.js
│   ├── utils/
│   │   └── logger.js
│   └── server.js
├── tests/
│   ├── anomalyDetector.test.js
│   └── apiMonitor.test.js
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── requests.http
└── README.md
```

Runtime-generated files such as .env, SQLite
database files, and logs are not included in Git.

## 17. Security and Limitations

- Designed as a local technical demonstration.
- No real patient data should be used.
- Demo endpoints do not require authentication,
  so they must not be publicly exposed.
- Monitoring targets are restricted to approved
  local demo URLs in this version.
- Local scheduler state does not persist across
  process restarts.
- Automatic email reporting is not implemented.
- No production-grade authentication or role
  permissions are implemented.
- The current fallback mode does not prove a
  successful live OpenAI request.
- Live OpenAI functionality requires separate
  verification with valid API access.

## 18. Possible Future Improvements

- Authorized external API monitoring
- Per-API monitoring thresholds
- Authentication and authorization
- Email notifications
- Production deployment
- Distributed scheduling
- Monitoring charts and analytics
- API uptime statistics

## 19. AI Usage Disclosure

AI assistance was used during project development,
including architecture guidance, code generation,
debugging, testing, and documentation.

Development prompts and the runtime alert-generation
prompt are documented separately in AI_Prompts.docx.

All generated code should be reviewed and tested
before deployment.

## 20. Author

[ShakibulAkash]


```
