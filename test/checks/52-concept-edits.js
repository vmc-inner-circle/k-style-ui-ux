// G2 — 시안 보드에서 바로 고친 것 → 2턴 완성본 (사람 결정 2026-10-21 "시안 보드 -> 완성본으로").
// 시안 단계 실행물(family-trip 사본 + 시안 a~d · 조각 펼침)을 board로 build하고 그 html로 가짜 window를 띄워(test/lib.js fakeDom)
// 자세히 보기에서 고친 것과 같은 모양을 상태에 넣는다: 고른 시안 a — 구역 순서 · 고쳐 쓰기 · ✕(빼기 핀), 고르지 않은 시안 b — 고쳐 쓰기 하나
// ① 보내기 글 = 고친 줄 3(화면 S = 메인 화면 id) + '시안 b 메모: plan 화면 — …' 1 ② 시안을 b로 바꿔 고르면 줄이 바뀜 ③ 저장 뒤 다시 열어도 같은 글
// ④ 확인 창 '화면에서 바로 고친 것' 묶음 ⑤ 2턴 흉내(stage 지움 · 시안 a 조각을 screens/로 복사) → edits.js 반영 3 → final build에 고친 것이 보임
// (자세히 보기 화면에서 실제로 끌고 누르는 것은 48 — 여기서는 기록 → 줄 → 반영만)
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite, fakeDom, fragmentOf } = require("../lib.js");
const LK = require(path.join(ROOT, "scripts/looks.js"));

const t = suite("52 시안 보드 고친 것 → 완성본");
const src = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

/* build한 보드 html로 가짜 window — picker · 20 · 22 · 23 (47과 같은 방법). store를 넘기면 저장소를 이어 쓴다 */
function boardOf(page, store) {
  const { doc, html, body } = fakeDom();
  Object.entries(attrsOf(/<html\b[^>]*>/.exec(page)[0])).forEach(([k, v]) => html.setAttribute(k, v));
  const data = JSON.parse(/<script type="application\/json" id="hx-data">([\s\S]*?)<\/script>/.exec(page)[1]);
  const handlers = {}, noop = () => {};
  const HX = { data, meta: data.meta, bySlug: Object.fromEntries(data.screens.map((s) => [s.slug, s])), relayout: noop,
    storage: { get: (k) => (store[k] ? JSON.parse(store[k]) : null), set: (k, v) => { store[k] = JSON.stringify(v); } },
    el: (tag, a) => { const n = doc.createElement(tag); Object.entries(a || {}).forEach(([k, v]) => (k === "text" ? (n.textContent = v) : n.setAttribute(k, v))); return n; },
    on: (n, f) => (handlers[n] = handlers[n] || []).push(f), emit: (n, x) => (handlers[n] || []).forEach((f) => f(x)) };
  const window = { HX, HXLooks: LK, innerWidth: 1440,
    HX_OWN_LOOKS: JSON.parse(/window\.HX_OWN_LOOKS = (\[.*\]);/.exec(page)[1]), HX_PRESET_DRESS: JSON.parse(/window\.HX_PRESET_DRESS = (\{.*\});/.exec(page)[1]) };
  for (const f of ["packages/core/color/picker.js", "packages/core/canvas/20-board.js", "packages/core/canvas/22-board-canvas.js", "packages/core/canvas/23-board-send.js"])
    new Function("window", "document", "getComputedStyle", "localStorage", "setTimeout", "clearTimeout", src(f))(window, doc, () => ({ getPropertyValue: () => "" }), { getItem: () => null, setItem: noop }, (f) => f(), noop);   // 저장(B.save의 setTimeout)은 바로
  return HX.board;
}

