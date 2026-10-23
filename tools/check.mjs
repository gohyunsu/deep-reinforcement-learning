import fs from 'node:fs';
import path from 'node:path';
import { sets } from '../content/midterm/questions.mjs';
import { groups } from '../content/midterm/models.mjs';

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
if (htmlFiles.length !== manifest.length + assignments.length + 3)
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
  const pageHtml = fs.readFileSync(page, 'utf8');
  const questionCoverage = {
    hw1: ['환경 튜토리얼의 세 질문', 'Ant-v4', '네 가지 이상의 값', 'BC와 DAgger 비교'],
    hw2: ['CartPole의 네 질문', 'HalfCheetah-v4', 'HumanoidStandup-v5', 'Reacher-v4'],
    hw3: ['먼저 확인하는 DQN T/F', 'Toy 실험의 두 질문', 'Asterix-v5', '0.001', '0.05']
  };
  for (const term of questionCoverage[assignment.id] || []) {
    if (!pageHtml.includes(term)) fail('Missing assignment question coverage: ' + assignment.id + ' / ' + term);
  }
  for (const ref of assignment.slides) {
    const [id, number] = ref.split(':');
    const chapterPage = fs.readFileSync(path.join(docs, 'lecture', id + '.html'), 'utf8');
    if (!chapterPage.includes('href="../assignments/' + assignment.id + '.html"'))
      fail('Missing assignment backlink: ' + ref);
    if (!fs.readFileSync(page, 'utf8').includes('href="../lecture/' + id + '.html#s' + number + '"'))
      fail('Missing assignment slide link: ' + ref);
  }
}
const midtermChapters = manifest.filter(chapter => !chapter.id.startsWith('07-'));
if (sets.length !== 3) fail('Expected three midterm sets');
for (const set of sets) {
  if (set.tf.length !== 25 || set.mc.length !== 4 || set.short.length !== 29)
    fail('Wrong 58-question exam format: ' + set.id);
  const questions = [...set.tf, ...set.mc, ...set.short];
  const coveredChapters = new Set();
  const coveredHomework = new Set();
  for (const question of questions) {
    const [chapterId, slideNo] = question.slide.split(':');
    const chapter = midtermChapters.find(item => item.id === chapterId);
    if (!chapter || !Number.isInteger(Number(slideNo)) || Number(slideNo) < 1 ||
      Number(slideNo) > chapter.pages) fail('Question outside midterm lecture scope: ' + question.slide);
    coveredChapters.add(chapterId);
    if (question.homework) {
      if (!assignments.some(item => item.id === question.homework)) fail('Unknown HW: ' + question.homework);
      coveredHomework.add(question.homework);
    }
    if (!question.prompt || !question.explanation) fail('Missing prompt/explanation in ' + set.id);
    if (question.type === 'tf' && typeof question.answer !== 'boolean') fail('Bad T/F answer in ' + set.id);
    if (question.type === 'mc' &&
      (question.choices.length !== 4 || !Number.isInteger(question.answer) ||
       question.answer < 0 || question.answer > 3)) fail('Bad multiple choice in ' + set.id);
    if (question.type === 'short' && !question.answer) fail('Missing short answer in ' + set.id);
  }
  for (const chapter of midtermChapters) if (!coveredChapters.has(chapter.id))
    fail('Missing lecture in set ' + set.id + ': ' + chapter.id);
  for (const id of ['hw1','hw2','hw3']) if (!coveredHomework.has(id))
    fail('Missing homework in set ' + set.id + ': ' + id);
}
const practice = fs.readFileSync(path.join(docs, 'midterm/index.html'), 'utf8');
if ([...practice.matchAll(/class="question-card"/g)].length !== sets.length * 58 ||
  !practice.includes('T/F 25') || !practice.includes('객관식 4') ||
  !practice.includes('단답형 29')) fail('Midterm practice page missing questions/format');
const home = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
if (!home.includes('href="midterm/index.html"') || !home.includes('href="midterm/models.html"'))
  fail('Midterm pages missing from home');
const models = fs.readFileSync(path.join(docs, 'midterm/models.html'), 'utf8');
if ([...models.matchAll(/class="model-group"/g)].length !== groups.length ||
  !models.includes('Double DQN') || !models.includes('IQL')) fail('Model comparison incomplete');
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
const expectedSlides = manifest.reduce((total, chapter) => total + chapter.pages, 0);
if (slides !== expectedSlides) fail('Slide total mismatch: ' + slides + ' expected ' + expectedSlides);
console.log('Checked ' + slides + ' slides, ' + assignments.length + ' assignments, ' + htmlFiles.length +
  ' pages, ' + (sets.length * 58) + ' midterm questions, lecture/HW coverage and local links.');
