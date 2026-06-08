import React from 'react';
import { X, HelpCircle, Settings, Layout, Play, CheckCircle, Info, Calculator, Clock, Sparkles, MessageSquare, Palette, Globe, Target, Layers } from 'lucide-react';

interface HowToModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToModal: React.FC<HowToModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: "1. Job & Machine Setup",
      icon: <Settings className="w-5 h-5 text-indigo-500" />,
      content: "Start by entering your name and job ID for logging. Configure your Machine RPM and number of active heads. Pro Tip: Use the 'Backing' dropdown to select official Madeira E-Zee stabilizers for the job."
    },
    {
      title: "2. Batch Design Analysis",
      icon: <Layers className="w-5 h-5 text-purple-500" />,
      content: "Upload one or more Tajima .DST files or design photos at once. The AI analyzes the binary/visual data to extract stitch counts, color stops, and dimensions for every file in the batch."
    },
    {
      title: "3. Location Mapping",
      icon: <Target className="w-5 h-5 text-indigo-600" />,
      content: "Once analyzed, assign each design to its specific garment location (e.g., 'Left Chest', 'Back') using the analyzer dropdown. Hit 'Load to Job' to automatically populate the job matrix with all mapped designs."
    },
    {
      title: "4. Precision Thread Lab",
      icon: <Palette className="w-5 h-5 text-emerald-500" />,
      content: "Select threads from the Madeira Polyneon #40 catalog to activate 'AI Grounding'. The system performs a live manufacturer scan to fetch verified HEX colors and scientific PMS matches."
    },
    {
      title: "5. Real-Time Production",
      icon: <Play className="w-5 h-5 text-indigo-500" />,
      content: "Hit 'Generate Runtime Matrix'. If production stops for thread breaks, click 'Pause'. The 'Adjusted Finish' time will dynamically shift forward, accounting for downtime in real-time."
    }
  ];

  const aiExamples = [
    "What Madeira thread matches Pantone 185 C?",
    "Best backing for 5oz performance polyester?",
    "Batch load 3 DST files and suggest needle sizes.",
    "Recommend a high-tenacity thread for high-speed runs."
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-white rounded-3xl md:rounded-[3.5rem] shadow-2xl w-full max-w-3xl h-[98vh] md:max-h-[92vh] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 md:p-10 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="p-3 md:p-4 bg-indigo-600 rounded-xl md:rounded-[1.5rem] shadow-2xl shadow-indigo-500/30">
              <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                Production <span className="text-indigo-600">Protocol</span>
              </h2>
              <p className="text-[9px] md:text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1 md:mt-2">V5.1 Multi-Location Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-all bg-white p-2.5 md:p-3 rounded-xl border border-slate-200 shadow-sm active:scale-90">
            <X className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto p-6 md:p-12 space-y-12 md:space-y-16 custom-scrollbar flex-1">
          
          {/* Main Steps */}
          <div className="grid grid-cols-1 gap-10 md:gap-12">
            {sections.map((s, i) => (
              <div key={i} className="flex gap-6 md:gap-8 group">
                <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center transition-all group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:scale-110 shadow-sm">
                  {s.icon}
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight">{s.title}</h3>
                  <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-bold">
                    {s.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* New Batch Feature Highlight */}
          <div className="bg-[#0f172a] rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 md:w-80 md:h-80 bg-indigo-500/20 blur-[80px] md:blur-[100px] pointer-events-none"></div>
            <div className="relative z-10 space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 md:gap-4">
                <Layers className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                <h4 className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-indigo-200">Smart Batch Processing</h4>
              </div>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed font-bold">
                Streamline setup by dragging multiple <span className="text-white">.DST files</span> into the analyzer. Assign each design to its location (Left Chest, Back, etc.) instantly. Stitches and color counts are populated automatically, cutting job entry time by <span className="text-indigo-400 underline decoration-indigo-500/50 underline-offset-8 decoration-4">70%</span>.
              </p>
            </div>
          </div>

          {/* Calculation Methodology */}
          <div className="bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] p-8 md:p-10 border border-slate-200">
            <h4 className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] md:tracking-[0.4em] mb-8 md:mb-10 flex items-center gap-3 md:gap-4">
              <Calculator className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
              Core Production Logic
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-10">
              <div className="space-y-1.5 md:space-y-2">
                <span className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">RPM Optimization</span>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold leading-relaxed">Runs at 85% efficiency to factor in acceleration curves and trim cycles.</p>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <span className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">Thread Reliability</span>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold leading-relaxed">+15s delay integrated per 1k stitches for automated thread break estimation.</p>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <span className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">Multi-Head Logic</span>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold leading-relaxed">Time is divided proportionally across active heads for parallel production.</p>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <span className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">Shift Buffer</span>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold leading-relaxed">33% contingency applied to the gross subtotal for operator fatigue.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6 p-6 md:p-8 bg-amber-50 border border-amber-100 rounded-2xl md:rounded-[2rem]">
            <Info className="w-6 h-6 md:w-8 md:h-8 text-amber-500 flex-shrink-0" />
            <p className="text-[10px] md:text-xs text-amber-900 font-black leading-relaxed uppercase tracking-widest">
              CAUTION: ALWAYS VERIFY AI STITCH ESTIMATES AGAINST YOUR DESIGN SOFTWARE BEFORE FINAL QUOTING.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-10 border-t border-slate-100 bg-white flex justify-center flex-shrink-0">
          <button 
            onClick={onClose}
            className="w-full md:w-80 py-5 md:py-6 bg-indigo-600 text-white rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] hover:bg-indigo-700 shadow-2xl shadow-indigo-500/40 transition-all hover:-translate-y-1 active:scale-95"
          >
            Acknowledge & Start
          </button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};
