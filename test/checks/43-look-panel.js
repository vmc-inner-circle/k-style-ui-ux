// 상단 버튼 셋 테마 · 컬러 · 폰트(설계 schema-on-pr27 9절 U1 · U2 · U4) — 버튼이 곧 탭, 누르면 그 내용만 담긴 창이 그 버튼 아래로.
// 테마 칸 = 맞춤 1 + 근거 있는 8, 컬러는 접기 없이 버튼 색 + 팔레트 24 + 바탕 3, 당근 느낌을 고르면 테마 · 판 모양 · 폰트가 같이 바뀐다.
// 브라우저 없이 picker.js를 가짜 DOM(아래 Node)으로 띄워 단추를 직접 누른다. 색 계산은 진짜 scripts/looks.js.
const fs = require("fs");
const path = require("path");
const { ROOT, suite } = require("../lib.js");

const t = suite("43 테마 · 컬러 · 폰트 창");
const src = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const LK = require(path.join(ROOT, "scripts/looks.js"));
const DRESS = require(path.join(ROOT, "scripts/dress.js"));

// ---------- 가짜 DOM: picker.js가 쓰는 만큼만 ----------
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

// 처음 화면: PRD 맞춤 분위기 하나 + 시안 꾸밈(판 모양 float · 모서리 sharp · 명조 제목 글꼴)
const OWN = [{ id: "warm-paper", name: "따뜻한 종이", why: "기록에 어울려요", mode: "light", bg: "#F7F3EC", ink: "#2B2620", shape: "soft", font: "serif-title",
  swatches: [["forest", "숲 초록", "#2F6B4F"], ["sea", "바다 파랑", "#2D5F8A"], ["terra", "테라코타", "#B4532A"], ["ink", "먹색", "#33302C"], ["sand", "모래 노랑", "#B08A2E"]].map(([id, name, hex]) => ({ id, name, hex })) }];
Object.entries({ "data-theme": "warm-paper", "data-swatch": "forest", "data-type": "normal", "data-font": "serif-title", "data-cards": "float", "data-radius": "sharp" }).forEach(([k, v]) => html.setAttribute(k, v));
const steps = DRESS.radiusSteps();
const window = { HXLooks: LK, HX_OWN_LOOKS: OWN, HX_PRESET_DRESS: Object.fromEntries(LK.PRESETS.map((p) => [p.id, DRESS.presetDress(p, steps)])) };
const store = {}, localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => (store[k] = v) };
new Function("window", "document", "getComputedStyle", "localStorage", src("packages/core/color/picker.js"))(window, doc, () => ({ getPropertyValue: () => "" }), localStorage);

const changes = [];
const ctl = window.HXColor.mount({ project: "t", onChange: (s) => changes.push(s) });
const wrap = body.children[0];
const cls = (n, c) => (n.attrs.class || "").split(/\s+/).includes(c);
const panel = wrap.all().find((n) => cls(n, "hxp-panel"));
const bar = wrap.all().filter((n) => cls(n, "hxp-btn"));
const top = (name) => bar.find((n) => n.textContent.trim() === name);
const shown = (n) => { for (let x = n; x && x !== wrap.parent; x = x.parent) if (x.hasAttribute("hidden")) return false; return true; };
const COLOR_CELLS = ["hxp-dot", "hxp-chip", "hxp-hcard", "hxp-ref"];
const cells = () => panel.all().filter((n) => shown(n) && ((n.tagName === "BUTTON" && COLOR_CELLS.some((c) => cls(n, c))) || (n.tagName === "INPUT" && n.attrs.type === "color")));
const button = (label) => panel.all().find((n) => n.tagName === "BUTTON" && shown(n) && n.textContent.trim().startsWith(label));
const opened = (name) => !panel.hasAttribute("hidden") && top(name).parent.contains(panel) && panel.attrs["aria-label"] === name && top(name).attrs["aria-expanded"] === "true";

