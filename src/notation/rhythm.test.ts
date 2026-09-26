import { describe,expect,it } from 'vitest';
import { decomposeTicks } from './rhythm';

describe('score rhythm engraving',()=>{
 it('keeps common dotted durations and rests exactly on the MIDI tick grid',()=>{
  const dotted=decomposeTicks(720,480);expect(dotted).toEqual([{value:'q',dotted:true,ticks:720}]);
  const syncopated=decomposeTicks(600,480);expect(syncopated.reduce((sum,part)=>sum+part.ticks,0)).toBe(600);
  expect(syncopated.map(part=>part.value)).toEqual(['q','16']);
 });
});

