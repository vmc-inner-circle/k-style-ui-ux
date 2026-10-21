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
// R = 고치는 곳 — 화면 디자인 탭(.hx-sd) · 자세히 보기 창(.hx-modal). 바꿔 가며 쓴다
var B = HX.board, R = ".hx-sd", Q = function (s) { return document.querySelector(R + " .hx-screen " + s); };
function mid(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r }; }
function mouse(el, type) { var p = mid(el); el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y })); }
function ptr(el, type, x, y) { el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true })); }
function dragAbove(el, target) {
  mouse(el, "mousemove");
  var g = document.querySelector(R + " .hx-ed-grip"); if (!g || g.style.display === "none") throw new Error("손잡이가 안 보임");
  var p = mid(g), to = target.getBoundingClientRect().top + 2;
  ptr(g, "pointerdown", p.x, p.y);
  for (var i = 1; i <= 6; i++) ptr(document, "pointermove", p.x, p.y + (to - p.y) * i / 6);
  ptr(document, "pointerup", p.x, to);
}
function act(label) { var b = [].filter.call(document.querySelectorAll(R + " .hx-ed-acts button"), function (x) { return x.textContent === label; })[0]; if (!b) throw new Error("단추 없음 " + label); b.click(); }
function regions() { return [].map.call(document.querySelectorAll(R + " .hx-screen [data-region]"), function (r) { return r.getAttribute("data-region"); }); }
function rows() { return [].map.call(document.querySelectorAll(R + ' [data-region="recent"] .list-title'), function (r) { return r.textContent; }); }
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
  var tl = [].filter.call(document.querySelectorAll(R + ' [data-region="recent"] .list-title'), function (x) { return x.textContent === "독서 모임 장소 변경"; })[0];
  var d = Q(".page-desc");
  var tops = [].map.call(document.querySelectorAll(R + ' [data-region="recent"] .list-item'), function (l) { return l.getBoundingClientRect().top; });
  return { regions: regions(), rows: rows(), stacked: tops.every(function (y, i) { return !i || y > tops[i - 1] + 1; }), descGone: !!d && getComputedStyle(d).display === "none", h1: Q(".page-title").textContent,
    size: tl ? tl.style.fontSize : null, listRows: document.querySelectorAll(R + " .hx-ed-row").length, answer: B.answer() };
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

