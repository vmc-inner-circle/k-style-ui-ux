// 의견 찾기 — scripts/feedback.js가 의견 한 줄을 의견 해석 사전(packages/core/feedback/glossary.json)의 알맞은 줄로 찾는다. 사전 모양(F01~F30 · 필드)도 지킨다.
const fs = require("fs");
const path = require("path");
const { ROOT, run, suite } = require("../lib.js");

const t = suite("60 의견 찾기");
const glossary = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "core", "feedback", "glossary.json"), "utf8"));

// 사전 모양
const ids = glossary.entries.map((e) => e.id);
const want = Array.from({ length: 30 }, (_, i) => `F${String(i + 1).padStart(2, "0")}`);
ids.join() === want.join() ? t.ok("사전 줄 F01~F30이 순서대로 있다") : t.fail(`사전 줄 id가 F01~F30이 아니다: ${ids.join(" ")}`);
const bad = glossary.entries.filter((e) => !e.group || ![e.heard, e.cause, e.measure].every((a) => Array.isArray(a) && a.length) || !e.fix || !(e.rule === null || typeof e.rule === "string"));
bad.length ? t.fail(`필드가 빠진 줄: ${bad.map((e) => e.id).join(" ")}`) : t.ok("줄마다 group · heard · cause · measure · fix · rule이 있다");
glossary.order.length === 6 && glossary.scope.length === 4 ? t.ok("order 6단계 · scope 4줄") : t.fail("order 6단계 · scope 4줄이 아니다");

// 찾기
const ask = (text) => {
  const r = run("feedback.js", text);
  if (r.code !== 0) { t.fail(`'${text}': 종료 ${r.code}\n${r.out}`); return null; }
  return JSON.parse(r.out);
};
const q1 = ask("맨 위 다음에 할 일에서 모이는 시간과 장소를 훨씬 크게");
if (q1) ["F02", "F03"].includes(q1.lines[0]?.id) ? t.ok(`'훨씬 크게' → ${q1.lines[0].id}`) : t.fail(`'훨씬 크게' 첫 줄이 F02 · F03이 아니다: ${q1.lines[0]?.id}`);
// '길어'는 사전에 없는 말 — 세기 말('너무')로 엉뚱한 줄(F10 '너무 넓어')을 잡지 않고 비어야 한다. 사전 빈칸은 메인이 1절 '먼저 잴 것'으로
const q2 = ask("다가오는 일정이 너무 길어요");
if (q2) !q2.lines.some((l) => l.id === "F10") ? t.ok(`'너무 길어요' → F10을 잡지 않음(${q2.lines.map((l) => l.id).join(" ") || "빈 결과"})`) : t.fail("'너무 길어요'가 세기 말 '너무'로 F10을 잡았다");
const q2b = ask("화면에 정보가 너무 많아");
if (q2b) q2b.lines[0]?.id === "F07" ? t.ok("'너무 많아' → F07(밀도)") : t.fail(`'너무 많아' 첫 줄이 F07이 아니다: ${q2b.lines[0]?.id}`);
const q3 = ask("정신없어");
if (q3) q3.lines[0]?.id === "F01" ? t.ok("'정신없어' → F01") : t.fail(`'정신없어' 첫 줄이 F01이 아니다: ${q3.lines[0]?.id}`);
const q4 = ask("오늘 점심은 김치찌개");
if (q4) q4.lines.length === 0 ? t.ok("관계 없는 말 → 빈 결과") : t.fail(`관계 없는 말인데 ${q4.lines.map((l) => l.id).join(" ")}이(가) 나왔다`);
const q5 = ask("정신없어");
if (q5) ["id", "group", "why", "fix", "rule"].every((k) => k in q5.lines[0]) ? t.ok("줄마다 id · group · why · fix · rule을 낸다") : t.fail("결과 줄에 id · group · why · fix · rule 중 빠진 게 있다");
t.end();
