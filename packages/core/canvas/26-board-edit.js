/* 26-board-edit.js — 화면을 바로 고치기 (시험판 tmp/edit-proto v4를 옮김 · 모드 없음).
   붙는 곳 둘: 화면 디자인 탭의 가운데 화면(24-board-screens.js) · '자세히 보기' 창(00-core HX.openScreen — 사용 흐름 · 시안 · 화면 디자인 탭에서 연다).
   ⠿ 손잡이: 마우스를 올린 가장 안쪽 덩어리 왼쪽 — 잡고 끌면 같은 부모 안의 보이는 형제끼리 자리가 바로 바뀐다(한 줄에 나란한 버튼 · 칩은 가로로).
             짝이 없으면 한 겹 바깥 덩어리에 붙는다.
   누르기: 붙은 곳의 고르기(화면 디자인 탭은 오른쪽 의견 창까지) + 고른 곳 오른쪽 위 A− A+ ✕ · 두 번 누르기: 그 자리에서 글자 고쳐 쓰기(Enter 확정 · Esc 취소).
   ✕는 '빼주세요' 핀 그대로(hide 표시만 더한다), 나머지는 B.state.edits(20-board.js가 저장하고 보내기 줄을 만든다) — 어디서 고쳐도 같은 목록 · 같은 되돌리기.
   시안 화면("<시안 id>~<slug>")에서 고친 것 · 뺀 곳은 concept(시안 id)를 기억한다.
   경로는 조각 파일 기준: 화면을 붙인 직후, 고친 것을 다시 입히기 전에 잰 경로를 끝까지 쓴다(자리를 옮겨도 그대로).
   손잡이 · 단추 · 따라오는 상자는 화면 조각(section) 밖 화면 상자(.hx-sd-frame)에 둔다 — 경로 계산에 섞이지 않는다. */
