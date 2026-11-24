# Deep Reinforcement Learning

[학습 사이트](https://gohyunsu.github.io/deep-reinforcement-learning/)

강화학습의 순차 의사결정부터 모방학습, 정책경사, 가치 기반 방법, 오프라인·모델 기반 강화학습, 탐색, 보상학습, skill, 계층적 RL과 sim-to-real까지 연결하는 한국어 학습 가이드입니다. 20개 장의 748개 슬라이드에 각각 대응하는 이미지와 해설을 함께 배치했습니다. 수식의 전제와 유도, 직관, 구현에서 자주 혼동하는 부분, 실제 연구 사례를 본문에서 설명하며 필요한 곳에 추가 질문을 접어 두었습니다.

## 구성

| 장 | 주제 |
| --- | --- |
| 01-1 · 01-2 | 강화학습의 응용과 모방학습 |
| 02-1 · 02-2 | MDP와 정책경사 |
| 03-1 · 03-2 | Actor–Critic, GAE, PPO |
| 04-1 | Q-learning, DQN, Rainbow |
| 05-1 · 05-2 | DDPG, TD3, SAC와 벤치마크 |
| 06 | 오프라인 강화학습 |
| 07-1 · 07-2 | 환경 모델, MPC, Dreamer, TD-MPC |
| 09-1 · 09-2 | AlphaGo·MCTS와 보상학습 |
| 10-1 · 10-2 | RLHF·DPO와 skill discovery |
| 12-1 · 12-2 | 계층적 RL, skill 연결과 계획 |
| 13-1 · 13-2 | Sim-to-real, 로봇 조작과 보행 |

[과제 1](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw1.html)은 BC와 DAgger, [과제 2](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw2.html)는 정책경사와 PPO, [과제 3](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw3.html)은 DQN을 다룹니다. [과제 4](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw4.html)는 SAC, [과제 5](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw5.html)는 CQL, [과제 6](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw6.html)는 dynamics model과 MPC로 이어집니다. 각 페이지는 손코딩 함수와 데이터 흐름, 실험 질문을 함께 정리하며 해당 개념의 슬라이드에서도 연결됩니다.

## 중간고사 연습

[문제 풀기](https://gohyunsu.github.io/deep-reinforcement-learning/midterm/)에는 58문항으로 구성한 세 세트가 있습니다. 각 세트는 T/F 25문항, 객관식 4문항, 단답형 29문항이며, 범위는 Model-based RL 이전의 10개 강의 장과 HW1–3입니다. 선택형은 답을 선택하면 바로 채점하고, 단답형은 버튼으로 예시 답안을 공개합니다. 모든 문항에서 짧은 해설과 연결되는 슬라이드·과제로 이동할 수 있습니다. 진도는 브라우저에 저장되고 세트별로 초기화할 수 있습니다. [주요 모델 비교](https://gohyunsu.github.io/deep-reinforcement-learning/midterm/models.html)는 학습 자료, 핵심 업데이트, 강점과 한계를 네 계열로 묶어 정리합니다.

## 프로젝트 구조

- content/: 슬라이드별 본문, 장 목록, 과제 가이드, 중간고사 문항과 모델 비교 자료
- docs/: 정적 사이트와 개별 슬라이드 이미지
- tools/build.mjs: 사이트 생성
- tools/check.mjs: 이미지·페이지·내부 링크와 시험 문항 수·범위 검증

GitHub Actions는 사이트를 생성해 GitHub Pages에 게시합니다. 로컬에서 사이트를 생성할 때는 Node.js 24 이상에서 `npm install`과 `npm run build`를 실행합니다.
