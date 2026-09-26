// Use VexFlow's bundled music fonts so notation works offline and its glyphs
// remain available when the SVG is embedded into a PDF.
import { Accidental, Beam, Formatter, GhostNote, Renderer, Stave, StaveNote, StaveTie, Voice } from 'vexflow/bravura';
import type { Song, SongNote } from '../model/song';
import { allNotes, handForNote } from '../model/song';
import { decomposeTicks } from './rhythm';

const pitchNames=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteCache=new WeakMap<Song,SongNote[]>();
const keyFor=(midi:number)=>`${pitchNames[midi%12].replace('#','')}/${Math.floor(midi/12)-1}`;
export const labelFor=(midi:number)=>`${pitchNames[midi%12]}${Math.floor(midi/12)-1}`;
function addLabel(note:StaveNote,label:string){
 const element=note.getSVGElement();if(!element)return;const ys=note.getYs();const x=note.getAbsoluteX();const y=ys.length?Math.min(...ys)-9:43;
 const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.setAttribute('class','score-note-label');group.setAttribute('pointer-events','none');
 const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',String(x));text.setAttribute('y',String(Math.max(12,y)));text.setAttribute('text-anchor','middle');text.textContent=label;group.append(text);element.append(group);
}
function valueToken(ticks:number,ppq:number){const part=decomposeTicks(ticks,ppq)[0];return `${part.value}${part.dotted?'d':''}`;}
function makeNotes(group:SongNote[],ticks:number,ppq:number,clef:'treble'|'bass'){
 const token=valueToken(ticks,ppq),keys=group.map(n=>keyFor(n.pitch));const note=new StaveNote({keys,duration:token,clef});
 keys.forEach((key,i)=>{if(key.includes('#'))note.addModifier(new Accidental('#'),i);});return note;
}
function makeSpacer(ticks:number,ppq:number){return new GhostNote({duration:valueToken(ticks,ppq)});}
function nearestDuration(ticks:number,ppq:number){const choices:Array<[string,number]>=[];for(const value of ['w','h','q','8','16','32','64']){const beat=value==='w'?4:value==='h'?2:value==='q'?1:value==='8'?.5:value==='16'?.25:value==='32'?.125:.0625;const base=ppq*beat;choices.push([value,base],[`${value}d`,base*1.5]);}return choices.sort((a,b)=>Math.abs(a[1]-ticks)-Math.abs(b[1]-ticks))[0][1];}
function latestAt<T extends {tick:number}>(items:T[],tick:number):T|undefined{return [...items].reverse().find(item=>item.tick<=tick);}
function notesForMeasure(song:Song,index:number){let notes=noteCache.get(song);if(!notes){notes=allNotes(song);noteCache.set(song,notes);}const measure=song.measures[index];let low=0,high=notes.length;while(low<high){const mid=(low+high)>>1;if(notes[mid].startTick<measure.startTick)low=mid+1;else high=mid;}const result:SongNote[]=[];for(let i=low;i<notes.length&&notes[i].startTick<measure.endTick;i++)result.push(notes[i]);for(let i=low-1;i>=0&&notes[i].startTick+notes[i].durationTicks>measure.startTick;i--)result.push(notes[i]);return result;}

