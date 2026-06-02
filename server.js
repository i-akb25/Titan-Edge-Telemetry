require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

let plantStatus = 'STOPPED';

const dbUri = process.env.DATABASE_URL;
if (!dbUri) {
  console.error('Critical Error: DATABASE_URL variable is missing.');
  process.exit(1);
}

const pool = mysql.createPool({
  uri: dbUri,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to Secure Database Cluster.');
    connection.release();
  }
});

let activeClients = new Set();
wss.on('connection', (ws) => {
  activeClients.add(ws);
  ws.on('close', () => activeClients.delete(ws));
});

const broadcastTelemetry = (data) => {
  const payload = JSON.stringify(data);
  activeClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
};

app.post('/api/telemetry/ingest', (req, res) => {
  if (plantStatus !== 'RUNNING') {
    return res.status(403).json({ error: 'Ingestion blocked: Plant is STOPPED.' });
  }

  // 1. Extract ALL data points from the Python Hardware Node
  const { 
    machine_id, temperature, vibration, voltage, current, 
    power_consumption_kw, faults, error_code, ttf_status 
  } = req.body;

  // 2. Build the complete telemetry frame
  const telemetryFrame = {
    machine_id: machine_id || "Unknown-Machine",
    temperature: parseFloat(temperature) || 0.0,
    vibration: parseFloat(vibration) || 0.0,
    voltage: parseFloat(voltage) || 0.0,
    current: parseFloat(current) || 0.0,
    power_consumption_kw: parseFloat(power_consumption_kw) || 0.0,
    faults: parseInt(faults) || 0,
    error_code: error_code || "NONE",
    ttf_status: ttf_status || 'STABLE'
  };

  // 3. Broadcast full frame to React UI (fixes the Unknown-Machine bug)
  broadcastTelemetry(telemetryFrame);

  // 4. Log the full electrical and mechanical profile to Cloud MySQL
  const query = `
    INSERT INTO telemetry_logs 
    (machine_id, temperature, vibration, voltage, current, power_consumption_kw, faults, error_code, ttf_status, timestamp) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  
  const values = [
    telemetryFrame.machine_id, 
    telemetryFrame.temperature, 
    telemetryFrame.vibration, 
    telemetryFrame.voltage, 
    telemetryFrame.current, 
    telemetryFrame.power_consumption_kw, 
    telemetryFrame.faults, 
    telemetryFrame.error_code, 
    telemetryFrame.ttf_status
  ];

  pool.query(query, values, (err) => {
    if (err) console.error('Database write fault:', err.message);
  });

  return res.status(201).json({ status: 'SUCCESS', frame: telemetryFrame });
});

app.get('/api/status', (req, res) => {
  return res.json({ status: plantStatus });
});

app.post('/api/start', (req, res) => {
  plantStatus = 'RUNNING';
  console.log('System Control: PLANT STARTED');
  return res.status(200).json({ status: plantStatus });
});

app.post('/api/stop', (req, res) => {
  plantStatus = 'STOPPED';
  console.log('System Control: EMERGENCY STOP ACTIVATED');
  return res.status(200).json({ status: plantStatus });
});

app.post('/api/purge', (req, res) => {
  const query = 'TRUNCATE TABLE telemetry_logs';
  pool.query(query, (err) => {
    if (err) {
      console.error('Purge error:', err.message);
      return res.status(500).json({ error: 'Purge operation rejected' });
    }
    return res.status(200).json({ status: 'PURGED' });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server operational on port ${PORT}`);
});