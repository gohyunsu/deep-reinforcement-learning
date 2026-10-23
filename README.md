# Deep Reinforcement Learning

[학습 사이트](https://gohyunsu.github.io/deep-reinforcement-learning/)

강화학습의 순차 의사결정부터 모방학습, 정책경사, 가치 기반 방법, 오프라인·모델 기반 강화학습까지 연결하는 한국어 학습 가이드입니다. 12개 장의 409개 슬라이드에 각각 대응하는 이미지와 해설을 함께 배치했습니다. 수식의 전제와 유도, 직관, 구현에서 자주 혼동하는 부분, 실제 연구 사례를 본문에서 설명하며 필요한 곳에 추가 질문을 접어 두었습니다.

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

[과제 1](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw1.html)은 행동 복제와 DAgger, [과제 2](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw2.html)는 정책경사부터 PPO까지, [과제 3](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw3.html)은 DQN과 Double DQN의 구현과 평가를 다룹니다. 해당 개념을 설명하는 슬라이드 아래에서도 과제 가이드로 이동할 수 있습니다.

## 중간고사 연습

[문제 풀기](https://gohyunsu.github.io/deep-reinforcement-learning/midterm/)에는 58문항으로 구성한 세 세트가 있습니다. 각 세트는 T/F 25문항, 객관식 4문항, 단답형 29문항이며, 범위는 Model-based RL 이전의 10개 강의 장과 HW1–3입니다. 선택형은 답을 선택하면 바로 채점하고, 단답형은 버튼으로 예시 답안을 공개합니다. 모든 문항에서 짧은 해설과 연결되는 슬라이드·과제로 이동할 수 있습니다. 진도는 브라우저에 저장되고 세트별로 초기화할 수 있습니다. [주요 모델 비교](https://gohyunsu.github.io/deep-reinforcement-learning/midterm/models.html)는 학습 자료, 핵심 업데이트, 강점과 한계를 네 계열로 묶어 정리합니다.

## 프로젝트 구조

- content/: 슬라이드별 본문, 장 목록, 과제 가이드, 중간고사 문항과 모델 비교 자료
- docs/: 정적 사이트와 개별 슬라이드 이미지
- guide/main.tex: 사이트 본문과 같은 내용으로 생성한 LaTeX 문서
- tools/build.mjs: 사이트 생성
- tools/build_tex.py: LaTeX 문서 생성
- tools/check.mjs: 이미지·페이지·내부 링크와 시험 문항 수·범위 검증

GitHub Actions는 사이트를 생성하고 PDF와 함께 GitHub Pages에 게시합니다. 로컬에서 사이트를 생성할 때는 Node.js 24 이상에서 npm install과 npm run build를 실행합니다. PDF는 Python 3으로 tools/build_tex.py를 실행한 뒤 XeLaTeX로 guide/main.tex를 두 차례 컴파일합니다.
