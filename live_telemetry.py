import os
import sys
import time
import requests
from dotenv import load_dotenv
import telemetry_simulator

load_dotenv()

env_url = os.getenv("API_URL", "http://localhost:5000/api/telemetry/ingest")
BASE_URL = env_url.split("/api/")[0]

STATUS_ENDPOINT = f"{BASE_URL}/api/status"
INGEST_ENDPOINT = f"{BASE_URL}/api/telemetry/ingest"

def run_live_stream():
    print("Initializing Titan OS Closed-Loop Hardware Simulation Engine...")
    step = 0

    while True:
        try:
            try:
                status_check = requests.get(STATUS_ENDPOINT, timeout=3).json()
                current_state = status_check.get("status", "STOPPED")
            except Exception:
                print("Communication network offline. Retrying link...")
                time.sleep(2)
                continue

            if current_state != "RUNNING":
                print("Plant status: IDLE. Waiting for operator input...")
                time.sleep(1)
                continue

            payload = telemetry_simulator.generate_frame(step)
            try:
                response = requests.post(INGEST_ENDPOINT, json=payload, timeout=3)
                if response.status_code == 201:
                    print(f"Live Streaming Data [Frame {step}]: Temp={payload['temperature']}°C | Vib={payload['vibration']}mm/s")
                    step += 1
                else:
                    print(f"Cloud Bus Rejection: HTTP {response.status_code}")
            except requests.exceptions.RequestException as network_error:
                print(f"Network Transport Failure: {network_error}")

            sys.stdout.flush()
            time.sleep(1)

        except KeyboardInterrupt:
            print("\nHardware Simulation terminated by operator.")
            break

if __name__ == "__main__":
    run_live_stream()