export function renderMeasure(host:HTMLDivElement,song:Song,index:number,requestedWidth?:number,labels=true,compact=false){
 host.querySelectorAll('svg').forEach(svg=>svg.remove());const measure=song.measures[index];if(!measure)return;
 const width=Math.max(310,requestedWidth??host.clientWidth??310),height=compact?145:190;const renderer=new Renderer(host,Renderer.Backends.SVG);renderer.resize(width,height);const context=renderer.getContext();
 const notes=notesForMeasure(song,index),signature=latestAt(song.timeSignatures,measure.startTick)??{tick:0,numerator:4,denominator:4},key=latestAt(song.keySignatures,measure.startTick);
 const staffNotes=(clef:'treble'|'bass')=>notes.filter(note=>handForNote(note)===(clef==='treble'?'right':'left'));
 for(const [clef,y] of (compact?[['treble',8],['bass',78]]:[['treble',15],['bass',105]]) as readonly (readonly ['treble'|'bass',number])[]){
  const stave=new Stave(12,y,width-24);stave.addClef(clef);if(signature)stave.addTimeSignature(`${signature.numerator}/${signature.denominator}`);if(key&&(index===0||song.keySignatures.some(item=>item.tick===measure.startTick)))try{stave.addKeySignature(key.key);}catch{}stave.setContext(context).draw();
  const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('class','score-staff-label');label.setAttribute('x',String(width-18));label.setAttribute('y',String(y-9));label.setAttribute('text-anchor','end');label.textContent=clef==='treble'?'TREBLE · TUNE':'BASS · LEFT HAND';
  const svg=host.querySelector('svg');if(svg){svg.append(label);if(clef==='treble'){const divider=document.createElementNS('http://www.w3.org/2000/svg','line');divider.setAttribute('x1','12');divider.setAttribute('x2',String(width-12));divider.setAttribute('y1',compact?'66':'82');divider.setAttribute('y2',compact?'66':'82');divider.setAttribute('stroke','#e5e2e8');divider.setAttribute('stroke-width','1');svg.append(divider);}}
  const grid=Math.max(1,song.ppq/4),grouped=new Map<number,SongNote[]>();for(const note of staffNotes(clef)){const slot=Math.round(note.startTick/grid);const group=grouped.get(slot)??[];group.push(note);grouped.set(slot,group);}
  const events=[...grouped.entries()].map(([slot,group])=>{const start=Math.min(measure.endTick-1,Math.max(measure.startTick,Math.round(slot*grid)));const remaining=Math.max(...group.map(n=>n.startTick+n.durationTicks-start));const duration=nearestDuration(remaining,song.ppq);return{group,start,end:Math.min(measure.endTick,start+duration)};}).sort((a,b)=>a.start-b.start||a.end-b.end);
  const lanes:Array<typeof events>=[];for(const event of events){let lane=lanes.find(items=>items.at(-1)!.end<=event.start);if(!lane){lane=[];lanes.push(lane);}lane.push(event);}
  if(!lanes.length)lanes.push([]);
  const voices:Voice[]=[],pending=new Map<StaveNote,{ids:string[];label:string}>(),ties:StaveNote[][]=[],beams:Beam[]=[];
  for(const lane of lanes){let cursor=measure.startTick;const tickables:(StaveNote|GhostNote)[]=[];
   if(!lane.length)tickables.push(makeSpacer(measure.endTick-measure.startTick,song.ppq));
   for(const event of lane){if(event.start>cursor)for(const part of decomposeTicks(event.start-cursor,song.ppq))tickables.push(makeSpacer(part.ticks,song.ppq));
    const parts=decomposeTicks(Math.max(1,event.end-event.start),song.ppq),continuation:StaveNote[]=[];parts.forEach((part,i)=>{const note=makeNotes(event.group,part.ticks,song.ppq,clef);continuation.push(note);if(i===0&&event.group[0].startTick>=measure.startTick)pending.set(note,{ids:event.group.map(n=>n.id),label:event.group.map(n=>labelFor(n.pitch)).join(' · ')});tickables.push(note);});if(continuation.length>1)ties.push(continuation);cursor=event.end;
   }
   if(cursor<measure.endTick)for(const part of decomposeTicks(measure.endTick-cursor,song.ppq))tickables.push(makeSpacer(part.ticks,song.ppq));
   if(tickables.length){const voice=new Voice({numBeats:signature.numerator,beatValue:signature.denominator}).setStrict(false);voice.addTickables(tickables);voices.push(voice);}
   beams.push(...Beam.generateBeams(tickables));
  }
  if(voices.length){new Formatter().joinVoices(voices).format(voices,width-102);voices.forEach(voice=>voice.draw(context,stave));}
  beams.forEach(beam=>beam.setContext(context).draw());
  for(const [note,meta] of pending){const element=note.getSVGElement();if(!element)continue;element.dataset.eventIds=meta.ids.join(',');element.dataset.eventId=meta.ids[0];element.dataset.keyLabel=meta.label;if(labels)addLabel(note,meta.label);}
  for(const sequence of ties)for(let i=1;i<sequence.length;i++){const indices=sequence[i-1].getKeys().map((_,keyIndex)=>keyIndex);new StaveTie({firstNote:sequence[i-1],lastNote:sequence[i],firstIndexes:indices,lastIndexes:indices}).setContext(context).draw();}
 }
}
