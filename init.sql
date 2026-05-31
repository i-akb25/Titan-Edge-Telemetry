CREATE DATABASE IF NOT EXISTS titan_manufacturing;
USE titan_manufacturing;

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Timestamp VARCHAR(255),
    Vibration FLOAT,
    Temperature FLOAT,
    Fault_Occurred INT,
    Time_To_Failure FLOAT
);