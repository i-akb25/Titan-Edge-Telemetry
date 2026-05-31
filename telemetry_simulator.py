import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# 1. Configuration & Setup
np.random.seed(42) # For reproducible results
num_records = 5000 # Generating 5000 data points

# Hypothetical Heavy Machinery
machines = ['Induction-Furnace-A', 'Heavy-Extruder-B', 'Stamping-Press-C', 'Cooling-Tower-D']

# Start time: 7 days ago, logging data every 2 minutes
start_time = datetime.now() - timedelta(days=7)
timestamps = [start_time + timedelta(minutes=2 * i) for i in range(num_records)]
machine_ids = np.random.choice(machines, num_records)

# 2. Simulate Baseline Sensor Readings
# Normal operating ranges for heavy equipment
temperature = np.random.normal(loc=85.0, scale=10.0, size=num_records) # Celsius
vibration = np.random.normal(loc=4.5, scale=0.8, size=num_records)     # mm/s
voltage = np.random.normal(loc=415.0, scale=5.0, size=num_records)     # 3-Phase Voltage
current = np.random.normal(loc=120.0, scale=15.0, size=num_records)    # Amps

# 3. Inject Realistic Anomalies and Faults
fault_status = []
error_codes = []

for i in range(num_records):
    # Simulate a current spike causing an overheating fault
    if i % 150 == 0: 
        current[i] += 80.0
        temperature[i] += 40.0
        
    # Simulate a mechanical imbalance (high vibration)
    if i % 220 == 0:
        vibration[i] += 6.5

    # Determine Fault Status based on thresholds
    if temperature[i] > 110.0:
        fault_status.append(1)
        error_codes.append('ERR-TEMP-HIGH')
    elif vibration[i] > 8.5:
        fault_status.append(1)
        error_codes.append('ERR-VIB-WARN')
    elif voltage[i] < 390.0:
        fault_status.append(1)
        error_codes.append('ERR-VOLT-DROP')
    else:
        fault_status.append(0)
        error_codes.append('NONE')

# Calculate Power (P = V * I * sqrt(3) * PowerFactor) - assuming PF of 0.85
power_kw = (voltage * current * 1.732 * 0.85) / 1000

# 4. Compile into a DataFrame
df = pd.DataFrame({
    'Timestamp': timestamps,
    'Machine_ID': machine_ids,
    'Temperature_C': np.round(temperature, 2),
    'Vibration_mm_s': np.round(vibration, 2),
    'Voltage_V': np.round(voltage, 2),
    'Current_A': np.round(current, 2),
    'Power_Consumption_kW': np.round(power_kw, 2),
    'Fault_Occurred': fault_status,
    'Error_Code': error_codes
})

# 5. Export the Data
filename = 'titan_plant_telemetry.csv'
df.to_csv(filename, index=False)
print(f"Success! {num_records} sensor logs generated and saved to {filename}")