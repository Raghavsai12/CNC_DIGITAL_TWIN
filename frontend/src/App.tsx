import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Thermometer, Activity, CheckCircle, AlertTriangle } from "lucide-react";
import { io } from "socket.io-client";

// Connect to Node.js backend
const socket = io("http://localhost:5000");

interface TelemetryData {
  time: string;
  temp: number;
  vibX: number;
}

export default function App() {
  const [data, setData] = useState<TelemetryData[]>([]);
  const [status, setStatus] = useState("AWAITING CONNECTION...");
  const [temp, setTemp] = useState(0);
  const [vibration, setVibration] = useState(0);
  const [isAnomaly, setIsAnomaly] = useState(false);

  useEffect(() => {
    // 1. Fetch Historical Data from MongoDB on page load
    fetch("http://localhost:5000/api/history")
      .then(res => res.json())
      .then((historyData: Array<{ timestamp: string, temp: number, vibration_x: number }>) => {
        const formattedHistory = historyData.map((d) => ({
          time: new Date(d.timestamp).toLocaleTimeString(),
          temp: d.temp || 0,
          vibX: d.vibration_x || 0
        }));
        setData(formattedHistory);
      })
      .catch(err => console.error("Failed to load history:", err));

    // 2. Connect to Live Socket
    socket.on("connect", () => {
      console.log("Connected to backend!");
    });
    socket.on("telemetry_stream", (payload) => {
      if (!payload) return;
      
      const newDataPoint = {
        time: new Date(payload.timestamp).toLocaleTimeString(),
        temp: payload.temp || 0,
        vibX: payload.vibration_x || 0
      };
      
      setTemp(payload.temp || 0);
      setVibration(payload.vibration_x || 0);
      setStatus(payload.status || "UNKNOWN");
      
      // Now we trust the AI Node!
      setIsAnomaly(payload.is_anomaly === true); 

      
      setData(prev => {
        const newData = [...prev, newDataPoint];
        if (newData.length > 30) return newData.slice(newData.length - 30);
        return newData;
      });
    });

    return () => { 
      socket.off("telemetry_stream"); 
      socket.off("connect");
    };
  }, []);

  // Simple background color logic
  const bgColor = isAnomaly ? "bg-red-900" : "bg-slate-900";
return (
    <div className={`min-h-screen p-8 text-white ${bgColor}`}>
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto border-b border-slate-700 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">CNC DIGITAL TWIN <span className="text-slate-500 text-lg"></span></h1>
          <p className="text-slate-400 mt-1">Real-time edge telemetry</p>
        </div>
        
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 rounded-full font-bold">
          {isAnomaly ? <AlertTriangle className="text-red-500" /> : <Activity className="text-emerald-500" />}
          <span className={isAnomaly ? "text-red-500" : "text-emerald-500"}>
            {isAnomaly ? "ANOMALY DETECTED" : status}
          </span>
        </div>
      </header>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-7xl mx-auto">
        <div className="bg-slate-800 p-6 rounded-2xl">
          <h3 className="text-slate-400 mb-2 flex items-center gap-2"><Thermometer size={18}/> Temperature</h3>
          <div className="text-4xl font-bold">{temp.toFixed(1)}°C</div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl">
          <h3 className="text-slate-400 mb-2 flex items-center gap-2"><Activity size={18}/> Vibration</h3>
          <div className="text-4xl font-bold">{vibration.toFixed(2)}G</div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl">
          <h3 className="text-slate-400 mb-2 flex items-center gap-2"><CheckCircle size={18}/> Ping</h3>
          <div className="text-4xl font-bold">{(data.length === 0) ? "0" : "500"}ms</div>
        </div>
      </div>

      {/* LIVE GRAPH */}
      <div className="max-w-7xl mx-auto bg-slate-800 p-6 rounded-2xl h-96">
        <h3 className="text-slate-400 font-medium mb-4">Live Vibration Stream</h3>
        
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">Waiting for data...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" />
              <YAxis stroke="#64748b" domain={[0, 'auto']} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="vibX" 
                stroke={isAnomaly ? "#ef4444" : "#38bdf8"} 
                strokeWidth={3} 
                dot={false}
                isAnimationActive={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
