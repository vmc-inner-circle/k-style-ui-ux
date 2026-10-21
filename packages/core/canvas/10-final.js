/* 10-final.js — final 모드: 상단 바 + 탭 [사용 흐름][흐름 재생][화면 디자인][화면 전체][디자인 시스템].
   사용 흐름 = 08-sections.js 구역 보드(큰 구역 → 단계 이름표 → 화면 나란히 · 조건 화살표 · 화면 아래 정책 메모). 처음 열리는 탭.
   화면 디자인 = 초안 보드의 그 탭 그대로(24-board-screens.js — 화면 목록 · 화면 한 장 · 의견 창 · 규칙 · 직접 고치기 · 전체 = 질문 · 남긴 의견 · 안내 문구 모음).
     상태 · 보내기 글은 20-board.js · 23-board-send.js 그대로 — 첫 줄만 '완성본 n차 의견'. 상단바 오른쪽 '의견 보내기'(보드와 같은 단추).
     사람 결정(2026-10-21): 1턴 시안 보드 → 2턴 완성본. 초안 보드가 하던 일은 완성본 입구에서 하고, 의견을 보내면 그때만 한 번 더.
   화면 전체 = 11-final-all.js (모든 화면 대지를 역할별로, 누르면 크게). 디자인 시스템 = 12-design-system.js (지금 칠해진 간격 · 모서리 · 글자 · 색과 대비).
   (예전 흐름 카드 → 두 장씩 따라가 보기는 구역 보드로 바꿨다 — 디자이너 보드처럼 주요 분기만 화살표) */