// ---------- G1: '자세히 보기' 창에서 바로 고치기 (사람 결정 2026-10-21 "사용 흐름 · 시안 보드에서도 직접 고치기") ----------
// 사용 흐름 · 화면 디자인 탭 · 시안 보드의 '자세히 보기'가 모두 같은 창(00-core HX.openScreen)을 열고, 그 창에 같은 고치기 도구(26-board-edit.js)가 붙는다.
// ① 사용 흐름에서 열어 구역 순서 · 고쳐 쓰기 → 화면 디자인 탭과 같은 줄 · 같은 목록 ② 화면 디자인 탭의 '자세히 보기'에서 A+ → 닫으면 탭 화면도 그 크기
// ③ 새로고침 뒤 다시 열어도 그대로 · 창 목록에서 되돌리기 하나 ④ 시안 보드에서 열어 고쳐 쓰기 → state.edits에 concept(시안 id) · 다른 시안은 그대로
// 폭: 1440 · 390에서 창 머리 · 오른쪽 목록 · 손잡이 · A− A+ ✕ 잘림 0. 1440 사진은 runs/_g1/(지우지 않는다)
const STEPS = `
function steps(list, fail) { var i = 0; (function next() { if (i >= list.length) return; var f = list[i++]; setTimeout(function () { try { f(); next(); } catch (e) { fail(e); } }, 300); })(); }
function rewrite(el, s) { mouse(el, "dblclick"); el.firstChild.data = s; el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); }
function title(s) { return [].filter.call(document.querySelectorAll(R + ' [data-region="recent"] .list-title'), function (x) { return x.textContent === s; })[0]; }
function opened() { if (!document.querySelector(".hx-modal .hx-sd-frame .hx-screen")) throw new Error("자세히 보기 창에 고칠 화면이 없음"); R = ".hx-modal"; }
function openFlow() {   // 사용 흐름 캔버스 · 이름표 옆 '자세히 보기'
  var b = document.querySelector('.hx-sx-zoom[aria-label="자세히 보기 — 홈"]'); if (!b) throw new Error("사용 흐름에 '자세히 보기 — 홈' 단추 없음");
  b.click(); opened();
}
function openConcept(i) {   // 시안 캔버스 · 시안마다 화면 이름 옆 '자세히 보기' (시안 a · b 차례)
  var b = document.querySelectorAll('.hx-ccv .hx-sx-pick[title="자세히 보기 — 홈"]')[i]; if (!b) throw new Error("시안 " + i + "번째 줄에 '자세히 보기 — 홈' 단추 없음");
  b.click(); opened();
}
function small(b) { return { regions: [].map.call(b.querySelectorAll("[data-region]"), function (r) { return r.getAttribute("data-region"); }), h1: (b.querySelector(".page-title") || {}).textContent }; }   // 캔버스의 작은 화면
function report(id, o) { o.errs = JSON.parse(sessionStorage.getItem("e1-errs") || "[]"); var s = document.createElement("script"); s.type = "application/json"; s.id = id; s.textContent = JSON.stringify(o); document.body.appendChild(s); }`;
const ZOOM_RUN = `<script>${HELPERS}${STEPS}
addEventListener("load", function () { setTimeout(function () {
  var out = JSON.parse(sessionStorage.getItem("g1-out") || "{}"), phase = sessionStorage.getItem("g1-phase");
  function fail(e) { report("hx-g1", { error: (phase ? "2단계: " : "1단계: ") + e.message }); }
  if (!phase) steps([
    function () { B.setTab("flow"); openFlow(); },
    function () { dragAbove(Q('[data-region="new"]'), Q('[data-region="summary"]')); rewrite(Q(".page-title"), "우리 홈"); },
    function () { out.zoom = look(); HX.closeModal(); out.canvas = small(document.querySelector('.hx-sx-board[data-screen="home"]')); B.showDesign("home"); R = ".hx-sd"; },
    function () {
      out.design = look();
      [].filter.call(document.querySelectorAll(".hx-sd-stage-head .hx-btn"), function (b) { return /자세히 보기/.test(b.textContent); })[0].click(); opened();
    },
    function () { mouse(title("독서 모임 장소 변경"), "click"); act("A+"); },
    function () { HX.closeModal(); R = ".hx-sd"; },
    function () { out.design2 = look(); sessionStorage.setItem("g1-out", JSON.stringify(out)); sessionStorage.setItem("g1-phase", "2"); setTimeout(function () { location.reload(); }, 400); }
  ], fail);
  else steps([
    function () { openFlow(); },
    function () {
      out.reopen = look();
      [].filter.call(document.querySelectorAll(".hx-modal .hx-ed-row"), function (r) { return /크게/.test(r.textContent); })[0].querySelector(".hx-ed-undo").click();
    },
    function () { out.undone = look(); report("hx-g1", out); }
  ], fail);
}, 300); });
</script>`;
const CONCEPT_RUN = `<script>${HELPERS}${STEPS}
addEventListener("load", function () { setTimeout(function () {
  var out = {};
  function fail(e) { report("hx-g1c", { error: e.message }); }
  steps([
    function () { out.stage = B.stage; openConcept(1); },
    function () { out.head = (document.querySelector(".hx-modal-head .hx-cc-id") || {}).textContent; rewrite(Q(".page-title"), "우리 홈"); },
    function () { out.rows = document.querySelectorAll(".hx-modal .hx-ed-row").length; out.edits = B.state.edits; HX.closeModal(); },
    function () { var bs = document.querySelectorAll(".hx-ccv-board"); out.small = [small(bs[0]).h1, small(bs[1]).h1]; openConcept(1); },
    function () { out.again = Q(".page-title").textContent; HX.closeModal(); openConcept(0); },
    function () { out.other = Q(".page-title").textContent; report("hx-g1c", out); }
  ], fail);
}, 300); });
</script>`;
// 사진 · 폭 재기: 창 안에서 고친 뒤 고른 곳의 A− A+ ✕ · 다른 줄의 손잡이가 보이게 (measureCut이 1.5초에 잰다)
const ZOOM_POSE = (open) => `<script>${HELPERS}${STEPS}
addEventListener("load", function () { setTimeout(function () {
  steps([
    function () { ${open}; },
    function () { if (Q('[data-region="new"]')) dragAbove(Q('[data-region="new"]'), Q('[data-region="summary"]')); rewrite(Q(".page-title"), "우리 홈"); },
    function () { mouse(title("독서 모임 장소 변경"), "click"); mouse(document.querySelectorAll(R + ' [data-region="recent"] .list-item')[2], "mousemove"); }
  ], function (e) { console.error(e); });
}, 200); });
</script>`;
const ZOOM_SEL = ".hx-modal-head, .hx-modal-head *, .hx-modal-side, .hx-modal-side *, .hx-ed-grip, .hx-ed-acts, .hx-ed-acts *";
const g1Dir = path.join(ROOT, "runs", "_g1");
fs.mkdirSync(g1Dir, { recursive: true });
const zoomCut = (what, page, shot) => {
  for (const [W, H, png] of [[1440, 900, shot], [390, 844, null]]) {
    const c = measureCut(page, W, H, png, ZOOM_SEL);
    if (!c) { t.fail(`${what} ${W}: 잴 수 없음`); continue; }
    c.seen >= 8 && !c.cut ? t.ok(`${what} ${W}: 창 머리 · 고친 것 목록 · 손잡이 · A− A+ ✕ 잘림 0 (잰 요소 ${c.seen})`) : t.fail(`${what} ${W}: 잘림 ${c.cut} · 잰 요소 ${c.seen} ${c.samples.join(" / ")}`);
  }
  fs.existsSync(shot) ? t.ok(`${what} 1440 사진: ${path.relative(ROOT, shot)}`) : t.fail(`${what} 1440 사진이 안 생김`);
};

