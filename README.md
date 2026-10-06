# Deep Reinforcement Learning

[학습 사이트](https://gohyunsu.github.io/deep-reinforcement-learning/)

강화학습의 순차 의사결정부터 모방학습, 정책경사, 가치 기반 방법, 오프라인 강화학습까지 연결하는 한국어 학습 가이드입니다. 10개 장의 339개 슬라이드에 각각 대응하는 이미지와 해설을 함께 배치했습니다. 수식의 전제와 유도, 직관, 구현에서 자주 혼동하는 부분, 실제 연구 사례를 본문에서 설명하며 필요한 곳에 추가 질문을 접어 두었습니다.

## 구성

| 장 | 주제 |
| --- | --- |
| 01-1 · 01-2 | 강화학습의 응용과 모방학습 |
| 02-1 · 02-2 | MDP와 정책경사 |
| 03-1 · 03-2 | Actor–Critic, GAE, PPO |
| 04-1 | Q-learning, DQN, Rainbow |
| 05-1 · 05-2 | DDPG, TD3, SAC와 벤치마크 |
| 06 | 오프라인 강화학습 |

[과제 1](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw1.html)은 행동 복제와 DAgger, [과제 2](https://gohyunsu.github.io/deep-reinforcement-learning/assignments/hw2.html)는 정책경사부터 PPO까지의 구현과 평가를 다룹니다. 해당 개념을 설명하는 슬라이드 아래에서도 과제 가이드로 이동할 수 있습니다.

## 프로젝트 구조

- content/: 슬라이드별 본문, 장 목록, 과제 가이드
- docs/: 정적 사이트와 개별 슬라이드 이미지
- guide/main.tex: 사이트 본문과 같은 내용으로 생성한 LaTeX 문서
- tools/build.mjs: 사이트 생성
- tools/build_tex.py: LaTeX 문서 생성
- tools/check.mjs: 이미지·페이지·내부 링크 검증

사이트와 PDF는 GitHub Actions에서 함께 생성하여 GitHub Pages에 게시합니다. 로컬에서 사이트만 생성할 때는 Node.js 24 이상에서 npm install과 npm run build를 실행합니다. PDF는 Python 3으로 tools/build_tex.py를 실행한 뒤 XeLaTeX로 guide/main.tex를 두 차례 컴파일합니다.
