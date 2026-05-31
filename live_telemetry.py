import sys
import time
import json
import random
from datetime import datetime

class PredictiveEngine:
    def __init__(self, window_size=10):
        self.window_size = window_size
        self.temp_history = []
        self.time_history = []
        self.temp_limit = 95.0

    def update_and_predict(self, current_temp):
        current_time = time.time()
        self.temp_history.append(current_temp)
        self.time_history.append(current_time)
        
        if len(self.temp_history) > self.window_size:
            self.temp_history.pop(0)
            self.time_history.pop(0)
            
        if len(self.temp_history) < 5:
            return -1
            
        n = len(self.temp_history)
        sum_x = sum(self.time_history)
        sum_y = sum(self.temp_history)
        sum_xx = sum(x*x for x in self.time_history)
        sum_xy = sum(x*y for x, y in zip(self.time_history, self.temp_history))
        
        denominator = (n * sum_xx) - (sum_x ** 2)
        if denominator == 0:
            return -1
            
        slope = ((n * sum_xy) - (sum_x * sum_y)) / denominator
        
        if slope <= 0:
            return -1
            
        ttf = (self.temp_limit - current_temp) / slope
        return max(0, round(ttf, 1))

def generate_telemetry():
    engine = PredictiveEngine()
    base_temp = 65.0
    thermal_runaway = False
    runaway_counter = 0

    while True:
        try:
            if not thermal_runaway and random.random() < 0.03:
                thermal_runaway = True
                runaway_counter = 0

            if thermal_runaway:
                base_temp += random.uniform(1.5, 3.5)
                runaway_counter += 1
                if base_temp >= 98.0 or runaway_counter > 15:
                    thermal_runaway = False
            else:
                base_temp += random.uniform(-0.8, 0.8)
                base_temp = max(60.0, min(72.0, base_temp))

            vibration = random.uniform(2.0, 4.5) if not thermal_runaway else random.uniform(4.5, 8.5)
            current_temp = round(base_temp, 2)
            fault_occurred = 1 if current_temp >= 95.0 else 0
            ttf_prediction = engine.update_and_predict(current_temp)

            payload = {
                "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "Vibration": round(vibration, 2),
                "Temperature": current_temp,
                "Fault_Occurred": fault_occurred,
                "Time_To_Failure": ttf_prediction
            }

            print(json.dumps(payload))
            sys.stdout.flush()
            time.sleep(1)

        except KeyboardInterrupt:
            break

if __name__ == "__main__":
    generate_telemetry()