const w3 = workCopy("sample");
try {
  const ids = run("ids.js", w3.run), b = run("build.js", w3.run, "--mode", "board");
  if (ids.code !== 0 || b.code !== 0) { t.fail(`G1 build 실패\n${ids.out}\n${b.out}`); t.end(); }
  const html = fs.readFileSync(path.join(w3.run, "out", "board.html"), "utf8");
  const put = (name, head, tail) => { const f = path.join(w3.run, "out", name); fs.writeFileSync(f, html.replace(/<head>/, "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>")); return f; };
  const m = /<script type="application\/json" id="hx-g1">([\s\S]*?)<\/script>/.exec(chromeDom(put("g1-zoom.html", FLOW, ZOOM_RUN), "", [1440, 900])), r = m ? JSON.parse(m[1]) : null;
  if (!r || r.error) { t.fail(`자세히 보기: ${r ? r.error + (r.errs && r.errs.length ? " · 콘솔: " + r.errs.join(" / ") : "") : "결과 없음(스크립트가 끝나지 않았다)"}`); t.end(); }
  const has = (x, ...ls) => ls.every((l) => x.answer.split("\n").includes(l));
  const okZoom = (x) => x.regions.join(",") === "new,summary,recent" && x.h1 === "우리 홈";
  okZoom(r.zoom) && r.zoom.listRows === 2 && has(r.zoom, LINES.region, LINES.text)
    ? t.ok("사용 흐름 '자세히 보기' 창: 구역 순서 · 고쳐 쓰기 → 화면에 바로 · 창 목록 2줄 · 보내기 줄은 화면 디자인 탭과 같은 줄 문법")
    : t.fail(`사용 흐름 자세히 보기: ${JSON.stringify({ ...r.zoom, answer: undefined })}\n${r.zoom.answer}`);
  okZoom(r.design) && r.design.listRows === 2 && r.design.answer === r.zoom.answer
    ? t.ok("닫고 화면 디자인 탭: 같은 모습 · '고친 것' 목록 2줄 · 보내기 글 그대로")
    : t.fail(`화면 디자인 탭: ${JSON.stringify({ ...r.design, answer: undefined })}`);
  okZoom(r.design2) && r.design2.size === "var(--fs-lg)" && r.design2.listRows === 3 && has(r.design2, LINES.region, LINES.text, LINES.size)
    ? t.ok("화면 디자인 탭의 '자세히 보기'에서 A+ → 창을 닫으면 탭의 화면도 한 단계 크게 · 목록 3줄")
    : t.fail(`탭 자세히 보기 A+ 뒤: ${JSON.stringify({ ...r.design2, answer: undefined })}\n${r.design2.answer}`);
  okZoom(r.reopen) && r.reopen.size === "var(--fs-lg)" && r.reopen.listRows === 3 && r.reopen.answer === r.design2.answer
    ? t.ok("새로고침 뒤 사용 흐름에서 다시 열어도 그대로 (구역 순서 · 제목 · 크기 · 목록 3줄)")
    : t.fail(`다시 연 창: ${JSON.stringify({ ...r.reopen, answer: undefined })}`);
  const u = r.undone;
  okZoom(u) && !u.size && u.listRows === 2 && !has(u, LINES.size) && has(u, LINES.region, LINES.text)
    ? t.ok("창 목록에서 되돌리기 하나(크기) → 그 줄만 빠지고 화면도 처음 크기")
    : t.fail(`창에서 되돌린 뒤: ${JSON.stringify({ ...u, answer: undefined })}\n${u.answer}`);
  r.canvas.regions.join(",") === "new,summary,recent" && r.canvas.h1 === "우리 홈"
    ? t.ok("사용 흐름 캔버스의 작은 화면에도 같은 고친 모습 (구역 순서 · 제목)") : t.fail(`캔버스 작은 화면: ${JSON.stringify(r.canvas)}`);
  r.errs.length ? t.fail(`자세히 보기 콘솔 오류 ${r.errs.length}개: ${r.errs.slice(0, 3).join(" / ")}`) : t.ok("자세히 보기: 콘솔 오류 0");
  zoomCut("사용 흐름 자세히 보기", put("g1-flow-pose.html", "", ZOOM_POSE("B.setTab('flow'); openFlow()")), path.join(g1Dir, "flow-zoom-1440.png"));
} finally { w3.done(); }

