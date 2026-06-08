import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2, Lightbulb, AlertCircle, CheckCircle2 } from 'lucide-react';
import { JobDetails, MachineDetails, LocationInfo, CalculationResult } from '../types';

interface AIInsightsPanelProps {
  machineDetails: MachineDetails;
  locations: LocationInfo[];
  calculation: CalculationResult | null;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ 
  machineDetails, 
  locations, 
  calculation 
}) => {
  const [insight, setInsight] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (calculation) {
      generateInsights();
    } else {
      setInsight([]);
    }
  }, [calculation]);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const totalStitches = locations.reduce((acc, l) => acc + (l.stitches * l.quantity), 0);
      const avgStitchesPerLoc = totalStitches / (locations.length || 1);

      const prompt = `As an embroidery expert, provide exactly 3 brief, technical production tips for this job:
      - Apparel: ${machineDetails.apparelType}
      - RPM: ${machineDetails.rpm}
      - Avg Stitches per Location: ${avgStitchesPerLoc}
      - Total Stitches: ${totalStitches}
      - Backing: ${machineDetails.backingInfo || 'Unspecified'}

      Focus on: Needle type/size, Backing weight, and RPM efficiency. Format as a simple list of 3 items, no headers.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = response.text || "";
      const lines = text.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
      setInsight(lines);
    } catch (error) {
      console.error("AI Insight Error:", error);
      setInsight(["Could not load AI insights. Check your connection."]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!calculation && !isLoading) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-3 border-b border-indigo-100 flex justify-between items-center">
        <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          AI Production Insights
        </h3>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
      </div>
      
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-100 rounded animate-pulse w-4/6"></div>
          </div>
        ) : (
          <ul className="space-y-4">
            {insight.map((line, i) => (
              <li key={i} className="flex gap-3 items-start group">
                <div className="mt-1 flex-shrink-0">
                  {i === 0 ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                   i === 1 ? <Lightbulb className="w-4 h-4 text-amber-500" /> : 
                   <AlertCircle className="w-4 h-4 text-indigo-500" />}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                  {line.replace(/^[*-•\d.]+\s*/, '')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="px-5 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 italic">
          Insights generated based on real-time job complexity and apparel physics.
        </p>
      </div>
    </div>
  );
};
