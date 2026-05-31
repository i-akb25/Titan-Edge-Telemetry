
# <img src="titan-web/public/titan-logo.png" width="45" align="left" /> Titan OS: Industrial Edge Telemetry & Predictive AI

<br>

A full-stack Industrial IoT (IIoT) command center engineered to bridge the gap between heavy physical machinery and real-time web monitoring. Built for high-capacity industrial environments, Titan OS utilizes edge computing concepts to stream high-frequency telemetry and leverages embedded Machine Learning to predict catastrophic machine failure before it occurs.

## 🚀 Key Engineering Features

* **Real-Time Edge Streaming:** Bypasses standard HTTP REST polling bottlenecks by utilizing native WebSockets (`ws`) to stream sub-second dual-axis telemetry (Vibration & Temperature) directly to the UI.
* **Predictive Time-To-Failure (TTF):** A background Python daemon continuously analyzes thermal acceleration trajectories using linear regression to predict impending thermal runaway events.
* **Containerized Infrastructure:** Orchestrated using Docker. The Node API, Python hardware simulator, and MySQL database run securely in an isolated, OS-agnostic Linux network.
* **Process Lifecycle Control:** The React dashboard natively boots, monitors, and terminates backend hardware daemons using OS-level process management (`spawn`, `SIGKILL`).

---

## 📊 Data Pipeline & Analytics (SQL & Power BI)

Beyond real-time streaming, Titan OS is equipped with a robust historical data pipeline designed for long-term plant analytics and business intelligence.

* **Relational Architecture (`init.sql`):** The system relies on a containerized MySQL 8.0 database, automatically provisioned with optimized schemas for high-throughput, time-series machine data.
* **Batch Ingestion (`load_to_mysql.py`):** A dedicated Python ETL script designed to parse, clean, and load massive CSV telemetry logs directly into the relational database.
* **Business Intelligence (`Telemetry.pbix`):** Includes a complete Microsoft Power BI dashboard for historical trend analysis. This allows plant managers to visualize long-term thermal degradation and cross-reference vibration anomalies across different operational shifts.

---

## 🏗️ System Architecture

* **Frontend:** React.js, Vite, Recharts (Dual-axis rendering)
* **Backend:** Node.js, Express, WebSockets (`server.js`)
* **Edge ML / Simulator:** Python, Pandas, NumPy (`telemetry_simulator.py`, `live_telemetry.py`)
* **Database / ETL:** MySQL 8.0, Python Connector
* **DevOps:** Docker, Docker Compose
* **Business Intelligence:** Microsoft Power BI

---

## ⚙️ Quick Start Installation

**1. Clone the repository**
```bash
git clone [https://github.com/i-akb25/Titan-Edge-Telemetry.git](https://github.com/i-akb25/Titan-Edge-Telemetry.git)
cd Titan-Edge-Telemetry

```

**2. Boot the IIoT Infrastructure (Backend & Database)**
*Docker handles the MySQL database and backend networking automatically.*

```bash
docker-compose up -d

```

*The API will be available on `http://localhost:5000` and the MySQL database on port `3309`.*

**3. Setup the Python Edge Environment**

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install pandas numpy mysql-connector-python

```

**4. Start the Frontend Dashboard**

```bash
cd titan-web
npm install
npm run dev

```

**5. Run the Plant**
Open `http://localhost:5173` in your browser and click **Start Plant** to initialize the background Python daemon and open the WebSocket telemetry stream.

---

## 📸 Interface Preview

## *(Upload a screenshot of your running dashboard to this repository and name it `dashboard.png` to display it here!)*

## 📜 License

This project is licensed under the MIT License.

---

## 📬 Developer Info

**Electrical Engineer & Full-Stack Developer**

* **GitHub:** [@i-akb25](https://www.google.com/search?q=https://github.com/i-akb25)

*Built to explore the intersection of full-stack web technologies, embedded edge systems, and heavy industrial automation.*

```
