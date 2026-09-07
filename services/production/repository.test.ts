import {beforeEach,describe,it,expect,vi} from 'vitest';
import {emptyStore} from './model';
const disk=vi.hoisted(()=>({prefs:new Map<string,string>(),files:new Map<string,string>(),fail:false}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true}}));
vi.mock('@capacitor/preferences',()=>({Preferences:{get:async({key}:any)=>({value:disk.prefs.get(key)??null}),set:async({key,value}:any)=>{disk.prefs.set(key,value);}}}));
vi.mock('@capacitor/filesystem',()=>({Directory:{Data:'DATA'},Encoding:{UTF8:'utf8'},Filesystem:{readFile:async({path}:any)=>{if(!disk.files.has(path))throw Error('Missing file');return {data:disk.files.get(path)};},writeFile:async({path,data}:any)=>{if(disk.fail)throw Error('Disk full');disk.files.set(path,data);},deleteFile:async({path}:any)=>{disk.files.delete(path);}}}));
import {readRepository,writeRepository} from './repository';
beforeEach(()=>{disk.prefs.clear();disk.files.clear();disk.fail=false;});
describe('native save transaction',()=>{
 it('restores snapshots and retains the preceding save',async()=>{let s=await writeRepository(emptyStore());s.jobs[0].name='Second';s=await writeRepository(s);expect(await readRepository()).toEqual(s);expect(disk.files.size).toBe(2);s=await writeRepository(s);expect(disk.files.size).toBe(2);});
 it('keeps the committed pointer when a write fails',async()=>{const s=await writeRepository(emptyStore());const pointer=disk.prefs.get('production-store-pointer');disk.fail=true;await expect(writeRepository(s)).rejects.toThrow('Disk full');expect(disk.prefs.get('production-store-pointer')).toBe(pointer);expect(await readRepository()).toEqual(s);});
 it('rejects a stale revision',async()=>{const s=emptyStore();await writeRepository(s);await expect(writeRepository(s)).rejects.toThrow('changed');});
 it('fails visibly without overwriting corrupt data',async()=>{await writeRepository(emptyStore());const pointer=disk.prefs.get('production-store-pointer')!;disk.files.set(pointer,'invalid');await expect(readRepository()).rejects.toThrow();expect(disk.files.get(pointer)).toBe('invalid');});
});
