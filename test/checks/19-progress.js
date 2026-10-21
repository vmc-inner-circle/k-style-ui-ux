// 저장소 검사 — 진행 막대(.progress · .progress-bar)가 놓인 판(35-creative.css의 poster · scroll-row · bento)에 따라 커지지 않는다.
// 화면을 그려 보지 않고 CSS 글자만 읽어서 본다 — 높이가 부모 높이(100%)에 기대면 늘어나는 판 안에서 덩어리가 된다.
const fs = require("fs");
const path = require("path");
const { ROOT, suite } = require("../lib.js");

const t = suite("19 진행 막대");
const DIR = path.join(ROOT, "packages", "web", "components");
const read = (f) => fs.readFileSync(path.join(DIR, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const rules = (src) => [...src.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
const has = (b, prop) => new RegExp(`(^|[;\\s])${prop}\\s*:`).test(b);

const display = rules(read("30-display.css"));
const bar = display.find((r) => r.sel === ".progress-bar");
const track = display.find((r) => r.sel === ".progress");
if (!bar || !track) { t.fail(".progress · .progress-bar 규칙을 30-display.css에서 못 찾음"); t.end(); }

// 막대 혼자 놓여도 높이가 정해져 있다(100%가 아니다)
if (/height\s*:\s*[^;]*%/.test(bar.body)) t.fail(`.progress-bar 기본 높이가 % 값: ${bar.body.trim()}`);
else if (!has(bar.body, "height")) t.fail(".progress-bar에 고정 높이가 없음");
else t.ok(".progress-bar 높이는 부모에 기대지 않는다");
if (!has(bar.body, "flex")) t.fail(".progress-bar에 flex: none이 없음");
else t.ok(".progress-bar flex: none");
if (!has(track.body, "height") || !has(track.body, "flex")) t.fail(".progress에 고정 높이 · flex: none이 있어야 함");
else t.ok(".progress 고정 높이 · flex: none");

// 35-creative.css 규칙이 .progress 높이를 건드리지 못한다
const hits = rules(read("35-creative.css")).filter((r) => /\.progress/.test(r.sel) && /\b(height|align-self|flex)\b/.test(r.body));
if (hits.length) hits.forEach((r) => t.fail(`35-creative.css가 진행 막대 크기를 바꿈: ${r.sel}`));
else t.ok("35-creative.css는 진행 막대 크기를 건드리지 않는다");
// 판의 자식 규칙(> *)이 높이를 주지 않는다 — 있으면 .progress 높이와 겹치는지 따져야 한다
const stretchy = rules(read("35-creative.css")).filter((r) => />\s*\*/.test(r.sel) && /\b(height|align-self)\s*:/.test(r.body));
if (stretchy.length) stretchy.forEach((r) => t.fail(`판의 모든 자식에 높이를 주는 규칙: ${r.sel}`));
else t.ok("판의 모든 자식에 높이를 주는 규칙 없음");
t.end();
