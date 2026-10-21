/* 12-design-system.js — 입구(10-final.js) · 초안 보드(24-board-screens.js)의 [디자인 시스템] 탭.
   이 결과물이 함께 쓰는 약속을 한 장에(docs/design-system.md §1 · §2 · §4):
   기본 단위(간격 · 모서리 · 그림자 · 글자 단계) · 색의 쓰임과 대비 · 자주 쓰는 모양(버튼 · 이름표 · 판 · 입력칸) · 고른 테마의 근거.
   값은 여기 적지 않는다 — 지금 칠해진 CSS 변수를 견본 틀(.app)에서 getComputedStyle로 읽는다. 변수 이름도 base.css에 적힌 것을 모은다.
   대비는 scripts/looks.js의 contrast · 바닥선(TEXT_MIN · TEXT2_MIN · buttonMin) 그대로 — lint의 audit와 같은 계산 · 같은 기준.
   상단 테마 · 컬러 · 폰트에서 색 · 글꼴 · 글자 크기를 바꾸면 <html>의 data-* 나 <head>의 색 <style>이 바뀐다 → 지켜보다가 다시 그린다(숨어 있으면 보일 때). */
(function () {
  "use strict";
  var HX = window.HX, doc = document, root = doc.documentElement;

  // 글자 단계 · 그림자 단계의 일상어 이름 (없는 이름은 변수 이름 그대로)
  var T_NAME = { display: "가장 큰 글자", title1: "화면 제목", title2: "큰 제목", title3: "묶음 제목", body: "본문", label: "버튼 · 메뉴 글자", caption: "보조 글자", micro: "가장 작은 글자" };
  var SHADOW_NAME = ["그림자 없음", "살짝", "보통", "크게"];
  // 색의 쓰임 — [변수, 이름, 어디에 쓰나, 대비 짝들]. 짝 = [글자 변수, 바탕 변수, 바닥선(text · text2 · button · null = 기준 없음)]
  var ON = function (fg, kind) { return [[fg, "--c-bg", kind], [fg, "--c-surface", kind]]; };
  var ROLES = [
    ["--c-brand", "브랜드 색", "고른 메뉴 밑줄 · 표시선 · 아이콘처럼 꾸밈에 써요. 글자에는 쓰지 않아요", [["--c-brand", "--c-bg", null]]],
    ["--c-primary", "버튼 색", "화면에서 가장 중요한 버튼 하나의 바탕", [["--c-primary-fg", "--c-primary", "button"]]],
    ["--c-primary-fg", "버튼 글자", "버튼 색 위에 놓이는 글자", [["--c-primary-fg", "--c-primary", "button"]]],
    ["--c-primary-text", "강조 글자", "링크 · 고른 메뉴 글자 · 큰 숫자", ON("--c-primary-text", "text")],
    ["--c-text", "본문 글자", "제목과 본문", ON("--c-text", "text")],
    ["--c-text-2", "보조 글자", "설명 · 부제목", ON("--c-text-2", "text2")],
    ["--c-text-muted", "흐린 글자", "날짜 · 도움말 · 입력칸 안내", ON("--c-text-muted", "text")],
    ["--c-surface", "판", "글과 버튼을 담는 판의 바탕", [["--c-text", "--c-surface", "text"]]],
    ["--c-bg", "바탕", "화면 전체의 바탕", [["--c-text", "--c-bg", "text"]]]
  ];
  var STATUS_USE = { success: "다 됐을 때 알림 · 완료 표시", warning: "한 번 더 확인할 때", danger: "잘못됐거나 지울 때", info: "알아 두면 좋은 안내" };
  Object.keys(HX.TONE_NAME).forEach(function (k) {
    ROLES.push(["--c-" + k, HX.TONE_NAME[k] + " 색", STATUS_USE[k] || "", [["--c-" + k + "-soft-fg", "--c-" + k + "-soft", "text"]]]);
  });
  var PLACE = { "--c-bg": "바탕 위", "--c-surface": "판 위", "--c-primary": "버튼 색 위" };
  function placeOf(bg) { return PLACE[bg] || (/-soft$/.test(bg) ? "연한 바탕 위" : "위"); }
  /* 무엇 대비인지 — "바탕 위" · "본문 글자 · 판 위" · "버튼 글자 · 버튼 색 위" · "바탕과"(기준 없는 꾸밈 색) */
  function pairLabel(R, pr) {
    if (!pr[2]) return "바탕과";
    if (pr[2] === "button") return "버튼 글자 · " + placeOf(pr[1]);
    return (pr[0] === R[0] ? "" : pr[0] === "--c-text" ? "본문 글자 · " : "글자 · ") + placeOf(pr[1]);
  }

  // ---------- 값 읽기 ----------
  /* 스타일시트에 적힌 변수 이름 중 re에 맞는 것 (처음 나온 순서, @media 안까지) */
  function tokenNames(re) {
    var out = [];
    function walk(r) {
      if (r.cssRules) [].forEach.call(r.cssRules, walk);
      if (!r.style) return;
      for (var i = 0; i < r.style.length; i++) { var n = r.style[i]; if (re.test(n) && out.indexOf(n) < 0) out.push(n); }
    }
    [].forEach.call(doc.styleSheets, function (sh) { var rs; try { rs = sh.cssRules; } catch (e) { return; } [].forEach.call(rs || [], walk); });
    return out;
  }
  var byNum = function (a, b) { return parseFloat(a.slice(a.lastIndexOf("-") + 1)) - parseFloat(b.slice(b.lastIndexOf("-") + 1)); };
  /* 어떤 CSS 색이든 #RRGGBB로 (color-mix 같은 값은 1px 칠해서 읽는다) */
  var cv = null;
  function hexOf(v) {
    v = String(v || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toUpperCase();
    cv = cv || doc.createElement("canvas"); cv.width = cv.height = 1;
    var g = cv.getContext("2d", { willReadFrequently: true });
    g.clearRect(0, 0, 1, 1); g.fillStyle = "#000000"; g.fillStyle = v; g.fillRect(0, 0, 1, 1);
    var d = g.getImageData(0, 0, 1, 1).data;
    return "#" + [d[0], d[1], d[2]].map(function (n) { return n.toString(16).padStart(2, "0"); }).join("").toUpperCase();
  }

  // ---------- 지금 고른 테마 ----------
  function curSel() {
    var B = HX.board, F = HX.final;
    if (HX.mode === "board" && B && B.state) return { theme: B.state.theme, swatch: B.state.accent, custom: B.state.custom || null };
    if (F && F.color) return F.color.get();
    return { theme: root.getAttribute("data-theme"), swatch: root.getAttribute("data-swatch"), custom: HX.meta.custom || null };
  }
  function lookOf(sel, LK) {
    var own = window.HX_OWN_LOOKS || [];
    if (sel.theme === "custom" && sel.custom) return LK.customLook(sel.custom, own);
    return own.concat(LK.PRESETS || []).filter(function (l) { return l.id === sel.theme; })[0] || null;
  }
  /* 근거 한 줄 — 레퍼런스면 출처(없으면 참고용), 맞춤이면 이 서비스에 맞춰 계산 */
  function whyLine(sel, L, LK) {
    var pid = window.HXColor ? window.HXColor.presetId(sel) : null;
    var P = pid && (LK.PRESETS || []).filter(function (p) { return p.id === pid; })[0];
    var own = sel.custom ? " 버튼 색은 직접 고른 " + String(sel.custom.hex).toUpperCase() + "이에요." : "";
    if (P && P.source) {
      var s = P.source;
      return [HX.el("b", { text: "'" + P.name + "' — 공개된 디자인 자료에서 옮긴 색 · 모서리 · 판 모양이에요." + own }),
        HX.el("span", { class: "hx-ds-var", text: "출처 " + s.repo + " · " + s.file + (s.commit ? " @" + s.commit : "") + (s.license ? " · " + s.license : "") })];
    }
    if (P) return [HX.el("b", { text: "'" + P.name + "' — 참고용이에요. 근거 자료 없이 그 앱의 인상만 빌린 테마라 실제 앱과 다를 수 있어요." + own })];
    if (sel.theme === "custom" && sel.custom) return [HX.el("b", { text: "직접 고른 색 " + (sel.custom.name ? sel.custom.name + " " : "") + String(sel.custom.hex).toUpperCase() + " — 이 색에 맞춰 바탕 · 글자 · 버튼 글자를 계산했어요." })];
    return [HX.el("b", { text: "'" + ((L && L.name) || sel.theme) + "' — 이 서비스에 맞춰 계산한 색이에요." + (L && L.why ? " " + L.why : "") })];
  }

  // ---------- 그리기 ----------
  HX.buildDesignSystem = function () {
    var inner = HX.el("div", { class: "hx-ds-in" });
    var el = HX.el("div", { class: "hx-ds", "aria-label": "디자인 시스템" }, inner);
    var mobile = HX.platform === "mobile";
    // 견본 틀: 화면 조각과 같은 .app — 분위기 · 꾸밈 · 글자 크기 변수를 그대로 받는다
    function app(kids, cls) { return HX.el("div", { class: "app hx-ds-app" + (mobile ? " app-mobile" : "") + (cls ? " " + cls : "") }, kids); }
    function varTag(name, value) { return HX.el("span", { class: "hx-ds-var", text: name + (value ? " · " + value : "") }); }
    function sec(key, title, desc, kids) { return HX.el("section", { class: "hx-ds-sec", dataset: { ds: key } }, [HX.el("h3", { text: title }), desc ? HX.el("p", { text: desc }) : null].concat(kids)); }

    function draw() {
      dirty = false;
      var LK = window.HXLooks, top = el.scrollTop;
      inner.innerHTML = "";
      var probe = app([], "hx-ds-probe");
      inner.appendChild(probe);
      var cs = getComputedStyle(probe), val = function (n) { return cs.getPropertyValue(n).trim(); };
      var sel = curSel(), L = LK ? lookOf(sel, LK) : null;

      inner.appendChild(HX.el("header", { class: "hx-ds-head" }, [
        HX.el("div", {}, [HX.el("h2", { text: "디자인 시스템" }),
          HX.el("p", { text: "이 화면들이 함께 쓰는 간격 · 모서리 · 글자 · 색이에요. 위쪽 테마 · 컬러 · 폰트에서 바꾸면 여기도 바로 바뀌어요." })]),
        LK ? HX.el("p", { class: "hx-ds-why" }, whyLine(sel, L, LK)) : null]));
      var body = inner.appendChild(HX.el("div", { class: "hx-ds-body" }));   // 두 단: 왼쪽 기본 단위 · 오른쪽 색 + 모양

      // ① 기본 단위
      var sp = tokenNames(/^--sp-\d+$/).sort(byNum), rr = tokenNames(/^--r-\d+$/).sort(byNum), sh = tokenNames(/^--shadow-\d+$/).sort(byNum);
      var ts = tokenNames(/^--t-[a-z0-9]+-size$/).map(function (n) { return n.slice(4, -5); });
      var sentence = HX.meta.title || "함께 쓰는 화면을 한눈에 봐요";
      body.appendChild(sec("unit", "기본 단위", "모든 화면이 이 단계 안에서만 고릅니다.", [
        HX.el("div", { class: "hx-ds-sub", text: "간격" }),
        app(sp.map(function (n) { return HX.el("div", { class: "hx-ds-sp" }, [HX.el("i", { style: "width:var(" + n + ")" }), HX.el("b", { text: val(n) }), varTag(n)]); }), "hx-ds-sps"),
        HX.el("div", { class: "hx-ds-sub", text: "모서리" }),
        app(rr.map(function (n) { return HX.el("figure", { class: "hx-ds-fig" }, [HX.el("i", { class: "hx-ds-box", style: "border-radius:var(" + n + ")" }), HX.el("b", { text: val(n) }), varTag(n)]); }), "hx-ds-figs"),
        HX.el("div", { class: "hx-ds-sub", text: "그림자" }),
        app(sh.map(function (n, i) { return HX.el("figure", { class: "hx-ds-fig" }, [HX.el("i", { class: "hx-ds-box hx-ds-lift", style: "box-shadow:var(" + n + ")" }), HX.el("b", { text: SHADOW_NAME[i] || n }), varTag(n)]); }), "hx-ds-figs"),
        HX.el("div", { class: "hx-ds-sub", text: "글자 단계" }),
        app(ts.map(function (k) {
          var p = "--t-" + k + "-";
          return HX.el("div", { class: "hx-ds-type" }, [
            HX.el("div", {}, [HX.el("b", { text: T_NAME[k] || k }), varTag(p + "*", val(p + "size") + " · 굵기 " + val(p + "weight") + " · 줄 " + val(p + "lh"))]),
            HX.el("p", { style: "font-size:var(" + p + "size);line-height:var(" + p + "lh);font-weight:var(" + p + "weight)", text: sentence })]);
        }), "hx-ds-types")
      ]));

      // ② 색의 쓰임과 대비
      var MIN = LK ? { text: LK.TEXT_MIN, text2: LK.TEXT2_MIN, button: function (fg) { return LK.buttonMin(L, fg); } } : null;
      body.appendChild(sec("color", "색의 쓰임", "숫자는 글자와 그 아래 바탕의 대비예요. 클수록 잘 읽혀요. 글자는 4.5 이상(보조 글자는 6), 고른 테마 본래의 흰 버튼 글자는 3 이상이 기준이에요.", [
        HX.el("div", { class: "hx-ds-roles" }, ROLES.map(function (R) {
          var hex = hexOf(val(R[0])), first = R[3][0];
          var demo = app([HX.el("span", { class: "hx-ds-sw", style: "background:var(" + R[0] + ")" }),
            HX.el("span", { class: "hx-ds-demo", style: "color:var(" + first[0] + ");background:var(" + first[1] + ")", text: "가나다 123" })], "hx-ds-rs");
          var pairs = LK ? R[3].map(function (pr) {
            var fg = hexOf(val(pr[0])), bg = hexOf(val(pr[1])), r = LK.contrast(fg, bg);
            var min = pr[2] === "button" ? MIN.button(fg) : pr[2] ? MIN[pr[2]] : null, ok = min == null || r >= min;
            var label = pairLabel(R, pr) + " " + r.toFixed(2);
            var verdict = min == null ? "꾸밈 색이라 기준 없음" : "기준 " + min + (min < LK.TEXT_MIN ? "(고른 테마 버튼 그대로)" : "") + (ok ? " 통과" : " 모자람");
            return HX.el("li", { class: "hx-ds-ratio " + (min == null ? "is-info" : ok ? "is-ok" : "is-bad"),
              dataset: { fg: pr[0], bg: pr[1], ratio: r.toFixed(2), min: min == null ? "" : String(min), pass: min == null ? "" : ok ? "1" : "0" } }, [label + " · " + verdict]);
          }) : [];
          return HX.el("div", { class: "hx-ds-role", dataset: { role: R[0] } }, [demo, HX.el("div", { class: "hx-ds-rt" }, [
            HX.el("b", { text: R[1] }), varTag(R[0], hex), HX.el("p", { text: R[2] }), HX.el("ul", {}, pairs)])]);
        }))
      ]));

      // ③ 자주 쓰는 모양 — 이 폴더 부품 클래스 그대로
      var tones = Object.keys(HX.TONE_NAME);
      body.appendChild(sec("parts", "자주 쓰는 모양", "화면 조각이 쓰는 것과 같은 모양이에요. 판은 지금 고른 판 모양 · 모서리 그대로예요.", [
        app([HX.el("div", { class: "content hx-ds-parts" }, [
          HX.el("div", { class: "hx-ds-row" }, [
            HX.el("button", { type: "button", class: "btn btn-primary", text: "저장하기" }), HX.el("button", { type: "button", class: "btn btn-secondary", text: "취소" }),
            HX.el("button", { type: "button", class: "btn btn-soft", text: "더 보기" }), HX.el("button", { type: "button", class: "btn btn-ghost", text: "건너뛰기" })]),
          HX.el("div", { class: "hx-ds-row" }, [HX.el("span", { class: "badge badge-primary", text: "새 소식" })].concat(tones.map(function (k) { return HX.el("span", { class: "badge badge-" + k, text: HX.TONE_NAME[k] }); }))),
          HX.el("div", { class: "card" }, [
            HX.el("div", { class: "card-header" }, HX.el("h3", { class: "card-title", text: sentence })),
            HX.el("div", { class: "card-body" }, [HX.el("p", { text: "판 안의 본문 글자예요." }), HX.el("p", { class: "text-muted", text: "흐린 글자 · 날짜나 도움말" })])]),
          HX.el("div", { class: "field" }, [HX.el("label", { class: "field-label", text: "이름" }), HX.el("input", { class: "input", type: "text", placeholder: "이름을 적어 주세요" })])
        ])])
      ]));

      probe.remove();
      el.scrollTop = top;
    }

    // 색 · 글꼴 · 글자 크기가 바뀌면 다시 그린다 — <html> 속성(테마 · 버튼 색 · 글꼴 · 꾸밈)과 <head>(직접 고른 색의 <style> · 글꼴)
    // 지켜보기 알림은 한 번 바꾼 것들을 모아 한 번에 온다 → 그 자리에서 그린다(다음 화면 그리기를 기다리지 않는다)
    var shown = false, dirty = true;
    function changed() { dirty = true; if (shown) draw(); }
    if (window.MutationObserver) {
      var mo = new MutationObserver(changed);
      mo.observe(root, { attributes: true });
      mo.observe(doc.head, { childList: true, subtree: true, characterData: true });
    }
    return {
      el: el,
      onShow: function () { shown = true; if (dirty) draw(); },
      onHide: function () { shown = false; }
    };
  };
})();
