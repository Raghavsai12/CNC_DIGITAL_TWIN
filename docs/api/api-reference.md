# API Reference

## Overview

The backend exposes REST endpoints for retrieving stored telemetry and system information.

> Update this document to match the actual endpoints implemented in `server.js`.

---

## Health Check

GET

```
/api/health
```

Response

```json
{
  "status":"OK"
}
```

---

## Latest Telemetry

GET

```
/api/latest
```

Returns the latest telemetry sample.

---

## Historical Telemetry

GET

```
/api/history
```

Returns previously stored telemetry.

---

## Alert History

GET

```
/api/alerts
```

Returns recorded alerts.

---

## Future APIs

Potential additions:

- Machine statistics
- OEE reports
- Alert analytics
- CSV export