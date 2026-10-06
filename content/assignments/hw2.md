# 과제 2 · 정책경사와 PPO

이 과제는 하나의 정책경사 구현을 단계별로 개선한다. 전체 궤적 반환에서 reward-to-go로 옮기고, 상태 가치 baseline을 학습한 뒤, GAE로 advantage를 추정하고, PPO-Clip으로 같은 rollout을 여러 번 조심스럽게 사용한다. 모든 비교에서 **평가 반환과 환경 상호작용 단계 수**를 함께 본다.

## 연결되는 개념

- [로그미분을 이용한 정책경사](../lecture/02-2.html#s09): 환경 전이를 미분하지 않고 기대 반환의 기울기를 구한다.
- [Reward-to-go와 baseline](../lecture/03-1.html#s10): 과거 보상을 빼고 상태 평균 성과를 기준으로 삼는다.
- [GAE](../lecture/03-2.html#s09): 여러 길이의 TD 추정량을 결합한다.
- [PPO의 정책비](../lecture/03-2.html#s16): 이전 정책에서 모은 데이터를 여러 번 사용할 때 갱신을 제한한다.

## 1. 전체 반환과 reward-to-go

현재 정책으로 궤적을 수집한 뒤 각 행동의 로그확률 기울기를 성과로 가중한다. 전체 반환 버전은 그 궤적의 총보상 $R(\tau)$를 모든 시점에 붙인다. reward-to-go는 시점 $t$ 뒤의 보상만 더한 $G_t=\sum_{k=t}^{T-1}\gamma^{k-t}r_k$를 붙인다.

$$
\widehat g_{\mathrm{full}}
=\frac1N\sum_i\sum_t\nabla_\theta\log\pi_\theta(a_t^i\mid s_t^i)R_i,
\qquad
\widehat g_{\mathrm{rtg}}
=\frac1N\sum_i\sum_t\nabla_\theta\log\pi_\theta(a_t^i\mid s_t^i)G_t^i.
$$

현재 행동은 과거 보상을 바꿀 수 없으므로 reward-to-go는 불필요한 잡음을 덜 포함한다. 다만 할인율을 어디에 곱하는지는 목적함수와 스타터 코드의 시간 인덱스 관례에 맞춰야 한다. 수식을 코드로 옮길 때 $t=0$에서 시작하는지와 마지막 보상이 어느 배열 위치에 있는지 먼저 확인한다.

## 2. CartPole 비교 실험

이산 행동 CartPole에서 전체 반환과 reward-to-go, advantage 정규화의 유무를 비교한다. 작은 batch와 큰 batch의 학습 곡선을 **각각** 그리면 표본량이 분산을 얼마나 줄이는지 볼 수 있다. 과제의 두 batch 설정은 1000과 4000 환경 단계다.

정규화는 한 batch의 advantage에서 평균을 빼고 표준편차로 나누는 연산이다. 값의 상대적 순서는 유지하면서 업데이트의 크기를 바꾸지만, 모든 환경에서 항상 이득이라는 보장은 없다. 비교할 때 학습률, 네트워크 구조와 평가 방법은 고정하고, 보고서에는 실제 실행한 명령 옵션을 남긴다.

모든 학습 곡선의 가로축은 **정책 업데이트 횟수보다 누적 환경 단계 수**다. batch가 큰 방법은 한 번 업데이트 전에 더 많은 상호작용을 사용하므로 업데이트 횟수만 비교하면 표본 효율을 오해하기 쉽다.

<details><summary>큰 batch의 곡선이 매끄러우면 알고리즘이 더 좋은 것일까?</summary><p>큰 batch는 기울기 표본 분산을 줄일 수 있지만 업데이트당 환경 비용이 더 든다. 같은 환경 단계 수에서의 최종 성과와 여러 시드의 변동을 비교해야 공정하다.</p></details>

## 3. 상태 가치 baseline

상태 가치 $V_\phi(s_t)$는 그 상태에서 현재 정책을 계속 따를 때의 기대 미래 보상이다. 정책 업데이트에는 $A_t=G_t-V_\phi(s_t)$를 사용한다. 그 상태에서 평소보다 좋은 결과가 나온 행동은 양의 advantage, 나쁜 결과가 나온 행동은 음의 advantage를 받는다.

행동에 의존하지 않는 baseline의 기대 기여는

$$
E_{a\sim\pi_\theta(\cdot\mid s)}
[\nabla_\theta\log\pi_\theta(a\mid s)V_\phi(s)]
=V_\phi(s)\nabla_\theta\sum_a\pi_\theta(a\mid s)=0
$$

이므로 정확한 기대 정책경사는 바뀌지 않는다. 다만 학습한 가치함수는 근사이고, 실제 구현에서 데이터 재사용·정규화·학습률이 분산과 편향에 영향을 줄 수 있다. 가치함수 손실의 하락과 정책 반환의 상승을 함께 봐야 한다.

## 4. HalfCheetah에서 baseline 평가

연속 제어 HalfCheetah에서는 reward-to-go 정책경사와 가치 baseline을 붙인 버전을 비교한다. 원본 실험 설정은 할인율 $0.95$, batch 5000, baseline 학습 단계 수와 학습률을 명시한다. baseline이 더 정확하면 advantage의 잡음이 줄 수 있지만, baseline을 지나치게 적게 또는 과하게 학습하면 정책 갱신이 흔들릴 수 있다.

보고서에는 baseline 손실 곡선과 평가 반환 곡선을 함께 그린다. baseline gradient step 수나 학습률을 줄인 추가 실험에서는 다른 설정을 고정해야 원인을 비교할 수 있다. 손실이 내려갔다고 성과가 반드시 오르지는 않으므로 두 그래프를 나란히 해석한다.

## 5. GAE의 계산

한 단계 TD 잔차를 $\delta_t=r_t+\gamma V_\phi(s_{t+1})-V_\phi(s_t)$라고 두면 GAE는 다음과 같다.

$$
\widehat A_t^{\mathrm{GAE}(\gamma,\lambda)}
=\sum_{l=0}^{T-t-1}(\gamma\lambda)^l\delta_{t+l}
=\delta_t+\gamma\lambda\widehat A_{t+1}.
$$

마지막 등식은 뒤에서 앞으로 반복 계산할 수 있게 한다. 진짜 종료라면 다음 상태 가치를 0으로 처리하고, 시간 제한으로 잘린 궤적이라면 부트스트랩 가능 여부를 환경 계약에 맞춰 결정한다. $\lambda=0$은 한 단계 TD에 가깝고 $\lambda=1$은 적절한 끝 처리에서 긴 보상열에 가까워진다. 두 극단은 가치 추정 오차가 주는 편향과 표본 반환의 변동 사이를 비교하는 기준이다.

## 6. HumanoidStandup의 $\lambda$ 비교

HumanoidStandup에서는 $\lambda=0$, $0.95$, $1$을 같은 환경·네트워크·batch·학습률로 비교한다. 과제의 명시적인 과업 길이와 할인율을 유지해야 곡선의 차이를 $\lambda$에 연결할 수 있다. 한 그래프에 평가 반환과 누적 환경 단계를 표시하고, 어떤 값이 더 빨리 좋아졌으며 최종 성과와 변동이 어떠했는지 설명한다.

단일 실행에서 특정 $\lambda$가 더 좋아 보인다고 일반적인 우위를 주장할 수는 없다. 가치함수의 품질, 보상의 지연, 에피소드 길이에 따라 유리한 편향–분산 절충이 달라진다.

<details><summary>$\lambda=1$이면 가치함수를 전혀 쓰지 않나?</summary><p>완전한 episode의 끝까지 모두 관측하고 끝에서 부트스트랩하지 않으면 GAE의 망원합이 Monte Carlo 반환에서 현재 가치 추정치를 뺀 형태가 된다. 궤적이 중간에 잘리면 끝의 가치 추정이 남을 수 있다. 종료 처리까지 함께 봐야 한다.</p></details>

## 7. PPO-Clip의 목적함수

수집 때의 정책을 $\pi_{\mathrm{old}}$로 고정하고 현재 정책과의 확률비 $r_t(\theta)=\pi_\theta(a_t\mid s_t)/\pi_{\mathrm{old}}(a_t\mid s_t)$를 계산한다. PPO-Clip은 다음의 surrogate 목적을 최대화한다.

$$
L^{\mathrm{clip}}(\theta)
=E_t\!\left[
\min\!\left(
r_t(\theta)\widehat A_t,\,
\operatorname{clip}(r_t(\theta),1-\epsilon,1+\epsilon)\widehat A_t
\right)\right].
$$

$\widehat A_t>0$이면 그 행동의 확률을 과도하게 높이는 이득을 제한하고, $\widehat A_t<0$이면 확률을 과도하게 낮추는 이득을 제한한다. 구현에서는 rollout 때의 이전 로그확률을 보존하고 현재 로그확률과의 차이를 지수화해 비를 계산하는 편이 안정적이다. clip은 엄격한 KL 신뢰 영역 보장이 아니므로 실제 정책 변화도 진단해야 한다.

## 8. Reacher에서 여러 번의 갱신

Reacher 과제는 GAE와 baseline을 공통으로 쓰는 정책경사 버전과 PPO 버전을 비교한다. PPO는 같은 on-policy batch를 여러 epoch와 minibatch에 걸쳐 사용한다. 원본 설정은 PPO 4 epoch, 4 minibatch를 사용한다. 데이터를 여러 번 보되 확률비와 clipping으로 정책 변화가 지나치게 커졌을 때의 이득을 제한하려는 것이다.

clip 없이 단순 정책경사 손실을 같은 batch에서 여러 번 최적화하면 첫 갱신 뒤 데이터가 이미 이전 정책의 데이터가 된다. 이후 갱신은 현재 정책 분포를 반영하지 못하고 과도한 확률 변화로 불안정해질 수 있다. 실험 결과를 설명할 때 단지 PPO의 점수뿐 아니라 같은 환경 단계 수에서의 곡선과 변동을 함께 비교한다.

## 구현 점검표

| 구성 | 확인할 항목 | 흔한 오류 |
| --- | --- | --- |
| 궤적 수집 | 상태·행동·보상·종료 길이의 정렬 | 마지막 상태를 행동 배열과 같은 길이로 취급 |
| 반환 계산 | 전체 반환과 reward-to-go의 시간 인덱스 | 과거 보상이나 할인 지수를 잘못 포함 |
| 가치함수 | 예측과 목표의 batch 차원 | 정책 손실로 가치망이 우연히 역전파 |
| GAE | 역방향 재귀와 종료 마스크 | 진짜 종료 후 다음 가치를 더함 |
| PPO | 이전 로그확률의 고정, 비와 clip | 업데이트 중 이전 정책 값을 새로 계산 |
| 평가 | 누적 환경 단계와 여러 episode | 업데이트 횟수만 가로축으로 사용 |

보고서에는 CartPole의 두 batch 그래프, HalfCheetah의 baseline 손실과 반환, HumanoidStandup의 $\lambda$ 비교, Reacher의 PPO 비교와 각 질문의 해석을 담는다. 직접 실행한 명령과 설정을 기록하고, 실제 결과를 사용한다. 제출 묶음은 보고서 PDF와 필요한 코드로 구성하며 원본 지침은 용량 제한과 영상·TensorBoard 로그 제외를 명시한다. 최종 형식은 현재 공지를 기준으로 확인한다.
