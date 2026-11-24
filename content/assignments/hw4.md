# 과제 4 · Soft Actor-Critic

연속 행동에서는 $\max_a Q(s,a)$를 행동마다 열거할 수 없다. 이 과제는 행동을 내는 actor와 이를 평가하는 critic을 함께 학습한다. 먼저 Bellman target과 target network를 구현하고, 엔트로피 보상, REINFORCE와 reparameterization, 두 critic의 보수적 backup을 차례로 붙인다. 비교 그래프의 가로축은 **환경 단계**, 세로축은 평가 반환이다.

## 1. 코드 구조와 한 번의 학습 순서

`run_hw4.py`가 환경·replay·평가를 연결하고, `sac_agent.py`가 actor와 critic의 업데이트를 담당한다. `state_action_value_critic.py`는 DQN의 $Q(s)\in\mathbb R^m$와 달리 연속 행동 쌍 $(s,a)$를 받아 **스칼라** $Q(s,a)$를 낸다. `mlp_policy.py`는 행동분포를 만들고, `experiments/sac/*.yaml`이 실험별 설정을 고정한다.

```text
환경에서 (s,a,r,s',done) 수집 → replay에 저장
replay batch → target critic으로 y 계산 → critic 손실
같은 batch의 상태 → actor 손실 → actor 갱신
hard 또는 soft target 갱신 → 평가·기록
```

`run_hw4.py`의 첫 TODO는 초기 `random_steps` 동안 환경에서 무작위 행동을 쓰고 그 뒤 `agent.get_action(observation)`을 쓰는 분기다. `training_starts` 이후에만 replay에서 `batch_size`개를 뽑아 tensor로 바꾸고 `agent.update`에 넘긴다. 환경의 `done`은 실제 종료, `truncated`는 시간 제한이며 둘 다 rollout은 끝내지만 target의 종료 마스크는 `done`을 쓴다. 상태가 reset된 뒤에는 이전 episode의 마지막 `next_observation`을 다음 전이의 현재 상태로 쓰지 않는다.

## 2. Critic: bootstrap과 두 target 갱신

online critic의 파라미터를 $\phi$, target의 파라미터를 $\bar\phi$, 정책을 $\pi_\theta$, 할인율을 $\gamma$라 하자. $d_t=1$이면 실제 종료다. 다음 행동 $a'\sim\pi_\theta(\cdot\mid s')$를 뽑고 target $y=r+\gamma(1-d)Q_{\bar\phi}(s',a')$를 **gradient 없이** 계산한다. critic은 $(Q_\phi(s,a)-y)^2$의 batch 평균을 줄인다. `update_critic`은 여러 critic을 쓸 때 `[num_critics, batch]` 모양을 유지하고, `update`는 `num_critic_updates`번 반복한다.

Target 갱신은 두 방식 중 설정된 하나만 적용한다. Hard 갱신은 지정된 `target_update_period`마다 $\bar\phi\leftarrow\phi$, soft 갱신은 매 단계 $\bar\phi\leftarrow(1-\tau)\bar\phi+\tau\phi$다. $\tau$는 target이 새 파라미터를 반영하는 비율이므로 작을수록 목표가 천천히 움직인다. Pendulum 첫 sanity run에서 actor를 아직 보상에 맞춰 갱신하지 않으므로 높은 반환을 기대하지 않는다. 매 단계 보상이 약 $-10$으로 계속된다는 단순화 아래 $Q\approx-10/(1-0.99)=-1000$이다. 실제 episode 길이·행동·보상이 달라 로그가 약 $-700$인 것은 이 계산과 모순이 아니다.

## 3. 엔트로피와 actor 손실

엔트로피는 $\mathcal H(\pi(\cdot\mid s))=\mathbb E_{a\sim\pi}[-\log\pi(a\mid s)]$다. `entropy`는 한 행동 표본으로 $-\log\pi(\hat a\mid s)$를 추정해 **상태마다 하나의 값** `[B]`을 내야 한다. 행동 차원이 여러 개면 각 차원의 로그밀도를 합친다.

