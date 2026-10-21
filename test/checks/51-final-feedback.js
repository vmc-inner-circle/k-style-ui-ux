// G3 — 완성본 입구(out/index.html)에서 의견 보내기 (사람 결정 2026-10-21 "시안 보드 -> 완성본으로 할 수 있도록 하자").
// 초안 보드의 '화면 디자인' 탭(24-board-screens.js)과 상태 · 보내기(20-board.js · 23-board-send.js)를 완성본에서도 그대로 쓴다.
// 샘플 실행물(test/fixtures/sample)을 final로 build해서 진짜 Chrome에서:
//   탭 다섯 [사용 흐름][흐름 재생][화면 디자인][화면 전체][디자인 시스템] · 상단바 '의견 보내기' ·
//   화면 디자인에서 제목을 골라 '바꿔주세요' 메모 + A+ → 보내기 글 첫 줄 '완성본 1차 의견' + 두 줄 · 보내기 창에 그 말 · 새로고침 뒤에도 그대로 ·
//   저장 열쇠가 보드(hx:<p>:1)와 섞이지 않음 · 콘솔 오류 0
// 의견을 안 남겼을 때: board를 지운 입구(= 예전 입구)와 사용 흐름 · 화면 전체 · 디자인 시스템 탭이 같다(화면 수 · 글자).
// 폭: 1440 · 390에서 상단바 · 화면 디자인 탭 · 보내기 창 잘림 0. 1440 사진은 runs/_g3/에 남긴다(지우지 않는다).
// 화면별 독립 페이지(out/screens/*.html)에는 의견 도구가 없다. Chrome이 없으면 브라우저 시험은 건너뛴다.
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite, CHROME, chromeDom, measureCut, withClicks, clicked } = require("../lib.js");

const t = suite("51 완성본에서 의견 보내기");
const TABS = ["사용 흐름", "흐름 재생", "화면 디자인", "화면 전체", "디자인 시스템"];
const LINE = "화면 1 · 제목 '홈' 바꿔: 더 크게 [div > main > div:1 > div > h1]";
const SIZE = "화면 1 · 제목 '홈' 크기 +1단계 [div > main > div:1 > div > h1]";   // 직접 고치기(A+) — 26-board-edit.js 줄 문법 그대로

