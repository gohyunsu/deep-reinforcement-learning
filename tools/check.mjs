import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const chapters=JSON.parse(fs.readFileSync(path.join(root,'content/chapters.json'),'utf8'));
const outline=JSON.parse(fs.readFileSync(path.join(root,'content/outline.json'),'utf8'));
let total=0,errors=[];
for(const c of chapters){
 const o=outline.find(x=>x.file===c.source);
 if(!o){errors.push('missing outline '+c.id);continue;}
 total+=o.titles.length;
 const page=path.join(root,'docs','lecture',c.id+'.html');
 if(!fs.existsSync(page)){errors.push('missing lecture page '+c.id);continue;}
 const html=fs.readFileSync(page,'utf8');
 const sections=[...html.matchAll(/<section class="slide" id="s(\d+)">/g)];
 if(sections.length!==o.titles.length)errors.push(c.id+' section count '+sections.length+'/'+o.titles.length);
 for(let i=1;i<=o.titles.length;i++){
  const n=String(i).padStart(2,'0');
  const img=path.join(root,'docs','assets','slides',c.source.replace(/^DRL_/,'').replace(/\.pdf$/i,''),n+'.webp');
  if(!fs.existsSync(img))errors.push('missing '+path.relative(root,img));
 }
 for(const ref of c.sources||[])if(!/^https:\/\//.test(ref[1]))errors.push('non-https reference '+ref[1]);
}
const tex=fs.readFileSync(path.join(root,'guide/main.tex'),'utf8');
if(!tex.includes('\\documentclass')||!tex.includes('\\end{document}')||!tex.includes('\\appendix'))errors.push('LaTeX document incomplete');
if((tex.match(/\\begin\{equation\*\}/g)||[]).length<10)errors.push('too few display equations in LaTeX');
if(fs.readdirSync(path.join(root,'docs'),{recursive:true}).some(x=>String(x).toLowerCase().endsWith('.pdf')))errors.push('unexpected PDF in publication tree');
for(const p of ['docs/index.html','docs/derivations.html','docs/assets/site.css','docs/assets/site.js','docs/assets/search-index.js'])if(!fs.existsSync(path.join(root,p)))errors.push('missing '+p);
if(total!==339)errors.push('expected 339 slides; got '+total);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('Verified '+chapters.length+' lecture pages, '+total+' slide sections and rendered assets, LaTeX source, references, and publication tree.');