(function () {
  "use strict";
  var HX = window.HX, doc = document;
  var FINAL = HX.final = {};

  FINAL.start = function (app) {
    app.classList.add("hx-app"); app.classList.add("hx-final");
    // 의견 남기기: 빌드가 board를 실었을 때만(예전 입구 파일은 board가 null)
    var B = HX.board, fb = !!(B && B.buildDesign && B.sendButton && HX.data.board);
    // 의견을 남길 수 있는 완성본이면 사용 흐름 이름표의 '자세히 보기'가 그 화면을 창으로 열어 바로 고치게(00-core HX.openScreen · 26-board-edit.js) —
    //   고친 것은 작은 화면에도 입힌다(보드 22-board-canvas와 같은 방식). 사람 의견 2026-10-21 "완성 시에도 지금처럼 수정할 수 있도록"
    var shownSig = {};
    var views = { map: HX.buildSections(fb ? { onPick: function (slug) { HX.openScreen(slug); },
      onMount: function (f, slug) { if (B.dressEdits) { B.dressEdits(f.section, slug); shownSig[slug] = B.editSig(slug); } } } : undefined), play: HX.buildPlayer() };
    if (fb) HX.on("board-change", function () { Object.keys(shownSig).forEach(function (slug) { if (B.editSig(slug) !== shownSig[slug]) views.map.remount(slug); }); });
    if (fb) {
      B.panel = B.buildPanel(HX.el("span"));   // '전체'(질문 · 남긴 의견) — 화면 디자인 탭 오른쪽이 이 패널을 그대로 쓴다
      views.design = B.buildDesign({ app: app, host: { select: function (k) { select(k); }, flow: views.map } });
    }
    views.all = FINAL.buildAll(); views.ds = HX.buildDesignSystem();
    views.play.el.classList.add("hx-pl-on");
    FINAL.views = views;
    var tabBtns = {}, current = null;
    var tablist = HX.el("div", { class: "hx-tabs", role: "tablist", "aria-label": "보기" });
    [["map", "사용 흐름", HX.icon("#i-workflow")], ["play", "흐름 재생", HX.icon("#i-play")], ["design", "화면 디자인", HX.icon("#i-pencil")], ["all", "화면 전체", HX.icon("#i-layout-grid")], ["ds", "디자인 시스템", HX.icon("#i-palette")]].forEach(function (t) {
      if (!views[t[0]]) return;
      var b = HX.el("button", { type: "button", class: "hx-tab", role: "tab", id: "hx-tab-" + t[0], "aria-selected": "false", tabindex: "-1", onclick: function () { select(t[0]); } }, [t[2], t[1]]);
      tabBtns[t[0]] = b; tablist.appendChild(b);
    });
    tablist.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var ks = Object.keys(tabBtns), i = ks.indexOf(current);
      e.preventDefault(); select(ks[(i + (e.key === "ArrowRight" ? 1 : ks.length - 1)) % ks.length]); tabBtns[current].focus();
    });
    var nSec = (HX.data.sections || []).length;
    var colorSlot = HX.el("span", { class: "hx-bd-color" });
    app.appendChild(HX.el("div", { class: "hx-bar" }, [
      HX.el("div", { class: "hx-bar-title" }, [HX.meta.title || HX.meta.project || "화면 지도", HX.el("small", { text: "화면 " + HX.data.screens.length + (nSec ? " · 구역 " + nSec : "") })]),
      tablist, HX.el("span", { class: "hx-bar-spacer" }), colorSlot, fb ? B.sendButton() : null
    ]));
    // 테마 · 컬러 · 폰트 — 상단바 오른쪽 버튼 셋, 완성본에서도 자유롭게 (이 브라우저에 기억해 화면별 페이지와 함께 바뀐다)
    //   고른 값은 의견 상태에도 담는다 — 보내기 글의 테마 줄 · 꾸밈 font 줄이 지금 칠해진 색을 따른다
    function pull(sel) {
      var st = B.state;
      st.theme = sel.theme; st.accent = sel.swatch; st.custom = sel.theme === "custom" ? sel.custom || null : null; st.font = sel.font || "base"; st.type = sel.type || "normal";
      if (st.custom) B.putCustom(st.custom);   // 테마 줄이 직접 고른 색 이름을 찾도록
      B.changed(); HX.relayout();
    }
    if (window.HXColor) FINAL.color = window.HXColor.mount({ project: HX.meta.project, anchor: colorSlot, persist: true, custom: HX.meta.custom || null, onChange: fb ? pull : null });
    if (fb && FINAL.color) {
      pull(FINAL.color.get());
      // '모두 지우기'면 버튼 셋(기억해 둔 색)도 완성본 처음 값으로 (20-board.js resetAll)
      B.resetColor = function () { FINAL.color.set({ theme: B.REC.theme, swatch: B.REC.accent, custom: B.REC.theme === "custom" ? HX.meta.custom || null : null, font: B.REC.font, type: B.REC.type }); };
    }
    Object.keys(views).forEach(function (k) { views[k].el.style.display = "none"; views[k].el.setAttribute("role", "tabpanel"); views[k].el.setAttribute("aria-labelledby", "hx-tab-" + k); app.appendChild(views[k].el); });
    function select(name) {
      if (current === name) return;
      current = name;
      Object.keys(views).forEach(function (k) {
        var on = k === name; views[k].el.style.display = on ? "" : "none";
        tabBtns[k].setAttribute("aria-selected", on ? "true" : "false"); tabBtns[k].tabIndex = on ? 0 : -1;
        if (on && views[k].onShow) views[k].onShow(); else if (!on && views[k].onHide) views[k].onHide();
      });
      // 좁은 폭에서 탭 줄을 가로로 밀어 보는 경우 — 고른 탭이 가려져 있으면 보이는 자리로
      var b = tabBtns[name].getBoundingClientRect(), box = tablist.getBoundingClientRect();
      if (b.right > box.right) tablist.scrollLeft += b.right - box.right + 3; else if (b.left < box.left) tablist.scrollLeft -= box.left - b.left + 3;
      try { history.replaceState(null, "", "#" + name); } catch (e) { /* file:// */ }
    }
    FINAL.select = select;
    select(views[location.hash.slice(1)] ? location.hash.slice(1) : "map");
    doc.addEventListener("keydown", function (e) {
      var t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing || doc.querySelector(".hx-modal")) return;
      if (views[current].onKey) views[current].onKey(e);
    });
  };
})();
