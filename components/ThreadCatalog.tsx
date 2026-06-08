import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { MADEIRA_THREAD_INVENTORY, MADEIRA_WEBSITE_URL } from '../constants';
import { X, Search, ExternalLink, Hash, Info, Palette, Sparkles, Loader2, ArrowRight, Pipette, CheckCircle2, Globe, AlertCircle, ExternalLink as LinkIcon } from 'lucide-react';

interface ThreadCatalogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroundingSource {
  title: string;
  uri: string;
}

interface ThreadDetail {
  number: string;
  category: string;
  hex: string;
  pmsMatch?: string;
  description: string;
  link: string;
  reasoning?: string;
  sources?: GroundingSource[];
}

export const ThreadCatalog: React.FC<ThreadCatalogProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pmsInput, setPmsInput] = useState('');
  const [hexInput, setHexInput] = useState('');
  const [toolMode, setToolMode] = useState<'pms' | 'hex'>('pms');
  const [isMatching, setIsMatching] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = Object.entries(MADEIRA_THREAD_INVENTORY);
  
  const filteredCategories = categories.map(([category, threads]) => {
    const filteredThreads = threads.filter(t => 
      t.toLowerCase().includes(searchTerm.toLowerCase()) || 
      category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return [category, filteredThreads] as [string, string[]];
  }).filter(([_, threads]) => threads.length > 0);

  const fetchThreadDetail = async (threadNum: string, category: string) => {
    setIsLoadingDetail(true);
    setError(null);
    setSelectedThread(null);
    
    const cleanNum = threadNum.split(' ')[0].replace('#', ''); 
    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
    
    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hex: { type: Type.STRING, description: "Official HEX code (e.g. #C41E3A)" },
          pmsMatch: { type: Type.STRING, description: "Official PMS match (e.g. 185 C)" },
          description: { type: Type.STRING, description: "Color name/description" },
          reasoning: { type: Type.STRING, description: "Technical extraction notes" }
        },
        required: ["hex", "pmsMatch", "description"]
      }
    };

    const promptText = `Find the official technical specifications for Madeira Polyneon #40 thread #${cleanNum}. 
    Search the official product page specifically: https://www.madeirausa.com/918-${cleanNum}-madeira-polyneon-40.html. 
    You must extract the Official HEX color code and the Official PMS (Pantone) match listed on the page. 
    Return the result strictly as JSON.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        config: { ...config, tools: [{ googleSearch: {} }] }
      });

      const text = response.text?.trim();
      if (!text || text === "{}") {
        setError("No official data found for this thread number.");
        return;
      }

      const data = JSON.parse(text);
      const rawSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: GroundingSource[] = rawSources
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({ title: chunk.web.title || "Madeira Official Source", uri: chunk.web.uri }));

      setSelectedThread({
        number: threadNum,
        category,
        link: `https://www.madeirausa.com/918-${cleanNum}-madeira-polyneon-40.html`,
        sources,
        ...data
      });
    } catch (e) {
      console.error("Grounding Error:", e);
      setError("Unable to retrieve official data from Madeira's live database.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleColorMatch = async () => {
    const input = toolMode === 'pms' ? pmsInput : hexInput;
    if (!input.trim()) return;
    
    setIsMatching(true);
    setError(null);
    setSelectedThread(null);

    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
    const inventory = JSON.stringify(MADEIRA_THREAD_INVENTORY);

    const config = { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.STRING },
          category: { type: Type.STRING },
          hex: { type: Type.STRING },
          pmsMatch: { type: Type.STRING },
          description: { type: Type.STRING },
          reasoning: { type: Type.STRING }
        },
        required: ["number", "category", "hex", "pmsMatch"]
      }
    };

    const prompt = toolMode === 'pms' 
      ? `Identify the closest Madeira Polyneon #40 thread matching Pantone PMS "${input}" from this inventory: ${inventory}. 
         Use search grounding to verify the best match and its specs from madeirausa.com. Return JSON.`
      : `Identify the closest Madeira Polyneon #40 thread matching Hex color "${input}" from this inventory: ${inventory}. 
         Use search grounding to verify the best match and its specs from madeirausa.com. Return JSON.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { ...config, tools: [{ googleSearch: {} }] }
      });
      
      const text = response.text?.trim();
      if (!text || text === "{}") {
        setError("No matching thread found in the official inventory.");
        return;
      }
      
      const data = JSON.parse(text);
      const cleanNum = data.number.split(' ')[0].replace('#', '');
      setSelectedThread({ 
        ...data, 
        link: `https://www.madeirausa.com/918-${cleanNum}-madeira-polyneon-40.html` 
      });
    } catch (e) {
      setError("Grounding search failed. Please try again.");
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-white rounded-2xl md:rounded-[3.5rem] shadow-2xl w-full max-w-7xl h-[98vh] md:h-[95vh] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        
        {/* Cinematic Header */}
        <div className="p-4 md:p-10 bg-[#050608] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/5 pointer-events-none"></div>
          <div className="flex items-center gap-4 md:gap-8 relative z-10">
            <div className="p-3 md:p-6 bg-indigo-600 rounded-2xl md:rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(79,70,229,0.5)]">
              <Palette className="w-6 h-6 md:w-12 md:h-12 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-4xl font-black tracking-tighter uppercase italic leading-none flex items-center gap-3 md:gap-4">
                Madeira <span className="text-indigo-400">Pro</span> Lab
              </h2>
              <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-4">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-[8px] md:text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">Live Grounding Only</p>
                </div>
                <div className="h-3 md:h-4 w-px bg-white/10"></div>
                <p className="text-[8px] md:text-[11px] text-indigo-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">Polyneon #40 Catalog</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-5 relative z-10">
            <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-6 md:h-6 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text"
                placeholder="Filter inventory..."
                className="pl-10 md:pl-16 pr-4 md:pr-8 py-3 md:py-5 rounded-xl md:rounded-[2rem] bg-white/5 border border-white/10 text-xs md:text-base focus:bg-white focus:text-slate-900 outline-none w-full md:w-[400px] transition-all font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={onClose} className="bg-white/5 hover:bg-white/10 p-3 md:p-5 rounded-xl md:rounded-[2rem] transition-all active:scale-95 group">
              <X className="w-5 h-5 md:w-8 md:h-8 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        {/* Dynamic Studio Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
          
          {/* Main Inventory Catalog */}
          <div className="flex-1 overflow-y-auto p-4 md:p-14 bg-slate-50/50 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-14">
              {filteredCategories.map(([category, threads]) => (
                <div key={category} className="space-y-4 md:space-y-8">
                  <div className="flex items-center gap-3 md:gap-5">
                    <div className="w-1.5 md:w-2.5 h-6 md:h-8 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30"></div>
                    <span className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-[0.15em] md:tracking-[0.25em] truncate">{category}</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-4">
                    {threads.map(thread => (
                      <button 
                        key={thread} 
                        onClick={() => fetchThreadDetail(thread, category)}
                        disabled={isLoadingDetail}
                        className={`group relative flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-4 rounded-lg md:rounded-[1.5rem] transition-all duration-300 font-black text-[9px] md:text-xs border tracking-tight
                          ${selectedThread?.number === thread 
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xl shadow-indigo-500/30 -translate-y-0.5 md:-translate-y-1' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:shadow-lg active:scale-95'
                          }`}
                      >
                        <Hash className={`w-3 h-3 md:w-4 md:h-4 ${selectedThread?.number === thread ? 'text-indigo-200' : 'text-slate-300 group-hover:text-indigo-400'}`} />
                        {thread}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Forensic Color Sidebar */}
          <div className="w-full md:w-[500px] h-2/3 md:h-auto bg-white border-t md:border-t-0 md:border-l border-slate-100 flex flex-col shadow-[-40px_0_100px_rgba(0,0,0,0.04)] z-10 overflow-hidden">
            
            <div className="p-6 md:p-12 flex-1 overflow-y-auto space-y-8 md:space-y-14 custom-scrollbar">
                {/* TOOLBOX */}
                <div className="space-y-6 md:space-y-10">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-indigo-50 rounded-xl">
                            <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-indigo-600" />
                        </div>
                        <h3 className="text-[10px] md:text-sm font-black text-slate-950 uppercase tracking-[0.2em]">Live Matcher</h3>
                    </div>
                    
                    <div className="flex p-1.5 md:p-2 bg-slate-100/60 rounded-2xl md:rounded-[2.5rem] border border-slate-200/50">
                        <button 
                            onClick={() => setToolMode('pms')}
                            className={`flex-1 py-3 md:py-4 text-[9px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.15em] rounded-xl md:rounded-[1.75rem] transition-all ${toolMode === 'pms' ? 'bg-white text-indigo-600 shadow-lg md:shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            PMS Matcher
                        </button>
                        <button 
                            onClick={() => setToolMode('hex')}
                            className={`flex-1 py-3 md:py-4 text-[9px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.15em] rounded-xl md:rounded-[1.75rem] transition-all ${toolMode === 'hex' ? 'bg-white text-indigo-600 shadow-lg md:shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Hex Matcher
                        </button>
                    </div>

                    <div className="relative group">
                        <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2">
                            {toolMode === 'pms' ? <Pipette className="w-4 h-4 md:w-6 md:h-6 text-slate-400" /> : <div className="w-5 h-5 md:w-7 md:h-7 rounded-lg md:rounded-xl shadow-inner border border-slate-300/50" style={{ backgroundColor: hexInput.startsWith('#') ? hexInput : '#e2e8f0' }}></div>}
                        </div>
                        <input 
                            type="text" 
                            placeholder={toolMode === 'pms' ? "e.g. 185 C" : "e.g. #C41E3A"} 
                            value={toolMode === 'pms' ? pmsInput : hexInput}
                            onChange={(e) => toolMode === 'pms' ? setPmsInput(e.target.value) : setHexInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleColorMatch()}
                            className="w-full pl-12 md:pl-16 pr-16 md:pr-20 py-4 md:py-6 bg-slate-50 border border-slate-200 rounded-xl md:rounded-[2rem] text-sm md:text-base font-black focus:ring-8 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                        />
                        <button 
                            onClick={handleColorMatch}
                            disabled={isMatching || (toolMode === 'pms' ? !pmsInput : !hexInput)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 md:p-4 bg-indigo-600 text-white rounded-lg md:rounded-[1.5rem] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50 active:scale-95"
                        >
                            {isMatching ? <Loader2 className="w-5 h-5 md:w-7 md:h-7 animate-spin" /> : <ArrowRight className="w-5 h-5 md:w-7 md:h-7" />}
                        </button>
                    </div>
                </div>

                {/* THREAD SPECS */}
                {isLoadingDetail || isMatching ? (
                    <div className="flex flex-col items-center justify-center py-20 md:py-40 text-center space-y-6 md:space-y-8">
                        <div className="relative">
                          <Loader2 className="w-12 h-12 md:w-20 md:h-20 animate-spin text-indigo-100" />
                          <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 md:w-8 md:h-8 text-indigo-500 animate-pulse" />
                        </div>
                        <div className="space-y-2 md:space-y-3">
                          <h4 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] md:tracking-[0.3em]">Querying Madeira</h4>
                          <p className="text-[9px] md:text-[11px] text-slate-400 font-bold uppercase tracking-widest">Accessing Production Data Hub...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 md:py-40 text-center space-y-4 md:space-y-6">
                        <div className="p-5 md:p-8 bg-red-50 rounded-2xl md:rounded-[3rem]">
                           <AlertCircle className="w-10 h-10 md:w-16 md:h-16 text-red-400" />
                        </div>
                        <div className="space-y-1 md:space-y-2">
                           <h4 className="text-[10px] md:text-sm font-black text-slate-950 uppercase tracking-[0.15em] md:tracking-[0.2em]">No Results Found</h4>
                           <p className="text-[9px] md:text-[11px] text-slate-500 font-bold leading-relaxed">{error}</p>
                        </div>
                    </div>
                ) : selectedThread ? (
                    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-right-10 duration-700">
                        {/* SWATCH */}
                        <div className="relative group/swatch">
                            <div className="h-48 md:h-80 w-full rounded-3xl md:rounded-[4rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border-[8px] md:border-[12px] border-white overflow-hidden flex flex-col justify-end p-6 md:p-10 transition-all group-hover/swatch:scale-[1.02] md:group-hover/swatch:scale-[1.05]" style={{ backgroundColor: selectedThread.hex }}>
                                <div className="bg-black/60 backdrop-blur-3xl rounded-xl md:rounded-[2rem] p-4 md:p-6 flex justify-between items-center text-white border border-white/20">
                                    <div className="flex flex-col gap-3 md:gap-4">
                                       <div className="flex items-center gap-2 md:gap-3">
                                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg border-2 border-white/50 shadow-inner" style={{ backgroundColor: selectedThread.hex }}></div>
                                          <div className="flex flex-col">
                                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] opacity-60">Hex</span>
                                            <span className="text-xs md:text-base font-black tracking-widest leading-none">{selectedThread.hex.toUpperCase()}</span>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-2 md:gap-3">
                                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg border-2 border-white/30 bg-white/10 flex items-center justify-center text-[8px] md:text-[10px] font-black">PMS</div>
                                          <div className="flex flex-col">
                                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] opacity-60">PMS Identity</span>
                                            <span className="text-xs md:text-base font-black tracking-widest leading-none">{selectedThread.pmsMatch || "N/A"}</span>
                                          </div>
                                       </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SPECS */}
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex items-center justify-between">
                              <h4 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950">#{selectedThread.number.replace('#', '')}</h4>
                              <span className="px-3 md:px-5 py-1.5 md:py-2 bg-indigo-50 rounded-full text-[9px] md:text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] md:tracking-[0.25em]">{selectedThread.category}</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold text-slate-600 leading-tight">{selectedThread.description}</p>
                            
                            {selectedThread.reasoning && (
                                <div className="p-6 md:p-8 bg-slate-50 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100">
                                  <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4 text-indigo-600">
                                    <Info className="w-4 h-4 md:w-5 md:h-5" />
                                    <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em]">Production Data</span>
                                  </div>
                                  <p className="text-[12px] md:text-[14px] text-slate-600 font-medium leading-relaxed italic">
                                    "{selectedThread.reasoning}"
                                  </p>
                                </div>
                            )}

                            {selectedThread.sources && selectedThread.sources.length > 0 && (
                              <div className="space-y-3 md:space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <Globe className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                                  <span className="text-[9px] md:text-[11px] font-black text-emerald-600 uppercase tracking-widest">Verification Source</span>
                                </div>
                                <div className="space-y-1.5 md:space-y-2">
                                  {selectedThread.sources.map((src, i) => (
                                    <a 
                                      key={i} 
                                      href={src.uri} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="flex items-center gap-2 text-[10px] md:text-[11px] text-slate-400 hover:text-indigo-600 transition-colors truncate font-medium underline decoration-slate-200 underline-offset-4"
                                    >
                                      <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                      {src.uri}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>

                        <div className="pt-4 md:pt-8 space-y-4 md:space-y-5">
                            <a 
                                href={selectedThread.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-4 md:gap-5 py-5 md:py-7 bg-slate-950 text-white rounded-2xl md:rounded-[2.5rem] font-black text-xs md:text-sm uppercase tracking-[0.3em] md:tracking-[0.4em] hover:bg-black shadow-xl transition-all hover:-translate-y-1 active:scale-95"
                            >
                                Shop MadeiraUSA
                                <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-8 md:px-16 space-y-6 md:space-y-10 opacity-30 py-20 md:py-32 grayscale">
                        <div className="p-10 md:p-16 bg-slate-100 rounded-[3rem] md:rounded-[5rem]">
                          <Pipette className="w-20 h-20 md:w-32 md:h-32 text-indigo-600" />
                        </div>
                        <div className="space-y-2 md:space-y-4">
                          <h4 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-slate-950">Laboratory Standby</h4>
                          <p className="text-[9px] md:text-xs text-slate-500 font-bold uppercase leading-relaxed tracking-[0.1em] md:tracking-[0.2em]">
                            Select a thread from inventory or search a color to begin live grounding verification.
                          </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 md:p-10 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between flex-shrink-0">
                <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em]">Precision Grounding v5.2</span>
                <a 
                    href={MADEIRA_WEBSITE_URL} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[8px] md:text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] md:tracking-[0.4em] hover:text-indigo-800 transition-colors"
                >
                    Visit Catalog
                </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
