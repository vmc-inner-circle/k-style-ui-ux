# Changelog

버전은 `plugins/k-style-ui-ux/`의 manifest 3개(`.claude-plugin/plugin.json`·`.codex-plugin/plugin.json`·`plugin.json`)와 이 파일 맨 위 항목이 같아야 한다(`ci/verify.py`가 검사).

## v0.17.1

- `audit.py`에 한국어 줄바꿈 실측: 글자 하나하나의 실제 위치로 줄을 되살려 어절 쪼개짐(`word_split`)·칸 넘침(`box_overflow`)은 실패로, 마지막 줄 한두 글자(`last_line_orphan`)는 보고만. 셈은 hanmariyang/giting-skills의 hangul-wrap(`wrapcheck.mjs`, MIT)에서 옮겼다. v19 4개 앱에서 audit 시간 +4~7초/앱.
- `.row-date`를 고정 폭(52px) 대신 `min-width`로: `11/16 (월)`·`10월 30일`이 칸을 6~12px 넘겨 옆 제목에 붙던 것(v19 필라테스·사주 9건)이 0건.

## v0.17.0

- 이름: hyper-design → k-style-ui-ux(플러그인 폴더·마켓·명령어). 지난 결과 기록(`loop/results`, `loop/RESULTS.md`, `demos/`)은 당시 이름 그대로.
- Codex 지원: `plugins/k-style-ui-ux/` 폴더 하나에 Claude·Codex manifest를 함께 두고 두 마켓 파일(`.claude-plugin/marketplace.json`·`.agents/plugins/marketplace.json`)이 같은 폴더를 가리킨다. 스킬마다 Codex용 `agents/openai.yaml`.
- 스킬 문구에서 Claude 전용 표현(모델 이름·Base directory·`/k-style-ui-ux:max`)을 걷어 내고 플랫폼 차이는 go 스킬 맨 위 한 곳에 모았다.
- `save_prd.py`가 Codex 세션 기록(`~/.codex/sessions`)에서도 PRD를 꺼낸다.
- v19 부품: 상단 가로 탭·정렬/필터 바·아이콘 격자·가로 스크롤 줄·상품 카드 격자·가격·찜·FAB·넘기는 배너·띠 배너·쿠폰·남은 시간, 고르기 시트.

## v0.16.0

- 사람 카드: PRD의 사용자 구분을 그대로 가져와 처음 오는 이유·마음·성공한 순간·첫 화면을 정한다.
