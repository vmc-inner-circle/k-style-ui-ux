// C2 — 시안 보드에서 고른 테마 · 컬러 · 폰트가 1차안(초안)에 그대로 (사람 의견 2026-10-21 "1차안에도 테마 · 컬러 · 폰트가 반영될 수 있도록").
// ① 시안 단계 보드를 build해 그 html의 데이터로 가짜 window를 띄우고(test/lib.js fakeDom) 상단 버튼으로 테마 당근 → 컬러 남색 → 폰트 수트 · 글자 크게를 누른다
// ② 보내기 글(B.answer) = answer-parsing §1-2 예의 글. 그 예의 board 칸을 SKILL 2턴 2대로 screens.json에 옮긴다(손으로 옮긴 것 = 그 예, 반영 스크립트는 따로 없다)
// ③ build --mode board 결과 html의 data-theme · data-font · data-type이 고른 값, 판 모양 · 모서리는 당근 프리셋, 1차안 폰트 창도 그 값에서 시작
// ④ Chrome이 있으면 진짜 시안 보드에서 같은 단추를 눌러 본다 — 시안 상자 글꼴이 수트로 덮이고 복사 글이 같다 · 휴대폰 폭 390에서 열린 폰트 창 잘림 0(measureCut)
//    (390의 시안 보드 상단바 자체 — 보내기 단추가 화면 밖 — 는 이 일 전부터라 여기서 재지 않는다)
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite, fakeDom, CHROME, chromeDom, measureCut, withClicks, clicked } = require("../lib.js");
const LK = require(path.join(ROOT, "scripts/looks.js"));

const t = suite("47 시안 → 1차안 테마 · 컬러 · 폰트");
const src = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const read = (f) => JSON.parse(src(f));
const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
// 누르는 차례 — 가짜 window와 Chrome이 같은 것을 누른다 [선택자, 글자 앞부분]
const PICKS = [[".hxp-btn", "테마"], [".hxp-ref", "당근 느낌"], [".hxp-btn", "컬러"], [".hxp-dot", "남색"], [".hxp-btn", "폰트"], [".hxp-font", "수트"], [".hxp-seg button", "크게"]];

// answer-parsing §1-2: 보내기 글 예 하나 + board에 쓰는 칸(json) 하나
const AP = src(".claude/skills/design-harness/references/answer-parsing.md");
const sec = AP.slice(AP.indexOf("## 1-2."), AP.indexOf("## 2."));
const blocks = [...sec.matchAll(/```(json)?\n([\s\S]*?)```/g)];
const EX_TEXT = (blocks.find((b) => !b[1]) || [])[2], EX_BOARD = blocks.find((b) => b[1]) ? JSON.parse(blocks.find((b) => b[1])[2]) : null;
if (!EX_TEXT || !EX_BOARD) { t.fail("answer-parsing §1-2에 보내기 글 예 · board json 덩어리가 없음"); t.end(); }

