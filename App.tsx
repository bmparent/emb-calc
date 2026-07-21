
import { useEffect, useState } from 'react';
import { 
  ApparelType, 
  LocationPosition, 
  LocationInfo, 
  JobDetails, 
  MachineDetails, 
  CalculationResult,
  LoggedJob,
  JobTemplate,
  CalibrationProfile,
  ProJobSnapshot
} from './types';
import { calculateActualMinutes, calculateRuntime, parseDateTime, RuntimeValidationError } from './services/embroideryService';
import { createCalculationInputKey, formatLocalDate, mergeImportedLocations } from './services/calculatorState';
import { HistoryModal } from './components/HistoryModal';
import { HowToModal } from './components/HowToModal';
import { CalibrationModal } from './components/CalibrationModal';
import { DesignAnalyzer } from './components/DesignAnalyzer';
import { SupplyRecommendations } from './components/SupplyRecommendations';
import { ProWorkspace } from './components/ProWorkspace';
import type { PrintavoCalculatorImport } from './shared/printavoMapping';
import type { LearningSuggestion } from './shared/adaptiveLearning';
import { DEFAULT_CALIBRATION_PROFILE, MADEIRA_BACKING_OPTIONS } from './constants';
import { bucketLocationCount, bucketMachineHeads, bucketQuantity, trackEvent } from './src/lib/analytics';
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
  Settings
} from 'lucide-react';

const STORAGE_KEY = 'embroidery_calc_history';
const CALIBRATION_KEY = 'embroidery_calc_calibration_v2';
const TEMPLATE_KEY = 'embroidery_calc_templates';

const createId = () => crypto.randomUUID();

const createLocation = (quantity = 1): LocationInfo => ({
  id: createId(),
  designNumber: '',
  stitches: 0,
  quantity,
  position: LocationPosition.LeftChest,
  colors: 1,
  trims: 0,
  manualStops: 0,
  speedFactor: 1,
  handlingFactor: 1,
  downtimeFactor: 1,
});

const normalizeLocation = (location: LocationInfo): LocationInfo => ({
  ...createLocation(location.quantity || 1),
  ...location,
  trims: location.trims ?? 0,
  manualStops: location.manualStops ?? 0,
  speedFactor: location.speedFactor ?? 1,
  handlingFactor: location.handlingFactor ?? 1,
  downtimeFactor: location.downtimeFactor ?? 1,
});

interface AppProps {
  embedded?: boolean;
}

