// B26 큰 글자 줄바꿈 — 긴 .big-num 은 WARN, .nowrap 으로 묶은 조각은 WARN 없음.
const fs = require("fs");
const path = require("path");
const { run, suite, ROOT, workCopy } = require("../lib.js");

const t = suite("17 큰 글자 끊김 (B26)");
const w0 = workCopy();
try {
  const cssOf = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
  if (/\.nowrap\s*\{[^}]*white-space:\s*nowrap/.test(cssOf("packages/web/components/30-display.css"))) t.ok(".nowrap 묶음 클래스 있음");
  else t.fail("30-display.css에 .nowrap 없음");
  if (/\.big-num\s*\{[^}]*text-wrap:\s*balance/.test(cssOf("packages/mobile/components/10-mobile-layout.css"))) t.ok("모바일 .big-num에 text-wrap: balance");
  else t.fail(".big-num에 text-wrap: balance 없음");

  // 고정 입력(sample)을 모바일로 바꿔 home 조각에 big-num 을 넣어 본다
  {
    const warnsFor = (bigNum) => {
      const w = path.join(w0.dir, "r" + Math.random().toString(36).slice(2));
      fs.cpSync(w0.run, w, { recursive: true });
      const sf = path.join(w, "screens.json");
      const sc = JSON.parse(fs.readFileSync(sf, "utf8"));
      sc.platform = "mobile";
      fs.writeFileSync(sf, JSON.stringify(sc));
      const f = path.join(w, sc.screens.find((x) => !x.overlayOf).file);
      fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/<main class="content">/, `<main class="content">\n<p class="big-num">${bigNum}</p>`));
      run("ids.js", w);
      return run("lint.js", w).out.split("\n").filter((l) => /\.big-num/.test(l));
    };
    if (warnsFor("11월 14일(토) 오전 7시").length === 1) t.ok("긴 큰 글자 → WARN 1개");
    else t.fail("긴 .big-num에 WARN이 안 나거나 여러 개");
    if (warnsFor('<span class="nowrap">11월 14일(토)</span> <span class="nowrap">오전 7시</span>').length === 0) t.ok(".nowrap으로 묶으면 WARN 없음");
    else t.fail(".nowrap으로 묶었는데 WARN");
    if (warnsFor("D-24").length === 0) t.ok("짧은 큰 글자는 WARN 없음");
    else t.fail("짧은 .big-num에 WARN");
  }
} finally {
  w0.done();
}
t.end();
