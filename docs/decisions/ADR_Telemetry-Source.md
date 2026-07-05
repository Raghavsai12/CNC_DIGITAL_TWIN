# ADR-001: Telemetry Source Strategy

## Status

Accepted

---

## Context

The project originally began as a hardware prototype using an ESP32, ADXL345 accelerometer, and DS18B20 temperature sensor.

While the prototype validated sensor acquisition and MQTT communication, continuous access to an industrial CNC laser cutting machine was not available.

A repeatable telemetry source was therefore required for software development and testing.

---

## Decision

The project uses an Industrial Telemetry Simulator that replays representative CNC telemetry from a CSV dataset.

The simulator publishes telemetry using the same MQTT topic and message structure expected from a physical machine.

---

## Consequences

### Advantages

- Repeatable testing
- No hardware dependency
- Consistent machine learning evaluation
- Easier debugging
- Faster development
- Reproducible demonstrations

### Trade-offs

- Does not capture live hardware variability
- Dataset quality determines simulation quality
- Hardware integration must be validated separately

---

## Future Direction

The simulator can be replaced by a live telemetry publisher without changing the backend, AI Watchdog, or dashboard because all components communicate through MQTT.