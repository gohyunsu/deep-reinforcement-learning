# 과제 5 · Offline RL과 CQL

새로운 환경 데이터를 모을 수 없을 때는 기록되지 않은 행동의 가치를 직접 검증하기 어렵다. 이 과제는 Pointmass의 고정 데이터에서 DQN식 TD 손실에 CQL의 보수적 항을 더한다. 핵심은 **데이터 행동의 Q와 전체 행동의 Q를 같은 상태에서 비교**하는 코드 한 부분과, 데이터의 질뿐 아니라 행동 coverage가 결과를 바꾸는 이유다.

## 1. 환경·데이터·코드의 연결

Pointmass 관측은 위치 $(y,x)$이고 행동은 정지·왼쪽·오른쪽·위·아래의 다섯 가지다. 목표에 도착하면 보상 1과 종료를 받고, 그 전에는 0을 받는다. Random 데이터는 100,000단계, Expert 데이터는 20,000단계다. `run_cql.py`가 환경과 데이터셋을 고르고, `cql_critic.py`의 `CQLCritic.update`가 학습 손실을 계산한다. `dqn_loss`는 이미 TD 손실과 현재 상태의 **모든 행동 Q** `qa_t_values: [B,5]`, 기록 행동의 Q `q_t_values: [B]`를 돌려준다.

## 2. CQL 손실을 코드로 읽기

데이터 $\mathcal D$의 한 전이를 $(s,a,r,s',d)$, 할인율을 $\gamma$, 보수성 강도를 $\alpha\ge0$라 하자. 이산 행동 CQL의 손실은 다음 두 항의 합이다.

$$
\begin{aligned}
L(\theta)&=\mathbb E_{\mathcal D}\left[(Q_\theta(s,a)-y)^2\right]
+\alpha\,\mathbb E_{\mathcal D}\left[\log\sum_b e^{Q_\theta(s,b)}-Q_\theta(s,a)\right],\\
y&=r+\gamma(1-d)Q_{\bar\theta}(s',\arg\max_bQ_\theta(s',b)).
\end{aligned}
$$

첫 항은 관측 전이의 Bellman 오차다. 두 번째 항은 **같은 상태의 모든 행동**을 log-sum-exp로 모아 기록 행동의 Q를 뺀다. 이 과제의 `dqn_loss`는 다음 행동을 online 망에서 고르고 target 망에서 평가하므로, $\alpha=0$도 단순히 CQL 정규화가 빠진 **Double-DQN식 TD 학습**이다. `torch.logsumexp(qa_t_values, dim=1)`은 `[B]`이고 `q_t_values`도 `[B]`여야 한다.

```python
dqn_loss, qa_t_values, q_t_values = self.dqn_loss(
    ob_no, ac_na, next_ob_no, reward_n, terminal_n
)
q_t_logsumexp = torch.logsumexp(qa_t_values, dim=1)
cql_loss = (q_t_logsumexp - q_t_values).mean()
loss = dqn_loss + self.cql_alpha * cql_loss
```

`logsumexp`를 전체 batch와 행동 축에 한꺼번에 적용하거나, 기록 행동의 Q 대신 다음 상태 Q를 빼면 목적식이 달라진다. `cql_loss`는 로그의 `CQL Loss`, `q_t_logsumexp`와 `q_t_values`는 각각 `OOD q-values`와 `Data q-values`의 계산에도 쓰인다. 다만 `OOD q-values` 로그는 **진짜 데이터 밖 행동의 평균 Q**가 아니라 log-sum-exp 통계량이다.

한 상태의 행동 Q가 `[2,0]`이고 데이터 행동의 Q가 2라면 벌점은 $\log(e^2+1)-2=\log(1+e^{-2})\approx0.127$이다. 데이터 행동의 Q가 0인 경우에는 $\log(e^2+1)\approx2.127$로 커진다. 같은 식은 $-\log\operatorname{softmax}(Q(s,\cdot))_a$이기도 하다. 즉 관측 행동보다 다른 행동을 지나치게 높이는 상대적 낙관에 비용을 매긴다. 이 벌점만으로 개별 Q가 참값의 엄격한 하한이 된다고 해석하지는 않는다.

## 3. Random과 Expert의 역설을 해석하기

Expert 데이터는 좋은 경로를 자주 보지만, 다른 행동은 거의 시도하지 않을 수 있다. TD target의 최대화는 **보지 못한 행동**의 우연히 높은 Q를 선택해 오류를 증폭시킬 수 있다. Random 데이터는 좋은 행동의 비중은 낮아도 더 다양한 행동을 포함하므로, 이 실험에서 $\alpha=0$이 상대적으로 잘 작동할 수 있다. 이는 Random 데이터가 언제나 우월하다는 뜻이 아니다. 데이터의 **성과**와 **coverage**라는 두 자원을 함께 봐야 한다.

$\alpha$를 키우면 보지 못한 행동에 대한 낙관을 억제하는 대신, 실제로 좋은 행동까지 지나치게 낮출 위험도 커진다. 이 절충은 새 행동을 실험할 수 없는 offline 상황에서 특히 중요하다. 성능 격차가 생겼다면 평가 반환, 마지막 경로 이미지, 벌점 곡선을 함께 읽는다. 벌점이 낮아졌다는 사실만으로 목표 도달률이 높아졌다고 결론내리지 않는다.

## 4. 필요한 네 실행과 보고 항목

1. **Expert × $\alpha=0,0.1$:** PointmassMedium-v0에서 두 설정을 실행한다. 마지막 단계의 `Eval_AverageReturn`, `Eval_StdReturn`을 표에 쓰고 각 `eval_last_traj.png`와 두 벌점 곡선을 제시한다. $\alpha=0.1$의 평균 반환 약 0.9 이상은 구현 점검 기준이다. $\alpha=0$이 어떤 알고리즘에 해당하는지, 두 설정의 성능과 벌점 차이를 설명한다.
2. **Random × $\alpha=0,0.1$:** 같은 환경에서 두 설정을 실행한다. 두 마지막 경로 이미지와 Random·Expert 네 조건의 평균·표준편차 표를 완성한다. Random에서 $\alpha=0$과 0.1의 성능 차이가 작을 수 있는 이유를 **행동 coverage와 보지 못한 행동의 과대평가**로 설명한다.

실행 결과의 숫자와 경로 그림은 직접 얻은 것을 사용한다. 보고서 PDF와 필요한 코드를 압축해 제출하고 영상·로그는 제외한다. 파일 크기는 **20 MB 미만**이다.
