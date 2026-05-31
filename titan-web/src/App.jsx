import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Thermometer, Activity, Server, Cpu, Play, Square, Download, Trash2, Timer } from 'lucide-react';
import './App.css'; // Importing the separated styles

const App = () => {
  const [telemetry, setTelemetry] = useState([]);
  const [faults, setFaults] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [engineStatus, setEngineStatus] = useState('stopped');
  
  const [latestData, setLatestData] = useState({
    Temperature: 0,
    Vibration: 0,
    Time_To_Failure: -1
  });

  const ws = useRef(null);

  const initializeDashboard = async () => {
    try {
      const [telemetryRes, faultsRes, statusRes] = await Promise.all([
        fetch('http://localhost:5000/api/telemetry/latest', { cache: 'no-store' }),
        fetch('http://localhost:5000/api/telemetry/faults', { cache: 'no-store' }),
        fetch('http://localhost:5000/api/control/status', { cache: 'no-store' })
      ]);
      
      const telemetryData = await telemetryRes.json();
      const faultsData = await faultsRes.json();
      const statusData = await statusRes.json();

      setTelemetry(telemetryData);
      setFaults(faultsData);
      setEngineStatus(statusData.status);
      
      if (telemetryData.length > 0) {
        setLatestData(telemetryData[telemetryData.length - 1]);
      }
      setLastUpdate(new Date());

      if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
        ws.current = new WebSocket('ws://localhost:5000');

        ws.current.onmessage = (event) => {
          const message = JSON.parse(event.data);

          if (message.type === 'ENGINE_STATUS') {
            setEngineStatus(message.status);
          }

          if (message.type === 'TELEMETRY_UPDATE') {
            const newReading = message.data;
            setLatestData(newReading);
            setLastUpdate(new Date());

            setTelemetry(prev => {
              const newArray = [...prev, newReading];
              if (newArray.length > 30) newArray.shift(); 
              return newArray;
            });

            if (newReading.Fault_Occurred === 1) {
              setFaults(prev => [{
                Error_Code: 'ERR-TEMP-HIGH',
                Timestamp: newReading.Timestamp,
                Machine_ID: 'Heavy-Extruder-A'
              }, ...prev].slice(0, 50));
            }
          }
        };

        ws.current.onerror = (error) => console.error("WebSocket Error:", error);
      }
    } catch (error) {
      console.error("Error initializing dashboard:", error);
    }
  };

  useEffect(() => {
    initializeDashboard();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const handleStartEngine = async () => {
    await fetch('http://localhost:5000/api/control/start', { method: 'POST' });
  };

  const handleStopEngine = async () => {
    await fetch('http://localhost:5000/api/control/stop', { method: 'POST' });
  };

  const handlePurge = async () => {
    if (window.confirm("⚠️ WARNING: This will permanently delete all telemetry history. Proceed?")) {
      await fetch('http://localhost:5000/api/control/purge', { method: 'POST' });
      setTelemetry([]);
      setFaults([]);
      setLatestData({ Temperature: 0, Vibration: 0, Time_To_Failure: -1 });
    }
  };

  const downloadCSV = () => {
    if (telemetry.length === 0) return alert("No data to download.");
    const headers = Object.keys(telemetry[0]).join(',');
    const rows = telemetry.map(row => Object.values(row).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `titan_telemetry_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    const timeParts = tickItem.split(' ');
    return timeParts.length > 1 ? timeParts[1] : tickItem; 
  };

  return (
    <div className="dashboard-layout">
      
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-title-container">
          <Server color="#3B82F6" size={28} />
          <div>
            <h1 className="header-title">TITAN OS</h1>
            <p className="header-subtitle">Predictive AI • Industrial Telemetry</p>
          </div>
        </div>
        
        {/* CONTROL PANEL */}
        <div className="control-panel">
          <button onClick={handleStartEngine} disabled={engineStatus === 'running'} className="btn btn-start">
            <Play size={16} /> Start Plant
          </button>
          
          <button onClick={handleStopEngine} disabled={engineStatus === 'stopped'} className="btn btn-stop">
            <Square size={16} /> Emergency Stop
          </button>

          <button onClick={downloadCSV} className="btn btn-export">
            <Download size={16} /> Export
          </button>

          <button onClick={handlePurge} className="btn btn-purge">
            <Trash2 size={16} /> Purge
          </button>

          <div className="status-indicator">
            <div className={`status-dot ${engineStatus === 'running' ? 'dot-running' : 'dot-stopped'}`}></div>
            <span className="status-text">
              {engineStatus} • {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="main-container">
        
        {/* KPIs */}
        <div className="kpi-grid">
          
          <div className="kpi-card border-temp">
            <div className="card-header">
              <span className="card-title">Live Temperature</span> <Thermometer size={18} />
            </div>
            <div className={`card-value ${latestData.Temperature > 90 ? 'text-danger' : 'text-white'}`}>
              {Number(latestData.Temperature).toFixed(1)}<span className="card-unit"> °C</span>
            </div>
          </div>

          <div className="kpi-card border-vib">
            <div className="card-header">
              <span className="card-title">Chassis Vibration</span> <Activity size={18} />
            </div>
            <div className="card-value text-white">
              {Number(latestData.Vibration).toFixed(1)}<span className="card-unit"> mm/s</span>
            </div>
          </div>

          <div className={`kpi-card ${latestData.Time_To_Failure > 0 ? 'border-ttf-warning' : 'border-ttf-stable'}`}>
            {latestData.Time_To_Failure > 0 && <div className="warning-bg"></div>}
            <div className="card-header">
              <span className={`card-title ${latestData.Time_To_Failure > 0 ? 'text-warning' : ''}`}>Predictive TTF</span> 
              <Timer size={18} color={latestData.Time_To_Failure > 0 ? '#FCD34D' : '#9CA3AF'} />
            </div>
            <div className={`card-value ${latestData.Time_To_Failure > 0 ? 'text-warning' : 'text-stable'}`}>
              {latestData.Time_To_Failure === -1 ? 'STABLE' : `${latestData.Time_To_Failure}s`}
            </div>
          </div>

          <div className="kpi-card border-faults">
            <div className="card-header">
              <span className="card-title">Active Faults</span> <AlertTriangle size={18} />
            </div>
            <div className={`card-value ${faults.length > 0 ? 'text-critical' : 'text-white'}`}>
              {faults.length}
            </div>
          </div>
        </div>

        {/* CHART & LOGS */}
        <div className="content-grid">
          
          <div className="panel">
            <h2 className="panel-title text-white">
               Live Machine Learning Telemetry
            </h2>
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetry} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="Timestamp" tickFormatter={formatXAxis} tick={{fill: '#9CA3AF', fontSize: 12}} stroke="#4B5563" />
                  <YAxis yAxisId="left" domain={[55, 105]} tick={{fill: '#3B82F6', fontSize: 12}} stroke="#374151" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{fill: '#10B981', fontSize: 12}} stroke="#374151" />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '0.5rem', color: '#F3F4F6' }} labelFormatter={(label) => label} />
                  <Line yAxisId="left" type="monotone" name="Temp °C" dataKey="Temperature" stroke="#3B82F6" strokeWidth={3} dot={false} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" name="Vib mm/s" dataKey="Vibration" stroke="#10B981" strokeWidth={2} dot={false} strokeOpacity={0.7} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel-title text-danger">
               Critical Alert Log
            </h2>
            <div className="log-container">
              {faults.length === 0 ? (
                <div className="log-empty" style={{ color: engineStatus === 'stopped' ? '#9CA3AF' : '#10B981' }}>
                  <Activity size={48} style={{ marginBottom: '1rem' }} />
                  <p>{engineStatus === 'stopped' ? 'System offline.' : 'All machinery operating optimally.'}</p>
                </div>
              ) : (
                faults.map((fault, index) => (
                  <div key={index} className="log-item">
                    <div className="log-header">
                      <span className="text-danger" style={{ fontWeight: 'bold' }}>{fault.Error_Code || 'ERR-TEMP-HIGH'}</span>
                      <span className="log-timestamp">{formatXAxis(fault.Timestamp)}</span>
                    </div>
                    <div className="log-machine">
                      <Cpu size={14} /> {fault.Machine_ID || 'Heavy-Extruder-A'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <p>Titan Manufacturing Internal Engineering Tools • Edge ML & WebSockets Integration Layer</p>
        <p className="footer-sub">Secure Low-Latency Connection Established • Port 5000 Active</p>
      </footer>

    </div>
  );
};

export default App;