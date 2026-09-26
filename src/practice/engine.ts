import type { HandSelection, Song, SongNote } from '../model/song';
import { allNotes, notesForHand } from '../model/song';
export interface MatchPolicy { octaveTolerance:boolean; timingToleranceMs:number; chordToleranceMs:number }
export const defaultPolicy:MatchPolicy={octaveTolerance:false,timingToleranceMs:0,chordToleranceMs:90};
export function matchPitch(expected:number,played:number,policy:MatchPolicy){return expected===played||(policy.octaveTolerance&&expected%12===played%12);}
export function isWithinTimingTolerance(actualMs:number,expectedMs:number,policy:MatchPolicy){return Math.abs(actualMs-expectedMs)<=policy.timingToleranceMs;}
export function groupEvents(notes:SongNote[],toleranceTicks=12):SongNote[][] { const groups:SongNote[][]=[]; for(const note of [...notes].sort((a,b)=>a.startTick-b.startTick)){const last=groups.at(-1);if(last&&note.startTick-last[0].startTick<=toleranceTicks)last.push(note);else groups.push([note]);}return groups; }
export class PracticeEngine {
 readonly groups:SongNote[][]; index=0;
 constructor(song:Song,readonly policy:MatchPolicy=defaultPolicy,readonly hands:HandSelection='both'){this.groups=groupEvents(notesForHand(allNotes(song),hands),Math.round(song.ppq*.06));}
 get current(){return this.groups[this.index]??null;}
 get done(){return this.index>=this.groups.length;}
 get progress(){return this.groups.length?this.index/this.groups.length:0;}
 input(pitches:number[]):{correct:boolean;expected:number[];matched:number[]} {const group=this.current;if(!group)return{correct:false,expected:[],matched:[]};const expected=group.map(n=>n.pitch);const unique=[...new Set(pitches)];const matched=expected.filter(p=>unique.some(x=>matchPitch(p,x,this.policy)));const correct=expected.every(p=>unique.some(x=>matchPitch(p,x,this.policy)));if(correct)this.index++;return{correct,expected,matched};}
 restart(){this.index=0;} seek(index:number){this.index=Math.max(0,Math.min(index,this.groups.length-1));}
}
