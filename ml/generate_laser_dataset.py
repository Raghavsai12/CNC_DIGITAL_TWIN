import csv
import random

def generate_laser_dataset(num_samples=1500, anomaly_ratio=0.06):
    print(f"Generating {num_samples} samples for Laser CNC Twin...")
    data = []

    # CSV Header matching the new Laser project parameters
    data.append(['row_id', 'serial_no', 'status', 'temp', 'accel_x', 'accel_y', 'air_gas'])

    fault_count = 0
    for i in range(num_samples):
        # Decide if this row is normal or an anomaly
        is_anomaly = random.random() < anomaly_ratio

        if not is_anomaly:
            status = 'RUNNING'
            # Normal operating parameters
            temp = random.gauss(25.0, 2.0) # 23-27 C (Chiller is working)
            accel_x = random.gauss(0.0, 0.4) # Smooth laser head motion
            accel_y = random.gauss(0.0, 0.4) # Smooth laser head motion
            air_gas = random.gauss(0.8, 0.05) # Steady gas pressure ~0.8 Bar
        else:
            status = 'FAULT'
            fault_count += 1
            # Randomly pick the type of fault to make the AI smarter
            anomaly_type = random.choice(['motion_crash', 'gas_drop', 'overheat'])

            if anomaly_type == 'motion_crash':
                temp = random.gauss(26.0, 2.0)
                accel_x = random.gauss(0.0, 2.5) # High G-forces (belt slip/crash)
                accel_y = random.gauss(0.0, 2.5)
                air_gas = random.gauss(0.8, 0.05)
            elif anomaly_type == 'gas_drop':
                temp = random.gauss(26.0, 2.0)
                accel_x = random.gauss(0.0, 0.5)
                accel_y = random.gauss(0.0, 0.5)
                air_gas = random.gauss(0.3, 0.1) # Low pressure (compressor failed)
            elif anomaly_type == 'overheat':
                temp = random.gauss(55.0, 5.0) # High temp (chiller failed)
                accel_x = random.gauss(0.0, 0.5)
                accel_y = random.gauss(0.0, 0.5)
                air_gas = random.gauss(0.8, 0.05)

        # Safeguards to keep data realistic
        temp = max(18.0, temp)
        air_gas = max(0.0, air_gas)

        data.append([
            i,
            'LASER-HARDWARE-01',
            status,
            round(temp, 2),
            round(accel_x, 3),
            round(accel_y, 3),
            round(air_gas, 2)
        ])

    filename = 'laser_telemetry_dataset.csv'
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(data)

    print(f"✅ Successfully generated {filename} with {fault_count} anomalies.")

if __name__ == "__main__":
    # Generate 1500 rows of data
    generate_laser_dataset(num_samples=1500, anomaly_ratio=0.06)