// 시안 보드(1턴 · board.stage concept): 예시 화면 '홈'을 시안 a · b 둘로 싣는다
const w4 = workCopy("sample");
try {
  const sf = path.join(w4.run, "screens.json"), S = JSON.parse(fs.readFileSync(sf, "utf8"));
  S.concepts = [{ id: "a", name: "차분한 안", level: 1, screens: ["home"] }, { id: "b", name: "과감한 안", level: 10, screens: ["home"] }];
  S.board = { ...S.board, stage: "concept", concept: "a" };
  fs.writeFileSync(sf, JSON.stringify(S, null, 2));
  for (const id of ["a", "b"]) { fs.mkdirSync(path.join(w4.run, "concepts", id), { recursive: true }); fs.copyFileSync(path.join(w4.run, "screens", "home.html"), path.join(w4.run, "concepts", id, "home.html")); }
  const ids = run("ids.js", w4.run), b = run("build.js", w4.run, "--mode", "board");
  if (ids.code !== 0 || b.code !== 0) { t.fail(`시안 보드 build 실패\n${ids.out}\n${b.out}`); t.end(); }
  const html = fs.readFileSync(path.join(w4.run, "out", "board.html"), "utf8");
  const put = (name, head, tail) => { const f = path.join(w4.run, "out", name); fs.writeFileSync(f, html.replace(/<head>/, "<head>" + head).replace(/<\/body>(?![\s\S]*<\/body>)/, tail + "</body>")); return f; };
  const m = /<script type="application\/json" id="hx-g1c">([\s\S]*?)<\/script>/.exec(chromeDom(put("g1-concept.html", FLOW, CONCEPT_RUN), "", [1440, 900])), r = m ? JSON.parse(m[1]) : null;
  if (!r || r.error) { t.fail(`시안 자세히 보기: ${r ? r.error + (r.errs && r.errs.length ? " · 콘솔: " + r.errs.join(" / ") : "") : "결과 없음"}`); t.end(); }
  const e = r.edits || [];
  r.stage === "concept" && r.head === "시안 B" && e.length === 1 && e[0].kind === "text" && e[0].slug === "home" && e[0].concept === "b" && e[0].to === "우리 홈" && r.rows === 1
    ? t.ok("시안 보드 '자세히 보기'(시안 B 홈)에서 고쳐 쓰기 → state.edits에 { kind text · slug home · concept b } · 창 목록 1줄")
    : t.fail(`시안 자세히 보기: ${JSON.stringify({ stage: r.stage, head: r.head, rows: r.rows, edits: e })}`);
  r.again === "우리 홈" && r.other === "홈" ? t.ok("닫고 다시 열어도 시안 B는 '우리 홈' · 시안 A는 그대로 '홈'") : t.fail(`다시 연 시안 B '${r.again}' · 시안 A '${r.other}'`);
  r.small.join("|") === "홈|우리 홈" ? t.ok("시안 캔버스의 작은 화면: 시안 B만 '우리 홈'") : t.fail(`시안 캔버스 작은 화면 제목: ${r.small.join(" | ")}`);
  r.errs.length ? t.fail(`시안 자세히 보기 콘솔 오류 ${r.errs.length}개: ${r.errs.slice(0, 3).join(" / ")}`) : t.ok("시안 자세히 보기: 콘솔 오류 0");
  zoomCut("시안 자세히 보기", put("g1-concept-pose.html", "", ZOOM_POSE("openConcept(1)")), path.join(g1Dir, "concept-zoom-1440.png"));
} finally { w4.done(); }
t.end();
