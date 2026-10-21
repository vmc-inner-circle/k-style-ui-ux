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
// sel = 잴 요소 선택자(기본 상단바 · 디자인 시스템 탭). 돌려주는 것: { width, cut: 잘린 개수, seen: 잰 개수, samples: 잘린 것 앞 10개, tabWrap: 두 줄로 꺾인 탭 수, statWrap: 두 줄로 꺾인 숫자 칸 글자 수, cols: 묶음(unit · color · parts) · 열린 컬러 창 단(main · more · base)의 왼쪽 x }
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
  // 컬러 창의 단(picker.js .hxp-col data-col: main · more · base) — 열린 창만
  document.querySelectorAll(".hxp-panel:not([hidden]) .hxp-col").forEach(function (s) { if (s.checkVisibility()) cols[s.dataset.col] = Math.round(s.getBoundingClientRect().left); });
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

// 페이지 사본에 단추 누르기를 끼워 넣는다 — 다 그린 뒤(1.2초, measureCut이 재기 전) picks = [[선택자, 글자 앞부분], …]를 차례로 누르고
// 0.3초 뒤 { missing: 못 찾은 단추, report: report(함수 본문 글)가 돌려준 값 }을 <script type="application/json" id="hx-clicked">에 적는다.
// 돌려주는 것: 사본 경로(같은 폴더, -clicked.html) — chromeDom · measureCut에 그대로 넘긴다. 읽기는 clicked(dom)
const withClicks = (file, picks, report = "return null;") => {
  const out = file.replace(/\.html$/, "") + "-clicked.html";
  const js = "<script>addEventListener('load',function(){setTimeout(function(){var missing=[];" + JSON.stringify(picks)
    + ".forEach(function(p){var n=[].filter.call(document.querySelectorAll(p[0]),function(e){return e.textContent.trim().indexOf(p[1])===0;})[0];if(n)n.click();else missing.push(p.join(' '));});"
    + "setTimeout(function(){var o=document.createElement('script');o.type='application/json';o.id='hx-clicked';o.textContent=JSON.stringify({missing:missing,report:(function(){" + report + "})()});document.body.appendChild(o);},300);},1200);});</script>";
  fs.writeFileSync(out, fs.readFileSync(file, "utf8").replace(/<\/body>(?![\s\S]*<\/body>)/, js + "</body>"));
  return out;
};
const clicked = (dom) => { const m = /<script type="application\/json" id="hx-clicked">([\s\S]*?)<\/script>/.exec(dom || ""); return m ? JSON.parse(m[1]) : null; };

// 브라우저 없이 보드 · 색 창 스크립트를 띄우는 가짜 DOM — 그 스크립트들이 쓰는 만큼만(속성 · 자식 · 글자 · 누르기).
// 부를 때마다 새 문서: { Node, text, doc, html, head, body }. 단추.click()은 pointerdown → click을 위로 올리고 문서 click까지 보낸다
const fakeDom = () => {
  class Node {
    constructor(tag) { this.tagName = String(tag).toUpperCase(); this.attrs = {}; this.children = []; this.parent = null; this.on = {}; this.style = {}; this.text = ""; this.value = ""; }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === "value") this.value = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    hasAttribute(k) { return k in this.attrs; }
    appendChild(c) { if (c.parent) c.parent.removeChild(c); c.parent = this; this.children.push(c); return c; }
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parent = null; return c; }
    get firstChild() { return this.children[0] || null; }
    get textContent() { return this.tagName === "#TEXT" ? this.text : this.text + this.children.map((c) => c.textContent).join(""); }
    set textContent(v) { this.children.forEach((c) => (c.parent = null)); this.children = []; this.text = String(v); }
    addEventListener(type, fn) { (this.on[type] = this.on[type] || []).push(fn); }
    contains(n) { for (let x = n; x; x = x.parent) if (x === this) return true; return false; }
    all() { return this.children.flatMap((c) => [c].concat(c.all())); }
    get classList() { const n = this; return { contains: (c) => (n.attrs.class || "").split(/\s+/).includes(c) }; }
    click() {
      const path = []; for (let x = this; x; x = x.parent) path.push(x);
      const ev = { target: this, stopPropagation() { this.stop = true; }, composedPath: () => path };
      for (const x of path) { (x.on.pointerdown || []).forEach((f) => f(ev)); }
      for (const x of path) { (x.on.click || []).forEach((f) => f(ev)); if (ev.stop) return; }
      (doc.on.click || []).forEach((f) => f(ev));
    }
  }
  const text = (s) => Object.assign(new Node("#text"), { text: s });
  const html = new Node("html"), head = html.appendChild(new Node("head")), body = html.appendChild(new Node("body"));
  const doc = new Node("#document");
  Object.assign(doc, {
    documentElement: html, head, body,
    createElement: (tag) => new Node(tag), createTextNode: text,
    getElementById: (id) => html.all().find((n) => n.attrs.id === id) || null,
    querySelector: (q) => { const m = /^link\[href="(.*)"\]$/.exec(q); return m ? html.all().find((n) => n.tagName === "LINK" && n.attrs.href === m[1]) || null : html.all().find((n) => n.tagName === q.toUpperCase()) || null; },
    querySelectorAll: (q) => html.all().filter((n) => n.tagName === q.toUpperCase()),
  });
  return { Node, text, doc, html, head, body };
};

const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// 시험용 조각(49 · 52) — 블록마다 구역 하나(제목 + 줄마다 한 줄), 주 버튼은 action 구역. 흐름이 누르는 버튼은 data-trigger, 나머지는 data-stay
function fragmentOf(s, trig) {
  trig = trig || {};
  const head = (b, icon) => `<h2 class="section-title"><svg class="icon" aria-hidden="true"><use href="#i-${icon}"/></svg>${escHtml(b.label)}</h2>`;
  const out = [`<main class="content">`, `  <div class="page-header"><div><h1 class="page-title">${escHtml(s.name)}</h1></div></div>`];
  out.push(`  <section class="section" data-region="${s.answer.key}">${head(s.answer, "clock")}`, ...s.answer.items.map((it) => `    <p>${escHtml(it)}</p>`), `  </section>`);
  for (const b of s.rest) {
    out.push(`  <section class="section" data-region="${b.key}">${head(b, "bell")}`, `    <ul class="list">`);
    b.items.forEach((it) => out.push(`      <li class="list-item"><div class="list-main"><span class="list-title">${escHtml(it)}</span></div></li>`));
    out.push(`    </ul>`, ...(trig[b.key] ? [`    <button class="btn btn-secondary" data-trigger="${trig[b.key]}">더 보기</button>`] : []), `  </section>`);
  }
  if (s.action) out.push(`  <div data-region="action"><button class="btn btn-primary" data-stay="알렸어요">${escHtml(s.action.label)}</button></div>`);
  return out.concat(`</main>`, "").join("\n");
}


module.exports = { fragmentOf, ROOT, UPDATE, run, workCopy, suite, walk, stageOn, CHROME, chromeDom, measureCut, withClicks, clicked, fakeDom };
