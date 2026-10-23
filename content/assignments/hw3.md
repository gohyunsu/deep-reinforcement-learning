# 과제 3 · DQN과 Double DQN

과제 3은 Q-learning을 신경망으로 구현하고, CartPole의 상태 벡터와 Atari의 화면 입력에서 학습을 관찰한다. 핵심은 **온라인 Q망과 target Q망의 역할**, replay에서 뽑은 전이의 TD 목표, 탐색 정책, 그리고 Double DQN의 선택·평가 분리다. 실험 결과를 읽을 때는 예측 Q값, critic 오차와 실제 평가 반환을 함께 본다.

## 먼저 확인하는 DQN T/F

1. **“Q-learning은 off-policy sample을 활용할 수 없어서 표본 효율이 낮다” — F.** 행동을 수집한 정책과 Bellman 목표의 greedy 정책이 달라도 transition으로 학습할 수 있다. Replay를 이용한 재사용도 가능하다.
2. **“Actor가 없으면 연속 행동의 모든 후보 Q값을 평가해 최대 행동을 고르기 어렵다” — T.** 이산 행동의 유한 목록과 달리 연속 행동은 무한히 많아 전수 열거할 수 없다. 다만 최적화 자체가 수학적으로 불가능하다는 뜻은 아니며, DDPG 등은 actor로 최대화를 근사한다.
3. **“같은 신경망으로 현재 Q와 목표 Q를 모두 만들면 moving target 문제가 생기므로, 안쪽 학습 반복에서는 고정된 target network를 쓸 수 있다” — T.** 온라인 망을 갱신하는 동안 target 망을 한동안 고정해 회귀 목표의 급격한 변화를 늦춘다.
4. **“학습이 진행될수록 보통 $\epsilon$을 키워 탐색을 늘린다” — F.** 대개 초기에 크게 탐색하고 이후 $\epsilon$을 낮춰 학습한 행동을 더 많이 활용한다.

## 1. DQN의 한 번의 업데이트

전이 $(s_t,a_t,r_t,s_{t+1},d_t)$에서 $s_t$는 현재 상태, $a_t$는 행동, $r_t$는 즉시 보상, $s_{t+1}$은 다음 상태, $d_t\in\{0,1\}$은 **환경의 실제 종료** 표시다. 온라인 Q망의 매개변수를 $\theta$, 느리게 갱신되는 target 망의 매개변수를 $\bar\theta$, 할인율을 $\gamma$라 두자. 이산 행동에서 DQN의 목표와 제곱 TD 손실은