(function () {
  "use strict";
  var HX = window.HX, B = HX.board, doc = document;
  if (!B) return;
  // 마우스를 올린 곳에서 손잡이를 붙일 덩어리를 찾기 시작하는 단위 (시험판 그대로)
  var BLOCK = "[data-region], li, button, a, .card, .timeline-item, .list-item, p, h1, h2, h3, label, .field, .nowrap, .badge, .chip, ul, ol";
  var STEPS = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"];   // 글자 크기 단계(--fs-*) — 이 밖으로는 안 나간다
  function one(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function cut(t) { t = one(t); return t.length > 18 ? t.slice(0, 18) + "…" : t; }

  // 사람이 읽는 말 — '고친 것' 목록과 보내기 확인 창(23-board-send.js)이 같이 쓴다. 보내는 줄은 20-board.js B.editLine
  B.editSay = function (e) {
    var s = HX.bySlug[e.slug];
    if (e.kind === "order" && e.region) return "구역 순서: " + e.names.map(function (k) { var r = s && s.regions.filter(function (x) { return x.key === k; })[0]; return r ? r.label : k; }).join(" → ");
    if (e.kind === "order") return "'" + e.title + "' 안 순서: " + e.names.join(" → ");
    if (e.kind === "text") return "글자 '" + cut(e.from) + "' → '" + cut(e.to) + "'";
    return e.desc + " " + Math.abs(e.n) + "단계 " + (e.n > 0 ? "크게" : "작게");
  };

  // 이 화면(시안 화면이면 그 시안)의 것인가 — 고친 것 · 뺀 곳 핀 모두
  function ofScreen(x, slug, concept) { return !!x && x.slug === slug && (x.concept || null) === (concept || null); }
  // 이 화면에 고친 것 · 뺀 곳을 한 줄로 — 화면에 보이는 모습이 저장된 것과 어긋났는지 볼 때
  function sigOf(slug, concept) { return JSON.stringify(editsOf(slug, concept).concat(hiddenOf(slug, concept))); }
  function editsOf(slug, concept, kind) { return B.state.edits.filter(function (e) { return ofScreen(e, slug, concept) && (!kind || e.kind === kind); }); }
  function hiddenOf(slug, concept) {
    var st = B.state;
    return Object.keys(st.pins).map(function (k) { return st.pins[k]; }).filter(function (p) { return ofScreen(p, slug, concept) && p.hide; }).sort(function (a, b) { return a.id - b.id; });
  }

  // ---------- 화면 한 장을 재고 저장된 고친 것을 입힌다 — 고치기 도구(mount)와 캔버스의 작은 화면(B.dressEdits)이 같이 쓴다 ----------
  // 잰 것 m = { slug, concept, orig: 처음 경로, byPath: 경로 → 요소, origAt: 처음 자리(부모 안 몇 번째), base: 글자마다 처음 단계 { i, inline }, sized: 지금 크기를 바꿔 둔 글자들 }
  function measure(sec, slug, concept) {
    var m = { slug: slug, concept: concept || null, orig: new WeakMap(), origAt: new WeakMap(), byPath: {}, base: new WeakMap(), sized: [] };
    [].forEach.call(sec.querySelectorAll("*"), function (n) {
      var p = B.pickKit.pathIn(n, sec); m.orig.set(n, p); if (!(p in m.byPath)) m.byPath[p] = n;
      m.origAt.set(n, [].indexOf.call(n.parentElement.children, n));
      if (texts(n).length && !n.closest("svg")) baseOf(m, n);   // 처음 글자 크기는 아무것도 바꾸기 전에
    });
    editsOf(slug, concept, "order").forEach(function (e) {
      var par = m.byPath[e.parent], kids = e.kids.map(function (p) { return m.byPath[p]; });
      if (par && kids.every(function (k) { return k && k.parentElement === par; })) arrange(kids);
    });
    hiddenOf(slug, concept).forEach(function (p) { var n = m.byPath[p.path]; if (n) n.classList.add("hx-ed-gone"); });
    editsOf(slug, concept, "text").forEach(function (e) { var n = m.byPath[e.path]; if (n) setText(n, e.to); });
    sizes(m);
    return m;
  }
  // kids를 지금 그 자리들(같은 부모 안)에 새 순서로 다시 꽂는다 — 사이 빈칸 · 다른 자식은 그대로
  function arrange(kids) {
    var slots = kids.slice().sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
    var marks = slots.map(function (k) { var c = doc.createComment(""); k.before(c); return c; });
    marks.forEach(function (c, i) { c.replaceWith(kids[i]); });
  }
  function texts(n) { return [].filter.call(n.childNodes, function (c) { return c.nodeType === 3 && c.data.trim(); }); }
  function setText(n, s) {
    var ts = texts(n);
    if (!ts.length) { n.appendChild(doc.createTextNode(s)); return; }
    ts[0].data = s; ts.slice(1).forEach(function (c) { c.data = ""; });
  }
  // 글자 크기 단계 값은 그 글자에 실제로 걸린 값에서 읽는다 — 역할 글자 크게(.app[data-type=large])면 화면 겉보다 한 칸씩 크다.
  // 보드는 var(--fs-단계)로 칠하므로 같은 곳에서 읽어야 A+ 한 번이 그 화면의 다음 단계 하나가 된다(edits.js .text-단계와 같은 길)
  function steps(l) {
    var cs = getComputedStyle(l);
    return STEPS.map(function (k) { return { k: k, px: parseFloat(cs.getPropertyValue("--fs-" + k)) }; }).filter(function (x) { return x.px > 0; });
  }
  function leaves(n) {
    if (texts(n).length) return [n];
    return [].filter.call(n.querySelectorAll("*"), function (c) { return !c.closest("svg") && !c.classList.contains("hx-ed-gone") && texts(c).length; });
  }
  function baseOf(m, l) {
    var b = m.base.get(l); if (b) return b;
    var L = steps(l); if (!L.length) return null;
    var px = parseFloat(getComputedStyle(l).fontSize), i = 0;
    L.forEach(function (x, j) { if (Math.abs(x.px - px) < Math.abs(L[i].px - px)) i = j; });
    b = { i: i, L: L, inline: l.style.fontSize }; m.base.set(l, b); return b;
  }
  function levelOf(m, l) {
    var b = baseOf(m, l), r = /^var\(--fs-([a-z0-9]+)\)$/.exec(l.style.fontSize), i = r ? b.L.map(function (x) { return x.k; }).indexOf(r[1]) : -1;
    return i >= 0 ? i : b.i;
  }
  function roomOf(m, ls) {
    ls = ls.filter(function (l) { return baseOf(m, l); });
    return { up: ls.some(function (l) { return levelOf(m, l) < baseOf(m, l).L.length - 1; }), down: ls.some(function (l) { return levelOf(m, l) > 0; }) };
  }
  // 저장된 크기 단계를 글자마다 더해서 입힌다(덩어리와 그 안의 글자를 따로 키웠으면 둘 다 더함)
  function sizes(m) {
    var ls = [], ds = [];
    editsOf(m.slug, m.concept, "size").forEach(function (e) {
      var n = m.byPath[e.path]; if (!n) return;
      leaves(n).filter(function (l) { return baseOf(m, l); }).forEach(function (l) { var i = ls.indexOf(l); if (i < 0) { ls.push(l); ds.push(e.n); } else ds[i] += e.n; });
    });
    m.sized.forEach(function (l) { if (ls.indexOf(l) < 0) l.style.fontSize = baseOf(m, l).inline; });
    ls.forEach(function (l, i) { var b = baseOf(m, l), L = b.L; l.style.fontSize = ds[i] ? "var(--fs-" + L[HX.clamp(b.i + ds[i], 0, L.length - 1)].k + ")" : b.inline; });
    m.sized = ls;
  }
  // 캔버스(사용 흐름 · 시안)의 작은 화면: 막 붙인 화면 조각에 저장된 고친 것을 입힌다(보기만). sig = 입힌 것이 낡았는지 볼 때
  B.dressEdits = function (sec, slug, concept) { measure(sec, slug, concept); };
  B.editSig = sigOf;

  // S = 붙일 화면의 고르기: 화면 디자인 탭은 24-board-screens.js의 HX.sd, 자세히 보기 창은 아래 HX.zoomEdit
  //   { pathOf, rectIn, descOf, whereOf, seen, picked(), pick(el), ensurePin(v), refresh(), frame(), live(): 키보드를 받을 때인가 }
  B.buildEdit = function (S) {
    var frame = null, box = null, slug = null, concept = null, shown = "";   // shown: 화면에 입혀 둔 고친 것(sigOf)
    var m = null;                                  // 붙인 화면을 잰 것(measure)
    var gripFor = null, editing = null, drag = null;
    var grip = HX.el("button", { type: "button", class: "hx-ed-grip", text: "⠿", title: "잡고 끌어서 자리 바꾸기", "aria-label": "잡고 끌어서 자리 바꾸기" });
    var acts = HX.el("div", { class: "hx-ed-acts", role: "group", "aria-label": "고른 곳 바로 고치기" });
    var ghost = HX.el("div", { class: "hx-ed-ghost" });
    var list = HX.el("section", { class: "hx-ed-list", "aria-label": "화면에서 바로 고친 것" });
    var aDown = act("A−", "글자 한 단계 작게", function () { bump(-1); });
    var aUp = act("A+", "글자 한 단계 크게", function () { bump(1); });
    var aDel = act("✕", "화면에서 빼기 (Delete)", hideIt); aDel.classList.add("hx-ed-del");
    aDel.addEventListener("mouseenter", function () { if (box) box.classList.add("hx-ed-warn"); });
    aDel.addEventListener("mouseleave", function () { if (box) box.classList.remove("hx-ed-warn"); });
    function act(t, title, fn) {
      var b = HX.el("button", { type: "button", text: t, title: title, "aria-label": title, onclick: function (e) { e.stopPropagation(); if (!b.disabled) fn(); } });
      acts.appendChild(b); return b;
    }
    grip.addEventListener("pointerdown", dragStart);

    // ---------- 상태 ----------
    function edits() { return B.state.edits; }
    function mine(kind) { return editsOf(slug, concept, kind); }
    function hiddenPins() { return hiddenOf(slug, concept); }
    function add(e) { e.slug = slug; if (concept) e.concept = concept; edits().push(e); return e; }
    function drop(e) { var l = edits(), i = l.indexOf(e); if (i >= 0) l.splice(i, 1); }
    // 이 화면에서 고친 뒤: 화면에 입힌 것을 기억하고 저장 · 알림
    function changed() { shown = sigOf(slug, concept); B.changed(); }
    // 화면 길이가 늘면 프레임도 늘린다(00-core growToContent). 줄일 때 높이를 되돌리면 보던 자리(스크롤)가 튀므로 늘리기만
    function relayout() { HX.relayout(); }

    // ---------- 화면을 붙일 때: 처음 경로를 재고, 저장된 고친 것을 다시 입힌다 ----------
    //   o = { slug, concept } — 시안 화면은 프레임 이름("<시안 id>~<slug>") 대신 원래 화면 slug와 시안 id
    function mount(f, b, o) {
      frame = f; box = b; slug = o && o.slug || f.slug; concept = o && o.concept || null;
      m = measure(f.section, slug, concept);
      box.appendChild(grip); box.appendChild(acts); box.appendChild(ghost);
      grip.style.display = acts.style.display = ghost.style.display = "none";
      f.section.addEventListener("mousemove", onMove);
      f.section.addEventListener("dblclick", onDbl, true);
      box.addEventListener("mouseleave", function () { if (!drag) { gripFor = null; paint(); } });
      shown = sigOf(slug, concept);
      renderList();
    }
    function unmount() {
      if (editing) editing.done();
      if (drag) drag.end();
      frame = box = slug = concept = m = null; gripFor = null;
    }

    // ---------- ⠿ 손잡이 · A− A+ ✕ 자리 ----------
    function blockOf(t) {
      if (!frame || !t || t.nodeType !== 1 || !frame.section.contains(t) || t.closest(".toast")) return null;
      var n = t.closest(BLOCK); return n && frame.section.contains(n) && n.closest(".app") ? n : null;
    }
    // 끌어 옮길 수 있는 짝 — 같은 부모 아래 보이는 형제 전부(구역은 구역끼리). 종류가 달라도 서로 자리를 바꾼다
    function peers(n) {
      var par = n && n.parentElement; if (!par) return [];
      var reg = n.hasAttribute("data-region");
      return [].filter.call(par.children, function (c) {
        if (c.classList.contains("hx-ed-gone") || /^(script|style|template|svg)$/i.test(c.tagName)) return false;
        if (reg) return c.hasAttribute("data-region");
        var cs = getComputedStyle(c);
        return cs.display !== "none" && cs.position !== "absolute" && cs.position !== "fixed" && c.getBoundingClientRect().height > 0;
      });
    }
    // 마우스 아래 가장 안쪽의 옮길 수 있는 덩어리 — 짝이 없으면 한 겹씩 바깥으로
    function movable(t) {
      var n = blockOf(t), app = frame && (frame.section.querySelector(".app") || frame.section);
      while (n && n !== app && app.contains(n) && !n.classList.contains("content")) {
        if (peers(n).length > 1) return n;
        n = n.parentElement;
      }
      return null;
    }
    function onMove(e) {
      if (drag || editing) return;
      // 요소에서 왼쪽 손잡이로 가는 길(그 줄 높이 · 요소 왼쪽)에선 손잡이를 다른 덩어리로 옮기지 않는다
      if (gripFor) {
        var g = gripFor.getBoundingClientRect();
        if (e.clientY >= g.top && e.clientY <= g.bottom && e.clientX < g.left + 8 && !gripFor.contains(e.target)) return;
      }
      var n = movable(e.target);
      if (n !== gripFor) { gripFor = n; paint(); }
    }
    // 24의 paintPins가 부른다(고를 때 · 화면 크기가 바뀔 때 · 상태가 바뀔 때)
    function paint() {
      if (!box) return;
      var q;
      if (gripFor && gripFor.isConnected && !drag && !editing) {
        q = S.rectIn(gripFor);
        grip.style.display = ""; grip.style.left = Math.max(-26, q.x - 28) + "px"; grip.style.top = (q.y + Math.min(q.h, 44) / 2 - 13) + "px";
      } else grip.style.display = "none";
      var p = S.picked();
      if (!p || p.msg || !frame || p.el === frame.section || !frame.section.contains(p.el) || drag || editing || p.el.classList.contains("hx-ed-gone")) { acts.style.display = "none"; box.classList.remove("hx-ed-warn"); return; }
      var room = roomOf(m, leaves(p.el));
      aDown.disabled = !room.down; aUp.disabled = !room.up; aDel.disabled = p.el.classList.contains("app");
      acts.style.display = ""; q = S.rectIn(p.el);
      var w = acts.offsetWidth;
      acts.style.left = Math.max(0, Math.min(box.clientWidth - w, q.x + q.w - w + 8)) + "px"; acts.style.top = Math.max(-14, q.y - 16) + "px";
    }

    // ---------- ✕ 빼기: '빼주세요' 핀 그대로 + 화면에서 바로 숨김 ----------
    function hideIt() {
      var p = S.picked(); if (!p || !frame || p.el.classList.contains("app")) return;
      var pin = S.ensurePin("remove"); pin.hide = true;
      p.el.classList.add("hx-ed-gone");
      if (gripFor && p.el.contains(gripFor)) gripFor = null;
      S.pick(null); relayout(); changed();
    }

    // ---------- 글자 크기 A− A+: 글자 하나면 그것만, 덩어리면 안의 글자 모두 한 단계씩 ----------
    function bump(d) {
      var p = S.picked(); if (!p || !frame) return;
      var room = roomOf(m, leaves(p.el)); if (d > 0 ? !room.up : !room.down) return;
      var path = S.pathOf(p.el), ex = mine("size").filter(function (e) { return e.path === path; })[0];
      if (!ex) ex = add({ kind: "size", path: path, desc: p.desc, n: 0 });
      ex.n += d; if (!ex.n) drop(ex);
      sizes(m); relayout(); changed();
    }

    // ---------- 두 번 누르기: 그 자리에서 고쳐 쓰기 ----------
    function textOf(n) { return one(texts(n).map(function (c) { return c.data; }).join(" ")); }
    // 글자를 직접 품은 요소 — 누른 곳이 묶음이면 그 안 첫 글자
    function textLeaf(t) {
      if (!t || t.nodeType !== 1 || t.closest("svg")) return null;
      if (texts(t).length) return t;
      var w = doc.createTreeWalker(t, NodeFilter.SHOW_TEXT, { acceptNode: function (c) { return c.data.trim() && !c.parentElement.closest("svg") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; } });
      var c = w.nextNode(); return c ? c.parentElement : null;
    }
    function onDbl(e) {
      if (drag || (e.target.closest && e.target.closest(".toast"))) return;
      e.preventDefault(); e.stopPropagation();
      var n = textLeaf(e.target); if (n && frame && frame.section.contains(n)) startEdit(n);
    }
    function startEdit(n) {
      if (editing) editing.done();
      var before = textOf(n), keep = texts(n).map(function (c) { return [c, c.data]; });
      var desc = S.descOf(n), path = S.pathOf(n);
      n.setAttribute("contenteditable", "plaintext-only"); if (n.contentEditable !== "plaintext-only") n.setAttribute("contenteditable", "true");
      n.classList.add("hx-ed-editing"); n.focus();
      var sel = getSelection(), rg = doc.createRange(); rg.selectNodeContents(n); sel.removeAllRanges(); sel.addRange(rg);
      function key(ev) {
        if (ev.isComposing || ev.keyCode === 229) return;   // 한글을 조합하는 중의 Enter는 글자 확정일 뿐
        if (ev.key === "Enter") { ev.preventDefault(); done(); }
        else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); done(true); }
      }
      function blur() { done(); }
      function done(cancel) {
        if (editing !== ed) return;
        editing = null;
        n.removeEventListener("keydown", key); n.removeEventListener("blur", blur);
        n.removeAttribute("contenteditable"); n.classList.remove("hx-ed-editing");
        getSelection().removeAllRanges();
        if (cancel) { if (keep.every(function (k) { return k[0].parentNode === n; })) keep.forEach(function (k) { k[0].data = k[1]; }); else setText(n, before); }
        else recordText(path, desc, before, textOf(n));
        paint();
      }
      var ed = editing = { el: n, done: done };
      n.addEventListener("keydown", key); n.addEventListener("blur", blur);
      paint();
    }
    function recordText(path, desc, before, after) {
      var ex = mine("text").filter(function (e) { return e.path === path; })[0];
      if (ex) { if (after === one(ex.from)) drop(ex); else ex.to = after; }
      else if (after !== before) add({ kind: "text", path: path, desc: desc, from: before, to: after });
      else return;
      relayout(); changed();
    }
    // 화면 속을 누르면 고르기가 기본 동작(초점 옮기기)을 막으므로 고쳐 쓰던 글자가 스스로 끝나지 않는다 → 여기서 끝낸다
    function onDown(e) { if (editing && !editing.el.contains(e.target)) editing.done(); }
    // Delete · Backspace = ✕ (고른 곳이 있고 글자를 쓰는 중이 아닐 때)
    function onKey(e) {
      if (!frame || editing || !S.live() || (e.key !== "Delete" && e.key !== "Backspace")) return;
      var t = e.target; if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (acts.style.display !== "none" && !aDel.disabled) { e.preventDefault(); hideIt(); }
    }
    doc.addEventListener("mousedown", onDown, true);
    doc.addEventListener("keydown", onKey);

    // ---------- 끌어 옮기기: 따라오는 상자 + 원래 자리는 흐리게 + 놓일 곳에 바로 끼워 넣기 ----------
    function scroller() {
      for (var n = box && box.parentElement; n && n !== doc.body; n = n.parentElement) {
        var o = getComputedStyle(n).overflowY;
        if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
      }
      return null;
    }
    function dragStart(e) {
      var n = gripFor; if (!n || !frame) return;
      e.preventDefault(); e.stopPropagation();
      if (editing) editing.done();
      var start = peers(n); if (start.length < 2) return;
      S.pick(null);
      var a = start[0].getBoundingClientRect(), b2 = start[1].getBoundingClientRect();
      var horiz = Math.abs(a.top - b2.top) < 6 && a.left !== b2.left;   // 짝들이 한 줄에 나란히(버튼 · 칩) — 가로로 옮긴다
      var r = n.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top, sc = scroller(), lastX = e.clientX, lastY = e.clientY, raf = 0;
      var before = [].slice.call(n.parentElement.children), touched = [];
      var q = S.rectIn(n);
      ghost.textContent = S.descOf(n);
      ghost.style.cssText = "display:block;left:" + q.x + "px;top:" + q.y + "px;width:" + q.w + "px;height:" + q.h + "px";
      n.classList.add("hx-ed-hole"); doc.body.classList.add("hx-ed-dragging");
      drag = { el: n, end: up }; paint();
      // 화면은 줄여서 보여 주므로(scale) 화면 안에서 움직일 거리 = 창에서 잰 거리 ÷ 배율
      function k() { return frame.stage.getBoundingClientRect().width / HX.frame.w || 1; }
      function slide(ls, fn) {   // 짝들이 새 자리로 미끄러지게(FLIP)
        var pos = ls.map(function (c) { var b = c.getBoundingClientRect(); return [b.left, b.top]; }), s = k();
        fn();
        ls.forEach(function (c, i) {
          if (c === n) return;
          var b = c.getBoundingClientRect(), ddx = (pos[i][0] - b.left) / s, ddy = (pos[i][1] - b.top) / s; if (!ddx && !ddy) return;
          if (!touched.some(function (x) { return x[0] === c; })) touched.push([c, c.style.transition, c.style.transform]);
          c.style.transition = "none"; c.style.transform = "translate(" + ddx + "px," + ddy + "px)";
          c.getBoundingClientRect();
          c.style.transition = "transform .16s ease"; c.style.transform = "";
        });
      }
      function mid(c) {   // 미끄러지는 중이어도 제자리 기준 가운데(가로면 x, 세로면 y)
        var b = c.getBoundingClientRect(), mx = /matrix\(([^)]+)\)/.exec(getComputedStyle(c).transform), v = mx ? mx[1].split(",") : null, s = k();
        return horiz ? (b.left + b.right) / 2 - (v ? parseFloat(v[4]) * s : 0) : (b.top + b.bottom) / 2 - (v ? parseFloat(v[5]) * s : 0);
      }
      function reorder(x, y) {   // 포인터보다 앞에 가운데가 있는 짝 수 = 들어갈 자리(크게 휙 끌어도 한 번에)
        var ls = peers(n), others = ls.filter(function (c) { return c !== n; }), at = horiz ? x : y;
        var to = others.filter(function (c) { return at > mid(c); }).length;
        if (to === ls.indexOf(n)) return;
        slide(ls, function () { if (to >= others.length) others[others.length - 1].after(n); else others[to].before(n); });
      }
      function follow() { var bb = box.getBoundingClientRect(); ghost.style.left = (lastX - bb.left - dx) + "px"; ghost.style.top = (lastY - bb.top - dy) + "px"; }
      function tick() {   // 보이는 칸 위 · 아래 끝에 가까우면 저절로 스크롤
        raf = 0; if (!sc) return;
        var R = sc.getBoundingClientRect(), edge = 56, v = 0;
        if (lastY < R.top + edge) v = -(R.top + edge - lastY) / 3; else if (lastY > R.bottom - edge) v = (lastY - (R.bottom - edge)) / 3;
        if (v) { sc.scrollTop += v; follow(); reorder(lastX, lastY); raf = requestAnimationFrame(tick); }
      }
      function move(ev) {
        lastX = ev.clientX; lastY = ev.clientY;
        follow(); reorder(lastX, lastY);
        if (!raf) raf = requestAnimationFrame(tick);
      }
      function up() {
        doc.removeEventListener("pointermove", move); doc.removeEventListener("pointerup", up); doc.removeEventListener("pointercancel", up);
        if (raf) cancelAnimationFrame(raf);
        ghost.style.display = "none"; n.classList.remove("hx-ed-hole"); doc.body.classList.remove("hx-ed-dragging"); drag = null;
        // 미끄러지던 것은 바로 제자리로 — 남은 움직임을 끊지 않으면 한 줄이 옆 줄 위에 겹쳐 멈춰 있을 수 있다
        touched.forEach(function (x) { (x[0].getAnimations ? x[0].getAnimations() : []).forEach(function (a) { a.cancel(); }); x[0].style.transition = x[1]; x[0].style.transform = x[2]; });
        if (!frame) return;
        var now = [].slice.call(n.parentElement.children);
        if (now.some(function (c, i) { return c !== before[i]; })) recordOrder(n);
        relayout(); gripFor = n; S.pick(n);
      }
      doc.addEventListener("pointermove", move); doc.addEventListener("pointerup", up); doc.addEventListener("pointercancel", up);
    }
    function nameOf(c) { var t = one(S.seen(c).join(" ")).slice(0, 12).trim(); return t ? "'" + t + "'" : c.tagName.toLowerCase(); }
    function recordOrder(n) {
      var par = n.parentElement, kids = [].slice.call(par.children), reg = n.hasAttribute("data-region");
      var pp = S.pathOf(par), ex = mine("order").filter(function (e) { return e.parent === pp; })[0];
      var same = kids.every(function (c, i) { return !i || (m.origAt.get(kids[i - 1]) || 0) < (m.origAt.get(c) || 0); });
      if (same) { if (ex) drop(ex); }
      else {
        var e = ex || add({ kind: "order", parent: pp, region: reg });
        e.kids = kids.map(S.pathOf);
        // 구역 순서: 그 화면의 구역 key 전부(위에서 아래) · 구역 안 순서: 보이는 형제 전부의 글자 앞 12자
        e.names = reg ? [].map.call(frame.section.querySelectorAll("[data-region]"), function (c) { return c.getAttribute("data-region"); }) : peers(n).map(nameOf);
        if (!reg) e.title = S.whereOf(par) || "화면";
      }
      changed();
    }

    // ---------- 오른쪽 '고친 것' 목록: 하나씩 되돌리기 ----------
    function undo(r) {
      if (r.pin) { var p = r.pin; if (B.one(p.memo) || p.icon) { p.v = "change"; delete p.hide; } else delete B.state.pins[p.id]; }
      else drop(r.e);
      changed(); S.refresh();   // 처음 화면에 남은 고친 것을 다시 입힌다
    }
    function renderList() {
      list.innerHTML = "";
      if (!slug) return;
      var rows = mine().map(function (e) { return { e: e, say: B.editSay(e) }; })
        .concat(hiddenPins().map(function (p) { return { pin: p, say: p.desc + " 뺌" }; }));
      list.appendChild(HX.el("div", { class: "hx-sd-h", text: "화면에서 바로 고친 것 " + rows.length + "개" }));
      list.appendChild(HX.el("p", { class: "hx-ed-how", text: "⠿ 손잡이를 끌면 자리 바꾸기 · 누르면 A− A+ ✕ · 두 번 누르면 글자 고쳐 쓰기" }));
      rows.forEach(function (r) {
        list.appendChild(HX.el("div", { class: "hx-ed-row" }, [HX.el("span", { class: "hx-ed-say", text: r.say }),
          HX.btn("되돌리기", { cls: "hx-ed-undo", icon: HX.icon("#i-undo-2"), title: "이것만 처음대로", onclick: function () { undo(r); } })]));
      });
    }
    HX.on("board-change", renderList);

    return {
      list: list, mount: mount, unmount: unmount, paint: paint,
      pathOf: function (n) { return m && m.orig.get(n) || null; },
      // 지금 붙인 화면이면 처음 경로로 찾는다(없으면 null), 다른 화면(안내 문구 모음 등)이면 undefined — 24가 원래대로 찾는다
      resolve: function (p) { return frame && S.frame() === frame ? m.byPath[p] || null : undefined; },
      owns: function (t) { return !!(editing && editing.el.contains(t)); },
      busy: function () { return !!drag; },
      // 다른 곳(자세히 보기 창 ↔ 화면 디자인 탭)에서 이 화면을 고쳐서, 붙여 둔 화면이 저장된 것과 다른가
      stale: function () { return !!slug && sigOf(slug, concept) !== shown; },
      // 자세히 보기 창을 닫을 때: 문서에 단 것을 떼어 낸다
      destroy: function () { unmount(); doc.removeEventListener("mousedown", onDown, true); doc.removeEventListener("keydown", onKey); HX.off("board-change", renderList); }
    };
  };

  // ---------- 자세히 보기 창(00-core HX.openScreen)에 붙이기 ----------
  // 화면 디자인 탭과 같은 고르기 재료(24 B.pickKit)로 고르기를 만들고 위 고치기 도구를 붙인다. 오른쪽 의견 창 대신 '고친 것' 목록만.
  // 창은 캔버스(사용 흐름 · 시안) 밖 맨 위에 뜨므로 끌기가 캔버스 이동과 겹치지 않는다.
  //   z = { slug, concept: 시안 id 또는 null, frame, box: 화면을 담은 상자, remount(): 화면을 새로 붙이고 그 프레임을 돌려준다 } → { list, destroy }
  HX.zoomEdit = function (z) {
    var K = B.pickKit, fr = z.frame, box = z.box, picked = null, E = null;
    var hov = HX.el("div", { class: "hx-pick-hov" }), lab = HX.el("div", { class: "hx-pick-lab" }), sel = HX.el("div", { class: "hx-pick-sel" });
    function pick(el) {
      picked = el ? { el: el, path: S.pathOf(el), desc: K.descOf(el), where: K.whereIn(el, z.slug), pinId: null } : null;
      paint();
    }
    function paint() { K.place(sel, picked && picked.el, box, 2); E.paint(); }
    var S = {
      pathOf: function (el) { return E.pathOf(el) || K.pathIn(el, fr.section); },
      rectIn: function (el) { return K.rectIn(el, box); },
      descOf: K.descOf, seen: K.seen, whereOf: function (el) { return K.whereIn(el, z.slug); },
      picked: function () { return picked; }, pick: pick,
      ensurePin: function (v) { return K.pinFor(picked, z.slug, v, z.concept); },
      refresh: function () { E.unmount(); fr = z.remount(); put(); },
      frame: function () { return fr; },
      live: function () { return box.isConnected; }
    };
    E = B.buildEdit(S);
    function put() {   // 화면을 붙일 때마다: 고르기 표시 · 고르기 · 고친 것 다시 입히기
      box.appendChild(hov); box.appendChild(lab); box.appendChild(sel);
      hov.style.display = lab.style.display = sel.style.display = "none"; picked = null;
      K.wire(fr.section, { box: box, hov: hov, lab: lab, busy: E.busy, owns: E.owns,
        show: function (e) { var t = K.targetIn(e.target, fr.section); return t && { el: t, say: K.descOf(t) }; },
        pick: function (e) { pick(K.targetIn(e.target, fr.section)); } });
      E.mount(fr, box, { slug: z.slug, concept: z.concept });
    }
    put();
    HX.on("layout", paint);   // 글자 크기 · 자리가 바뀌어 화면이 다시 놓이면 테두리 · 단추도 따라간다
    return { list: E.list, destroy: function () { HX.off("layout", paint); E.destroy(); } };
  };
})();
