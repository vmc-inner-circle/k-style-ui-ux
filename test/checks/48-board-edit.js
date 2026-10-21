// E1 — 초안 보드 '화면 디자인' 탭에서 화면을 바로 고치기 (26-board-edit.js · 사람 결정 2026-10-21 "사용자가 레이아웃 수정 · 편집하는 기능도 반영하고 싶다").
// 샘플 실행물(test/fixtures/sample — 화면 1 '홈': 구역 summary · recent · new, recent 안 목록 3줄)을 board로 build해서 진짜 Chrome에서 스크립트로
// ① 구역 순서 바꾸기 ② 구역 안 두 줄 바꾸기 ③ ✕ ④ 두 번 눌러 고쳐 쓰기 ⑤ A+ 한 번 →
//   화면 DOM에 반영 · 보내기 글에 줄 문법 5줄 · 새로고침 뒤에도 · 다른 화면에 다녀와도 그대로 · 되돌리기 하나면 그 줄만 빠짐 · 콘솔 오류 0
// 폭: 1440 · 390에서 손잡이 · A− A+ ✕ · 고친 것 목록 잘림 0(measureCut). 1440 사진은 runs/_e1/에 남긴다(지우지 않는다).
// Chrome이 없으면 건너뛴다.
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite, CHROME, chromeDom, measureCut } = require("../lib.js");

const t = suite("48 화면에서 바로 고치기");
if (!CHROME) { t.skip("Chrome 없음 — 화면 고치기 시험 건너뜀"); t.end(); }

// 줄 문법(E1이 쓰고 E2가 읽는 계약) — 경로는 조각 파일 기준이라 자리를 옮긴 뒤에도 처음 경로다
const LINES = {
  region: "화면 1 · 구역 순서: new, summary, recent",
  inner: "화면 1 · 구역 '최근 변경 목록' 안 순서: '다음 모임 날짜 확정', '독서 모임 장소 변경', '새 구성원 초대 5일' [@recent > ul]",
  hide: "화면 1 · 글자 '오늘 할 일과 최근 변경이에요' 빼기 [div > main > div:1 > div > p]",
  text: "화면 1 · 제목 '홈' 고쳐 쓰기: '홈' → '우리 홈' [div > main > div:1 > div > h1]",
  size: "화면 1 · 글자 '독서 모임 장소 변경' 크기 +1단계 [@recent > ul > li:1 > div > span]",
};

// 페이지에 넣는 스크립트 — 끌기는 손잡이에 pointerdown, 문서에 pointermove · pointerup을 보낸다(사람이 끄는 것과 같은 길)
const HELPERS = `
var B = HX.board, Q = function (s) { return document.querySelector(".hx-sd-frame .hx-screen " + s); };
function mid(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r }; }
function mouse(el, type) { var p = mid(el); el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y })); }
function ptr(el, type, x, y) { el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true })); }
function dragAbove(el, target) {
  mouse(el, "mousemove");
  var g = document.querySelector(".hx-ed-grip"); if (!g || g.style.display === "none") throw new Error("손잡이가 안 보임");
  var p = mid(g), to = target.getBoundingClientRect().top + 2;
  ptr(g, "pointerdown", p.x, p.y);
  for (var i = 1; i <= 6; i++) ptr(document, "pointermove", p.x, p.y + (to - p.y) * i / 6);
  ptr(document, "pointerup", p.x, to);
}
function act(label) { var b = [].filter.call(document.querySelectorAll(".hx-ed-acts button"), function (x) { return x.textContent === label; })[0]; if (!b) throw new Error("단추 없음 " + label); b.click(); }
function regions() { return [].map.call(document.querySelectorAll(".hx-sd-frame .hx-screen [data-region]"), function (r) { return r.getAttribute("data-region"); }); }
function rows() { return [].map.call(document.querySelectorAll('.hx-sd-frame [data-region="recent"] .list-title'), function (r) { return r.textContent; }); }
function doEdits() {
  dragAbove(Q('[data-region="new"]'), Q('[data-region="summary"]'));          // ① 구역 순서
  var li = Q('[data-region="recent"] ul').children;
  dragAbove(li[1], li[0]);                                                      // ② 구역 안 두 줄
  mouse(Q(".page-desc"), "click"); act("✕");                                   // ③ ✕
  var h1 = Q(".page-title"); mouse(h1, "dblclick");                             // ④ 고쳐 쓰기
  h1.firstChild.data = "우리 홈"; h1.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  var tl = [].filter.call(document.querySelectorAll('.hx-sd-frame [data-region="recent"] .list-title'), function (x) { return x.textContent === "독서 모임 장소 변경"; })[0];
  mouse(tl, "click"); act("A+");                                                // ⑤ A+
  return tl;
}
function look() {
  var tl = [].filter.call(document.querySelectorAll('.hx-sd-frame [data-region="recent"] .list-title'), function (x) { return x.textContent === "독서 모임 장소 변경"; })[0];
  var d = Q(".page-desc");
  var tops = [].map.call(document.querySelectorAll('.hx-sd-frame [data-region="recent"] .list-item'), function (l) { return l.getBoundingClientRect().top; });
  return { regions: regions(), rows: rows(), stacked: tops.every(function (y, i) { return !i || y > tops[i - 1] + 1; }), descGone: !!d && getComputedStyle(d).display === "none", h1: Q(".page-title").textContent,
    size: tl ? tl.style.fontSize : null, listRows: document.querySelectorAll(".hx-ed-row").length, answer: B.answer() };
}`;

