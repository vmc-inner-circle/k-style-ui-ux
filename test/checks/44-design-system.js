// 디자인 시스템 탭(packages/core/canvas/12-design-system.js) — 입구에만 탭이 있고(보드에는 없음), 탭에 그린 대비 숫자가 scripts/looks.js audit와 같다.
// 탭은 브라우저에서 지금 칠해진 변수를 읽어 그리므로 헤드리스 Chrome으로 DOM을 받아 본다(Chrome이 없으면 건너뛴다 — CHROME=<경로>로 지정 가능).
// 샘플 2개: 예시의 맞춤 분위기(버튼 글자 기준 4.5) · 레퍼런스 토스 느낌(기준 3). 짝마다 본문/바탕 · 버튼 글자/버튼을 audit의 같은 줄과 맞춘다.
// 휴대폰 폭: 390에서 #ds를 열어 상단바 · 탭 안 잘린 요소 0 · 탭 글자 한 줄, 1440에선 두 단(test/lib.js measureCut — runs/_i2/measure.js와 같은 잼).
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite, CHROME, chromeDom, measureCut } = require("../lib.js");
const LK = require(path.join(ROOT, "scripts", "looks.js"));
const { loadScreens } = require(path.join(ROOT, "scripts", "screens.js"));

const t = suite("44 디자인 시스템 탭");
// 배치(시안 A): 소스에 두 단 규칙(grid 두 칸)과 모바일 견본 고침 줄이 있다 — Chrome 없이도 본다
{
  const css = fs.readFileSync(path.join(ROOT, "packages", "core", "canvas", "canvas.css"), "utf8");
  /\.hx-ds-body\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0,\s*2fr\)\s*minmax\(0,\s*3fr\)/.test(css) ? t.ok("배치: 두 단 규칙(grid 두 칸)") : t.fail("배치: .hx-ds-body의 두 단 규칙(grid 두 칸)이 없음");
  /\.hx-ds \.app\.hx-ds-figs\s*\{[^}]*flex-direction:\s*row/.test(css) ? t.ok("배치: 모바일 견본 고침 줄") : t.fail("배치: .hx-ds .app.hx-ds-figs { flex-direction: row } 줄이 없음");
}
if (!CHROME) { t.skip("Chrome이 없어 건너뜀 (CHROME=<경로>)"); t.end(); }

