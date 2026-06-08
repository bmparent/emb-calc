import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Upload, Camera, Loader2, Sparkles, X, FileCode, Ruler, Palette, Activity, Check, ExternalLink, ChevronRight, Layers } from 'lucide-react';
import { ApparelType, LocationPosition, DesignAnalysisResult } from '../types';
import { parseDstFile } from '../services/dstParser';
import { MADEIRA_THREAD_INVENTORY, MADEIRA_WEBSITE_URL } from '../constants';

interface PendingDesign extends DesignAnalysisResult {
  id: string;
  fileName: string;
  preview?: string;
  isAnalyzing: boolean;
  assignedPosition: LocationPosition;
}

interface DesignAnalyzerProps {
  onAnalysisComplete: (results: PendingDesign[]) => void;
}

export const DesignAnalyzer: React.FC<DesignAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingDesigns, setPendingDesigns] = useState<PendingDesign[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const newPending: PendingDesign[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      stitches: 0,
      colors: 1,
      apparel: ApparelType.Tshirt,
      isAnalyzing: true,
      assignedPosition: LocationPosition.LeftChest,
    }));

    setPendingDesigns(prev => [...prev, ...newPending]);

    for (const file of Array.from(files)) {
      const pendingId = newPending.find(p => p.fileName === file.name)?.id;
      if (!pendingId) continue;

      try {
        const isDst = file.name.toLowerCase().endsWith('.dst');
        let result: Partial<DesignAnalysisResult> = {};

        if (isDst) {
          result = await analyzeDst(file);
        } else if (file.type.startsWith('image/')) {
          result = await analyzeImage(file);
        }

        updatePendingDesign(pendingId, {
          ...result,
          isAnalyzing: false,
          preview: !isDst ? await fileToDataUrl(file) : undefined
        });
      } catch (error) {
        console.error(`Error analyzing ${file.name}:`, error);
        removePendingDesign(pendingId);
      }
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const analyzeDst = async (file: File): Promise<Partial<DesignAnalysisResult>> => {
    const dstData = await parseDstFile(file);
    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || '' });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `Analyze DST: ${dstData.stitches} stitches, ${dstData.colors} colors, ${dstData.widthMm}x${dstData.heightMm}mm. Suggest apparel type (enum: ${Object.values(ApparelType).join(',')}) and 1 advice sentence.` }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              apparel: { type: Type.STRING, enum: Object.values(ApparelType) },
              advice: { type: Type.STRING }
            }
          }
        }
      });
      const aiResult = JSON.parse(response.text || "{}");
      return {
        stitches: dstData.stitches,
        colors: dstData.colors,
        apparel: aiResult.apparel as ApparelType,
        widthMm: dstData.widthMm,
        heightMm: dstData.heightMm,
        aiAdvice: aiResult.advice
      };
    } catch {
      return { stitches: dstData.stitches, colors: dstData.colors, widthMm: dstData.widthMm, heightMm: dstData.heightMm };
    }
  };

  const analyzeImage = async (file: File): Promise<Partial<DesignAnalysisResult>> => {
    const base64Data = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => resolve((r.result as string).split(',')[1]);
    });

    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: file.type, data: base64Data } },
          { text: "Estimate stitches, colors, and apparel type for this embroidery design. Return JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stitches: { type: Type.INTEGER },
            colors: { type: Type.INTEGER },
            apparel: { type: Type.STRING, enum: Object.values(ApparelType) },
            advice: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  };

  const updatePendingDesign = (id: string, updates: Partial<PendingDesign>) => {
    setPendingDesigns(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePendingDesign = (id: string) => {
    setPendingDesigns(prev => prev.filter(p => p.id !== id));
  };

  const handleApplyAll = () => {
    onAnalysisComplete(pendingDesigns.filter(p => !p.isAnalyzing));
    setPendingDesigns([]);
  };

  return (
    <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-6 md:mb-8">
      <div className="bg-[#0f172a] px-4 md:px-8 py-3 md:py-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-1.5 md:p-2 bg-indigo-500 rounded-lg md:rounded-xl">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.15em] md:tracking-[0.2em]">Smart Design Engine</h3>
            <p className="text-[8px] md:text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-0.5">Batch DST & Image Processing</p>
          </div>
        </div>
        {pendingDesigns.length > 0 && (
          <button 
            onClick={handleApplyAll}
            className="flex items-center gap-1.5 px-4 md:px-6 py-1.5 md:py-2 bg-indigo-600 hover:bg-indigo-700 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
          >
            Load to Job <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
          </button>
        )}
      </div>

      <div className="p-4 md:p-8">
        {pendingDesigns.length === 0 ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-4 border-dashed rounded-[1.5rem] md:rounded-[2.5rem] h-32 md:h-48 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group
              ${isDragOver 
                ? 'border-indigo-500 bg-indigo-50 scale-[0.98]' 
                : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}`}
          >
            <div className="p-3 md:p-5 bg-indigo-50 rounded-full mb-2 md:mb-4 group-hover:scale-110 transition-transform shadow-sm">
               <Upload className="w-5 h-5 md:w-7 md:h-7 text-indigo-600" />
            </div>
            <p className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">
              Upload <span className="text-indigo-600">Multiple Files</span>
            </p>
            <p className="text-[8px] md:text-[10px] text-slate-400 mt-1 md:mt-2 font-bold uppercase tracking-[0.1em] md:tracking-[0.15em]">Drag .DST or Images</p>
            <input 
              ref={fileInputRef}
              type="file" 
              multiple
              accept=".dst,image/*"
              className="hidden" 
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {pendingDesigns.map((design) => (
                <div key={design.id} className="relative group bg-slate-50 border border-slate-200 rounded-xl md:rounded-[2rem] p-4 md:p-6 transition-all hover:shadow-xl hover:-translate-y-1">
                  <button 
                    onClick={() => removePendingDesign(design.id)}
                    className="absolute top-3 right-3 p-1.5 bg-white text-slate-400 hover:text-red-500 rounded-full shadow-sm border border-slate-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex gap-4 md:gap-5 mb-4 md:mb-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl md:rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                      {design.isAnalyzing ? (
                        <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-indigo-400" />
                      ) : design.preview ? (
                        <img src={design.preview} className="w-full h-full object-cover" />
                      ) : (
                        <FileCode className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[10px] md:text-xs font-black text-slate-900 uppercase truncate mb-1 pr-6">{design.fileName}</h4>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                         <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                           {design.isAnalyzing ? 'Analyzing...' : design.apparel}
                         </span>
                         <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-[8px] md:text-[9px] font-black text-indigo-600 uppercase tracking-tighter">
                           {design.stitches.toLocaleString()} Stitches
                         </span>
                      </div>
                    </div>
                  </div>

                  {!design.isAnalyzing && (
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-sm">
                        <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-600" />
                        <div className="flex-1">
                          <label className="block text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Target Location</label>
                          <select 
                            value={design.assignedPosition}
                            onChange={(e) => updatePendingDesign(design.id, { assignedPosition: e.target.value as LocationPosition })}
                            className="w-full text-[10px] md:text-[11px] font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                          >
                            {Object.values(LocationPosition).map(pos => (
                              <option key={pos} value={pos}>{pos}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {design.aiAdvice && (
                        <div className="flex gap-2.5 md:gap-3 items-start p-3 md:p-4 bg-indigo-50/50 rounded-xl md:rounded-2xl border border-indigo-100">
                          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500 flex-shrink-0" />
                          <p className="text-[9px] md:text-[10px] text-indigo-900 font-bold leading-relaxed">
                            {design.aiAdvice}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-center pt-4 md:pt-8">
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 md:gap-3 px-8 md:px-12 py-3.5 md:py-5 bg-white border-2 border-slate-100 rounded-xl md:rounded-[2rem] text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-xl font-black text-[10px] md:text-[12px] uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all transform active:scale-95 group"
               >
                 <Upload className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                 Add More Files
               </button>
               <input 
                  ref={fileInputRef}
                  type="file" 
                  multiple
                  accept=".dst,image/*"
                  className="hidden" 
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
