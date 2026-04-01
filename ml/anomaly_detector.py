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

# Rolling window of the last 100 data points to train/predict on
BUFFER_SIZE = 100
data_buffer = deque(maxlen=BUFFER_SIZE)

# -------------------------------------------------------------------
# MACHINE LEARNING PIPELINE
# -------------------------------------------------------------------
def check_for_anomaly(current_point):
    """
    Trains an Isolation Forest on the rolling buffer and predicts 
    if the current data point is an outlier.
    """
    if len(data_buffer) < 20:
        return False, 0.0

    try:
        # Convert buffer to a DataFrame for Scikit-Learn
        df = pd.DataFrame(list(data_buffer))
        features = df[['temp', 'vibration_x', 'vibration_y', 'vibration_z']]

        # Initialize Isolation Forest
        # n_estimators: Number of trees. 50 is fast for real-time.
        # contamination: Expected % of outliers. 0.05 = 5%.
        model = IsolationForest(n_estimators=50, contamination=0.05, random_state=42)

        # Train the model on the rolling window
        model.fit(features)

        # Prepare the current point for prediction
        current_features = pd.DataFrame([[
            current_point['temp'],
            current_point['vibration_x'],
            current_point['vibration_y'],
            current_point['vibration_z']
        ]], columns=['temp', 'vibration_x', 'vibration_y', 'vibration_z'])

        # Predict: 1 = Normal, -1 = Anomaly
        prediction = model.predict(current_features)[0]
        score = model.decision_function(current_features)[0]

        return prediction == -1, score
    except Exception as e:
        print(f"ML Processing Error: {e}")
        return False, 0.0

# -------------------------------------------------------------------
# MQTT HANDLERS
# -------------------------------------------------------------------
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ AI Node connected to {BROKER}")
        client.subscribe(TOPIC_TELEMETRY)
        print(f"🎧 Listening for telemetry on: {TOPIC_TELEMETRY}")
    else:
        print(f"❌ Failed to connect. Return code: {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())

        # Run AI check BEFORE adding to buffer to see if it's an outlier 
        # compared to previous history
        is_anomaly, score = check_for_anomaly(payload)

        # Add to rolling buffer for future training
        data_buffer.append(payload)

        if is_anomaly:
            print(f"🚨 ML ALERT! Anomaly Detected! (Score: {score:.3f}, VibX: {payload['vibration_x']})")

            # Send RED ALERT back to the ecosystem
            alert_msg = {
                "type": "RED_ALERT",
                "machine": payload.get('serial_no', 'UNKNOWN'),
                "score": float(score),
                "timestamp": int(time.time() * 1000)
            }
            client.publish(TOPIC_ALERTS, json.dumps(alert_msg), qos=1)

    except Exception as e:
        print(f"Error processing message: {e}")

# -------------------------------------------------------------------
# MAIN LOOP
# -------------------------------------------------------------------
if __name__ == "__main__":
    print("🧠 Starting Isolation Forest Anomaly Detector...")

    # For MQTT 3.1.1, we use CallbackAPIVersion.VERSION1 or just standard client
    client = mqtt.Client(client_id="cnc_ml_node_01")
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(BROKER, PORT, 60)
        # Blocks forever, processing messages as they arrive
        client.loop_forever()
    except KeyboardInterrupt:
        print("Stopping AI Node...")
        client.disconnect()