// 새 형식 예시(family-trip) + 실행 상태의 시안 4개, 시안 단계로 되돌린다. 1턴 추천(board.recommend)은 토스 · 글자 보통 —
// 2턴에도 추천이 남아 있으니(SKILL은 지우지 않는다) 1차안이 추천이 아니라 고른 값으로 열리는지까지 본다
const { $comment, looks, board: RUN_BOARD, ...RUN } = read("test/fixtures/board/family-trip.json");
const w = workCopy("project/family-trip");
try {
  const file = path.join(w.run, "screens.json");
  const REC = { theme: "toss", themeWhy: "돈 · 숫자처럼 또렷하게", type: "normal", typeWhy: "보통", swatch: LK.PRESETS.find((p) => p.id === "toss").swatches[0].id, swatchWhy: "토스 파랑" };
  const S0 = Object.assign(JSON.parse(fs.readFileSync(file, "utf8")), RUN, { board: { stage: "concept", concept: "a", recommend: REC } });
  fs.writeFileSync(file, JSON.stringify(S0, null, 2));
  fs.writeFileSync(path.join(w.run, "flow.json"), "{}");
  const frag = (s) => `<main class="content"><h1 class="page-title">${s.name}</h1><p>${s.slug}</p></main>`;
  fs.mkdirSync(path.join(w.run, "screens"));
  S0.screens.forEach((s) => fs.writeFileSync(path.join(w.run, "screens", s.slug + ".html"), frag(s)));
  S0.concepts.forEach((c) => { fs.mkdirSync(path.join(w.run, "concepts", c.id), { recursive: true }); c.screens.forEach((slug) => fs.writeFileSync(path.join(w.run, "concepts", c.id, slug + ".html"), frag(S0.screens.find((s) => s.slug === slug)))); });
  const out = path.join(w.run, "out", "board.html");
  const build = (what) => { const r = run("build.js", w.run, "--mode", "board"); if (r.code !== 0) { t.fail(`${what} build 실패\n${r.out}`); t.end(); } return fs.readFileSync(out, "utf8"); };

  /* build한 보드 html로 가짜 window를 띄운다: picker.js · 20-board.js · 22 · 23. 돌려주는 것 { B, html, body } */
  function boardOf(page) {
    const { doc, html, body } = fakeDom();
    Object.entries(attrsOf(/<html\b[^>]*>/.exec(page)[0])).forEach(([k, v]) => html.setAttribute(k, v));
    const data = JSON.parse(/<script type="application\/json" id="hx-data">([\s\S]*?)<\/script>/.exec(page)[1]);
    const store = {}, handlers = {}, noop = () => {};
    const HX = { data, meta: data.meta, bySlug: Object.fromEntries(data.screens.map((s) => [s.slug, s])), relayout: noop,
      storage: { get: (k) => (store[k] ? JSON.parse(store[k]) : null), set: (k, v) => { store[k] = JSON.stringify(v); } },
      el: (tag, a) => { const n = doc.createElement(tag); Object.entries(a || {}).forEach(([k, v]) => (k === "text" ? (n.textContent = v) : n.setAttribute(k, v))); return n; },
      on: (n, f) => (handlers[n] = handlers[n] || []).push(f), emit: (n, x) => (handlers[n] || []).forEach((f) => f(x)) };
    const window = { HX, HXLooks: LK, innerWidth: 1440,
      HX_OWN_LOOKS: JSON.parse(/window\.HX_OWN_LOOKS = (\[.*\]);/.exec(page)[1]), HX_PRESET_DRESS: JSON.parse(/window\.HX_PRESET_DRESS = (\{.*\});/.exec(page)[1]) };
    const localStorage = { getItem: () => null, setItem: noop };
    for (const f of ["packages/core/color/picker.js", "packages/core/canvas/20-board.js", "packages/core/canvas/22-board-canvas.js", "packages/core/canvas/23-board-send.js"])
      new Function("window", "document", "getComputedStyle", "localStorage", "setTimeout", "clearTimeout", src(f))(window, doc, () => ({ getPropertyValue: () => "" }), localStorage, noop, noop);
    HX.board.mountColor(body.appendChild(doc.createElement("span")));
    return { B: HX.board, html, body, pd: window.HX_PRESET_DRESS };
  }
  const cls = (n, c) => (n.attrs.class || "").split(/\s+/).includes(c);
  const visible = (n) => { for (let x = n; x; x = x.parent) if (x.hasAttribute("hidden")) return false; return true; };
  // 가짜 DOM에서 [선택자, 글자 앞부분] 찾기 — PICKS에 쓰는 모양(.이름 · .이름 button)만
  const find = (root, [sel, txt]) => { const [c, tag] = sel.slice(1).split(" "); return root.all().find((n) => (tag ? n.tagName === tag.toUpperCase() && n.parent && cls(n.parent, c) : cls(n, c)) && visible(n) && n.textContent.trim().startsWith(txt)); };

  // ---------- ① 시안 보드: 폰트 창이 열려 있고, 셋을 고른다 ----------
  const concept = boardOf(build("시안 보드"));
  const { B } = concept;
  B.stage === "concept" ? t.ok("시안 단계 보드(board.stage concept)") : t.fail(`단계가 ${B.stage}`);
  find(concept.body, [".hxp-btn", "폰트"]).click();
  const fonts = concept.body.all().filter((n) => cls(n, "hxp-font") && visible(n)).length, types = concept.body.all().filter((n) => n.tagName === "BUTTON" && n.parent && cls(n.parent, "hxp-seg") && visible(n)).length;
  fonts === 1 + Object.keys(LK.FONTS).length && types === 2 ? t.ok(`시안 단계 폰트 창: 글꼴 ${fonts}(기본 + ${fonts - 1}) · 글자 크기 ${types} — 안내만이 아니다`) : t.fail(`시안 단계 폰트 창: 글꼴 ${fonts} · 글자 크기 ${types}`);
  const missing = PICKS.filter((p) => { const n = find(concept.body, p); if (n) n.click(); return !n; });
  missing.length ? t.fail(`못 찾은 단추: ${missing.map((p) => p.join(" ")).join(" / ")}`) : t.ok(`단추 ${PICKS.length}개를 차례로 누름 (테마 당근 → 컬러 남색 → 폰트 수트 · 크게)`);
  const st = B.state, h1 = concept.html;
  st.theme === "custom" && st.custom && st.custom.hex === "#23317A" && st.custom.from === "daangn" && st.font === "suit" && st.type === "large"
    ? t.ok("보드 상태: 직접 고른 색 남색(당근 위) · 수트 · 크게") : t.fail(`보드 상태: ${JSON.stringify({ theme: st.theme, custom: st.custom, font: st.font, type: st.type })}`);
  h1.getAttribute("data-font") === "suit" && h1.getAttribute("data-type") === "large" ? t.ok("시안 보드 <html data-font suit · data-type large>") : t.fail(`시안 보드 html: font ${h1.getAttribute("data-font")} · type ${h1.getAttribute("data-type")}`);
  st.concept = EX_BOARD.concept; st.picked = true;

  // ---------- ② 보내기 글 = answer-parsing §1-2 예 ----------
  const text = B.answer();
  text === EX_TEXT.trim() ? t.ok("보내기 글 = answer-parsing §1-2 예 (테마 줄 · 꾸밈 font 줄)") : t.fail(`보내기 글이 예와 다름\n--- 보드\n${text}\n--- 예\n${EX_TEXT.trim()}`);
  const groups = B.summary().map((g) => g.title);
  groups.includes("고른 테마 · 컬러 · 글자 크기") && groups.includes("고른 폰트") && groups.length === B.diffCount()
    ? t.ok(`확인 창 묶음 ${groups.length}개 = 보낼 줄 ${B.diffCount()}개 (${groups.join(" · ")})`) : t.fail(`확인 창 묶음: ${groups.join(" · ")} (보낼 줄 ${B.diffCount()})`);

  // ---------- ③ SKILL 2턴 2: 예의 칸을 board에 → 1차안 build ----------
  const S1 = JSON.parse(fs.readFileSync(file, "utf8"));
  const C = S1.concepts.find((c) => c.id === EX_BOARD.concept), { dress, ...rest } = EX_BOARD;
  S1.board = Object.assign({}, S1.board, rest, { dress: Object.assign({}, C.dress, dress) });
  delete S1.board.stage;
  fs.writeFileSync(file, JSON.stringify(S1, null, 2));
  const page2 = build("1차안");
  const A = attrsOf(/<html\b[^>]*>/.exec(page2)[0]), want = concept.pd.daangn;
  A["data-theme"] === "custom" && A["data-swatch"] === "custom" ? t.ok("1차안 <html data-theme custom · data-swatch custom>") : t.fail(`1차안 data-theme ${A["data-theme"]} · data-swatch ${A["data-swatch"]}`);
  A["data-font"] === "suit" ? t.ok("1차안 <html data-font suit> (시안 a 꾸밈 글꼴 대신)") : t.fail(`1차안 data-font ${A["data-font"]} (시안 a 꾸밈 글꼴 ${C.dress.font})`);
  A["data-type"] === "large" ? t.ok("1차안 <html data-type large>") : t.fail(`1차안 data-type ${A["data-type"]}`);
  const same = (k) => (want[k] && want[k] !== "base" ? A["data-" + k] === want[k] : A["data-" + k] === undefined);
  same("cards") && same("radius") ? t.ok(`1차안 판 모양 · 모서리 = 당근 프리셋 (${want.cards} · ${want.radius})`) : t.fail(`1차안 판 모양 ${A["data-cards"]} · 모서리 ${A["data-radius"]} (당근 ${JSON.stringify(want)})`);
  const draft = boardOf(page2), ds = draft.B.state;
  draft.B.stage === "draft" && ds.theme === "custom" && ds.custom.hex === "#23317A" && ds.custom.from === "daangn" && ds.font === "suit" && ds.type === "large" && !draft.B.fontPicked() && !draft.B.lookPicked()
    ? t.ok("1차안 보드의 테마 · 컬러 · 폰트 창도 고른 값에서 시작 — 남아 있는 1턴 추천(토스 · 보통)이 덮지 않는다 (다시 보낼 것 없음)") : t.fail(`1차안 보드 처음 값: ${JSON.stringify({ stage: draft.B.stage, theme: ds.theme, custom: ds.custom, font: ds.font, type: ds.type })}`);

  // ---------- ④ 진짜 브라우저: 시안 상자 글꼴 · 복사 글 · 휴대폰 폭 ----------
  if (!CHROME) t.skip("Chrome이 없어 진짜 브라우저 시험은 건너뜀 (CHROME=<경로>)");
  else {
    S1.board = { stage: "concept", concept: "a", recommend: REC };
    fs.writeFileSync(file, JSON.stringify(S1, null, 2));
    build("시안 보드(Chrome)");
    const page = withClicks(out, PICKS.concat([[".hx-ccv-pick", "이 안으로"]]),
      "return { answer: HX.board.answer(), boxes: [].map.call(document.querySelectorAll('.hx-ccv-board'), function (b) { return b.getAttribute('data-font'); }), type: document.documentElement.getAttribute('data-type') };");
    const got = clicked(chromeDom(page));
    if (!got) t.fail("Chrome: 누른 결과를 못 받음");
    else {
      got.missing.length ? t.fail(`Chrome: 못 찾은 단추 ${got.missing.join(" / ")}`) : t.ok("Chrome: 같은 단추를 모두 누름");
      const r = got.report;
      r.boxes.length && r.boxes.every((f) => f === "suit") ? t.ok(`Chrome: 시안 상자 ${r.boxes.length}개 글꼴이 모두 수트 (시안 꾸밈 글꼴을 덮음)`) : t.fail(`Chrome: 시안 상자 글꼴 ${[...new Set(r.boxes)].join(" · ")}`);
      r.answer === EX_TEXT.trim() && r.type === "large" ? t.ok("Chrome: 복사 글 = 예 · data-type large") : t.fail(`Chrome: 복사 글 · 글자 크기가 다름 (type ${r.type})\n${r.answer}`);
      const m = measureCut(page, 390, 844, null, ".hxp-panel:not([hidden]), .hxp-panel:not([hidden]) *");
      m && m.width === 390 && m.cut === 0 ? t.ok(`Chrome 390: 열린 폰트 창 잘림 0 (잰 요소 ${m.seen})`) : t.fail(`Chrome 390: ${m ? `잘림 ${m.cut} — ${m.samples.join(" | ")}` : "재지 못함"}`);
    }
  }
} finally {
  w.done();
}
t.end();
