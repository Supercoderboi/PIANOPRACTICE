import type { HandSelection, Song, SongNote } from '../model/song';
import { allNotes, notesForHand } from '../model/song';

/** A small look-ahead Web Audio player; audio nodes are scheduled independently of React. */
interface ScheduledNote{note:SongNote;endTime:number}
export class SongPlayback {
 private context:AudioContext|null=null;
 private songNotes:ScheduledNote[]=[];
 private sources=new Set<OscillatorNode>();
 private timer:ReturnType<typeof setInterval>|null=null;
 private nextNote=0;
 private songOffset=0;
 private startedAt=0;
 private speed=1;
 private duration=0;
 private lastUiBucket=-1;
 private onTime:(time:number)=>void=()=>{};
 private onEnded:()=>void=()=>{};

 async play(song:Song,fromSeconds=0,speed=1,onTime:(time:number)=>void=()=>{},onEnded:()=>void=()=>{},hands:HandSelection='both'){
  this.clearScheduled();
  const AudioContextCtor=window.AudioContext;
  if(!AudioContextCtor)throw new Error('Web Audio is not supported in this browser.');
  this.context??=new AudioContextCtor();
  await this.context.resume();
  const notes=notesForHand(allNotes(song),hands);const trackEnds=new Map<string,number>();for(const note of notes)trackEnds.set(note.trackId,Math.max(trackEnds.get(note.trackId)??0,note.startTime+note.duration));
  const pedalsByTrack=new Map<string,typeof song.pedalEvents>();for(const pedal of song.pedalEvents){const events=pedalsByTrack.get(pedal.trackId)??[];events.push(pedal);pedalsByTrack.set(pedal.trackId,events);}for(const events of pedalsByTrack.values())events.sort((a,b)=>a.time-b.time);
  this.songNotes=notes.map(note=>{const noteEnd=note.startTime+note.duration;const pedals=pedalsByTrack.get(note.trackId)??[];let low=0,high=pedals.length;while(low<high){const mid=(low+high)>>1;if(pedals[mid].time<=noteEnd)low=mid+1;else high=mid;}const latestPedal=low?pedals[low-1]:undefined;if(latestPedal&&latestPedal.value>=.5){let releaseTime:number|undefined;for(let i=low;i<pedals.length;i++)if(pedals[i].value<.5){releaseTime=pedals[i].time;break;}return{note,endTime:releaseTime??trackEnds.get(note.trackId)??noteEnd};}return{note,endTime:noteEnd};});
  this.speed=Math.max(.25,Math.min(2,speed));this.songOffset=Math.max(0,fromSeconds);
  this.duration=Math.max(0,...this.songNotes.map(n=>n.endTime));
  this.nextNote=this.songNotes.findIndex(n=>n.endTime>this.songOffset);
  if(this.nextNote<0)this.nextNote=this.songNotes.length;
  this.startedAt=this.context.currentTime;this.onTime=onTime;this.onEnded=onEnded;this.lastUiBucket=Math.floor(this.songOffset*10);
  this.scheduleAhead();this.timer=setInterval(()=>this.tick(),25);
 }

 pause(){const time=this.currentSongTime();this.clearScheduled();this.onTime(time);return time;}
 stop(){if(this.timer)clearInterval(this.timer);this.timer=null;this.clearScheduled();this.songOffset=0;this.nextNote=0;this.onTime(0);}
 get isPlaying(){return this.timer!==null;}

 private currentSongTime(){if(!this.context||!this.timer)return this.songOffset;return Math.min(this.duration,this.songOffset+(this.context.currentTime-this.startedAt)*this.speed);}
 private tick(){const time=this.currentSongTime();const bucket=Math.floor(time*10);if(bucket!==this.lastUiBucket){this.lastUiBucket=bucket;this.onTime(time);}this.scheduleAhead();const finishedAudioTime=this.context&&this.startedAt+(this.duration-this.songOffset)/this.speed+.15;if(time>=this.duration&&this.nextNote>=this.songNotes.length&&this.context!.currentTime>=finishedAudioTime!){if(this.timer)clearInterval(this.timer);this.timer=null;this.clearScheduled();this.onEnded();}}
 private scheduleAhead(){if(!this.context)return;const now=this.currentSongTime();const horizon=now+.15;while(this.nextNote<this.songNotes.length&&this.songNotes[this.nextNote].note.startTime<=horizon){const scheduled=this.songNotes[this.nextNote++];const note=scheduled.note;const end=scheduled.endTime;if(end<=now)continue;const start=Math.max(note.startTime,now);const when=this.context.currentTime+Math.max(0,(start-now)/this.speed);const length=Math.max(.035,(end-start)/this.speed);this.schedulePitch(note.pitch,when,length,note.velocity);}}
 private schedulePitch(pitch:number,when:number,length:number,velocity:number){if(!this.context)return;const oscillator=this.context.createOscillator();const envelope=this.context.createGain();oscillator.type='triangle';oscillator.frequency.setValueAtTime(440*Math.pow(2,(pitch-69)/12),when);const level=Math.max(.025,Math.min(.2,velocity*.16));envelope.gain.setValueAtTime(.0001,when);envelope.gain.exponentialRampToValueAtTime(level,when+.012);envelope.gain.exponentialRampToValueAtTime(level*.42,when+Math.min(.16,length));envelope.gain.setTargetAtTime(.0001,when+length,.075);oscillator.connect(envelope);envelope.connect(this.context.destination);oscillator.onended=()=>{this.sources.delete(oscillator);oscillator.disconnect();envelope.disconnect();};this.sources.add(oscillator);oscillator.start(when);oscillator.stop(when+length+.3);}
 private clearScheduled(){if(this.timer)clearInterval(this.timer);this.timer=null;for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}this.sources.clear();}
}
