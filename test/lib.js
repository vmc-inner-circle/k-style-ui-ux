// 시험 공용 도구 — Node 내장만 쓴다. 검사 파일(test/checks/NN-이름.js)이 가져다 쓴다.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const UPDATE = process.argv.includes("--update");

// scripts/<이름>을 실제로 돌린다. 출력은 붙여서 돌려준다.
const run = (script, ...args) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", script), ...args], { cwd: ROOT, encoding: "utf8", timeout: 120000 });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
};

// 고정 입력을 임시 폴더로 복사해서 돌린다 — 저장소 안은 건드리지 않는다.
const workCopy = (name = "sample") => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oss-test-"));
  const dest = path.join(dir, name);
  fs.cpSync(path.join(__dirname, "fixtures", name), dest, { recursive: true });
  return { dir, run: dest, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
};

// 검사 하나의 결과 모으기 — fail()이 하나라도 있으면 exit 1, skip()만 있으면 0.
const suite = (title) => {
  const fails = [];
  let passed = 0;
  return {
    ok: (msg) => { passed++; console.log(`  ok   ${msg}`); },
    fail: (msg) => { fails.push(msg); console.log(`  FAIL ${msg}`); },
    skip: (msg) => console.log(`  skip ${msg}`),
    end: () => { console.log(`${title}: 통과 ${passed} · 실패 ${fails.length}`); process.exit(fails.length ? 1 : 0); },
  };
};

const walk = (rel, filter = () => true) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return filter(rel) ? [rel] : [];
  return fs.readdirSync(abs).sort().flatMap((n) => (n === "node_modules" || (n.startsWith(".") && n !== ".claude") ? [] : walk(path.join(rel, n), filter)));
};

// 단계 스위치 — test/stages.json. 꺼져 있으면 그 검사는 건너뛴다.
const stageOn = (name) => { try { return JSON.parse(require("fs").readFileSync(require("path").join(ROOT, "test", "stages.json"), "utf8"))[name] === true; } catch { return false; } };

// 헤드리스 Chrome — 없으면 null (CHROME=<경로>로 지정 가능)
const CHROME = [process.env.CHROME, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  .find((p) => p && fs.existsSync(p)) || null;

// 페이지를 열어 스크립트가 다 돈 뒤의 DOM. size = [폭, 높이]면 그 창 크기로 연다
const chromeDom = (file, hash = "", size = null) => {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "oss-chrome-"));
  try {
    const r = spawnSync(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars", "--user-data-dir=" + prof, ...(size ? ["--window-size=" + size.join(",")] : []),
      "--virtual-time-budget=6000", "--dump-dom", "file://" + file + hash], { encoding: "utf8", timeout: 60000, maxBuffer: 64 << 20 });
    return r.stdout || "";
  } finally { fs.rmSync(prof, { recursive: true, force: true }); }
};

