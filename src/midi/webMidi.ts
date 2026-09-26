export interface MidiDevice {id:string;name:string;state:string}
export function listMidiInputs():MidiDevice[]{if(!('requestMIDIAccess'in navigator))return[];return [...(midiAccess?.inputs.values()??[])].map(i=>({id:i.id,name:i.name||'MIDI keyboard',state:i.state}));}
let midiAccess: MIDIAccess|undefined;
export async function connectMidi(onMessage:(pitch:number,on:boolean,velocity:number)=>void,onDevices:()=>void,onError:(message:string)=>void,selectedDeviceId?:string,onPedal:(down:boolean)=>void=()=>{}):Promise<()=>void>{
 if(!('requestMIDIAccess'in navigator)){onError('Web MIDI is not supported in this browser. Try Chrome or Edge.');return()=>{};}
 try{
  const access=await navigator.requestMIDIAccess({sysex:false});midiAccess=access;
  const attached=new Map<string,{input:MIDIInput;handler:(event:Event)=>void}>();
  const syncInputs=()=>{
   const eligible=[...access.inputs.values()].filter(input=>(!selectedDeviceId||input.id===selectedDeviceId)&&input.state==='connected');
   const valid=new Set(eligible.map(input=>input.id));
   for(const[id,entry]of attached)if(!valid.has(id)){entry.input.removeEventListener('midimessage',entry.handler);attached.delete(id);}
   for(const input of eligible)if(!attached.has(input.id)){
    const handler=(event:Event)=>{const e=event as MIDIMessageEvent;const [status,pitch,velocity]=e.data??[];const command=status&0xf0;if(command===0x90&&velocity>0)onMessage(pitch,true,velocity);else if(command===0x80||(command===0x90&&velocity===0))onMessage(pitch,false,velocity);else if(command===0xb0&&pitch===64)onPedal(velocity>=64);};
    input.addEventListener('midimessage',handler);attached.set(input.id,{input,handler});
   }
   onDevices();
  };
  access.addEventListener('statechange',syncInputs);syncInputs();
  return()=>{for(const entry of attached.values())entry.input.removeEventListener('midimessage',entry.handler);attached.clear();access.removeEventListener('statechange',syncInputs);};
 }catch{onError('Could not access MIDI devices. Check browser permissions and reconnect the keyboard.');return()=>{};}
}
