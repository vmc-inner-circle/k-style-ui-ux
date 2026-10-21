// 프리셋 ↔ 꾸밈(설계 E5) — 레퍼런스 프리셋을 고르면 판 모양 · 모서리 두 칸만 프리셋 값(build가 싣는 HX_PRESET_DRESS)을 따른다.
// 브라우저 없이 picker.js를 가짜 window로 불러 프리셋인지 판단(presetId · presetDress)을 직접 부른다. 보드 쪽은 소스 문자열로 본다.
const fs = require("fs");
const path = require("path");
const { ROOT, suite } = require("../lib.js");

const t = suite("38 프리셋 ↔ 꾸밈");
const src = (f) => fs.readFileSync(path.join(ROOT, "packages/core", f), "utf8");
const load = (dress) => {
  const window = { HXLooks: { PRESETS: [{ id: "toss" }, { id: "warm-paper" }] }, HX_OWN_LOOKS: [{ id: "warm-paper" }] };
  if (dress) window.HX_PRESET_DRESS = dress;
  new Function("window", "document", src("color/picker.js"))(window, { documentElement: {} });
  return window.HXColor;
};

const C = load({ toss: { cards: "flat", radius: "round" } });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cases = [
  ["테마 toss", { theme: "toss" }, "toss"],
  ["직접 고른 색 + 스타일 toss", { theme: "custom", custom: { hex: "#C8553D", from: "toss" } }, "toss"],
  ["PRD 맞춤 분위기 warm-paper(같은 id 프리셋이 있어도)", { theme: "warm-paper" }, null],
  ["직접 고른 색만", { theme: "custom", custom: { hex: "#C8553D" } }, null],
];
cases.forEach(([what, sel, want]) => (C.presetId(sel) === want ? t.ok(`${what} → 프리셋 ${want || "아님"}`) : t.fail(`${what} → ${C.presetId(sel)} (${want}이어야 함)`)));
same(C.presetDress({ theme: "toss" }), { cards: "flat", radius: "round" }) ? t.ok("toss → 판 모양 flat · 모서리 round") : t.fail(`toss 꾸밈: ${JSON.stringify(C.presetDress({ theme: "toss" }))}`);
C.presetDress({ theme: "warm-paper" }) === null ? t.ok("프리셋이 아니면 꾸밈을 바꾸지 않는다(null)") : t.fail("warm-paper인데 꾸밈이 나옴");
load(null).presetDress({ theme: "toss" }) === null ? t.ok("HX_PRESET_DRESS가 아직 없으면 아무것도 바꾸지 않는다(null)") : t.fail("HX_PRESET_DRESS 없이 꾸밈이 나옴");

// 보드: html은 건드리지 않고(dress: false) 화면 상자가 입는다 · 복사 글 꼬리
/dress: false/.test(src("canvas/22-board-canvas.js")) && /B\.redress\(\)/.test(src("canvas/22-board-canvas.js")) ? t.ok("보드 색 바꾸기: dress: false + 고르면 상자 다시 입힘") : t.fail("22-board-canvas.js: mountColor에 dress: false · B.redress()가 있어야 함");
/withPicks\(b\.d\)/.test(src("canvas/25-board-concepts.js")) ? t.ok("시안 상자가 프리셋 꾸밈을 입는다") : t.fail("25-board-concepts.js: 상자를 withPicks(프리셋 · 고른 글꼴)로 입혀야 함");
src("canvas/20-board.js").includes("판 모양 · 모서리: 프리셋 따라감") ? t.ok("복사 글 꼬리 '판 모양 · 모서리: 프리셋 따라감'") : t.fail("20-board.js: 테마 줄에 프리셋 꼬리가 없음");

t.end();
