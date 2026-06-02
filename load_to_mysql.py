import os
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import telemetry_simulator

load_dotenv()

db_url = os.getenv('DATABASE_URL')
if not db_url:
    print("Error: DATABASE_URL variable is missing from .env")
    exit(1)

if db_url.startswith('mysql://'):
    db_url = db_url.replace('mysql://', 'mysql+pymysql://', 1)

if '?ssl-mode=' in db_url:
    db_url = db_url.split('?ssl-mode=')[0]
elif '&ssl-mode=' in db_url:
    db_url = db_url.split('&ssl-mode=')[0]

if "localhost" in db_url:
    engine = create_engine(db_url)
else:
    engine = create_engine(db_url, connect_args={"ssl": {}})

def setup_database():
    try:
        print("Generating 1000 frames of historical machine telemetry...")
        records = []
        start_time = datetime.now() - timedelta(minutes=1000)
        
        for i in range(1000):
            frame = telemetry_simulator.generate_frame(i)
            frame['timestamp'] = start_time + timedelta(minutes=1) * i
            records.append(frame)

        df = pd.DataFrame(records)

        with engine.begin() as connection:
            print("Purging existing schema...")
            connection.execute(text("DROP TABLE IF EXISTS telemetry_logs;"))
            
            print("Building strict cloud-compliant table structure...")
            create_table_query = """
            CREATE TABLE telemetry_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME NOT NULL,
                machine_id VARCHAR(100),
                temperature DOUBLE NOT NULL,
                vibration DOUBLE NOT NULL,
                voltage DOUBLE,
                current DOUBLE,
                power_consumption_kw DOUBLE,
                faults INT DEFAULT 0,
                error_code VARCHAR(50),
                ttf_status DOUBLE
            );
            """
            connection.execute(text(create_table_query))

        print("Streaming historical matrix to Secure Database Cluster...")
        df.to_sql(name='telemetry_logs', con=engine, if_exists='append', index=False)
        print(f"Success! {len(df)} rows securely registered.")

    except Exception as e:
        print(f"Database operation failed: {e}")

if __name__ == "__main__":
    setup_database()