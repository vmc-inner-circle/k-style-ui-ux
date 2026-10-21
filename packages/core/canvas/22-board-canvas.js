/* 22-board-canvas.js — board 진입: 상단바(테마 · 컬러 · 폰트 · 의견 보내기) · 사용 흐름 = 구역 보드(08-sections.js) · 표시 상태를 보드에 칠하기.
   사용 흐름은 이해하는 곳 — 화면을 누르면 화면 디자인 탭의 그 화면으로 가서 의견을 남긴다(24-board-screens.js). */
(function () {
  "use strict";
  var HX = window.HX, doc = document, root = doc.documentElement, B = HX.board;
  B.sel = { slug: null, key: null, inst: null };

  // ---------- 상단바 컨트롤 ----------
  /* 버튼 셋 테마 · 컬러 · 폰트(packages/core/color/picker.js — 버튼이 곧 탭, 그 아래로 창) — 고르면 보드 상태(의견 보내기 첫 줄 · 꾸밈 font 줄)에도 담긴다.
     글자 크기는 폰트 창에 있다. 색이 확정돼도 폰트(글꼴 · 글자 크기)가 열려 있으면 띄운다.
     시안 단계는 글꼴을 시안 꾸밈이 정하고 글자 크기는 보내지 않으므로 폰트 창은 안내만.
     꾸밈은 화면 상자가 입으므로 html은 건드리지 않게(dress: false) — 프리셋을 고르면 상자들을 다시 입힌다(B.redress, 25-board-concepts.js) */
  B.mountColor = function (anchor, o) {
    if (!window.HXColor || (B.isLocked("theme") && B.isLocked("font") && B.isLocked("type"))) return;
    var st = B.state;
    window.HXColor.mount({ project: HX.meta.project, anchor: anchor, inline: !!(o && o.inline), dress: false,
      colorLocked: B.isLocked("theme"), fontLocked: B.isLocked("font"), typeLocked: B.isLocked("type"), rec: { type: B.REC.type },
      textNote: B.stage === "concept" ? "글꼴 · 글자 크기는 시안을 고른 뒤 초안에서 바꿀 수 있어요" : null,
      initial: { theme: st.theme, swatch: st.accent, custom: st.custom || null, font: st.font, type: st.type }, onChange: function (sel) {
      st.custom = sel.theme === "custom" ? sel.custom : null;
      if (st.custom) B.putCustom(st.custom);
      st.theme = sel.theme; st.accent = sel.swatch; if (sel.font) st.font = sel.font; if (sel.type) st.type = sel.type; B.applyTheme();
      if (B.redress) B.redress();
    } });
  };
  // ---------- 선택: 사용 흐름에서는 고르지 않는다 — 화면을 누르면 화면 디자인 탭으로 ----------
  B.hl = function () {};
  B.go = function () {};
  B.select = function (slug, key) {
    B.sel = { slug: null, key: null, inst: null };
    if (slug && HX.bySlug[slug] && B.showDesign) { B.showDesign(slug, key); return; }
    if (B.panel) B.panel.render();
  };
  B.overview = function () { if (B.view) B.view.fit(true); };

  // ---------- 표시 상태 → 구역 보드 이름표 ('의견 반영' · '뺌' · 메모) ----------
  B.paintMarks = function () {
    var st = B.state;
    HX.data.screens.forEach(function (s) {
      var ss = st.screens[s.id], tags = [], memo = ss ? B.one(ss.memo) : "";
      if (B.focus.indexOf(s.slug) >= 0) tags.push({ kind: "fixed", text: "의견 반영" });
      if (ss && ss.remove) tags.push({ kind: "removed", text: "뺌" });
      if (memo) tags.push({ kind: "memo", text: "메모", title: "메모: " + memo });
      B.view.mark(s.slug, tags);
    });
  };

  // ---------- 진입 ----------
  B.start = function (app) {
    app.classList.add("hx-app"); app.classList.add("hx-bd");
    var copyBtn = HX.btn("", { cls: "hx-primary hx-bd-copy", icon: HX.icon("#i-send"), title: "무엇이 전달되는지 확인하고 복사해요 (⌘/Ctrl+Shift+C)", onclick: function () { B.openSend(); } });
    var copyLabel = HX.el("span"); copyBtn.appendChild(copyLabel);
    var colorAnchor = HX.el("span", { class: "hx-bd-color" });
    var bar = HX.el("div", { class: "hx-bar hx-bd-bar" }, [
      HX.el("div", { class: "hx-bar-title", title: HX.meta.title || "" }, [HX.meta.title || HX.meta.project || "", HX.el("small", { text: "초안 " + (HX.meta.round || 1) })]),
      HX.el("div", { class: "hx-bd-ctls" }, [colorAnchor]),
      HX.el("span", { class: "hx-bar-spacer" }),
      copyBtn
    ]);
    var canvas = HX.el("div", { class: "hx-bd-canvas" });
    B.panel = B.buildPanel(HX.el("span"));   // '전체'(질문·남긴 의견) — 화면 디자인 탭 오른쪽이 이 패널을 그대로 쓴다
    var main = HX.el("div", { class: "hx-bd-main" }, [canvas]);
    app.appendChild(bar); app.appendChild(main);
    B.mountColor(colorAnchor);

    B.view = HX.buildSections({ pickTitle: "의견 남기기", pickIcon: "comment", onPick: function (slug) { if (B.showDesign) B.showDesign(slug); } });
    canvas.appendChild(B.view.el);

    // 코치 팁 (처음 한 번)
    if (!HX.storage.get("hx:board:coach2")) {
      var coach = HX.el("div", { class: "hx-bd-coach", role: "note" }, [
        HX.el("div", {}, [HX.el("b", { text: "이렇게 보세요" }),
          HX.el("ul", {}, [HX.el("li", { text: "구역(가입·홈 …)마다 화면이 사용하는 순서대로 왼쪽부터 놓여 있어요" }),
            HX.el("li", { text: "초록 화살표는 조건에 따라 길이 갈리는 곳이에요 · 화면 이름 옆 ⓘ에 마우스를 올리면 그 화면의 규칙이 보여요" }),
            HX.el("li", { text: "화면 위 이름 옆 '의견 남기기'를 누르면 '화면 디자인'에서 고치고 싶은 곳에 의견을 남길 수 있어요" })])]),
        HX.btn("", { cls: "hx-icon-btn", aria: "닫기", title: "닫기", icon: HX.icon("#i-x"), onclick: function () { B.closeCoach(); } })]);
      canvas.appendChild(coach);
      B.closeCoach = function () { if (coach.isConnected) coach.remove(); HX.storage.set("hx:board:coach2", 1); };
    } else B.closeCoach = function () {};

    function paintCopy() {
      var n = B.diffCount();
      copyLabel.textContent = "의견 보내기" + (n ? " · " + n + "개" : "");
      copyBtn.title = n ? "지금까지 남긴 의견 " + n + "개 (추천과 다르게 고른 것 포함) — 눌러서 무엇이 전달되는지 확인해요"
        : "아직 남긴 의견이 없어요 — 이대로 보내면 모두 추천대로 진행해요";
    }
    HX.on("board-change", function () { B.paintMarks(); paintCopy(); });
    B.applyTheme();

    doc.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") { e.preventDefault(); B.openSend(); return; }
      var t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (typing || doc.querySelector(".hx-modal") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!B.tab || B.tab() !== "flow") return;
      if (e.key === "Escape") { e.preventDefault(); B.closeCoach(); B.overview(); }
      else B.view.onKey(e);
    });

    // 두 탭: 사용 흐름(이해) / 화면 디자인(의견) — 24-board-screens.js
    if (B.buildDesign) B.buildDesign({ app: app, bar: bar, main: main, canvas: canvas });
    B.view.onShow();
    // 지난 라운드에 고친 화면이 있으면 그 화면에 다가간다
    if (B.focus.length) B.view.focus(B.focus[0]);
  };
})();