function App({ embedded = false }: AppProps) {
  const [calibration, setCalibration] = useState<CalibrationProfile>(DEFAULT_CALIBRATION_PROFILE);
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);

  const [jobDetails, setJobDetails] = useState<JobDetails>({
    userName: '',
    jobNumber: '',
    jobDate: formatLocalDate(),
    startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    quantity: 1,
  });

  const [machineDetails, setMachineDetails] = useState<MachineDetails>({
    rpm: 800,
    heads: 1,
    apparelType: ApparelType.Tshirt,
    backingInfo: MADEIRA_BACKING_OPTIONS[0]
  });

  const [locations, setLocations] = useState<LocationInfo[]>([
    { ...createLocation(1), id: '1' }
  ]);

  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [calculatedInputKey, setCalculatedInputKey] = useState<string | null>(null);
  const [estimateNotice, setEstimateNotice] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [totalPauseSeconds, setTotalPauseSeconds] = useState(0);
  const [adjustedEndTime, setAdjustedEndTime] = useState<string>('');
  const [history, setHistory] = useState<LoggedJob[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHowToOpen, setIsHowToOpen] = useState(false);
  const [activeCalculationLogId, setActiveCalculationLogId] = useState<string | null>(null);
  const [actualEndTimeInput, setActualEndTimeInput] = useState('');
  const [actualComparison, setActualComparison] = useState<{
    actualMinutes: number;
    verifiedErrorMinutes: number;
    batchAwareErrorMinutes: number;
  } | null>(null);
  const [formError, setFormError] = useState('');
  const [learningEnabled, setLearningEnabled] = useState(false);
  const [learningSuggestion, setLearningSuggestion] = useState<LearningSuggestion | null>(null);
  const [learningRefresh, setLearningRefresh] = useState(0);
  const [printavoContext, setPrintavoContext] = useState<{ orderId: string; visualId: string } | null>(null);

  const calculationInputKey = createCalculationInputKey({
    jobQuantity: jobDetails.quantity,
    machineDetails,
    locations,
    calibration,
  });

  useEffect(() => {
    try {
      const savedCalibration = localStorage.getItem(CALIBRATION_KEY);
      if (savedCalibration) {
        setCalibration({ ...DEFAULT_CALIBRATION_PROFILE, ...JSON.parse(savedCalibration) });
      }
      const savedTemplates = localStorage.getItem(TEMPLATE_KEY);
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (error) {
      console.error('Unable to restore local calculator data.', error);
    }
  }, []);

  useEffect(() => {
    if (!calculation || !calculatedInputKey || calculatedInputKey === calculationInputKey) return;

    setCalculation(null);
    setCalculatedInputKey(null);
    setIsPaused(false);
    setPauseStartTime(null);
    setTotalPauseSeconds(0);
    setAdjustedEndTime('');
    setActiveCalculationLogId(null);
    setActualEndTimeInput('');
    setActualComparison(null);
    setEstimateNotice('Production inputs changed. Calculate again to refresh the estimate.');
  }, [calculation, calculatedInputKey, calculationInputKey]);

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

  useEffect(() => {
    if (!calculation || !learningEnabled) {
      setLearningSuggestion(null);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      predictedMinutes: String(calculation.netMinutes),
      garmentType: machineDetails.apparelType,
    });
    fetch(`/api/learning/suggestion?${params}`, { signal: controller.signal })
      .then(async (response): Promise<{ suggestion: LearningSuggestion } | null> => response.ok ? response.json() : null)
      .then((value) => setLearningSuggestion(value?.suggestion ?? null))
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLearningSuggestion(null);
      });
    return () => controller.abort();
  }, [calculation, learningEnabled, machineDetails.apparelType, learningRefresh]);

  const updateCalibration = (profile: CalibrationProfile) => {
    setCalibration(profile);
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(profile));
  };

  const loadTemplate = (template: JobTemplate) => {
    setMachineDetails(template.machineDetails);
    setLocations(template.locations.map(location => ({
      ...normalizeLocation(location),
      id: createId(),
    })));
  };

  const addLocation = () => {
    setLocations([...locations, createLocation(jobDetails.quantity)]);
  };

  const updateJobQuantity = (quantity: number) => {
    const previousQuantity = jobDetails.quantity;
    setJobDetails({ ...jobDetails, quantity });
    setLocations((current) => current.map((location) => (
      location.quantity === previousQuantity ? { ...location, quantity } : location
    )));
  };

  const importPrintavoOrder = (order: PrintavoCalculatorImport) => {
    const quantity = Math.max(1, order.quantity);
    setJobDetails((current) => ({ ...current, jobNumber: order.visualId, quantity }));
    setMachineDetails((current) => ({ ...current, apparelType: order.apparelType as ApparelType }));
    if (order.locations.length > 0) {
      setLocations(order.locations.map((location) => ({
        ...createLocation(location.quantity || quantity),
        id: createId(),
        designNumber: location.designNumber,
        stitches: location.stitches ?? 0,
        colors: Math.max(1, location.colors ?? 1),
        quantity: location.quantity || quantity,
        position: Object.values(LocationPosition).includes(location.position as LocationPosition)
          ? location.position as LocationPosition
          : LocationPosition.ProductFront,
      })));
    }
    setPrintavoContext({ orderId: order.orderId, visualId: order.visualId });
    setEstimateNotice(order.warnings.join(' '));
  };

  const loadProJob = (snapshot: ProJobSnapshot) => {
    setJobDetails(snapshot.jobDetails);
    setMachineDetails(snapshot.machineDetails);
    setLocations(snapshot.locations.map((location) => ({ ...normalizeLocation(location), id: createId() })));
    setPrintavoContext(snapshot.printavoOrderId && snapshot.printavoVisualId
      ? { orderId: snapshot.printavoOrderId, visualId: snapshot.printavoVisualId }
      : null);
    setEstimateNotice('Cloud-saved setup loaded. Calculate again to create a current estimate.');
  };

  const removeLocation = (id: string) => {
    if (locations.length > 1) setLocations(locations.filter(l => l.id !== id));
  };

  const updateLocation = (id: string, field: keyof LocationInfo, value: any) => {
    setLocations(locations.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleCalculate = () => {
    if (isPaused) {
      setFormError('Resume production before recalculating.');
      return;
    }
    try {
      const start = parseDateTime(jobDetails.jobDate, jobDetails.startTime);
      const result = calculateRuntime({
        apparelType: machineDetails.apparelType,
        rpm: machineDetails.rpm,
        heads: machineDetails.heads,
        jobQuantity: jobDetails.quantity,
        locations,
        startDateTime: start,
        calibration,
      });
      setCalculation(result);
      setCalculatedInputKey(calculationInputKey);
      setEstimateNotice('');
      setFormError('');
      setTotalPauseSeconds(0);
      setPauseStartTime(null);
      setAdjustedEndTime(result.projectedEndTime);
      setActualEndTimeInput('');
      setActualComparison(null);
      setActiveCalculationLogId(logEvent('CALC', result, 0));
      trackEvent('calculation_completed', {
        mode: result.mode,
        quantity_bucket: bucketQuantity(jobDetails.quantity),
        location_count_bucket: bucketLocationCount(locations.length),
        machine_heads_bucket: bucketMachineHeads(machineDetails.heads),
        garment_type: machineDetails.apparelType,
        warning_count: result.warnings.length,
      });
    } catch (error) {
      if (error instanceof RuntimeValidationError) {
        setFormError(error.issues.join(' '));
        return;
      }
      console.error(error);
      setFormError('The runtime could not be calculated. Review the job and machine fields.');
    }
  };

  const togglePause = () => {
    if (!calculation) return;
    if (isPaused) {
      if (pauseStartTime) {
        const diff = (new Date().getTime() - pauseStartTime.getTime()) / 1000;
        setTotalPauseSeconds(prev => prev + diff);
        logEvent('RESUME', calculation, totalPauseSeconds + diff);
      }
      setIsPaused(false);
      setPauseStartTime(null);
    } else {
      setIsPaused(true);
      setPauseStartTime(new Date());
      logEvent('PAUSE', calculation);
    }
  };

  const logEvent = (eventType: LoggedJob['eventType'], result: CalculationResult, pauseSeconds = totalPauseSeconds) => {
    const id = createId();
    const newLog: LoggedJob = {
      id,
      timestamp: new Date().toISOString(),
      eventType,
      jobDetails,
      machineDetails,
      locations,
      result,
      calculationInputKey,
      totalPauseSeconds: pauseSeconds,
    };
    setHistory((current) => {
      const updatedHistory = [newLog, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
    return id;
  };

  const logActualFinish = () => {
    if (!calculation || !actualEndTimeInput) {
      alert('Enter the actual finish time first.');
      return;
    }

    try {
      const actualMinutes = calculateActualMinutes(
        parseDateTime(jobDetails.jobDate, jobDetails.startTime),
        actualEndTimeInput,
        totalPauseSeconds,
      );
      const comparison = {
        actualMinutes,
        verifiedErrorMinutes: calculation.verifiedBaselineMinutes - actualMinutes,
        batchAwareErrorMinutes: calculation.batchAwareMinutes - actualMinutes,
      };
      const logId = activeCalculationLogId ?? logEvent('CALC', calculation, totalPauseSeconds);
      setActiveCalculationLogId(logId);
      setActualComparison(comparison);
      setHistory((current) => {
        const updated = current.map((job) => job.id === logId ? {
          ...job,
          actualEndTime: actualEndTimeInput,
          ...comparison,
          totalPauseSeconds,
        } : job);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      if (learningEnabled) {
        fetch('/api/learning/outcomes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEventId: logId,
            source: printavoContext ? 'printavo' : 'manual',
            model: calculation.mode,
            garmentType: machineDetails.apparelType,
            quantity: jobDetails.quantity,
            locationCount: locations.length,
            heads: machineDetails.heads,
            rpm: machineDetails.rpm,
            predictedMinutes: calculation.netMinutes,
            actualMinutes,
            stitches: locations.reduce((sum, location) => sum + (location.stitches * location.quantity), 0),
            colors: locations.reduce((sum, location) => sum + location.colors, 0),
            trims: locations.reduce((sum, location) => sum + (location.trims * location.quantity), 0),
          }),
        }).then((response) => {
          if (response.ok) setLearningRefresh((current) => current + 1);
        }).catch(() => undefined);
      }
    } catch (error) {
      if (error instanceof RuntimeValidationError) {
        alert(error.issues.join('\n'));
        return;
      }
      alert('The actual finish time could not be saved.');
    }
  };

  const loadJob = (job: LoggedJob) => {
    const restoredJobDetails = { ...job.jobDetails, quantity: job.jobDetails.quantity ?? Math.max(...job.locations.map(location => location.quantity), 1) };
    const restoredLocations = job.locations.map(normalizeLocation);
    const restoredCalculation = job.result?.mode && job.calculationInputKey ? job.result : null;
    setJobDetails(restoredJobDetails);
    setMachineDetails(job.machineDetails);
    setLocations(restoredLocations);
    setCalculation(restoredCalculation);
    setCalculatedInputKey(restoredCalculation ? job.calculationInputKey ?? null : null);
    setEstimateNotice(job.result && !job.calculationInputKey
      ? 'This saved job predates input tracking. Calculate again to refresh the estimate.'
      : '');
    setTotalPauseSeconds(job.totalPauseSeconds);
    setIsPaused(false);
    setPauseStartTime(null);
    setActiveCalculationLogId(job.id);
    setActualEndTimeInput(job.actualEndTime ?? '');
    setActualComparison(
      job.actualMinutes !== undefined &&
      job.verifiedErrorMinutes !== undefined &&
      job.batchAwareErrorMinutes !== undefined
        ? {
            actualMinutes: job.actualMinutes,
            verifiedErrorMinutes: job.verifiedErrorMinutes,
            batchAwareErrorMinutes: job.batchAwareErrorMinutes,
          }
        : null,
    );
  };

  const chartData = calculation ? [
    { name: 'Setup', value: calculation.breakdown.preparation, color: '#6366f1' },
    { name: 'Handling', value: calculation.breakdown.handling || 0, color: '#8b5cf6' },
    { name: 'Stitch', value: calculation.breakdown.stitching, color: '#10b981' },
    { name: 'Stops', value: calculation.breakdown.colors + (calculation.breakdown.trims || 0) + (calculation.breakdown.reliability || 0), color: '#f59e0b' },
    { name: 'Buffer', value: calculation.breakdown.buffer, color: '#ef4444' },
  ].filter(item => item.value > 0) : [];
  const chartTotal = chartData.reduce((sum, item) => sum + item.value, 0);

  const saveTemplate = (job: LoggedJob) => {
    const name = prompt('Name this template:', job.jobDetails.jobNumber || 'Template');
    if (!name) return;
    const template: JobTemplate = {
      id: createId(),
      name,
      description: `Based on job ${job.jobDetails.jobNumber || 'without an ID'}`,
      machineDetails: job.machineDetails,
      locations: job.locations.map(normalizeLocation),
    };
    setTemplates((current) => {
      const updated = [...current, template];
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const currentProSnapshot: ProJobSnapshot = {
    label: jobDetails.jobNumber ? `Job ${jobDetails.jobNumber}` : `${machineDetails.apparelType} · ${jobDetails.quantity} pieces`,
    jobDetails,
    machineDetails,
    locations,
    printavoOrderId: printavoContext?.orderId,
    printavoVisualId: printavoContext?.visualId,
  };

  return (
    <div className={`${embedded ? 'min-h-0' : 'min-h-screen'} pb-12 bg-slate-50/50`}>
      {!embedded && <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-30">
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
            <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-lg">
              <History className="w-4 h-4" /> Job history
            </button>
            <button
              onClick={() => setIsCalibrationOpen(true)}
              aria-label="Open shop calibration"
              className="ml-2 flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-95"
            >
              <Settings className="w-4 h-4" /> Calibration
            </button>
          </div>
        </div>
      </header>}

      <main id="design-tools" className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
          <div className="lg:col-span-7 space-y-6 md:space-y-10">
            <ProWorkspace
              currentSnapshot={currentProSnapshot}
              onImport={importPrintavoOrder}
              onLoadSavedJob={loadProJob}
              onLearningStatusChange={setLearningEnabled}
            />
            <DesignAnalyzer onAnalysisComplete={(results) => {
              const importedLocations = results.map((result) => ({
                id: result.id,
                designNumber: result.fileName.replace(/\.dst$/i, ''),
                stitches: result.stitches,
                quantity: jobDetails.quantity,
                position: result.assignedPosition,
                colors: result.colors,
                trims: result.trims ?? 0,
                manualStops: 0,
                speedFactor: 1,
                handlingFactor: 1,
                downtimeFactor: 1,
              }));
              setLocations((current) => mergeImportedLocations(current, importedLocations, jobDetails.quantity));
            }} />
            
            <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs md:text-sm font-black text-slate-950 flex items-center gap-3 uppercase tracking-[0.2em]">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div> Production Setup
                </h2>
                {templates.length > 0 && (
                   <select 
                    onChange={(e) => {
                      const template = templates.find((candidate) => candidate.id === e.target.value);
                      if (template) loadTemplate(template);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest border-none bg-indigo-50 text-indigo-600 rounded-lg px-3 py-1 cursor-pointer"
                   >
                     <option value="">Load Template</option>
                     {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                   </select>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operator</label><input type="text" value={jobDetails.userName} onChange={(e) => setJobDetails({...jobDetails, userName: e.target.value})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Job ID</label><input type="text" value={jobDetails.jobNumber} onChange={(e) => setJobDetails({...jobDetails, jobNumber: e.target.value})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</label><input type="date" value={jobDetails.jobDate} onChange={(e) => setJobDetails({...jobDetails, jobDate: e.target.value})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start Time</label><input type="time" value={jobDetails.startTime} onChange={(e) => setJobDetails({...jobDetails, startTime: e.target.value})} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Job quantity</label><input type="number" min="1" step="1" value={jobDetails.quantity} onChange={(e) => updateJobQuantity(Number(e.target.value))} className="w-full rounded-xl border-slate-200 bg-slate-50 text-xs font-bold p-3 border"/></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-10">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xs md:text-sm font-black text-slate-950 flex items-center gap-3 uppercase tracking-[0.2em]"><div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>Machine Configuration</h2>
                <button onClick={() => setIsCalibrationOpen(true)} className="rounded-full bg-indigo-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600">
                  {calibration.mode === 'verified' ? 'DG verified model' : 'Batch-aware model'}
                </button>
              </div>
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
                  <div key={loc.id} className="relative space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Location {index + 1}</p>
                      {locations.length > 1 && <button aria-label={`Remove location ${index + 1}`} onClick={() => removeLocation(loc.id)} className="rounded-full bg-red-500 p-1.5 text-white shadow-md"><Trash2 className="w-3 h-3" /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                      <label className="col-span-2 space-y-1 md:col-span-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Design</span><input type="text" value={loc.designNumber} placeholder="Design #" onChange={(e) => updateLocation(loc.id, 'designNumber', e.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-[10px] font-bold"/></label>
                      <label className="space-y-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Stitches</span><input type="number" min="1" value={loc.stitches} onChange={(e) => updateLocation(loc.id, 'stitches', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 p-2 text-[10px] font-bold"/></label>
                      <label className="space-y-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Quantity</span><input type="number" min="1" step="1" value={loc.quantity} onChange={(e) => updateLocation(loc.id, 'quantity', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 p-2 text-[10px] font-bold"/></label>
                      <label className="space-y-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Colors</span><input type="number" min="1" step="1" value={loc.colors} onChange={(e) => updateLocation(loc.id, 'colors', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 p-2 text-[10px] font-bold"/></label>
                      <label className="col-span-2 space-y-1 md:col-span-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Placement</span><select value={loc.position} onChange={(e) => updateLocation(loc.id, 'position', e.target.value as LocationPosition)} className="w-full rounded-lg border border-slate-200 p-2 text-[10px] font-bold">{Object.values(LocationPosition).map(p => <option key={p} value={p}>{p}</option>)}</select></label>
                    </div>
                    <details className="rounded-xl border border-slate-200/70 bg-white">
                      <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-black text-slate-700 marker:text-indigo-500">Advanced production factors</summary>
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-3 sm:grid-cols-5">
                      <label className="space-y-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Trims / run</span><input type="number" min="0" step="1" value={loc.trims} onChange={(e) => updateLocation(loc.id, 'trims', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 p-2 text-[10px] font-bold"/></label>
                      <label className="space-y-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Manual stops</span><input type="number" min="0" step="1" value={loc.manualStops} onChange={(e) => updateLocation(loc.id, 'manualStops', Number(e.target.value))} className="w-full rounded-lg border border-slate-200 p-2 text-[10px] font-bold"/></label>
                      <label className="space-y-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Design speed</span><div className="relative"><input type="number" min="1" max="100" step="1" value={Math.round(loc.speedFactor * 100)} onChange={(e) => updateLocation(loc.id, 'speedFactor', Number(e.target.value) / 100)} className="w-full rounded-lg border border-slate-200 p-2 pr-6 text-[10px] font-bold"/><span className="absolute right-2 top-2 text-[10px] font-bold text-slate-300">%</span></div></label>
                      <label className="space-y-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Handling</span><div className="relative"><input type="number" min="25" max="500" step="5" value={Math.round(loc.handlingFactor * 100)} onChange={(e) => updateLocation(loc.id, 'handlingFactor', Number(e.target.value) / 100)} className="w-full rounded-lg border border-slate-200 p-2 pr-6 text-[10px] font-bold"/><span className="absolute right-2 top-2 text-[10px] font-bold text-slate-300">%</span></div></label>
                      <label className="space-y-1"><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Break risk</span><div className="relative"><input type="number" min="0" max="500" step="5" value={Math.round(loc.downtimeFactor * 100)} onChange={(e) => updateLocation(loc.id, 'downtimeFactor', Number(e.target.value) / 100)} className="w-full rounded-lg border border-slate-200 p-2 pr-6 text-[10px] font-bold"/><span className="absolute right-2 top-2 text-[10px] font-bold text-slate-300">%</span></div></label>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
            
            {estimateNotice && <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-900">{estimateNotice}</p>}
            {formError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-800">{formError}</p>}
            <button onClick={handleCalculate} className="min-h-14 w-full rounded-2xl bg-indigo-600 px-6 py-4 text-base font-black text-white shadow-xl transition-all hover:bg-indigo-700 active:scale-[0.99]">Calculate production time</button>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className={`rounded-3xl shadow-2xl border p-8 md:p-10 transition-all lg:sticky lg:top-28 ${isPaused ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100'}`}>
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
                  <div className="mb-6 grid grid-cols-2 gap-3">
                    <div className={`rounded-2xl border p-4 ${calculation.mode === 'verified' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">DG verified</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{Math.round(calculation.verifiedBaselineMinutes)} min</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${calculation.mode === 'batch-aware' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Batch-aware</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{Math.round(calculation.batchAwareMinutes)} min</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Machine occupied</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{Math.round(calculation.machineMinutes)} min</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Operator labor</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{Math.round(calculation.operatorMinutes)} min</p>
                    </div>
                  </div>
                  {calculation.warnings.length > 0 && (
                    <div className="mb-6 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      {calculation.warnings.map((warning) => (
                        <div key={warning} className="flex gap-2 text-[10px] font-bold leading-relaxed text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />{warning}</div>
                      ))}
                    </div>
                  )}
                  {learningEnabled && learningSuggestion && (
                    <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-violet-600">Personal planning suggestion</p>
                          <p className="mt-1 text-xs font-bold leading-relaxed text-slate-800">{learningSuggestion.explanation}</p>
                        </div>
                        {learningSuggestion.ready && <p className="shrink-0 text-lg font-black text-violet-700">{Math.round(learningSuggestion.adjustedMinutes)}m</p>}
                      </div>
                      <p className="mt-2 text-[9px] font-semibold text-slate-500">{learningSuggestion.sampleSize} completed runs · {learningSuggestion.confidence} confidence · {learningSuggestion.scope === 'garment' ? `${machineDetails.apparelType} history` : 'shop-wide history'}. This does not change the base estimate.</p>
                    </div>
                  )}
                  <details className="mb-6 rounded-2xl border border-slate-200 bg-slate-50">
                    <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-black text-slate-700 marker:text-indigo-500">After the run: compare actual finish</summary>
                    <div className="border-t border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="flex-1 space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Actual finish</span>
                        <input type="time" value={actualEndTimeInput} onChange={(event) => setActualEndTimeInput(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold" />
                      </label>
                      <button onClick={logActualFinish} className="rounded-xl bg-slate-900 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white">Compare actual</button>
                    </div>
                    <p className="mt-2 text-[9px] font-semibold leading-relaxed text-slate-400">Recorded pauses are removed from the comparison. Overnight finishes roll into the next day.</p>
                    {actualComparison && (
                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4">
                        <div><p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Net actual</p><p className="mt-1 text-sm font-black text-slate-900">{Math.round(actualComparison.actualMinutes)}m</p></div>
                        <div><p className="text-[7px] font-black uppercase tracking-widest text-slate-400">DG error</p><p className="mt-1 text-sm font-black text-indigo-600">{actualComparison.verifiedErrorMinutes >= 0 ? '+' : ''}{Math.round(actualComparison.verifiedErrorMinutes)}m</p></div>
                        <div><p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Batch error</p><p className="mt-1 text-sm font-black text-emerald-600">{actualComparison.batchAwareErrorMinutes >= 0 ? '+' : ''}{Math.round(actualComparison.batchAwareErrorMinutes)}m</p></div>
                      </div>
                    )}
                    </div>
                  </details>
                  <button onClick={togglePause} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg mb-6 flex items-center justify-center gap-3 ${isPaused ? 'bg-amber-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-600'}`}>
                    {isPaused ? <><Play className="w-5 h-5 fill-current"/> Resume</> : <><Pause className="w-5 h-5 fill-current"/> Pause</>}
                  </button>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex h-4 overflow-hidden rounded-full bg-slate-200" aria-label="Runtime breakdown">
                      {chartData.map((item) => (
                        <div
                          key={item.name}
                          title={`${item.name}: ${Math.round(item.value)} minutes`}
                          style={{ backgroundColor: item.color, width: `${(item.value / chartTotal) * 100}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                      {chartData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name} {Math.round(item.value)}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {calculation && <SupplyRecommendations apparelType={machineDetails.apparelType} backingInfo={machineDetails.backingInfo} totalColors={locations.reduce((sum, location) => sum + location.colors, 0)} />}
          </div>
        </div>
      </main>

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onLoad={loadJob} onSaveAsTemplate={saveTemplate} />
      <HowToModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} />
      <CalibrationModal
        isOpen={isCalibrationOpen}
        profile={calibration}
        onClose={() => setIsCalibrationOpen(false)}
        onSave={updateCalibration}
        onReset={() => updateCalibration(DEFAULT_CALIBRATION_PROFILE)}
      />
    </div>
  );
}

export default App;