// 폭 잘림 재기 — 입구(index.html)를 #ds로 열어 상단바(.hx-bar) · 디자인 시스템 탭(.hx-ds) 안의 보이는 요소 중
// 오른쪽 끝이 창 폭을 넘는 것을 센다. 가로로 미는 줄(overflow-x auto · overflow-y hidden) 안은 밀어서 볼 수 있으니 세지 않는다.
// 위 탭 글자가 두 줄로 꺾인 것도 센다(좁은 폭에서 "사용/흐름"처럼 찌그러짐).
// sel = 잴 요소 선택자(기본 상단바 · 디자인 시스템 탭). 돌려주는 것: { width, cut: 잘린 개수, seen: 잰 개수, samples: 잘린 것 앞 10개, tabWrap: 두 줄로 꺾인 탭 수, statWrap: 두 줄로 꺾인 숫자 칸 글자 수, cols: 묶음(unit · color · parts)의 왼쪽 x }
function cutScan(sel) {
  var W = innerWidth, cut = [], seen = 0;
  function slid(e) {
    for (var p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      var s = getComputedStyle(p);
      if (/auto|scroll/.test(s.overflowX) && s.overflowY === "hidden" && p.getBoundingClientRect().right <= W + 0.5) return true;
    }
    return false;
  }
  document.querySelectorAll(sel).forEach(function (e) {
    var r = e.getBoundingClientRect();
    if (!r.width || !r.height || !e.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return;
    seen++;
    var name = e.tagName.toLowerCase() + (e.className && e.className.baseVal == null ? "." + String(e.className).trim().split(/\s+/).join(".") : "");
    if (r.right > W + 0.5 && !slid(e)) cut.push(name + " → " + Math.round(r.right));
    // 상자는 폭 안인데 글자만 밖으로 나간 경우도 센다 (말줄임 … 으로 일부러 자른 글자는 빼고)
    var es = getComputedStyle(e), ellipsis = es.textOverflow === "ellipsis" && es.overflowX !== "visible";
    [].forEach.call(e.childNodes, function (n) {
      if (ellipsis || n.nodeType !== 3 || !n.data.trim()) return;
      var g = document.createRange(); g.selectNodeContents(n);
      var x = g.getBoundingClientRect().right;
      if (x > W + 0.5 && !slid(n)) cut.push(name + " 글자 '" + n.data.trim().slice(0, 12) + "' → " + Math.round(x));
    });
  });
  var tabWrap = [].filter.call(document.querySelectorAll(".hx-tab"), function (b) {
    return [].some.call(b.childNodes, function (n) {
      if (n.nodeType !== 3) return false;
      var g = document.createRange(); g.selectNodeContents(n);
      return new Set([].map.call(g.getClientRects(), function (q) { return Math.round(q.top); })).size > 1;
    });
  }).length;
  // 숫자 칸(.stat) 안 라벨 · 값 · 단위가 두 줄로 꺾인 것
  var statWrap = [].filter.call(document.querySelectorAll(".stat-label, .stat-value, .stat-value small"), function (e) {
    return [].some.call(e.childNodes, function (n) {
      if (n.nodeType !== 3 || !n.data.trim()) return false;
      var g = document.createRange(); g.selectNodeContents(n);
      return new Set([].map.call(g.getClientRects(), function (q) { return Math.round(q.top); })).size > 1;
    });
  }).length;
  var cols = {};
  document.querySelectorAll(".hx-ds-sec").forEach(function (s) { cols[s.dataset.ds] = Math.round(s.getBoundingClientRect().left); });
  return { width: W, cut: cut.length, seen: seen, samples: cut.slice(0, 10), tabWrap: tabWrap, statWrap: statWrap, cols: cols };
}
// 헤드리스 Chrome은 창 폭을 500 아래로 줄이지 못한다(390을 주면 500으로 그리고 사진만 390에서 자른다) →
// 겉 페이지에 폭 × 높이 iframe을 두고 그 안에서 연다. 안쪽이 잰 값을 postMessage로 겉에 적는다.
// shot = png 경로면 같은 겉 페이지를 찍는다(iframe 오른쪽 짙은 칸은 창 폭 밖).
const DS_SEL = ".hx-bar, .hx-bar *, .hx-ds, .hx-ds *";
const measureCut = (html, width, height = 844, shot = null, sel = DS_SEL) => {
  const dir = path.dirname(html), inner = path.join(dir, "_cut-" + width + "-in.html"), outer = path.join(dir, "_cut-" + width + ".html");
  const probe = "<script>addEventListener('load',function(){setTimeout(function(){parent.postMessage(JSON.stringify((" + cutScan + ")(" + JSON.stringify(sel) + ")),'*');},1500);});</script>";
  fs.writeFileSync(inner, fs.readFileSync(html, "utf8").replace(/<\/body>(?![\s\S]*<\/body>)/, probe + "</body>"));
  fs.writeFileSync(outer, `<!doctype html><body style="margin:0;background:#333"><iframe src="${path.basename(inner)}#ds" style="display:block;width:${width}px;height:${height}px;border:0;background:#fff"></iframe>`
    + "<script>addEventListener('message',function(e){var o=document.createElement('script');o.type='application/json';o.id='hx-cut';o.textContent=e.data;document.body.appendChild(o);});</script></body>");
  const win = [Math.max(width, 500), height];
  try {
    if (shot) {
      const prof = fs.mkdtempSync(path.join(os.tmpdir(), "oss-chrome-"));
      spawnSync(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars", "--user-data-dir=" + prof, "--window-size=" + win.join(","),
        "--virtual-time-budget=6000", "--screenshot=" + shot, "file://" + outer], { timeout: 60000 });
      fs.rmSync(prof, { recursive: true, force: true });
    }
    const m = /<script type="application\/json" id="hx-cut">([\s\S]*?)<\/script>/.exec(chromeDom(outer, "", win));
    return m ? JSON.parse(m[1]) : null;
  } finally { fs.rmSync(inner, { force: true }); fs.rmSync(outer, { force: true }); }
};

module.exports = { ROOT, UPDATE, run, workCopy, suite, walk, stageOn, CHROME, chromeDom, measureCut };
