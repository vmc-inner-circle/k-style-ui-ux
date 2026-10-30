# hyper-design — 에이전트 작업 규칙

- 절대로 main에 push하지 않는다. branch를 만들고, GitHub에서 PR을 병합해야한다.
- 하네스 원본은 `src/`(스킬·core)와 `platform/`(에이전트별 manifest)이다. `claude/`·`codex/plugin/`은 `bash build/build.sh`가 만드는 생성물이라 손으로 고치지 않는다 — 원본을 고치고 빌드한 결과를 같이 커밋한다(CI `ci/verify.py`가 어긋남을 잡는다).
- 스킬 문구는 특정 에이전트에 묶지 않는다. Claude Code·Codex 차이(동시 실행·모델 등급·스킬 부르는 법)는 `src/skills/go/SKILL.md`의 "에이전트마다 다른 것"에만 적는다.
- 구조·설치: `docs/plugin.md`