const w = workCopy("sample");
try {
  const ids = run("ids.js", w.run), b = run("build.js", w.run, "--mode", "final");
  if (ids.code !== 0 || b.code !== 0) { t.fail(`build 실패\n${ids.out}\n${b.out}`); t.end(); }
  const out = path.join(w.run, "out"), index = path.join(out, "index.html"), html = fs.readFileSync(index, "utf8");

  // ---------- 브라우저 없이: 데이터 · 화면별 페이지 ----------
  const data = JSON.parse(/<script type="application\/json" id="hx-data">([\s\S]*?)<\/script>/.exec(html)[1]);
  data.board && typeof data.board === "object" ? t.ok("입구 데이터에 board (화면 디자인 탭이 읽는 질문 · 잠금)") : t.fail("입구 데이터에 board가 없음");
  /id="hx-icons"/.test(html) ? t.ok("입구에 아이콘 바꾸기 목록(hx-icons)") : t.fail("입구에 hx-icons가 없음 — 화면 디자인의 아이콘 바꾸기가 빈 목록");
  const pages = fs.readdirSync(path.join(out, "screens")).filter((f) => f.endsWith(".html"));
  const leak = pages.filter((f) => /hx-bd-copy|hx-sd-list|id="hx-icons"/.test(fs.readFileSync(path.join(out, "screens", f), "utf8")));
  pages.length && !leak.length ? t.ok(`화면별 독립 페이지 ${pages.length}개에 의견 도구 없음`) : t.fail(`화면별 페이지에 의견 도구: ${leak.join(", ") || "페이지 없음"}`);

  if (!CHROME) { t.skip("Chrome 없음 — 브라우저 시험 건너뜀"); t.end(); }
  const put = (name, head, tail) => { const f = path.join(out, name); fs.writeFileSync(f, html.replace(/<head>/, "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>")); return f; };

  // ---------- 고르기 · 메모 · 보내기 창 · 새로고침 ----------
  const HELPERS = `
var B = HX.board, Q = function (s) { return document.querySelector(".hx-sd-frame .hx-screen " + s); };
function click(el) { var r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); }
function tabs() { return [].map.call(document.querySelectorAll(".hx-bar .hx-tab"), function (b) { return b.textContent.trim(); }); }
function leave() {   // 화면 디자인 탭을 눌러 홈을 열고 제목을 골라 '바꿔주세요' + 메모
  [].filter.call(document.querySelectorAll(".hx-bar .hx-tab"), function (b) { return b.textContent.trim() === "화면 디자인"; })[0].click();
  B.showDesign("home");
  click(Q(".page-title"));
  document.querySelector(".hx-sd-choice.hx-v-change").click();
  var m = document.querySelector(".hx-sd-memo"); m.value = "더 크게"; m.dispatchEvent(new Event("input", { bubbles: true }));
}`;
  const ERRS = `<script>
(function () {
  var errs = JSON.parse(sessionStorage.getItem("g3-errs") || "[]"), ce = console.error;
  console.error = function () { errs.push([].map.call(arguments, String).join(" ")); sessionStorage.setItem("g3-errs", JSON.stringify(errs)); return ce.apply(console, arguments); };
  addEventListener("error", function (e) { errs.push("error: " + e.message); sessionStorage.setItem("g3-errs", JSON.stringify(errs)); });
})();
</script>`;
  const FLOW = `<script>${HELPERS}
addEventListener("load", function () { setTimeout(function () {
  var phase = sessionStorage.getItem("g3-phase");
  function done(o) { o.errs = JSON.parse(sessionStorage.getItem("g3-errs") || "[]"); var s = document.createElement("script"); s.type = "application/json"; s.id = "hx-g3"; s.textContent = JSON.stringify(o); document.body.appendChild(s); }
  try {
    if (!phase) {
      var o = { tabs: tabs(), send: !!document.querySelector(".hx-bar .hx-bd-copy"), sendLabel: (document.querySelector(".hx-bar .hx-bd-copy") || {}).textContent };
      leave();
      [].filter.call(document.querySelectorAll(".hx-ed-acts button"), function (x) { return x.textContent === "A+"; })[0].click();
      setTimeout(function () {
        try {
          o.answer = B.answer(); o.label = document.querySelector(".hx-bar .hx-bd-copy").textContent; o.pins = document.querySelectorAll(".hx-sd-pinrow").length;
          document.querySelector(".hx-bar .hx-bd-copy").click();
          var m = document.querySelector(".hx-send"); o.modal = m ? m.innerText : ""; o.raw = m ? m.querySelector("textarea").value : "";
          sessionStorage.setItem("g3-before", JSON.stringify(o)); sessionStorage.setItem("g3-phase", "2");
          setTimeout(function () { location.reload(); }, 400);
        } catch (e) { done({ error: "1단계: " + e.message }); }
      }, 300);
      return;
    }
    B.showDesign("home");
    setTimeout(function () {
      try {
        done({ before: JSON.parse(sessionStorage.getItem("g3-before")), after: { answer: B.answer(), pins: document.querySelectorAll(".hx-sd-pinrow").length, label: document.querySelector(".hx-bar .hx-bd-copy").textContent },
          keys: Object.keys(localStorage).filter(function (k) { return /^hx:/.test(k); }) });
      } catch (e) { done({ error: "2단계: " + e.message }); }
    }, 300);
  } catch (e) { done({ error: e.message }); }
}, 300); });
</script>`;
  const dom = chromeDom(put("g3-flow.html", ERRS, FLOW), "", [1440, 900]);
  const m = /<script type="application\/json" id="hx-g3">([\s\S]*?)<\/script>/.exec(dom), r = m ? JSON.parse(m[1]) : null;
  if (!r) { t.fail("페이지가 결과를 적지 않음(스크립트가 끝나지 않았다)"); t.end(); }
  if (r.error) { t.fail(`페이지 스크립트: ${r.error}${r.errs && r.errs.length ? " · 콘솔: " + r.errs.join(" / ") : ""}`); t.end(); }
  const x = r.before;
  x.tabs.join("|") === TABS.join("|") ? t.ok(`탭 다섯: ${x.tabs.join(" · ")}`) : t.fail(`탭: ${x.tabs.join(" · ")}`);
  x.send && /^의견 보내기$/.test(x.sendLabel.trim()) ? t.ok("상단바 오른쪽 '의견 보내기' (의견 없을 때 숫자 없음)") : t.fail(`의견 보내기 단추: ${x.send} '${x.sendLabel}'`);
  const lines = x.answer.split("\n");
  lines[0] === "완성본 1차 의견" ? t.ok("보내기 글 첫 줄 '완성본 1차 의견'") : t.fail(`보내기 글 첫 줄: '${lines[0]}'`);
  lines.includes(LINE) && lines[lines.length - 1] === "(나머지는 추천대로)" ? t.ok(`보내기 글에 고른 곳 줄: ${LINE}`) : t.fail(`보내기 글:\n${x.answer}`);
  lines.includes(SIZE) ? t.ok(`보내기 글에 직접 고친 줄: ${SIZE}`) : t.fail(`보내기 글에 크기 줄이 없음:\n${x.answer}`);
  /^테마 /.test(lines[1]) ? t.ok("둘째 줄부터 보드와 같은 문법 (테마 줄)") : t.fail(`둘째 줄: '${lines[1]}'`);
  x.label.trim() === "의견 보내기 · 2개" && x.pins === 1 ? t.ok("단추 숫자 2개 · '이 화면에 남긴 의견' 1줄") : t.fail(`단추 '${x.label}' · 의견 줄 ${x.pins}`);
  x.raw === x.answer && /더 크게/.test(x.modal) && /완성본에 한 번 더 반영/.test(x.modal) ? t.ok("보내기 창: 고른 곳 · 메모 · 완성본 안내, 복사 글 = 보내기 글") : t.fail(`보내기 창:\n${x.modal}`);
  r.after.answer === x.answer && r.after.pins === 1 && r.after.label === x.label ? t.ok("새로고침 뒤에도 의견 · 보내기 글 그대로") : t.fail(`새로고침 뒤: ${JSON.stringify(r.after)}`);
  r.keys.length && r.keys.every((k) => /^hx:[^:]+:final:1$/.test(k) || /^hx:board:/.test(k)) ? t.ok(`저장 열쇠: ${r.keys.join(", ")} (보드 열쇠와 따로)`) : t.fail(`저장 열쇠: ${r.keys.join(", ")}`);
  r.errs.length ? t.fail(`콘솔 오류 ${r.errs.length}개: ${r.errs.slice(0, 3).join(" / ")}`) : t.ok("콘솔 오류 0");

  // ---------- 의견 없을 때: 다른 탭은 board를 지운 입구(예전 입구)와 같다 ----------
  const off = path.join(out, "g3-off.html");
  fs.writeFileSync(off, html.replace(/("board":)\{[^]*?\}(,"dressCats":)/, "$1null$2"));
  const REPORT = `var v = function (k) { var e = document.querySelector('[aria-labelledby="hx-tab-' + k + '"]'); return e ? { frames: e.querySelectorAll(".hx-frame").length, text: e.innerText.replace(/자세히 보기/g, "").replace(/\\s+/g, " ").trim() } : null; };
    return { map: v("map"), all: v("all"), ds: v("ds"), n: HX.data.screens.length, board: !!HX.data.board };`;
  const look = (f, hash) => clicked(chromeDom(withClicks(f, [], REPORT), hash, [1440, 900]));
  for (const [hash, key, name] of [["#map", "map", "사용 흐름"], ["#all", "all", "화면 전체"], ["#ds", "ds", "디자인 시스템"]]) {
    const on = look(index, hash), was = look(off, hash);
    if (!on || !was || !on.report || !was.report) { t.fail(`${name}: 잴 수 없음`); continue; }
    const a = on.report[key], z = was.report[key];
    if (!on.report.board || was.report.board) { t.fail(`${name}: 비교할 두 입구가 board 있음 · 없음이 아님`); continue; }
    a && z && a.frames === z.frames && a.text === z.text && (key === "ds" || a.frames >= on.report.n)
      ? t.ok(`${name}: 의견 없을 때 예전 입구와 같음 (화면 ${a.frames})`) : t.fail(`${name}: 다름 — 지금 ${JSON.stringify(a).slice(0, 200)} / 예전 ${JSON.stringify(z).slice(0, 200)}`);
  }

  // ---------- H1: 완성본에서도 '자세히 보기' 창에서 바로 고치기 (사람 의견 2026-10-21 "완성 시에도 지금처럼 수정할 수 있도록") ----------
  // 사용 흐름 이름표 '자세히 보기' → 창에 고치기 도구 → 고쳐 쓰기 → 보내기 줄 · 화면 디자인 탭 목록 · 작은 화면에도 · 새로고침 유지
  // 화면 전체 대지 이름 옆 '자세히 보기' → 같은 창 · 같은 고친 모습
  const ZH = `
function mouse(el, type) { var r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); }
function rewrite(el, s) { mouse(el, "dblclick"); el.firstChild.data = s; el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); }
function steps(list, fail) { var i = 0; (function next() { if (i >= list.length) return; var f = list[i++]; setTimeout(function () { try { f(); next(); } catch (e) { fail(e); } }, 300); })(); }
function MZ(s) { return document.querySelector(".hx-modal .hx-sd-frame .hx-screen " + s); }
function openMap() { HX.final.select("map"); var b = document.querySelector('.hx-sx-pick[aria-label="자세히 보기 — 홈"]'); if (!b) throw new Error("사용 흐름에 '자세히 보기 — 홈' 없음"); b.click(); if (!MZ(".page-title")) throw new Error("창에 고칠 화면 없음"); }
function openAll() { HX.final.select("all"); var b = document.querySelector('.hx-cv-open[aria-label="자세히 보기 — 홈"]'); if (!b) throw new Error("화면 전체에 '자세히 보기 — 홈' 없음"); b.click(); if (!MZ(".page-title")) throw new Error("화면 전체 창에 고칠 화면 없음"); }`;
  const ZRUN = `<script>${ZH}
addEventListener("load", function () { setTimeout(function () {
  var B = HX.board, out = JSON.parse(sessionStorage.getItem("h1-out") || "{}"), phase = sessionStorage.getItem("h1-phase");
  function done(o) { o.errs = JSON.parse(sessionStorage.getItem("g3-errs") || "[]"); var s = document.createElement("script"); s.type = "application/json"; s.id = "hx-h1"; s.textContent = JSON.stringify(o); document.body.appendChild(s); }
  function fail(e) { done({ error: (phase ? "2단계: " : "1단계: ") + e.message }); }
  if (!phase) steps([
    function () { openMap(); out.tools = !!document.querySelector(".hx-modal .hx-ed-list, .hx-modal .hx-ed-rows, .hx-modal [class*=hx-ed]"); rewrite(MZ(".page-title"), "우리 홈"); },
    function () { out.zoomH1 = MZ(".page-title").textContent; HX.closeModal(); },
    function () {
      out.answer = B.answer(); var sm = document.querySelector('.hx-sx-board[data-screen="home"] .page-title'); out.small = sm ? sm.textContent : null;
      HX.final.select("design"); B.showDesign("home");
    },
    function () { out.list = [].map.call(document.querySelectorAll(".hx-ed-row"), function (r) { return r.textContent; }); openAll(); },
    function () { out.allH1 = MZ(".page-title").textContent; HX.closeModal(); var a = document.querySelector('.hx-cv-board[data-screen="home"] .page-title'); out.allSmall = a ? a.textContent : null;
      sessionStorage.setItem("h1-out", JSON.stringify(out)); sessionStorage.setItem("h1-phase", "2"); setTimeout(function () { location.reload(); }, 400); }
  ], fail);
  else steps([ function () { openMap(); out.reH1 = MZ(".page-title").textContent; out.reAnswer = B.answer(); done(out); } ], fail);
}, 300); });
</script>`;
  {
    const dz = chromeDom(put("h1-zoom.html", ERRS, ZRUN), "", [1440, 900]);
    const mz = /<script type="application\/json" id="hx-h1">([\s\S]*?)<\/script>/.exec(dz), z = mz ? JSON.parse(mz[1]) : null;
    if (!z) t.fail("H1: 페이지가 결과를 적지 않음");
    else if (z.error) t.fail(`H1: ${z.error}${z.errs && z.errs.length ? " · 콘솔: " + z.errs.join(" / ") : ""}`);
    else {
      const TXT = "화면 1 · 제목 '홈' 고쳐 쓰기: '홈' → '우리 홈' [div > main > div:1 > div > h1]";
      z.zoomH1 === "우리 홈" && z.answer.split("\n").includes(TXT) ? t.ok(`완성본 사용 흐름 '자세히 보기' 창에서 고쳐 쓰기 → 보내기 줄: ${TXT}`) : t.fail(`완성본 창 고쳐 쓰기: ${JSON.stringify({ h1: z.zoomH1, tools: z.tools })}\n${z.answer}`);
      z.small === "우리 홈" && z.allSmall === "우리 홈" ? t.ok("고친 모습이 사용 흐름 · 화면 전체의 작은 화면에도") : t.fail(`작은 화면: 사용 흐름 '${z.small}' · 화면 전체 '${z.allSmall}'`);
      z.list.some((x) => /우리 홈/.test(x)) ? t.ok(`화면 디자인 탭 '고친 것' 목록에도: ${z.list.length}줄`) : t.fail(`화면 디자인 목록: ${JSON.stringify(z.list)}`);
      z.allH1 === "우리 홈" ? t.ok("화면 전체 '자세히 보기' → 같은 창 · 같은 고친 모습") : t.fail(`화면 전체 창 제목: '${z.allH1}'`);
      z.reH1 === "우리 홈" && z.reAnswer === z.answer ? t.ok("새로고침 뒤 다시 열어도 그대로 · 보내기 글 같음") : t.fail(`새로고침 뒤: '${z.reH1}'\n${z.reAnswer}`);
      z.errs.length ? t.fail(`H1 콘솔 오류 ${z.errs.length}개: ${z.errs.slice(0, 3).join(" / ")}`) : t.ok("H1: 콘솔 오류 0");
    }
    const ZSEL = ".hx-modal-head, .hx-modal-head *, .hx-modal-side, .hx-modal-side *, .hx-ed-acts, .hx-ed-acts *";
    const hDir = path.join(ROOT, "runs", "_h1"); fs.mkdirSync(hDir, { recursive: true });
    const ZPOSE = (open) => `<script>${ZH}
addEventListener("load", function () { setTimeout(function () { steps([function () { ${open}; }, function () { rewrite(MZ(".page-title"), "우리 홈"); }, function () { mouse(MZ(".page-title"), "click"); }], function (e) { console.error(e); }); }, 400); });
</script>`;
    for (const [what, open, shot] of [["완성본 사용 흐름 자세히 보기", "openMap()", "final-flow-zoom"], ["완성본 화면 전체 자세히 보기", "openAll()", "final-all-zoom"]]) {
      for (const [W, H] of [[1440, 900], [390, 844]]) {
        const png = W === 1440 ? path.join(hDir, `${shot}-1440.png`) : null;
        const c = measureCut(put(`h1-${shot}.html`, "", ZPOSE(open)), W, H, png, ZSEL);
        if (!c) { t.fail(`${what} ${W}: 잴 수 없음`); continue; }
        c.seen >= 6 && !c.cut ? t.ok(`${what} ${W}: 잘림 0 (잰 요소 ${c.seen})`) : t.fail(`${what} ${W}: 잘림 ${c.cut} · 잰 요소 ${c.seen} ${c.samples.join(" / ")}`);
      }
    }
  }

  // ---------- 폭: 1440 · 390 잘림 0 · 사진 ----------
  // measureCut은 #ds로 연다 → 다 그린 뒤 화면 디자인 탭으로 옮겨 제목을 고르고 메모까지 남겨 둔다(1.5초에 잰다)
  const POSE = (send) => `<script>${HELPERS}
addEventListener("load", function () { setTimeout(function () { leave();${send ? ' setTimeout(function () { document.querySelector(".hx-bar .hx-bd-copy").click(); }, 150);' : ""} }, 400); });
</script>`;
  const shotDir = path.join(ROOT, "runs", "_g3");
  fs.mkdirSync(shotDir, { recursive: true });
  const SD = ".hx-bar, .hx-bar *, .hx-sd-list, .hx-sd-list *, .hx-sd-stage-head, .hx-sd-stage-head *, .hx-sd-frame, .hx-ed-acts, .hx-ed-acts *, .hx-sd-side, .hx-sd-side *";
  for (const [what, file, sel, shot] of [["화면 디자인 탭", put("g3-design.html", "", POSE(false)), SD, "final-design"], ["보내기 창", put("g3-send.html", "", POSE(true)), ".hx-send, .hx-send *", "final-send"]]) {
    for (const [W, H] of [[1440, 900], [390, 844]]) {
      const png = path.join(shotDir, `${shot}-${W}.png`);
      const c = measureCut(file, W, H, png, sel);
      if (!c) { t.fail(`${what} ${W}: 잴 수 없음`); continue; }
      c.seen >= 8 && !c.cut && !c.tabWrap ? t.ok(`${what} ${W}: 잘림 0 · 탭 한 줄 (잰 요소 ${c.seen})`) : t.fail(`${what} ${W}: 잘림 ${c.cut} · 탭 꺾임 ${c.tabWrap} · 잰 요소 ${c.seen} ${c.samples.join(" / ")}`);
      if (!fs.existsSync(png)) t.fail(`사진이 안 생김: ${path.relative(ROOT, png)}`);
    }
  }
  t.ok("사진: runs/_g3/final-design-1440.png · final-send-1440.png (390도)");
} finally { w.done(); }
t.end();
