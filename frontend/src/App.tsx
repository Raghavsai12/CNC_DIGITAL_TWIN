import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Activity, CheckCircle, AlertTriangle, ShieldAlert, Cpu, Wrench, Clock, Target } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

interface TelemetryData { time: string; temp: number; vibX: number; vibY: number; vibZ: number; }
interface AnomalyLog { id: string; time: string; score: number; machine: string; reason: string; }
interface UptimeBlock { id: number; status: 'running' | 'anomaly'; durationSecs: number; }
interface HistoryRecord {
  timestamp?: string;
  temp?: number;
  vibration_x?: number;
  vibration_y?: number;
  vibration_z?: number;
}
export default function App() {
  const [data, setData] = useState<TelemetryData[]>([{ time: '00:00', temp: 0, vibX: 0, vibY: 0, vibZ: 0 }]);
  const [logs, setLogs] = useState<AnomalyLog[]>([]);
  const [totalAnomalyCount, setTotalAnomalyCount] = useState(0); // <--- FIX 2: Infinity Counter
  const [status, setStatus] = useState('AWAITING CONNECTION...');

  const [currentTemp, setCurrentTemp] = useState(0);
  const [currentVib, setCurrentVib] = useState({ x: 0, y: 0, z: 0 });
  const [isAnomaly, setIsAnomaly] = useState(false);

  const [oeeScore, setOeeScore] = useState(98.5);
  const [toolHealth, setToolHealth] = useState(100.0);
  const [uptimeBlocks, setUptimeBlocks] = useState<UptimeBlock[]>([{ id: 0, status: 'running', durationSecs: 0 }]);
  const [totalUptimeSecs, setTotalUptimeSecs] = useState(0);
  const [totalDowntimeSecs, setTotalDowntimeSecs] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/history')
      .then(res => { if (!res.ok) throw new Error('Backend history route failed'); return res.json(); })
      // --- FIX APPLIED HERE: Replaced (historyData: any) with (historyData: HistoryRecord[]) ---
      .then((historyData: HistoryRecord[]) => {
        if (Array.isArray(historyData) && historyData.length > 0) {
          const formattedHistory = historyData.map((d: HistoryRecord) => ({
            time: d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour12: false }) : '00:00',
            temp: d.temp || 0,
            vibX: d.vibration_x || 0,
            vibY: d.vibration_y || 0,
            vibZ: d.vibration_z || 0
          }));
          setData(formattedHistory);
        }
      })
      .catch(err => console.warn('Skipping History Fetch:', err.message));

    socket.on('connect', () => setStatus('LIVE'));

    socket.on('telemetry_stream', (payload) => {
      if (!payload) return;
      const newDataPoint = {
        time: payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString([], { hour12: false }) : '00:00',
        temp: payload.temp || 0,
        vibX: payload.vibration_x || 0,
        vibY: payload.vibration_y || 0,
        vibZ: payload.vibration_z || 0
      };

      setCurrentTemp(payload.temp || 0);
      setCurrentVib({ x: payload.vibration_x || 0, y: payload.vibration_y || 0, z: payload.vibration_z || 0 });
      setStatus(payload.status || 'UNKNOWN');

      const currentlyAnomaly = payload.is_anomaly === true;
      setIsAnomaly(currentlyAnomaly);

      const maxVib = Math.max(Math.abs(payload.vibration_x || 0), Math.abs(payload.vibration_y || 0), Math.abs(payload.vibration_z || 0));
      if (maxVib > 1.5) {
        setToolHealth(prev => Math.max(0, prev - (maxVib * 0.05)));
      }

      if (currentlyAnomaly) {
        setTotalDowntimeSecs(prev => prev + 0.5);
      } else {
        setTotalUptimeSecs(prev => prev + 0.5);
      }

      setUptimeBlocks(prev => {
        const lastBlock = prev[prev.length - 1];
        const currentStatus: 'anomaly' | 'running' = currentlyAnomaly ? 'anomaly' : 'running';

        if (lastBlock.status === currentStatus) {
          const newBlocks = [...prev];
          newBlocks[newBlocks.length - 1] = { ...lastBlock, durationSecs: lastBlock.durationSecs + 0.5 };
          return newBlocks;
        } else {
          const newBlocks = [...prev, { id: Date.now(), status: currentStatus, durationSecs: 0.5 }];
          return newBlocks.length > 40 ? newBlocks.slice(newBlocks.length - 40) : newBlocks;
        }
      });

      setData(prev => {
        if (prev.length === 1 && prev[0].time === '00:00') return [newDataPoint];
        const newData = [...prev, newDataPoint];
        return newData.length > 30 ? newData.slice(newData.length - 30) : newData; // <--- FIX 3: Zoomed in
      });
    });

    socket.on('ml_alert', (payload) => {
      if (!payload) return;

      setTotalAnomalyCount(prev => prev + 1); // <--- FIX 2: Increase infinite counter

      const newLog: AnomalyLog = {
        id: Math.random().toString(36).substr(2, 9),
        time: payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString() : '00:00',
        score: payload.score || 0,
        machine: payload.machine || 'UNKNOWN',
        reason: payload.reason || 'AI Kinematic Match' // <--- FIX 3: Fault reason
      };

      setOeeScore(prev => Math.max(0, prev - 2.5));

      setLogs(prev => {
        const updatedLogs = [newLog, ...prev];
        return updatedLogs.length > 50 ? updatedLogs.slice(0, 50) : updatedLogs;
      });
    });

    return () => { socket.off('telemetry_stream'); socket.off('ml_alert'); socket.off('connect'); };
  }, []);

  const bgBase = isAnomaly ? 'bg-red-950/40' : 'bg-[#0B1120]';
  const borderFlash = isAnomaly ? 'border-red-600 shadow-[inset_0_0_100px_rgba(220,38,38,0.2)]' : 'border-transparent';
  const mainDivClass = 'min-h-screen text-slate-300 font-sans transition-all duration-300 p-4 md:p-8 flex flex-col border-x-8 ' + bgBase + ' ' + borderFlash;
  const badgeClass = 'flex items-center gap-3 px-6 py-2.5 rounded-full font-bold text-sm tracking-widest uppercase border ' + (isAnomaly ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20');

  const oeeColor = oeeScore > 90 ? '#10b981' : oeeScore > 75 ? '#f59e0b' : '#ef4444';
  const oeeData = [{ name: 'OEE', value: oeeScore, fill: oeeColor }];

  const getVibColor = (val: number) => val > 1.5 ? 'text-red-400 font-bold' : 'text-emerald-400';
  const getTempColor = (val: number) => val > 45 ? 'text-red-400 font-bold' : 'text-emerald-400';

  return (
    <div className={mainDivClass}>
      <header className='flex justify-between items-center mb-8 max-w-[1400px] mx-auto w-full border-b border-slate-800/60 pb-6'>
        <div className='flex items-center gap-4'>
          <div className='p-3 bg-blue-600/20 rounded-xl border border-blue-500/30'><Cpu className='text-blue-400' size={28} /></div>
          <div>
            <h1 className='text-3xl font-black text-white tracking-tight'>CNC COMMAND CENTER</h1>
            <p className='text-slate-500 text-sm font-medium tracking-widest uppercase mt-1'>Predictive Maintenance & Telemetry</p>
          </div>
        </div>
        <div className={badgeClass}>
          {isAnomaly ? <AlertTriangle size={18} className='animate-pulse' /> : <CheckCircle size={18} />}
          {isAnomaly ? 'CRITICAL ANOMALY' : status}
        </div>
      </header>

      <div className='max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1'>
        <div className='lg:col-span-8 flex flex-col gap-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='bg-[#111827] border border-slate-800 p-6 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center'>
              <h3 className='text-slate-400 text-sm font-semibold tracking-wider uppercase absolute top-4 left-4'>OEE Score</h3>
              <div className='w-full h-32 mt-4'>
                <ResponsiveContainer width='100%' height='100%'>
                  <RadialBarChart cx='50%' cy='100%' innerRadius='80%' outerRadius='100%' barSize={10} data={oeeData} startAngle={180} endAngle={0}>
                    <PolarAngleAxis type='number' domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#1f2937' }} dataKey='value' cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className='absolute bottom-4 flex items-baseline gap-1'>
                <span className='text-3xl font-black text-white'>{oeeScore.toFixed(1)}</span>
                <span className='text-lg text-slate-500'>%</span>
              </div>
            </div>

            <div className='bg-[#111827] border border-slate-800 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-center'>
              <h3 className='text-slate-400 text-sm font-semibold tracking-wider uppercase mb-6 flex items-center gap-2'><Wrench size={16} className='text-blue-500' /> Spindle Bearing Life</h3>
              <div className='w-full bg-slate-800 rounded-full h-4 mb-2 overflow-hidden border border-slate-700'>
                <div className='bg-blue-500 h-4 rounded-full transition-all duration-500' style={{ width: `${toolHealth}%` }}></div>
              </div>
              <div className='flex justify-between items-center text-sm'>
                <span className={toolHealth < 30 ? 'text-red-400 font-bold animate-pulse' : 'text-slate-400'}>
                  {toolHealth < 30 ? 'MAINTENANCE REQUIRED' : 'Nominal Wear'}
                </span>
                <span className='font-bold text-white'>{toolHealth.toFixed(1)}%</span>
              </div>
            </div>

            <div className='bg-[#111827] border border-slate-800 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-center'>
              <h3 className='text-slate-400 text-sm font-semibold tracking-wider uppercase mb-6 flex items-center gap-2'><Clock size={16} className='text-emerald-500' /> Shift Uptime</h3>
              <div className='w-full bg-slate-800 rounded-full h-4 flex overflow-hidden mb-2 border border-slate-700'>
                {uptimeBlocks.map(block => (
                  <div key={block.id} className={block.status === 'running' ? 'bg-emerald-500' : 'bg-red-500'} style={{ flexGrow: block.durationSecs, minWidth: '2px' }}></div>
                ))}
              </div>
              <div className='flex justify-between items-center text-xs font-mono text-slate-400'>
                <span>UP: {Math.floor(totalUptimeSecs)}s</span>
                <span className='text-red-400'>DOWN: {Math.floor(totalDowntimeSecs)}s</span>
              </div>
            </div>
          </div>

          <div className='bg-[#111827] border border-slate-800 p-6 rounded-2xl flex-1 flex flex-col'>
            <div className='flex justify-between items-start mb-6 border-b border-slate-800/80 pb-4'>
              <div>
                <h3 className='text-slate-300 font-bold flex items-center gap-2 mb-2'><Activity className='text-blue-500' size={18} /> Real-Time 3D Kinematics</h3>
                <div className='flex gap-4 text-xs font-mono text-slate-500 bg-slate-800/40 p-2 rounded border border-slate-700/50'>
                  <span className='flex items-center gap-1'><Target size={12} /> NORMAL SAFE LIMITS:</span>
                  <span>TEMP &lt; 45°C</span>
                  <span>VIB(X,Y,Z) &lt; 1.5G</span>
                </div>
              </div>
              <div className='flex gap-6 text-sm font-mono bg-slate-900 p-3 rounded-lg border border-slate-700 shadow-inner'>
                <div className='flex flex-col items-center'><span className='text-slate-500 text-[10px] mb-1'>LIVE TEMP</span><span className={getTempColor(currentTemp)}>{currentTemp.toFixed(1)}°C</span></div>
                <div className='flex flex-col items-center'><span className='text-slate-500 text-[10px] mb-1'>LIVE X-AXIS</span><span className={getVibColor(Math.abs(currentVib.x))}>{currentVib.x.toFixed(2)}G</span></div>
                <div className='flex flex-col items-center'><span className='text-slate-500 text-[10px] mb-1'>LIVE Y-AXIS</span><span className={getVibColor(Math.abs(currentVib.y))}>{currentVib.y.toFixed(2)}G</span></div>
                <div className='flex flex-col items-center'><span className='text-slate-500 text-[10px] mb-1'>LIVE Z-AXIS</span><span className={getVibColor(Math.abs(currentVib.z))}>{currentVib.z.toFixed(2)}G</span></div>
              </div>
            </div>
            <div className='flex-1 w-full' style={{ minHeight: '400px' }}>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#1f2937' vertical={false} />
                  <XAxis dataKey='time' stroke='#4b5563' tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis stroke='#4b5563' tick={{ fill: '#6b7280', fontSize: 12 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} iconType='circle' />
                  <Line type='monotone' name='X-Axis Force' dataKey='vibX' stroke='#3b82f6' strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type='monotone' name='Y-Axis Force' dataKey='vibY' stroke='#10b981' strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type='monotone' name='Z-Axis Force' dataKey='vibZ' stroke='#8b5cf6' strokeWidth={2} dot={false} isAnimationActive={false} />
                  {isAnomaly && <Line type='step' dataKey='vibX' stroke='#ef4444' strokeWidth={4} dot={false} isAnimationActive={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className='lg:col-span-4 bg-[#111827] border border-slate-800 rounded-2xl flex flex-col overflow-hidden h-[600px] lg:h-full max-h-[800px]'>
          <div className='p-5 border-b border-slate-800 bg-[#172033] flex justify-between items-center'>
            <h3 className='text-slate-300 font-bold flex items-center gap-2'><ShieldAlert className='text-red-500' size={18} /> AI Security Log</h3>
            <span className='bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded border border-red-500/20'>{totalAnomalyCount} Total Events</span>
          </div>
          <div className='flex-1 overflow-y-auto p-2'>
            {logs.length === 0 ? (
              <div className='h-full flex flex-col items-center justify-center text-slate-600 p-6 text-center'><ShieldAlert className='mb-3 opacity-20' size={40} /><p className='text-sm font-medium'>Machine operating within normal parameters.</p></div>) :
              (
                <div className='space-y-2'>
                  {logs.map((log) => (
                    <div key={log.id} className='bg-[#0B1120] border border-red-900/30 p-4 rounded-xl hover:border-red-700/50 transition-colors group'>
                      <div className='flex justify-between items-start mb-2'><span className='text-xs font-mono text-slate-500'>{log.time}</span><span className='text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded'>FAULT</span></div>
                      <p className='text-sm text-slate-300 font-medium mb-1 break-words leading-tight'>{log.reason}</p>
                      <div className='flex justify-between items-center text-xs mt-3'><span className='text-slate-500'>Node: <span className='text-slate-400 font-mono'>{log.machine}</span></span><span className='text-slate-500'>AI Score: <span className='text-red-400 font-mono font-bold'>{log.score ? log.score.toFixed(3) : '0.000'}</span></span>
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