// 고치는 흐름: 1단계 고치고 새로고침 → 2단계 유지 확인 · 다른 화면 다녀오기 · 되돌리기 하나
const FLOW = `<script>
(function () {
  var errs = JSON.parse(sessionStorage.getItem("e1-errs") || "[]"), ce = console.error;
  console.error = function () { errs.push([].map.call(arguments, String).join(" ")); sessionStorage.setItem("e1-errs", JSON.stringify(errs)); return ce.apply(console, arguments); };
  addEventListener("error", function (e) { errs.push("error: " + e.message); sessionStorage.setItem("e1-errs", JSON.stringify(errs)); });
})();
</script>`;
const FLOW_RUN = `<script>${HELPERS}
addEventListener("load", function () { setTimeout(function () {
  var out = {}, phase = sessionStorage.getItem("e1-phase");
  function done(o) { o.errs = JSON.parse(sessionStorage.getItem("e1-errs") || "[]"); var s = document.createElement("script"); s.type = "application/json"; s.id = "hx-e1"; s.textContent = JSON.stringify(o); document.body.appendChild(s); }
  try {
    B.showDesign("home");
    if (!phase) {
      setTimeout(function () {
        try { doEdits(); } catch (e) { done({ error: "1단계: " + e.message }); return; }
        setTimeout(function () { sessionStorage.setItem("e1-before", JSON.stringify(look())); sessionStorage.setItem("e1-phase", "2"); setTimeout(function () { location.reload(); }, 400); }, 200);
      }, 300);
      return;
    }
    setTimeout(function () {
      try {
        out.before = JSON.parse(sessionStorage.getItem("e1-before"));
        out.after = look();
        B.showDesign("done"); B.showDesign("home");
        out.back = look();
        var row = [].filter.call(document.querySelectorAll(".hx-ed-row"), function (r) { return /크게/.test(r.textContent); })[0];
        row.querySelector(".hx-ed-undo").click();
        setTimeout(function () { out.undone = look(); done(out); }, 200);
      } catch (e) { done({ error: "2단계: " + e.message }); }
    }, 300);
  } catch (e) { done({ error: e.message }); }
}, 300); });
</script>`;
// 폭 재기 · 사진: 고친 뒤 손잡이(다른 줄에 마우스) · 고른 곳의 A− A+ ✕ · 고친 것 목록이 한 화면에 보이게 해 둔다 (measureCut이 1.5초에 잰다)
const POSE = `<script>${HELPERS}
addEventListener("load", function () { setTimeout(function () {
  B.showDesign("home");
  setTimeout(function () {
    doEdits();
    document.querySelector(".hx-ed-list").scrollIntoView({ block: "end" });
    setTimeout(function () { mouse(document.querySelectorAll('.hx-sd-frame [data-region="recent"] .list-item')[2], "mousemove"); }, 200);   // 화면이 자리를 잡은 뒤
  }, 300);
}, 200); });
</script>`;

