# canvas — 계약

```
python3 $SK/features/canvas/build_canvas.py <out>
python3 $SK/features/canvas/canvas_test.py <out> [--shot PNG]   # 상호작용 점검(Playwright, 선택)
```

## 입력 (out 안)
- `screens.json` — 필수. `groups`·`screens[{id,file,title,group,purpose,policies,branches}]`
- 선택: `decisions.json` · `palettes.json` · `credits.json` · `tokens.css`
- 플러그인 쪽: `foundation/palette.js`, `foundation/specimens.html`(환경변수 `HD_SPECIMENS`로 바꿈)

## 출력
- `out/index.html` — `canvas_template.html`에 데이터(`hd-data`)·`modules/*.js`·`modules/motion.css`를 끼워 넣은 한 파일. 화면 카드는 보일 때 한 번만 불러온다
- `out/foundation.html` · `out/components.html` · `out/palette.js`

## 구조
- `modules/` — 연결 보기. Model(`graph`·`route`·`labels`·`camera`·`style`) / ViewModel(`focus`·`prefs`) / View(`view-links`·`view-motion`·`motion.css`)
- 판 노트 · 사용자 선(Obsidian Canvas 식) — Model `board-notes` / View `view-board-notes`. 기존 선(회색 점선 `svg.ar` · 색 선 `svg.lks`)·태그·메모·'보내기'와 따로 산다

## 판 노트 · 사용자 선
- 저장 = 브라우저 `localStorage` `hd-board:<주소 해시>:<프로젝트 도장>` 하나에 `{notes: {<id>: {x, y, w, text, at}}, edges: {<id>: {from, fromSide, to, toSide, label?, at}}}`(판 좌표 px). 도장 = 제목 + 화면 id 목록 해시 — 같은 `out/`에 새 프로젝트를 만들면 옛 노트가 뜨지 않는다. 기존 메모 키(`hd-notes:`)와 섞지 않는다
- 만들기: 빈 판(`#rows`·`.flow`·`.cards`·`#intro`·`#foot` 자체) 두 번 누르기 → 그 자리 글 상자(오른쪽 카드 앞까지 폭)가 바로 쓰기. Esc·Ctrl+Enter·밖 누르기 = 끝, 빈 채로 끝 = 버림. 배율 0.6 아래에서 쓰기 시작하면 0.6 으로
- 노트: 누르기 = 고르기 · 끌기 = 옮기기 · 두 번 누르기·Enter = 고치기 · Delete·Backspace = 지우기(닿은 선도 함께)
- 선: 노트 변의 점(올리거나 고르면 보임)을 끌어 다른 노트나 화면 카드에 놓기. **노트에서만 출발**(카드 클릭·Shift+클릭을 지킨다) · 자기 자신·같은 방향 같은 쌍은 만들지 않음. 누르기 = 고르기 · Delete = 지우기 · 두 번 누르기 = 이름(평문 40자, 비우면 뺌)
- 모양: 옅은 회색 실선 곡선 + 작은 화살촉, 태그 없음. 보이는 선 `svg#bnl` 은 **카드 아래**, 누르는 자리·이름 `svg#bnh` 는 카드 위지만 카드 상자를 뚫은 clip — 카드 위에서는 카드가 클릭을 받는다. 연결 보기(Shift+클릭) 동안은 옅게(0.2)
- 없는 화면으로 가는 선은 그리지 않지만 저장값에서 지우지 않는다(같은 id 화면이 다시 생기면 되돌아온다). 카드 크기가 바뀌면(긴 화면 펼치기) 선 끝을 다시 잰다
- AI 로 넘기기: 위쪽 '판 노트 복사' 단추(노트가 있을 때만) → `[hyper-design 판 노트] out=…` 평문(노트마다 가장 가까운 화면 · 선마다 `가 → 나`). '보내기' 요청문과 단추는 그대로
- 아직 아님: 노트 크기 바꾸기, 터치 기기에서 잇기, 되돌리기, 전체 보기(0) 범위에 노트 넣기
- 테스트: `tests/test_canvas_unit_board_notes.py`(Model, node) · `tests/test_canvas_board_notes.py`(브라우저)
- Model·ViewModel 파일은 DOM·저장소·메시지를 쓰지 않는다(`tests/test_canvas_modules.py`의 순수성 검사)
- 화면 ↔ 캔버스 메시지(`hd-pick`·`hd-links`·`hd-link-go` 등)와 "보내기" 요청문 형식은 `/hyper-design:fix`가 읽으므로 바꾸지 않는다
