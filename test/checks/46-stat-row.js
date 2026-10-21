// B35 숫자 칸 4개 줄바꿈 — 휴대폰(390)에서 .stat-row 4칸이 두 칸씩 줄바꿈되어 잘림 0 · 글자 꺾임 0, 5칸 이상이면 lint WARN.
// 폭은 사진이 아니라 test/lib.js measureCut(390 iframe)으로 잰다 (Chrome이 없으면 폭 시험은 건너뛴다).
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite, CHROME, measureCut } = require("../lib.js");

const t = suite("46 숫자 칸 줄바꿈 (B35)");
const css = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
/\.app-mobile \.stat-row:has\([^{]*\)\s*\{[^}]*display:\s*grid;[^}]*repeat\(2,/.test(css("packages/mobile/components/10-mobile-layout.css")) ? t.ok("모바일 .stat-row: 3칸 이상이면 grid 2열") : t.fail("10-mobile-layout.css에 .stat-row grid 2열 규칙 없음");
/\.stat-value\s*\{[^}]*white-space:\s*nowrap/.test(css("packages/web/components/30-display.css")) ? t.ok(".stat-value 숫자 · 단위 한 덩어리 (nowrap)") : t.fail("30-display.css의 .stat-value에 white-space: nowrap 없음");

const stat = (label, value, unit) => `<div class="stat"><span class="stat-label">${label}</span><span class="stat-value">${value}<small>${unit}</small></span></div>`;
const FOUR = [["출발까지 남은 날", "58", "일"], ["함께 가는 사람", "12", "명"], ["남은 준비물", "7", "개"], ["모인 회비", "1,340,000", "원"]];
const w = workCopy();
try {
  const sf = path.join(w.run, "screens.json"), sc = JSON.parse(fs.readFileSync(sf, "utf8"));
  sc.platform = "mobile";
  fs.writeFileSync(sf, JSON.stringify(sc));
  const home = path.join(w.run, "screens", sc.screens.find((x) => !x.overlayOf).file.replace(/^screens\//, ""));
  const base = fs.readFileSync(home, "utf8");
  const withStats = (list) => fs.writeFileSync(home, base.replace(/<main class="content">/, `<main class="content">\n<div class="stat-row">${list.map((s) => stat(...s)).join("")}</div>`));

  // lint: 5칸부터 WARN
  const statWarns = () => { run("ids.js", w.run); return run("lint.js", w.run).out.split("\n").filter((l) => /숫자 칸\(\.stat\)/.test(l)); };
  withStats(FOUR);
  statWarns().length === 0 ? t.ok("숫자 칸 4개 → WARN 없음") : t.fail("숫자 칸 4개인데 WARN");
  withStats(FOUR.concat([["더", "1", "개"]]));
  statWarns().length === 1 ? t.ok("숫자 칸 5개 → WARN 1개") : t.fail("숫자 칸 5개에 WARN이 안 나거나 여러 개");

  // 폭: 4칸 → 390에서 잘림 0 · 글자 꺾임 0, 칸이 2×2로 놓임
  if (!CHROME) t.skip("Chrome이 없어 폭 시험 건너뜀 (CHROME=<경로>)");
  else {
    withStats(FOUR);
    run("ids.js", w.run); run("expand.js", w.run);
    const b = run("build.js", w.run, "--mode", "final");
    const page = path.join(w.run, "out", "screens");
    const file = b.code === 0 && fs.existsSync(page) ? fs.readdirSync(page).find((f) => /home/.test(f)) : null;
    if (!file) t.fail(`final build 실패 또는 home 화면 없음\n${b.out}`);
    else {
      const m = measureCut(path.join(page, file), 390, 844, null, ".stat-row, .stat-row *");
      if (!m || m.seen < 4) t.fail("390: 숫자 칸을 재지 못함");
      else {
        m.width === 390 && m.cut === 0 ? t.ok(`390: 숫자 칸 잘림 0 (잰 요소 ${m.seen})`) : t.fail(`390: 잘림 ${m.cut}개 (폭 ${m.width}) — ${m.samples.join(" | ")}`);
        m.statWrap === 0 ? t.ok("390: 글자 한 줄") : t.fail(`390: 숫자 칸 글자 ${m.statWrap}개가 두 줄로 꺾임`);
      }
    }
  }
} finally {
  w.done();
}
t.end();
