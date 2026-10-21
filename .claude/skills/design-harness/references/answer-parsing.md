# 보드 답변 해석과 반영

사용자가 붙여넣는 글은 보드의 **"의견 보내기" → [복사하기]** 가 만든 텍스트다(형식은 계약 §3.4에 고정). 그래도 **사람이 손으로 고쳤을 수 있다.** 줄 단위로 관대하게 읽는다. 모르는 줄은 버리지 말고 `메모`로 취급한다.

고른 것(시안 · 꾸밈 · 색 · 글자 크기 · 잠금)은 모두 `screens.json`의 **`board` 아래**에 쓴다(메인 스키마 `$defs.board`). 최상위에 `stage` · `theme` 같은 칸을 쓰면 `node scripts/schema.js`가 FAIL — 조립 · 빌드는 `scripts/screens.js`가 board에서 꺼내 읽는다.

## 1. 줄 문법

| 줄 | 뜻 | 반영 |
|---|---|---|
| `시안 f(숫자 칸과 소식을 섞어 보기)` | 1턴 시안 보드의 첫 줄: 고른 시안(과감함 단계 하나) | SKILL 2턴대로 그 시안으로 전체 화면을 만든다(`board.concept`, `board.stage` 삭제, `board.dress` = 그 시안의 dress, `board.locked = ["concept", "dress"]`). 뒤에 `테마 …` · `꾸밈 …` 줄이 오면 시안 보드 상단 테마 · 컬러 · 폰트에서 고른 것 — 아래 줄 규칙대로 같은 board에 옮겨 1차안의 처음 값으로(예: §1-2) |
| `꾸밈 bg=band cards=float head=huge radius=sharp space=airy font=suit icons=fluent tone=bold` · `꾸밈 font=suit(수트)` | 꾸밈 칸을 바꾼 것 — 시안 보드의 꾸밈 다듬기(칸 전부) 또는 시안 보드 · 초안 · 최종본 '폰트' 창에서 고른 **글꼴**(칸 하나, 괄호 안은 사람용 이름) | **적힌 칸만** `board.dress`에 덮어쓴다(칸 전부가 적혀 오면 시안의 dress 대신 이 값들 · 시안 줄과 함께 온 `꾸밈 font=…`면 그 시안의 dress를 옮긴 뒤 글꼴만). `font=base`면 `board.dress.font`를 지운다(= 분위기 · 스타일 글꼴). `scripts/dress.js` 값 이름 그대로 |
| `테마 custom(#C8553D 테라코타 · 바탕 warm) · 글자 크게` | '컬러' 창에서 직접 고른 색 + 바탕(창에 보이는 바탕 12가지 id: white·gray·warm·sand·sky·mint·pink·lilac·tint·dark·navy·ink, 또는 `#RRGGBB` = 어울리는 배색의 바탕 · 그 밖의 바탕 모두 그대로 읽는다) | `board.custom = { "hex": "#C8553D", "name": "테라코타", "base": "warm" }`(바탕이 #RRGGBB면 `"bgHex": "#…"`, `스타일 toss`가 있으면 `"from": "toss"` — 그 스타일의 바탕·모양·글꼴 위에 버튼 색만 바꾼 것. 예: `테마 custom(#C8553D 테라코타 · 스타일 toss · 바탕 mint)`), `board.theme = "custom"`, `board.toggles.swatch = "custom"`, board.toggles.type. 표면·테두리·눌림색은 looks.js `customLook`이 계산. `스타일` 뒤의 id가 레퍼런스 프리셋이면 build가 꾸밈의 판 모양 · 모서리를 프리셋 값으로 덮는다(`scripts/screens.js` 한 곳) — `board.dress`는 고치지 않는다. |
| `시안 c 메모: 달력은 이 안처럼` | 시안마다 적은 말 | 고른 시안의 메모 = 고칠 점. **다른 시안의 메모 = 그 안에서 가져올 요소** — 어느 화면의 무엇인지 해석해 screen-writer의 "시안 메모"에 명령형으로 넣는다(예: "홈의 할 일 목록 자리에 시안 C의 모임 카드 모음(grid-3)"). 해석은 답변 로그에 |
| `테마 toss(토스 느낌) · 글자 크게 · 버튼색 blue(파랑)` | '테마' · '컬러' · '폰트' 창에서 고른 테마 · 버튼 색 · 글자 크기 — 시안 보드 · 초안 모두 (괄호 안은 사람용 이름, id만 쓴다. 줄 모양은 버튼 이름이 바뀌기 전 그대로) | `board.theme` = 테마 id, `board.toggles.type` = 보통→normal·크게→large, `board.toggles.swatch` = 버튼색 id. 뒤에 `(확정)`이면 이미 잠긴 것. 그 테마 id가 레퍼런스 프리셋이면 build가 꾸밈의 판 모양 · 모서리를 프리셋 값으로 덮는다(`scripts/screens.js` 한 곳) — `board.dress`는 고치지 않는다. 줄 끝의 `· 판 모양 · 모서리: 프리셋 따라감`(custom 줄에도 붙는다)은 보드가 알려 주는 말이라 따로 반영할 것이 없다 |
| (예전 형식) `테마 B · 글자 크게 · 강조 차분` | 분위기·글자 크기·버튼 색 선택(화면에는 '버튼 색 차분하게/눈에 띄게'로 보이지만 글은 '강조 차분/선명'). `(확정)`이 붙으면 이미 잠긴 것 | `board.theme` · `board.toggles`. B→"b", 크게→large, 보통→normal, 선명→vivid, 차분→calm |
| `안내 문구: 위치 화면 아래 · 아이콘 없음 · 색 어두운 바탕 · 글자 크게` | 화면 디자인 '안내 문구 모음'에서 고른 안내 문구 모양(추천과 다를 때만 온다) | `board.toggles.toast` = `{ at: 화면 위→top·화면 아래→bottom, icon: 있음→on·없음→off, tone: 흰 바탕→light·어두운 바탕→dark·상태 색 바탕→color, size: 보통→normal·크게→large }`. 조각은 고치지 않는다(부품 CSS가 `<html data-toast-*>`로 모든 화면에 적용). 확정하면 `board.locked`에 `toast` |
| `화면 <S> · 안내 문구 '<문구>' 바꿔: <메모> [toast:<문구 전체>]` | 화면에 잠깐 뜨는 안내 문구 하나를 고쳐 달라 | 그 화면에서 문구 전체가 같은 곳을 찾아 고친다 — 버튼의 `data-stay="…"`(조각)이면 조각을, `screens.json` 그 화면의 `cases[].show`면 데이터를. '창(팝업)으로'·'입력칸 아래 글자로'는 문구를 그 화면의 확인 창·`.field-error`로 옮기는 재작성. `빼기`면 그 `data-stay`/`cases` 항목을 지운다 |
| `확인: <id>=<옵션 텍스트>` | ask 질문에서 추천과 다른 선택 | 옵션 텍스트를 `board.ask[id].options`와 대조해 인덱스 확정 → 구조 반영 |
| `화면 <S> · <이름표> 바꿔: <메모> [<경로>]` | **화면 디자인에서 사용자가 직접 고른 요소**에 대한 변경 (지금 보드의 기본 의견 형식) | 화면 S의 조각 파일에서 `[경로]`로 요소를 찾는다(§4). 이름표의 따옴표 안 글자로 맞는지 확인. 그 화면을 재작성 대상에 넣고 CHANGES에 경로·이름표를 그대로 넘긴다 |
| `화면 <S> · 아이콘 '<A>' 바꿔: 아이콘 <A> → <B> [<경로>]` | 사용자가 Lucide 목록에서 아이콘을 직접 골랐다 | 경로의 `<svg><use href="#i-A">`를 `#i-B`로 바꾼다. 해석 없이 그대로 — B는 허용 목록 안에서만 고를 수 있게 되어 있다. 같은 의미의 아이콘이 다른 화면에도 있으면 `icons.json` 의미 1:1 규칙에 따라 함께 바꿀지 가정 로그에 남긴다 |
| `화면 <S> · <이름표> 빼기 [<경로>]` | 그 요소 삭제 | 경로의 요소를 조각에서 제거. 그 요소가 흐름의 trigger면 흐름을 다시 잇거나 다른 버튼에 trigger를 옮긴다 |
| `<N> 바꿔: <메모>` / `<N> 바꿔` | 영역 N을 바꿔 달라 | N으로 화면과 블록을 특정(아래 번호 읽는 법) → 재작성 대상. 메모 없으면 "다른 구성으로 다시" |
| `<N> 빼기` | 영역 N 삭제 | 그 블록을 `rest`에서 빼고(answer면 남은 것 중 답을 다시 정한다) + 조각의 `data-region` 블록 제거 + 그 영역을 누르는 flow step 정리 |
| `화면 <N> 빼기` | 화면 N 삭제 | 화면 제거 + flow에서 앞뒤 step 연결 |
| `화면 <N> 메모: …` | 화면 전체에 대한 말 | 그 화면 재작성 대상 + 메모 전달 |
| `추가: …` | 새 화면/기능 | 화면이면 새 항목 생성 — 걸음 L 칸(slug · name · role · story · pattern, prd-to-screens §3) + 걸음 S 칸(goal · problem · answer 하나 · rest 1~5 · later, §4) + flow 연결. 기능이면 가장 가까운 화면의 `rest`에 블록 하나 추가 |
| `메모: …` | 전역 | 전역 규칙이면 모든 재작성 대상에 힌트. 화면 지정이 없고 규칙도 아니면 가정 로그 |
| `(나머지는 추천대로)` | 종료 표시 | 무시 |
| 그 외 | 사람이 쓴 자유문 | 번호가 들어 있으면 그 번호의 `바꿔`로, 없으면 `메모`로 |

번호 N은 화면일 수도 영역일 수도 있다. 화면은 100 이하, 영역은 101 이상(예전 실행물은 섞여 있을 수 있다). 화면은 `screens.json`의 id로 찾는다. 영역 번호는 적혀 있지 않고 하네스가 계산한다(scripts/derive.js: 100 + 화면 번호 × 10 + 읽는 순서 — answer 0, rest 1부터, 주 버튼 action 맨 끝) — 그 화면의 그 블록이다. 없는 번호면 가장 가까운 번호를 쓰지 말고 가정 로그에 "번호 N 없음, 무시"로 남긴다.

## 1-1. 위치 경로 읽는 법

`[@start-club > div > button]` = 조각에서 `data-region="start-club"` 요소 → 그 안의 첫 `div` 자식 → 그 안의 `button` 자식. `태그:n`은 같은 태그 형제 중 n번째(1부터), 순번이 없으면 하나뿐이다. `@`가 없으면 `.app` 루트부터. 경로가 조각과 안 맞으면(이미 고쳐진 화면 등) 이름표 글자로 찾고 가정 로그에 남긴다.

## 1-2. 예: 시안 보드에서 고른 테마 · 컬러 · 폰트 → 1차안

시안 보드에서 테마 '당근 느낌' → 컬러 '남색' → 폰트 '수트' · 글자 '크게'를 고르고 시안 a를 고른 글:

```
시안 a(날짜별로 쭉 내려 보기)
테마 custom(#23317A 남색 · 스타일 daangn) · 글자 크게 · 판 모양 · 모서리: 프리셋 따라감
꾸밈 font=suit(수트)
(나머지는 추천대로)
```

→ `screens.json` board에 쓰는 칸(`board.stage`는 지운다 · `dress`는 시안 a의 dress를 옮긴 뒤 적힌 칸만 덮는다 · 판 모양 · 모서리는 build가 daangn 프리셋으로 덮으므로 쓰지 않는다):

```json
{ "concept": "a", "round": 1, "locked": ["concept", "dress"], "dress": { "font": "suit" },
  "theme": "custom", "custom": { "hex": "#23317A", "name": "남색", "from": "daangn" }, "toggles": { "type": "large", "swatch": "custom" } }
```

1차안 보드는 `<html data-theme="custom" data-font="suit" data-type="large">`로 칠해지고, 상단 테마 · 컬러 · 폰트도 이 값에서 시작한다 — 시안 보드에서 본 그대로. `board.recommend`(1턴 추천)는 지우지 않는다 — board에 고른 값(theme · toggles)이 있으면 보드가 추천 대신 그 값으로 연다(`packages/core/canvas/20-board.js`). (`test/checks/47-concept-to-draft.js`가 이 두 덩어리를 그대로 읽어 시험한다 — 고치면 시험도 같이 본다.)

## 2. 메모 해석 — 의견 사전에서 찾는다

턴이 없으므로 되묻지 않는다. 메모 · 자유문 · `바꿔:` 뒤의 말은 **의견 사전** `packages/core/feedback/glossary.json`(줄 F01~F30 — 듣는 말 · 원인 · 먼저 잴 것 · 고치기 · 규칙)에서 찾는다. 사전 전체를 읽지 않는다 — 한 줄씩 넣으면 맞는 줄만 나온다.

```
node scripts/feedback.js "<의견 원문>"     → lines[]: 위의 줄일수록 잘 맞음(id · why · fix · rule), krds[]: 디자인 용어의 KRDS 이름
```

순서는 사전의 `order` 6단계를 그대로 따르고, 단계마다 결과를 **`board.feedback`에 의견 한 줄 = 한 기록**으로 남긴다(메인 스키마 `$defs.feedback`, `node scripts/schema.js runs/<p>`가 검사).

| 단계 | 채우는 칸 |
|---|---|
| ① 가르기 | `keep` — 좋다는 의견이면 `true`(그 곳은 고치지 않고 §4 KEEP에), 아래 ④ · ⑤는 건너뛴다 |
| ② 범위 | `scope`(사전 `scope` 4줄: `element` 요소 · `region` 영역 · `screen` 화면 · `all` 판 전체) · `screen` · `region` · `path`(의견 줄의 `[경로]` 그대로) |
| ③ 바꿔 읽기 | `entry` = `feedback.js`가 낸 첫 줄 id. 나온 줄이 맞지 않거나 `lines`가 비면 `null` — 그때는 가장 가까운 줄의 **먼저 잴 것**으로 ④를 한다 |
| ④ 원인 재기 | `measured` — 잰 것과 값(예: `시간 15px · 화면 제목 22px`), `rule` — 같은 기준의 lint 규칙 id(없으면 `null`) |
| ⑤ 고치기 | `fix` — 고친 것 한 줄. screen-writer에는 §4 틀로 명령형으로 |
| ⑥ 남기기 | 이 기록 하나. 화면이 바뀌었으면 `board.changes`(보드의 '의견 반영' 표시)에도 그 화면 한 줄. `brief.md` 답변 로그 `원문 \| 해석 \| 반영`의 해석 칸에는 줄 id |

```json
{ "said": "맨 위 다음에 할 일에서 모이는 시간과 장소를 훨씬 크게", "scope": "region", "screen": "family-home", "region": "next-up",
  "entry": "F03", "measured": "모이는 시간 15px · 화면 제목 22px", "fix": "모이는 시간을 가장 큰 글자로, 장소를 그 아래", "rule": "body-size-min", "keep": false }
```

## 3. 반영 순서

1. 삭제(화면 → 영역) 먼저. flow 정리.
2. 추가 화면 생성 → `ids.js`.
3. 변경 메모를 화면별로 모아 screen-writer에 **원문 그대로 + 메인의 해석 한 줄**을 함께 전달. 에이전트가 원문을 다시 해석하지 않게 해석을 명령형으로 쓴다 ("영역 day-list의 행을 3개로 줄이고 각 행 제목을 text-lg로").
4. 건드리지 않은 화면의 조각 파일은 열지도 않는다.
5. lint → build → 확인 → 사용자.

## 4. screen-writer 재호출 프롬프트 틀 (model: haiku)

haiku는 해석하지 않는다. "할 것"에 **대상 영역 key · 쓸 스니펫 이름 · 바꿀 문구/개수**를 다 적는다.
좋은 예: `할 것: next-up 카드의 제목을 .page-title로 올리고, 시간 줄을 .text-xl .fw-bold로 바꾼다.`
나쁜 예: `할 것: 좀 더 크게.`

```
RUN=runs/<project>
SCREENS=<slug>
MODE=revise
KEEP=<바꾸지 말아야 할 영역 key 목록>
CHANGES=
- [<N> <key>] 원문: "<사용자 원문>" → 할 것: <명령형 해석>
- …
기존 runs/<project>/screens/<slug>.html을 읽고 CHANGES만 반영해 같은 경로에 덮어쓴다. KEEP 영역의 마크업은 그대로 둔다.
```
