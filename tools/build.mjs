import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { sets } from '../content/midterm/questions.mjs';
import { groups } from '../content/midterm/models.mjs';

const root = path.resolve(import.meta.dirname, '..');
const docs = path.join(root, 'docs');
const title = 'Deep Reinforcement Learning';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/manifest.json'), 'utf8'));
const slideCount = manifest.reduce((total, chapter) => total + chapter.pages, 0);
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
    if (Number(slide.number) !== index + 1 || slide.markdown.length < 10)
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
function inlineMath(markdown) {
  return withMath(markdown).trim().replace(/^<p>/, '').replace(/<\/p>$/, '');
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
    '<p>순차 의사결정의 기초에서 모방학습, 정책경사, 가치학습, 오프라인·모델 기반 강화학습까지. 슬라이드 한 장씩 원리와 수식을 따라가며 실제 연구 사례로 연결한다.</p>' +
    '<div class="hero-actions"><a class="primary-button" href="lecture/01-1.html">처음부터 읽기 <span>→</span></a>' +
    '<a class="pdf-link" href="study-guide.pdf" download>PDF 내려받기 ↓</a>' +
    '<span>' + chapters.length + '개 장 · ' + slideCount + '개 슬라이드</span></div><div class="hero-formula">\\[\\pi^*=\\arg\\max_\\pi\\;\\mathbb E_\\pi\\!\\left[\\sum_{t=0}^{\\infty}\\gamma^t r_t\\right]\\]</div></section>' +
    '<section class="learning-path"><div class="section-kicker">학습 경로</div><h2>개념에서 알고리즘으로</h2>' +
    '<div class="path-line"><span>순차 결정</span><b>→</b><span>모방학습</span><b>→</b><span>정책경사</span><b>→</b><span>가치학습</span><b>→</b><span>오프라인 RL</span><b>→</b><span>Model-based RL</span></div>' +
    '<div class="overview-grid">' + chapterCards('') + '</div></section>' +
    '<section class="learning-path midterm-home"><div class="section-kicker">MIDTERM PRACTICE</div><h2>중간고사 연습</h2>' +
    '<p class="midterm-home-intro">Model-based RL 이전의 강의와 HW1·HW2·HW3를 58문항 구성으로 연습한다. 문제를 풀고 해설에서 개념을 다시 확인할 수 있다.</p>' +
    '<div class="overview-grid">' +
    '<a class="overview-card card-blue" href="midterm/index.html"><div class="overview-card-top"><span>3 SETS</span><span>174문항</span></div><h3>문제 풀기</h3><p>세트마다 T/F 25 · 객관식 4 · 단답형 29</p><div class="card-arrow">연습 시작 <span>↗</span></div></a>' +
    '<a class="overview-card card-teal" href="midterm/models.html"><div class="overview-card-top"><span>MODEL MAP</span><span>4개 계열</span></div><h3>주요 모델 비교</h3><p>학습 데이터, 업데이트 방식, 강점과 한계를 한눈에 정리</p><div class="card-arrow">비교표 보기 <span>↗</span></div></a>' +
    '</div></section>' +
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

const topicNames = {
  '01-1':'강화학습의 문제', '01-2':'모방학습', '02-1':'MDP 기초',
  '02-2':'정책경사', '03-1':'Actor–Critic', '03-2':'GAE·PPO',
  '04-1':'Q-learning·DQN', '05-1':'연속 행동 RL',
  '05-2':'벤치마크', '06':'Offline RL'
};
function refHtml(slide, homework) {
  const [id, number] = slide.split(':');
  return '<a href="../lecture/' + id + '.html#s' + number.padStart(2, '0') + '">' +
    id + ' / ' + number.padStart(2, '0') + ' ↗</a>' +
    (homework ? '<a href="../assignments/' + homework + '.html">' + homework.toUpperCase() + ' ↗</a>' : '');
}
function midtermNav(current) {
  return '<nav class="midterm-nav" aria-label="중간고사 학습 메뉴">' +
    '<a href="../index.html">← 전체 목차</a>' +
    '<a class="' + (current === 'practice' ? 'is-current' : '') + '" href="index.html">문제 풀기</a>' +
    '<a class="' + (current === 'models' ? 'is-current' : '') + '" href="models.html">주요 모델 비교</a></nav>';
}
function renderQuestion(question, setId, index, number) {
  const id = setId + '-' + question.type + '-' + String(index + 1).padStart(2, '0');
  const topic = topicNames[question.slide.split(':')[0]];
  const meta = '<div class="question-meta"><span>' + String(number).padStart(2, '0') + '</span>' +
    '<span>' + escapeHtml(topic) + '</span>' +
    (question.homework ? '<span>' + question.homework.toUpperCase() + '</span>' : '') + '</div>';
  const choices = question.type === 'short'
    ? '<button type="button" class="reveal-button" data-reveal>답 확인하기</button>' +
      '<div class="question-feedback" data-feedback hidden><strong>예시 답안</strong><div>' +
      withMath(question.answer) + '</div><p>' + escapeHtml(question.explanation) + '</p></div>'
    : '<div class="answer-options">' + (question.type === 'tf' ? ['참 (T)', '거짓 (F)'] : question.choices)
      .map((choice, n) => '<button type="button" data-choice="' + n + '">' +
        (question.type === 'mc' ? '<span class="option-letter">' + String.fromCharCode(65 + n) + '</span>' : '') +
        escapeHtml(choice) + '</button>').join('') + '</div>' +
      '<div class="question-feedback" data-feedback hidden aria-live="polite"><strong data-result></strong><p>' +
      escapeHtml(question.explanation) + '</p></div>';
  const answer = question.type === 'tf' ? (question.answer ? 0 : 1) : question.answer;
  return '<article class="question-card" id="' + id + '" data-question-id="' + id +
    '" data-type="' + question.type + '" data-answer="' + answer + '" data-slide="' + question.slide +
    '" data-homework="' + (question.homework || '') + '">' + meta +
    '<h3>' + inlineMath(question.prompt) + '</h3>' + choices +
    '<div class="question-ref"><span>다시 읽기</span>' + refHtml(question.slide, question.homework) +
    '</div></article>';
}
function writeMidtermPractice() {
  const setHtml = sets.map((set, setIndex) => {
    const parts = [
      ['tf', 'T/F', '참 또는 거짓을 선택하면 바로 정답과 해설이 나온다.', set.tf, 1],
      ['mc', '객관식', '보기 하나를 선택한다.', set.mc, 26],
      ['short', '단답형', '먼저 머릿속이나 종이에 답한 다음 버튼을 눌러 예시 답안을 확인한다.', set.short, 30]
    ];
    return '<div class="practice-set" data-set="' + set.id + '"' + (setIndex ? ' hidden' : '') + '>' +
      '<div class="set-heading"><div><div class="eyebrow">' + escapeHtml(set.title) +
      '</div><h2>58개 소문항</h2></div><button type="button" class="reset-button" data-reset="' + set.id +
      '">이 세트 다시 풀기</button></div>' +
      '<div class="set-progress"><div class="progress-copy"><strong data-progress-label>0 / 58 확인</strong>' +
      '<span data-score-label>T/F·객관식 정답 0 / 29</span></div><div class="progress-track"><span data-progress-bar></span></div></div>' +
      '<nav class="type-jump" aria-label="문항 유형"><a href="#' + set.id + '-tf">T/F 25</a>' +
      '<a href="#' + set.id + '-mc">객관식 4</a><a href="#' + set.id + '-short">단답형 29</a></nav>' +
      parts.map(([type, label, intro, questions, start]) =>
        '<section class="question-group" id="' + set.id + '-' + type + '"><div class="group-heading"><div class="section-kicker">' +
        (type === 'tf' ? '01 / 03' : type === 'mc' ? '02 / 03' : '03 / 03') + '</div><h2>' + label +
        ' <span>' + questions.length + '문항</span></h2><p>' + intro + '</p></div>' +
        questions.map((q, index) => renderQuestion(q, set.id, index, start + index)).join('') +
        '</section>').join('') + '</div>';
  }).join('');
  const body = '<main class="midterm-main">' + midtermNav('practice') +
    '<section class="midterm-hero"><div class="eyebrow">MIDTERM PRACTICE</div>' +
    '<h1>개념을 직접 풀어 보기</h1><p>강화학습의 출발점부터 모방학습, MDP, 정책경사, PPO, DQN, 연속 행동 RL, Offline RL까지. ' +
    'HW1·HW2·HW3의 핵심 구현과 해석도 함께 묻는다.</p>' +
    '<div class="coverage-strip"><span>범위: Model-based RL 이전 강의 + HW1–3</span>' +
    '<span>세트별 T/F 25 · 객관식 4 · 단답형 29</span><span>총 3세트 · 174문항</span></div>' +
    '<div class="midterm-hero-link"><a href="models.html">주요 모델 비교표 보기 →</a></div></section>' +
    '<div class="set-tabs" role="tablist" aria-label="연습 세트">' +
    sets.map((set, index) => '<button type="button" role="tab" data-set-button="' + set.id +
      '" aria-selected="' + (index === 0) + '">' + escapeHtml(set.title) + '</button>').join('') +
    '</div><div id="practice-sets">' + setHtml + '</div>' +
    '<footer class="site-footer">' + title + '</footer></main>';
  fs.writeFileSync(path.join(docs, 'midterm/index.html'),
    shell('중간고사 연습', body, '../').replace('</body>',
      '<script defer src="../assets/midterm.js"></script></body>'));
}
function writeMidtermModels() {
  const tableHtml = groups.map((group, index) => '<section class="model-group" id="group-' + (index + 1) + '">' +
    '<div class="section-kicker">0' + (index + 1) + ' / 04</div><h2>' + escapeHtml(group.title) + '</h2>' +
    '<p>' + escapeHtml(group.intro) + '</p><div class="model-table-scroll"><table class="model-table">' +
    '<thead><tr><th scope="col">모델·추정량</th><th scope="col">학습 자료</th><th scope="col">핵심 업데이트</th>' +
    '<th scope="col">강점</th><th scope="col">주의할 점</th><th scope="col">연결</th></tr></thead><tbody>' +
    group.rows.map(row => '<tr><th scope="row">' + escapeHtml(row[0]) + '</th>' +
      row.slice(1, 5).map(cell => '<td>' + inlineMath(cell) + '</td>').join('') +
      '<td class="model-links">' + refHtml(row[5], row[6]) + '</td></tr>').join('') +
    '</tbody></table></div></section>').join('');
  const body = '<main class="midterm-main">' + midtermNav('models') +
    '<section class="midterm-hero"><div class="eyebrow">MODEL COMPARISON</div><h1>주요 모델 비교</h1>' +
    '<div class="midterm-notation">' + withMath('같은 문제를 어떤 자료와 목표로 풀었는지 보면 알고리즘의 차이가 선명해진다. 표의 식에서 ' +
    '$s$는 상태, $a$는 행동, $r$은 보상, $\\gamma$는 할인율, $\\pi$는 정책, $Q$는 행동가치, ' +
    '$V$는 상태가치, $A=Q-V$는 advantage다.') + '</div>' +
    '<div class="coverage-strip"><span>Model-based RL 이전 범위</span><span>HW1–3 연결</span>' +
    '<span>4계열 · ' + groups.reduce((sum, group) => sum + group.rows.length, 0) + '개 항목</span></div>' +
    '<div class="midterm-hero-link"><a href="index.html">연습 문제로 돌아가기 →</a></div></section>' +
    '<nav class="type-jump" aria-label="모델 계열">' +
    groups.map((group, index) => '<a href="#group-' + (index + 1) + '">' + escapeHtml(group.title) + '</a>').join('') +
    '</nav>' + tableHtml +
    '<section class="model-reading"><h2>비교할 때의 질문</h2><ol>' +
    '<li><strong>데이터를 새로 모으는가?</strong> 현재 정책 rollout을 요구하는 PPO와 replay를 쓰는 DQN·SAC, 고정 데이터만 쓰는 IQL은 자료 조건이 다르다.</li>' +
    '<li><strong>어디서 행동을 고르는가?</strong> DQN은 이산 행동의 최대 Q를 열거하고, DDPG·TD3는 결정적 actor, SAC는 확률적 actor로 연속 행동을 다룬다.</li>' +
    '<li><strong>어떤 오차를 제어하는가?</strong> target network는 움직이는 목표, Double DQN·TD3는 과대평가, PPO는 큰 정책 업데이트의 이득, CQL·IQL은 데이터 밖 행동을 다룬다.</li>' +
    '</ol></section><footer class="site-footer">' + title + '</footer></main>';
  fs.writeFileSync(path.join(docs, 'midterm/models.html'), shell('주요 모델 비교', body, '../'));
}

fs.mkdirSync(path.join(docs, 'lecture'), {recursive: true});
fs.mkdirSync(path.join(docs, 'assignments'), {recursive: true});
fs.mkdirSync(path.join(docs, 'midterm'), {recursive: true});
fs.mkdirSync(path.join(docs, 'assets'), {recursive: true});
writeIndex();
chapters.forEach(writeLecture);
assignments.forEach(writeAssignment);
writeMidtermPractice();
writeMidtermModels();
const search = chapters.flatMap(chapter => chapter.slides.map(slide => ({
  chapter: chapter.id, chapterTitle: chapter.title, slide: slide.number, title: slide.title,
  text: slide.markdown.replace(/<[^>]+>|\$\$?/g, ' ').replace(/[*_#|\\]/g, ' ').replace(/\s+/g, ' ')
})));
fs.writeFileSync(path.join(docs, 'assets/search-index.js'), 'window.GUIDE_SEARCH=' + JSON.stringify(search) + ';\n');
console.log('Built ' + chapters.length + ' chapters, ' + search.length + ' slides, ' + assignments.length +
  ' assignments, ' + sets.length + ' midterm sets.');
