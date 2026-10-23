export const groups = [
  {
    title: '모방학습', intro: '전문가의 행동을 목표로 학습한다. 환경 보상을 직접 최적화하는 RL과 구분하되, 데이터 분포 문제는 이후 offline RL과도 이어진다.',
    rows: [
      ['BC', '전문가 상태·행동 쌍', '지도학습으로 $\\pi(a\\mid s)$를 맞춤', '단순하고 안정적인 기준선', '실행 중의 낯선 상태에 취약', '01-2:08', 'hw1'],
      ['DAgger', '학습 정책의 방문 상태 + 전문가 라벨', '실행 상태를 반복 집계', 'BC의 covariate shift를 완화', '반복적인 전문가 질의 비용', '01-2:19', 'hw1'],
      ['ACT', '로봇 시연 궤적', '짧은 action chunk를 한 번에 예측', '시간적으로 일관된 조작', 'chunk 경계와 긴 작업의 오류 누적', '01-2:25', null],
      ['Diffusion Policy', '로봇 시연 궤적', '잡음에서 반복 denoising으로 행동 생성', '다봉 행동 분포 표현', '반복 추론의 계산 비용', '01-2:35', null]
    ]
  },
  {
    title: 'On-policy 정책경사', intro: '현재 정책의 rollout으로 직접 정책을 개선한다. 표본 gradient의 분산과 동일 데이터를 여러 번 이용할 때의 정책 차이를 관리하는 것이 핵심이다.',
    rows: [
      ['REINFORCE', '현재 정책의 완성된 궤적', '$\\nabla\\log\\pi_\\theta(a_t\\mid s_t)G_t$', '환경 전이 미분 없이 직접 정책 개선', '높은 분산과 rollout 비용', '02-2:11', 'hw2'],
      ['Actor–Critic', '현재 정책 rollout', 'critic의 $V$ 또는 $A$로 actor를 갱신', 'baseline과 bootstrap으로 분산 감소', 'critic 편향이 actor에 전파', '03-1:30', 'hw2'],
      ['GAE', 'rollout + 학습된 가치함수', '$\\hat A_t=\\sum_l(\\gamma\\lambda)^l\\delta_{t+l}$', 'advantage의 편향·분산 조절', '$\\lambda$와 가치함수 품질에 민감', '03-2:09', 'hw2'],
      ['PPO-Clip', '이전 정책의 rollout batch', '$\\min(r_t A_t,\\operatorname{clip}(r_t)A_t)$', '여러 최적화 단계의 큰 이득 제한', 'clipping이 엄격한 정책 거리 보장은 아님', '03-2:18', 'hw2']
    ]
  },
  {
    title: '가치 기반 RL과 연속 행동', intro: 'Q-learning은 다음 행동의 최댓값으로 Bellman 목표를 만든다. DQN 계열은 주로 이산 행동, actor–critic 계열은 연속 행동의 최대화에 대응한다.',
    rows: [
      ['Q-learning', 'behavior policy와 다른 transition도 사용', '$r+\\gamma\\max_{a\\prime}Q(s\\prime,a\\prime)$', 'off-policy 가치 개선', '함수 근사·bootstrap·off-policy 결합의 불안정성', '04-1:06', 'hw3'],
      ['DQN', 'replay buffer의 이산 행동 전이', 'Q-network + target network + replay', '픽셀 입력에도 확장', 'moving target·상관·탐색 관리 필요', '04-1:10', 'hw3'],
      ['Double DQN', 'DQN replay', '온라인 망으로 선택, target 망으로 평가', 'max 과대평가 완화', '편향 완전 제거는 아님', '04-1:27', 'hw3'],
      ['n-step Q', '연속된 $n$개 전이', '$n$개 보상 후 bootstrap', '더 먼 보상 신호의 빠른 전파', 'off-policy 중간 행동에 주의', '04-1:29', null],
      ['PER', '우선순위가 있는 replay', '큰 TD 오차 전이를 자주 추출', '유용한 경험에 학습 집중', 'sampling bias와 보정 필요', '04-1:32', null],
      ['C51', '이산 행동 전이', '고정 지지점 위 반환 분포 예측', '평균 밖 반환 분포 정보', '지지 범위·투영의 선택', '04-1:37', null],
      ['Rainbow', 'Atari 등 이산 행동 전이', 'Double·PER·n-step·분포학습 등 결합', '여러 DQN 개선의 시너지', '개별 장치의 기여 분리 필요', '04-1:41', null],
      ['DDPG', 'replay의 연속 행동 전이', '결정적 actor로 $\\arg\\max_a Q$ 근사', '연속 행동 off-policy 학습', 'critic 과대평가·정책 불안정', '05-1:15', null],
      ['TD3', 'replay의 연속 행동 전이', 'twin critics + delayed actor + target smoothing', 'DDPG의 불안정성 완화', '탐색 잡음과 하이퍼파라미터 의존', '05-1:21', null],
      ['SAC', 'replay의 연속 행동 전이', '확률적 actor + 최대 엔트로피 목적', '탐색·견고성과 표본 재사용', '온도·엔트로피 목표의 설정', '05-1:28', null]
    ]
  },
  {
    title: '고정 데이터의 Offline RL', intro: '새로운 환경 상호작용 없이 이미 모은 데이터만 사용한다. 데이터 밖 행동의 Q를 지나치게 믿지 않도록 정책이나 가치함수를 제어한다.',
    rows: [
      ['Filtered BC', '성공 또는 고반환 데이터', '좋은 사례만 골라 BC', '단순한 보상 활용', '필터 기준·데이터 커버리지에 민감', '06:27', null],
      ['AWR', '고정된 행동 데이터', '$e^{A(s,a)/\\beta}$ 가중 BC', '좋은 데이터 행동을 연속적으로 선호', '가치·advantage 오차에 민감', '06:28', null],
      ['TD3+BC', '고정된 연속 행동 데이터', 'TD3 actor에 BC penalty 추가', '정책이 데이터 행동을 크게 벗어나는 것 억제', 'Q 개선과 BC 강도의 절충', '06:12', null],
      ['CQL', '고정된 전이 데이터', '데이터 밖 행동 Q를 상대적으로 낮춤', 'critic의 OOD 낙관 억제', '보수성 과하면 좋은 행동도 놓침', '06:15', null],
      ['IQL', '고정된 전이 데이터', 'expectile $V$ + 데이터 내 $Q$ + 가중 BC', '데이터 밖 행동의 직접 max 회피', '데이터에 좋은 행동이 있어야 효과적', '06:35', null]
    ]
  }
];
