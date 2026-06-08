
import React, { useState, useEffect, useRef } from 'react';
import { 
  ApparelType, 
  LocationPosition, 
  LocationInfo, 
  JobDetails, 
  MachineDetails, 
  CalculationResult,
  LoggedJob,
  UserProfile,
  JobTemplate
} from './types';
import { calculateRuntime, parseDateTime } from './services/embroideryService';
import { HistoryModal } from './components/HistoryModal';
import { HowToModal } from './components/HowToModal';
import { AccountModal } from './components/AccountModal';
import { AIAssistant } from './components/AIAssistant';
import { AIInsightsPanel } from './components/AIInsightsPanel';
import { DesignAnalyzer } from './components/DesignAnalyzer';
import { ThreadCatalog } from './components/ThreadCatalog';
import { MADEIRA_BACKING_OPTIONS } from './constants';
import { 
  Calculator, 
  Pause, 
  Play, 
  Clock, 
  History, 
  Trash2, 
  Plus, 
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Palette,
  User,
  Settings
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const STORAGE_KEY = 'embroidery_calc_history';
const PROFILE_KEY = 'embroidery_calc_profile';

function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const [jobDetails, setJobDetails] = useState<JobDetails>({
    userName: '',
    jobNumber: '',
    jobDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  });

  const [machineDetails, setMachineDetails] = useState<MachineDetails>({
    rpm: 800,
    heads: 1,
    apparelType: ApparelType.Tshirt,
    backingInfo: MADEIRA_BACKING_OPTIONS[0]
  });

  const [locations, setLocations] = useState<LocationInfo[]>([
    { id: '1', designNumber: '', stitches: 0, quantity: 1, position: LocationPosition.LeftChest, colors: 1 }
  ]);

  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [totalPauseSeconds, setTotalPauseSeconds] = useState(0);
  const [adjustedEndTime, setAdjustedEndTime] = useState<string>('');
  const [history, setHistory] = useState<LoggedJob[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHowToOpen, setIsHowToOpen] = useState(false);
  const [isThreadCatalogOpen, setIsThreadCatalogOpen] = useState(false);
  const [actualEndTimeInput, setActualEndTimeInput] = useState('');

  useEffect(() => {
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setUserProfile(parsed);
      setMachineDetails(parsed.machineDefaults);
      setJobDetails(prev => ({ ...prev, userName: parsed.defaultOperator }));
    }

    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const updateTime = () => {
      if (!calculation) return;
      const start = parseDateTime(jobDetails.jobDate, jobDetails.startTime);
      const durationMs = calculation.netMinutes * 60000;
      let currentPause = totalPauseSeconds;
      if (isPaused && pauseStartTime) {
        currentPause += (new Date().getTime() - pauseStartTime.getTime()) / 1000;
      }
      const newEndTimestamp = start.getTime() + durationMs + (currentPause * 1000);
      setAdjustedEndTime(new Date(newEndTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    if (isPaused || calculation) interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [calculation, isPaused, pauseStartTime, totalPauseSeconds, jobDetails]);

  const updateProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  };

  const loadTemplate = (template: JobTemplate) => {
    setMachineDetails(template.machineDetails);
    setLocations(template.locations.map(l => ({ ...l, id: Math.random().toString(36).substr(2, 9) })));
    setCalculation(null);
  };

  const addLocation = () => {
    setLocations([...locations, { id: Date.now().toString(), designNumber: '', stitches: 0, quantity: 1, position: LocationPosition.LeftChest, colors: 1 }]);
  };

  const removeLocation = (id: string) => {
    if (locations.length > 1) setLocations(locations.filter(l => l.id !== id));
  };

  const updateLocation = (id: string, field: keyof LocationInfo, value: any) => {
    setLocations(locations.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleCalculate = () => {
    if (isPaused) return alert("Please resume production before recalculating.");
    const start = parseDateTime(jobDetails.jobDate, jobDetails.startTime);
    const result = calculateRuntime(machineDetails.apparelType, machineDetails.rpm, machineDetails.heads, locations, start);
    setCalculation(result);
    setTotalPauseSeconds(0);
    setPauseStartTime(null);
    setAdjustedEndTime(result.projectedEndTime);
    logEvent('CALC', result);
  };

  const togglePause = () => {
    if (!calculation) return;
    if (isPaused) {
      if (pauseStartTime) {
        const diff = (new Date().getTime() - pauseStartTime.getTime()) / 1000;
        setTotalPauseSeconds(prev => prev + diff);
        logEvent('RESUME', calculation, diff);
      }
      setIsPaused(false);
      setPauseStartTime(null);
    } else {
      setIsPaused(true);
      setPauseStartTime(new Date());
      logEvent('PAUSE', calculation);
    }
  };

  const logActualTime = () => {
    if (!calculation || !actualEndTimeInput) return alert("Please enter the actual end time.");
    logEvent('ACTUAL', calculation, undefined, actualEndTimeInput);
    alert(`Job Logged to History.`);
  };

  const logEvent = (eventType: any, result: any, resumeDuration?: number, actualTime?: string) => {
    const newLog: LoggedJob = { id: Date.now().toString(), timestamp: new Date().toISOString(), eventType, jobDetails, machineDetails, locations, result, totalPauseSeconds, actualEndTime: actualTime };
    const updatedHistory = [newLog, ...history];
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  };

  const loadJob = (job: LoggedJob) => {
    setJobDetails(job.jobDetails);
    setMachineDetails(job.machineDetails);
    setLocations(job.locations);
    setCalculation(job.result);
    setTotalPauseSeconds(job.totalPauseSeconds);
    setIsPaused(false);
    setPauseStartTime(null);
  };

  const chartData = calculation ? [
    { name: 'Prep', value: calculation.breakdown.preparation, color: '#6366f1' },
    { name: 'Stitch', value: calculation.breakdown.stitching, color: '#10b981' },
    { name: 'Colors', value: calculation.breakdown.colors, color: '#f59e0b' },
    { name: 'Buffer', value: calculation.breakdown.buffer, color: '#ef4444' },
  ] : [];

  return (
    <div className="min-h-screen pb-12 bg-slate-50/50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
                <Calculator className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter italic">EmbroideryCalc <span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => setIsHowToOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600">
              <HelpCircle className="w-4 h-4" /> Guide
            </button>
            <button onClick={() => setIsThreadCatalogOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
              <Palette className="w-4 h-4" /> Threads
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-lg">
              <History className="w-4 h-4" /> Archive
            </button>
            <button onClick={() => setIsAccountOpen(true)} className="ml-2 p-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95">
              {userProfile ? (
                <div className="w-8 h-8 flex items-center justify-center font-black text-[10px] uppercase">{userProfile.shopName.charAt(0)}</div>
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
          <div className="lg:col-span-7 space-y-6 md:space-y-10">
            <DesignAnalyzer onAnalysisComplete={(res) => setLocations(res.map(r => ({ id: r.id, designNumber: r.fileName.split('.')[0], stitches: r.stitches, quantity: 1, position: r.assignedPosition, colors: r.colors })))} />
            
            <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs md:text-sm font-black text-slate-950 flex items-center gap-3 uppercase tracking-[0.2em]">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div> Production Setup
                </h2>
                {userProfile?.templates && userProfile.templates.length > 0 && (
                   <select 
                    onChange={(e) => {
                      const t = userProfile.templates.find(temp => temp.id === e.target.value);
                      if (t) loadTemplate(t);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest border-none bg-indigo-50 text-indigo-600 rounded-lg px-3 py-1 cursor-pointer"
                   >
                     <option value="">Load Template</option>
                     {userProfile.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operator</label><input type="text" value={jobDetails.userName} onChange={(e) => setJobDetails({...jobDetails, userName: e.target.value})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Job ID</label><input type="text" value={jobDetails.jobNumber} onChange={(e) => setJobDetails({...jobDetails, jobNumber: e.target.value})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</label><input type="date" value={jobDetails.jobDate} onChange={(e) => setJobDetails({...jobDetails, jobDate: e.target.value})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start Time</label><input type="time" value={jobDetails.startTime} onChange={(e) => setJobDetails({...jobDetails, startTime: e.target.value})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-10">
              <h2 className="text-xs md:text-sm font-black text-slate-950 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]"><div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>Machine Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">RPM</label><input type="number" value={machineDetails.rpm} onChange={(e) => setMachineDetails({...machineDetails, rpm: Number(e.target.value)})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Heads</label><input type="number" value={machineDetails.heads} onChange={(e) => setMachineDetails({...machineDetails, heads: Number(e.target.value)})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Garment</label><select value={machineDetails.apparelType} onChange={(e) => setMachineDetails({...machineDetails, apparelType: e.target.value as ApparelType})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border">{Object.values(ApparelType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stabilizer</label><select value={machineDetails.backingInfo} onChange={(e) => setMachineDetails({...machineDetails, backingInfo: e.target.value})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border">{MADEIRA_BACKING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs md:text-sm font-black text-slate-950 flex items-center gap-3 uppercase tracking-[0.2em]"><div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>Locations</h2>
                <button onClick={addLocation} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full text-white bg-indigo-600"><Plus className="w-4 h-4 mr-1 inline" /> Add</button>
              </div>
              <div className="space-y-4">
                {locations.map((loc, index) => (
                  <div key={loc.id} className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl relative border border-slate-100">
                    <input type="text" value={loc.designNumber} placeholder="Design" onChange={(e) => updateLocation(loc.id, 'designNumber', e.target.value)} className="rounded-lg border-slate-200 text-[10px] font-bold p-2 border"/>
                    <input type="number" value={loc.stitches} placeholder="Stitches" onChange={(e) => updateLocation(loc.id, 'stitches', Number(e.target.value))} className="rounded-lg border-slate-200 text-[10px] font-bold p-2 border"/>
                    <input type="number" value={loc.quantity} placeholder="Qty" onChange={(e) => updateLocation(loc.id, 'quantity', Number(e.target.value))} className="rounded-lg border-slate-200 text-[10px] font-bold p-2 border"/>
                    <input type="number" value={loc.colors} placeholder="Colors" onChange={(e) => updateLocation(loc.id, 'colors', Number(e.target.value))} className="rounded-lg border-slate-200 text-[10px] font-bold p-2 border"/>
                    <select value={loc.position} onChange={(e) => updateLocation(loc.id, 'position', e.target.value)} className="rounded-lg border-slate-200 text-[10px] font-bold p-2 border">{Object.values(LocationPosition).map(p => <option key={p} value={p}>{p}</option>)}</select>
                    {locations.length > 1 && <button onClick={() => removeLocation(loc.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"><Trash2 className="w-3 h-3" /></button>}
                  </div>
                ))}
              </div>
            </div>
            
            <button onClick={handleCalculate} className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Generate Matrix</button>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className={`rounded-3xl shadow-2xl border p-8 md:p-10 transition-all ${isPaused ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100'}`}>
              {!calculation ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                  <Clock className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Parameters</p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Total Estimated Run</h3>
                    <div className="text-5xl font-black text-slate-900 italic">
                        {Math.floor(calculation.netMinutes / 60)}h {Math.round(calculation.netMinutes % 60)}m
                    </div>
                  </div>
                  <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 mb-6 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Target Finish</span>
                      <div className="text-3xl font-black text-indigo-600 italic">{adjustedEndTime}</div>
                    </div>
                    <CheckCircle className="w-10 h-10 text-indigo-200" />
                  </div>
                  <button onClick={togglePause} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg mb-6 flex items-center justify-center gap-3 ${isPaused ? 'bg-amber-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-600'}`}>
                    {isPaused ? <><Play className="w-5 h-5 fill-current"/> Resume</> : <><Pause className="w-5 h-5 fill-current"/> Pause</>}
                  </button>
                  <div className="h-48 md:h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                </>
              )}
            </div>
            
            <AIInsightsPanel machineDetails={machineDetails} locations={locations} calculation={calculation} />
          </div>
        </div>
      </main>

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onLoad={loadJob} onSaveAsTemplate={(job) => {
        const name = prompt("Name this template:", job.jobDetails.jobNumber || "Template");
        if (!name || !userProfile) return;
        updateProfile({ ...userProfile, templates: [...userProfile.templates, { id: Date.now().toString(), name, description: `Based on Job ${job.jobDetails.jobNumber}`, machineDetails: job.machineDetails, locations: job.locations }]});
        alert("Template saved to Shop Profile.");
      }} />
      <HowToModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} />
      <ThreadCatalog isOpen={isThreadCatalogOpen} onClose={() => setIsThreadCatalogOpen(false)} />
      <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} profile={userProfile} onUpdate={updateProfile} history={history} onSyncComplete={(backup) => {
        updateProfile(backup.profile);
        setHistory(backup.history);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.history));
      }} />
      <AIAssistant jobDetails={jobDetails} machineDetails={machineDetails} locations={locations} calculation={calculation} />
    </div>
  );
}

export default App;
