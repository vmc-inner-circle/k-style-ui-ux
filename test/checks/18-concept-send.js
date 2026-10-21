// B27 — 시안 단계 보내기 창: 시안 a를 골라도 '추천 그대로'가 붙지 않고, 복사 버튼 개수에 들어간다.
// 브라우저 없이 23-board-send.js를 가짜 window로 불러 B.summary()를 직접 부른다. 개수(B.diffCount)는 소스 문자열로 본다.
const fs = require("fs");
const path = require("path");
const { ROOT, suite } = require("../lib.js");

const t = suite("18 시안 보내기 창");
const src = (f) => fs.readFileSync(path.join(ROOT, "packages/core/canvas", f), "utf8");

const CS = [{ id: "a", name: "차분한" }, { id: "b", name: "또렷한" }];
const B = {
  stage: "concept", REC: { concept: "a", theme: "light", accent: "x" },
  state: { concept: "a", theme: "light", accent: "x", add: "", memo: "" },
  concept: (id) => CS.filter((c) => c.id === id)[0],
  fixSwatch: (_, a) => a, lookLine: () => "", conceptMemos: () => [], lookPicked: () => false, fontPicked: () => false,
};
const window = { HX: { board: B, data: { board: {} } } };
new Function("window", "document", src("23-board-send.js"))(window, {});

const first = B.summary()[0];
if (first.title === "고른 시안" && first.items[0].includes("시안 A")) t.ok("시안 a 선택 → '고른 시안' 줄이 나온다");
else t.fail(`고른 시안 줄이 없음: ${JSON.stringify(first)}`);
if (first.items[0].includes("추천 그대로")) t.fail(`시안 단계인데 '추천 그대로'가 붙음: ${first.items[0]}`);
else t.ok("시안 단계에서는 '추천 그대로'가 붙지 않는다");

if (/STAGE === "concept"\) return n \+ 1;/.test(src("20-board.js"))) t.ok("시안 단계 개수(diffCount)에 고른 시안을 늘 센다 (소스 문자열 검사)");
else t.fail("20-board.js diffCount: 시안 단계에서 고른 시안을 늘 세야 함");

t.end();
