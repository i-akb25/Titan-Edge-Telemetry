import random
import math

MACHINES = [
    "Induction-Furnace-A",
    "Heavy-Extruder-B",
    "Stamping-Press-C",
    "Cooling-Tower-D",
]

current_ttf = random.uniform(108000.0, 180000.0)

def generate_frame(step_index):
    global current_ttf

    base_temp = 85.0 + (10.0 * math.sin(step_index / 50))
    base_vib = 4.5 + (1.5 * math.cos(step_index / 80))

    temperature = random.normalvariate(base_temp, 5.0)
    vibration = random.normalvariate(base_vib, 0.5)
    voltage = random.normalvariate(415.0, 3.0)
    current = random.normalvariate(120.0, 10.0)

    if step_index > 0 and step_index % 150 == 0:
        current += 80.0
        temperature += 40.0

    if step_index > 0 and step_index % 220 == 0:
        vibration += 6.5

    if temperature > 110.0:
        faults = 1
        error_code = "ERR-TEMP-HIGH"
    elif vibration > 8.5:
        faults = 1
        error_code = "ERR-VIB-WARN"
    elif voltage < 390.0:
        faults = 1
        error_code = "ERR-VOLT-DROP"
    else:
        faults = 0
        error_code = "NONE"

    power_kw = (voltage * current * 1.732 * 0.85) / 1000

    if faults == 1:
        current_ttf -= (temperature * 0.8) + (vibration * 15.0)
    else:
        current_ttf -= 1.2 + random.uniform(0, 0.5)

    current_ttf = max(0.0, current_ttf)

    return {
        "machine_id": random.choice(MACHINES),
        "temperature": round(temperature, 2),
        "vibration": round(vibration, 2),
        "voltage": round(voltage, 2),
        "current": round(current, 2),
        "power_consumption_kw": round(power_kw, 2),
        "faults": faults,
        "error_code": error_code,
        "ttf_status": round(current_ttf, 1),
    }