# Sequence Diagram

This document illustrates how telemetry flows through the complete system.

---

```mermaid
sequenceDiagram

participant Dataset
participant Simulator
participant MQTT
participant Backend
participant MongoDB
participant AI
participant Dashboard

Dataset->>Simulator: Read next telemetry record

Simulator->>MQTT: Publish telemetry

MQTT->>Backend: Deliver telemetry

MQTT->>AI: Deliver telemetry

Backend->>MongoDB: Store telemetry

Backend->>Dashboard: Socket.IO update

AI->>AI: Rule Evaluation

AI->>AI: Isolation Forest Prediction

alt Fault Detected

AI->>MQTT: Publish RED_ALERT

MQTT->>Dashboard: Deliver Alert

else Normal Operation

AI-->>AI: Wait for next message

end
```

---

# Sequence Description

1. The simulator reads the next telemetry record.

2. The telemetry record is published to HiveMQ.

3. Both the backend and AI Watchdog receive the message.

4. The backend stores telemetry in MongoDB.

5. Socket.IO immediately pushes live updates to the dashboard.

6. The AI Watchdog evaluates rule-based thresholds.

7. If enough samples exist, Isolation Forest evaluates the current record.

8. If an anomaly is detected, a RED_ALERT is published.

9. The dashboard immediately displays the alert.