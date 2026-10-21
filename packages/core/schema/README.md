# 데이터 형식 — screens.json · flow.json · icons.json

**정본은 `schema.json`**(이 폴더) — 칸 이름 · 필수 · 값 범위 · 어느 걸음에 쓰는지(`x-stage`)는 거기에만 있다. 검사는 `node scripts/schema.js runs/<p> --step intent|list|full`. 쓰는 방법과 예시는 `docs/harness-design.md` §6. (실행 중에는 다른 `runs/` 폴더를 참고하지 않는다 — 형식은 스키마와 계약 문서로 충분하다.)

## screens.json

짧은 예시('동네 독서 모임' — 유저스토리 · 역할 · 상태 · 사실 · 화면 하나(답 · 나머지 · 뺀 것) · 프리셋 · 보드)는 `docs/harness-design.md` §6.1 하나에만 둔다. 여기에 다시 적지 않는다(두 벌이면 어긋난다).

- `id`는 적지 않아도 된다 → `node scripts/ids.js runs/<p>`가 채운다. 화면은 1부터(screens.json 순서). 한 번 발급된 번호는 바뀌지 않는다.
- `roles[].user`(선택): `{ "name": "김지영", "initials": "김지" }` — 셸 오른쪽 위·사이드바 아래 사용자 표시. `brand`·`brandIcon`(선택): 상단바 서비스 이름·아이콘(없으면 `title`·layout-dashboard). 셸은 `scripts/expand.js`가 붙인다. 화면마다 `navActive: "<nav slug>"`(메뉴에 없는 화면에서 켤 항목)로 바꿀 수 있다.
- 블록(`answer` · `rest`)의 `key`와 주 버튼 `action`이 조각의 `data-region`이 된다. 영역 목록 · 목적 · 강조는 `scripts/screens.js`가 derive.js로 계산한다 — 손으로 쓰지 않는다.
- `board.toggles.toast`(안내 문구 모양)는 없으면 build.js `TOAST_DEFAULT`(위쪽 · 아이콘 있음 · 흰 바탕 · 보통 글자).
- `board.locked`: 2라운드부터 `["theme","toggles","ask"]`. `board.focus`: 지난 라운드에 고친 화면 slug — 보드 맨 위에 먼저 나온다.

## flow.json

```json
{
  "flows": [
    {
      "key": "create",
      "name": "새 항목 만들기",
      "role": "owner",
      "steps": [
        { "from": "home", "region": "new", "trigger": "create", "action": "'새로 만들기'를 누르면", "to": "editor" },
        { "from": "editor", "region": "save", "trigger": "save", "action": "'저장'을 누르면", "to": "home" }
      ]
    }
  ],
  "branches": [
    { "from": "home", "region": "list", "trigger": "invite", "action": "'초대하기'를 누르면", "to": "invite-dialog" }
  ]
}
```

- `when`(선택, step·branch): 조건 이름표("처음 가입이면"). 구역 보드는 `when`이 있는 연결에만 화살표를 그린다 — 조건이 갈리는 곳에만.
- `branches`(갈래): 흐름 밖의 버튼이 여는 화면·창. 형식은 step과 같다. 글자가 있는 `.btn`은 `data-trigger`(흐름·갈래) · `data-back` · `data-stay="안내 문구"` 중 하나를 반드시 가진다.

조각에서는 누르는 요소에 `data-trigger`: `<button class="btn btn-primary" data-trigger="create">새로 만들기</button>` (그 step의 region 안).

## icons.json (선택)

```json
{
  "_about": "프로젝트 전용 의미 → lucide 이름. core allowlist에 없는 것만.",
  "itinerary": "route"
}
```
