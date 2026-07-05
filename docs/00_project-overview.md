# CNC Digital Twin

## Overview

The CNC Digital Twin is a full-stack Industrial IoT (IIoT) application that demonstrates real-time telemetry processing, hybrid anomaly detection, and predictive maintenance for a CNC laser cutting machine.

Rather than relying on continuous access to industrial hardware, the project uses a telemetry replay engine that streams representative CNC machine data through an MQTT broker. This enables repeatable testing of the complete software stack, including the backend services, database, machine learning pipeline, and web dashboard.

The project combines cloud technologies, machine learning, and real-time communication to simulate how industrial monitoring systems operate.

---

# Why This Project?

Industrial CNC laser machines continuously generate telemetry such as:

- Temperature
- Head acceleration
- Assist gas pressure
- Machine status
- Production metrics

Monitoring this telemetry enables predictive maintenance by identifying abnormal operating conditions before machine failures occur.

This project demonstrates how such telemetry can be processed and visualized using a modern cloud-native architecture.

---

# Project Evolution

## Phase 1 — Hardware Prototype

The project initially began as an embedded systems prototype using:

- ESP32
- ADXL345 Accelerometer
- DS18B20 Temperature Sensor

The objective was to validate:

- Sensor acquisition
- MQTT communication
- End-to-end telemetry streaming

Once the communication pipeline was verified, the hardware prototype was no longer used in the main application.

---

## Phase 2 — Industrial Telemetry Simulation

Since continuous access to an industrial CNC laser cutting machine was not available, the project evolved into a software-based Digital Twin.

A telemetry replay engine streams representative CNC telemetry from a dataset using the same MQTT communication pattern that would be used by a physical machine.

This allows the entire software system to operate without requiring physical hardware.

---

# Runtime Architecture

The production workflow consists of six major components.

```text
Industrial Telemetry Dataset
            │
            ▼
Telemetry Replay Engine
            │
            ▼
     HiveMQ MQTT Broker
      │             │
      ▼             ▼
Node.js Backend   Hybrid AI Watchdog
      │             │
      ▼             ▼
 MongoDB Atlas     Alert Publisher
      │             │
      └──────┬──────┘
             ▼
      React Dashboard
```

---

# Core Features

- Real-time telemetry streaming
- MQTT-based messaging
- MongoDB telemetry storage
- Live dashboard updates using Socket.IO
- Hybrid anomaly detection
- Rule-based safety monitoring
- Isolation Forest anomaly detection
- Machine health monitoring
- Dataset replay for repeatable testing

---

# Technology Stack

## Frontend

- React
- TypeScript
- Tailwind CSS
- Recharts

## Backend

- Node.js
- Express
- Socket.IO
- MQTT.js

## Machine Learning

- Python
- Scikit-learn
- Pandas
- NumPy

## Database

- MongoDB Atlas

## Messaging

- HiveMQ MQTT Broker

---

# Project Objectives

This project demonstrates:

- Industrial IoT communication
- Distributed system architecture
- Event-driven messaging
- Cloud-connected backend services
- Machine learning for predictive maintenance
- Digital Twin visualization
- Full-stack software engineering