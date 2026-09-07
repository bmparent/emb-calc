import { Capacitor } from '@capacitor/core';
import { Job, jobName, duration, money, Store } from './model';
export async function shareBlob(blob: Blob, filename: string, title: string): Promise<void> {
  if(Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'),import('@capacitor/share')]);
    const data = await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve((reader.result as string).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
    const file=await Filesystem.writeFile({path:filename,directory:Directory.Cache,data});
    await Share.share({title,files:[file.uri]});return;
  }
  const file=new File([blob],filename,{type:blob.type});
  if(navigator.canShare?.({files:[file]})) { try { await navigator.share({title,files:[file]}); return; } catch(error) { if((error as Error).name==='AbortError')return; } }
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function makeQuotePdf(job: Job, shopName: string): Promise<Blob> {
  if(!job.quote || !job.estimate || job.quote.total<=0) throw new Error('Save an estimate with valid costs before sharing.');
  const {jsPDF}=await import('jspdf');const pdf=new jsPDF();let y=24;
  const line=(text:string,size=11,bold=false)=>{pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);const rows:string[]=pdf.splitTextToSize(text,170);const height=size>=18?9:6;for(const row of rows){if(y+height>274){pdf.addPage();y=22;}pdf.text(row,20,y);y+=height;}y+=3;};
  pdf.setTextColor(23,32,51);line(shopName.trim()||'Embroidery quote',22,true);line(jobName(job),16,true);line(`Quote ${job.id.slice(0,8).toUpperCase()} | Revision ${job.revision} | ${new Date(job.updatedAt).toLocaleDateString()}`);y+=4;
  line(`${job.quantity} items | ${job.machine.apparelType}`,13,true);
  job.designs.forEach(d=>line(`${d.position}: ${d.designNumber||'Design'} | ${d.quantity} items | ${d.stitches.toLocaleString()} stitches | ${d.colors} color blocks`));
  y+=5;line(`Subtotal: ${money(job.quote.subtotal)}`,14,true);line(`Tax (${job.rates.taxPercent}%): ${money(job.quote.tax)}`);line(`Total: ${money(job.quote.total)}`,22,true);line(`${money(job.quote.perItem)} per item (rounded)`);
  y+=5;line('Production assumptions',13,true);line(`Estimated production: ${duration(job.estimate.netMinutes)}. ${job.machine.heads} heads at ${job.machine.rpm} RPM; ${Math.round(job.calibration.machineEfficiency*100)}% efficiency; ${Math.round(job.calibration.contingencyPercent*100)}% contingency.`);
  line('Production time is a planning estimate, not a promised delivery date. Final artwork, materials, and scheduling must be confirmed.');
  if(job.estimate.warnings.length)line('Production review required: '+job.estimate.warnings.join(' '));
  line(`Prepared with EmbroideryCalc | Formula ${job.formulaVersion}`,9);return pdf.output('blob');
}
export async function shareQuote(job: Job, shopName: string) {await shareBlob(await makeQuotePdf(job,shopName),`quote-${job.id.slice(0,8)}.pdf`,jobName(job));}
export async function exportBackup(store:Store){await shareBlob(new Blob([JSON.stringify(store,null,2)],{type:'application/json'}),`embroidery-backup-${new Date().toISOString().slice(0,10)}.json`,'EmbroideryCalc backup');}
