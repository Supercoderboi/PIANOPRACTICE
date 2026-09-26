import { Midi } from '@tonejs/midi';
import type { Song, SongTrack, SongNote, TempoChange, TimeSignature, KeySignature, PedalEvent } from '../model/song';
import { buildMeasures, tickToSeconds } from '../model/song';
export function parseMidi(data:ArrayBuffer,title='Imported MIDI'):Song {
 let midi:Midi;
 try { midi=new Midi(data); } catch { throw new Error('This MIDI file is malformed or unsupported. Please choose a valid .mid file.'); }
 const ppq=midi.header.ppq||480;
 const tempos:TempoChange[]=(midi.header.tempos.length?midi.header.tempos:[{ticks:0,bpm:120}]).map(t=>({tick:t.ticks,bpm:Number.isFinite(t.bpm)&&t.bpm>0?t.bpm:120})).sort((a,b)=>a.tick-b.tick);
 const timeSignatures:TimeSignature[]=midi.header.timeSignatures.map(s=>({tick:s.ticks,numerator:s.timeSignature[0]||4,denominator:s.timeSignature[1]||4})); if(!timeSignatures.length)timeSignatures.push({tick:0,numerator:4,denominator:4});
 const keySignatures:KeySignature[]=midi.header.keySignatures.map(k=>({tick:k.ticks,key:k.key,scale:k.scale}));
 const pedalEvents:PedalEvent[]=[]; let trackIndex=0;
 const tracks:SongTrack[]=midi.tracks.map(track=>{ const id=`track-${trackIndex++}`; const notes:SongNote[]=track.notes.map((n,i)=>({id:`${id}-note-${i}`,pitch:n.midi,startTick:n.ticks,durationTicks:Math.max(1,n.durationTicks),startTime:n.time,duration:n.duration,velocity:n.velocity,trackId:id})); for(const cc of track.controlChanges[64]??[])pedalEvents.push({tick:cc.ticks,time:cc.time,value:cc.value,trackId:id}); return {id,name:track.name||`Track ${trackIndex}`,instrument:track.instrument.number,channel:track.channel,notes}; });
 const endTick=Math.max(0,...tracks.flatMap(t=>t.notes.map(n=>n.startTick+n.durationTicks)),...pedalEvents.map(p=>p.tick));
 // Recompute times from the canonical tempo map to avoid parser rounding differences.
 for(const track of tracks)for(const n of track.notes){n.startTime=tickToSeconds(n.startTick,tempos,ppq);n.duration=tickToSeconds(n.startTick+n.durationTicks,tempos,ppq)-n.startTime;}
 return {id:crypto.randomUUID(),title,ppq,tracks,tempoMap:tempos,timeSignatures,keySignatures,pedalEvents,measures:buildMeasures(endTick,ppq,timeSignatures,tempos),createdAt:Date.now()};
}
