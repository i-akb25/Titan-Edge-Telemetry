const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- DATABASE CONNECTION (Dynamically loaded from Docker or Local) ---
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3308,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Saurabh@845438',
    database: process.env.DB_NAME || 'titan_manufacturing',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let pythonProcess = null;

function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// --- HARDWARE PROCESS CONTROL ---
app.post('/api/control/start', (req, res) => {
    if (pythonProcess) {
        return res.status(400).json({ status: 'running', message: 'Engine is already running.' });
    }
    
    // Cross-platform Python execution
    const pythonExecutable = process.env.PYTHON_CMD || path.join(__dirname, '.venv', 'Scripts', 'python.exe');
    const pythonScript = process.env.OS_ENV === 'linux' ? 'live_telemetry.py' : path.join(__dirname, 'live_telemetry.py');
    
    pythonProcess = spawn(pythonExecutable, [pythonScript], { 
        cwd: __dirname,
        windowsHide: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    
    pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line) => {
            if (!line.trim()) return;
            try {
                const parsedData = JSON.parse(line);
                broadcast({ type: 'TELEMETRY_UPDATE', data: parsedData });

                const query = `INSERT INTO telemetry_logs 
                    (Timestamp, Vibration, Temperature, Fault_Occurred, Time_To_Failure) 
                    VALUES (?, ?, ?, ?, ?)`;
                
                db.query(query, [
                    parsedData.Timestamp,
                    parsedData.Vibration,
                    parsedData.Temperature,
                    parsedData.Fault_Occurred,
                    parsedData.Time_To_Failure
                ], (err) => {
                    if (err) console.error("DB Insert Error:", err);
                });

            } catch (e) {
                console.log(`Engine Output: ${line}`);
            }
        });
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Engine Error: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
        console.log(`Python engine stopped with code ${code}`);
        pythonProcess = null; 
        broadcast({ type: 'ENGINE_STATUS', status: 'stopped' });
    });

    broadcast({ type: 'ENGINE_STATUS', status: 'running' });
    res.json({ status: 'running', message: 'Titan Engine Started.' });
});

app.post('/api/control/stop', (req, res) => {
    if (!pythonProcess) {
        return res.status(400).json({ status: 'stopped', message: 'Engine is already stopped.' });
    }
    
    // Cross-platform Process Killing
    if (process.env.OS_ENV === 'linux') {
        pythonProcess.kill('SIGKILL');
        pythonProcess = null;
        broadcast({ type: 'ENGINE_STATUS', status: 'stopped' });
        res.json({ status: 'stopped', message: 'Titan Engine Shut Down.' });
    } else {
        exec(`taskkill /pid ${pythonProcess.pid} /t /f`, (err) => {
            if (err) console.error(`Failed to kill process: ${err}`);
            pythonProcess = null;
            broadcast({ type: 'ENGINE_STATUS', status: 'stopped' });
            res.json({ status: 'stopped', message: 'Titan Engine Shut Down forcefully.' });
        });
    }
});

app.get('/api/control/status', (req, res) => {
    res.json({ status: pythonProcess ? 'running' : 'stopped' });
});

app.post('/api/control/purge', (req, res) => {
    const query = 'TRUNCATE TABLE telemetry_logs';
    db.query(query, (err) => {
        if (err) return res.status(500).json({ error: "Failed to purge database" });
        res.json({ status: 'purged', message: 'Database wiped clean.' });
    });
});

app.get('/api/telemetry/latest', (req, res) => {
    const query = 'SELECT * FROM telemetry_logs ORDER BY Timestamp DESC LIMIT 30';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results.reverse());
    });
});

app.get('/api/telemetry/faults', (req, res) => {
    const query = 'SELECT * FROM telemetry_logs WHERE Fault_Occurred = 1 ORDER BY Timestamp DESC LIMIT 50';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'ENGINE_STATUS', status: pythonProcess ? 'running' : 'stopped' }));
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`📡 Titan Server running on http://localhost:${PORT}`);
});