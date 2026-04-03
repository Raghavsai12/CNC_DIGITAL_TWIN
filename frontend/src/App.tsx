
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Thermometer, Activity, CheckCircle, AlertTriangle, ShieldAlert, Cpu } from "lucide-react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

interface TelemetryData {
  time: string;
  temp: number;
  vibX: number;
  vibY: number;
  vibZ: number;
}

interface AnomalyLog {
  id: string;
  time: string;
  score: number;
  machine: string;
}

export default function App() {
  const [data, setData] = useState<TelemetryData[]>([
    { time: "00:00", temp: 0, vibX: 0, vibY: 0, vibZ: 0 }
  ]);
  const [logs, setLogs] = useState<AnomalyLog[]>([]);
  const [status, setStatus] = useState("AWAITING CONNECTION...");
  
  const [currentTemp, setCurrentTemp] = useState(0);
  const [currentVib, setCurrentVib] = useState({ x: 0, y: 0, z: 0 });
  const [isAnomaly, setIsAnomaly] = useState(false);
useEffect(() => {
    fetch("http://localhost:5000/api/history")
      .then(res => {
        if (!res.ok) throw new Error("Backend history route failed");
        return res.json();
      })
      .then((historyData) => {
        if (Array.isArray(historyData) && historyData.length > 0) {
          const formattedHistory = historyData.map((d: { timestamp: string, temp: number, vibration_x: number, vibration_y: number, vibration_z: number }) => ({
            time: d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour12: false }) : "00:00",
            temp: d.temp || 0,
            vibX: d.vibration_x || 0,
            vibY: d.vibration_y || 0,
            vibZ: d.vibration_z || 0
          }));
          setData(formattedHistory);
        }
      })
      .catch(err => {
        console.warn("Skipping History Fetch:", err.message);
      });

    socket.on("connect", () => {
      setStatus("LIVE");
    });

    socket.on("telemetry_stream", (payload) => {
      if (!payload) return;
      
      const newDataPoint = {
        time: payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString([], { hour12: false }) : "00:00",
        temp: payload.temp || 0,
        vibX: payload.vibration_x || 0,
        vibY: payload.vibration_y || 0,
        vibZ: payload.vibration_z || 0
      };
      
      setCurrentTemp(payload.temp || 0);
      setCurrentVib({
        x: payload.vibration_x || 0,
        y: payload.vibration_y || 0,
        z: payload.vibration_z || 0
      });
      setStatus(payload.status || "UNKNOWN");
      setIsAnomaly((payload.is_anomaly) === true); 
      
      setData(prev => {
        if (prev.length === 1 && prev[0].time === "00:00") return [newDataPoint];
        const newData = [...prev, newDataPoint];
        if (newData.length > 50) return newData.slice(newData.length - 50);
        return newData;
      });
    });

    socket.on("ml_alert", (payload) => {
      if (!payload) return;
      const newLog: AnomalyLog = {
        id: Math.random().toString(36).substr(2, 9),
        time: payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString() : "00:00",
        score: payload.score || 0,
        machine: payload.machine || "UNKNOWN"
      };
      
      setLogs(prev => {
        const updatedLogs = [newLog, ...prev];
        if (updatedLogs.length > 10) return updatedLogs.slice(0, 10);
        return updatedLogs;
      });
    });

    return () => { 
      socket.off("telemetry_stream"); 
      socket.off("ml_alert");
      socket.off("connect");
    };
  }, []);

  const bgBase = isAnomaly ? "bg-red-950/40" : "bg-[#0B1120]";
  const borderFlash = isAnomaly ? "border-red-600 shadow-[inset_0_0_100px_rgba(220,38,38,0.2)]" : "border-transparent";

return(
    <div className={`min-h-screen text-slate-300 font-sans transition-all duration-300 ${bgBase} border-x-8 ${borderFlash} p-4 md:p-8 flex flex-col`}>
      
      <header className="flex justify-between items-center mb-8 max-w-[1400px] mx-auto w-full border-b border-slate-800/60 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
            <Cpu className="text-blue-400" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">CNC COMMAND CENTER</h1>
            <p className="text-slate-500 text-sm font-medium tracking-widest uppercase mt-1">Multi-Axis Edge Telemetry</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full font-bold text-sm tracking-widest uppercase border ${isAnomaly ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
          {isAnomaly ? <AlertTriangle size={18} className="animate-pulse" /> : <CheckCircle size={18} />}
          {isAnomaly ? "CRITICAL ANOMALY" : status}
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111827] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <h3 className="text-slate-400 text-sm font-semibold tracking-wider uppercase mb-3 flex items-center gap-2">
                <Thermometer size={16} className="text-orange-500"/> Spindle Temp
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{currentTemp ? currentTemp.toFixed(1) : "0.0"}</span>
                <span className="text-xl text-slate-500">°C</span>
              </div>
            </div>

            <div className="bg-[#111827] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <h3 className="text-slate-400 text-sm font-semibold tracking-wider uppercase mb-3 flex items-center gap-2">
                <Activity size={16} className="text-blue-500"/> Peak Force (Z)
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{currentVib?.z != null ? currentVib.z.toFixed(2) : "0.00"}</span>
                <span className="text-xl text-slate-500">G</span>
              </div>
            </div>

            <div className="bg-[#111827] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <h3 className="text-slate-400 text-sm font-semibold tracking-wider uppercase mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-purple-500"/> Data Latency
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{(data.length === 1 && data[0].time === "00:00") ? "--" : "500"}</span>
                <span className="text-xl text-slate-500">ms</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 p-6 rounded-2xl flex-1 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-slate-300 font-bold flex items-center gap-2">
                <Activity className="text-blue-500" size={18} /> 
                Real-Time 3D Kinematics
              </h3>
            </div>
            
            <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="time" stroke="#4b5563" tick={{fill: '#6b7280', fontSize: 12}} />
                  <YAxis stroke="#4b5563" tick={{fill: '#6b7280', fontSize: 12}} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  
                  <Line type="monotone" name="X-Axis Force" dataKey="vibX" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" name="Y-Axis Force" dataKey="vibY" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" name="Z-Axis Force" dataKey="vibZ" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  {isAnomaly && <Line type="step" dataKey="vibX" stroke="#ef4444" strokeWidth={4} dot={false} isAnimationActive={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-2xl flex flex-col overflow-hidden h-[600px] lg:h-auto">
          <div className="p-5 border-b border-slate-800 bg-[#172033] flex justify-between items-center">
            <h3 className="text-slate-300 font-bold flex items-center gap-2">
              <ShieldAlert className="text-red-500" size={18} /> 
              AI Security Log
            </h3>
            <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded border border-red-500/20">
              {logs.length} Events
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                <ShieldAlert className="mb-3 opacity-20" size={40} />
                <p className="text-sm font-medium">Machine operating within normal parameters.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="bg-[#0B1120] border border-red-900/30 p-4 rounded-xl hover:border-red-700/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-slate-500">{log.time}</span>
                      <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">ALERT</span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium mb-1">Kinematic deviation detected</p>
                    <div className="flex justify-between items-center text-xs mt-3">
                      <span className="text-slate-500">Node: <span className="text-slate-400 font-mono">{log.machine}</span></span>
                      <span className="text-slate-500">AI Score: <span className="text-red-400 font-mono font-bold">{log.score ? log.score.toFixed(3) : "0.000"}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}