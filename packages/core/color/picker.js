/* picker.js — 버튼 셋 테마 · 컬러 · 폰트: 다 만든 화면에서 골라 그 자리에서 다시 칠한다. 버튼이 곧 탭 — 누르면 그 내용만 담긴 창이 그 버튼 아래로 열린다.
   테마(이 서비스 맞춤 분위기 + presets.json에서 근거(source)가 있는 8개, 색 · 판 모양 · 모서리 · 글꼴을 한 번에) · 컬러(버튼 색 · 자주 쓰는 색 24 · 색 바둑판 · 어울리는 배색 · 그 밖의 색 · 바탕 12) · 폰트(글꼴 · 글자 크기).
   (이름 "색 바꾸기" → "화면 느낌"(탭 셋 스타일 · 색 · 글씨) → 지금. 설계 schema-on-pr27 9절 U1 · U2 · U4)
   사용자 결정(2026-10-14): "레이아웃이나 이런거 선택후에 색상은 자유롭게 최종 다 나온 결과물에서 바로바로 바뀌게".
   사람 결정(2026-10-21): "저 버튼들을 그냥 상단 쪽으로 다 통일, 스타일은 테마 · 색은 컬러 · 글씨는 폰트로 이름 변경, 색도 더보기로 선택하게 굳이 안 해도 되고, 스타일도 8개 정도면 된다".
   쓰는 곳: 초안 보드 · 시안 보드(상단바) · 최종본 입구(index.html 상단바) · 화면별 페이지(screens/NN-slug.html, 왼쪽 아래 — 창은 위로 열린다).
   필요한 것: window.HXLooks(scripts/looks.js) · window.HX_LOOKS_DATA(presets.json) · window.HX_OWN_LOOKS(screens.json looks — PRD 맞춤).
   컬러 창 = 접기 없이 한 창, 묶음마다 작은 제목 하나 — 왼쪽 단: 버튼 색(지금 테마의 5 또는 직접 고른 색) · 자주 쓰는 색 24(presets.json palette 기본 색 12 · 색다른 색 12)
     오른쪽 단: 색 바둑판(looks.js swatchGrid, 밝기 줄 순) · 어울리는 배색 5(harmonies) · 그 밖의 색(직접 입력) / 아래 한 줄: 바탕 12(presets.json bases). 좁은 폭에선 한 단으로 쌓인다.
     사람 의견(2026-10-21): "색 선택 요소가 너무 많아 보기 어렵다" · "더 보기로 굳이 안 해도 된다" → "컬러도 PR 27처럼 선택지는 어느 정도 있어 줘야 한다".
     그 밖의 바탕(bgHex)은 그리지 않는다 — 보내기 글로 온 bgHex는 그대로 칠한다.
   근거 없는 레퍼런스(source: null)도 그리지만 않는다 — 보내기 글로 온 테마 id는 그대로 칠한다.
   칠하는 법: <html data-theme data-swatch>를 바꾸고, 페이지에 없는 분위기 토큰은 looks.js로 계산해 <style>로 넣는다(글꼴도 불러온다).
   HXColor.mount({ project, anchor?, inline?, onChange?(sel), persist?, dress?, colorLocked?, fontLocked?, typeLocked?, rec?: { type } })
     — anchor가 있으면 그 안(상단바)에, 없으면 왼쪽 아래에 버튼 셋. inline이면 버튼 없이 창 셋을 펼쳐 둔다 — persist면 이 브라우저에 기억(최종본 페이지끼리 함께 바뀐다).
     colorLocked면 테마 · 컬러 창은 '확정'만. 글꼴 · 글자 크기는 따로 잠근다. 시안 단계도 폰트 창을 그대로 쓴다(사람 의견 2026-10-21 "1차안에도 테마 · 컬러 · 폰트가 반영될 수 있도록").
   레퍼런스 프리셋(토스 느낌…)을 고르면 <html data-cards data-radius>(판 모양 · 모서리)도 프리셋 값으로 바뀐다(build.js가 싣는 HX_PRESET_DRESS) — dress: false면 html은 그대로(보드는 화면 상자가 꾸밈을 입는다).
   sel = { theme, swatch, custom: { hex, name, base, bgHex?, font? } | null, font, type } — 바탕은 12가지(presets.json bases, tint = 고른 색으로 살짝) + 그 밖의 바탕(bgHex)
   글꼴: font = "base"(테마 글꼴) | looks.js FONTS id. <html data-font>로 바꾸고(토큰 CSS는 build.js가 5벌 다 싣는다) 글꼴 CSS는 고를 때 CDN에서 불러온다.
   글꼴 토큰은 글자 모양만 바꾸고 색은 바꾸지 않는다(looks.js fontTokens) — 대비는 그대로. 글자 크기 type = normal | large → <html data-type>. */