const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const htmlAttrs = (h) => attrsOf(/<html\b[^>]*>/.exec(h)[0]);
// 탭이 그린 대비 줄: { "<글자 변수>/<바탕 변수>": { ratio, min } }
const ratios = (h) => Object.fromEntries([...h.matchAll(/<li class="hx-ds-ratio[^"]*"[^>]*>/g)].map((m) => attrsOf(m[0]))
  .map((a) => [`${a["data-fg"]}/${a["data-bg"]}`, { ratio: +a["data-ratio"], min: a["data-min"] === "" ? null : +a["data-min"] }]));
const SAMPLE = [["본문/bg", "--c-text/--c-bg"], ["버튼 글자/버튼", "--c-primary-fg/--c-primary"]];

const w = workCopy();
try {
  run("ids.js", w.run); run("expand.js", w.run);
  const file = path.join(w.run, "screens.json"), S0 = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = path.join(w.run, "out");

  // ---------- 보드: 탭 버튼이 없다 ----------
  const b = run("build.js", w.run, "--mode", "board");
  if (b.code !== 0) t.fail(`board build 실패\n${b.out}`);
  else {
    const h = chromeDom(path.join(out, "board.html"));
    /<button[^>]*class="hx-bd-tab[^"]*"[^>]*>[\s\S]*?디자인 시스템<\/button>/.test(h) ? t.fail("보드에 '디자인 시스템' 탭이 있음 (입구에만 두기로 함)") : t.ok("보드에 '디자인 시스템' 탭 없음");
  }

  // ---------- 입구: 탭 + 대비 숫자 = audit ----------
  const sample = (what, change) => {
    const S = JSON.parse(JSON.stringify(S0)); change(S);
    fs.writeFileSync(file, JSON.stringify(S, null, 2));
    const r = run("build.js", w.run, "--mode", "final");
    if (r.code !== 0) { t.fail(`${what}: final build 실패\n${r.out}`); return; }
    const h = chromeDom(path.join(out, "index.html"), "#ds");
    if (!/id="hx-tab-ds"[^>]*aria-selected="true"/.test(h)) { t.fail(`${what}: 입구에 '디자인 시스템' 탭이 없거나 #ds로 열리지 않음`); return; }
    t.ok(`${what}: 입구에 '디자인 시스템' 탭 (#ds로 열림)`);
    const A = htmlAttrs(h), L = LK.getLooks(loadScreens(w.run)).find((l) => l.id === A["data-theme"]);
    if (!L) { t.fail(`${what}: 분위기 '${A["data-theme"]}'를 찾지 못함`); return; }
    const sw = L.swatches.find((s) => s.id === A["data-swatch"]) || L.swatches[0];
    const audit = Object.fromEntries(LK.audit(L, sw).map((x) => [x.pair, x])), drawn = ratios(h);
    for (const [pair, key] of SAMPLE) {
      const a = audit[pair], d = drawn[key];
      if (!d) t.fail(`${what}: 탭에 ${key} 대비가 없음`);
      else if (d.ratio !== a.ratio || d.min !== a.min) t.fail(`${what}: ${pair} 탭 ${d.ratio}(기준 ${d.min}) ≠ audit ${a.ratio}(기준 ${a.min})`);
      else t.ok(`${what}: ${pair} ${d.ratio} · 기준 ${d.min} = audit`);
    }
    return { h, drawn };
  };
  sample("맞춤 분위기", () => {});
  // ---------- 폭: 390 잘림 0 · 탭 한 줄 / 1440 두 단 (방금 만든 맞춤 분위기 입구) ----------
  const index = path.join(out, "index.html"), m390 = measureCut(index, 390, 844), m1440 = measureCut(index, 1440, 900);
  if (!m390 || !m1440) t.fail("폭: 390 · 1440 값을 재지 못함");
  else {
    m390.width === 390 && m390.cut === 0 ? t.ok(`390: 상단바 · 탭 잘림 0 (잰 요소 ${m390.seen})`) : t.fail(`390: 잘림 ${m390.cut}개 (폭 ${m390.width}) — ${m390.samples.join(" | ")}`);
    m390.tabWrap === 0 ? t.ok("390: 위 탭 글자 한 줄") : t.fail(`390: 위 탭 ${m390.tabWrap}개가 두 줄로 꺾임`);
    const c = m1440.cols;
    m1440.cut === 0 && c.unit < c.color && c.color === c.parts ? t.ok(`1440: 두 단 그대로 (왼쪽 x ${c.unit} · 오른쪽 x ${c.color})`) : t.fail(`1440: 두 단이 아님 또는 잘림 ${m1440.cut} — ${JSON.stringify(c)}`);
  }
  // 레퍼런스(exact) — 흰 버튼 글자 기준 3. 예시의 버튼 색(terracotta)은 warm에만 있어 지운다
  sample("레퍼런스 토스", (S) => { S.board = Object.assign({}, S.board, { theme: "toss" }); delete S.theme; if (S.toggles) delete S.toggles.swatch; });
  // 직접 고른 색(custom) — 레퍼런스가 아니라 맞춤 쪽: 버튼 글자 기준 4.5 · 근거 줄에 색 이름
  const cu = sample("직접 고른 색", (S) => { S.board = Object.assign({}, S.board, { theme: "custom" }); delete S.theme; if (S.toggles) delete S.toggles.swatch; S.custom = { hex: "#23317A", name: "남색", base: "white" }; });
  if (cu) {
    const m = (cu.drawn["--c-primary-fg/--c-primary"] || {}).min;
    m === 4.5 ? t.ok("직접 고른 색: 버튼 글자 기준 4.5") : t.fail(`직접 고른 색: 버튼 글자 기준이 ${m} (4.5여야 함)`);
    /직접 고른 색 남색 #23317A/.test(cu.h) ? t.ok("직접 고른 색: 근거 줄에 색 이름(남색)") : t.fail("직접 고른 색: 근거 줄에 '직접 고른 색 남색 #23317A'가 없음");
  }
} finally {
  w.done();
}
t.end();
