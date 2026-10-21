// 레퍼런스 프리셋 — presets.json의 presets[] 하나하나가 preset.schema.json(docs/design-system.md §4)을 통과한다(scripts/schema-check.js).
// 근거 파일(source)이 있는 것은 8개, 나머지는 source: null('참고용'). 바로잡은 색값(당근 #FF6600)이 남아 있는지, 일부러 틀린 값이 잡히는지도 본다.
const path = require("path");
const { ROOT, suite } = require("../lib.js");
const { check } = require(path.join(ROOT, "scripts", "schema-check.js"));

const t = suite("37 레퍼런스 프리셋");
const TOK = path.join(ROOT, "packages", "core", "tokens");
const SCHEMA = require(path.join(TOK, "preset.schema.json")), P = require(path.join(TOK, "presets.json")).presets;
const errsOf = (p) => { const e = []; check(SCHEMA, p, `presets.${p.id}`, SCHEMA, e); return e; };

let bad = 0;
for (const p of P) { const e = errsOf(p); if (e.length) { bad++; e.forEach((x) => t.fail(x)); } }
if (!bad) t.ok(`프리셋 ${P.length}개 모두 preset.schema.json 통과`);

const withSrc = P.filter((p) => p.source), refOnly = P.filter((p) => p.source === null);
if (withSrc.length === 8) t.ok(`근거 있는 것 8개(${withSrc.map((p) => p.id).join(" · ")}) · 참고용 ${refOnly.length}개`);
else t.fail(`근거 있는 프리셋이 8개여야 함 (지금 ${withSrc.length}개: ${withSrc.map((p) => p.id).join(" · ")})`);

const dg = P.find((p) => p.id === "daangn");
if (dg && dg.brand === "#FF6600" && dg.swatches[0].hex === "#FF6600") t.ok("당근 brand · 추천 버튼 색 #FF6600(SEED carrot-600)");
else t.fail(`당근 brand #FF6600이어야 함 (지금 brand ${dg && dg.brand} · 추천 ${dg && dg.swatches[0].hex})`);

// 일부러 틀린 값 — 토스를 고쳐서 그 오류가 잡히는지(oneOf로 쓴 radius · source 포함)
const caught = (what, change, expect) => {
  const p = JSON.parse(JSON.stringify(P.find((x) => x.id === "toss")));
  change(p);
  const e = errsOf(p);
  if (e.some((x) => x.includes(expect))) t.ok(`${what} → 잡힘`);
  else t.fail(`${what}: '${expect}' 오류가 나와야 함 (지금 ${e.length ? e.join(" / ") : "통과"})`);
};
caught("이름에 '느낌' 없음", (p) => { p.name = "토스"; }, "presets.toss.name: 형식 불일치");
caught("본문 14", (p) => { p.body = 14; }, "presets.toss.body:");
caught("모서리 \"round\"", (p) => { p.radius.control = "round"; }, "presets.toss.radius.control: 허용 형식");
caught("카드 \"glass\"", (p) => { p.card = "glass"; }, "presets.toss.card:");
caught("없는 칸", (p) => { p.style = "flat"; }, "presets.toss.style: 스키마에 없는 항목");
caught("source에 commit 없음", (p) => { delete p.source.commit; }, "presets.toss.source: 허용 형식");
caught("brand 없음", (p) => { delete p.brand; }, "presets.toss.brand: 필수 항목 없음");

t.end();
