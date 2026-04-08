import json
import time
import pandas as pd
from collections import deque
from sklearn.ensemble import IsolationForest
import paho.mqtt.client as mqtt

# -------------------------------------------------------------------
# CONFIGURATION
# -------------------------------------------------------------------
BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC_TELEMETRY = "griet/cnc/telemetry"
TOPIC_ALERTS = "griet/cnc/alerts"

BUFFER_SIZE = 100
data_buffer = deque(maxlen=BUFFER_SIZE)

# -------------------------------------------------------------------
# HYBRID FAULT DETECTION ENGINE
# -------------------------------------------------------------------
def check_hybrid_fault(current_point):
    reasons = []
    is_fault = False

    # --- 1. Physics Layer: Temperature ---
    temp = current_point.get('temp', 0)
    if temp > 60.0:
        reasons.append(f"Critical Overheating ({temp:.1f}°C)")
        is_fault = True
    elif temp > 45.0:
        reasons.append(f"Elevated Spindle Temp ({temp:.1f}°C)")
        is_fault = True

    # --- 2. Physics Layer: Vibration (G-Force) ---
    vx = abs(current_point.get('vibration_x', 0))
    vy = abs(current_point.get('vibration_y', 0))
    vz = abs(current_point.get('vibration_z', 0))
    max_vib = max(vx, vy, vz)

    # 1.5G+ is an absolute collision
    if max_vib > 2.5:
        axis_details = []
        if vx > 2.5: axis_details.append(f"X({vx:.1f}G)")
        if vy > 2.5: axis_details.append(f"Y({vy:.1f}G)")
        if vz > 2.5: axis_details.append(f"Z({vz:.1f}G)")
        reasons.append(f"Extreme Axis Force: {', '.join(axis_details)}")
        is_fault = True

    # 1.3G+ is dangerous tool chatter
    elif max_vib > 1.3:
        reasons.append(f"Abnormal Tool Chatter ({max_vib:.1f}G)")
        is_fault = True

    ml_score = max_vib

    # --- 3. Machine Learning Layer: Isolation Forest ---
    # ONLY run AI if we have 20 points AND the machine is actually vibrating enough to cut metal (> 0.1G)
    if len(data_buffer) >= 20 and max_vib > 0.1:
        df = pd.DataFrame(list(data_buffer))
        features = df[['temp', 'vibration_x', 'vibration_y', 'vibration_z']]

        model = IsolationForest(n_estimators=50, contamination='auto', random_state=42)
        model.fit(features)

        current_features = pd.DataFrame([[
            temp,
            current_point.get('vibration_x', 0),
            current_point.get('vibration_y', 0),
            current_point.get('vibration_z', 0)
        ]], columns=['temp', 'vibration_x', 'vibration_y', 'vibration_z'])

        prediction = model.predict(current_features)[0] # -1 = Anomaly, 1 = Normal
        ml_score = model.decision_function(current_features)[0]

    """  if prediction == -1 and ml_score < -0.1 and not is_fault:
            primary_axis = "X"
            if vy > vx and vy > vz: primary_axis = "Y"
            elif vz > vx and vz > vy: primary_axis = "Z"

            reasons.append(f"AI Signature Deviation (Primary: {primary_axis}-Axis)")
            is_fault = True"""
            
    return is_fault, " | ".join(reasons), ml_score

# -------------------------------------------------------------------
# MQTT EVENT HANDLERS
# -------------------------------------------------------------------
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        client.subscribe(TOPIC_TELEMETRY)
        print("✅ AI Node Connected to Broker")
    else:
        print(f"❌ Connection Failed with code {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())

        # CRITICAL FIX: Properly exit the function if the machine is IDLE
        if payload.get("status") == "IDLE" or payload.get("status") == "HALTED":
            return

        data_buffer.append(payload)
        is_fault, reason_text, score = check_hybrid_fault(payload)

        if is_fault:
            print(f"🚨 ALERT DETECTED: {reason_text}")
            alert_msg = {
                "type": "RED_ALERT",
                "machine": payload.get('serial_no', 'UNKNOWN'),
                "score": float(score),
                "reason": reason_text,
                "timestamp": int(time.time() * 1000)
            }
            client.publish(TOPIC_ALERTS, json.dumps(alert_msg), qos=1)

    except Exception as e:
        pass # Ignore malformed JSON

# -------------------------------------------------------------------
# MAIN STARTUP LOOP
# -------------------------------------------------------------------
if __name__ == "__main__":
    print("🧠 Starting Hybrid AI Watchdog...")
    client = mqtt.Client("cnc_ml_node_01")
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(BROKER, PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n🛑 AI Node shutting down gracefully...")