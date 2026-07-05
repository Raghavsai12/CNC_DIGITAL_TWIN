# 📚 CNC Digital Twin Documentation

Welcome to the technical documentation for the **CNC Digital Twin** project.

This documentation provides a detailed explanation of the system architecture, backend design, data flow, AI pipeline, deployment strategy, APIs, and key engineering decisions.

If you're new to the project, start with the **Project Overview** and continue through the documents in order.

---

# 📖 Documentation Guide

## Project Overview

| Document | Description |
|----------|-------------|
| [Project Overview](project-overview.md) | Introduction, project motivation, goals, and evolution. |

---

## 🏗 Architecture

Read these documents in order.

| Step | Document | Description |
|------|----------|-------------|
| 1 | [System Architecture](architecture/system-architecture.md) | High-level view of the complete system. |
| 2 | [Component Architecture](architecture/component-architecture.md) | Responsibilities of each major software component. |
| 3 | [Data Flow](architecture/data-flow.md) | End-to-end telemetry flow through the system. |
| 4 | [Backend Architecture](architecture/backend-architecture.md) | Node.js backend responsibilities and communication flow. |
| 5 | [Hybrid AI Watchdog](architecture/ml-pipeline.md) | Rule-based safety engine and Isolation Forest anomaly detection. |
| 6 | [Deployment Architecture](architecture/deployment.md) | Cloud deployment and infrastructure overview. |
| 7 | [Sequence Diagram](architecture/sequence-diagram.md) | Runtime interactions between system components. |

---

## 🔌 API Documentation

| Document | Description |
|----------|-------------|
| [API Reference](api/api-reference.md) | Backend REST endpoints and expected responses. |

---

## 📝 Architecture Decision Records (ADR)

| Document | Description |
|----------|-------------|
| [ADR-001 – Telemetry Source Strategy](decisions/ADR-001-Telemetry-Source.md) | Why the project uses an Industrial Telemetry Simulator instead of live hardware. |

---

# 📂 Documentation Structure

```text
docs/
│
├── README.md
│
├── architecture/
│   ├── system-architecture.md
│   ├── component-architecture.md
│   ├── data-flow.md
│   ├── backend-architecture.md
│   ├── ml-pipeline.md
│   ├── deployment.md
│   └── sequence-diagram.md
│
├── api/
│   └── api-reference.md
│
└── decisions/
    └── ADR-001-Telemetry-Source.md
```

---

# 🎯 Purpose of This Documentation

This documentation is intended to help:

- Recruiters understand the project architecture.
- Interviewers evaluate technical decisions.
- Developers understand the system quickly.
- Contributors navigate the codebase.
- Future maintainers extend the project confidently.

---

# 🚀 Recommended Reading Order

1. Project Overview
2. System Architecture
3. Component Architecture
4. Data Flow
5. Backend Architecture
6. Hybrid AI Watchdog
7. Deployment Architecture
8. Sequence Diagram
9. API Reference
10. Architecture Decision Records