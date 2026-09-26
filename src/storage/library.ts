import Dexie, { type EntityTable } from 'dexie';
import type { Song } from '../model/song';
class PianoDb extends Dexie { songs!:EntityTable<Song,'id'>; constructor(){super('piano-practice');this.version(1).stores({songs:'id,title,createdAt'});} }
export const library=new PianoDb();
