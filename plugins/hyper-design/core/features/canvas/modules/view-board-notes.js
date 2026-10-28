/* View — 판 노트와 사용자 선의 DOM: #stage 안 선 층(svg.bnl)·노트 층(#bnotes) 그리기, 만들기·제자리 쓰기·끌기·잇기·고르기·지우기·선 이름·복사 단추.
   규칙은 HD.boardNotes(Model). 상태 = 판 하나(저장은 판만) · 고른 것({kind:'note'|'edge', id}) · 쓰는 중 · 끄는 중.
   선 = 보이는 층 svg#bnl(카드 아래) + 누르는 층 svg#bnh(카드 위, 카드 상자를 뚫은 clip). 저장: localStorage '<NAME>:<주소 해시>:<프로젝트 도장>' — 기존 메모(hd-notes:)와 따로. 기존 선(svg.ar·svg.lks)·태그·메모·'보내기'는 건드리지 않는다.
   HD.viewBoardNotes.mount(ctx) → {board(), render(), copyText(), selected()}
   ctx = {D, pane, stage, rowsEl, $, $$, esc, getView(), setView(z, tx, ty), typing(e), outDir(), copy(text)} */
(function () {
'use strict';
var HD = globalThis.HD = globalThis.HD || {};
var SVGNS = 'http://www.w3.org/2000/svg', EDIT_Z = 0.6;

function mount(ctx) {
  var M = HD.boardNotes, $ = ctx.$, $$ = ctx.$$, esc = ctx.esc, pane = ctx.pane, stage = ctx.stage, rowsEl = ctx.rowsEl, D = ctx.D || {};
  var KEY = M.NAME + ':' + M.hash(location.pathname) + ':' + M.stamp(D);
  var B = load(), sel = null, editing = null, drag = null, link = null, raf = 0;
  var TITLES = {};
  (D.rows || []).forEach(function (row) { (row.screens || []).forEach(function (s) { TITLES[s.id] = s.title; }); });

  function svgLayer(id) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.id = id; s.setAttribute('width', '1'); s.setAttribute('height', '1');
    return s;
  }
  // 보이는 선 = 카드 아래 층(#bnl) · 누르는 자리와 이름 = 카드 위 층(#bnh, 카드 상자를 뚫은 clip — 카드 클릭은 그대로 카드로 간다)
  var svg = svgLayer('bnl'), hit = svgLayer('bnh');
  svg.innerHTML = '<defs><marker id="bn-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">' +
                  '<path d="M0,0 L10,5 L0,10 z"/></marker></defs><g class="bl-all"></g><path class="bl tmp" style="display:none"/>';
  hit.innerHTML = '<defs><clipPath id="bn-clip" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd"/></clipPath></defs><g class="bh-all" clip-path="url(#bn-clip)"></g>';
  var layer = document.createElement('div'); layer.id = 'bnotes';
  stage.appendChild(svg); stage.appendChild(hit); stage.appendChild(layer);
  var tmp = $('path.tmp', svg), all = $('g.bl-all', svg), hall = $('g.bh-all', hit), clip = $('#bn-clip path', hit);

  var copyBtn = document.createElement('button');
  copyBtn.className = 'vbtn'; copyBtn.id = 'bncopy'; copyBtn.type = 'button'; copyBtn.hidden = true;
  copyBtn.title = '판 노트와 선을 글로 복사 — AI 대화에 붙여 넣어요'; copyBtn.textContent = '판 노트 복사';
  var view = $('.view[data-group="view"]'); if (view) view.insertBefore(copyBtn, view.firstChild);
  copyBtn.addEventListener('click', function () {
    ctx.copy(copyText());
    copyBtn.textContent = '복사했어요'; setTimeout(function () { copyBtn.textContent = '판 노트 복사'; }, 1400);
  });

  function load() {
    var raw = null; try { raw = localStorage.getItem(KEY); } catch (e) {}   // 저장소를 못 읽는 브라우저 = 빈 판
    var r = M.parse(raw);
    if (r.bad) console.warn('[hd] 판 노트 저장값 ' + (r.bad === 'broken' ? '깨짐 — 빈 판으로' : '일부 빠짐'));
    return r.board;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(B)); } catch (e) {} }   // 저장 실패(용량·사생활 모드)는 화면 상태만 남긴다
  function now() { return Date.now(); }
  function z() { return ctx.getView().z; }
  function toStage(cx, cy) { var r = stage.getBoundingClientRect(), k = z(); return {x: (cx - r.left) / k, y: (cy - r.top) / k}; }
  function boxOf(el) {                               // 판 좌표 상자(변환 아래에서도 맞게 화면 좌표에서 되돌린다)
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = z();
    return {x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k};
  }
  function cardEl(id) { return $$('.card', rowsEl).filter(function (c) { return c.dataset.id === id; })[0] || null; }
  function screenBox(id) { var c = cardEl(id), p = c && $('.phone', c); return p ? boxOf(p) : null; }
  function noteEl(id) { return $$('.bnote', layer).filter(function (n) { return n.dataset.id === id; })[0] || null; }
  function endBox(key) {
    if (key.indexOf('note:') === 0) { var el = noteEl(key.slice(5)); return el ? boxOf(el) : null; }
    return screenBox(key.slice(7));
  }
  function chain(el) {
    var out = [];
    for (var n = el; n && n !== document.documentElement; n = n.parentElement) {
      var t = [n.tagName.toLowerCase()];
      if (n.id) t.push('#' + n.id);
      (n.getAttribute('class') || '').split(/\s+/).filter(Boolean).forEach(function (c) { t.push('.' + c); });
      out.push(t);
      if (n === pane) break;
    }
    return out;
  }

  /* ---------- 그리기 ---------- */
  function renderNotes() {
    var keep = {};
    Object.keys(B.notes).forEach(function (id) {
      var n = B.notes[id], el = noteEl(id);
      if (!el) {
        el = document.createElement('div'); el.className = 'bnote'; el.dataset.id = id;
        el.innerHTML = '<div class="bt"></div>' + M.SIDES.map(function (s) { return '<i class="bh" data-side="' + s + '"></i>'; }).join('');
        layer.appendChild(el);
      }
      el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; el.style.width = n.w + 'px';
      if (editing !== id) $('.bt', el).textContent = n.text;
      el.classList.toggle('sel', !!sel && sel.kind === 'note' && sel.id === id);
      keep[id] = 1;
    });
    $$('.bnote', layer).forEach(function (el) { if (!keep[el.dataset.id] && editing !== el.dataset.id) el.remove(); });
    copyBtn.hidden = !Object.keys(B.notes).length;
  }
  function renderEdges() {
    var h = '', hh = '', holes = 'M-100000,-100000 H100000 V100000 H-100000 Z';
    $$('.card', rowsEl).forEach(function (c) { var b = boxOf(c); holes += ' M' + b.x.toFixed(1) + ',' + b.y.toFixed(1) + ' h' + b.w.toFixed(1) + ' v' + b.h.toFixed(1) + ' h' + (-b.w).toFixed(1) + ' Z'; });
    clip.setAttribute('d', holes);
    M.live(B, function (id) { return !!cardEl(id); }).forEach(function (e) {
      var a = endBox(e.from), b = endBox(e.to); if (!a || !b) return;
      var p = M.anchor(a, e.fromSide), q = M.anchor(b, e.toSide), d = M.path(p, e.fromSide, q, e.toSide);
      var on = sel && sel.kind === 'edge' && sel.id === e.id ? ' sel' : '', id = esc(e.id);
      h += '<path class="bl' + on + '" data-id="' + id + '" d="' + d + '"/>';
      hh += '<g class="be' + on + '" data-id="' + id + '"><path class="bhit" d="' + d + '"/>' +
            (e.label ? '<text class="blab" x="' + ((p.x + q.x) / 2).toFixed(1) + '" y="' + ((p.y + q.y) / 2 - 6).toFixed(1) + '">' + esc(e.label) + '</text>' : '') + '</g>';
    });
    all.innerHTML = h; hall.innerHTML = hh;
  }
  function render() { renderNotes(); renderEdges(); }
  function schedule() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; renderEdges(); }); }

  /* ---------- 고르기·지우기 ---------- */
  function select(s) { sel = s; render(); }
  function removeSelected() {
    if (!sel) return;
    if (sel.kind === 'note') B = M.removeNote(B, sel.id); else B = M.unlink(B, sel.id);
    sel = null; save(); render();
  }

  /* ---------- 쓰기 ---------- */
  function edit(id) {
    var el = noteEl(id); if (!el || editing) return;
    var v = ctx.getView();
    if (v.z < EDIT_Z) {                              // 너무 작게 보고 있으면 노트 자리를 둔 채 읽히는 배율로
      var r = pane.getBoundingClientRect(), b = el.getBoundingClientRect(), px = b.left - r.left, py = b.top - r.top;
      var bx = (px - v.tx) / v.z, by = (py - v.ty) / v.z;
      ctx.setView(EDIT_Z, px - bx * EDIT_Z, py - by * EDIT_Z);
    }
    editing = id; select({kind: 'note', id: id});
    var bt = $('.bt', el), ta = document.createElement('textarea');
    ta.className = 'bta'; ta.value = B.notes[id] ? B.notes[id].text : ''; ta.setAttribute('aria-label', '판 노트');
    bt.hidden = true; el.insertBefore(ta, bt);
    var grow = function () { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', function () { grow(); schedule(); });
    ta.addEventListener('keydown', function (e) {
      if (e.isComposing) return;                     // 한글 조합 중 키는 건드리지 않는다
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); e.stopPropagation(); done(); }
    });
    ta.addEventListener('blur', function () { done(); });
    ta.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    var ended = false;
    function done() {
      if (ended) return; ended = true;
      var r = M.finish(B, id, ta.value, now());
      editing = null; ta.remove(); bt.hidden = false;
      B = r.board;
      if (r.kind === 'drop') sel = null;
      if (r.kind !== 'same') save();
      render();
    }
    grow(); ta.focus();
  }

  /* ---------- 만들기: 빈 판 두 번 누르기 ---------- */
  pane.addEventListener('dblclick', function (e) {
    var where = M.spot(chain(e.target));
    if (where === 'note') return;                    // 노트 위 두 번 누르기는 노트가 받는다
    if (where !== 'empty' || editing) return;
    var pt = toStage(e.clientX, e.clientY), boxes = $$('.card', rowsEl).map(function (c) { var b = boxOf(c); return {x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h}; });
    var at = M.room(pt, boxes); if (!at.free) return;
    e.preventDefault();
    var id = M.newId('n', now());
    B = M.create(B, id, at, now());                  // 글이 생기기 전에는 저장하지 않는다(finish 가 판정)
    sel = {kind: 'note', id: id}; render(); edit(id);
  });

  /* ---------- 노트: 고르기·끌기·잇기 ---------- */
  layer.addEventListener('pointerdown', function (e) {
    var el = e.target.closest('.bnote'); if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.stopPropagation();                             // 판 끌기로 새지 않게
    var id = el.dataset.id, h = e.target.closest('.bh');
    if (editing === id) return;
    if (h) {                                         // 변의 점 끌기 = 잇기
      e.preventDefault();
      link = {from: 'note:' + id, side: h.dataset.side, pid: e.pointerId};
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    var n = B.notes[id]; if (!n) return;
    drag = {id: id, pid: e.pointerId, sx: e.clientX, sy: e.clientY, x: n.x, y: n.y, moved: false};
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    if (!sel || sel.id !== id) select({kind: 'note', id: id});
  });
  layer.addEventListener('pointermove', function (e) {
    if (link && link.pid === e.pointerId) {
      var a = endBox(link.from); if (!a) return;
      var p = M.anchor(a, link.side), q = toStage(e.clientX, e.clientY);
      tmp.setAttribute('d', M.path(p, link.side, q, M.nearSide({x: q.x, y: q.y, w: 0, h: 0}, p)));
      tmp.style.display = '';
      return;
    }
    if (!drag || drag.pid !== e.pointerId) return;
    var k = z(), dx = (e.clientX - drag.sx) / k, dy = (e.clientY - drag.sy) / k;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) <= 4) return;
    drag.moved = true;
    var el = noteEl(drag.id); if (el) { el.style.left = Math.round(drag.x + dx) + 'px'; el.style.top = Math.round(drag.y + dy) + 'px'; }
    schedule();
  });
  function endPointer(e) {
    if (link && link.pid === e.pointerId) {
      tmp.style.display = 'none';
      var hit = document.elementFromPoint(e.clientX, e.clientY), ne = hit && hit.closest('.bnote'), ce = hit && hit.closest('.card');
      var to = ne ? 'note:' + ne.dataset.id : ce ? 'screen:' + ce.dataset.id : null;
      if (to) {
        var src = endBox(link.from), dst = endBox(to);
        var toSide = dst ? M.nearSide(dst, M.anchor(src, link.side)) : 'left';
        var r = M.connect(B, M.newId('e', now()), link.from, link.side, to, toSide, now());
        if (r.ok) { B = r.board; save(); }
      }
      link = null; render();
      return;
    }
    if (!drag || drag.pid !== e.pointerId) return;
    var d = drag; drag = null;
    if (!d.moved) return;
    var k = z();
    B = M.move(B, d.id, d.x + (e.clientX - d.sx) / k, d.y + (e.clientY - d.sy) / k, now());
    save(); render();
  }
  layer.addEventListener('pointerup', endPointer);
  layer.addEventListener('pointercancel', endPointer);
  layer.addEventListener('dblclick', function (e) {
    var el = e.target.closest('.bnote'); if (!el) return;
    e.stopPropagation(); e.preventDefault(); edit(el.dataset.id);
  });

  /* ---------- 선: 고르기·이름 ---------- */
  hit.addEventListener('pointerdown', function (e) { if (e.target.closest('g.be')) e.stopPropagation(); });
  hit.addEventListener('click', function (e) {
    var g = e.target.closest('g.be'); if (!g) return;
    e.stopPropagation(); select({kind: 'edge', id: g.dataset.id});
  });
  hit.addEventListener('dblclick', function (e) {
    var g = e.target.closest('g.be'); if (!g) return;
    e.stopPropagation(); e.preventDefault();
    var id = g.dataset.id, ed = B.edges[id]; if (!ed) return;
    var a = endBox(ed.from), b = endBox(ed.to); if (!a || !b) return;
    var p = M.anchor(a, ed.fromSide), q = M.anchor(b, ed.toSide);
    var inp = document.createElement('input');
    inp.className = 'blin'; inp.value = ed.label || ''; inp.maxLength = M.LABEL_MAX; inp.setAttribute('aria-label', '선 이름');
    inp.style.left = ((p.x + q.x) / 2) + 'px'; inp.style.top = ((p.y + q.y) / 2 - 14) + 'px';
    layer.appendChild(inp);
    var ended = false;
    var fin = function (keep) { if (ended) return; ended = true; if (keep) { B = M.label(B, id, inp.value, now()); save(); } inp.remove(); render(); };
    inp.addEventListener('keydown', function (ev) {
      if (ev.isComposing) return;
      if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); fin(true); }
      else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fin(false); }
    });
    inp.addEventListener('blur', function () { fin(true); });
    inp.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
    inp.focus(); inp.select();
  });

  /* ---------- 빈 곳 누르기 = 고르기 풂 · Delete = 지우기 ---------- */
  pane.addEventListener('click', function (e) {
    if (sel && !e.target.closest('.bnote') && !e.target.closest('g.be')) select(null);
  });
  addEventListener('keydown', function (e) {
    if (!sel || editing || ctx.typing(e)) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelected(); }
    else if (e.key === 'Enter' && sel.kind === 'note') { e.preventDefault(); edit(sel.id); }
  });

  /* ---------- 카드 크기가 바뀌면(긴 화면 펼치기 등) 선 끝을 다시 ---------- */
  if (typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(schedule);
    $$('.card', rowsEl).forEach(function (c) { ro.observe(c); });
  }

  function copyText() {
    var boxes = {}, heights = {};
    $$('.card', rowsEl).forEach(function (c) { var b = screenBox(c.dataset.id); if (b) boxes[c.dataset.id] = b; });
    Object.keys(B.notes).forEach(function (id) { var el = noteEl(id); if (el) heights[id] = boxOf(el).h; });
    return M.copyText(B, {out: ctx.outDir(), boxes: boxes, titles: TITLES, heights: heights});
  }

  render();
  return {board: function () { return B; }, render: render, copyText: copyText, selected: function () { return sel; }};
}

HD.viewBoardNotes = {mount: mount};
})();
