import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, X, Bot, Loader2 } from 'lucide-react';
import { JobDetails, MachineDetails, LocationInfo, CalculationResult } from '../types';
import { MADEIRA_THREAD_INVENTORY } from '../constants';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  jobDetails: JobDetails;
  machineDetails: MachineDetails;
  locations: LocationInfo[];
  calculation: CalculationResult | null;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
  jobDetails, 
  machineDetails, 
  locations, 
  calculation 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "I've analyzed your current job and your Madeira thread inventory. How can I help you optimize this run?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      
      const context = {
        apparel: machineDetails.apparelType,
        rpm: machineDetails.rpm,
        totalStitches: locations.reduce((acc, l) => acc + (l.stitches * l.quantity), 0),
        inventory: JSON.stringify(MADEIRA_THREAD_INVENTORY)
      };

      const systemInstruction = `You are an Embroidery Consultant. 
      CONTEXT: ${context.apparel} @ ${context.rpm} RPM. 
      INVENTORY: ${context.inventory}. 
      When suggesting colors, ALWAYS try to pick a Madeira number from the provided inventory. 
      Keep answers technical and concise.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: `System Instruction: ${systemInstruction}\n\nUser Question: ${userMessage}` }] }
        ],
      });

      const aiResponse = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to AI knowledge base." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 z-40 ${
          isOpen ? 'scale-0' : 'scale-100'
        } bg-gradient-to-tr from-indigo-600 to-purple-600 text-white`}
      >
        <Sparkles className="w-6 h-6" />
      </button>

      <div className={`fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all transform z-50 overflow-hidden border border-indigo-50 ${
        isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'
      }`}>
        <div className="p-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div><h3 className="text-sm font-bold leading-none">Embroidery AI</h3><span className="text-[10px] text-indigo-200">Inventory Aware</span></div>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-700 shadow-sm rounded-tl-none'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && <div className="flex justify-start"><div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm"><Loader2 className="w-4 h-4 animate-spin text-indigo-600" /></div></div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t bg-white flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask about thread matches..." className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
          <button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors"><Send className="w-5 h-5" /></button>
        </div>
      </div>
    </>
  );
};
