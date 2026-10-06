import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const docs = path.join(root, 'docs');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/manifest.json'), 'utf8'));
const assignments = JSON.parse(fs.readFileSync(path.join(root, 'content/assignments.json'), 'utf8'));
const fail = message => { throw new Error(message); };
const files = [];
function walk(folder) {
  for (const entry of fs.readdirSync(folder, {withFileTypes: true})) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(docs);
const allowed = new Set(['.html', '.css', '.js', '.svg', '.webp', '.pdf', '']);
for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  if (!allowed.has(ext)) fail('Unexpected public file: ' + file);
  if (ext === '.pdf' && path.relative(docs, file).replaceAll('\\', '/') !== 'study-guide.pdf')
    fail('Unexpected public PDF: ' + file);
}
const htmlFiles = files.filter(file => file.endsWith('.html'));
if (htmlFiles.length !== manifest.length + assignments.length + 1)
  fail('Unexpected HTML page count: ' + htmlFiles.length);
let slides = 0;
for (const chapter of manifest) {
  const file = path.join(docs, 'lecture', chapter.id + '.html');
  const html = fs.readFileSync(file, 'utf8');
  const count = [...html.matchAll(/<section class="slide" id="s\d{2}"/g)].length;
  if (count !== chapter.pages) fail(chapter.id + ': expected ' + chapter.pages + ' slides, found ' + count);
  for (let number = 1; number <= chapter.pages; number++) {
    const pad = String(number).padStart(2, '0');
    const image = path.join(docs, 'assets/slides', chapter.id, pad + '.webp');
    if (!fs.existsSync(image) || fs.statSync(image).size < 1000) fail('Missing/empty slide image: ' + image);
    if (!html.includes('id="s' + pad + '"')) fail('Missing slide anchor: ' + chapter.id + ':' + pad);
  }
  slides += count;
}
for (const assignment of assignments) {
  const page = path.join(docs, 'assignments', assignment.id + '.html');
  if (!fs.existsSync(page)) fail('Missing assignment page: ' + assignment.id);
  for (const ref of assignment.slides) {
    const [id, number] = ref.split(':');
    const chapterPage = fs.readFileSync(path.join(docs, 'lecture', id + '.html'), 'utf8');
    if (!chapterPage.includes('href="../assignments/' + assignment.id + '.html"'))
      fail('Missing assignment backlink: ' + ref);
    if (!fs.readFileSync(page, 'utf8').includes('href="../lecture/' + id + '.html#s' + number + '"'))
      fail('Missing assignment slide link: ' + ref);
  }
}
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('Deep Reinforcement Learning')) fail('Wrong site title: ' + file);
  if (html.includes('Deep RL Guide') || html.includes('개념 전개 펼치기')) fail('Old layout text: ' + file);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(?:https?:|mailto:|data:|#)/.test(url)) continue;
    const [relative, hash] = url.split('#');
    const target = path.resolve(path.dirname(file), relative);
    if (!target.startsWith(docs + path.sep) || !fs.existsSync(target)) fail('Broken local link: ' + file + ' -> ' + url);
    if (hash && target.endsWith('.html')) {
      const linked = fs.readFileSync(target, 'utf8');
      if (!linked.includes('id="' + hash + '"')) fail('Broken anchor: ' + file + ' -> ' + url);
    }
  }
}
const pdf = path.join(docs, 'study-guide.pdf');
if (!fs.existsSync(pdf) || fs.statSync(pdf).size < 100000) fail('Missing compiled PDF');
if (slides !== 339) fail('Slide total mismatch: ' + slides);
console.log('Checked ' + slides + ' slides, ' + assignments.length + ' assignments, ' + htmlFiles.length + ' pages and local links.');