$$
y_t=r_t+\gamma(1-d_t)\max_{a'}Q_{\bar\theta}(s_{t+1},a'),
\qquad
L(\theta)=\mathbb E_{(s,a,r,s',d)\sim\mathcal D}
\bigl[(Q_\theta(s,a)-y_t)^2\bigr].
$$

$\mathcal D$는 replay buffer의 전이 분포다. 계산한 $y_t$는 현재 온라인 망의 gradient가 흘러들지 않도록 고정된 target으로 취급한다. 실제로 종료한 상태라면 $d_t=1$이므로 다음 상태의 가치는 더하지 않는다. 예를 들어 $r_t=2$, $\gamma=0.9$, 다음 상태의 최대 target Q가 4라면 비종료 전이의 목표는 $5.6$이고, 종료 전이의 목표는 $2$다.

**시간 제한으로 잘린 trajectory**는 실제 MDP 종료와 다르다. 환경을 reset하더라도 TD 목표에는 다음 상태에서의 가치가 남아야 하므로 bootstrap용 $d_t$는 0으로 저장한다. 반대로 실패나 과업 완료처럼 실제로 종료했다면 $d_t=1$이다. 두 경우를 모두 단순한 “episode 끝”으로 합치면 시간 제한 근처의 Q값을 낮게 왜곡할 수 있다.

구현할 함수의 연결은 다음과 같다.

1. **DQNAgent.update_critic:** replay minibatch의 TD target과 critic 손실을 계산하고 최적화한다. 현재 $Q_\theta(s,a)$에서 실제 실행 행동 $a$의 값만 모으고, 목표에는 gradient를 흘리지 않는다.
2. **DQNAgent.update:** critic을 학습하고 조건에 맞춰 target critic을 갱신한다. 매 minibatch마다 무조건 target을 복사하면 고정 목표의 장점이 줄어든다.
3. **DQNAgent.get_action:** 이산 행동에서 $\epsilon$-greedy를 구현한다. 무작위 행동과 greedy 행동의 확률, 평가 때의 탐색 설정을 구분한다.
4. **run_hw3.py의 학습 반복:** 수집, replay 삽입, 학습, 평가, 로그를 연결한다. 환경 단계와 gradient step은 별개로 센다.
5. **utils.py의 sample_trajectory:** 상태·행동·보상·다음 상태·종료 정보를 같은 시점에 저장한다. terminated와 truncated를 구분해 bootstrap용 done을 저장한다.

CartPole의 설정은 dqn_basic_config.py, Atari Asterix의 설정은 dqn_atari_config.py에서 만든다. replay_buffer.py의 MemoryEfficientReplayBuffer는 화면 stack을 매 transition마다 통째로 복제하지 않고 frame을 효율적으로 저장한다. 새 episode 첫 관측을 넣는 on_reset과 뒤따르는 frame을 넣는 insert의 호출 시점을 살펴야 stack이 episode 경계를 넘어 섞이지 않는다.

## 2. Replay, target 망과 탐색

연속해서 수집한 transition은 유사하다. replay buffer에서 무작위 minibatch를 뽑으면 샘플 상관을 줄이고 과거 경험을 재사용한다. 온라인 망을 매 단계 갱신하되 target 망을 주기적으로 복사하거나 소프트 갱신하면 회귀 목표가 온라인 망을 즉시 따라 움직이지 않는다. 두 장치는 서로 다른 불안정성을 해결한다.

행동을 고를 때 $\epsilon$-greedy는 확률 $\epsilon$로 무작위 행동을, 나머지 확률로 $\arg\max_a Q_\theta(s,a)$를 선택한다. 행동이 $m$개라면 greedy 행동도 무작위 탐색에 포함되므로 그 행동의 전체 선택확률은 $1-\epsilon+\epsilon/m$이다. 학습 초반에는 $\epsilon$을 크게 두어 다양한 전이를 수집하고, 뒤로 갈수록 낮춰 학습한 행동을 더 자주 사용한다. 평가할 때의 탐색 설정은 학습 중의 설정과 구별해 명시한다.

Atari 화면에서는 한 프레임이 이동 방향을 알려주지 않을 수 있다. grayscale 변환은 색 차원을 줄이고, frame skip은 몇 단계 동안 같은 행동을 유지하며, frame stack은 연속 프레임을 묶어 시간 정보를 일부 되살린다. 화면 입력과 CartPole의 낮은 차원 상태 벡터는 네트워크 입력층이 다르지만 TD 목표의 수학은 같다.

Atari 설정은 $84\times84\times3$ RGB를 $84\times84$ grayscale로 바꾸고, 같은 행동을 4 frame 유지하는 frame skip과 최근 4 frame을 쌓는 frame stack을 사용한다. 스타터 구현에는 이와 함께 학습률 감소 schedule과 gradient norm clipping도 들어 있다. Clipping은 gradient norm이 임계값을 넘을 때 전체 gradient를 같은 방향으로 축소한다. 이런 장치는 알고리즘의 Bellman 목표와 별도로 **최적화의 안정성**을 위한 것이다.

## 3. Double DQN의 선택·평가 분리

Q 추정에 잡음이 있을 때 $\max_a \hat Q(s',a)$는 우연히 크게 나온 행동을 고른다. 모든 행동의 참값이 0인 one-step 문제에서도 추정치들의 최댓값의 기댓값은 보통 0보다 크다. 행동 후보가 많아지면 큰 양의 잡음이 선택될 기회도 늘어난다.

Double DQN은 다음 행동을 온라인 망으로 고르고 그 행동을 target 망으로 평가한다.

$$
a^*=\arg\max_{a'}Q_\theta(s_{t+1},a'),\qquad
y_t^{\rm Double}=r_t+\gamma(1-d_t)Q_{\bar\theta}(s_{t+1},a^*).
$$

선택과 평가에 쓰인 오차의 결합을 약하게 해 과대평가를 완화한다. 두 망이 학습 과정에서 관련되어 있으므로 편향을 완전히 없앤다는 뜻은 아니다. DQN target이 target 망에서 **최대 행동 선택과 값 평가를 모두 한다**는 점과 대조하면 식을 기억하기 쉽다.

### Toy 실험의 두 질문

Toy 환경은 상태 하나와 행동 $m$개를 가진 한 단계 문제다. 모든 행동의 실제 기대 보상은 $\mu=0$이고 관측 보상은 $r\sim\mathcal N(0,1)$이다. 따라서 실제 $Q(s,a)$는 모든 $a$에서 0이다. 그런데 각 행동의 noisy 추정치를 독립인 $X_1,\ldots,X_m$이라 하면, 하나만 골라 평가하는 값의 기댓값은 0이어도 $\mathbb E[\max_i X_i]>0$이다. $m$이 커질수록 양의 잡음 중 더 큰 것이 선택될 기회가 늘어난다. 표준정규 잡음의 이상화에서는 최댓값의 대표적인 크기가 큰 $m$에 대해 대략 $\sqrt{2\log m}$로 자란다.

Double 추정의 직관은 **한 추정치로 선택하고 독립적인 다른 추정치로 평가**하는 데 있다. 두 번째 추정치를 $Y_i$라 하고 $I=\arg\max_iX_i$라 하면, 각 $Y_i$가 평균 0이고 선택에 쓰인 $X$들과 독립인 이상화에서

$$
\mathbb E[Y_I]
=\sum_{i=1}^{m}P(I=i)\mathbb E[Y_i\mid I=i]
=\sum_{i=1}^{m}P(I=i)\cdot0=0.
$$

실습에서는 $m=2,4,8,\ldots,1024$로 늘리며 **single-Q와 double-Q의 추정 오차를 같은 그래프에서 비교**한다. 실제 Double DQN의 두 망은 완전히 독립이지 않으므로 toy의 0 기대 오차를 그대로 보장하지는 않는다. 그래프에서 행동 수에 따른 오차 추세와 두 추정의 차이를 설명하면 된다.

## 4. 실험 결과를 해석하는 순서

CartPole-v1에서는 DQN을 **seed 1·2·3**으로 실행해 평가 반환을 세 시드의 평균과 표준편차로 그린다. 세로축은 eval_return, 가로축은 학습 환경 단계 수로 맞춘다. 원래 설정의 점검 목표는 약 30만 단계 부근에 반환 500에 가까워지는 것이다. 이는 관찰 결과를 대신하지 않는다.

학습률 비교에서는 기본 **0.001**과 변경 설정 **0.05**를 CartPole-v1에서 비교한다. 예측 Q값, critic error, 평가 반환의 **세 그래프**를 각각 두 학습률의 곡선으로 그린다. 예측 Q가 커져도 실제 반환이 좋아졌다는 증거는 아니다. 지나친 학습률은 움직이는 bootstrap 목표와 함수 근사의 오차를 증폭할 수 있다. 설명할 때는 “학습률을 키우면 무조건 발산한다”라고 쓰기보다 실제 세 곡선의 시간 순서를 근거로 원인을 분석한다.

Atari **Asterix-v5**에서는 Double DQN을 seed 1·2·3으로 학습한다. 세 시드의 평가 반환 평균과 표준편차를 단계 수에 대해 그린다. 과제의 점검 목표는 각 실행에서 평가 반환이 학습 중 한 번 이상 1200을 넘는 것이다. 일시적인 최고점과 전체 학습 곡선의 수준을 구분한다.

마지막 CartPole hyperparameter 실험은 하나의 변수를 골라 **기본값을 포함한 네 값**을 같은 그래프에서 비교한다. learning rate, network architecture, exploration schedule 등이 후보이며 네 설정 파일과 변수 선택 이유를 남긴다. 다른 변수와 평가 방식을 고정해야 네 곡선의 차이를 고른 변수와 연결할 수 있다.

보고서의 결과물은 다음 다섯 묶음으로 확인한다.

1. **CartPole DQN:** 세 seed의 평가 반환 평균·표준편차와 환경 단계 x축.
2. **Learning rate 비교:** Q 예측, critic error, 평가 반환의 세 그래프에서 각각 0.001과 0.05를 비교.
3. **Double Q toy:** 행동 수가 2에서 1024로 커질 때 single·double 추정 오차의 막대그래프.
4. **Asterix Double DQN:** 세 seed의 평균·표준편차 곡선과 각 실행의 최고점.
5. **Hyperparameter:** 기본값 포함 네 값의 평가 반환 곡선, 동일 환경·평가 조건과 변수 선택 이유.

<details><summary>Q값이 높아지는데 실제 성적이 나빠질 수 있나?</summary><p>그렇다. Q는 bootstrap으로 학습된 예측이고 평가 반환은 실제 환경에서 관찰한 결과다. max 연산의 선택 편향, 큰 학습률이나 드문 상태의 추정 오류는 예측만 높일 수 있다. 두 지표의 간격 자체가 중요한 진단 신호다.</p></details>

<details><summary>왜 Double DQN에서도 target network가 필요한가?</summary><p>Double DQN의 target 망은 값 평가를 맡고, 온라인 망은 다음 행동을 고른다. target 망은 원래 DQN에서처럼 목표의 급격한 이동을 늦추는 역할도 계속한다. 선택·평가 분리와 목표 안정화가 동시에 작동한다.</p></details>

실험 결과의 숫자와 그래프는 실제 실행에서 얻은 것을 사용한다. 개념 설명만으로는 seed별 성과, 큰 학습률의 실제 발산 여부나 네 hyperparameter 설정의 우열을 확정할 수 없다. 보고서 PDF와 코드를 한 압축 파일에 넣고, 영상과 로그는 제외한다. 과제의 압축 파일 크기 기준은 **20 MB 미만**이다.
