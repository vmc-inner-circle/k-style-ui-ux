// E2 — 보드에서 직접 고친 줄을 AI 없이 바로 반영 (사람 결정 2026-10-21: 순서 · 빼기 · 글자 · 크기 · 아이콘).
// 새 형식 예시(test/fixtures/project/family-trip) 사본에 조각 · 흐름을 붙여 펼친(expand.js) 실행물을 만들고,
// 보내기 글 = 6종 줄 + 모르는 줄 1 + 맞지 않는 경로 1 + 끝 표시 → scripts/edits.js
// ① 반영 6 · 남김 2, 남긴 글 = 그 두 줄 + 끝 표시 ② 조각 · screens.json이 함께 바뀜(rest · items · label · board.changes)
// ③ schema · lint 통과, 조각 diff가 고친 줄만 ④ build --mode board 성공 ⑤ 고친 뒤 lint가 FAIL이면 아무것도 쓰지 않음
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite } = require("../lib.js");

const t = suite("49 고친 줄 바로 반영");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 조각 — 블록마다 구역 하나(제목 + 줄마다 한 줄), 주 버튼은 action 구역. 흐름이 누르는 버튼은 data-trigger, 나머지는 data-stay
function fragment(s, trig) {
  const head = (b, icon) => `<h2 class="section-title"><svg class="icon" aria-hidden="true"><use href="#i-${icon}"/></svg>${esc(b.label)}</h2>`;
  const out = [`<main class="content">`, `  <div class="page-header"><div><h1 class="page-title">${esc(s.name)}</h1></div></div>`];
  out.push(`  <section class="section" data-region="${s.answer.key}">${head(s.answer, "clock")}`, ...s.answer.items.map((it) => `    <p>${esc(it)}</p>`), `  </section>`);
  for (const b of s.rest) {
    out.push(`  <section class="section" data-region="${b.key}">${head(b, "bell")}`, `    <ul class="list">`);
    b.items.forEach((it) => out.push(`      <li class="list-item"><div class="list-main"><span class="list-title">${esc(it)}</span></div></li>`));
    out.push(`    </ul>`, ...(trig[b.key] ? [`    <button class="btn btn-secondary" data-trigger="${trig[b.key]}">더 보기</button>`] : []), `  </section>`);
  }
  if (s.action) out.push(`  <div data-region="action"><button class="btn btn-primary" data-stay="알렸어요">${esc(s.action.label)}</button></div>`);
  return out.concat(`</main>`, "").join("\n");
}

/** 시험 실행물 하나: 사본 + lint가 보는 칸(구역 · 단계 · 규칙 · 완료 화면) + ids + 흐름 + 조각 + expand. 돌려주는 것 { w, file, S, home } */
function makeRun() {
  const w = workCopy("project/family-trip");
  const file = path.join(w.run, "screens.json");
  const S0 = JSON.parse(fs.readFileSync(file, "utf8"));
  S0.sections = JSON.parse(fs.readFileSync(path.join(ROOT, "test/fixtures/board/family-trip.json"), "utf8")).sections;
  const make = S0.screens.find((s) => s.slug === "trip-create");
  S0.screens.push(Object.assign(JSON.parse(JSON.stringify(make)), { slug: "trip-done", name: "여행 만들기 완료", state: "success", variantOf: "trip-create" }));
  S0.screens.forEach((s) => Object.assign(s, { section: s.role === "parent" ? "family" : "plan", step: s.name, policy: [{ title: "기본 정의", items: [s.goal] }] }));
  S0.board = { changes: [{ slug: "plan", said: "화면 2 메모: 예전 의견", did: "예전에 고친 것" }] };
  fs.writeFileSync(file, JSON.stringify(S0, null, 2) + "\n");
  run("ids.js", w.run);
  const S = JSON.parse(fs.readFileSync(file, "utf8"));
  // 흐름 하나: 부모님 홈의 소식 구역 버튼 → 일정
  const flow = { flows: [{ key: "parent-news", name: "소식 보기", role: "parent", steps: [{ from: "parent-home", region: "news", trigger: "open-news", action: "'더 보기'를 누르면", to: "plan" }] }], branches: [] };
  fs.writeFileSync(path.join(w.run, "flow.json"), JSON.stringify(flow, null, 2) + "\n");
  fs.mkdirSync(path.join(w.run, "screens"));
  for (const s of S.screens) fs.writeFileSync(path.join(w.run, "screens", s.slug + ".html"), fragment(s, s.slug === "parent-home" ? { news: "open-news" } : {}));
  const ex = run("expand.js", w.run);
  if (ex.code !== 0) t.fail(`expand 실패\n${ex.out}`);
  return { w, file, S, home: S.screens.find((s) => s.slug === "parent-home") };
}
const lintOk = (dir) => { const r = run("lint.js", dir); return r.code === 0 ? null : r.out.split("\n").filter((l) => l.includes("FAIL")).join("\n"); };
const lines = (txt) => txt.split("\n").map((l) => l.replace(/ data-pos="\d+"/, ""));   // 읽는 순서 표시(data-pos)는 순서를 바꾸면 따라 바뀐다
/** 줄 묶음 차이: 앞에만 있는 줄 · 뒤에만 있는 줄 (자리를 옮긴 줄은 차이가 아니다) */
function lineDiff(a, b) {
  const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const ca = count(lines(a)), cb = count(lines(b)), only = (x, y) => [...x].flatMap(([k, n]) => Array(Math.max(0, n - (y.get(k) || 0))).fill(k));
  return { gone: only(ca, cb), added: only(cb, ca) };
}

