#!/usr/bin/env node
/**
 * derive.js — 화면의 '답 하나 · 나머지'(packages/core/schema/schema.json $defs.screen)에서
 * 조립 · 빌드가 쓰는 칸을 계산한다. 이 칸들은 사람도 AI도 쓰지 않는다 — 같은 사실을 두 칸에 적지 않기 위해.
 *
 *   focus     = answer.key
 *   regions   = [answer, ...rest] — { key, label, why, form, items, content, level, pos } (pos = 읽는 순서, answer 0) (answer 1, rest 2 · 배열 순서 = 읽는 순서)
 *   emphasize = answer.say  (1순위 문장)
 *   purpose   = goal        (조립 지시 '목적:' 줄 — pack.js가 읽는다)
 *   data      = answer.facts ∪ rest[].facts (순서 유지 · 중복 없음)
 *   defer     = later
 *   file      = screens/<slug>.html (적혀 있지 않으면) · 영역 id = 100 + 화면 id × 10 + pos
 *
 *   node scripts/derive.js <screens.json>   계산한 칸을 표로 찍는다(파일은 고치지 않는다)
 */
const fs = require("fs");

function derive(s) {
  if (!s || !s.answer) return s;   // 옛 형식(regions를 직접 쓴 화면)은 그대로
  const a = s.answer, rest = s.rest || [];
  const content = (r) => (r.items || []).join(" / ");
  const regions = [a, ...rest].map((r, i) => ({ key: r.key, label: r.label, why: r.why, form: r.form, items: r.items || [], content: content(r), level: i === 0 ? 1 : 2, pos: i }));
  // 주 버튼(action)도 영역 하나 — 흐름이 region "action"으로 가리키고, 조각에 data-region="action"으로 놓인다
  if (s.action) regions.push({ key: "action", label: s.action.label, why: "이 화면의 주 버튼", form: "actions", items: [s.action.label], content: s.action.label, level: 2, pos: regions.length });
  const data = [...new Set([a, ...rest].flatMap((r) => r.facts || []))];
  // 영역 번호: 화면 번호 × 10 + 읽는 순서 + 100 — 블록 순서가 같으면 라운드가 바뀌어도 같다(보드 의견 번호)
  if (Number.isInteger(s.id)) regions.forEach((r) => (r.id = 100 + s.id * 10 + r.pos));
  return Object.assign({}, s, { focus: a.key, regions, emphasize: a.say, purpose: s.purpose || s.goal, data, defer: s.later || [], file: s.file || `screens/${s.slug}.html` });
}

module.exports = { derive };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node scripts/derive.js <screens.json>"); process.exit(2); }
  const S = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const s of (S.screens || []).map(derive)) {
    console.log(`${s.slug}  focus=${s.focus}  순위=${(s.regions || []).map((r) => r.level).join("-")}  1순위 모양=${(s.regions || [])[0]?.form || ""}`);
    console.log(`  1순위 문장: ${s.emphasize || ""}`);
  }
}
