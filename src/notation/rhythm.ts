export interface RhythmPart { value: 'w'|'h'|'q'|'8'|'16'|'32'|'64'; dotted: boolean; ticks: number }

/** Split a MIDI tick span into readable standard values without losing its tick total. */
export function decomposeTicks(ticks: number, ppq: number): RhythmPart[] {
  const values: Array<[RhythmPart['value'], number]> = [['w', ppq*4], ['h', ppq*2], ['q', ppq], ['8', ppq/2], ['16', ppq/4], ['32', ppq/8], ['64', ppq/16]];
  const parts: RhythmPart[] = [];
  let remaining = Math.max(0, ticks);
  while (remaining > 0) {
    const found = values.flatMap(([value, base]) => [[value,base,false] as const,[value,base*1.5,true] as const])
      .filter(([,span]) => span <= remaining + 1e-6)
      .sort((a,b) => b[1]-a[1])[0];
    if (!found) {
      const smallest = ppq/16;
      const partTicks = Math.min(remaining, smallest);
      parts.push({value:'64',dotted:false,ticks:partTicks}); remaining -= partTicks;
    } else {
      const [value,span,dotted] = found;
      parts.push({value,dotted,ticks:span}); remaining -= span;
    }
    if (parts.length > 512) break;
  }
  return parts;
}
