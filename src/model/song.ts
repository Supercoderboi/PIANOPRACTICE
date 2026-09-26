export interface SongNote { id:string; pitch:number; startTick:number; durationTicks:number; startTime:number; duration:number; velocity:number; trackId:string; hand?:'left'|'right'; confidence?:number }
export interface TempoChange { tick:number; bpm:number }
export interface TimeSignature { tick:number; numerator:number; denominator:number }
export interface KeySignature { tick:number; key:string; scale:string }
export interface PedalEvent { tick:number; time:number; value:number; trackId:string }
export interface SongTrack { id:string; name:string; instrument:number; channel:number; notes:SongNote[] }
export interface Measure { index:number; startTick:number; endTick:number; startTime:number }
export interface Song { id:string; title:string; ppq:number; tracks:SongTrack[]; tempoMap:TempoChange[]; timeSignatures:TimeSignature[]; keySignatures:KeySignature[]; pedalEvents:PedalEvent[]; measures:Measure[]; createdAt:number; sourceName?:string }
export type HandSelection='both'|'left'|'right';
export function handForNote(note:SongNote):'left'|'right'{return note.hand??(note.pitch>=60?'right':'left');}
export function notesForHand(notes:SongNote[],hand:HandSelection){return hand==='both'?notes:notes.filter(note=>handForNote(note)===hand);}
export const allNotes=(song:Song)=>song.tracks.flatMap(t=>t.notes).sort((a,b)=>a.startTick-b.startTick||a.pitch-b.pitch);
export function tickToSeconds(tick:number, tempos:TempoChange[], ppq:number):number {
 let seconds=0, cursor=0, bpm=tempos[0]?.bpm??120;
 for(const change of tempos.slice(1).filter(x=>x.tick<=tick)) { seconds+=(change.tick-cursor)*60/(ppq*bpm); cursor=change.tick; bpm=change.bpm; }
 return seconds+(tick-cursor)*60/(ppq*bpm);
}
export function buildMeasures(endTick:number, ppq:number, signatures:TimeSignature[], tempos:TempoChange[]=[{tick:0,bpm:120}]):Measure[] {
 const sigs=[...signatures].sort((a,b)=>a.tick-b.tick); const result:Measure[]=[]; let tick=0, i=0, sig=sigs[0]??{tick:0,numerator:4,denominator:4};
 while(tick<endTick) { while(i+1<sigs.length&&sigs[i+1].tick<=tick)sig=sigs[++i]; const span=ppq*4*sig.numerator/sig.denominator; result.push({index:result.length,startTick:tick,endTick:tick+span,startTime:tickToSeconds(tick,tempos,ppq)}); tick+=span; }
 return result;
}
