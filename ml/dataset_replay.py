import csv
import time
import json
import paho.mqtt.client as mqtt

# CONFIGURATION
BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC_TELEMETRY = "griet/cnc/telemetry"
DATASET_FILE = "cnc_telemetry_dataset.csv"

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
                "vibration_x": float(row['vibration_x']),
                "vibration_y": float(row['vibration_y']),
                "vibration_z": float(row['vibration_z']),
                "timestamp": timestamp_ms
            }
            
            # Publish exactly like the physical ESP32
            client.publish(TOPIC_TELEMETRY, json.dumps(payload))
            
            print(f"[{row['row_id']}/3600] Temp:{payload['temp']}C | X:{payload['vibration_x']} Y:{payload['vibration_y']} Z:{payload['vibration_z']} | {payload['status']}")            
            # Wait 500ms before sending the next row (mimicking the real 2Hz sample rate)
            time.sleep(0.5)
            
    print("\n✅ Dataset replay complete! Machine cycle finished.")
    client.disconnect()

if __name__ == "__main__":
    replay_dataset()
