import pandas as pd
from sqlalchemy import create_engine
from urllib.parse import quote_plus

# 1. Database Configuration
db_user = 'root'
db_password = 'Saurabh@845438'
db_host = 'localhost:3308'
db_name = 'titan_manufacturing'

# URL-encode the password to safely handle the '@' symbol
encoded_password = quote_plus(db_password)

# 2. Create the connection engine
engine = create_engine(f'mysql+pymysql://{db_user}:{encoded_password}@{db_host}/{db_name}')

def load_data():
    try:
        print("Reading the CSV file...")
        # Load the data generated from Step 1
        df = pd.read_csv('titan_plant_telemetry.csv')
        
        # Ensure timestamp is treated as a datetime object
        df['Timestamp'] = pd.to_datetime(df['Timestamp'])
        
        print("Pushing data to MySQL. Please wait...")
        # 3. Push data to MySQL
        df.to_sql(name='telemetry_logs', con=engine, if_exists='replace', index=False)
        
        print(f"Success! {len(df)} rows loaded into the 'telemetry_logs' table.")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    load_data()