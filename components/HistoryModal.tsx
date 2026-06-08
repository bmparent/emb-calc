
import React from 'react';
import { LoggedJob } from '../types';
import { X, Clock, PlayCircle, Bookmark } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: LoggedJob[];
  onLoad: (job: LoggedJob) => void;
  onSaveAsTemplate: (job: LoggedJob) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onLoad, onSaveAsTemplate }) => {
  if (!isOpen) return null;

  const uniqueJobs = history.reduce((acc, job) => {
    if (job.eventType === 'CALC') acc.push(job);
    return acc;
  }, [] as LoggedJob[]).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="flex justify-between items-center p-10 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-2xl">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Job <span className="text-indigo-600">Archives</span></h2>
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Verified Production Log</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"><X className="w-8 h-8 text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-auto p-0 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Job #</th>
                <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
                <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Run Time</th>
                <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Setup</th>
                <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uniqueJobs.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs">No saved job records.</td></tr>
              ) : (
                uniqueJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-indigo-50/50 transition-all group">
                    <td className="p-8">
                      <p className="text-sm font-black text-slate-950 uppercase tracking-tight">{job.jobDetails.jobNumber || 'UNNAMED'}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">{new Date(job.timestamp).toLocaleDateString()}</p>
                    </td>
                    <td className="p-8 text-xs font-bold text-slate-600 uppercase tracking-widest">{job.jobDetails.userName}</td>
                    <td className="p-8">
                      <span className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                        {job.result ? `${Math.round(job.result.netMinutes)} MINS` : '-'}
                      </span>
                    </td>
                    <td className="p-8">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{job.locations.length} Zones</p>
                      <p className="text-[9px] text-slate-400 font-bold">{job.machineDetails.heads} Heads @ {job.machineDetails.rpm} RPM</p>
                    </td>
                    <td className="p-8">
                      <div className="flex gap-3">
                        <button onClick={() => { onLoad(job); onClose(); }} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95"><PlayCircle className="w-4 h-4" /> Load</button>
                        <button onClick={() => onSaveAsTemplate(job)} className="p-3 bg-white border border-slate-200 rounded-xl hover:text-indigo-600 transition-all active:scale-95"><Bookmark className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
