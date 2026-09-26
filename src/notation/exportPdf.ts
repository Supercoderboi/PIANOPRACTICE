import type { Song } from '../model/song';
import { renderMeasure } from './renderMeasure';
import { Bravura } from '../../node_modules/vexflow/build/esm/src/fonts/bravura.js';

/**
 * VexFlow uses music-font glyphs (including noteheads) in its SVG. jsPDF's SVG
 * importer does not have those fonts, so it silently drops the glyphs while
 * keeping paths such as staff lines. Rasterize only the standalone score SVG
 * at print resolution to preserve the exact notation in the PDF.
 */
async function scoreSvgToPng(svg: SVGSVGElement, width: number, height: number) {
 await document.fonts?.ready;
 const clone=svg.cloneNode(true) as SVGSVGElement;
 clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
 clone.setAttribute('width',String(width));clone.setAttribute('height',String(height));
 const fontStyle=document.createElementNS('http://www.w3.org/2000/svg','style');
 fontStyle.textContent=`@font-face{font-family:Bravura;src:url("${Bravura}") format("woff2")}`;
 clone.insertBefore(fontStyle,clone.firstChild);
 const source=new XMLSerializer().serializeToString(clone);
 const image=new Image();
 image.src=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
 try{
  await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Could not render the score for PDF export.'));});
  const scale=3,canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;
  const context=canvas.getContext('2d');if(!context)throw new Error('PDF export is not supported in this browser.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.scale(scale,scale);context.drawImage(image,0,0,width,height);
  return canvas.toDataURL('image/png');
 }finally{URL.revokeObjectURL(image.src);}
}

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
   const score=await scoreSvgToPng(svg,510,190);
   doc.addImage(score,'PNG',x,y+10,cellW,196);
  }
  const filename=(song.title||'piano-practice').replace(/[\\/:*?"<>|]+/g,'-').trim()||'piano-practice';doc.save(`${filename}.pdf`);
 }finally{host.remove();}
}




