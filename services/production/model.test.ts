import { describe, it, expect } from 'vitest';
import { emptyStore, estimateJob, editJob, transition, duplicateJob, priceJob, duration } from './model';
import { validateStore, persistStore, loadStore, mergeBackup } from './storage';
const ready = () => { const j=emptyStore().jobs[0]; j.designs[0].stitches=10000; return {...estimateJob(j), status:'ready' as const}; };
describe('production workflow',()=>{
 it('does not start a draft or change a running job',()=>{expect(()=>transition(emptyStore().jobs[0],'start')).toThrow();expect(()=>editJob(transition(ready(),'start'),{quantity:2})).toThrow();});
 it('retains full dates across overnight pauses and restart',()=>{let j=transition(ready(),'start','2026-01-01T22:00:00Z');j=transition(j,'pause','2026-01-01T23:00:00Z');j=JSON.parse(JSON.stringify(j));j=transition(j,'resume','2026-01-02T07:00:00Z');j=transition(j,'complete','2026-01-02T08:30:00Z');expect(j.run?.actualMinutes).toBe(150);expect(()=>transition(j,'resume')).toThrow();});
 it('rejects backwards events and zero production',()=>{const j=transition(ready(),'start','2026-01-01T22:00:00Z');expect(()=>transition(j,'complete','2026-01-01T21:00:00Z')).toThrow();expect(()=>transition(j,'complete',j.run!.startedAt)).toThrow();});
 it('duplicates without production state and invalidates edited estimates',()=>{const j=ready();const copy=duplicateJob(j);expect(copy.id).not.toBe(j.id);expect(copy.estimate).toBeUndefined();expect(editJob(j,{quantity:2}).quote).toBeUndefined();});
 it('uses gross margin rather than markup and separates tax',()=>{const j=ready();const q=priceJob(10,j.estimate!,{blank:10,consumables:0,laborHourly:0,machineHourly:0,overheadHourly:0,setupCost:0,margin:50,taxPercent:10});expect(q).toMatchObject({cost:100,subtotal:200,tax:20,total:220,perItem:22,profit:100});});
 it('rounds minutes without a 60-minute remainder',()=>expect(duration(119.9)).toBe('2h 0m'));
});
describe('durable stores and backups',()=>{
 it('restores exact jobs and rejects stale writes',()=>{const data=new Map<string,string>();const port={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};const original=emptyStore();const saved=persistStore(port,original);expect(loadStore(port)).toEqual(saved);expect(()=>persistStore(port,original)).toThrow(/Another window/);});
 it('surfaces quota failure without claiming a save',()=>{expect(()=>persistStore({getItem:()=>null,setItem:()=>{throw Error('quota');}},emptyStore())).toThrow('quota');});
 it('merges conflicting jobs without overwriting',()=>{const s=emptyStore();const copy=structuredClone(s);copy.jobs[0].name='changed';const merged=mergeBackup(s,copy);expect(merged.jobs).toHaveLength(2);expect(merged.jobs[0].name).toBe('');});
 it('rejects invalid formats and corrupt nested data',()=>{expect(()=>validateStore({schemaVersion:99})).toThrow();const s=emptyStore();s.jobs[0].designs=[null as never];expect(()=>validateStore(s)).toThrow();});
});