// 1) 버튼 셋 — 탭 줄 없이 버튼이 곧 탭, '화면 느낌' 단추는 없다
const names = bar.map((n) => n.textContent.trim());
JSON.stringify(names) === JSON.stringify(["테마", "컬러", "폰트"]) ? t.ok("상단 버튼 셋: 테마 · 컬러 · 폰트") : t.fail(`버튼: ${names.join(" · ")}`);
wrap.all().some((n) => n.attrs.role === "tab" || n.attrs.role === "tablist") ? t.fail("창 안에 탭 줄이 남아 있음 — 버튼이 곧 탭") : t.ok("탭 줄 없음");
/화면 느낌/.test(wrap.textContent) ? t.fail("'화면 느낌'이라는 말이 남아 있음") : t.ok("'화면 느낌' 단추 · 이름 없음");
panel.hasAttribute("hidden") ? t.ok("처음엔 창이 닫혀 있다") : t.fail("처음부터 창이 열려 있음");

// 2) 테마: 맞춤 1 + 근거 있는 8 — 더 보기 · 참고용 없음
top("테마").click();
opened("테마") ? t.ok("테마를 누르면 테마 창이 그 버튼 아래로 열린다") : t.fail("테마 창이 안 열리거나 다른 버튼 아래에 열림");
const refs = cells().filter((n) => cls(n, "hxp-ref"));
const withSrc = LK.PRESETS.filter((p) => p.source).map((p) => p.name);
const refNames = refs.map((n) => n.children[1].textContent);
refs.length === cells().length && refNames[0] === "따뜻한 종이" && JSON.stringify(refNames.slice(1)) === JSON.stringify(withSrc)
  ? t.ok(`테마 칸 ${refs.length} = 맞춤 1(따뜻한 종이, 맨 앞) + 근거 ${withSrc.length}(${withSrc.join(" · ")})`) : t.fail(`테마 칸: ${refNames.join(" · ")} (다른 칸 ${cells().length - refs.length})`);
// 카드 = 이름 + 색 미리보기만 (견본 글자 · 글꼴 이름 없음)
const cardText = refs.map((n) => n.textContent).join("|");
const fontNames = LK.PRESETS.map((p) => LK.fontOf(p).name);
!/가나다/.test(cardText) && !fontNames.some((n) => cardText.includes(n)) ? t.ok("테마 카드에 견본 글자(가나다) · 글꼴 이름 없음") : t.fail(`테마 카드에 불필요한 글: ${cardText}`);
refs.every((n) => n.children.length === 2 && cls(n.children[0], "hxp-refprev") && n.children[0].children.length === 1 && n.children[1].tagName === "B")
  ? t.ok("테마 카드 = 색 미리보기 하나 + 이름 한 줄") : t.fail("테마 카드 구성이 이름 + 색 미리보기가 아님");
withSrc.length === 8 ? t.ok("근거 있는 테마 = 8") : t.fail(`근거 있는 테마 ${withSrc.length}개`);
button("더 보기") ? t.fail("테마 창에 '더 보기'가 있음") : t.ok("테마 창에 '더 보기' 없음");
/참고용|프리셋|레퍼런스/.test(panel.textContent) ? t.fail("창 안에 '참고용' · '프리셋' · '레퍼런스'가 보임") : t.ok("창 안에 '참고용' · '프리셋' · '레퍼런스' 없음");
top("테마").click();
panel.hasAttribute("hidden") && top("테마").attrs["aria-expanded"] === "false" ? t.ok("같은 버튼을 다시 누르면 닫힌다") : t.fail("테마를 다시 눌러도 안 닫힘");

// 3) 컬러: 접기 없이 버튼 색 5 + 팔레트 24 + 바탕 3
top("컬러").click();
opened("컬러") ? t.ok("컬러를 누르면 컬러 창이 그 버튼 아래로 열린다") : t.fail("컬러 창이 안 열림");
const c0 = cells(), pal = LK.PALETTE.flatMap((g) => g.colors);
button("더 많은 색") || button("접기") || panel.all().some((n) => cls(n, "hxp-morebtn")) ? t.fail("컬러 창에 접기 단추가 남아 있음") : t.ok("컬러 창에 접기 단추 없음");
c0.some((n) => cls(n, "hxp-ref") || cls(n, "hxp-font")) ? t.fail("컬러 창에 다른 창 칸이 보임") : t.ok("컬러 창엔 컬러 칸만");
const palShown = pal.filter((c) => c0.some((n) => n.attrs.title === c.name && (n.children[0].attrs.style || "").includes(c.hex))).length;
const basesShown = c0.filter((n) => ["흰색", "미색", "어두운"].includes(n.attrs.title)).length;
c0.length === 5 + 24 + 3 && pal.length === 24 && palShown === 24 && basesShown === 3
  ? t.ok(`컬러 칸 ${c0.length} = 버튼 색 5 + 팔레트 ${palShown} + 바탕 ${basesShown}`) : t.fail(`컬러 칸 ${c0.length} (팔레트 ${palShown}/${pal.length} · 바탕 ${basesShown})`);
