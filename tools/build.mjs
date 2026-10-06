import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const root = path.resolve(import.meta.dirname, '..');
const docs = path.join(root, 'docs');
const title = 'Deep Reinforcement Learning';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/manifest.json'), 'utf8'));
const assignments = JSON.parse(fs.readFileSync(path.join(root, 'content/assignments.json'), 'utf8'));
const figures = {
  '02-1:25': ['mdp-loop.svg', '정책의 행동과 환경의 전이가 만드는 MDP의 한 단계'],
  '03-2:18': ['ppo-clip.svg', 'Advantage 부호에 따라 달라지는 PPO clipping'],
  '06:08': ['offline-support.svg', '기록된 행동 범위 밖의 가치 추정은 검증되지 않는다']
};
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[char]);

function parseLecture(meta) {
  const source = fs.readFileSync(path.join(root, 'content', meta.id + '.md'), 'utf8').replaceAll('\r\n', '\n');
  const heading = source.match(/^# (.+)$/m);
  const matches = [...source.matchAll(/^## 슬라이드 (\d{2}) · (.+)$/gm)];
  if (!heading || matches.length !== meta.pages) throw new Error(meta.id + ': slide count or heading mismatch');
  const slides = matches.map((match, index) => ({
    number: match[1],
    title: match[2].trim(),
    markdown: source.slice(match.index + match[0].length, matches[index + 1]?.index ?? source.length).trim()
  }));
  slides.forEach((slide, index) => {
    if (Number(slide.number) !== index + 1 || slide.markdown.length < 100)
      throw new Error(meta.id + ': empty or misnumbered slide ' + slide.number);
    const image = path.join(docs, 'assets/slides', meta.id, slide.number + '.webp');
    if (!fs.existsSync(image)) throw new Error('Missing image: ' + image);
  });
  return {
    ...meta,
    chapterTitle: heading[1].replace(/^[\d-]+\.\s*/, ''),
    intro: source.slice(heading.index + heading[0].length, matches[0].index).trim(),
    slides
  };
}
const chapters = manifest.map(parseLecture);
const refs = new Set(chapters.flatMap(chapter => chapter.slides.map(slide => chapter.id + ':' + slide.number)));
for (const assignment of assignments) {
  if (!fs.existsSync(path.join(root, 'content/assignments', assignment.file)))
    throw new Error('Missing assignment: ' + assignment.id);
  for (const ref of assignment.slides) if (!refs.has(ref)) throw new Error('Unknown assignment reference: ' + ref);
}

function withMath(markdown) {
  const tokens = [];
  let prepared = markdown.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, formula) => {
    const index = tokens.push({display: true, formula}) - 1;
    return '\n\n@@MATHBLOCK' + index + '@@\n\n';
  });
  prepared = prepared.replace(/(?<!\\)\$((?:\\\$|[^$\n])+?)\$/g, (_, formula) => {
    const index = tokens.push({display: false, formula}) - 1;
    return '@@MATHINLINE' + index + '@@';
  });
  let html = marked.parse(prepared, {gfm: true, breaks: false});
  html = html.replace(/<p>@@MATHBLOCK(\d+)@@<\/p>/g, (_, index) =>
    '<div class="equation">\\[' + escapeHtml(tokens[Number(index)].formula) + '\\]</div>');
  html = html.replace(/@@MATHINLINE(\d+)@@/g, (_, index) =>
    '<span class="math-inline">\\(' + escapeHtml(tokens[Number(index)].formula) + '\\)</span>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  if (/@@MATH(?:BLOCK|INLINE)\d+@@/.test(html)) throw new Error('Unreplaced math token');
  return html;
}

function chapterCards(prefix) {
  return chapters.map(chapter =>
    '<a class="overview-card card-' + chapter.color + '" href="' + prefix + 'lecture/' + chapter.id + '.html">' +
    '<div class="overview-card-top"><span>' + chapter.id + '</span><span>' + chapter.pages + '개 슬라이드</span></div>' +
    '<h3>' + escapeHtml(chapter.title) + '</h3><p>' + escapeHtml(chapter.short) + '</p>' +
    '<div class="card-arrow">학습하기 <span>↗</span></div></a>').join('');
}
function chapterNav(current) {
  return chapters.map(chapter =>
    '<a class="chapter-link ' + (chapter.id === current ? 'is-current' : '') + '" href="../lecture/' + chapter.id + '.html">' +
    '<span class="chapter-num">' + chapter.id + '</span><span><strong>' + escapeHtml(chapter.title) + '</strong>' +
    '<small>' + escapeHtml(chapter.short) + '</small></span><span class="chapter-count">' + chapter.pages + '</span></a>').join('');
}
function assignmentNav(current) {
  return assignments.map(assignment =>
    '<a class="chapter-link ' + (assignment.id === current ? 'is-current' : '') + '" href="../assignments/' + assignment.id + '.html">' +
    '<span class="chapter-num">' + assignment.id.toUpperCase() + '</span><span><strong>' + escapeHtml(assignment.title) +
    '</strong><small>' + escapeHtml(assignment.short) + '</small></span></a>').join('');
}
function shell(pageTitle, body, prefix) {
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="description" content="Deep Reinforcement Learning — 슬라이드별 한국어 학습 가이드">' +
    '<title>' + escapeHtml(pageTitle) + ' · ' + title + '</title>' +
    '<link rel="stylesheet" href="' + prefix + 'assets/site.css">' +
    '<script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script></head>' +
    '<body data-prefix="' + prefix + '"><div class="reading-progress" aria-hidden="true"></div>' +
    '<header class="site-header"><a class="brand" href="' + prefix + 'index.html"><span class="brand-mark">π</span>' +
    '<span class="brand-title">' + title + '</span></a>' +
    '<a class="pdf-link" href="' + prefix + 'study-guide.pdf" download>PDF 가이드 ↓</a>' +
    '<button type="button" class="search-trigger" data-search-trigger aria-label="전체 검색 열기"><span>⌕</span> 검색 <kbd>/</kbd></button></header>' +
    body +
    '<dialog id="slide-dialog" class="slide-dialog"><button type="button" class="dialog-close" data-dialog-close aria-label="이미지 닫기">×</button><img alt="확대한 슬라이드"><p></p></dialog>' +
    '<dialog id="search-dialog" class="search-dialog"><div class="search-panel"><div class="search-input-row"><span>⌕</span>' +
    '<input type="search" id="search-input" placeholder="개념, 사례, 수식 검색" aria-label="전체 내용 검색">' +
    '<button type="button" data-search-close aria-label="검색 닫기">×</button></div>' +
    '<div id="search-results" class="search-results"></div><p class="search-hint">슬라이드 제목과 설명을 함께 검색합니다. Esc로 닫기</p></div></dialog>' +
    '<script src="' + prefix + 'assets/search-index.js"></script><script src="' + prefix + 'assets/site.js"></script></body></html>';
}
function sidebar(current, slideList = '') {
  return '<aside class="sidebar"><a class="sidebar-home" href="../index.html">← 전체 목차</a>' +
    '<div class="sidebar-label">강의</div><nav aria-label="강의 목록" class="chapter-nav">' + chapterNav(current) + '</nav>' +
    '<div class="sidebar-label">과제</div><nav aria-label="과제 목록" class="chapter-nav">' + assignmentNav(current) + '</nav>' +
    (slideList ? '<div class="sidebar-label sidebar-label-slides">이 장의 슬라이드</div><nav aria-label="슬라이드 목차" class="slide-nav">' + slideList + '</nav>' : '') +
    '</aside>';
}
function writeIndex() {
  const assignmentCards = assignments.map(assignment =>
    '<a class="overview-card card-teal" href="assignments/' + assignment.id + '.html">' +
    '<div class="overview-card-top"><span>' + assignment.id.toUpperCase() + '</span><span>과제 가이드</span></div>' +
    '<h3>' + escapeHtml(assignment.title) + '</h3><p>' + escapeHtml(assignment.short) + '</p>' +
    '<div class="card-arrow">과제 살펴보기 <span>↗</span></div></a>').join('');
  const body = '<main class="home-main"><section class="home-hero"><div class="eyebrow">' + title + '</div>' +
    '<h1>상태와 행동에서<br><em>정책 학습의 직관</em>까지</h1>' +
    '<p>순차 의사결정의 기초에서 모방학습, 정책경사, Q-learning, 오프라인 강화학습까지. 슬라이드 한 장씩 원리와 수식을 따라가며 실제 연구 사례로 연결한다.</p>' +
    '<div class="hero-actions"><a class="primary-button" href="lecture/01-1.html">처음부터 읽기 <span>→</span></a>' +
    '<a class="pdf-link" href="study-guide.pdf" download>PDF 내려받기 ↓</a>' +
    '<span>10개 장 · 339개 슬라이드</span></div><div class="hero-formula">\\[\\pi^*=\\arg\\max_\\pi\\;\\mathbb E_\\pi\\!\\left[\\sum_{t=0}^{\\infty}\\gamma^t r_t\\right]\\]</div></section>' +
    '<section class="learning-path"><div class="section-kicker">학습 경로</div><h2>개념에서 알고리즘으로</h2>' +
    '<div class="path-line"><span>순차 결정</span><b>→</b><span>모방학습</span><b>→</b><span>정책경사</span><b>→</b><span>가치학습</span><b>→</b><span>오프라인 RL</span></div>' +
    '<div class="overview-grid">' + chapterCards('') + '</div></section>' +
    '<section class="learning-path"><div class="section-kicker">ASSIGNMENTS</div><h2>과제로 연결하기</h2>' +
    '<div class="overview-grid">' + assignmentCards + '</div></section>' +
    '<section class="home-note"><h2>읽는 방법</h2><p>각 슬라이드 이미지 옆에 기본 설명이 바로 보인다. 추가 의문과 예외는 필요한 곳에서만 펼쳐 읽을 수 있다. 이미지를 눌러 수식과 그림을 확대하고, 관련 과제는 슬라이드 하단에서 이어서 볼 수 있다.</p></section>' +
    '<footer class="site-footer">' + title + '</footer></main>';
  fs.writeFileSync(path.join(docs, 'index.html'), shell('전체 목차', body, ''));
}
function writeLecture(chapter, index) {
  const slideList = chapter.slides.map(slide =>
    '<a href="#s' + slide.number + '" data-slide-link="' + slide.number + '"><span>' + slide.number + '</span>' +
    escapeHtml(slide.title) + '</a>').join('');
  const sections = chapter.slides.map(slide => {
    const image = '../assets/slides/' + chapter.id + '/' + slide.number + '.webp';
    const figure = figures[chapter.id + ':' + slide.number];
    const figureHtml = figure ? '<figure class="concept-figure"><img src="../assets/figures/' + figure[0] +
      '" alt="' + escapeHtml(figure[1]) + '" loading="lazy"><figcaption>' + escapeHtml(figure[1]) + '</figcaption></figure>' : '';
    const related = assignments.filter(assignment => assignment.slides.includes(chapter.id + ':' + slide.number));
    const footer = related.length ? '<div class="slide-assignment"><span>이 개념을 적용하는 과제</span>' +
      related.map(assignment => '<a href="../assignments/' + assignment.id + '.html">' +
        escapeHtml(assignment.title) + ' ↗</a>').join('') + '</div>' : '';
    return '<section class="slide" id="s' + slide.number + '" data-slide="' + slide.number + '">' +
      '<div class="slide-heading"><span class="slide-index">' + chapter.id + ' / ' + slide.number + '</span>' +
      '<h2>' + escapeHtml(slide.title) + '</h2></div><div class="slide-grid">' +
      '<figure class="slide-figure"><button type="button" class="slide-image-button" data-zoom-src="' + image +
      '" data-zoom-label="' + escapeHtml(chapter.id + '장 슬라이드 ' + slide.number + ': ' + slide.title) +
      '" aria-label="슬라이드 ' + slide.number + ' 이미지 확대"><img src="' + image + '" alt="' +
      escapeHtml(chapter.id + '장 슬라이드 ' + slide.number + ': ' + slide.title) +
      '" loading="lazy" decoding="async"><span class="zoom-hint">확대해서 보기 ↗</span></button>' +
      '<figcaption>슬라이드 ' + slide.number + '</figcaption></figure>' +
      '<div class="explanation">' + withMath(slide.markdown) + figureHtml + '</div></div>' + footer + '</section>';
  }).join('');
  const previous = chapters[index - 1], next = chapters[index + 1];
  const pager = '<nav class="chapter-pager" aria-label="이전·다음 장">' +
    (previous ? '<a href="' + previous.id + '.html"><small>이전 장</small><strong>← ' + escapeHtml(previous.title) + '</strong></a>' : '<span></span>') +
    (next ? '<a href="' + next.id + '.html"><small>다음 장</small><strong>' + escapeHtml(next.title) + ' →</strong></a>' : '<span></span>') + '</nav>';
  const body = '<div class="layout">' + sidebar(chapter.id, slideList) + '<main class="lecture-main">' +
    '<section class="lecture-hero"><div class="eyebrow">' + chapter.id + '장 · ' + chapter.pages + '개 슬라이드</div>' +
    '<h1>' + escapeHtml(chapter.title) + '</h1><div class="lecture-intro">' + withMath(chapter.intro) + '</div>' +
    '<div class="lecture-start"><a href="#s01">첫 슬라이드로 내려가기 ↓</a><span>' + (index + 1) +
    ' / ' + chapters.length + '</span></div></section>' + sections + pager +
    '<footer class="site-footer">' + title + '</footer></main></div>';
  fs.writeFileSync(path.join(docs, 'lecture', chapter.id + '.html'), shell(chapter.title, body, '../'));
}
function writeAssignment(assignment) {
  const source = fs.readFileSync(path.join(root, 'content/assignments', assignment.file), 'utf8');
  const content = source.replace(/^# .+\r?\n/, '').trim();
  const related = assignment.slides.map(ref => {
    const [id, number] = ref.split(':');
    const chapter = chapters.find(item => item.id === id);
    const slide = chapter.slides[Number(number) - 1];
    return '<a href="../lecture/' + id + '.html#s' + number + '">' + id + ' / ' + number +
      ' · ' + escapeHtml(slide.title) + ' ↗</a>';
  }).join('');
  const body = '<div class="layout">' + sidebar(assignment.id) + '<main class="lecture-main">' +
    '<section class="lecture-hero assignment-hero"><div class="eyebrow">ASSIGNMENT GUIDE</div><h1>' +
    escapeHtml(assignment.title) + '</h1><div class="lecture-intro"><p>' + escapeHtml(assignment.short) +
    '</p></div></section><article class="assignment-content explanation">' + withMath(content) +
    '</article><nav class="assignment-related"><h2>연결되는 슬라이드</h2><div>' + related +
    '</div></nav><footer class="site-footer">' + title + '</footer></main></div>';
  fs.writeFileSync(path.join(docs, 'assignments', assignment.id + '.html'), shell(assignment.title, body, '../'));
}

fs.mkdirSync(path.join(docs, 'lecture'), {recursive: true});
fs.mkdirSync(path.join(docs, 'assignments'), {recursive: true});
fs.mkdirSync(path.join(docs, 'assets'), {recursive: true});
writeIndex();
chapters.forEach(writeLecture);
assignments.forEach(writeAssignment);
const search = chapters.flatMap(chapter => chapter.slides.map(slide => ({
  chapter: chapter.id, chapterTitle: chapter.title, slide: slide.number, title: slide.title,
  text: slide.markdown.replace(/<[^>]+>|\$\$?/g, ' ').replace(/[*_#|\\]/g, ' ').replace(/\s+/g, ' ')
})));
fs.writeFileSync(path.join(docs, 'assets/search-index.js'), 'window.GUIDE_SEARCH=' + JSON.stringify(search) + ';\n');
console.log('Built ' + chapters.length + ' chapters, ' + search.length + ' slides, ' + assignments.length + ' assignments.');
