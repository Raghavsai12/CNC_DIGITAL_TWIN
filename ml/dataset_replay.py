import csv
import datetime
import time
import json
import paho.mqtt.client as mqtt

# CONFIGURATION
BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC_TELEMETRY = "griet/cnc/telemetry"
# UPDATED: Point to the new dataset file
DATASET_FILE = "laser_telemetry_dataset.csv"

def replay_dataset():
    client = mqtt.Client("dataset_replayer_01")
    print(f"Connecting to {BROKER}...")
    client.connect(BROKER, PORT, 60)

    print(f"Opening dataset: {DATASET_FILE}")
    with open(DATASET_FILE, 'r') as f:
        reader = csv.DictReader(f)

        for row in reader:
            timestamp_ms = int(time.time() * 1000)

            payload = {
                "serial_no": row['serial_no'],
                "status": row['status'],
                "temp": float(row['temp']),
                "accel_x": float(row['accel_x']),
                "accel_y": float(row['accel_y']),
                "air_gas": float(row['air_gas']),
                "timestamp": datetime.datetime.now().isoformat()
            }

            # Publish exactly like the physical ESP32
            client.publish(TOPIC_TELEMETRY, json.dumps(payload))

            # UPDATED: Fixed the print statement to show Accel and Gas
            print(f"[{row['row_id']}/1000] Temp:{payload['temp']}C | Accel-X:{payload['accel_x']} Y:{payload['accel_y']} | Gas:{payload['air_gas']} Bar | {payload['status']}")

            # Wait 500ms before sending the next row (mimicking the real 2Hz sample rate)
            time.sleep(0.5)

    print("\n✅ Dataset replay complete! Machine cycle finished.")
    client.disconnect()

if __name__ == "__main__":
    replay_dataset()