const w = workCopy("sample");
try {
  const ids = run("ids.js", w.run), b = run("build.js", w.run, "--mode", "board");
  if (ids.code !== 0 || b.code !== 0) { t.fail(`build 실패\n${ids.out}\n${b.out}`); t.end(); }
  const board = path.join(w.run, "out", "board.html"), html = fs.readFileSync(board, "utf8");
  const put = (name, head, tail) => { const f = path.join(w.run, "out", name); fs.writeFileSync(f, html.replace(/<head>/, "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>")); return f; };

  // ---------- 고치기 · 새로고침 · 되돌리기 ----------
  const dom = chromeDom(put("e1-flow.html", FLOW, FLOW_RUN), "", [1440, 900]);
  const m = /<script type="application\/json" id="hx-e1">([\s\S]*?)<\/script>/.exec(dom), r = m ? JSON.parse(m[1]) : null;
  if (!r) { t.fail("페이지가 결과를 적지 않음(스크립트가 끝나지 않았다)"); t.end(); }
  if (r.error) { t.fail(`페이지 스크립트: ${r.error}${r.errs && r.errs.length ? " · 콘솔: " + r.errs.join(" / ") : ""}`); t.end(); }
  const lines = (a) => a.split("\n");
  const okDom = (x) => x.regions.join(",") === "new,summary,recent" && x.rows.join("|") === "다음 모임 날짜 확정|독서 모임 장소 변경|새 구성원 초대" && x.stacked && x.descGone && x.h1 === "우리 홈" && x.size === "var(--fs-lg)";
  okDom(r.before) ? t.ok("화면 DOM에 바로 반영: 구역 new · summary · recent / 줄 둘 자리 바꿈 / 설명 글 숨김 / 제목 '우리 홈' / 글자 한 단계 크게(--fs-lg)")
    : t.fail(`화면 DOM: ${JSON.stringify({ regions: r.before.regions, rows: r.before.rows, stacked: r.before.stacked, descGone: r.before.descGone, h1: r.before.h1, size: r.before.size })}`);
  const miss = Object.entries(LINES).filter(([, l]) => !lines(r.before.answer).includes(l));
  miss.length ? t.fail(`보내기 글에 없는 줄:\n${miss.map(([k, l]) => `    ${k}: ${l}`).join("\n")}\n  지금 글:\n${r.before.answer}`) : t.ok(`보내기 글에 줄 문법 5줄 (구역 순서 · 구역 안 순서 · 빼기 · 고쳐 쓰기 · 크기)`);
  const hides = lines(r.before.answer).filter((l) => / 빼기 \[/.test(l)).length;
  hides === 1 ? t.ok("✕는 '빼기' 줄 하나 — 의견 핀과 겹쳐 적지 않음") : t.fail(`빼기 줄 ${hides}개`);
  r.before.listRows === 5 ? t.ok("오른쪽 '고친 것' 목록 5줄") : t.fail(`'고친 것' 목록 ${r.before.listRows}줄`);
  okDom(r.after) && r.after.answer === r.before.answer ? t.ok("새로고침 뒤에도 화면 · 보내기 글 그대로") : t.fail(`새로고침 뒤: ${JSON.stringify({ ...r.after, answer: undefined })}\n${r.after.answer}`);
  okDom(r.back) && r.back.answer === r.before.answer ? t.ok("다른 화면에 다녀와도 그대로") : t.fail(`다른 화면 다녀온 뒤: ${JSON.stringify({ ...r.back, answer: undefined })}`);
  const u = r.undone, gone = lines(r.before.answer).filter((l) => !lines(u.answer).includes(l));
  gone.length === 1 && gone[0] === LINES.size && !u.size && u.listRows === 4 && u.h1 === "우리 홈" && u.regions.join(",") === "new,summary,recent"
    ? t.ok("되돌리기 하나(크기) → 그 줄만 빠지고 글자 크기 처음대로, 나머지 넷은 그대로")
    : t.fail(`되돌리기 뒤: 빠진 줄 ${JSON.stringify(gone)} · 크기 ${u.size} · 목록 ${u.listRows} · 제목 ${u.h1} · 구역 ${u.regions}`);
  r.errs.length ? t.fail(`콘솔 오류 ${r.errs.length}개: ${r.errs.slice(0, 3).join(" / ")}`) : t.ok("콘솔 오류 0");

  // ---------- 폭: 1440 · 390 잘림 0 · 1440 사진 ----------
  // 화면 디자인 탭 전부(화면 조각 속은 빼고 — 화면은 폭에 맞춰 줄여 보인다): 목록 · 화면 머리 · 화면 상자 · 손잡이 · A− A+ ✕ · 의견 칸(고친 것 목록 포함)
  const pose = put("e1-pose.html", "", POSE), SEL = ".hx-sd-list, .hx-sd-list *, .hx-sd-stage-head, .hx-sd-stage-head *, .hx-sd-frame, .hx-ed-grip, .hx-ed-acts, .hx-ed-acts *, .hx-sd-side, .hx-sd-side *";
  const shotDir = path.join(ROOT, "runs", "_e1");
  fs.mkdirSync(shotDir, { recursive: true });
  for (const [W, H, shot] of [[1440, 900, path.join(shotDir, "board-edit-1440.png")], [390, 844, null]]) {
    const c = measureCut(pose, W, H, shot, SEL);
    if (!c) { t.fail(`${W}: 잴 수 없음`); continue; }
    c.seen >= 8 && !c.cut ? t.ok(`${W}: 손잡이 · A− A+ ✕ · 고친 것 목록 잘림 0 (잰 요소 ${c.seen})`) : t.fail(`${W}: 잘림 ${c.cut} · 잰 요소 ${c.seen} ${c.samples.join(" / ")}`);
  }
  fs.existsSync(path.join(shotDir, "board-edit-1440.png")) ? t.ok("1440 사진: runs/_e1/board-edit-1440.png") : t.fail("1440 사진이 안 생김");
} finally { w.done(); }

// ---------- 글자 큰 화면(역할 type large → .app[data-type=large]): A+ 한 번 = 그 화면의 다음 단계 하나 ----------
// 단계를 화면 겉에서 읽으면 안쪽에서 커진 단계와 어긋나 보드에서 두 단계 뛰어 보였다(E4에서 찾음)
const BIG = `<script>${HELPERS}
addEventListener("load", function () { setTimeout(function () {
  function done(o) { var s = document.createElement("script"); s.type = "application/json"; s.id = "hx-e5"; s.textContent = JSON.stringify(o); document.body.appendChild(s); }
  try {
    B.showDesign("home");
    setTimeout(function () {
      try {
        var tl = [].filter.call(document.querySelectorAll('.hx-sd-frame [data-region="recent"] .list-title'), function (x) { return x.textContent === "독서 모임 장소 변경"; })[0];
        var cs = getComputedStyle(tl), fs = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"].map(function (k) { return parseFloat(cs.getPropertyValue("--fs-" + k)); });
        var from = parseFloat(cs.fontSize);
        mouse(tl, "click"); act("A+");
        setTimeout(function () { done({ large: !!tl.closest('.app[data-type="large"]'), fs: fs, from: from, to: parseFloat(getComputedStyle(tl).fontSize), answer: B.answer() }); }, 200);
      } catch (e) { done({ error: e.message }); }
    }, 300);
  } catch (e) { done({ error: e.message }); }
}, 300); });
</script>`;
const w2 = workCopy("sample");
try {
  const sf = path.join(w2.run, "screens.json"), S = JSON.parse(fs.readFileSync(sf, "utf8"));
  S.roles[0].type = "large";
  fs.writeFileSync(sf, JSON.stringify(S, null, 2));
  const ids = run("ids.js", w2.run), b = run("build.js", w2.run, "--mode", "board");
  if (ids.code !== 0 || b.code !== 0) { t.fail(`글자 큰 화면 build 실패\n${ids.out}\n${b.out}`); t.end(); }
  const f = path.join(w2.run, "out", "e5-big.html");
  fs.writeFileSync(f, fs.readFileSync(path.join(w2.run, "out", "board.html"), "utf8").replace(/<\/body>(?![\s\S]*<\/body>)/, BIG + "</body>"));
  const m = /<script type="application\/json" id="hx-e5">([\s\S]*?)<\/script>/.exec(chromeDom(f, "", [1440, 900])), r = m ? JSON.parse(m[1]) : null;
  if (!r || r.error) { t.fail(`글자 큰 화면: ${r ? r.error : "결과 없음"}`); t.end(); }
  const i = r.fs.indexOf(r.from);
  r.large && i >= 0 && i + 1 < r.fs.length && r.to === r.fs[i + 1]
    ? t.ok(`글자 큰 화면: A+ 한 번 ${r.from}px → ${r.to}px = 그 화면의 다음 단계 하나`)
    : t.fail(`글자 큰 화면: large ${r.large} · 단계 ${r.fs.join("/")} · ${r.from}px → ${r.to}px (다음 단계 ${i >= 0 ? r.fs[i + 1] : "?"}px여야)`);
  r.answer.split("\n").includes(LINES.size) ? t.ok("글자 큰 화면: 줄은 '+1단계'") : t.fail(`글자 큰 화면: 크기 줄이 '${LINES.size}'가 아님\n${r.answer}`);
} finally { w2.done(); }
t.end();
