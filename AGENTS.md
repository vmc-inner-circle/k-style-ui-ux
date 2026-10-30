# hyper-design — 에이전트 작업 규칙

- 절대로 main에 push하지 않는다. branch를 만들고, GitHub에서 PR을 병합해야한다.
- 하네스는 `plugins/hyper-design/` 폴더 하나를 Claude Code와 Codex가 함께 설치한다(사본·빌드 없음). 버전은 그 안의 manifest 3개와 `CHANGELOG.md` 맨 위가 같아야 한다(CI `ci/verify.py`).
- 스킬 문구는 특정 에이전트에 묶지 않는다. Claude Code·Codex 차이(동시 실행·모델 등급·스킬 부르는 법)는 `plugins/hyper-design/skills/go/SKILL.md`의 "에이전트마다 다른 것"에만 적는다.
- 구조·설치: `plugins/hyper-design/README.md`
