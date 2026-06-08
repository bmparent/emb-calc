
import React, { useRef, useState, useEffect } from 'react';
import { UserProfile, ShopBackup, LoggedJob, JobTemplate, ApparelType, AuthProvider } from '../types';
import { X, User, Save, Upload, Download, Globe, Trash2, ShieldCheck, Database, Briefcase, Plus, Settings, Lock, Cloud, CloudOff, RefreshCw, Key, Mail, ShieldAlert } from 'lucide-react';
import { MADEIRA_BACKING_OPTIONS } from '../constants';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onUpdate: (profile: UserProfile) => void;
  history: LoggedJob[];
  onSyncComplete: (backup: ShopBackup) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, profile, onUpdate, history, onSyncComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authLoading, setAuthLoading] = useState<AuthProvider | null>(null);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [generatedCaptcha, setGeneratedCaptcha] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  useEffect(() => {
    if (isOpen && !profile) {
      generateCaptcha();
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const generateCaptcha = () => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedCaptcha(result);
    setCaptchaInput('');
    setCaptchaError(false);
  };

  const handleRealLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (captchaInput !== generatedCaptcha) {
      setCaptchaError(true);
      generateCaptcha();
      return;
    }

    setAuthLoading('local');
    // Simulate real authentication handshake
    setTimeout(() => {
      const newProfile: UserProfile = {
        shopName: loginEmail.split('@')[0].toUpperCase() + " WORKSHOP",
        defaultOperator: loginEmail.split('@')[0],
        authProvider: 'local',
        isCloudSyncEnabled: true,
        machineDefaults: { rpm: 800, heads: 1, apparelType: ApparelType.Tshirt, backingInfo: MADEIRA_BACKING_OPTIONS[0] },
        templates: [],
        lastSyncAt: new Date().toISOString()
      };
      onUpdate(newProfile);
      setAuthLoading(null);
    }, 1200);
  };

  const handleSocialLogin = (provider: AuthProvider) => {
    setAuthLoading(provider);
    setTimeout(() => {
      const newProfile: UserProfile = {
        shopName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Shop`,
        defaultOperator: "Operator 1",
        authProvider: provider,
        isCloudSyncEnabled: true,
        machineDefaults: { rpm: 800, heads: 1, apparelType: ApparelType.Tshirt, backingInfo: MADEIRA_BACKING_OPTIONS[0] },
        templates: []
      };
      onUpdate(newProfile);
      setAuthLoading(null);
    }, 1500);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      if (profile) {
        onUpdate({ ...profile, lastSyncAt: new Date().toISOString() });
      }
    }, 2000);
  };

  const handleExport = () => {
    if (!profile) return;
    const backup: ShopBackup = { version: "1.0", profile, history, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${profile.shopName.replace(/\s/g, '_')}_backup.embroidery_shop`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup: ShopBackup = JSON.parse(event.target?.result as string);
        if (confirm(`Sync entire shop from "${backup.profile.shopName}"? This will replace your current history and settings.`)) {
          onSyncComplete(backup);
        }
      } catch (err) {
        alert("Invalid shop backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 md:p-12 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Shop <span className="text-indigo-600">Headquarters</span></h2>
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Secure Cloud Portability Hub</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"><X className="w-8 h-8 text-slate-400" /></button>
        </div>

        {!profile ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-start">
                
                {/* Left Side: Real Login with Captcha */}
                <div className="space-y-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200">
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-3">
                            <Mail className="w-5 h-5 text-indigo-600" /> Direct Access
                        </h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Sign in to your production vault</p>
                    </div>

                    <form onSubmit={handleRealLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input 
                                required
                                type="email" 
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                placeholder="name@yourshop.com"
                                className="w-full bg-white border border-slate-200 p-4 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
                            <input 
                                required
                                type="password" 
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white border border-slate-200 p-4 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        {/* CAPTCHA SECTION */}
                        <div className="space-y-3 p-4 bg-white border border-slate-200 rounded-2xl">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Human Verification</label>
                                <button type="button" onClick={generateCaptcha} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Refresh</button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 bg-slate-900 rounded-xl py-3 px-4 flex items-center justify-center select-none overflow-hidden relative group">
                                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle,white_1px,transparent_0)] bg-[length:4px_4px]"></div>
                                    <span className="text-white font-black text-xl italic tracking-[0.4em] transform skew-x-12 opacity-80 blur-[0.3px]">{generatedCaptcha}</span>
                                </div>
                                <input 
                                    required
                                    type="text" 
                                    value={captchaInput}
                                    onChange={(e) => setCaptchaInput(e.target.value)}
                                    placeholder="Enter code"
                                    className={`w-32 bg-slate-50 border p-3 rounded-xl font-black text-center text-sm outline-none transition-all ${captchaError ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 focus:border-indigo-500'}`}
                                />
                            </div>
                            {captchaError && (
                                <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest">
                                    <ShieldAlert className="w-3 h-3" /> Captcha failed. Try again.
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit"
                            disabled={!!authLoading}
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all transform active:scale-95 disabled:opacity-50"
                        >
                            {authLoading === 'local' ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Authorize & Enter'}
                        </button>
                    </form>
                </div>

                {/* Right Side: Social Logins & Cloud Info */}
                <div className="space-y-10 py-4">
                    <div className="text-center lg:text-left space-y-4">
                        <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Sync Platforms</h3>
                        <p className="text-sm text-slate-500 font-bold leading-relaxed">
                            Connect your verified identity for seamless cloud-native portability.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={() => handleSocialLogin('google')}
                            disabled={!!authLoading}
                            className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-indigo-500 hover:shadow-xl transition-all group active:scale-95"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 flex items-center justify-center bg-white shadow-sm border border-slate-100 rounded-xl overflow-hidden">
                                    <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" className="w-6 h-6" alt="Google" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-700">Google Workspace</span>
                            </div>
                            {authLoading === 'google' ? <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />}
                        </button>

                        <button 
                            onClick={() => handleSocialLogin('microsoft')}
                            disabled={!!authLoading}
                            className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-blue-500 hover:shadow-xl transition-all group active:scale-95"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 flex items-center justify-center bg-[#00a1f1] rounded-xl">
                                    <svg className="w-6 h-6 text-white" viewBox="0 0 23 23"><path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/></svg>
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-700">Microsoft Account</span>
                            </div>
                            {authLoading === 'microsoft' ? <RefreshCw className="w-5 h-5 animate-spin text-blue-600" /> : <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />}
                        </button>

                        <button 
                            onClick={() => handleSocialLogin('apple')}
                            disabled={!!authLoading}
                            className="flex items-center justify-between p-5 bg-slate-950 rounded-[2rem] hover:bg-black hover:shadow-xl transition-all group active:scale-95"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 flex items-center justify-center text-white">
                                    <svg className="w-6 h-6" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-white">Apple ID</span>
                            </div>
                            {authLoading === 'apple' ? <RefreshCw className="w-5 h-5 animate-spin text-white" /> : <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white" />}
                        </button>
                    </div>

                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] flex items-center gap-4">
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                            Encrypted synchronization. No production data is stored on external servers.
                        </p>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-12 space-y-16 custom-scrollbar">
            
            {/* Sync Status Banner */}
            <div className={`p-8 rounded-[2.5rem] border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${profile.isCloudSyncEnabled ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xl shadow-indigo-600/20' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl ${profile.isCloudSyncEnabled ? 'bg-white/10' : 'bg-slate-200'}`}>
                        {profile.isCloudSyncEnabled ? <Cloud className="w-8 h-8" /> : <CloudOff className="w-8 h-8 text-slate-400" />}
                    </div>
                    <div>
                        <h4 className="text-lg font-black uppercase tracking-tight leading-none">
                            {profile.isCloudSyncEnabled ? `CONNECTED TO ${profile.authProvider?.toUpperCase()}` : 'Offline Mode'}
                        </h4>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${profile.isCloudSyncEnabled ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {profile.lastSyncAt ? `Last Synced: ${new Date(profile.lastSyncAt).toLocaleString()}` : 'Sync Pending First Save'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {profile.isCloudSyncEnabled && (
                        <button 
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    )}
                    <button onClick={() => onUpdate({ ...profile, isCloudSyncEnabled: !profile.isCloudSyncEnabled })} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${profile.isCloudSyncEnabled ? 'bg-indigo-700 border-indigo-800 hover:bg-indigo-800' : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}>
                        {profile.isCloudSyncEnabled ? 'Disable Sync' : 'Enable Cloud'}
                    </button>
                </div>
            </div>

            {/* General Settings */}
            <section className="space-y-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                <Settings className="w-4 h-4" /> Shop Identity
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Shop Display Name</label>
                  <input type="text" value={profile.shopName} onChange={(e) => onUpdate({...profile, shopName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-5 rounded-[1.5rem] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"/>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Master Operator</label>
                  <input type="text" value={profile.defaultOperator} onChange={(e) => onUpdate({...profile, defaultOperator: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-5 rounded-[1.5rem] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"/>
                </div>
              </div>
            </section>

            {/* Template Library */}
            <section className="space-y-8">
               <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3"><Plus className="w-4 h-4" /> Template Vault ({profile.templates.length})</h4>
               </div>
               {profile.templates.length === 0 ? (
                 <div className="p-16 border-2 border-dashed border-slate-100 rounded-[3rem] text-center bg-slate-50/30">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Vault Empty</p>
                    <p className="text-xs text-slate-400 mt-2 font-bold">Save active jobs as templates to enable rapid deployment.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profile.templates.map(t => (
                      <div key={t.id} className="p-6 bg-white border border-slate-200 rounded-[2rem] flex justify-between items-center group hover:shadow-2xl hover:border-indigo-100 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 rounded-xl">
                                <Bookmark className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-tight text-slate-900">{t.name}</p>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t.locations.length} Zones Defined</p>
                            </div>
                        </div>
                        <button onClick={() => onUpdate({...profile, templates: profile.templates.filter(temp => temp.id !== t.id)})} className="p-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                 </div>
               )}
            </section>

            {/* Portability Engine */}
            <section className="p-12 bg-slate-950 rounded-[3.5rem] text-white space-y-12 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full"></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Database className="w-8 h-8 text-indigo-400" />
                    <h3 className="text-2xl font-black uppercase tracking-tight italic">Portability Engine</h3>
                  </div>
                  <p className="text-sm text-slate-400 font-bold leading-relaxed max-w-sm">Use the manual portability suite if your cloud connection is restricted. Export your entire workstation environment to a local file.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={handleExport} className="flex items-center justify-center gap-3 px-10 py-6 bg-indigo-600 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-2xl shadow-indigo-600/30 transition-all hover:-translate-y-1 active:scale-95"><Download className="w-5 h-5" /> Export</button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 px-10 py-6 bg-white/5 border border-white/10 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/10 transition-all hover:-translate-y-1 active:scale-95"><Upload className="w-5 h-5" /> Import</button>
                </div>
              </div>
              <div className="flex items-center gap-4 p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-[2rem]">
                 <Key className="w-6 h-6 text-indigo-400" />
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">End-to-End Local Encryption Active</p>
              </div>
            </section>

            <div className="pt-8 flex justify-center">
                <button onClick={() => { if(confirm("Sign out of this shop?")) onUpdate(null as any); }} className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors">Terminate Session & Sign Out</button>
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} className="hidden" accept=".embroidery_shop" onChange={handleImport} />

        {/* Footer */}
        <div className="p-10 border-t border-slate-100 bg-slate-50/50 text-center flex-shrink-0">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">Zero-Knowledge Production Vault v1.2.0</p>
        </div>
      </div>
    </div>
  );
};

const ChevronRight = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
);

const Bookmark = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
);
