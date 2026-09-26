import { useEffect, useMemo, useRef } from 'react';
import type { Song } from '../model/song';
import { allNotes } from '../model/song';
import { renderMeasure } from '../notation/renderMeasure';
import './score.css';

function updateHighlight(elements:Map<string,Set<SVGGElement>>,affected:Set<string>,active:Set<string>,played:Set<string>){
 const touched=new Set<SVGGElement>();for(const id of affected)for(const element of elements.get(id)??[])touched.add(element);
 for(const el of touched){const ids=(el.dataset.eventIds??'').split(',');el.classList.toggle('expected-note',ids.some(id=>active.has(id)));el.classList.toggle('played-note',ids.some(id=>played.has(id)));}
}
export function ScoreView({song,currentIds,playedIds}:{song:Song;currentIds:string[];playedIds:string[]}){
 const refs=useRef<(HTMLDivElement|null)[]>([]);const scrollRef=useRef<HTMLDivElement>(null);const eventElements=useRef(new Map<string,Set<SVGGElement>>());const previousActive=useRef(new Set<string>());const previousPlayed=useRef(new Set<string>());
 const notes=useMemo(()=>allNotes(song),[song]);const noteById=useMemo(()=>new Map(notes.map(note=>[note.id,note])),[notes]);const active=new Set(currentIds),played=new Set(playedIds);const current=noteById.get(currentIds[0]);let lo=0,hi=song.measures.length;
 while(current&&lo<hi){const mid=(lo+hi)>>1;if(song.measures[mid].endTick<=current.startTick)lo=mid+1;else hi=mid;}
 const measureIndex=current?Math.min(lo,Math.max(0,song.measures.length-1)):0;const activeRef=useRef(active),playedRef=useRef(played);activeRef.current=active;playedRef.current=played;
 useEffect(()=>{eventElements.current.clear();const mount=(host:HTMLDivElement,index:number)=>{if(host.dataset.renderedSong===song.id)return;renderMeasure(host,song,index);host.dataset.renderedSong=song.id;host.querySelectorAll<SVGGElement>('[data-event-ids]').forEach(el=>{for(const id of (el.dataset.eventIds??'').split(',')){const elements=eventElements.current.get(id)??new Set<SVGGElement>();elements.add(el);eventElements.current.set(id,elements);}});updateHighlight(eventElements.current,new Set([...activeRef.current,...playedRef.current]),activeRef.current,playedRef.current);};
  if(typeof IntersectionObserver==='undefined'){refs.current.forEach((el,i)=>{if(el)mount(el,i);});return;}
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const host=entry.target as HTMLDivElement;const index=Number(host.dataset.measureIndex);if(Number.isFinite(index))mount(host,index);observer.unobserve(host);}}, {root:scrollRef.current,rootMargin:'550px 0px'});
  refs.current.forEach(el=>{if(el)observer.observe(el);});return()=>observer.disconnect();
 },[song]);
 useEffect(()=>{const affected=new Set([...previousActive.current,...previousPlayed.current,...active,...played]);updateHighlight(eventElements.current,affected,active,played);previousActive.current=active;previousPlayed.current=played;},[song,currentIds.join(','),playedIds.join(',')]);
 useEffect(()=>{refs.current[measureIndex]?.scrollIntoView?.({behavior:'smooth',block:'nearest',inline:'center'});},[measureIndex]);
 return <div className="score-scroll" ref={scrollRef}><div className="score-pages">{song.measures.map((m,i)=><section className={`score-measure ${i===measureIndex?'measure-active':''}`} data-measure-index={i} key={m.index} ref={el=>{refs.current[i]=el as HTMLDivElement|null;}}><div className="measure-label">MEASURE {i+1}</div></section>)}</div></div>;
}

