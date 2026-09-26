import type { Song } from '../model/song';
import { renderMeasure } from './renderMeasure';

export async function downloadSheetMusicPdf(song:Song){
 const [{jsPDF}]=await Promise.all([import('jspdf'),import('svg2pdf.js')]);
 const doc=new jsPDF('p','pt','a4');const pageWidth=doc.internal.pageSize.getWidth(),pageHeight=doc.internal.pageSize.getHeight();
 const margin=34,header=52,gapY=10,columns=1,rows=3,cellW=pageWidth-margin*2,cellH=(pageHeight-margin*2-header-gapY*(rows-1))/rows;
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:510px;height:190px;';document.body.append(host);
 try{
  for(let i=0;i<song.measures.length;i++){
   if(i>0&&i%(columns*rows)===0)doc.addPage();
   if(i%(columns*rows)===0){doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text(song.title||'Piano Practice',margin,27);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('Sheet music · note names included',margin,41);}
   renderMeasure(host,song,i,510,true);const svg=host.querySelector('svg');if(!svg)continue;
   const local=i%(columns*rows),col=local%columns,row=Math.floor(local/columns);const x=margin+col*cellW,y=margin+header+row*(cellH+gapY);
   doc.setFontSize(8);doc.setTextColor(90,90,98);doc.text(`MEASURE ${i+1}`,x,y+8);
   await doc.svg(svg,{x,y:y+10,width:cellW,height:196});
  }
  const filename=(song.title||'piano-practice').replace(/[\\/:*?"<>|]+/g,'-').trim()||'piano-practice';doc.save(`${filename}.pdf`);
 }finally{host.remove();}
}




