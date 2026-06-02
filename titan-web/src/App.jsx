import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws');

// The Classic Titan OS Server Icon
const ServerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="classic-logo">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
    <line x1="6" y1="6" x2="6.01" y2="6"></line>
    <line x1="6" y1="18" x2="6.01" y2="18"></line>
  </svg>
);

export default function App() {
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [plantStatus, setPlantStatus] = useState('STOPPED');
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleString());
  
  const [metrics, setMetrics] = useState({
    temperature: 0.0,
    vibration: 0.0,
    ttf_status: 151216.6,
    faults: 0
  });

  const ws = useRef(null);
  const demoIntervalRef = useRef(null);
  const stepRef = useRef(0);
  const ttfRef = useRef(151216.6);

  // Live Date Clock
  useEffect(() => {
    const clock = setInterval(() => setCurrentDate(new Date().toLocaleString()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Hybrid Initialization: Ping Cloud Database
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/status`, { timeout: 2000 });
        if (res.ok) {
          setIsLiveMode(true);
          connectWebSocket();
        } else {
          setIsLiveMode(false);
        }
      } catch (err) {
        console.warn("Cloud Database unreachable. Engaging Local Demo Simulation.");
        setIsLiveMode(false);
      }
    };
    initializeSystem();

    return () => {
      if (ws.current) ws.current.close();
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, []);

  const connectWebSocket = () => {
    ws.current = new WebSocket(WS_URL);
    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data.temperature !== 'undefined') {
          updateDashboard(
            Number(data.temperature), 
            Number(data.vibration), 
            data.ttf_status, 
            Number(data.faults),
            data.machine_id || "Unknown-Machine",
            data.error_code || "CRITICAL-FAULT"
          );
        }
      } catch (err) {
        console.warn("Invalid WebSocket payload");
      }
    };
  };

  // The Local Physics Engine (For Demo Mode)
  useEffect(() => {
    if (!isLiveMode && plantStatus === 'RUNNING') {
      demoIntervalRef.current = setInterval(() => {
        stepRef.current += 1;
        const step = stepRef.current;
        
        let temp = 85.0 + (10.0 * Math.sin(step / 50)) + (Math.random() * 4 - 2);
        let vib = 4.5 + (1.5 * Math.cos(step / 80)) + (Math.random() * 0.4 - 0.2);
        
        if (step > 0 && step % 150 === 0) temp += 40.0;
        if (step > 0 && step % 220 === 0) vib += 6.5;

        let faults = 0;
        let errorCode = "NONE";

        if (temp > 110.0) {
          faults = 1;
          errorCode = "ERR-TEMP-HIGH";
        } else if (vib > 8.5) {
          faults = 1;
          errorCode = "ERR-VIB-WARN";
        }

        const machines = ["Induction-Furnace-A", "Heavy-Extruder-B", "Stamping-Press-C", "Cooling-Tower-D"];
        const machineId = machines[Math.floor(Math.random() * machines.length)];

        if (faults === 1) {
          ttfRef.current -= (temp * 0.8) + (vib * 15.0);
        } else {
          ttfRef.current -= 1.2 + Math.random() * 0.5;
        }
        ttfRef.current = Math.max(0.0, ttfRef.current);

        updateDashboard(temp, vib, ttfRef.current, faults, machineId, errorCode);
      }, 1000);
    } else {
      clearInterval(demoIntervalRef.current);
    }
    return () => clearInterval(demoIntervalRef.current);
  }, [isLiveMode, plantStatus]);

  const updateDashboard = (temperature, vibration, ttf, faults, machineId, errorCode) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    setMetrics({ temperature, vibration, ttf_status: ttf, faults });
    
    setChartData(prev => {
      const newData = [...prev, { time: timestamp, temperature, vibration }];
      return newData.slice(-50);
    });

    if (faults > 0) {
      setAlerts(prev => {
        const newAlert = { 
          timestamp, 
          type: errorCode !== "NONE" ? errorCode : "CRITICAL FAULT", 
          details: machineId 
        };
        return [newAlert, ...prev].slice(0, 50);
      });
    }
  };

  const handleStart = async () => {
    if (isLiveMode) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/start`, { method: 'POST' });
        if (res.ok) setPlantStatus('RUNNING');
      } catch (err) { console.error("Start failed:", err); }
    } else {
      setPlantStatus('RUNNING');
    }
  };

  const handleStop = async () => {
    if (isLiveMode) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/stop`, { method: 'POST' });
        if (res.ok) setPlantStatus('STOPPED');
      } catch (err) { console.error("Stop failed:", err); }
    } else {
      setPlantStatus('STOPPED');
    }
  };

  const handlePurge = async () => {
    const confirmPurge = window.confirm("⚠️ CRITICAL ACTION: Purge database and wipe dashboard?");
    if (!confirmPurge) return;

    if (isLiveMode) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/purge`, { method: 'POST' });
        if (res.ok) resetUI();
      } catch (err) { console.error("Purge network error:", err); }
    } else {
      resetUI();
    }
  };

  const resetUI = () => {
    setChartData([]);
    setAlerts([]);
    stepRef.current = 0;
    ttfRef.current = 151216.6;
    setMetrics({ temperature: 0.0, vibration: 0.0, ttf_status: 151216.6, faults: 0 });
  };

  const handleExport = () => {
    if (!chartData || chartData.length === 0) return alert("No telemetry data to export.");
    const headers = "Time,Temperature,Vibration\n";
    const csvRows = chartData.map(row => `${row.time},${row.temperature.toFixed(2)},${row.vibration.toFixed(2)}`).join("\n");
    const blob = new Blob([headers + csvRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Titan_Data_Export_${new Date().getTime()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="app-container">
      {/* Header Section */}
      <header className="top-bar">
        <div className="logo-section">
          <div className="logo-title">
            <span className="logo-icon"><ServerIcon /></span>
            <h1>TITAN OS</h1>
          </div>
          <p>PREDICTIVE AI • INDUSTRIAL TELEMETRY</p>
          <div className="date-display">📅 {currentDate}</div>
        </div>
        
        <div className="controls-section">
          <div className={`network-badge ${isLiveMode ? 'live' : 'demo'}`}>
            <span className="dot"></span>
            {isLiveMode ? 'DATABASE: SECURE CLOUD LIVE' : 'DATABASE: LOCAL DEMO SIMULATION'}
          </div>
          
          <button className={`btn start ${plantStatus === 'RUNNING' ? 'active' : ''} ${!isLiveMode ? 'demo-btn' : ''}`} onClick={handleStart}>
            ▶ Start Plant
          </button>
          <button className={`btn stop ${plantStatus === 'STOPPED' ? 'active' : ''}`} onClick={handleStop}>
            ■ Emergency Stop
          </button>
          <button className="btn export" onClick={handleExport}>⭳ Export Data</button>
          <button className="btn purge" onClick={handlePurge}>🗑 Purge DB</button>
          
          <div className={`status-indicator ${plantStatus === 'RUNNING' ? 'running' : 'stopped'}`}>
            <span className="dot"></span> {plantStatus}
          </div>
        </div>
      </header>

      <div className="separator"></div>

      {/* Metrics Section */}
      <div className="metrics-grid">
        <div className="metric-card blue">
          <h3>LIVE TEMPERATURE</h3>
          <div className="value">{Number(metrics.temperature).toFixed(1)}<span>°C</span></div>
        </div>
        <div className="metric-card green">
          <h3>CHASSIS VIBRATION</h3>
          <div className="value">{Number(metrics.vibration).toFixed(1)}<span>mm/s</span></div>
        </div>
        <div className="metric-card yellow">
          <h3>PREDICTIVE TTF</h3>
          <div className="value ttf-display">
            {plantStatus === 'STOPPED' ? (
              <span className="status-text offline">OFFLINE</span>
            ) : metrics.ttf_status > 151000 ? (
              <span className="status-text stable">STABLE</span>
            ) : (
              <>{Number(metrics.ttf_status).toFixed(1)}<span>s</span></>
            )}
          </div>
        </div>
        <div className="metric-card red">
          <h3>ACTIVE FAULTS</h3>
          <div className="value">{alerts.length}</div>
        </div>
      </div>

      <div className="separator"></div>

      {/* Main Content Section */}
      <div className="main-content">
        <div className="chart-panel">
          <h2>Live Machine Learning Telemetry</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 12}} />
                <YAxis stroke="#64748b" tick={{fontSize: 12}} />
                <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px'}} />
                <Line type="monotone" dataKey="temperature" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="vibration" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="alerts-panel">
          <h2>Critical Alert Log</h2>
          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="no-alerts">
                <span className="icon">∿</span>
                <p>System offline or stable.</p>
              </div>
            ) : (
              alerts.map((alert, index) => (
                <div key={`${alert.timestamp}-${index}`} className="alert-card">
                  <div className="alert-info">
                    <h4>{alert.type}</h4>
                    <p>⚙ {alert.details}</p>
                  </div>
                  <div className="alert-time">{alert.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="separator"></div>

      {/* Footer Section */}
      <footer className="app-footer">
        <div className="footer-logo"><ServerIcon /></div>
        <div className="footer-text">
          <p>Titan Manufacturing Internal Engineering Tools • Advanced Data Analysis & Telemetry Layer</p>
          <p className="footer-subtext">
            {isLiveMode ? '✅ Connect to Cloud Database Aiven MySQL • Port 5000 Active' : '⚠️ Cloud Database Offline • Running local browser simulation fallback'}
          </p>
        </div>
        <div className="footer-copyright">
          <p>&copy; {new Date().getFullYear()} Titan OS Architecture. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}