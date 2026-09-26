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
 const {jsPDF}=await import('jspdf');
 // Landscape with two measures per row and four rows per page keeps systems
 // readable while reducing page count by more than half for long songs.
 const doc=new jsPDF('l','pt','a4');const pageWidth=doc.internal.pageSize.getWidth(),pageHeight=doc.internal.pageSize.getHeight();
 const margin=30,header=45,gapY=4,columns=2,rows=4,cellW=(pageWidth-margin*2-gapY)/columns,cellH=(pageHeight-margin*2-header-gapY*(rows-1))/rows,perPage=columns*rows;
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:510px;height:145px;';document.body.append(host);
 try{
  for(let i=0;i<song.measures.length;i++){
   if(i>0&&i%perPage===0)doc.addPage();
   if(i%perPage===0){doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text(song.title||'Piano Practice',margin,25);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('Sheet music · note names included',margin,38);}
   renderMeasure(host,song,i,510,true,true);const svg=host.querySelector('svg');if(!svg)continue;
   const local=i%perPage,col=local%columns,row=Math.floor(local/columns),x=margin+col*(cellW+gapY),y=margin+header+row*(cellH+gapY);
   doc.setFontSize(8);doc.setTextColor(90,90,98);doc.text(`MEASURE ${i+1}`,x,y+8);
   const score=await scoreSvgToPng(svg,510,145);
   doc.addImage(score,'PNG',x,y+10,cellW,cellH-10);
  }
  const filename=(song.title||'piano-practice').replace(/[\\/:*?"<>|]+/g,'-').trim()||'piano-practice';doc.save(`${filename}.pdf`);
 }finally{host.remove();}
}




