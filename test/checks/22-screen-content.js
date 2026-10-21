// 스키마 — 화면의 '답 하나 · 나머지'(메인 스키마 schema.json $defs.screen)와 derive.js.
// 예시(test/fixtures/project/<이름>/screens.json — 가족여행 5 · 카페 4화면, 메인 스키마로 Opus가 채운 것)가 형식을 지키고,
// derive가 1순위를 정확히 하나로 · 영역 key를 겹치지 않게 · 쓰는 사실을 facts 이름표에서만 계산하는지 본다.
const fs = require("fs");
const path = require("path");
const { ROOT, suite } = require("../lib.js");
const { shape } = require(path.join(ROOT, "scripts", "schema.js"));
const { derive } = require(path.join(ROOT, "scripts", "derive.js"));

const t = suite("22 화면 내용 · 위계");
const DIR = path.join(ROOT, "test", "fixtures", "project");
for (const f of fs.readdirSync(DIR)) {
  const screens = JSON.parse(fs.readFileSync(path.join(DIR, f, "screens.json"), "utf8")).screens || [];
  let bad = 0;
  for (const s of screens) {
    const errs = shape(s, "screen", `${f}:${s.slug}`);
    errs.forEach((e) => { bad++; t.fail(e); });
    const d = derive(s);
    const ones = d.regions.filter((r) => r.level === 1);
    if (ones.length !== 1 || ones[0].key !== d.focus) { bad++; t.fail(`${f}:${s.slug}: 1순위가 하나가 아님`); }
    const keys = d.regions.map((r) => r.key);
    if (new Set(keys).size !== keys.length) { bad++; t.fail(`${f}:${s.slug}: 영역 key가 겹침 (${keys.join(",")})`); }
    if (d.emphasize !== s.answer.say) { bad++; t.fail(`${f}:${s.slug}: 1순위 문장이 answer.say와 다름`); }
  }
  if (!bad) t.ok(`${f}: 화면 ${screens.length}개 형식 통과 · 1순위 하나 · key 겹침 없음`);
}
t.end();
