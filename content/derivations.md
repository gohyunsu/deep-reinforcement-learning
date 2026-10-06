# 수식 유도 노트

확률적 정책의 목적함수에서 출발해 정책경사, advantage, PPO, Q-learning, 연속 제어, offline RL의 학습식이 어떻게 나오는지 연결한다. 기호는 상태 \(s\), 행동 \(a\), 보상 \(r\), 다음 상태 \(s'\), 정책 \(\pi_\theta\), 할인율 \(\gamma\)로 통일한다.

## 1. 정책경사: 환경을 미분하지 않고 정책을 미분하기

정책 \(\pi_\theta\)를 따라 생성된 궤적을 \(\tau=(s_0,a_0,r_0,\ldots,s_T)\), 그 누적 보상을 \(R(\tau)\)라 두면 목표는

$$
J(\theta)=\mathbb E_{\tau\sim p_\theta}[R(\tau)]
=\int p_\theta(\tau)R(\tau)\,d\tau
$$

이다. 궤적 확률의 로그를 직접 미분하는 대신, \(p>0\)에서 \(\nabla p=p\nabla\log p\)라는 항등식을 쓴다.

$$
\begin{aligned}
\nabla_\theta J(\theta)
&=\int \nabla_\theta p_\theta(\tau)R(\tau)\,d\tau\\
&=\int p_\theta(\tau)\nabla_\theta\log p_\theta(\tau)R(\tau)\,d\tau\\
&=\mathbb E_{\tau\sim p_\theta}
[\nabla_\theta\log p_\theta(\tau)R(\tau)].
\end{aligned}
$$

MDP에서 궤적 확률은 초기 상태 분포, 정책, 환경 전이의 곱이다.

$$
p_\theta(\tau)=\rho_0(s_0)\prod_{t=0}^{T-1}
\pi_\theta(a_t\mid s_t)P(s_{t+1}\mid s_t,a_t).
$$

로그를 취하면 곱이 합이 된다. 초기 분포와 환경 전이는 \(\theta\)에 의존하지 않는다고 가정하므로,

$$
\nabla_\theta\log p_\theta(\tau)
=\sum_{t=0}^{T-1}\nabla_\theta\log\pi_\theta(a_t\mid s_t).
$$

따라서

$$
\nabla_\theta J
=\mathbb E\left[
\left(\sum_t\nabla_\theta\log\pi_\theta(a_t\mid s_t)\right)R(\tau)
\right].
$$

이 식은 환경의 미분가능성을 요구하지 않는다. 대신 return을 실제 궤적에서 추정하므로 표본분산이 클 수 있다. \(N\)개 독립 궤적의 평균은 Monte Carlo 추정량이며, 표본 수를 늘릴수록 평균의 표준오차가 \(1/\sqrt N\) 비율로 감소한다.

## 2. Reward-to-go와 baseline: 기대 gradient를 보존하는 분산 감소

시점 \(t\)의 행동은 그보다 앞선 보상을 바꾸지 않는다. 전체 return을 \(G_0=\sum_{k=0}^{T-1}\gamma^kr_k\), 시점 \(t\) 이후의 return을 \(G_t=\sum_{k=t}^{T-1}\gamma^{k-t}r_k\)라 하자. 과거 보상 \(C_t=\sum_{k<t}\gamma^kr_k\)에 대한 점수함수 항의 조건부 기대는

$$
\begin{aligned}
\mathbb E[\nabla_\theta\log\pi_\theta(a_t\mid s_t)C_t\mid s_t]
&=C_t\sum_a\pi_\theta(a\mid s_t)
  \nabla_\theta\log\pi_\theta(a\mid s_t)\\
&=C_t\nabla_\theta\sum_a\pi_\theta(a\mid s_t)\\
&=C_t\nabla_\theta 1=0.
\end{aligned}
$$

그러므로 전체 return 대신 \(G_t\)를 사용해도 기대 gradient는 같고, 행동과 인과적으로 무관한 과거 보상만 제거된다.

같은 계산으로 상태만의 함수인 임의의 baseline \(b(s_t)\)도 빼도 된다.

$$
\mathbb E_{a_t\sim\pi_\theta}
[\nabla_\theta\log\pi_\theta(a_t\mid s_t)b(s_t)]
=b(s_t)\nabla_\theta\sum_a\pi_\theta(a\mid s_t)=0.
$$

따라서

$$
\nabla_\theta J
=\mathbb E[\nabla_\theta\log\pi_\theta(a_t\mid s_t)
(G_t-b(s_t))].
$$

baseline을 \(V^\pi(s_t)\)로 근사하면 \(G_t-V^\pi(s_t)\)는 advantage의 표본 추정량이다. baseline은 평균 방향을 바꾸지 않으면서 큰 양·음의 반환을 기준점 주변으로 옮겨 분산을 줄인다. 행동에도 의존하는 baseline은 위의 합이 1이라는 증명을 그대로 쓸 수 없으므로 주의한다.

## 3. Bellman 식과 N-step·GAE

반환은 첫 보상과 남은 반환으로 분해된다.

$$
G_t=r_t+\gamma G_{t+1}.
$$

이를 \(V^\pi(s)=\mathbb E_\pi[G_t\mid s_t=s]\)에 대입하고, 첫 행동과 다음 상태에 대해 조건부 기대를 취하면

$$
V^\pi(s)=\mathbb E_{a\sim\pi,\,s'\sim P}
[r(s,a)+\gamma V^\pi(s')]
$$

를 얻는다. 행동을 고정한 \(Q^\pi\)와 정책의 평균인 \(V^\pi\)는

$$
Q^\pi(s,a)=\mathbb E[r+\gamma V^\pi(s')],\qquad
V^\pi(s)=\mathbb E_{a\sim\pi}[Q^\pi(s,a)]
$$

로 연결된다. 최적 정책의 Bellman 식에서는 행동 평균을 최대화로 바꾼다.

$$
Q^*(s,a)=\mathbb E_{s'\sim P}
[r(s,a)+\gamma\max_{a'}Q^*(s',a')].
$$

가치함수 \(V_\phi\)의 한 단계 TD 잔차를
\(\delta_t=r_t+\gamma V_\phi(s_{t+1})-V_\phi(s_t)\)라 하자. 잔차를 \(n\)단계만큼 할인 합하면 중간 상태가치가 망원합처럼 상쇄된다.

$$
\begin{aligned}
\sum_{l=0}^{n-1}\gamma^l\delta_{t+l}
&=r_t+\gamma r_{t+1}+\cdots+\gamma^{n-1}r_{t+n-1}\\
&\quad+\gamma^nV_\phi(s_{t+n})-V_\phi(s_t)\\
&=G_t^{(n)}-V_\phi(s_t).
\end{aligned}
$$

즉 TD 잔차의 합은 N-step 반환의 advantage 추정량이다. 짧은 추정은 bootstrap에 더 의존하고 긴 추정은 실제 보상을 더 많이 포함한다. 이들을 지수 가중으로 혼합하면

$$
\hat A_t^{GAE}
=\sum_{l=0}^{\infty}(\gamma\lambda)^l\delta_{t+l}.
$$

\(\lambda=0\)에서는 한 단계 TD 잔차이고, \(\lambda\to1\)에서는 episode 끝까지의 잔차 합에 가까워진다. 실제 구현에서는 terminal 경계에서 마스크를 곱해 종료 뒤의 가치가 새어 들어가지 않게 한다. time-limit truncation은 과업 종료와 구별해 bootstrap 여부를 정한다.

## 4. PPO clipping은 무엇을 제한하는가

옛 정책으로 모은 행동의 새 정책 확률비는

$$
r_t(\theta)=
\frac{\pi_\theta(a_t\mid s_t)}
{\pi_{\theta_{\rm old}}(a_t\mid s_t)}
$$

다. 비율이 1보다 크면 그 행동의 확률이 옛 정책보다 커졌고, 1보다 작으면 작아졌다. advantage가 양수면 확률을 높이고 음수면 낮추는 것이 유리하다. PPO surrogate는

$$
L^{CLIP}(\theta)=\mathbb E_t[
\min(r_t\hat A_t,
\operatorname{clip}(r_t,1-\epsilon,1+\epsilon)\hat A_t)].
$$

\(\hat A_t>0\)이면 \(r_t\)가 커질수록 첫 항이 증가하지만 \(1+\epsilon\)보다 커진 뒤에는 두 번째 항이 더 작은 상한이 되어 목적함수의 이득이 더 커지지 않는다. \(\hat A_t<0\)이면 \(r_t\)를 지나치게 낮추는 것이 첫 항을 인위적으로 유리하게 만들 수 있는데, \(1-\epsilon\) 아래에서는 clip 항이 더 작은(더 비관적인) 목적값을 선택해 그 방향의 과도한 개선을 막는다. 따라서 min을 쓰는 이유는 advantage 부호가 양수·음수일 때 모두 과한 확률비 변화의 이득을 잘라내기 위해서다.

이 clipping은 전체 정책의 KL 거리를 엄밀하게 제한하는 제약식이 아니다. 일부 상태·행동의 확률비만 다루며, 여러 epoch가 누적되면 정책은 이동할 수 있다. 실제 학습에서는 KL, entropy, value loss, gradient norm도 관찰한다.

## 5. Q-learning, replay와 Double DQN

최적 Q 함수는 행동을 고정한 뒤 다음 상태에서 가장 큰 미래 가치를 선택한다.

$$
Q^*(s,a)=\mathbb E[r+\gamma\max_{a'}Q^*(s',a')].
$$

데이터 전이 \((s,a,r,s')\)로 target
\(y=r+\gamma(1-d)\max_{a'}Q_{\bar\theta}(s',a')\)를 계산하고, 현재 예측을 회귀한다.

$$
\mathcal L(\theta)=
\mathbb E_{\mathcal D}[(Q_\theta(s,a)-y)^2].
$$

\(d=1\)은 terminal 표시다. 다음 상태의 값으로 자기 자신을 학습시키므로 bootstrapping이고, \(\bar\theta\)를 천천히 고정하는 target network가 target 이동을 늦춘다. replay buffer는 연속 시점 전이의 상관을 줄이고 과거 경험을 다시 사용한다.

max의 과대추정은 두 행동만으로 볼 수 있다. 참값이 모두 \(q\)이고 추정 오차가 독립적으로 평균 0인 \(\varepsilon_1,\varepsilon_2\)여도

$$
\mathbb E[\max(q+\varepsilon_1,q+\varepsilon_2)]
=q+\mathbb E[\max(\varepsilon_1,\varepsilon_2)]\ge q
$$

다. 평균 0인 오차라도 큰 쪽을 고르기 때문에 최대값의 기대가 커진다. Double DQN은 online network로
\(a^*=\arg\max_aQ_\theta(s',a)\)를 고르고 target network로 \(Q_{\bar\theta}(s',a^*)\)를 평가해 선택과 평가를 분리한다.

## 6. DDPG에서 SAC까지: 연속 행동을 제안하는 정책

연속 행동에서는 모든 \(a\)를 나열해 최대 Q를 찾을 수 없다. 결정론적 actor \(\mu_\theta(s)\)가 행동을 제안한다고 두고 목적을

$$
J(\theta)=\mathbb E_{s\sim\mathcal D}[Q_\phi(s,\mu_\theta(s))]
$$

라 하자. chain rule을 적용하면

$$
\nabla_\theta J
=\mathbb E_s[
\nabla_aQ_\phi(s,a)|_{a=\mu_\theta(s)}
\nabla_\theta\mu_\theta(s)].
$$

critic이 actor의 행동 출력 방향으로 Q가 증가하는 국소 기울기를 제공한다. actor는 critic의 오류를 exploit할 수 있으므로 replay와 target network만으로 충분하지 않을 수 있고, TD3의 double critic·target smoothing·delayed update가 이를 완화한다.

SAC는 보상뿐 아니라 정책 엔트로피를 최대화한다.

$$
J(\pi)=\mathbb E_\pi\left[
\sum_t r_t+\alpha\mathcal H(\pi(\cdot\mid s_t))\right],
\quad
\mathcal H(\pi)=-\mathbb E_{a\sim\pi}[\log\pi(a\mid s)].
$$

엔트로피가 커지면 한 행동에 확률을 몰아넣지 않아 탐험과 여러 유효 해의 유지에 도움이 된다. 이에 대응하는 soft Bellman target은
\(r+\gamma(\min_iQ_{\bar\phi_i}(s',a')-\alpha\log\pi(a'\mid s'))\), \(a'\sim\pi(\cdot\mid s')\)다. \(\alpha\)를 키우면 무작위성의 가치가 커지고, 낮추면 보상 최대화에 더 집중한다.

## 7. Offline RL: CQL의 log-sum-exp와 IQL의 expectile

정적 데이터 \(\mathcal D\)에는 제한된 행동만 들어 있다. 데이터 밖 행동의 Q는 직접적인 감독이 없는데, greedy 개선은 바로 그 Q가 큰 행동을 고른다. CQL은 데이터 행동의 Q를 Bellman target에 맞추면서 후보 행동의 높은 Q를 억제한다. entropy 정규화를 둔 정책 최적화 문제는 log-sum-exp가 된다.

$$
\max_{\pi(\cdot\mid s)}
\left\{\mathbb E_{a\sim\pi}[Q(s,a)]
+\alpha\mathcal H(\pi)\right\}.
$$

최적분포를 \(\pi^*(a\mid s)\propto\exp(Q(s,a)/\alpha)\)로 두면, 정규화 상수 \(Z(s)=\sum_a\exp(Q(s,a)/\alpha)\)에 대해 위 최적값은

$$
\alpha\log Z(s)=
\alpha\log\sum_a\exp(Q(s,a)/\alpha).
$$

따라서 큰 Q 후보에 부드럽게 민감한 항을 계산할 수 있다. 연속 행동에서는 log-sum-exp의 합 대신 행동 샘플 적분을 근사한다. 과한 보수성은 분포 밖 낙관성을 낮추는 대신 유망한 개선도 억누른다.

IQL은 학습 중 데이터 밖 행동을 직접 선택해 평가하지 않는다. expectile 회귀는 잔차 \(u=Q(s,a)-V(s)\)의 부호에 따라 비대칭 가중 제곱오차를 쓴다.

$$
\mathcal L_\tau(u)=
|\tau-\mathbf 1[u<0]|u^2
=\begin{cases}
(1-\tau)u^2,&u<0,\\
\tau u^2,&u\ge0.
\end{cases}
$$

\(\tau>1/2\)이면 \(Q>V\)인 양의 잔차에 더 큰 가중을 주어 \(V(s)\)가 행동가치 분포의 높은 쪽을 추적한다. 그 다음 데이터 전이로 \(Q(s,a)\)를 \(r+\gamma V(s')\)에 맞추고, \(Q-V\)가 큰 데이터 행동을
\(\exp((Q-V)/\beta)\)로 가중해 정책을 행동복제로 추출한다. 기대값 회귀는 \(Q\)의 평균에 맞추지만 expectile은 꼬리 쪽에 더 민감하다는 점이 정책 개선의 단서다.

## 참고 문헌

- Sutton & Barto, *Reinforcement Learning: An Introduction*, 2nd ed.
- Schulman et al., *Proximal Policy Optimization Algorithms* (2017).
- Fujimoto & Gu, *A Minimalist Approach to Offline Reinforcement Learning* (2021).
- Kumar et al., *Conservative Q-Learning for Offline Reinforcement Learning* (2020).
- Kostrikov et al., *Offline Reinforcement Learning with Implicit Q-Learning* (2022).
