// 색 역할(DS3, docs/design-system.md §2) — 부품 CSS가 맞는 역할을 쓴다.
// 글자 · UI 아이콘은 --c-primary-text, 꾸밈 · 표시선 · 브랜드 아이콘은 --c-brand. 버튼 채움(--c-primary)을 글자색으로 쓰지 않는다.
const fs = require("fs");
const path = require("path");
const { ROOT, suite, walk } = require("../lib.js");
const LK = require(path.join(ROOT, "scripts", "looks.js"));

const t = suite("42 색 역할");
// CSS 읽기 — 규칙(선택자 · 선언)만. 주석은 지운다
const rulesOf = (f) => [...fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ sel: m[1].trim().replace(/\s+/g, " "), decl: Object.fromEntries(m[2].split(/;(?![^(]*\))/).map((d) => d.trim()).filter(Boolean).map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()])) }));

// 버튼 채움을 글자색으로 쓴 곳 — border-color 같은 '-color'는 빼고 color 칸만
const parts = ["packages/web/components", "packages/mobile/components"].flatMap((d) => walk(d, (f) => f.endsWith(".css")));
const asText = parts.flatMap((f) => rulesOf(f).filter((r) => r.decl.color === "var(--c-primary)").map((r) => `${r.sel} (${path.basename(f)})`));
if (asText.length) t.fail(`color: var(--c-primary) ${asText.length}곳 — 글자는 --c-primary-text: ${asText.join(" · ")}`);
else t.ok(`부품 CSS ${parts.length}개 — color: var(--c-primary) 0곳`);

// 꾸밈 · 표시선 자리는 --c-brand
const want = [
  ["packages/web/components/00-layout.css", ".topnav-brand .icon", "color", "var(--c-brand)"],
  ["packages/web/components/30-display.css", ".tab.active", "border-bottom-color", "var(--c-brand)"],
  ["packages/web/components/40-data.css", ".calendar-day.today", "box-shadow", "var(--c-brand)"],
  ["packages/core/tokens/dress.css", '[data-bg="glow"] .app .content', "background-image", "var(--c-brand)"],
  ["packages/core/tokens/dress.css", '[data-tone="soft"] .app', "--m-card-bg", "var(--c-brand)"],
  ["packages/core/tokens/dress.css", '[data-tone="soft"] .app .card', "background", "var(--c-brand)"],
  // 진한 색 판 안에서는 브랜드 색도 판 글자색으로 — 없으면 판과 같은 색이라 탭 밑줄 · 오늘 테두리가 사라진다
  ["packages/core/tokens/dress.css", '[data-tone="bold"] .app .content:not(:has(.hero, .tile-primary, .poster)) > .page-header + :is(.section, .card)', "--c-brand", "var(--dress-pf)"],
];
for (const [f, sel, prop, part] of want) {
  const r = rulesOf(f).find((x) => x.sel.split(/,\s*(?![^(]*\))/).includes(sel));
  const v = r && r.decl[prop];
  if (v && v.includes(part)) t.ok(`${sel} { ${prop} } — ${part}`);
  else t.fail(`${path.basename(f)} ${sel} { ${prop} } = ${v || "없음"} (기대 ${part} 포함)`);
}

// looks.js가 --c-brand를 내보낸다 — 레퍼런스 프리셋 모두 · 맞춤 분위기(바탕 셋)
const own = require(path.join(__dirname, "..", "fixtures", "sample", "screens.json")).looks;
const looks = [...LK.PRESETS, ...[{ from: own[0].id }, { base: "white" }, { base: "dark" }].map((b) => LK.customLook(Object.assign({ hex: "#1F8A84" }, b), own))];
const noBrand = looks.flatMap((L) => L.swatches.filter((sw) => !/^#[0-9A-F]{6}$/i.test(LK.swatchTokens(L, sw)["--c-brand"] || "")).map((sw) => `${L.id || L.base}/${sw.id}`));
if (noBrand.length) t.fail(`swatchTokens에 --c-brand 없음: ${noBrand.join(" · ")}`);
else t.ok(`swatchTokens — 분위기 ${looks.length}개 × 버튼 색 모두 --c-brand 있음`);
t.end();
