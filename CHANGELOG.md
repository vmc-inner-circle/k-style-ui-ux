# Changelog

버전은 `plugins/k-style-ui-ux/`의 manifest 3개(`.claude-plugin/plugin.json`·`.codex-plugin/plugin.json`·`plugin.json`)와 이 파일 맨 위 항목이 같아야 한다(`ci/verify.py`가 검사).

## v0.17.0

- 이름: hyper-design → k-style-ui-ux(플러그인 폴더·마켓·명령어). 지난 결과 기록(`loop/results`, `loop/RESULTS.md`, `demos/`)은 당시 이름 그대로.
- Codex 지원: `plugins/k-style-ui-ux/` 폴더 하나에 Claude·Codex manifest를 함께 두고 두 마켓 파일(`.claude-plugin/marketplace.json`·`.agents/plugins/marketplace.json`)이 같은 폴더를 가리킨다. 스킬마다 Codex용 `agents/openai.yaml`.
- 스킬 문구에서 Claude 전용 표현(모델 이름·Base directory·`/k-style-ui-ux:max`)을 걷어 내고 플랫폼 차이는 go 스킬 맨 위 한 곳에 모았다.
- `save_prd.py`가 Codex 세션 기록(`~/.codex/sessions`)에서도 PRD를 꺼낸다.
- v19 부품: 상단 가로 탭·정렬/필터 바·아이콘 격자·가로 스크롤 줄·상품 카드 격자·가격·찜·FAB·넘기는 배너·띠 배너·쿠폰·남은 시간, 고르기 시트.

## v0.16.0

- 사람 카드: PRD의 사용자 구분을 그대로 가져와 처음 오는 이유·마음·성공한 순간·첫 화면을 정한다.
