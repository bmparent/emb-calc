import { useEffect, useState } from 'react';
import { Cloud, KeyRound, Link2, LockKeyhole, RefreshCw, Save, Sparkles } from 'lucide-react';
import type { ProJobSnapshot } from '../types';
import type { PrintavoCalculatorImport } from '../shared/printavoMapping';

interface SessionResponse {
  configured: boolean;
  signedIn: boolean;
  user?: { email: string; learningEnabled: boolean };
  subscription?: { active: boolean; status: string; currentPeriodEnd: string | null };
  printavo?: { connected: boolean; renewalReminderAt?: string };
}

interface PrintavoOrderSummary {
  id: string;
  type: string;
  visualId: string;
  nickname: string;
  quantity: number;
  dueAt: string | null;
  status: string;
}

interface SavedJob {
  id: string;
  snapshot: ProJobSnapshot;
  updatedAt: string;
}

interface ProWorkspaceProps {
  currentSnapshot: ProJobSnapshot;
  onImport: (order: PrintavoCalculatorImport) => void;
  onLoadSavedJob: (snapshot: ProJobSnapshot) => void;
  onLearningStatusChange: (enabled: boolean) => void;
}

const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const value = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(value.error || 'The request could not be completed.');
  return value;
};

export function ProWorkspace({ currentSnapshot, onImport, onLoadSavedJob, onLearningStatusChange }: ProWorkspaceProps) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [printavoEmail, setPrintavoEmail] = useState('');
  const [printavoToken, setPrintavoToken] = useState('');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<PrintavoOrderSummary[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/session', { headers: { Accept: 'application/json' } });
      const value = await response.json() as SessionResponse;
      setSession(value);
      onLearningStatusChange(Boolean(value.signedIn && value.subscription?.active && value.user?.learningEnabled));
      if (value.signedIn && value.subscription?.active) {
        requestJson<{ jobs: SavedJob[] }>('/api/jobs/').then((result) => setSavedJobs(result.jobs)).catch(() => undefined);
      }
    } catch {
      setSession({ configured: false, signedIn: false });
      onLearningStatusChange(false);
    }
  };

  useEffect(() => { void refreshSession(); }, []);

  const perform = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request could not be completed.');
    } finally {
      setBusy('');
    }
  };

  if (!session) return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs font-bold text-slate-500">Checking optional Pro workspace…</div>;

  if (!session.configured) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700"><Cloud className="h-4 w-4 text-indigo-600" /> Optional Pro workspace</p>
        <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">The free calculator is ready. Secure accounts, cloud saves, Printavo import, and personal learning will appear here after the site owner finishes the backend setup.</p>
      </div>
    );
  }

  if (!session.signedIn) {
    return (
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50 p-5 md:p-6">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-600 p-2 text-white"><Link2 className="h-5 w-5" /></div><div><h2 className="text-sm font-black text-slate-950">Printavo + saved workspace <span className="ml-1 rounded-full bg-white px-2 py-1 text-[8px] uppercase tracking-widest text-indigo-700">Optional Pro</span></h2><p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">Keep the calculator free and local, or sign in for cloud saves, read-only Printavo order import, and personal timing suggestions.</p></div></div>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
          event.preventDefault();
          void perform('signin', async () => {
            await requestJson('/api/auth/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: accountEmail }) });
            setMessage('Check your email for a one-time sign-in link. It expires in 15 minutes.');
          });
        }}>
          <label className="flex-1"><span className="sr-only">Email</span><input type="email" required autoComplete="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="you@yourshop.com" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold" /></label>
          <button disabled={busy === 'signin'} className="min-h-11 rounded-xl bg-slate-950 px-5 text-xs font-black text-white disabled:opacity-60">{busy === 'signin' ? 'Sending…' : 'Email sign-in link'}</button>
        </form>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> No password. The Printavo token is entered only after subscribing and is encrypted server-side.</p>
        {message && <p role="status" className="mt-3 text-xs font-bold text-emerald-700">{message}</p>}
        {error && <p role="alert" className="mt-3 text-xs font-bold text-red-700">{error}</p>}
      </section>
    );
  }

  if (!session.subscription?.active) {
    return (
      <section className="rounded-2xl border border-indigo-100 bg-white p-5 md:p-6">
        <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Optional Pro workspace</p>
        <h2 className="mt-2 text-lg font-black text-slate-950">Add Printavo import, cloud saves, and personal learning</h2>
        <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">Signed in as {session.user?.email}. The public calculator and browser-local tools remain free.</p>
        <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void perform('checkout', async () => { const result = await requestJson<{ url: string }>('/api/billing/checkout', { method: 'POST' }); window.location.assign(result.url); })} className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white">Start Pro subscription</button><button onClick={() => void perform('logout', async () => { await requestJson('/api/auth/logout', { method: 'POST' }); await refreshSession(); })} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600">Sign out</button><button onClick={() => { if (!window.confirm('Permanently delete this account and all cloud-saved data? Browser-local calculator history is not affected.')) return; void perform('delete-account', async () => { await requestJson('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) }); await refreshSession(); }); }} className="rounded-xl px-3 py-3 text-[10px] font-black text-red-600">Delete account</button></div>
        {error && <p role="alert" className="mt-3 text-xs font-bold text-red-700">{error}</p>}
      </section>
    );
  }

  const connected = Boolean(session.printavo?.connected);
  const learningEnabled = Boolean(session.user?.learningEnabled);

  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Pro workspace</p><p className="mt-1 text-xs font-semibold text-slate-500">{session.user?.email}</p></div><div className="flex gap-2"><button onClick={() => void perform('portal', async () => { const result = await requestJson<{ url: string }>('/api/billing/portal', { method: 'POST' }); window.location.assign(result.url); })} className="rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600">Billing</button><button onClick={() => void perform('logout', async () => { await requestJson('/api/auth/logout', { method: 'POST' }); await refreshSession(); })} className="rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600">Sign out</button></div></div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="flex items-center gap-2 text-xs font-black text-slate-900"><KeyRound className="h-4 w-4 text-indigo-600" /> Printavo connection</h3>
          {!connected ? <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void perform('connect', async () => { await requestJson('/api/printavo/connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: printavoEmail, token: printavoToken }) }); setPrintavoToken(''); await refreshSession(); setMessage('Printavo connected with read-only calculator access.'); }); }}><input type="email" required autoComplete="username" value={printavoEmail} onChange={(event) => setPrintavoEmail(event.target.value)} placeholder="Printavo account email" className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold" /><input type="password" required autoComplete="off" value={printavoToken} onChange={(event) => setPrintavoToken(event.target.value)} placeholder="Printavo API token" className="min-h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold" /><button disabled={busy === 'connect'} className="w-full rounded-lg bg-slate-950 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">{busy === 'connect' ? 'Verifying…' : 'Verify and encrypt connection'}</button><p className="text-[9px] font-medium leading-relaxed text-slate-500">Create the key in Printavo under My Account. Printavo keys expire after six months; we remind you before the expected renewal.</p></form> : <div className="mt-3"><p className="text-xs font-bold text-emerald-700">Connected for read-only order lookup.</p><div className="mt-3 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order number or search" className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs font-bold" /><button onClick={() => void perform('search', async () => { const result = await requestJson<{ orders: PrintavoOrderSummary[] }>(`/api/printavo/orders/?q=${encodeURIComponent(query)}`); setOrders(result.orders); })} className="rounded-lg bg-indigo-600 px-3 text-[10px] font-black text-white">Search</button></div><div className="mt-3 max-h-56 space-y-2 overflow-auto">{orders.map((order) => <button key={order.id} onClick={() => void perform(`order-${order.id}`, async () => { const result = await requestJson<{ order: PrintavoCalculatorImport }>(`/api/printavo/order?id=${encodeURIComponent(order.id)}`); onImport(result.order); setMessage(`Loaded Printavo ${order.type.toLowerCase()} ${order.visualId}. Review missing production fields before calculating.`); })} className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-indigo-300"><span><span className="block text-xs font-black text-slate-900">#{order.visualId} {order.nickname}</span><span className="text-[9px] font-semibold text-slate-500">{order.quantity} items · {order.status || order.type}</span></span><span className="text-[9px] font-black text-indigo-700">Load</span></button>)}</div><button onClick={() => void perform('disconnect', async () => { await requestJson('/api/printavo/connection', { method: 'DELETE' }); setOrders([]); await refreshSession(); })} className="mt-3 text-[9px] font-black uppercase tracking-widest text-red-600">Disconnect and delete token</button></div>}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 p-4"><h3 className="flex items-center gap-2 text-xs font-black text-slate-900"><Sparkles className="h-4 w-4 text-indigo-600" /> Personal learning</h3><label className="mt-3 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={learningEnabled} onChange={(event) => { const enabled = event.target.checked; void perform('learning', async () => { await requestJson('/api/learning/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) }); await refreshSession(); }); }} className="mt-0.5 h-4 w-4 accent-indigo-600" /><span className="text-[10px] font-semibold leading-relaxed text-slate-600">Use my completed-run times to suggest a personal planning adjustment. Data stays isolated to this account; suggestions never change calibration automatically.</span></label><button onClick={() => { if (!window.confirm('Delete all completed-run learning history for this account?')) return; void perform('delete-learning', async () => { await requestJson('/api/learning/outcomes', { method: 'DELETE' }); setMessage('Personal learning history deleted.'); }); }} className="mt-3 text-[9px] font-black uppercase tracking-widest text-red-600">Delete learned history</button></div>
          <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-xs font-black text-slate-900"><Save className="h-4 w-4 text-indigo-600" /> Saved work</h3><button onClick={() => void perform('save', async () => { await requestJson('/api/jobs/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot: currentSnapshot, printavoOrderId: currentSnapshot.printavoOrderId, printavoVisualId: currentSnapshot.printavoVisualId }) }); const result = await requestJson<{ jobs: SavedJob[] }>('/api/jobs/'); setSavedJobs(result.jobs); setMessage('Saved this calculator setup to your Pro workspace.'); })} className="rounded-lg bg-slate-950 px-3 py-2 text-[9px] font-black text-white">Save current</button></div><div className="mt-3 max-h-40 space-y-2 overflow-auto">{savedJobs.length === 0 && <p className="text-[10px] font-medium text-slate-500">No cloud-saved jobs yet.</p>}{savedJobs.map((job) => <div key={job.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2"><button onClick={() => onLoadSavedJob(job.snapshot)} className="min-w-0 flex-1 text-left"><span className="block truncate text-[10px] font-black text-slate-800">{job.snapshot.label || job.snapshot.jobDetails.jobNumber || 'Saved setup'}</span><span className="text-[8px] font-semibold text-slate-400">{new Date(job.updatedAt).toLocaleDateString()}</span></button><button aria-label="Delete saved job" onClick={() => void perform(`delete-${job.id}`, async () => { await requestJson(`/api/jobs/${encodeURIComponent(job.id)}`, { method: 'DELETE' }); setSavedJobs((current) => current.filter((candidate) => candidate.id !== job.id)); })} className="px-2 text-xs font-black text-red-500">×</button></div>)}</div></div>
        </div>
      </div>
      {busy && <p role="status" className="mt-3 flex items-center gap-2 text-[10px] font-bold text-indigo-700"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Working…</p>}
      {message && <p role="status" className="mt-3 text-xs font-bold text-emerald-700">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs font-bold text-red-700">{error}</p>}
    </section>
  );
}