// ---------- ① ~ ④ 6종 줄 + 남길 줄 2 ----------
{
  const { w, file, S, home } = makeRun();
  try {
    const before = lintOk(w.run);
    before ? t.fail(`시험 실행물이 처음부터 lint FAIL\n${before}`) : t.ok("시험 실행물(family-trip 사본 + 조각 · 흐름, 펼침) lint 통과");
    const id = home.id, ICON = "calendar", days = home.rest.find((b) => b.key === "days").items;
    const SENT = [
      `화면 ${id} · 구역 순서: meet, mine, news, days, stay, action`,
      `화면 ${id} · 구역 '날짜별 흐름' 안 순서: ${[...days].reverse().map((x) => `'${x.slice(0, 12)}'`).join(", ")} [@days > ul]`,
      `화면 ${id} · 목록 한 줄 '하카타역 앞 호텔 · 18일~20일 2박' 빼기 [@stay > ul > li:1]`,
      `화면 ${id} · 제목 '내가 챙길 것' 고쳐 쓰기: '내가 챙길 것' → '내 준비물' [@mine > h2]`,
      `화면 ${id} · 부분 '출발 날 모이는 곳' 크기 +1단계 [@meet]`,
      `화면 ${id} · 아이콘 'bell' 바꿔: 아이콘 bell → ${ICON} [@news > h2 > svg]`,
      `메모: 전체적으로 조금 더 따뜻하게`,
      `화면 ${id} · 목록 한 줄 '없는 줄이에요' 빼기 [@stay > ul > li:9]`,
      `(나머지는 추천대로)`,
    ];
    const sent = path.join(w.dir, "sent.txt");
    fs.writeFileSync(sent, SENT.join("\n") + "\n");
    const frag = path.join(w.run, "screens", "parent-home.html"), was = fs.readFileSync(frag, "utf8");
    const r = run("edits.js", w.run, sent);
    const last = r.out.trim().split("\n").pop();
    r.code === 0 && /반영 6 · 남김 2/.test(last) ? t.ok(`edits.js: ${last}`) : t.fail(`edits.js 종료 ${r.code} — '반영 6 · 남김 2'여야 함\n${r.out}`);
    const why = (line) => { const o = r.out.split("\n"), i = o.findIndex((l) => l.endsWith(line)); return i >= 0 ? o[i].slice(0, 2) + " → " + (o[i + 1] || "").trim().replace(/^→ /, "") : "줄 없음"; };
    SENT.slice(0, 6).forEach((l) => (why(l).startsWith("반영") ? t.ok(`${l.split(" · ").slice(1).join(" · ").slice(0, 40)}… ${why(l)}`) : t.fail(`반영되지 않음: ${l}\n  ${why(l)}`)));
    const leftTxt = fs.readFileSync(path.join(w.run, "_check", "edits-left.txt"), "utf8").trim();
    leftTxt === [SENT[6], SENT[7], SENT[8]].join("\n") ? t.ok("_check/edits-left.txt = 모르는 줄 · 맞지 않는 경로 줄 그대로 + 끝 표시") : t.fail(`edits-left.txt가 다름\n${leftTxt}`);

    // ② 데이터가 조각과 함께
    const P = JSON.parse(fs.readFileSync(file, "utf8")), h = P.screens.find((s) => s.slug === "parent-home"), blk = (k) => h.rest.find((b) => b.key === k);
    h.rest.map((b) => b.key).join() === "mine,news,days,stay" && h.answer.key === "meet" ? t.ok("구역 순서 → rest도 mine · news · days · stay (answer는 그대로)") : t.fail(`rest 순서 ${h.rest.map((b) => b.key).join()}`);
    blk("days").items.join() === [...days].reverse().join() ? t.ok("구역 안 순서 → days items도 새 순서") : t.fail(`days items ${blk("days").items.join(" / ")}`);
    blk("stay").items.length === 2 && !blk("stay").items.some((x) => x.includes("하카타역")) ? t.ok("빼기 → stay items에서도 빠짐 (3 → 2)") : t.fail(`stay items ${blk("stay").items.join(" / ")}`);
    blk("mine").label === "내 준비물" ? t.ok("고쳐 쓰기 → mine label도 '내 준비물'") : t.fail(`mine label ${blk("mine").label}`);
    const ch = (P.board.changes || []).slice(1), lab = (k) => (k === "meet" ? h.answer : blk(k)).label;
    // said = 사람이 보드에서 본 말(보드 '화면에서 바로 고친 것' 목록 말투) — 경로 [...] · '화면 S · ' 머리 없이
    const SAID = [
      `구역 순서: ${["meet", "mine", "news", "days", "stay"].map((k) => (k === "mine" ? "내가 챙길 것" : lab(k))).join(" → ")} → ${h.action.label}`,
      `'날짜별 흐름' 안 순서: ${[...days].reverse().map((x) => `'${x.slice(0, 12).trim()}'`).join(" → ")}`,
      "목록 한 줄 '하카타역 앞 호텔 · 18일~20일 2박' 뺌",
      "글자 '내가 챙길 것' → '내 준비물'",
      "부분 '출발 날 모이는 곳' 1단계 크게",
      "아이콘 bell → calendar",
    ];
    ch.length === 6 && ch.every((c, i) => c.slug === "parent-home" && c.said === SAID[i] && c.did) && P.board.changes[0].did === "예전에 고친 것"
      ? t.ok("board.changes에 {slug · said(사람 말) · did} 6개가 예전 기록 뒤에 쌓임") : t.fail(`board.changes ${JSON.stringify(P.board.changes)}\n기대 ${SAID.join("\n     ")}`);
    ch.every((c) => !c.said.includes("[") && !c.said.startsWith("화면 ")) ? t.ok("said에 경로 [...] · '화면 S · ' 머리가 없음") : t.fail("said에 경로나 화면 머리가 남음");

    // ③ 검사 · 조각 diff
    const sc = run("schema.js", w.run);
    sc.code === 0 ? t.ok("반영 뒤 schema 통과") : t.fail(`반영 뒤 schema FAIL\n${sc.out}`);
    const after = lintOk(w.run);
    after ? t.fail(`반영 뒤 lint FAIL\n${after}`) : t.ok("반영 뒤 lint 통과");
    const now = fs.readFileSync(frag, "utf8"), d = lineDiff(was, now);
    const order = (txt) => [...txt.matchAll(/data-region="([^"]+)"/g)].map((m) => m[1]).join();
    order(now) === "meet,mine,news,days,stay,action" ? t.ok("조각 data-region 순서 = 보낸 순서") : t.fail(`조각 구역 순서 ${order(now)}`);
    const li = (txt) => [...txt.matchAll(/<li[^>]*>.*?list-title">([^<]*)/g)].map((m) => m[1]);
    const daysNow = li(/data-region="days"[\s\S]*?<\/section>/.exec(now)[0]);
    daysNow.join() === [...days].reverse().map(esc).join() ? t.ok("조각 days 줄 순서 = 보낸 순서") : t.fail(`조각 days 줄 ${daysNow.join(" / ")}`);
    // 고친 줄: 지운 li 1 · 고쳐 쓴 제목 1 · 크기(제목 1 + 답 줄 4) · 아이콘 1 → 사라진 줄 8 · 생긴 줄 7, 자리만 옮긴 줄은 차이 없음
    const okAdded = d.added.every((l) => /내 준비물|text-xl|text-lg|#i-calendar/.test(l));
    d.gone.length === 8 && d.added.length === 7 && okAdded && d.gone.some((l) => l.includes("하카타역 앞 호텔"))
      ? t.ok("조각 diff = 고친 줄만 (사라진 8 · 생긴 7 — 들여쓰기 · 속성 순서 그대로)") : t.fail(`조각 diff\n- ${d.gone.join("\n- ")}\n+ ${d.added.join("\n+ ")}`);
    /<h2 class="section-title text-xl"><svg class="icon" aria-hidden="true"><use href="#i-clock"\/><\/svg>출발 날 모이는 곳<\/h2>/.test(now) && (now.match(/<p class="text-lg">/g) || []).length === 4
      ? t.ok("크기 +1단계 → 덩어리 안 글자 모두: 묶음 제목 lg → .text-xl · 본문 md → .text-lg (인라인 style 없이)") : t.fail("크기: 제목 · 본문 클래스가 기대와 다름");

    // ④ 다시 빌드
    const b = run("build.js", w.run, "--mode", "board");
    b.code === 0 ? t.ok("반영 뒤 build --mode board 성공") : t.fail(`build 실패\n${b.out}`);
  } finally { w.done(); }
}

// ---------- ⑤ 고친 뒤 lint가 FAIL이면 아무것도 쓰지 않는다 ----------
{
  const { w, file, home } = makeRun();
  try {
    const sent = path.join(w.dir, "sent.txt"), frag = path.join(w.run, "screens", "parent-home.html");
    const first = home.answer.items[0];
    fs.writeFileSync(sent, `화면 ${home.id} · 글자 '${first}' 고쳐 쓰기: '${first}' → 'Lorem ipsum' [@meet > p:1]\n`);
    const was = [fs.readFileSync(file, "utf8"), fs.readFileSync(frag, "utf8")];
    const r = run("edits.js", w.run, sent);
    const same = was[0] === fs.readFileSync(file, "utf8") && was[1] === fs.readFileSync(frag, "utf8") && !fs.existsSync(path.join(w.run, "_check", "edits-left.txt"));
    r.code === 1 && /FAIL lint .*Lorem ipsum/.test(r.out) && same ? t.ok("고친 뒤 lint FAIL(Lorem ipsum) → exit 1, screens.json · 조각 · 남긴 글 모두 그대로") : t.fail(`되돌림이 안 됨 (종료 ${r.code}, 파일 그대로 ${same})\n${r.out}`);
  } finally { w.done(); }
}
// ---------- ⑥ md · 2xl로 가는 크기 줄도 AI 없이 반영 (단계 클래스 일곱 개 모두 있음) ----------
for (const [step, title, body] of [["-1", "section-title text-md", "<p class=\"text-sm\">"], ["+2", "section-title text-2xl", "<p class=\"text-xl\">"]]) {
  const { w, home } = makeRun();
  try {
    const sent = path.join(w.dir, "sent.txt"), frag = path.join(w.run, "screens", "parent-home.html");
    fs.writeFileSync(sent, `화면 ${home.id} · 부분 '출발 날 모이는 곳' 크기 ${step}단계 [@meet]\n`);
    const r = run("edits.js", w.run, sent), now = fs.readFileSync(frag, "utf8");
    r.code === 0 && /남김 0/.test(r.out) && now.includes(`<h2 class="${title}">`) && now.includes(body)
      ? t.ok(`크기 ${step}단계 → 제목 .${title.split(" ")[1]} · 남긴 줄 없음 (AI로 안 넘어감)`) : t.fail(`크기 ${step}단계 반영 안 됨 (종료 ${r.code})\n${r.out}`);
  } finally { w.done(); }
}
t.end();
