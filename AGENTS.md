# k-style-ui-ux — 에이전트 작업 규칙

- 절대로 main에 push하지 않는다. branch를 만들고, GitHub에서 PR을 병합해야한다.
- PR 본문에는 웬만하면 이미지를 붙인다(화면 전후 비교·캔버스·측정 결과 캡처). 이미지는 `docs/pr/<주제>/`에 커밋하고 본문에서 `https://github.com/vmc-inner-circle/k-style-ui-ux/blob/<커밋 SHA>/docs/pr/<주제>/<파일>?raw=true`로 건다 — 브랜치 이름 대신 SHA로 걸어 브랜치를 지워도 안 깨지게.
- 하네스는 `plugins/k-style-ui-ux/` 폴더 하나를 Claude Code와 Codex가 함께 설치한다(사본·빌드 없음). 버전은 그 안의 manifest 3개와 `CHANGELOG.md` 맨 위가 같아야 한다(CI `ci/verify.py`).
- 스킬 문구는 특정 에이전트에 묶지 않는다. Claude Code·Codex 차이(동시 실행·모델 등급·스킬 부르는 법)는 `plugins/k-style-ui-ux/skills/go/SKILL.md`의 "에이전트마다 다른 것"에만 적는다.
- 구조·설치: `plugins/k-style-ui-ux/README.md`
