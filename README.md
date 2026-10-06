# Deep Reinforcement Learning · 슬라이드별 학습 가이드

**[학습 사이트](https://gohyunsu.github.io/deep-reinforcement-learning-guide/)** · **[PDF 학습 가이드](https://gohyunsu.github.io/deep-reinforcement-learning-guide/study-guide.pdf)**

순차적 의사결정의 수학적 기초에서 imitation learning, policy gradient, actor–critic, PPO, Q-learning, continuous control, benchmark, offline RL까지 이어지는 한국어 학습 자료입니다. 10개 강의 묶음, 339개 슬라이드의 이미지와 설명을 나란히 읽을 수 있습니다.

## 학습 경로

| 장 | 주제 | 슬라이드 |
| --- | --- | ---: |
| 01-1 | Deep RL의 문제와 응용 | 32 |
| 01-2 | Imitation learning과 로봇 정책 | 50 |
| 02-1 | MDP와 순차적 의사결정 | 41 |
| 02-2 | Policy gradient와 REINFORCE | 20 |
| 03-1 | 가치함수, advantage, actor–critic | 35 |
| 03-2 | GAE와 PPO | 27 |
| 04-1 | Q-learning, DQN, Rainbow | 42 |
| 05-1 | DDPG, TD3, SAC | 37 |
| 05-2 | 실험 설계와 RL 벤치마크 | 13 |
| 06 | Offline RL: TD3+BC, CQL, AWR, IQL | 42 |

각 슬라이드는 강의 이미지와 설명을 한 화면에 배치합니다. 확률·기대값·Bellman 방정식·정책경사·importance sampling·GAE·Q-learning 목표·보수적 가치 추정은 필요한 전제부터 차근차근 전개합니다. 추가 직관과 가정은 펼쳐 읽을 수 있습니다.

## 프로젝트 구조

- `content/` — 장별 학습 원고 및 슬라이드 목차
- `guide/main.tex` — 전체 LaTeX 문서 원본
- `docs/` — GitHub Pages 정적 사이트와 슬라이드 렌더링
- `tools/` — 사이트·문서 생성, 검사, PDF 렌더링 도구
- `WORKLOG.md` — 구성 및 검증 기록

강의 자료 PDF와 녹취 파일은 빌드 입력으로만 사용하며 저장소에 포함하지 않습니다. 사이트는 개별 페이지 이미지(WebP)만 제공합니다.

## 로컬 실행

Node.js 20 이상과 XeLaTeX를 사용합니다.

```powershell
npm install
npm run build
npm run check
python -m http.server 8765 --directory docs
```
