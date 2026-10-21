// K7 — 시안 단계 보내기 글: 직접 고른 색(custom)을 처음 값과 다르게 바꾸면 '테마 custom(…)' 줄이 생기고, 그대로면 없다.
// 브라우저 없이 20-board.js를 가짜 window로 불러, 저장된 보드 상태(HX.storage)로 직접 고른 색을 바꾼 것처럼 만든다 (18-concept-send.js 방식).
const fs = require("fs");
const path = require("path");
const { ROOT, suite } = require("../lib.js");

const t = suite("45 시안 단계 테마 줄(직접 고른 색)");
const code = fs.readFileSync(path.join(ROOT, "packages/core/canvas/20-board.js"), "utf8");
const sendCode = fs.readFileSync(path.join(ROOT, "packages/core/canvas/23-board-send.js"), "utf8");

const FIRST = { hex: "#C8553D", name: "테라코타", base: "warm", from: "toss" };
const noop = () => {};
const node = () => ({ setAttribute: noop, removeAttribute: noop, getAttribute: () => null, appendChild: (x) => x });
const LK = {
  customLook: (c) => ({ name: "직접", why: "", mode: "light", bg: "#fff", base: c.base, swatches: [{ id: "main", name: "기본" }] }),
  looksCss: () => "", inkOf: () => "#000", fontOf: () => ({ name: "기본" }), primaryHex: () => "#000", FONTS: {},
};

// saved: 사용자가 보드에서 고쳐 저장해 둔 상태(없으면 처음 그대로)
function answerOf(saved, wantSummary) {
  const doc = { documentElement: node(), head: node(), body: node(), getElementById: () => null, addEventListener: noop };
  const HX = {
    board: null, data: { board: { recommend: { theme: "custom", accent: "main" } }, concepts: [{ id: "a", name: "차분한" }], screens: [] },
    meta: { stage: "concept", project: "k7", custom: FIRST, looks: [{ id: "custom", name: "직접", swatches: [{ id: "main", name: "기본" }] }] },
    storage: { get: () => saved || null, set: noop }, el: node, relayout: noop,
  };
  const window = { HX, HXLooks: LK };
  try { new Function("window", "document", code)(window, doc); } catch (e) { return "오류: " + e.message; }
  if (wantSummary) {
    try { new Function("window", "document", sendCode)(window, doc); } catch (e) { return "오류: " + e.message; }
    return { groups: HX.board.summary(), n: HX.board.diffCount() };
  }
  return HX.board.answer();
}

const same = answerOf(null);
if (!same.includes("테마 custom(")) t.ok("처음 색 그대로면 테마 줄이 없다");
else t.fail(`안 바꿨는데 테마 줄이 나옴: ${same}`);

const hexChanged = answerOf({ theme: "custom", custom: { ...FIRST, hex: "#1F3A93", name: "남색" } });
if (/테마 custom\(#1F3A93 남색/.test(hexChanged)) t.ok("색(hex)을 바꾸면 '테마 custom(#1F3A93 남색 …)' 줄이 생긴다");
else t.fail(`hex를 바꿨는데 테마 줄이 없음: ${hexChanged}`);

const baseChanged = answerOf({ theme: "custom", custom: { ...FIRST, base: "cream" } });
if (/테마 custom\(#C8553D .*바탕 cream/.test(baseChanged)) t.ok("바탕(base)만 바꿔도 테마 줄이 생긴다");
else t.fail(`base를 바꿨는데 테마 줄이 없음: ${baseChanged}`);

// 확인 창 요약: 직접 고른 색을 바꾸면 '고른 테마 · 컬러' 묶음이 생겨, 묶음 수가 첫 줄 개수와 같다
const sumSame = answerOf(null, true), sumHex = answerOf({ theme: "custom", custom: { ...FIRST, hex: "#1F3A93", name: "남색" } }, true);
if (sumSame.groups && sumHex.groups && !sumSame.groups.some((g) => /테마 · 컬러/.test(g.title)) && sumHex.groups.some((g) => /테마 · 컬러/.test(g.title))
  && sumSame.groups.length === sumSame.n && sumHex.groups.length === sumHex.n) t.ok("확인 창 요약: 직접 고른 색을 바꾸면 색 묶음이 생기고, 묶음 수 = 개수 줄");
else t.fail("확인 창 요약 묶음이 어긋남: " + JSON.stringify([sumSame, sumHex]));

t.end();