c0.some((n) => cls(n, "hxp-chip") || cls(n, "hxp-hcard") || n.tagName === "INPUT") ? t.fail("색 바둑판 · 배색 · 그 밖의 색이 보임") : t.ok("색 바둑판 · 어울리는 배색 · 그 밖의 색 · 나머지 바탕은 그리지 않는다");
typeof LK.swatchGrid === "function" && typeof LK.harmonies === "function" && LK.BASES.length > 3 ? t.ok("looks.js swatchGrid · harmonies · 바탕 데이터는 남아 있다") : t.fail("looks.js 함수 · 바탕 데이터가 사라짐");

// 팔레트 색을 누르면 직접 고른 색 — 버튼 색 줄은 그 색 하나
const coral = c0.find((n) => n.attrs.title === "코랄");
coral.click();
const sel1 = ctl.get();
html.getAttribute("data-theme") === "custom" && sel1.custom.hex === "#FF6F61" && sel1.custom.from === "warm-paper" ? t.ok("팔레트 코랄 → 직접 고른 색(테마 따뜻한 종이 위)") : t.fail(`코랄 → ${html.getAttribute("data-theme")} ${JSON.stringify(sel1.custom)}`);
cells().length === 1 + 24 + 3 ? t.ok("직접 고른 뒤 컬러 칸 = 고른 색 1 + 24 + 3") : t.fail(`직접 고른 뒤 컬러 칸 ${cells().length}`);
!panel.hasAttribute("hidden") ? t.ok("창 안을 눌러도 창은 열려 있다") : t.fail("색을 고르자 창이 닫힘");

// 4) 당근 느낌 → 테마 · 판 모양 · 모서리 · 폰트가 같이
top("테마").click();
opened("테마") ? t.ok("열린 채 테마를 누르면 테마 창으로 바뀐다") : t.fail("컬러 → 테마 전환 안 됨");
const daangn = cells().find((n) => cls(n, "hxp-ref") && n.textContent.includes("당근 느낌"));
const want = window.HX_PRESET_DRESS.daangn, P = LK.PRESETS.find((p) => p.id === "daangn");
if (!daangn) t.fail("테마 창에 당근 느낌이 없음");
else {
  daangn.click();
  const attr = (k) => html.getAttribute("data-" + k);
  const same = (k) => (want[k] && want[k] !== "base" ? attr(k) === want[k] : attr(k) === null);
  attr("theme") === "daangn" && ctl.get().custom === null ? t.ok("당근 → data-theme daangn (직접 고른 색은 풀림)") : t.fail(`당근 → data-theme ${attr("theme")}`);
  same("cards") && same("radius") ? t.ok(`당근 → 판 모양 ${attr("cards") || "기본"} · 모서리 ${attr("radius") || "기본"}(시안 float · sharp에서)`) : t.fail(`당근 → 판 모양 ${attr("cards")} · 모서리 ${attr("radius")} (${JSON.stringify(want)}이어야 함)`);
  const sel = ctl.get();
  attr("font") === null && sel.font === "base" && window.HXColor.fontName(sel).includes(LK.fontOf(P).name) ? t.ok(`당근 → 폰트 명조 제목에서 ${window.HXColor.fontName(sel)}로`) : t.fail(`당근 → data-font ${attr("font")} · ${window.HXColor.fontName(sel)}`);
  head.all().some((n) => n.tagName === "STYLE" && n.textContent.includes('[data-theme="daangn"]')) ? t.ok("당근 분위기 토큰을 그 자리에서 계산해 넣었다") : t.fail("당근 분위기 CSS가 안 들어감");
  daangn.attrs["aria-checked"] === "true" ? t.ok("당근 칸에 고름 표시") : t.fail("당근 칸 고름 표시 없음");
  const last = changes[changes.length - 1] || {};
  last.theme === "daangn" && last.font === "base" ? t.ok("onChange로 보드에 테마 · 폰트가 넘어간다") : t.fail(`onChange: ${JSON.stringify(last)}`);
}