Actor의 엔트로피를 미분할 때는 `rsample`로 재매개화한 표본을 쓴다. `update_critic`의 target 계산은 `no_grad` 안에서 한다. `use_entropy_bonus`와 `backup_entropy`가 켜진 경우 target의 다음 가치에 $\beta\mathcal H(\pi(\cdot\mid s'))$를 더한다. $\beta$는 엔트로피 보너스의 가중치다.

Pendulum 두 번째 sanity run은 보상 극대화 전의 엔트로피 학습을 확인한다. 행동 구간 $[-1,1]$의 균등분포 엔트로피는 $\log2\approx0.69$다.

`actor_loss_reinforce`는 상태별로 `num_actor_samples`개 행동을 **sample**하고, critic의 Q를 actor 쪽으로 역전파하지 않은 채 `-mean(log_prob * Q)`를 최소화한다. 표본 수를 늘리면 같은 상태에서의 gradient 잡음을 줄일 수 있지만 critic 평가 비용도 늘어난다. `actor_loss_reparametrize`는 **rsample**로 행동을 만들고 $-\mathbb E[Q_\phi(s,a_\theta)]$를 최소화한다. 이때 Q의 행동 미분이 actor까지 이어져야 하므로 action을 detach하면 안 된다. 두 방식 모두 엔트로피 보너스를 쓰면 actor 손실에서 $\beta\mathcal H$를 뺀다.

```python
# 개념상 actor 손실: 실제 분포의 log_prob 모양을 확인한다.
reinforce_loss = -(log_prob * q_detached).mean()
pathwise_loss = -critic(obs, action_from_rsample).mean()
actor_loss = reward_loss - beta * entropy.mean()
```

`mlp_policy.py`의 tanh 변환 분포를 쓰면 `log_prob`는 단순 Gaussian 밀도가 아니다. 변환의 Jacobian 보정이 포함된 **실제 행동분포의 로그밀도**를 사용한다. 이 과제의 `temperature`를 SAC 문헌의 엔트로피 계수 $\alpha$로 쓰는 경우가 있지만, 뒤의 두 critic 실험과 구분해 표기한다.

## 4. 두 critic의 backup이 다른 이유

`q_backup_strategy`에는 `[2,B]`의 target Q가 들어온다. `doubleq`는 두 줄을 서로 바꿔 A의 목표에 B를, B의 목표에 A를 쓴다. `min`은 두 값의 원소별 최솟값을 구해 **두 critic의 목표 모두**에 복사한다. 전자는 선택·평가를 나누는 Double DQN 식과 동일한 코드가 아니고, 후자는 낙관적 오차를 억제하는 clipped double Q다. `[B]`로 줄어든 min 결과를 다시 `[2,B]`로 확장하지 않으면 손실의 축이 어긋난다.

## 5. 실험과 해석의 기준

1. **Pendulum sanity:** `sanity_pendulum_1.yaml`의 Q 추세와 $-10/(1-\gamma)$ 계산을 설명한다. `sanity_pendulum_2.yaml`의 엔트로피가 $\log2$ 근처로 가는지도 확인한다.
2. **REINFORCE:** InvertedPendulum에서 평가 반환이 약 1000에 접근하는 곡선을 제시한다. HalfCheetah의 `reinforce1`은 50만 단계 이내 한 번 이상 양의 반환, `reinforce10`은 한 번 이상 1000을 넘는지 점검하고 **두 곡선을 한 그래프**에서 비교한다.
3. **Reparameterization:** InvertedPendulum의 반환 약 1000을 확인한다. HalfCheetah는 한 번 이상 5000을 넘는지 점검하고 `reinforce1`·`reinforce10`·`reparametrize` 세 곡선을 같은 축에서 비교한다. 선택적 Humanoid 실험은 별도다.
4. **Hopper bias:** 같은 seed 49로 `hopper.yaml`, `hopper_doubleq.yaml`, `hopper_clipq.yaml`을 실행해 **eval_return과 q_values 두 지표**를 함께 그린다. 높은 Q만으로 좋은 정책을 결론내리지 않는다.

실제 점수의 우열은 실행 결과로만 쓴다. 모든 그래프에 환경·설정·환경 단계 축을 밝히고, 코드와 보고서 PDF를 한 압축 파일에 넣는다. 영상과 로그는 빼고 **20 MB 미만**으로 제출한다.
