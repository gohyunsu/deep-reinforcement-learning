import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
const root=path.resolve(import.meta.dirname,'..'),docs=path.join(root,'docs');
const chapters=JSON.parse(fs.readFileSync(path.join(root,'content/chapters.json'),'utf8'));
const outline=JSON.parse(fs.readFileSync(path.join(root,'content/outline.json'),'utf8'));
const followUps=JSON.parse(fs.readFileSync(path.join(root,'content/followups.json'),'utf8'));
const src=c=>outline.find(x=>x.file===c.source);
const deck=c=>c.source.replace(/^DRL_/,'').replace(/\.pdf$/i,'');
const slides=c=>src(c).titles.map((title,i)=>({number:String(i+1).padStart(2,'0'),title:title||('슬라이드 '+(i+1)),range:c.ranges.find(r=>i+1>=r.from&&i+1<=r.to)}));
const total=chapters.reduce((n,c)=>n+slides(c).length,0);
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function mathHtml(s){
 const xs=[];let p=s.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g,(_,x)=>'\n\n@@MB'+(xs.push({d:1,x})-1)+'@@\n\n');
 p=p.replace(/(?<!\\)\$((?:\\\$|[^$\n])+?)\$/g,(_,x)=>'@@MI'+(xs.push({x})-1)+'@@').replace(/\\\(([\s\S]+?)\\\)/g,(_,x)=>'@@MI'+(xs.push({x})-1)+'@@');
 let h=marked.parse(p,{gfm:true});
 h=h.replace(/<p>@@MB(\d+)@@<\/p>/g,(_,i)=>'<div class="equation">\\['+esc(xs[+i].x)+'\\]</div>').replace(/@@MI(\d+)@@/g,(_,i)=>'<span class="math-inline">\\('+esc(xs[+i].x)+'\\)</span>');
 if(/@@M[BI]\d+@@/.test(h))throw Error('math marker');return h;
}
function nav(current,prefix){return chapters.map(c=>'<a class="chapter-link '+(current===c.id?'is-current':'')+'" href="'+prefix+'lecture/'+c.id+'.html"><span class="chapter-num">'+c.id+'</span><span><strong>'+esc(c.title)+'</strong><small>'+esc(c.short)+'</small></span><span class="chapter-count">'+slides(c).length+'</span></a>').join('');}
function slideFocus(c,s,i){
 const t=s.title.toLowerCase();
 if(i===0)return '표지에서 이 강의의 주제를 확인하고, 뒤따르는 예시가 어떤 의사결정 문제를 설명하는지 질문을 세워 둡니다.';
 if(t.includes('plan for today'))return '오늘의 목차는 개념의 순서를 보여 줍니다. 각 항목을 읽을 때 앞에서 배운 도구가 다음 알고리즘의 어떤 약점을 해결하는지 연결합니다.';
 if(t.includes('next class'))return '이 페이지는 이번 강의의 경계를 정리합니다. 마지막 개념이 다음 단원의 첫 질문으로 어떻게 이어지는지 한 문장으로 요약해 보세요.';
 if(t.includes('summary'))return '요약의 항목을 정의·목적함수·데이터 요구량·주요 실패 원인으로 나누어 정리합니다. 이름이 비슷한 알고리즘의 차이는 이 네 축에서 드러납니다.';
 if(c.id==='01-2'){
  if(t.includes('behavioral cloning'))return '전문가 상태–행동 쌍을 조건부 정책의 supervised label로 취급합니다. 손실이 맞추는 것은 데이터에 등장한 행동이며, 누적 return을 직접 최적화하는 것은 아닙니다.';
  if(t.includes('collect demonstrations'))return '시연 수집 방식마다 사람이 보거나 조종하는 정보와 로봇이 받는 관측이 달라집니다. 훈련·실행의 센서와 좌표계를 맞출 수 있는지 확인합니다.';
  if(t.includes('compounding errors'))return '한 번의 작은 행동 편차가 전문가 데이터에 없는 상태로 이동시키고, 그 상태의 추가 오차가 다시 다음 상태를 밀어냅니다. 시간 지평이 길수록 오차가 누적될 수 있습니다.';
  if(t.includes('multimodal'))return '서로 다른 두 행동이 모두 성공 전략일 수 있습니다. 평균 회귀 정책은 두 전략 사이의 잘못된 중간 행동을 낼 수 있어 확률분포가 다봉형인지 살핍니다.';
  if(t.includes('observability'))return '전문가가 관측한 정보가 정책 입력에서 빠지면, 동일한 입력에 서로 다른 정답 행동이 생깁니다. 데이터 양보다 입력 정보의 일치가 먼저입니다.';
  if(t.includes('dagger'))return 'DAgger는 학습 정책의 방문 상태에서 전문가 교정을 모아 데이터 분포를 갱신합니다. 전문가가 배포 정책이 만든 실수 상태에도 답할 수 있어야 작동합니다.';
  if(t.includes('aloha')||t.includes('act'))return 'ACT의 action chunk는 한 프레임의 단일 관절 명령 대신 가까운 미래 행동 묶음을 예측합니다. 시간적으로 일관된 실행과 여러 가능한 시연의 압축이 핵심입니다.';
  if(t.includes('mobile aloha'))return '이 사례는 양팔 조작에 이동 플랫폼과 전신 원격조종을 더합니다. 시연 데이터가 정밀 조작뿐 아니라 베이스 이동과 조작 사이의 협응까지 담아야 합니다.';
  if(t.includes('diffusion'))return '조건부 확산 정책은 잡음에서 시작해 관측에 맞는 행동 시퀀스로 반복 복원합니다. 다봉 행동을 표현하는 이점과 추론 단계·계산량 사이의 비용을 비교합니다.';
  if(t.includes('dataset')||t.includes('robot'))return '다기관 로봇 데이터는 로봇 형상·카메라·행동 단위가 달라집니다. 통합 전에 좌표계와 과업 라벨을 정규화해야 공통 정책이 같은 동작을 학습합니다.';
 }
 if(c.id==='02-1'){
  if(t.includes('markov'))return 'Markov 성질은 과거가 사라진다는 뜻이 아니라 현재 상태가 미래 예측에 충분한 정보라는 모델링 가정입니다. 상태 표현에서 빠진 속도나 문맥이 없는지 따져 봅니다.';
  if(t.includes('example'))return '예시의 각 경로 확률을 전이확률의 곱으로 계산하고, 경로별 반환을 확률로 가중해 상태가치를 구합니다. 합류 상태에서 경로 확률을 빠뜨리지 않습니다.';
  if(t.includes('policy'))return '정책은 상태에서 행동 분포를 지정합니다. 결정론 정책은 한 행동을 택하고 확률론 정책은 탐색 및 여러 동작 모드를 표현합니다.';
  if(t.includes('rl example'))return '사례를 MDP로 읽을 때 상태, 행동, 전이, 보상, 종료 조건을 각각 한 줄씩 명시합니다. 보상만 적고 상태·행동을 생략하면 학습 문제를 재현할 수 없습니다.';
 }
 if(c.id==='02-2'){
  if(t.includes('direct policy'))return '기대 return을 궤적 확률에 대한 적분으로 쓴 뒤, 확률밀도의 미분을 로그확률의 기울기로 바꿉니다. 환경 전이를 미분할 필요가 없다는 것이 이 전개의 결과입니다.';
  if(t.includes('reinforce'))return '표본 trajectory의 return으로 score function을 가중합니다. 기대값 수준에서는 맞는 경사지만, 한 표본의 반환이 모든 시간 행동에 곱해지는 분산 문제가 남습니다.';
  if(t.includes('variance'))return '분산이 크면 같은 데이터에서도 업데이트 방향이 크게 달라집니다. 학습률만 낮추면 불안정성이 줄 수 있지만, 같은 성능에 더 많은 상호작용이 필요해질 수 있습니다.';
  if(t.includes('large n'))return '독립 궤적 평균의 표준오차는 대략 표본 수의 제곱근에 반비례합니다. 표본 효율을 높이는 방법과 상호작용 수를 늘리는 방법을 구분합니다.';
 }
 if(c.id==='03-1'){
  if(t.includes('reward to go'))return '현재 행동은 현재보다 앞선 보상을 원인적으로 바꾸지 않습니다. score의 조건부 평균이 0이므로 과거 보상 항을 제거해도 기대 정책경사는 보존됩니다.';
  if(t.includes('baseline'))return '상태에만 의존하는 baseline은 행동 분포에 대한 score 평균을 0으로 만들어도 기댓값을 바꾸지 않습니다. baseline을 action-dependent로 만들면 이 증명이 자동으로 성립하지 않습니다.';
  if(t.includes('discount'))return '할인율은 먼 미래 보상에 곱할 가중치입니다. 정의한 반환식에서 시간 인덱스에 따라 할인 지수가 어떻게 달라지는지 계산합니다.';
  if(t.includes('value function')||t.includes('value function'))return 'V는 상태에서 시작하는 기대 반환, Q는 현재 행동을 고정한 기대 반환입니다. Q를 정책 행동에 대해 평균하면 V가 된다는 관계를 확인합니다.';
  if(t.includes('actor-critic'))return 'actor는 행동 확률을 조정하고 critic은 그 행동을 평가할 학습 신호를 제공합니다. critic은 보상을 대신하는 것이 아니라 정책경사의 분산을 낮추도록 반환을 근사합니다.';
 }
 if(c.id==='03-2'){
  if(t.includes('n-step'))return 'N-step target은 N개 실제 보상 뒤의 가치 예측으로 bootstrap합니다. N을 늘릴수록 가치 함수 오차의 영향은 늦게 들어오고 반환 표본의 분산은 커지는 경향이 있습니다.';
  if(t.includes('generalized advantage'))return 'GAE는 TD 잔차를 할인 가중합해 여러 지평의 추정을 섞습니다. λ=0은 1-step, λ가 1에 가까우면 긴 Monte Carlo 추정에 가까워집니다.';
  if(t.includes('importance sampling'))return '옛 정책의 표본을 재사용하려면 행동 확률비로 새 정책 기대를 보정합니다. 데이터에서 매우 드문 행동은 큰 가중치를 가져 추정 분산을 키울 수 있습니다.';
  if(t.includes('proximal policy'))return 'PPO는 수집 정책과 새 정책의 행동 확률비를 advantage에 곱합니다. min과 clipping은 advantage 부호별로 과도한 확률 변화가 주는 추가 최적화 이득을 억제합니다.';
  if(t.includes('why is ppo'))return 'PPO가 널리 쓰이는 이유는 구현·튜닝이 비교적 단순하고 다양한 제어 문제에서 강한 기준선을 제공하기 때문입니다. 단순하다는 말이 데이터 효율·수렴 보장을 뜻하지는 않습니다.';
  if(t.includes('chatgpt'))return '선호 비교를 보상 신호로 바꾸면 언어모델 응답의 유용성처럼 정답 토큰 하나로 표현하기 어려운 목표를 최적화할 수 있습니다. 보상모델 오류와 reward hacking을 함께 경계합니다.';
 }
 if(c.id==='04-1'){
  if(t.includes('bellman')||t.includes('fitted'))return '현재 Q 예측을 즉시 보상과 다음 상태의 최선 가치 합에 맞춥니다. terminal 상태에서는 bootstrap 항을 0으로 마스킹해야 합니다.';
  if(t.includes('correlated'))return '연속 환경 표본은 인접 상태가 비슷해 gradient가 강하게 상관됩니다. replay buffer에서 시간적으로 떨어진 전이를 섞어 minibatch 다양성을 높입니다.';
  if(t.includes('moving target'))return 'Q target은 현재 Q 추정으로 계산되므로 예측 대상 자체가 학습 중 움직입니다. target network는 이 변화를 느리게 하되 오래 고정하면 최신 추정 반영이 늦어지는 절충이 있습니다.';
  if(t.includes('explore'))return 'ε-greedy는 대부분 greedy 행동을 쓰고 일정 확률로 무작위 행동을 선택합니다. 학습 중 탐색률과 최종 평가 시 정책을 구분합니다.';
  if(t.includes('double dqn'))return '행동 선택은 online Q, 선택한 행동의 평가에는 target Q를 사용합니다. 같은 noisy 추정기로 선택과 평가를 할 때 생기는 max 과대추정을 줄이는 원리입니다.';
  if(t.includes('prioritized'))return 'TD error가 큰 전이는 현재 추정이 target과 크게 어긋난 표본이라 더 자주 뽑힙니다. 비균등 표본추출에 따른 편향을 importance weight로 보정합니다.';
  if(t.includes('distribution')||t.includes('c51'))return 'C51은 반환의 기대값 하나가 아니라 고정된 support 위 categorical 분포를 예측합니다. Bellman 변환 뒤 확률질량을 support에 투영하는 단계가 추가됩니다.';
  if(t.includes('rainbow'))return 'Rainbow는 Double DQN, multi-step, prioritized replay, dueling, distributional learning, NoisyNet을 결합한 구성입니다. 성능은 ablation으로 각 구성의 기여를 구분해야 합니다.';
 }
 if(c.id==='05-1'){
  if(t.includes('continuous action')||t.includes('greedy policy'))return '연속 행동에는 후보를 모두 열거하는 argmax가 불가능합니다. actor가 후보 행동을 내고 critic의 행동 기울기로 정책을 개선합니다.';
  if(t.includes('ddpg')||t.includes('deep deterministic'))return 'DDPG는 replay 데이터를 재사용하는 off-policy deterministic actor–critic입니다. actor의 정책기울기는 Q의 행동 방향 기울기를 정책 매개변수 방향으로 연쇄 전달합니다.';
  if(t.includes('soft target'))return 'soft target update는 새 온라인 가중치를 작은 비율 τ만큼 target에 섞습니다. τ가 작으면 목표가 안정적이지만 적응은 느립니다.';
  if(t.includes('td3')||t.includes('overestimation')||t.includes('target policy smoothing'))return 'TD3는 두 critic의 작은 값을 쓰고 target 행동을 평활화하며 actor 업데이트를 늦춥니다. 각 장치가 서로 다른 과대추정·오차 전파 원인을 겨냥합니다.';
  if(t.includes('entropy')||t.includes('random policy')||t.includes('sac'))return '최대 엔트로피 목적은 기대 보상과 정책 무작위성의 균형을 둡니다. 온도 α가 이 균형을 바꾸며 학습·평가 정책의 표본화 방식도 명시해야 합니다.';
 }
 if(c.id==='05-2'){
  if(t.includes('compare'))return '최종 도달 성능과 같은 상호작용 예산에서의 표본 효율은 다른 질문입니다. 학습 step·환경 step·평가 episode 수를 맞춰 비교합니다.';
  if(t.includes('atari'))return 'Atari 영상 입력 과업은 이산 행동과 픽셀 관측을 결합합니다. preprocessing과 frame skip까지 benchmark 설정의 일부로 기록해야 합니다.';
  if(t.includes('benchmark')||t.includes('suite'))return '각 benchmark는 제어 난도·관측 형태·과업 수가 다릅니다. benchmark 간 점수를 단일 순위처럼 직접 비교하지 않습니다.';
  if(t.includes('robo')||t.includes('furniture')||t.includes('humanoid')||t.includes('vla'))return '로봇 benchmark는 과업 전이, 조작 성공, 실제 선호 등 서로 다른 능력을 측정합니다. 시뮬레이션 점수와 실물 일반화 증거를 구분합니다.';
 }
 if(c.id==='06'){
  if(t.includes('offline rl learns'))return 'offline RL은 고정 데이터셋으로 학습하고 새 전이를 수집하지 않습니다. 데이터 생성 정책은 알려져 있지 않거나 여러 정책의 혼합일 수 있습니다.';
  if(t.includes('different from bc'))return 'BC는 데이터 행동을 따라 하고 offline RL은 보상으로 더 좋은 행동을 찾으려 합니다. 후자는 데이터 밖 행동을 평가해야 하므로 훨씬 어려운 외삽 문제가 생깁니다.';
  if(t.includes('hard')||t.includes('ood')||t.includes('off-policy algorithms'))return '학습 데이터에 없는 행동의 Q값은 직접 검증할 수 없지만 max 연산은 그중 낙관적인 값을 선택할 수 있습니다. bootstrap이 반복되며 그 오류가 전파됩니다.';
  if(t.includes('constrain'))return 'TD3+BC는 actor 목적에 행동 복제 항을 더해 데이터 행동에서의 이탈을 억제합니다. 데이터 품질이 낮으면 제약이 정책 개선도 막을 수 있습니다.';
  if(t.includes('conservative q')||t.includes('cql'))return 'CQL은 데이터 행동의 값은 보존하면서 후보 행동의 높은 Q를 낮춰 낙관적 외삽을 억제합니다. 보수성 계수가 지나치면 유망한 행동까지 억누릅니다.';
  if(t.includes('filtered'))return 'Filtered BC는 궤적 return으로 데이터를 순위화해 상위 부분만 모방합니다. 이진 필터는 좋은 transition과 나쁜 transition의 상대적 차이를 버립니다.';
  if(t.includes('advantage'))return 'AWR은 advantage가 높은 전이에 더 큰 likelihood 가중치를 줍니다. 지수 가중 온도 β가 작으면 상위 샘플에 집중하지만 오차에도 민감합니다.';
  if(t.includes('expectile'))return 'expectile 회귀는 양·음 잔차를 다르게 가중합니다. τ가 0.5보다 크면 Q 분포 상단의 행동이 상태가치 V를 더 크게 끌어올립니다.';
  if(t.includes('implicit q')||t.includes('iql'))return 'IQL은 학습 중 데이터 밖 행동에 Q를 질의하지 않습니다. expectile V 학습, 데이터 전이의 Q bootstrapping, advantage 가중 BC 순서를 확인합니다.';
  if(t.includes('d4rl')||t.includes('ogbench'))return '데이터 품질과 coverage가 다른 오프라인 benchmark를 사용합니다. 데이터 regime와 정규화 기준을 함께 보고 단일 과업 평균에 숨은 실패를 점검합니다.';
  if(t.includes('where to use')||t.includes('pre-training')||t.includes('nuclear')||t.includes('cooling')||t.includes('chip'))return '실제 적용은 새 상호작용 비용이 큰 문제에서 동기화됩니다. 정적 데이터 범위 밖의 안전·성능은 별도의 제한된 실물 검증이 필요합니다.';
 }
 if(t.includes('example'))return '예시를 정책과 환경의 관점으로 다시 적습니다. 관측 상태, 선택 행동, 전이 확률, 보상 시점, 종료 여부를 분리하면 뒤의 수식을 같은 표기로 계산할 수 있습니다.';
 if(t.includes('why'))return '질문형 제목에 답할 때 가정과 실패 모드를 먼저 적고, 다음 페이지의 해결책이 어떤 문제를 줄이는지 비교합니다.';
 if(t.includes('value'))return '이 페이지에서 평가하는 대상이 상태가치 V인지 행동가치 Q인지 먼저 구분합니다. 평균 정책 행동과 최적 행동의 연산도 서로 바꾸어 쓰지 않습니다.';
 if(c.id==='01-1'){
  if(t.includes('reinforcement learning'))return '강화학습은 에이전트가 행동을 선택하고 환경에서 다음 상태와 보상을 받는 과정을 반복해 정책을 개선한다. 행동마다 정답을 받는 지도학습과 달리 보상은 결과를 평가하며, 행동의 질은 이후 상태와 누적 보상까지 고려해 판단한다.';
  if(t.includes('plan for today'))return '이 목차는 먼저 지도학습만으로 충분한지 묻고, 행동이 미래 상태를 바꾸는 문제를 강화학습으로 형식화한 다음, 게임·로봇·생성 모델 사례로 연결한다. 뒤의 알고리즘은 이 순차 결정 문제를 데이터와 목적함수의 차이로 풀어 간다.';
  if(t.includes('supervised learning'))return '지도학습은 입력과 정답 행동의 쌍을 학습하므로 명확한 라벨이 있을 때 강력하다. 그러나 예측한 행동이 다음 입력을 바꾸거나 여러 단계의 성공을 좌우하면, 각 시점의 라벨 오차와 실제 누적 성과가 일치하지 않을 수 있다. 이 간극이 강화학습을 고려하는 출발점이다.';
  if(t.includes('prefixrl'))return 'PrefixRL은 칩 배치·배선 설계처럼 큰 조합 공간을 탐색하는 전자설계자동화 문제에 강화학습을 적용한 사례다. 정책이 설계 선택을 순차적으로 하고 최종 회로 품질을 보상으로 받으므로, 중간 결정의 장기 효과를 평가할 수 있다.';
  if(t.includes('diffusion')||t.includes('bl ck'))return '확산 모델은 품질뿐 아니라 프롬프트 정합성·압축성 같은 여러 기준 사이의 절충을 한다. 선호나 품질 점수를 보상으로 정의하면 강화학습으로 생성 결과의 분포를 조정할 수 있지만, 보상모델의 편향과 보상 해킹도 함께 점검해야 한다.';
  if(t.includes('gpt')||t.includes('karpathy'))return '언어모델 정렬은 사전학습 다음에 시연 답변으로 지도 미세조정하고, 선호 비교로 보상모델을 학습한 뒤, 그 보상을 높이는 방향으로 정책을 업데이트하는 흐름으로 볼 수 있다. 각 단계는 데이터의 양·품질과 최적화 목표가 다르다.';
  if(t.includes('breakthrough'))return 'AlphaGo의 이세돌 대국은 가능한 수를 전부 열거하는 대신 정책과 가치 추정, 탐색을 결합해 강한 수를 찾을 수 있음을 보여 주었다. 특히 예상과 다른 수가 성공한 장면은 학습된 정책이 인간의 고정관념을 반복하는 데 그치지 않을 수 있다는 사례다.';
  if(t.includes('why study'))return '강화학습의 가치는 모든 예측 문제를 대체하는 데 있지 않다. 행동이 환경을 바꾸고 지금의 선택이 이후 기회와 비용에 영향을 주는 문제에서 장기 결과를 직접 개선하는 데 있다.';
  if(t.includes('prerequisite'))return '확률은 정책의 기대 성과와 표본 추정을, 미적분은 정책경사와 함수 최적화를, 선형대수와 신경망은 상태·행동의 표현을 이해하는 데 쓰인다. 수업 중 각 도구가 필요한 지점을 연결하면 수식이 갑자기 등장하는 이유가 분명해진다.';
  if(t.includes('course overview')||t.includes('what you will learn'))return '이 강의는 문제 형식화에서 출발해 정책·가치 기반 알고리즘과 오프라인 학습까지 이어진다. 각 방법을 목적함수, 데이터 수집 방식, 추정 오차와 안정성이라는 공통 축에서 비교한다.';
  if(t.includes('warning')||t.includes('grading')||t.includes('homework')||t.includes('attendance')||t.includes('participation')||t.includes('exam'))return '이 슬라이드는 강좌 운영과 평가 방식의 기준을 정리한다. 학습 계획을 세울 때 평가 비중과 과제·시험의 역할을 확인하고, 알고리즘의 수학적 이해와 실제 구현을 함께 준비한다.';
  if(t.includes('reference')||t.includes('resource')||t.includes('information'))return '참고 자료는 강의에서 소개한 개념을 교재의 정식 정의와 원 논문의 알고리즘으로 확장해 읽는 출발점이다. 개념 요약은 교재로, 특정 방법의 가정과 실험은 원 논문으로 확인한다.';
  if(t.includes('next class'))return '이번 장은 왜 결과 중심 학습이 필요한지 동기를 세웠다. 다음 장에서는 전문가 시연을 모방하는 방법부터 살펴보고, 시연 분포를 벗어날 때 오류가 커지는 이유와 이를 보완하는 방법을 다룬다.';
 }
 return '이 슬라이드의 '+s.title+'를 '+(s.range?.label||'강의의 핵심 개념')+' 맥락에서 읽는다. 그림의 입력·행동·결과를 구분하고, 식이 있다면 각 항이 어떤 가정과 학습 신호를 나타내는지 설명과 대조한다.';
}
const mj='<script>window.MathJax={tex:{inlineMath:[["\\\\(","\\\\)"]],displayMath:[["\\\\[","\\\\]"]]},options:{skipHtmlTags:["script","noscript","style","textarea","pre","code"]}};</script><script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>';
function shell(title,body,p){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Deep Reinforcement Learning 슬라이드별 한국어 학습 가이드"><title>'+esc(title)+' · Deep RL</title><link rel="stylesheet" href="'+p+'assets/site.css">'+mj+'</head><body data-prefix="'+p+'"><div class="reading-progress"></div><header class="site-header"><a class="brand" href="'+p+'index.html"><span class="brand-mark">π</span><span>Deep RL <b>Guide</b></span></a><span class="header-divider"></span><span class="header-subtitle">슬라이드별 학습 가이드</span><a class="pdf-link" href="'+p+'study-guide.pdf" download>PDF 가이드 ↓</a><button type="button" class="search-trigger" data-search-trigger><span>⌕</span> 검색 <kbd>/</kbd></button></header>'+body+'<dialog id="slide-dialog" class="slide-dialog"><button data-dialog-close>×</button><img alt="확대한 슬라이드"><p></p></dialog><dialog id="search-dialog" class="search-dialog"><div class="search-panel"><div class="search-input-row"><input type="search" id="search-input" placeholder="개념, 알고리즘, 수식 검색"><button data-search-close>×</button></div><div id="search-results"></div><p class="search-hint">슬라이드 제목과 설명을 함께 검색합니다. Esc로 닫기</p></div></dialog><script src="'+p+'assets/search-index.js"></script><script src="'+p+'assets/site.js"></script></body></html>';}
function writeIndex(){
 const cards=chapters.map(c=>'<a class="overview-card card-'+c.color+'" href="lecture/'+c.id+'.html"><div class="overview-card-top"><span>'+c.id+'</span><span>'+slides(c).length+'개 슬라이드</span></div><h3>'+esc(c.title)+'</h3><p>'+esc(c.short)+'</p><div class="card-arrow">학습하기 ↗</div></a>').join('');
 const body='<main class="home-main"><section class="home-hero"><div class="eyebrow">2026 · 2학기 · 학습 가이드</div><h1>경험에서 배우는<br><em>순차적 의사결정</em></h1><p>모방학습의 분포 이동에서 시작해 MDP와 정책경사, actor–critic, PPO, Q-learning, continuous control, offline RL까지. 강의 슬라이드와 수식의 유도, 알고리즘의 직관을 하나의 흐름으로 잇습니다.</p><div class="hero-actions"><a class="primary-button" href="lecture/01-1.html">처음부터 읽기 →</a><a class="pdf-link" href="study-guide.pdf" download>PDF 내려받기 ↓</a><span>10개 강의 · '+total+'개 슬라이드</span></div><div class="hero-formula">\\[G_t=\\sum_{k=0}^{\\infty}\\gamma^k r_{t+k}\\]</div></section><section class="learning-path"><div class="section-kicker">학습 경로</div><h2>행동에서 장기 가치로</h2><div class="path-line"><span>시연·상호작용</span><b>→</b><span>문제 형식화</span><b>→</b><span>정책·가치 학습</span><b>→</b><span>실험·배포</span></div><div class="overview-grid">'+cards+'</div></section><footer class="site-footer">Deep Reinforcement Learning · 2026-2</footer></main>';
 const promo='<section class="derivation-promo"><div><div class="section-kicker">수식 전개</div><h2>목적함수에서 업데이트까지</h2><p>정책경사의 로그미분, advantage의 분산 감소, GAE의 망원합, PPO clipping, DQN의 선택 편향, 오프라인 RL의 보수적 추정을 단계별로 유도합니다.</p></div><a class="primary-button" href="derivations.html">수식 유도 읽기 →</a></section>';
 fs.writeFileSync(path.join(docs,'index.html'),shell('학습 경로',body.replace('<footer class="site-footer">',promo+'<footer class="site-footer">'),''),'utf8');
}
function writeChapter(c,index){
 const ss=slides(c);
 const side='<aside class="sidebar"><a class="sidebar-home" href="../index.html">← 전체 목차</a><div class="sidebar-label">강의</div><nav class="chapter-nav">'+nav(c.id,'../')+'</nav><div class="sidebar-label sidebar-label-slides">이 장의 슬라이드</div><nav class="slide-nav">'+ss.map(s=>'<a href="#s'+s.number+'" data-slide-link="'+s.number+'"><span>'+s.number+'</span>'+esc(s.title)+'</a>').join('')+'</nav></aside>';
 const imgs=ss.map((s,i)=>{
  const img='../assets/slides/'+deck(c)+'/'+s.number+'.webp';
  const rangeStart=s.range&&Number(s.number)===s.range.from;
  const follow=followUps[c.id+':'+s.number];
  const detail='<div class="slide-reading"><p>'+esc(slideFocus(c,s,i))+'</p>'+(rangeStart?'<div class="range-context"><span>'+esc(s.range.label)+'</span>'+mathHtml(s.range.note)+'</div>':'')+(follow?'<details class="follow-up"><summary>'+esc(follow[0])+'</summary>'+mathHtml(follow[1])+'</details>':'')+'</div>';
  const fig=i===4?'<figure class="concept-figure"><img src="../assets/figures/'+c.id+'.svg" alt="'+esc(c.title)+' 개념 흐름 도식" loading="lazy"><figcaption>'+esc(c.title)+'의 핵심 구조</figcaption></figure>':'';
  return '<section class="slide" id="s'+s.number+'"><div class="slide-heading"><span class="slide-index">'+c.id+' / '+s.number+'</span><h2>'+esc(s.title)+'</h2></div><div class="slide-grid"><figure class="slide-figure"><button class="slide-image-button" data-zoom-src="'+img+'" data-zoom-label="'+esc(c.id+'장 슬라이드 '+s.number)+'"><img src="'+img+'" alt="'+esc(c.id+'장 슬라이드 '+s.number+': '+s.title)+'" loading="lazy" decoding="async"><span class="zoom-hint">확대해서 보기 ↗</span></button><figcaption>슬라이드 '+s.number+'</figcaption></figure><div class="explanation">'+detail+fig+'</div></div></section>';
 }).join('');
 const refs='<section class="chapter-sources"><h2>더 읽을 자료</h2><ul>'+c.sources.map(x=>'<li><a href="'+esc(x[1])+'" target="_blank" rel="noopener noreferrer">'+esc(x[0])+' ↗</a></li>').join('')+'</ul></section>';
 const prev=chapters[index-1],next=chapters[index+1];
 const pager='<nav class="chapter-pager">'+(prev?'<a href="'+prev.id+'.html"><small>이전 장</small><strong>← '+esc(prev.title)+'</strong></a>':'<span></span>')+(next?'<a href="'+next.id+'.html"><small>다음 장</small><strong>'+esc(next.title)+' →</strong></a>':'<span></span>')+'</nav>';
 const hero='<section class="lecture-hero"><div class="eyebrow">'+c.id+'장 · '+ss.length+'개 슬라이드</div><h1>'+esc(c.title)+'</h1><div class="lecture-intro">'+mathHtml(c.intro)+'</div><div class="lecture-start"><a href="#s01">첫 슬라이드로 내려가기 ↓</a><span>'+(index+1)+' / '+chapters.length+'</span></div></section>';
 const body='<div class="layout">'+side+'<main class="lecture-main">'+hero+imgs+refs+pager+'<footer class="site-footer">Deep Reinforcement Learning · 2026-2</footer></main></div>';
 fs.writeFileSync(path.join(docs,'lecture',c.id+'.html'),shell(c.title,body,'../'),'utf8');
}
function writeDerivations(){
 const md=fs.readFileSync(path.join(root,'content','derivations.md'),'utf8');
 const body='<main class="derivation-main"><a class="sidebar-home" href="index.html">← 전체 목차</a><div class="eyebrow">수식 전개 노트</div>'+mathHtml(md)+'<footer class="site-footer"><a href="index.html">학습 경로로 돌아가기</a></footer></main>';
 fs.writeFileSync(path.join(docs,'derivations.html'),shell('수식 유도',body,''),'utf8');
}
function texEscape(s){return s.replace(/[\\{}%&#_^~$]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','&':'\\&','#':'\\#','_':'\\_','^':'\\^{}','~':'\\~{}','$':'\\$'}[c]));}
function texUrl(s){return s.replaceAll('&','\\&').replaceAll('%','\\%');}
function texInline(s){
 let out='',i=0;while(i<s.length){
  const p=s.slice(i).match(/^\\\(([\s\S]+?)\\\)/);if(p){out+='$'+p[1]+'$';i+=p[0].length;continue;}
  if(s.startsWith('**',i)){const j=s.indexOf('**',i+2);if(j>=0){out+='\\textbf{'+texInline(s.slice(i+2,j))+'}';i=j+2;continue;}}
  if(s[i]==='$'){const j=s.indexOf('$',i+1);if(j>=0){out+='$'+s.slice(i+1,j)+'$';i=j+1;continue;}}
  out+=texEscape(s[i++]);
 }return out;
}
function texMarkdown(s){
 const lines=s.split(/\r?\n/),out=[];for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line){out.push('\\par\\medskip');continue;}
  if(line.startsWith('# ')){out.push('\\section*{'+texInline(line.slice(2))+'}');continue;}
  if(line.startsWith('## ')){out.push('\\subsection{'+texInline(line.slice(3))+'}');continue;}
  if(line==='$$'){const eq=[];i++;while(i<lines.length&&lines[i].trim()!=='$$')eq.push(lines[i++]);out.push('\\begin{equation*}',...eq,'\\end{equation*}');continue;}
  out.push(texInline(line)+'\\par');
 }return out.join('\n');
}
function writeTex(){
 const pre='\\documentclass[11pt,a4paper]{article}\n\\usepackage[a4paper,margin=23mm]{geometry}\n\\usepackage{kotex,amsmath,amssymb,longtable,array,xcolor}\n\\usepackage[colorlinks=true,linkcolor=blue!55!black,urlcolor=blue!55!black]{hyperref}\n\\setlength{\\parindent}{0pt}\\setlength{\\parskip}{0.5em}\\setcounter{tocdepth}{2}\n\\begin{document}\n\\begin{titlepage}\\centering\\vspace*{3cm}{\\Large Deep Reinforcement Learning\\par}\\vspace{1cm}{\\Huge\\bfseries 슬라이드별 학습 가이드\\par}\\vspace{1cm}{\\large 순차적 의사결정에서 오프라인 학습까지\\par}\\vfill{\\large 2026년 2학기\\par}\\end{titlepage}\\tableofcontents\\clearpage\n';
 let body='';for(const c of chapters){
  body+='\\section{'+texEscape(c.id+' · '+c.title)+'}\n'+texMarkdown(c.intro)+'\n';
  for(const r of c.ranges)body+='\\subsection{'+texEscape(r.label)+'}\n'+texMarkdown(r.note)+'\n';
  body+='\\subsection*{더 읽을 자료}\\begin{itemize}\n'+c.sources.map(x=>'\\item \\href{'+texUrl(x[1])+'}{'+texEscape(x[0])+'}').join('\n')+'\n\\end{itemize}\n';
  for(const [i,s] of slides(c).entries())body+='\\subsubsection{슬라이드 '+s.number+' · '+texEscape(s.title)+'}\n'+texInline(slideFocus(c,s,i))+'\\par\n';
 }
 body+='\\appendix\n'+texMarkdown(fs.readFileSync(path.join(root,'content','derivations.md'),'utf8'))+'\n';
 fs.writeFileSync(path.join(root,'guide','main.tex'),pre+body+'\\end{document}\n','utf8');
}
fs.mkdirSync(path.join(docs,'lecture'),{recursive:true});writeIndex();chapters.forEach(writeChapter);writeDerivations();writeTex();
const search=chapters.flatMap(c=>slides(c).map(s=>({chapter:c.id,chapterTitle:c.title,slide:s.number,title:s.title,text:c.intro+' '+s.range.note})));
fs.writeFileSync(path.join(docs,'assets','search-index.js'),'window.GUIDE_SEARCH='+JSON.stringify(search)+';\n','utf8');
console.log('Built '+chapters.length+' lecture pages, '+total+' slide sections, and guide/main.tex');