// 5) 폰트: 글꼴 · 글자 크기
top("폰트").click();
opened("폰트") ? t.ok("폰트를 누르면 폰트 창이 그 버튼 아래로 열린다") : t.fail("폰트 창이 안 열림");
const big = button("크게");
if (!big) t.fail("폰트 창에 글자 크기 '크게'가 없음");
else { big.click(); html.getAttribute("data-type") === "large" && ctl.get().type === "large" ? t.ok("폰트 창 '크게' → data-type large") : t.fail(`크게 → ${html.getAttribute("data-type")}`); }
const suit = panel.all().find((n) => cls(n, "hxp-font") && shown(n) && n.textContent.startsWith("수트"));
suit && (suit.click(), html.getAttribute("data-font") === "suit") ? t.ok("폰트 창 수트 → data-font suit") : t.fail("폰트 창에서 글꼴을 못 바꿈");

// 6) 붙는 곳: 보드 · 완성본 입구는 상단바(anchor), 화면별 페이지는 왼쪽 아래 묶음
const s22 = src("packages/core/canvas/22-board-canvas.js");
/segCtl|feelButton/.test(s22) ? t.fail("22-board-canvas.js: 상단바 글자 크기 단추(segCtl · feelButton)가 남아 있음") : t.ok("보드 상단바의 글자 크기 단추는 지웠다(폰트 창으로)");
/HXColor\.mount\(\{[^}]*anchor:/.test(src("packages/core/canvas/10-final.js")) ? t.ok("완성본 입구: 버튼 셋을 상단바에 단다") : t.fail("10-final.js: mount에 anchor가 없음 — 상단바가 아니라 왼쪽 아래에 뜸");

// 7) 새 형식(screens.json에 preset, looks 없음): build가 맞춤 1을 HX_OWN_LOOKS 맨 앞에 싣고, 테마 창은 9칸
{
  const w = require("../lib.js").workCopy("project/family-trip");
  try {
    const S0 = JSON.parse(src("test/fixtures/project/family-trip/screens.json"));
    fs.mkdirSync(path.join(w.run, "screens"));
    S0.screens.forEach((sc) => fs.writeFileSync(path.join(w.run, "screens", sc.slug + ".html"), "<main></main>"));
    fs.writeFileSync(path.join(w.run, "flow.json"), "{}");
    const r = require("../lib.js").run("build.js", w.run, "--mode", "board");
    const out = path.join(w.run, "out", "board.html");
    const m = r.code === 0 && fs.existsSync(out) && /window\.HX_OWN_LOOKS = (\[.*\]);/.exec(fs.readFileSync(out, "utf8"));
    const own2 = m ? JSON.parse(m[1]) : null;
    if (!own2) t.fail(`새 형식 build 실패 · HX_OWN_LOOKS 못 찾음 — ${r.out.split("\n").slice(-3).join(" ")}`);
    else {
      own2.length === 1 && own2[0].name === "이 서비스 맞춤" && own2[0].swatches[0].hex === S0.preset.brand.toUpperCase()
        ? t.ok("새 형식 build: HX_OWN_LOOKS = 맞춤 1(이 서비스 맞춤, preset 색)") : t.fail(`HX_OWN_LOOKS: ${JSON.stringify(own2).slice(0, 200)}`);
      const doc2 = new Node("#document"), html2 = new Node("html"), body2 = html2.appendChild(new Node("body"));
      Object.assign(doc2, { documentElement: html2, head: html2.appendChild(new Node("head")), body: body2, createElement: (tag) => new Node(tag), createTextNode: text, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] });
      const win2 = { HXLooks: LK, HX_OWN_LOOKS: own2 };
      new Function("window", "document", "getComputedStyle", "localStorage", src("packages/core/color/picker.js"))(win2, doc2, () => ({ getPropertyValue: () => "" }), localStorage);
      win2.HXColor.mount({ project: "t2", onChange: () => {} });
      const refs2 = body2.all().filter((n) => n.tagName === "BUTTON" && cls(n, "hxp-ref"));
      refs2.length === 9 && refs2[0].children[1].textContent === "이 서비스 맞춤" ? t.ok("새 형식 테마 창 = 9칸(맞춤 1 맨 앞 + 근거 8)") : t.fail(`새 형식 테마 칸 ${refs2.length}: ${refs2.map((n) => n.children[1].textContent).join(" · ")}`);
    }
  } finally { w.done(); }
}

t.end();
