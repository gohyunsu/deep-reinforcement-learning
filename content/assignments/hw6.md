# 과제 6 · Dynamics model과 MPC

이 과제에서는 환경의 다음 상태를 예측하는 모델을 학습하고, 그 모델로 여러 행동열의 미래 보상을 비교한다. 별도의 actor 신경망은 없다. 현재 상태에서 계획한 행동열 중 **첫 행동만 실행하고 다시 계획**하는 MPC가 정책 역할을 한다. 모델 정확도, 행동열을 평가하는 계산 예산, 계획 지평이 성능을 함께 결정한다.

## 1. 파일과 데이터의 흐름

`run_hw6.py`가 첫 반복에는 random policy로 `initial_batch_size` 이상, 이후에는 `ModelBasedAgent`로 `batch_size` 이상 전이를 모아 replay에 넣는다. 전체 버퍼의 통계로 입력 $(s,a)$와 출력 변화량 $s'-s$를 정규화한 뒤, ensemble의 **각 모델에 별도 minibatch**를 주어 학습한다. `model_based_agent.py`의 `get_loss`, `get_dynamics_predictions`, `evaluate_action_sequences`, `get_action`이 순서대로 예측 학습·한 단계 예측·행동열 평가·MPC 선택을 맡는다.

## 2. Dynamics model의 손코딩

상태 차원을 $d_s$, 행동 차원을 $d_a$라 하면 모델 $f_i$는 정규화한 `[B,d_s+d_a]`를 받아 **정규화된 상태 변화량** `[B,d_s]`을 낸다. $\Delta s=s'-s$의 평균·표준편차를 $\mu_\Delta,\sigma_\Delta$라 할 때 손실과 예측 복원은 다음과 같다.

$$
L_i=\frac1B\sum_{j=1}^B\left\|f_i(\operatorname{norm}(s_j,a_j))-
\frac{s'_j-s_j-\mu_\Delta}{\sigma_\Delta}\right\|_2^2,
\qquad \hat s'=s+\sigma_\Delta f_i(\operatorname{norm}(s,a))+\mu_\Delta.
$$

`get_loss`는 **정규화된 목표**와 예측의 MSE를 줄이고, `get_dynamics_predictions`는 반드시 역정규화 후 현재 상태에 더한다. 표준편차에 작은 양수를 더한 스타터 통계는 0으로 나누는 것을 막는다. 전체 버퍼 통계는 매 수집 반복 뒤 갱신되므로 모델 학습에 쓰는 정규화 기준과 계획 때 쓰는 기준이 같아야 한다. 이 과제에서는 reward model을 학습하지 않고 환경이 제공하는 `get_reward`로 예측한 다음 상태와 행동의 보상을 계산한다.

## 3. 행동열 평가와 CEM

후보 행동열은 `[K,H,d_a]`이다. $K$는 후보 수, $H$는 지평이다. `evaluate_action_sequences`는 각 후보를 ensemble의 $N$개 모델로 전개해 `[N,K]`의 누적 할인 보상을 만든 뒤 **모델 축 평균**을 돌려준다. 매 지평 단계에서 각 모델의 현재 상태는 독립적으로 다음 상태가 되어야 한다. 모든 모델에 같은 다음 상태를 덮어쓰면 ensemble의 불확실성 차이가 지워진다.

```text
후보 K개 × 모델 N개를 현재 상태에서 시작
for t = 0,...,H-1:
    각 모델로 다음 상태 [N,K,d_s] 예측
    환경 reward를 [N,K]로 계산
    score += gamma**t * reward
return score.mean(axis=모델)
```

Random shooting은 균등하게 뽑은 $K$개 행동열 중 예측 점수가 가장 높은 것의 첫 행동을 쓴다. CEM은 후보 점수 상위 $J$개 elite의 **각 시점·행동 차원별** 평균과 표준편차를 계산해 새 대각 Gaussian에서 다시 $K$개를 뽑는 과정을 $M$번 반복한다. 샘플 행동은 환경 범위로 제한한다. 마지막에는 최종 평균 행동열의 **첫 행동**을 실행한다. `cem_alpha`를 평균·표준편차 갱신의 혼합비로 쓰는 구현에서는 새 통계가 이전 통계와 섞이며, 제공된 CEM 설정은 1이다. `np.argpartition`의 상위 인덱스 축과 elite 모양 `[J,H,d_a]`을 확인하자.

계획 길이 $H$를 늘리면 먼 보상을 볼 수 있지만, 모델 오차가 더 많이 누적되고 한 번의 의사결정 계산도 늘어난다. 후보 수 $K$를 늘리면 좋은 행동열을 발견할 가능성이 커지지만, 약 $N\times K\times H$번의 모델 전개가 필요하다. 제한된 제어 시간 안에서 예측 품질과 계산량을 함께 확인해야 한다. MPC는 실제 다음 상태를 관측한 뒤 다시 계획하여 처음의 먼 예측에 끝까지 묶이지 않는다.

## 4. 실행 결과에서 답할 질문

1. **모델만 학습:** `halfcheetah_0_iter.yaml`의 첫 반복 손실을 `itr_0_loss_curve.png`로 제시한다. 500번째 학습 단계에서 손실 0.2 미만은 구현 점검 기준이며, 이 설정에는 정책 평가가 없다.
2. **Random shooting과 CEM:** `halfcheetah_multi_iter.yaml`과 `halfcheetah_cem.yaml`의 평가 반환 평균·표준편차를 비교한다. 점검 기준은 각각 약 300 이상과 800 이상이다. 같은 환경 단계 수와 평가 episode 수를 확인한 뒤 CEM의 elite 재표본추출이 어느 구간에서 도움이 되었는지 설명한다.
3. **CEM의 예산 변경:** 기본 $H=15,K=1000$과 $H=1$ 및 $K=50$을 세 설정 표로 비교한다. $H=1$은 먼 보상을 보지 못하고, $K=50$은 후보 다양성이 줄어든다. 어느 쪽이 실제로 더 나빴는지는 학습한 모델과 실행 결과로 판단한다.

10회 평가의 표준편차는 **episode 간 변동**이지 여러 seed의 불확실성이 아니다. 평균·표준편차, 설정, 그래프를 보고서에 직접 채운다. 코드와 보고서 PDF를 한 압축 파일에 담고 **50 MB 미만**으로 제출한다.