const w = workCopy("project/family-trip");
try {
  // 시안 단계 실행물: 사본 + 시안 a~d + lint가 보는 칸 + ids + 조각(screens/ · concepts/) 펼침
  const file = path.join(w.run, "screens.json");
  const FX = JSON.parse(src("test/fixtures/board/family-trip.json"));
  const S0 = JSON.parse(fs.readFileSync(file, "utf8"));
  Object.assign(S0, { sections: FX.sections, concepts: FX.concepts, board: { stage: "concept", concept: "a" } });
  S0.screens.forEach((s) => Object.assign(s, { section: s.role === "parent" ? "family" : "plan", step: s.name, policy: [{ title: "기본 정의", items: [s.goal] }] }));
  fs.writeFileSync(file, JSON.stringify(S0, null, 2) + "\n");
  run("ids.js", w.run);
  const S = JSON.parse(fs.readFileSync(file, "utf8"));
  fs.writeFileSync(path.join(w.run, "flow.json"), JSON.stringify({ flows: [], branches: [] }) + "\n");
  fs.mkdirSync(path.join(w.run, "screens"));
  for (const s of S.screens) fs.writeFileSync(path.join(w.run, "screens", s.slug + ".html"), fragmentOf(s));
  for (const c of S.concepts) {
    fs.mkdirSync(path.join(w.run, "concepts", c.id), { recursive: true });
    for (const slug of c.screens) fs.writeFileSync(path.join(w.run, "concepts", c.id, slug + ".html"), fragmentOf(S.screens.find((s) => s.slug === slug)));
  }
  const ex = run("expand.js", w.run);
  if (ex.code !== 0) { t.fail(`expand 실패\n${ex.out}`); t.end(); }
  const b = run("build.js", w.run, "--mode", "board");
  if (b.code !== 0) { t.fail(`시안 board build 실패\n${b.out}`); t.end(); }
  const page = fs.readFileSync(path.join(w.run, "out", "board.html"), "utf8");

  const home = S.screens.find((s) => s.slug === "parent-home"), plan = S.screens.find((s) => s.slug === "plan");
  const stay0 = home.rest.find((x) => x.key === "stay").items[0], plan0 = plan.answer.items[0];
  const ORDER = ["news", "meet", "mine", "days", "stay", "action"];
  const store = {};
  const B = boardOf(page, store);
  // 자세히 보기에서 고친 것과 같은 모양(slug = "<시안>~<slug>" + concept 칸) — ✕는 '빼주세요' 핀(hide)
  B.state.concept = "a"; B.state.picked = true;
  B.state.edits.push(
    { kind: "order", slug: "parent-home", concept: "a", region: true, names: ORDER, parent: "@" + ORDER[0], kids: [] },
    { kind: "text", slug: "parent-home", concept: "a", path: "@mine > h2", desc: "제목 '내가 챙길 것'", from: "내가 챙길 것", to: "내 준비물" },
    { kind: "text", slug: "b~plan", concept: "b", path: "@days > p:1", desc: "글자 '" + plan0.slice(0, 14) + "'", from: plan0, to: "첫날 도착" });
  B.state.pinSeq = 1;
  B.state.pins[1] = { id: 1, sid: home.id, slug: "a~parent-home", concept: "a", path: "@stay > ul > li:1", desc: "목록 한 줄 '" + stay0 + "'", v: "remove", hide: true, memo: "" };
  B.changed();

  // ① 고른 시안 a
  const A = B.answer().split("\n");
  const want = [
    `화면 ${home.id} · 목록 한 줄 '${stay0}' 빼기 [@stay > ul > li:1]`,
    `화면 ${home.id} · 구역 순서: ${ORDER.join(", ")}`,
    `화면 ${home.id} · 제목 '내가 챙길 것' 고쳐 쓰기: '내가 챙길 것' → '내 준비물' [@mine > h2]`,
  ];
  want.every((l) => A.includes(l)) ? t.ok("고른 시안 a의 고친 것 → 고친 줄 3 (화면 번호 = 메인 화면 id)") : t.fail(`보내기 글\n${A.join("\n")}`);
  const memo = A.filter((l) => /^시안 b 메모: plan 화면 — /.test(l));
  memo.length === 1 && memo[0].includes("첫날 도착") ? t.ok("고르지 않은 시안 b 것 → '시안 b 메모: plan 화면 — …' 한 줄") : t.fail(`시안 b 메모 줄 ${JSON.stringify(memo)}`);
  A[0].startsWith("시안 a") && A[A.length - 1] === "(나머지는 추천대로)" ? t.ok("첫 줄 시안 · 끝 표시 그대로") : t.fail(`처음 · 끝 ${A[0]} / ${A[A.length - 1]}`);
  !A.some((l) => /\b[a-d]~[a-z]/.test(l)) ? t.ok("줄에 시안 화면 이름(<시안>~<slug>)이 새지 않음") : t.fail("줄에 '~'");

  // ② 시안 b로 바꿔 고르면
  B.state.concept = "b";
  const Bb = B.answer().split("\n");
  Bb.filter((l) => /^시안 a 메모: parent-home 화면 — /.test(l)).length === 3 && Bb.some((l) => l.startsWith(`화면 ${plan.id} · 글자`) && l.includes("'첫날 도착'"))
    ? t.ok("시안 b로 바꾸면 a의 셋은 메모 줄, b의 고쳐 쓰기가 고친 줄") : t.fail(`b를 골랐을 때\n${Bb.join("\n")}`);
  B.state.concept = "a"; B.changed();

  // ③ 저장 → 다시 열기
  const B2 = boardOf(page, store);
  B2.answer() === A.join("\n") ? t.ok("저장 뒤 다시 열어도 같은 보내기 글") : t.fail(`다시 연 글\n${B2.answer()}`);

  // ④ 확인 창 묶음
  const g = B.summary().find((x) => x.title === "화면에서 바로 고친 것");
  g && g.items.length === 4 && g.items.filter((x) => x.includes("(가져올 요소로 전달)")).length === 1
    ? t.ok("확인 창 '화면에서 바로 고친 것' 4 — 다른 시안 것은 '가져올 요소로 전달'") : t.fail(`확인 창 묶음 ${JSON.stringify(g)}`);

  // ⑤ 2턴 흉내: SKILL 2턴 — stage 지움 · concept a · 시안 조각을 screens/로 복사 → edits.js → final
  const S2 = JSON.parse(fs.readFileSync(file, "utf8"));
  delete S2.board.stage; S2.board.concept = "a"; S2.board.locked = ["concept", "dress"]; S2.board.round = 1;
  fs.writeFileSync(file, JSON.stringify(S2, null, 2) + "\n");
  for (const slug of S.concepts.find((c) => c.id === "a").screens) fs.copyFileSync(path.join(w.run, "concepts", "a", slug + ".html"), path.join(w.run, "screens", slug + ".html"));
  const sendFile = path.join(w.run, "send.txt");
  fs.writeFileSync(sendFile, A.join("\n") + "\n");
  const ed = run("edits.js", w.run, sendFile);
  /반영 3\b/.test(ed.out) ? t.ok("2턴 복사 뒤 edits.js 반영 3 (시안 · 메모 줄은 남김)") : t.fail(`edits.js\n${ed.out}`);
  const fb = run("build.js", w.run, "--mode", "final");
  if (fb.code !== 0) t.fail(`final build 실패\n${fb.out}`);
  else {
    const dir = path.join(w.run, "out", "screens"), f = fs.readdirSync(dir).find((x) => x.endsWith("parent-home.html"));
    const html = f ? fs.readFileSync(path.join(dir, f), "utf8") : "";
    const order = [...html.matchAll(/data-region="([a-z0-9-]+)"/g)].map((m) => m[1]).filter((k) => ORDER.includes(k));
    order.join() === ORDER.join() && html.includes("내 준비물") && !html.includes(stay0)
      ? t.ok("완성본 부모님 홈: 구역 순서 · '내 준비물' · 뺀 줄 없음") : t.fail(`완성본 ${f}: 순서 ${order.join()} · 내 준비물 ${html.includes("내 준비물")} · 뺀 줄 남음 ${html.includes(stay0)}`);
  }
} finally {
  w.cleanup && w.cleanup();
}
t.end();
