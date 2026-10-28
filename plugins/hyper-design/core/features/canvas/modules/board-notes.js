/* Model — 판 노트와 사용자 선(Obsidian Canvas 식 노드·간선): 모양·만들기·고치기·잇기·지우기·빈 자리·선 경로·복사 글. DOM·저장소를 쓰지 않는다.
   판 = {notes: {<id>: {x, y, w, text, at}}, edges: {<id>: {from, fromSide, to, toSide, label?, at}}} — 판(#stage) 좌표 정수 px, at = 마지막으로 바꾼 시각(ms).
     끝(from·to) = 'note:<노트 id>' | 'screen:<화면 id>'. 변(side) = 'top'|'right'|'bottom'|'left'. 모르는 칸은 그대로 둔다.
   parse(text) → {board, bad} — 깨진 JSON = 빈 판(bad:'broken') · 모양이 틀린 노트·선만 뺌(bad:'dropped') · 없음 = 빈 판(bad:null)
   newId(prefix, now, rnd) → prefix + 시각 36진 + 4자
   create(b, id, {x, y, w?}, now) → 새 판(글 빈 노트 — 셸은 쓰기 전까지 저장하지 않는다)
   finish(b, id, text, now) → {board, kind}: 'drop'(빈 글 = 노트와 그 노트의 선을 뺌) | 'keep'(글이 바뀜) | 'same'(그대로)
   move(b, id, x, y, now) · removeNote(b, id) → 새 판(없는 id = 같은 판). removeNote 는 그 노트에 닿은 선도 뺀다
   connect(b, id, from, fromSide, to, toSide, now) → {board, ok}: 노트에서만 출발 · 자기 자신·없는 노트·같은 쌍(같은 방향) 거절
   unlink(b, id) · label(b, id, text, now) → 새 판(이름 = 평문 한 줄 LABEL_MAX 자, 비우면 칸을 뺀다)
   live(b, hasScreen) → 그릴 선 목록 — 끝이 지금 판에 있는 것만(저장값은 지우지 않는다: 같은 id 화면이 다시 생기면 되돌아온다)
   room(pt, boxes) → {free, x, y, w} — 새 노트 자리: 누른 점이 카드 상자 안이면 free:false, 오른쪽 같은 높이 카드 앞까지 폭(MIN_W..W)
   spot(chain) → 'note' | 'empty' | 'busy' — 누른 자리(맨 안쪽부터 바깥으로, 요소마다 '#id'·'.class'·'tag' 목록)
   anchor(box, side) → 변 가운데 점 · nearSide(box, pt) → pt 에 가장 가까운 변 · path(a, aSide, b, bSide) → 곱 베지어 SVG d
   stamp(D) → 프로젝트 도장(제목 + 화면 id 목록의 해시) — 같은 out/ 에 새 프로젝트를 만들면 옛 노트가 뜨지 않게
   copyText(b, {out, boxes, titles}) → '[hyper-design 판 노트]' 평문(노트마다 가장 가까운 화면 · 선마다 '가 → 나')
   HD.boardNotes = {NAME, W, MIN_W, MAX_W, MAX, LABEL_MAX, SIDES, parse, newId, create, finish, move, removeNote, connect, unlink, label, live,
                    room, spot, anchor, nearSide, path, stamp, hash, copyText, nearest, text, EMPTY, BUSY} */
