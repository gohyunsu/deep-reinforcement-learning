const storageKey='drl-midterm-practice-v1';
let saved={};
try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch{saved={}}
const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch{}};
const setPanels=[...document.querySelectorAll('.practice-set')];
function updateProgress(panel){
  const cards=[...panel.querySelectorAll('.question-card')];
  const done=cards.filter(card=>saved[card.dataset.questionId]!==undefined);
  const objective=done.filter(card=>card.dataset.type!=='short');
  const correct=objective.filter(card=>Number(saved[card.dataset.questionId])===Number(card.dataset.answer)).length;
  panel.querySelector('[data-progress-label]').textContent=done.length+' / '+cards.length+' 확인';
  panel.querySelector('[data-score-label]').textContent='T/F·객관식 정답 '+correct+' / 29';
  panel.querySelector('[data-progress-bar]').style.width=(done.length/cards.length*100)+'%';
}
function showResponse(card,value){
  const feedback=card.querySelector('[data-feedback]');
  feedback.hidden=false;
  card.classList.add('is-answered');
  if(card.dataset.type==='short'){
    card.querySelector('[data-reveal]').hidden=true;
    return;
  }
  const chosen=Number(value),answer=Number(card.dataset.answer);
  const buttons=[...card.querySelectorAll('[data-choice]')];
  buttons.forEach(button=>{
    const option=Number(button.dataset.choice);
    button.disabled=true;
    button.classList.toggle('is-selected',option===chosen);
    button.classList.toggle('is-correct',option===answer);
    button.classList.toggle('is-wrong',option===chosen&&chosen!==answer);
  });
  const correct=chosen===answer;
  feedback.classList.toggle('is-wrong',!correct);
  feedback.querySelector('[data-result]').textContent=correct
    ? '정답입니다'
    : '다시 확인하기 · 정답 '+(card.dataset.type==='tf'?(answer===0?'참 (T)':'거짓 (F)'):String.fromCharCode(65+answer));
}
document.querySelectorAll('.question-card').forEach(card=>{
  const id=card.dataset.questionId;
  if(saved[id]!==undefined)showResponse(card,saved[id]);
  if(card.dataset.type==='short'){
    card.querySelector('[data-reveal]').addEventListener('click',()=>{
      if(saved[id]!==undefined)return;
      saved[id]=true;persist();showResponse(card,true);updateProgress(card.closest('.practice-set'));
    });
  }else{
    card.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>{
      if(saved[id]!==undefined)return;
      saved[id]=Number(button.dataset.choice);persist();showResponse(card,saved[id]);
      updateProgress(card.closest('.practice-set'));
    }));
  }
});
setPanels.forEach(updateProgress);
function activateSet(id){
  setPanels.forEach(panel=>{panel.hidden=panel.dataset.set!==id});
  document.querySelectorAll('[data-set-button]').forEach(button=>{
    button.setAttribute('aria-selected',String(button.dataset.setButton===id));
  });
}
document.querySelectorAll('[data-set-button]').forEach(button=>button.addEventListener('click',()=>{
  activateSet(button.dataset.setButton);
  button.scrollIntoView({block:'nearest',inline:'nearest'});
}));
document.querySelectorAll('[data-reset]').forEach(button=>button.addEventListener('click',()=>{
  const panel=document.querySelector('.practice-set[data-set="'+button.dataset.reset+'"]');
  panel.querySelectorAll('.question-card').forEach(card=>{
    delete saved[card.dataset.questionId];
    card.classList.remove('is-answered');
    const feedback=card.querySelector('[data-feedback]');
    feedback.hidden=true;feedback.classList.remove('is-wrong');
    if(card.dataset.type==='short')card.querySelector('[data-reveal]').hidden=false;
    else card.querySelectorAll('[data-choice]').forEach(option=>{
      option.disabled=false;
      option.classList.remove('is-selected','is-correct','is-wrong');
    });
  });
  persist();updateProgress(panel);
}));
const requestedSet=location.hash.match(/^#([abc])-(?:tf|mc|short)$/)?.[1];
if(requestedSet)activateSet(requestedSet);
