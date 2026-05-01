import json
import time
import pandas as pd
from collections import deque
from sklearn.ensemble import IsolationForest
import paho.mqtt.client as mqtt

# CONFIGURATION
BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC_TELEMETRY = "griet/cnc/telemetry"
TOPIC_ALERTS = "griet/cnc/alerts"

BUFFER_SIZE = 100
data_buffer = deque(maxlen=BUFFER_SIZE)

def check_hybrid_fault(current_point):
    reasons = []
    is_fault = False

    # 1. Temperature Thresholds (Laser Chiller Loop)
    temp = current_point.get('temp', 0)
    if temp > 50.0:
        reasons.append(f"Critical Laser Overheating ({temp:.1f}°C)")
        is_fault = True
    elif temp > 45.0:
        reasons.append(f"Elevated Chiller Temp ({temp:.1f}°C)")
        is_fault = True

    # 2. Acceleration Thresholds (Head motion crash)
    ax = abs(current_point.get('accel_x', 0))
    ay = abs(current_point.get('accel_y', 0))
    max_accel = max(ax, ay)

    # 1.8G+ is considered a violent crash or belt slip for the laser
    if max_accel > 1.8:
        axis_details = []
        if ax > 1.8: axis_details.append(f"X({ax:.1f}G)")
        if ay > 1.8: axis_details.append(f"Y({ay:.1f}G)")
        reasons.append(f"Violent Head Acceleration: {', '.join(axis_details)}")
        is_fault = True

    # 3. Air Gas Pressure Thresholds (Assist Gas)
    gas = current_point.get('air_gas', 0.8)
    if gas < 0.6:
        reasons.append(f"Assist Gas Pressure Drop ({gas:.2f} MPa)")
        is_fault = True
    elif gas > 1.2:
        reasons.append(f"Assist Gas Overpressure ({gas:.2f} MPa)")
        is_fault = True

    ml_score = max_accel

    # 4. Machine Learning Layer: Isolation Forest
    if len(data_buffer) >= 20 and (max_accel > 0.1 or temp > 20):
        df = pd.DataFrame(list(data_buffer))
        features = df[['temp', 'accel_x', 'accel_y', 'air_gas']]

        model = IsolationForest(n_estimators=50, contamination='auto', random_state=42)
        model.fit(features)

        current_features = pd.DataFrame([[
            temp,
            current_point.get('accel_x', 0),
            current_point.get('accel_y', 0),
            current_point.get('air_gas', 0.8)
        ]], columns=['temp', 'accel_x', 'accel_y', 'air_gas'])

        prediction = model.predict(current_features)[0] # -1 = Anomaly, 1 = Normal
        ml_score = model.decision_function(current_features)[0]

        # If the ML model flags it as an anomaly but the hard limits haven't tripped yet
        if prediction == -1 and ml_score < -0.1 and not is_fault:
            reasons.append("AI Detected Kinematic/Gas Deviation")
            is_fault = True

    return is_fault, " | ".join(reasons), ml_score


# MQTT EVENT HANDLERS
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        client.subscribe(TOPIC_TELEMETRY)
        print("✅ Laser AI Watchdog Connected to Broker")
    else:
        print(f"❌ Connection Failed with code {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        if payload.get("status") == "IDLE" or payload.get("status") == "HALTED":
            return

        data_buffer.append(payload)
        is_fault, reason_text, score = check_hybrid_fault(payload)

        if is_fault:
            print(f"🚨 ALERT DETECTED: {reason_text}")
            alert_msg = {
                "type": "RED_ALERT",
                "machine": payload.get('serial_no', 'LASER-001'),
                "score": float(score),
                "reason": reason_text,
                "timestamp": int(time.time() * 1000)
            }
            client.publish(TOPIC_ALERTS, json.dumps(alert_msg), qos=1)

    except Exception as e:
        # Silently pass errors so the watchdog doesn't crash on bad JSON
        pass

if __name__ == "__main__":
    print("Starting Laser Hybrid AI Watchdog...")
    client = mqtt.Client("laser_ml_node_01")
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(BROKER, PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n AI Node shutting down gracefully...")