(function () {
'use strict';
var HD = globalThis.HD = globalThis.HD || {};
var NAME = 'hd-board', W = 240, MIN_W = 120, MAX_W = 1600, MAX = 2000, LABEL_MAX = 40, PAD_X = 14, PAD_Y = 26, GAP = 12, BAND = 80, BEND = 80;
var SIDES = ['top', 'right', 'bottom', 'left'];
var EMPTY = ['#screens', '#stage', '#intro', '#rows', '#foot', '.flow', '.cards'];   // 이 요소 자체를 누름 = 빈 판
var BUSY = ['.card', '.bnote', '.alabel', '.glabel', '.ltag', 'svg', 'button', 'input', 'textarea', '#legend'];   // 조상에 이것이 있으면 빈 판이 아님
var has = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function copy(o) { var r = {}; for (var k in o) if (has(o, k)) r[k] = o[k]; return r; }
function num(v) { return typeof v === 'number' && isFinite(v); }
function board(b) { return {notes: copy(isObj(b) && isObj(b.notes) ? b.notes : {}), edges: copy(isObj(b) && isObj(b.edges) ? b.edges : {})}; }
function end(s) { return typeof s === 'string' && /^(note|screen):./.test(s); }
function noteOf(s) { return typeof s === 'string' && s.indexOf('note:') === 0 ? s.slice(5) : null; }

function text(t) {
  var s = String(t == null ? '' : t).replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  return s.length > MAX ? s.slice(0, MAX) : s;
}
function cleanNote(n) {
  if (!isObj(n) || !num(n.x) || !num(n.y) || typeof n.text !== 'string') return null;
  var o = copy(n);
  o.x = Math.round(n.x); o.y = Math.round(n.y);
  o.w = num(n.w) && n.w >= 40 ? Math.round(Math.min(MAX_W, n.w)) : W;
  o.text = text(n.text);
  if (!num(n.at)) o.at = 0;
  return o.text ? o : null;
}
function cleanEdge(e) {
  if (!isObj(e) || !end(e.from) || !end(e.to) || SIDES.indexOf(e.fromSide) < 0 || SIDES.indexOf(e.toSide) < 0) return null;
  var o = copy(e);
  if (has(o, 'label')) { var l = typeof o.label === 'string' ? o.label.replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX) : ''; if (l) o.label = l; else delete o.label; }
  if (!num(e.at)) o.at = 0;
  return o;
}
function parse(t) {
  if (t == null) return {board: {notes: {}, edges: {}}, bad: null};
  var v; try { v = JSON.parse(t); } catch (e) { return {board: {notes: {}, edges: {}}, bad: 'broken'}; }
  if (!isObj(v)) return {board: {notes: {}, edges: {}}, bad: 'broken'};
  var out = {notes: {}, edges: {}}, dropped = false;
  Object.keys(isObj(v.notes) ? v.notes : {}).forEach(function (id) { var n = cleanNote(v.notes[id]); if (n) out.notes[id] = n; else dropped = true; });
  Object.keys(isObj(v.edges) ? v.edges : {}).forEach(function (id) {
    var e = cleanEdge(v.edges[id]), src = e && noteOf(e.from), dst = e && noteOf(e.to);
    if (e && src && has(out.notes, src) && (!dst || has(out.notes, dst))) out.edges[id] = e; else dropped = true;   // 노트 끝은 있어야 한다(화면 끝은 live 가 거른다)
  });
  return {board: out, bad: dropped ? 'dropped' : null};
}
function newId(prefix, now, rnd) {
  var r = '';
  for (var i = 0; i < 4; i++) r += Math.floor((rnd ? rnd() : Math.random()) * 36).toString(36);
  return (prefix || 'n') + Math.floor(now).toString(36) + r;
}
function create(b, id, at, now) {
  var o = board(b);
  o.notes[id] = {x: Math.round(at.x), y: Math.round(at.y), w: num(at.w) && at.w >= 40 ? Math.round(at.w) : W, text: '', at: now};
  return o;
}
function removeNote(b, id) {
  if (!isObj(b) || !has(b.notes, id)) return b;
  var o = board(b), key = 'note:' + id;
  delete o.notes[id];
  Object.keys(o.edges).forEach(function (k) { if (o.edges[k].from === key || o.edges[k].to === key) delete o.edges[k]; });
  return o;
}
function finish(b, id, t, now) {
  if (!isObj(b) || !has(b.notes, id)) return {board: b, kind: 'same'};
  var v = text(t);
  if (!v.trim()) return {board: removeNote(b, id), kind: 'drop'};
  if (v === b.notes[id].text) return {board: b, kind: 'same'};
  var o = board(b); o.notes[id] = copy(b.notes[id]); o.notes[id].text = v; o.notes[id].at = now;
  return {board: o, kind: 'keep'};
}
function move(b, id, x, y, now) {
  if (!isObj(b) || !has(b.notes, id)) return b;
  var n = b.notes[id], nx = Math.round(x), ny = Math.round(y);
  if (n.x === nx && n.y === ny) return b;
  var o = board(b); o.notes[id] = copy(n); o.notes[id].x = nx; o.notes[id].y = ny; o.notes[id].at = now;
  return o;
}
function connect(b, id, from, fromSide, to, toSide, now) {
  var src = noteOf(from), dst = noteOf(to);
  if (!isObj(b) || !src || !has(b.notes, src) || !end(to) || from === to || (dst && !has(b.notes, dst)) ||
      SIDES.indexOf(fromSide) < 0 || SIDES.indexOf(toSide) < 0) return {board: b, ok: false};
  var dup = Object.keys(b.edges || {}).some(function (k) { return b.edges[k].from === from && b.edges[k].to === to; });
  if (dup) return {board: b, ok: false};
  var o = board(b);
  o.edges[id] = {from: from, fromSide: fromSide, to: to, toSide: toSide, at: now};
  return {board: o, ok: true};
}
function unlink(b, id) {
  if (!isObj(b) || !has(b.edges, id)) return b;
  var o = board(b); delete o.edges[id]; return o;
}
function label(b, id, t, now) {
  if (!isObj(b) || !has(b.edges, id)) return b;
  var l = String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX), e = b.edges[id];
  if ((e.label || '') === l) return b;
  var o = board(b); o.edges[id] = copy(e); o.edges[id].at = now;
  if (l) o.edges[id].label = l; else delete o.edges[id].label;
  return o;
}
function live(b, hasScreen) {
  var E = isObj(b) && isObj(b.edges) ? b.edges : {}, N = isObj(b) && isObj(b.notes) ? b.notes : {};
  var ok = function (s) { var n = noteOf(s); return n ? has(N, n) : hasScreen(s.slice(7)); };
  return Object.keys(E).filter(function (k) { return ok(E[k].from) && ok(E[k].to); }).map(function (k) { var e = copy(E[k]); e.id = k; return e; });
}
function room(pt, boxes) {
  var x = Math.round(pt.x - PAD_X), y = Math.round(pt.y - PAD_Y), w = W;
  for (var i = 0; i < (boxes || []).length; i++) {
    var c = boxes[i];
    if (pt.x >= c.x0 && pt.x <= c.x1 && pt.y >= c.y0 && pt.y <= c.y1) return {free: false, x: x, y: y, w: 0};
    if (c.x0 >= pt.x && c.y0 < y + BAND && c.y1 > y) w = Math.min(w, Math.floor(c.x0 - GAP - x));   // 같은 높이 띠의 오른쪽 카드 앞까지
  }
  return {free: true, x: x, y: y, w: Math.max(MIN_W, w)};
}
function matches(tags, list) { return (tags || []).some(function (t) { return list.indexOf(t) >= 0; }); }
function spot(chain) {
  chain = Array.isArray(chain) ? chain : [];
  for (var i = 0; i < chain.length; i++) {
    if (matches(chain[i], ['.bnote'])) return 'note';
    if (matches(chain[i], BUSY)) return 'busy';
  }
  return chain.length && matches(chain[0], EMPTY) ? 'empty' : 'busy';
}
function anchor(box, side) {
  var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  return side === 'top' ? {x: cx, y: box.y} : side === 'bottom' ? {x: cx, y: box.y + box.h} :
         side === 'left' ? {x: box.x, y: cy} : {x: box.x + box.w, y: cy};
}
function nearSide(box, pt) {
  var best = 'right', bd = Infinity;
  SIDES.forEach(function (s) { var a = anchor(box, s), d = Math.hypot(a.x - pt.x, a.y - pt.y); if (d < bd) { bd = d; best = s; } });
  return best;
}
var NORMAL = {top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0]};
function path(a, aSide, b, bSide) {
  var r = function (v) { return Math.round(v * 10) / 10; };
  var k = Math.min(BEND, Math.max(24, Math.hypot(b.x - a.x, b.y - a.y) / 2));   // 짧은 선은 덜 휘게
  var na = NORMAL[aSide] || [1, 0], nb = NORMAL[bSide] || [-1, 0];
  return 'M' + r(a.x) + ',' + r(a.y) + ' C' + r(a.x + na[0] * k) + ',' + r(a.y + na[1] * k) + ' ' +
         r(b.x + nb[0] * k) + ',' + r(b.y + nb[1] * k) + ' ' + r(b.x) + ',' + r(b.y);
}
function hash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function stamp(D) {
  var ids = [];
  ((D && D.rows) || []).forEach(function (row) { (row.screens || []).forEach(function (s) { if (s && s.id) ids.push(s.id); }); });
  return hash(((D && D.title) || '') + '|' + ids.sort().join(','));
}
function nearest(box, boxes) {                        // 노트 상자에 가장 가까운 화면 id(상자 사이 거리, 겹치면 0)
  var best = null, bd = Infinity;
  Object.keys(boxes || {}).forEach(function (id) {
    var c = boxes[id], dx = Math.max(c.x - (box.x + box.w), box.x - (c.x + c.w), 0), dy = Math.max(c.y - (box.y + box.h), box.y - (c.y + c.h), 0), d = Math.hypot(dx, dy);
    if (d < bd) { bd = d; best = id; }
  });
  return best;
}
function copyText(b, opt) {
  opt = opt || {};
  var N = (b && b.notes) || {}, boxes = opt.boxes || {}, titles = opt.titles || {}, hasScreen = function (id) { return has(boxes, id); };
  var ids = Object.keys(N).sort(function (p, q) { return (N[p].y - N[q].y) || (N[p].x - N[q].x) || (p < q ? -1 : 1); });
  var no = {}; ids.forEach(function (id, i) { no[id] = i + 1; });
  var name = function (s) { var n = noteOf(s); return n ? '노트 ' + no[n] : '화면 ' + s.slice(7) + (titles[s.slice(7)] ? '(' + titles[s.slice(7)] + ')' : ''); };
  var edges = live(b, hasScreen);
  var lines = ['[hyper-design 판 노트] out=' + (opt.out || '') + ' · 노트 ' + ids.length + '개 · 선 ' + edges.length + '개'];
  ids.forEach(function (id) {
    var n = N[id], near = nearest({x: n.x, y: n.y, w: n.w, h: opt.heights && opt.heights[id] || 60}, boxes);
    lines.push(no[id] + '. ' + (near ? '가까운 화면=' + near + ' · ' : '') + '"' + n.text.replace(/\s*\n\s*/g, ' / ') + '"');
  });
  if (edges.length) {
    lines.push('선:');
    edges.forEach(function (e) { lines.push('- ' + name(e.from) + ' → ' + name(e.to) + (e.label ? ' · ' + e.label : '')); });
  }
  return lines.join('\n');
}

HD.boardNotes = {NAME: NAME, W: W, MIN_W: MIN_W, MAX_W: MAX_W, MAX: MAX, LABEL_MAX: LABEL_MAX, SIDES: SIDES, EMPTY: EMPTY, BUSY: BUSY,
                 parse: parse, newId: newId, create: create, finish: finish, move: move, removeNote: removeNote, connect: connect, unlink: unlink,
                 label: label, live: live, room: room, spot: spot, anchor: anchor, nearSide: nearSide, path: path, stamp: stamp, hash: hash,
                 copyText: copyText, nearest: nearest, text: text};
})();