(function () {
  "use strict";
  var LK = window.HXLooks, DATA = window.HX_LOOKS_DATA || {};
  if (!LK) return;
  var doc = document, root = doc.documentElement;
  var OWN = (window.HX_OWN_LOOKS || []).map(function (l) { return Object.assign({ kind: "own" }, l); });
  var PRE = (LK.PRESETS || []).filter(function (p) { return !OWN.some(function (o) { return o.id === p.id; }); }).map(function (p) { return Object.assign({ kind: "preset" }, p); });
  var ALL = OWN.concat(PRE);
  var byId = function (id) { return ALL.filter(function (l) { return l.id === id; })[0] || null; };

  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === "text") n.textContent = v; else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? doc.createTextNode(c) : c); });
    return n;
  }
  // ---------- 칠하기: 없는 분위기는 계산해서 넣는다 ----------
  var sheet = null, painted = {}, fontsOn = {};
  function loadCss(urls) { (urls || []).forEach(function (u) { if (fontsOn[u] || doc.querySelector('link[href="' + u + '"]')) return; fontsOn[u] = 1; doc.head.appendChild(el("link", { rel: "stylesheet", href: u })); }); }
  function ensure(L) {
    if (!L || painted[L.id + (L.custom ? ":" + L.swatches[0].hex + L.base : "")]) return;
    if (!sheet) sheet = doc.head.appendChild(el("style", { id: "hx-color-runtime" }));
    var have = !L.custom && getComputedStyle(root).getPropertyValue("--c-bg") && doc.querySelector("style") && [].some.call(doc.querySelectorAll("style"), function (s) { return s !== sheet && s.textContent.indexOf('[data-theme="' + L.id + '"]') >= 0; });
    if (!have) {
      if (L.custom) sheet.textContent = sheet.textContent.replace(/\/\*custom\*\/[\s\S]*?\/\*\/custom\*\//, "");
      sheet.textContent += (L.custom ? "/*custom*/" : "") + LK.looksCss([L]) + (L.custom ? "/*/custom*/" : "") + "\n";
    }
    loadCss(LK.fontOf(L).css);
    painted[L.id + (L.custom ? ":" + L.swatches[0].hex + L.base : "")] = 1;
  }
  function lookOf(sel) { return sel.theme === "custom" && sel.custom ? LK.customLook(sel.custom, window.HX_OWN_LOOKS || []) : byId(sel.theme); }
  var FONTS = LK.FONTS || {};
  /* 글꼴: "base"면 data-font를 지워 테마 글꼴로, 아니면 그 글꼴 */
  function paintFont(f) {
    if (!f) return;
    if (f === "base" || !FONTS[f]) { root.removeAttribute("data-font"); return; }
    loadCss(FONTS[f].css); root.setAttribute("data-font", f);
  }
  function fontName(sel) { var L = lookOf(sel); return !sel.font || sel.font === "base" ? "기본 글꼴(" + ((L && LK.fontOf(L).name) || "") + ")" : (FONTS[sel.font] || {}).name || sel.font; }
  function paint(sel) {
    var L = lookOf(sel); if (!L) return;
    ensure(L);
    root.setAttribute("data-theme", L.id);
    root.setAttribute("data-swatch", L.swatches.some(function (s) { return s.id === sel.swatch; }) ? sel.swatch : L.swatches[0].id);
    paintFont(sel.font);
    if (sel.type) root.setAttribute("data-type", sel.type);
    dressRoot(sel);
  }
  // ---------- 프리셋 ↔ 꾸밈: 프리셋을 고르면 판 모양 · 모서리 두 칸만 덮는다(바탕 · 제목 · 간격은 시안 그대로) ----------
  // 프리셋인 때 = 고른 테마가 프리셋이거나, 직접 고른 색이 프리셋 위에 얹힌 것(custom.from). PRD 맞춤 분위기(OWN)는 아니다
  function presetId(sel) {
    var id = sel && (sel.theme === "custom" ? sel.custom && sel.custom.from : sel.theme);
    return PRE.some(function (p) { return p.id === id; }) ? id : null;
  }
  // { cards, radius } — build가 아직 안 실었으면 null(아무것도 바꾸지 않는다)
  function presetDress(sel) { var id = presetId(sel); return (id && (window.HX_PRESET_DRESS || {})[id]) || null; }
  var firstDress = null;   // mount 때 html에서 읽은 처음 판 모양 · 모서리 — null이면 html 꾸밈은 건드리지 않는다
  function dressRoot(sel) {
    if (!firstDress) return;
    var d = presetDress(sel) || firstDress;
    ["cards", "radius"].forEach(function (k) { if (d[k] && d[k] !== "base") root.setAttribute("data-" + k, d[k]); else root.removeAttribute("data-" + k); });
  }
  function hexOf(L, sw) { return LK.primaryHex(L, sw); }
  // 테마 창에 보이는 것 = 맞춤 분위기(맨 앞) + 근거 파일(source)이 있는 레퍼런스 — 나머지는 그리지 않는다
  var SHOWN = OWN.concat(PRE.filter(function (p) { return p.source; }));
  function nameOf(sel) {
    var L = lookOf(sel); if (!L) return "";
    if (L.custom) return "직접 고른 색 " + (sel.custom.name || sel.custom.hex) + " · " + (L.why.split(" · ")[1] || "");
    var sw = L.swatches.filter(function (s) { return s.id === sel.swatch; })[0] || L.swatches[0];
    return L.name + " · " + sw.name;
  }

  var CSS = [
    ".hxp-bar{display:inline-flex;align-items:center;gap:6px}.hxp-one{position:relative;display:inline-flex}",
    ".hxp-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border-radius:999px;border:1px solid rgba(0,0,0,.12);background:#fff;color:#111827;font:700 13px/1 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',Pretendard,sans-serif;cursor:pointer}",
    ".hxp-btn[aria-expanded=true]{border-color:#2563EB;color:#1D4ED8;box-shadow:0 0 0 3px #DBEAFE}",
    ".hxp-btn i{width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}",
    ".hxp-float{position:fixed;left:16px;bottom:16px;z-index:10000}.hxp-float .hxp-btn{box-shadow:0 4px 14px rgba(0,0,0,.12)}",
    ".hxp-panel{position:absolute;left:0;top:calc(100% + 8px);z-index:10001;width:min(640px,calc(100vw - 32px));max-height:min(72vh,640px);overflow:auto;box-sizing:border-box;padding:14px 16px;border-radius:14px;background:#fff;color:#111827;border:1px solid #E5E7EB;box-shadow:0 18px 48px rgba(0,0,0,.22);font:13px/1.4 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',Pretendard,sans-serif;text-align:left}",
    ".hxp-panel[hidden]{display:none}.hxp-float .hxp-panel{top:auto;bottom:calc(100% + 8px)}",
    ".hxp-head{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}.hxp-head b{font-size:14px}.hxp-head b,.hxp-head .hxp-reset{flex:none;white-space:nowrap}.hxp-now{color:#4B5563;font-weight:700}.hxp-sp{flex:1}",
    ".hxp-x{border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:#6B7280}",
    ".hxp-sub{margin:10px 0 6px;font-size:12px;font-weight:800;color:#6B7280}",
    ".hxp-dots{display:flex;flex-wrap:wrap;gap:2px}",
    ".hxp-dot{display:flex;flex-direction:column;align-items:center;gap:2px;width:48px;padding:3px 0;border:0;border-radius:8px;background:none;cursor:pointer;font:inherit;color:#4B5563}",
    ".hxp-dot:hover{background:#F3F4F6}.hxp-dot i{width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}",
    ".hxp-dot[aria-checked=true] i{box-shadow:0 0 0 2px #fff,0 0 0 4px #111827}.hxp-dot[aria-checked=true] small{color:#111827;font-weight:800}.hxp-dot small{font-size:10.5px;white-space:nowrap;max-width:52px;overflow:hidden;text-overflow:ellipsis}",
    ".hxp-seg{display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:#F3F4F6}",
    ".hxp-seg button{border:0;background:none;padding:6px 10px;border-radius:7px;font:inherit;font-weight:700;color:#4B5563;cursor:pointer}.hxp-seg button[aria-pressed=true]{background:#fff;color:#111827;box-shadow:0 1px 2px rgba(0,0,0,.12)}",
    ".hxp-pane[hidden]{display:none}.hxp-hint{margin:0 0 8px;color:#6B7280;font-size:12px}",
    // 컬러 창: 두 단(넓으면 나란히, 좁으면 한 단으로 쌓임) + 아래 한 줄 바탕
    ".hxp-panel[data-pane=color]{width:min(700px,calc(100vw - 32px))}.hxp-cols{display:flex;flex-wrap:wrap;gap:0 24px}.hxp-col{flex:1 1 290px;min-width:0}",
    ".hxp-grid{display:grid;grid-template-columns:repeat(12,20px);gap:3px}.hxp-chip{width:20px;height:20px;padding:0;border:0;border-radius:4px;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}",
    ".hxp-chip:hover{transform:scale(1.15)}.hxp-chip[aria-checked=true]{box-shadow:0 0 0 2px #fff,0 0 0 4px #111827}",
    ".hxp-harm{display:flex;flex-wrap:wrap;gap:6px}.hxp-hcard{display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px;border:1px solid #E5E7EB;border-radius:9px;background:#fff;cursor:pointer;font:inherit;color:#4B5563}",
    ".hxp-hcard:hover{border-color:#2563EB}.hxp-hprev{position:relative;display:block;width:44px;height:26px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}.hxp-hprev em{position:absolute;left:6px;right:6px;bottom:5px;height:7px;border-radius:4px}.hxp-hcard small{font-size:10.5px;white-space:nowrap}",
    ".hxp-other{display:inline-flex;align-items:center;gap:8px;color:#6B7280;cursor:pointer}.hxp-other input{width:30px;height:24px;padding:0;border:1px solid #E5E7EB;border-radius:6px;background:none;cursor:pointer}",
    ".hxp-refs{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px}",
    ".hxp-ref{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:5px;border:1.5px solid #E5E7EB;border-radius:10px;background:#fff;cursor:pointer;text-align:left;font:inherit;color:inherit}.hxp-ref[aria-checked=true]{border-color:#2563EB;box-shadow:0 0 0 3px #DBEAFE}",
    ".hxp-refprev{position:relative;display:block;width:100%;height:22px;border-radius:7px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1);box-sizing:border-box}.hxp-refprev em{position:absolute;left:7px;right:7px;top:7px;height:8px;border-radius:4px}",
    ".hxp-ref b{font-size:12px}",
    ".hxp-fonts{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px}",
    ".hxp-font{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:6px 8px;border:1.5px solid #E5E7EB;border-radius:9px;background:#fff;cursor:pointer;text-align:left;font:inherit;color:inherit}",
    ".hxp-font b{font-size:13px}.hxp-font small{font-size:11px;color:#6B7280}.hxp-font[aria-checked=true]{border-color:#2563EB;box-shadow:0 0 0 3px #DBEAFE}",
    ".hxp-warn{color:#B4532A;font-weight:700;font-size:12px}.hxp-reset{border:0;background:none;color:#2563EB;font:inherit;font-weight:700;cursor:pointer;padding:0}",
    ".hxp-inline .hxp-one{display:none}.hxp-inline .hxp-panel{position:static;width:auto;max-height:none;padding:0;border:0;border-radius:0;box-shadow:none;background:none}",
    ".hxp-inline .hxp-x{display:none}.hxp-inline .hxp-head{flex-wrap:wrap}.hxp-inline .hxp-refs{grid-template-columns:repeat(2,minmax(0,1fr))}"
  ].join("\n");
  // 버튼 셋 = 창 셋. 이름은 여기 한 곳(시험은 화면에서 읽는다)
  var PANES = [["theme", "테마", "잘 알려진 서비스의 느낌을 통째로 입혀 봐요"], ["color", "컬러", "버튼 색 · 바탕을 골라 바로 바꿔 봐요"], ["font", "폰트", "글꼴 · 글자 크기를 골라 바로 바꿔 봐요"]];
  var TYPES = [["normal", "보통"], ["large", "크게"]];

  window.HXColor = {
    names: nameOf, paint: paint, fontName: fontName, presetId: presetId, presetDress: presetDress,
    /* 화면에 버튼 셋(테마 · 컬러 · 폰트)과 창을 붙인다. 처음 값 = html의 data-theme · data-swatch · data-font · data-type (persist면 이 브라우저에 기억한 값) */
    mount: function (o) {
      o = o || {};
      if (!doc.getElementById("hxp-css")) doc.head.appendChild(el("style", { id: "hxp-css", text: CSS }));
      var key = "hx-color:" + (o.project || "project");
      var first = { theme: root.getAttribute("data-theme"), swatch: root.getAttribute("data-swatch"), custom: o.custom || null, font: root.getAttribute("data-font") || "base", type: root.getAttribute("data-type") || "normal" };
      if (o.dress !== false) firstDress = { cards: root.getAttribute("data-cards"), radius: root.getAttribute("data-radius") };
      var start = Object.assign({}, first, o.initial || {}), sel = Object.assign({}, start);
      if (o.persist) { try { var saved = JSON.parse(localStorage.getItem(key) || "null"); if (saved && saved.theme) sel = Object.assign({ font: first.font, type: first.type }, saved); } catch (e) {} }
      // 잠긴 것은 기억한 값이 덮지 못하게 처음 값으로
      var fontFixed = !!o.fontLocked, typeFixed = !!o.typeLocked;
      if (fontFixed) sel.font = start.font;
      if (typeFixed) sel.type = start.type;
      paint(sel);
      // 버튼 셋 — 버튼마다 자리(.hxp-one)가 있고, 창 하나가 누른 버튼 자리로 옮겨 가 그 아래(왼쪽 아래 묶음이면 위)로 열린다
      var dotBtn = el("i"), btns = {}, ones = {};
      var now = el("span", { class: "hxp-now" }), warn = el("span", { class: "hxp-warn" }), title = el("b");
      var panel = el("div", { class: "hxp-panel", role: "dialog", hidden: "" });
      var wrap = el("div", { class: "hxp-bar " + (o.inline ? "hxp-inline" : o.anchor ? "hxp-anch" : "hxp-float"), role: "group", "aria-label": PANES.map(function (p) { return p[1]; }).join(" · ") });
      PANES.forEach(function (p) {
        btns[p[0]] = el("button", { type: "button", class: "hxp-btn", title: p[2], "aria-expanded": "false", "aria-haspopup": "dialog", onclick: function (e) { e.stopPropagation(); toggle(panel.hasAttribute("hidden") || openId !== p[0] ? p[0] : false); } },
          [p[0] === "color" ? dotBtn : null, p[1]]);
        ones[p[0]] = wrap.appendChild(el("span", { class: "hxp-one" }, [btns[p[0]]]));
      });
      if (o.inline) { panel.removeAttribute("hidden"); wrap.appendChild(panel); }
      (o.anchor || doc.body).appendChild(wrap);

      function set(next) {
        sel = next; paint(sel);
        if (o.persist) { try { localStorage.setItem(key, JSON.stringify(sel)); } catch (e) {} }
        if (o.onChange) o.onChange(sel);
        sync();
      }
      function pickLook(L, swId) { set(Object.assign({}, sel, { theme: L.id, swatch: swId || L.swatches[0].id, custom: null })); }
      // 테마(레퍼런스): 색 · 판 모양 · 모서리에 더해 글꼴도 그 테마 것으로 되돌린다(font=base) — 시안 꾸밈 글꼴이 덮어 "토스 느낌인데 명조"가 되지 않게
      function pickRef(P) { set(Object.assign({}, sel, { theme: P.id, swatch: P.swatches[0].id, custom: null, font: fontFixed ? sel.font : "base" })); }
      function pickFont(f) { set(Object.assign({}, sel, { font: f })); }
      function pickType(t) { set(Object.assign({}, sel, { type: t })); }
      // 직접 고른 색은 지금 테마 위에 버튼 색만 바꾼다(from) — 사용자: "직접 고르기를 하면 스타일이 사라지니까"
      function pickCustom(c) {
        var prev = sel.custom || {}, from = sel.theme === "custom" ? (prev.from || null) : sel.theme;
        var base = c.base || prev.base || "white", bgHex = c.base ? (c.bgHex || null) : (c.bgHex !== undefined ? c.bgHex : prev.bgHex || null);
        var cu = { hex: String(c.hex).toUpperCase(), name: c.name || "", base: c.base || prev.base || null };
        if (from) cu.from = from;
        if (prev.font) cu.font = prev.font;   // 프리셋 글꼴은 색을 바꿔도 그대로
        if (!cu.base) delete cu.base;
        if (bgHex) cu.bgHex = String(bgHex).toUpperCase();
        set(Object.assign({}, sel, { theme: "custom", swatch: "custom", custom: cu }));
      }
      function curHex() { var L = lookOf(sel); return sel.custom ? { hex: sel.custom.hex, name: sel.custom.name } : { hex: hexOf(L, L.swatches.filter(function (s) { return s.id === sel.swatch; })[0] || L.swatches[0]), name: "" }; }
      // 버튼 색: 지금 테마의 5개, 직접 고른 색이면 그 색 하나
      var swBox = el("div", { class: "hxp-dots" });
      function buildSw() {
        while (swBox.firstChild) swBox.removeChild(swBox.firstChild);
        var L = lookOf(sel);
        if (!L) return;
        if (L.custom) {
          swBox.appendChild(el("button", { type: "button", class: "hxp-dot", role: "radio", "aria-checked": "true", title: sel.custom.name || sel.custom.hex },
            [el("i", { style: "background:" + sel.custom.hex }), el("small", { text: sel.custom.name || "직접 고른 색" })]));
          if (sel.custom.from) swBox.appendChild(el("span", { class: "hxp-now", text: "테마는 " + (byId(sel.custom.from) || {}).name + " 그대로" }));
          return;
        }
        L.swatches.forEach(function (sw) {
          swBox.appendChild(el("button", { type: "button", class: "hxp-dot", role: "radio", "aria-checked": sw.id === sel.swatch ? "true" : "false", title: sw.name, onclick: function () { pickLook(L, sw.id); } },
            [el("i", { style: "background:" + hexOf(L, sw) }), el("small", { text: sw.name })]));
        });
      }
      // 바탕: 12가지(presets.json bases, 살짝 물든 = 고른 색으로) (사용자: "바탕색은 한정적이야?")
      var baseBtns = [];
      function baseDot(bs) {
        var sw = bs.id === "tint" ? "linear-gradient(135deg, #FFFFFF 40%, " + (sel.custom ? sel.custom.hex : "#9BB4F0") + ")" : bs.bg;
        var b = el("button", { type: "button", class: "hxp-dot", role: "radio", title: bs.name, onclick: function () { var c = curHex(); pickCustom({ hex: c.hex, name: c.name, base: bs.id }); } },
          [el("i", { style: "background:" + sw }), el("small", { text: bs.name })]);
        baseBtns.push([b, bs.id]); return b;
      }
      // 이름 있는 색 칸(자주 쓰는 색 24) · 색 바둑판 칸 — 고른 색과 같으면 고름 표시
      var palBtns = [];
      function palDot(c) {
        var b = el("button", { type: "button", class: "hxp-dot", role: "radio", title: c.name, onclick: function () { pickCustom(c); } }, [el("i", { style: "background:" + c.hex }), el("small", { text: c.name })]);
        palBtns.push([b, c.hex.toUpperCase()]); return b;
      }
      // 색 바둑판: 색상 12 × 밝기 5 + 회색 줄(looks.js swatchGrid) — 밝은 줄부터
      var grid = el("div", { class: "hxp-grid" });
      (LK.swatchGrid ? LK.swatchGrid() : []).forEach(function (row) { row.forEach(function (hx) {
        var b = el("button", { type: "button", class: "hxp-chip", title: hx, "aria-label": hx, style: "background:" + hx, onclick: function () { pickCustom({ hex: hx, name: "" }); } });
        palBtns.push([b, hx.toUpperCase()]); grid.appendChild(b);
      }); });
      // 어울리는 배색 5가지: 지금 버튼 색에서 바탕 · 버튼 조합(looks.js harmonies) — 색이 바뀔 때마다 다시 그린다
      var harmBox = el("div", { class: "hxp-harm" });
      function buildHarm() {
        while (harmBox.firstChild) harmBox.removeChild(harmBox.firstChild);
        if (!lookOf(sel)) return;   // 아직 칠한 테마가 없으면(html에 data-theme 없음) 계산할 색이 없다
        var base = curHex();
        (LK.harmonies ? LK.harmonies(base.hex) : []).forEach(function (h) {
          harmBox.appendChild(el("button", { type: "button", class: "hxp-hcard", title: h.name + " — 버튼 " + h.hex + " · 바탕 " + h.bgHex, onclick: function () { pickCustom({ hex: h.hex, name: h.name, bgHex: h.bgHex }); } },
            [el("span", { class: "hxp-hprev", style: "background:" + h.bgHex }, [el("em", { style: "background:" + h.hex })]), el("small", { text: h.name })]));
        });
      }
      var other = el("input", { type: "color", "aria-label": "그 밖의 색", value: "#5B5BD6", oninput: function () { pickCustom({ hex: other.value, name: "" }); } });
      var reset = el("button", { type: "button", class: "hxp-reset", text: "처음으로", onclick: function () { set(Object.assign({}, first, fontFixed ? { font: sel.font } : {}, typeFixed ? { type: sel.type } : {})); } });
      panel.appendChild(el("div", { class: "hxp-head" }, [title, now, el("span", { class: "hxp-sp" }), reset, el("button", { type: "button", class: "hxp-x", "aria-label": "닫기", text: "×", onclick: function () { toggle(false); } })]));
      panel.appendChild(warn);
      var lockNote = function (t) { return el("span", { class: "hxp-now", text: "확정: " + t }); };
      // ---- 테마 창: 맞춤 분위기(맨 앞) + 근거 있는 레퍼런스 8개 ----
      // (2026-10-18 "당근 · 토스 등 레퍼런스 preset" → 2026-10-21 "스타일도 8개 정도면 된다" — 근거(source) 있는 8개만, 더 보기 없음)
      var themeBtns = [], themePane = el("div", { class: "hxp-pane" });
      function themeCard(L) {
        var sw = L.swatches[0], own = L.kind === "own";
        var b = el("button", { type: "button", class: "hxp-ref", role: "radio", title: L.why || L.name, onclick: function () { if (own) pickLook(L); else pickRef(L); } },
          [el("span", { class: "hxp-refprev", style: "background:" + L.bg }, [el("em", { style: "background:" + hexOf(L, sw) })]), el("b", { text: L.name })]);
        themeBtns.push([b, L.id]); return b;
      }
      if (o.colorLocked) themePane.appendChild(lockNote(nameOf(sel)));
      else {
        themePane.appendChild(el("p", { class: "hxp-hint", text: "잘 알려진 서비스의 느낌을 통째로 입혀 봐요. 색 · 판 모양 · 모서리 · 글꼴이 함께 바뀌고, 화면 구성은 그대로예요." }));
        themePane.appendChild(el("div", { class: "hxp-refs" }, SHOWN.map(themeCard)));
      }
      // ---- 컬러 창: 접기 없이 한 창 — 왼쪽 단 · 오른쪽 단 · 아래 한 줄, 묶음마다 작은 제목 하나 ----
      var colorPane = el("div", { class: "hxp-pane" });
      if (o.colorLocked) colorPane.appendChild(lockNote(nameOf(sel)));
      else {
        // 묶음 = [제목, 내용]. data-col은 단 이름(시험이 단 위치를 잰다)
        var group = function (name, body) { return [el("div", { class: "hxp-sub", text: name }), body]; };
        var col = function (id, kids) { return el("div", { class: "hxp-col", "data-col": id }, [].concat.apply([], kids)); };
        var pals = [].concat.apply([], (LK.PALETTE || []).map(function (g) { return g.colors; }));
        colorPane.appendChild(el("div", { class: "hxp-cols" }, [
          col("main", [group("버튼 색", swBox), group("자주 쓰는 색", el("div", { class: "hxp-dots" }, pals.map(palDot)))]),
          col("more", [group("색 바둑판", grid), group("어울리는 배색", harmBox), group("그 밖의 색", el("label", { class: "hxp-other" }, [other, el("small", { text: "눌러서 아무 색이나" })]))])
        ]));
        colorPane.appendChild(col("base", [group("바탕", el("div", { class: "hxp-dots" }, (LK.BASES || []).map(baseDot)))]));
      }
      // ---- 폰트 창: 글꼴(기본 글꼴 + looks.js FONTS) · 글자 크기 ----
      var fontPane = el("div", { class: "hxp-pane" });
      var fontBtns = [], typeBtns = [];
      var fontBox = el("div", { class: "hxp-fonts" });
      if (o.fontLocked) fontBox.appendChild(lockNote(fontName(sel)));
      else ["base"].concat(Object.keys(FONTS)).forEach(function (f) {
        var F = FONTS[f], b = el("button", { type: "button", class: "hxp-font", role: "radio", title: F ? F.why : "고른 테마에 맞춘 글꼴", onclick: function () { pickFont(f); } },
          [el("b", { text: F ? F.name : "기본 글꼴", style: F ? "font-family:" + (F.head || F.sans) : null }), el("small", { text: F ? "가나다 Aa 123" : "테마 것", style: F ? "font-family:" + F.sans : null })]);
        fontBtns.push([b, f]); fontBox.appendChild(b);
      });
      var typeBox = el("div", { class: "hxp-seg", role: "group", "aria-label": "글자 크기" });
      if (o.typeLocked) typeBox = lockNote("글자 크기 " + ((TYPES.filter(function (t) { return t[0] === sel.type; })[0] || [0, sel.type])[1]));
      else TYPES.forEach(function (t) { var b = el("button", { type: "button", "aria-pressed": "false", text: t[1] + (o.rec && o.rec.type === t[0] ? " · 추천" : ""), onclick: function () { pickType(t[0]); } }); typeBtns.push([b, t[0]]); typeBox.appendChild(b); });
      fontPane.appendChild(el("div", { class: "hxp-sub", text: "글꼴" })); fontPane.appendChild(fontBox);
      fontPane.appendChild(el("div", { class: "hxp-sub", text: "글자 크기" })); fontPane.appendChild(typeBox);
      // ---- 버튼 = 탭: 누른 버튼의 창만 보인다(inline이면 셋 다) ----
      var panes = { theme: themePane, color: colorPane, font: fontPane }, openId = null;
      PANES.forEach(function (p) { panel.appendChild(panes[p[0]]); });
      function show(id) {
        openId = id;
        PANES.forEach(function (p) {
          var on = o.inline || p[0] === id;
          if (on) panes[p[0]].removeAttribute("hidden"); else panes[p[0]].setAttribute("hidden", "");
          btns[p[0]].setAttribute("aria-expanded", !o.inline && p[0] === id && !panel.hasAttribute("hidden") ? "true" : "false");
          if (p[0] === id) { title.textContent = p[1]; panel.setAttribute("aria-label", p[1]); panel.setAttribute("data-pane", id); }   // data-pane: 컬러 창만 더 넓게(CSS)
        });
      }

      function sync() {
        var L = lookOf(sel), custom = L && L.custom;
        // 테마 칸의 고름 표시: 고른 테마, 직접 고른 색이면 그 색을 얹은 테마
        var themeNow = custom ? sel.custom.from : sel.theme;
        themeBtns.forEach(function (x) { x[0].setAttribute("aria-checked", x[1] === themeNow ? "true" : "false"); });
        palBtns.forEach(function (x) { x[0].setAttribute("aria-checked", custom && x[1] === String(sel.custom.hex).toUpperCase() ? "true" : "false"); });
        baseBtns.forEach(function (x) { x[0].setAttribute("aria-checked", custom && !sel.custom.bgHex && x[1] === sel.custom.base ? "true" : "false"); });
        fontBtns.forEach(function (x) { x[0].setAttribute("aria-checked", x[1] === (sel.font || "base") ? "true" : "false"); });
        typeBtns.forEach(function (x) { x[0].setAttribute("aria-pressed", x[1] === sel.type ? "true" : "false"); });
        buildSw(); buildHarm();
        now.textContent = "지금: " + nameOf(sel) + " · " + fontName(sel) + " · 글자 " + (sel.type === "large" ? "크게" : "보통");
        var sw = L && (L.swatches.filter(function (s) { return s.id === sel.swatch; })[0] || L.swatches[0]);
        dotBtn.style.background = L ? hexOf(L, sw) : "#999";
        warn.textContent = L && LK.contrast(hexOf(L, sw), L.bg) < 1.6 ? "바탕과 색이 비슷해서 버튼이 잘 안 보일 수 있어요" : "";
      }
      // toggle(id): 그 버튼 아래로 창을 연다 · toggle(false): 닫는다
      // 상단바에서 버튼이 화면 오른쪽 절반에 있으면 창 오른쪽 끝을 버튼에 맞춘다(화면 밖으로 안 나가게)
      function toggle(id) {
        if (o.inline) return;
        if (!id) { panel.setAttribute("hidden", ""); show(openId); return; }
        ones[id].appendChild(panel); panel.removeAttribute("hidden"); show(id);
        if (o.anchor && ones[id].getBoundingClientRect) {
          var r = ones[id].getBoundingClientRect(), end = r.left + r.width / 2 > (window.innerWidth || 0) / 2;
          panel.style.left = end ? "auto" : "0"; panel.style.right = end ? "0" : "auto";
          // 그래도 넘치면(휴대폰 폭) 넘친 만큼 옮긴다 — 화면 양끝 8px 안
          var vw = window.innerWidth || 0, pr = panel.getBoundingClientRect(), push = pr.right > vw - 8 ? vw - 8 - pr.right : pr.left < 8 ? 8 - pr.left : 0;
          if (vw && push) { panel.style.left = (pr.left - r.left + push) + "px"; panel.style.right = "auto"; }
        }
      }
      if (!o.inline) ones[PANES[0][0]].appendChild(panel);
      show(PANES[0][0]);
      // 창 안을 누르면 닫지 않는다 — 누른 단추가 다시 그려지며 사라져도(버튼 색 줄) 안쪽으로 본다 (사용자: "버튼 누르면 팝업이 닫히는데 안 닫히게")
      var inside = false;
      wrap.addEventListener("pointerdown", function () { inside = true; }, true);
      doc.addEventListener("click", function (e) {
        var path = e.composedPath ? e.composedPath() : [];
        if (inside || path.indexOf(wrap) >= 0 || wrap.contains(e.target)) { inside = false; return; }
        toggle(false);
      });
      doc.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
      sync();
      if (o.onChange && (sel.theme !== first.theme || sel.swatch !== first.swatch || sel.font !== first.font || sel.type !== first.type)) o.onChange(sel);
      return { get: function () { return sel; }, set: set, open: function (id) { toggle(id || PANES[0][0]); }, tab: function (id) { toggle(id); } };
    }
  };
})();
