#!/usr/bin/env node
/**
 * edits.js — 보드에서 사용자가 직접 고친 줄(순서 · 빼기 · 글자 · 크기 · 아이콘)을 AI 없이 바로 실행물에 쓴다.
 *
 *   node scripts/edits.js runs/<project> <보내기 글 파일>
 *
 * 읽는 줄(보드가 쓰고 이 스크립트가 읽는 계약 — S = 화면 번호, 경로 = answer-parsing §1-1):
 *   화면 <S> · 구역 순서: <key>, <key>, …                                   그 화면 data-region 전부, 위에서 아래로
 *   화면 <S> · 구역 '<제목>' 안 순서: '<글자 앞 12자>', '<…>', … [<부모 경로>]   형제의 새 순서
 *   화면 <S> · <이름표> 빼기 [<경로>]
 *   화면 <S> · <이름표> 고쳐 쓰기: '<전>' → '<후>' [<경로>]
 *   화면 <S> · <이름표> 크기 <+n|-n>단계 [<경로>]                            덩어리면 그 안의 글자 모두
 *   화면 <S> · 아이콘 '<A>' 바꿔: 아이콘 <A> → <B> [<경로>]
 *
 * 시안 보드 글(2턴)도 같다 — 고른 시안 조각을 screens/<slug>.html로 복사한 뒤 부른다. 1턴 expand.js가 시안 조각에도 셸을 붙여 두어
 * 보드 경로가 복사본 경로와 같다. 시안 · 꾸밈 · 테마 · `시안 <id> 메모` 줄은 모르는 줄이라 남긴다.
 * 블록 데이터(answer · rest · regions)가 아직 없는 화면이면 조각만 고친다(칸을 새로 만들지 않는다).
 * 반영한 줄은 screens/<slug>.html 조각과 screens.json(블록 rest · items · label, board.changes)을 함께 고친다.
 * 경로가 조각과 안 맞으면 이름표 따옴표 안 글자로 찾는다. 그 밖의 줄 · 반영 못 한 줄은 _check/edits-left.txt에 그대로 남긴다(AI 몫).
 * 줄마다 고친 뒤 스키마(scripts/schema.js)에 새 FAIL이 생기면 그 줄만 남기고, 다 고친 뒤 사본에 lint(scripts/lint.js)를 돌려
 * 새 FAIL이 생기면 아무것도 쓰지 않는다 — 고치기 전부터 있던 FAIL은 이 스크립트 탓이 아니라 막지 않는다.
 * 조각은 원래 글자를 잘라 붙여 고친다(들여쓰기 · 속성 순서 그대로, 고친 곳만 바뀜).
 * exit 0 = 썼음(남긴 줄이 있어도), 1 = 검사 FAIL로 되돌림, 2 = 쓰는 법 오류.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { SCHEMA, checkData } = require("./schema.js");
const { derive } = require("./derive.js");
const PLATFORM = require("./platform.js");

const ROOT = PLATFORM.ROOT;
const read = (f) => fs.readFileSync(f, "utf8");
const END = "(나머지는 추천대로)";

// ---------- 조각 나무 — 요소마다 원래 글자 위치(start · end · open · inner)만 기억한다 ----------
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const attrsOf = (s) => Object.fromEntries([...(s || "").matchAll(/([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map((m) => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? ""]));
function parse(src) {
  const root = { tag: "#root", attrs: {}, kids: [], parent: null, start: 0, end: src.length };
  const stack = [root], top = () => stack[stack.length - 1];
  const text = (a, b) => { if (b > a) top().kids.push({ tag: "#text", start: a, end: b, parent: top(), kids: [], attrs: {} }); };
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let last = 0, m;
  while ((m = re.exec(src))) {
    text(last, m.index);
    last = re.lastIndex;
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      const at = stack.map((n) => n.tag).lastIndexOf(m[1].toLowerCase());
      if (at < 1) continue;
      while (stack.length > at + 1) stack.pop().end = m.index;   // 닫지 않은 요소는 여기까지
      stack.pop().end = re.lastIndex;
      continue;
    }
    const n = { tag: m[2].toLowerCase(), attrs: attrsOf(m[3]), kids: [], parent: top(), start: m.index, open: [m.index, re.lastIndex], end: re.lastIndex };
    top().kids.push(n);
    if (!m[4] && !VOID.has(n.tag)) stack.push(n);
  }
  text(last, src.length);
  return root;
}
const els = (n) => n.kids.filter((k) => k.tag !== "#text");
const all = (n) => els(n).flatMap((k) => [k, ...all(k)]);
const inside = (n, host) => { for (let x = n.parent; x; x = x.parent) if (x === host) return true; return false; };
const cls = (n) => (n.attrs.class || "").split(/\s+/).filter(Boolean);
const regionOf = (n) => { for (let x = n; x; x = x.parent) if (x.attrs["data-region"] != null) return x; return null; };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m, k) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " })[k]);
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const textOf = (src, n) => (n.tag === "#text" ? decode(src.slice(n.start, n.end)) : n.tag === "svg" ? "" : n.kids.map((k) => textOf(src, k)).join(" "));
const nameOf = (src, n) => n.attrs["aria-label"] || n.attrs.placeholder || textOf(src, n);
// 띄어쓰기를 빼고 견준다 — 보드는 화면에 보이는 글자, 조각은 태그 사이 줄바꿈이 섞여 있다
const bare = (s) => String(s).replace(/\s+/g, "").replace(/…$/, "");
// 블록 items 줄과 조각 요소 글자를 견줄 때 — 글자 · 숫자만
const core = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const underSvg = (n) => { for (let x = n; x; x = x.parent) if (x.tag === "svg") return true; return false; };
// 요소 안 글자 조각(#text) 전부 — 아이콘(svg) 안은 빼고
const textNodes = (n) => (n.tag === "svg" ? [] : n.kids.flatMap((k) => (k.tag === "#text" ? [k] : textNodes(k))));
const ownText = (src, n) => n.kids.some((k) => k.tag === "#text" && src.slice(k.start, k.end).trim());
const useOf = (n) => (n.tag === "use" ? n : all(n).find((x) => x.tag === "use"));
const iconName = (n) => { const u = n && useOf(n); const h = u && (u.attrs.href || u.attrs["xlink:href"] || ""); return h ? h.replace(/^#[if]-/, "") : ""; };

/** 경로(answer-parsing §1-1) → 요소. @key = 그 data-region, 태그:n = 같은 태그 형제 중 n번째, @가 없으면 조각 맨 위부터 */
function resolve(root, p) {
  let n = root;
  for (const sg of String(p || "").split(">").map((x) => x.trim()).filter(Boolean)) {
    if (sg[0] === "@") n = all(n).find((x) => x.attrs["data-region"] === sg.slice(1));
    else {
      const m = /^([a-z0-9-]+)(?::(\d+))?$/.exec(sg);
      n = m && els(n).filter((c) => c.tag === m[1])[(m[2] ? Number(m[2]) : 1) - 1];
    }
    if (!n) return null;
  }
  return n === root ? null : n;
}

// 이름표 앞말(보드 24-board-screens.js kindOf) → 그 종류 요소인지. 목록에 없는 종류(부분 · 글자 …)는 글자로만 찾는다
const KIND = {
  버튼: (n) => n.tag === "button" || cls(n).includes("btn"),
  링크: (n) => n.tag === "a",
  제목: (n) => /^h[1-6]$/.test(n.tag) || cls(n).some((c) => ["page-title", "card-title", "section-title"].includes(c)),
  "목록 한 줄": (n) => ["li", "tr"].includes(n.tag) || cls(n).some((c) => ["list-item", "timeline-item"].includes(c)),
  표시: (n) => cls(n).some((c) => c === "badge" || c === "chip"),
  메뉴: (n) => cls(n).includes("nav-item"),
  이미지: (n) => n.tag === "img",
  아이콘: (n) => n.tag === "svg",
  구역: (n) => n.attrs["data-region"] != null,
};
/** 이름표 "<종류> '<글자>'"가 이 요소에 맞나 — 글자가 없는 이름표는 맞는 것으로 */
function fits(src, n, label) {
  const m = /^(.+?) '(.*)'$/.exec(label);
  if (!m) return true;
  if (m[1] === "아이콘") return iconName(n) === m[2];
  const t = bare(nameOf(src, n));
  return m[2].split(" · ").map(bare).filter(Boolean).every((p) => t.includes(p));
}
/** 이름표 글자로 찾기 — 맞는 것 중 가장 안쪽 하나(종류가 맞는 것 먼저). 여럿이면 못 찾은 것으로 */
function byLabel(src, scope, label) {
  const kind = KIND[(/^(.+?) '/.exec(label) || [])[1]];
  if (!/'.+'$/.test(label)) return null;
  const hit = all(scope).filter((n) => fits(src, n, label));
  const pool = kind && hit.some(kind) ? hit.filter(kind) : hit;
  const inner = pool.filter((n) => !pool.some((x) => x !== n && inside(x, n)));
  return inner.length === 1 ? inner[0] : null;
}
/** 경로로 찾고, 안 맞으면 이름표 글자로(경로의 @구역 안 먼저, 다음 조각 전체) */
function locate(src, root, label, p) {
  const n = resolve(root, p);
  if (n && fits(src, n, label)) return n;
  const key = (/^@([^\s>]+)/.exec(p || "") || [])[1];
  const host = key && all(root).find((x) => x.attrs["data-region"] === key);
  return (host && byLabel(src, host, label)) || byLabel(src, root, label);
}

// ---------- 글자 잘라 붙이기 ----------
/** 여는 태그의 속성 하나 — 있으면 값만 바꾸고, 없으면 태그 이름 바로 뒤에 넣는다. val null = 지운다 */
function setAttr(src, n, name, val) {
  const [a, b] = n.open, tag = src.slice(a, b);
  const re = new RegExp(`(\\s${escRe(name)}\\s*=\\s*)("[^"]*"|'[^']*'|[^\\s>]+)`);
  const out = re.test(tag) ? (val == null ? tag.replace(re, "") : tag.replace(re, (m, p) => `${p}"${val}"`)) : val == null ? tag : tag.replace(/^<[\w:-]+/, (t) => `${t} ${name}="${val}"`);
  return src.slice(0, a) + out + src.slice(b);
}
/** 요소 빼기 — 그 줄에 요소만 있으면 줄째로 */
function cut(src, n) {
  const ls = src.lastIndexOf("\n", n.start - 1) + 1, le = src.indexOf("\n", n.end), lineEnd = le < 0 ? src.length : le;
  if (!src.slice(ls, n.start).trim() && !src.slice(n.end, lineEnd).trim()) return src.slice(0, ls) + src.slice(le < 0 ? src.length : le + 1);
  return src.slice(0, n.start) + src.slice(n.end);
}
/** 자리 바꾸기 — slots(문서 순서)의 자리에 want 순서대로 넣는다. 부모가 다른 것끼리는 섞지 않는다(부모마다 따로) */
function permute(src, slots, want) {
  const reps = [];
  for (const par of new Set(slots.map((n) => n.parent))) {
    const w = want.filter((n) => n.parent === par);
    slots.filter((n) => n.parent === par).forEach((n, i) => reps.push([n.start, n.end, src.slice(w[i].start, w[i].end)]));
  }
  for (const [a, b, t] of reps.sort((x, y) => y[0] - x[0])) src = src.slice(0, a) + t + src.slice(b);
  return src;
}

// ---------- 데이터 쪽 ----------
const blocksOf = (s) => (s.answer ? [s.answer, ...(s.rest || [])] : []);
const listOf = (s) => (s.answer ? s.rest : s.regions) || [];   // 옛 형식(regions를 직접 쓴 화면)은 regions
/** 조각 요소 하나가 블록 items 몇 번째 줄인가: -1 없음 · -2 여럿 */
function itemOf(b, text) {
  const t = core(text);
  const hit = (b.items || []).map((it, i) => [core(it), i]).filter(([c]) => c && t && (t === c || t.includes(c) || (c.includes(t) && t.length * 2 >= c.length)));
  return hit.length === 1 ? hit[0][1] : hit.length ? -2 : -1;
}

// ---------- 글자 크기 단계 — base.css의 --fs-* 순서 · 부품 CSS에서 클래스 하나짜리 규칙의 단계 ----------
const CSS = (() => {
  const base = read(path.join(ROOT, "packages/core/tokens/base.css"));
  const steps = [...new Set([...base.matchAll(/--fs-([a-z0-9]+)\s*:/g)].map((m) => m[1]))];
  return (platform) => {
    const rule = {}, util = {};
    let at = 0;
    for (const css of [base, ...PLATFORM.files(platform, "components", ".css").map((f) => read(f.path))]) {
      for (const m of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const size = /font-size\s*:\s*var\(--fs-([a-z0-9]+)\)/.exec(m[2]);
        at++;
        if (!size) continue;
        for (const sel of m[1].split(",").map((x) => x.trim())) {
          const c = (/^\.([\w-]+)$/.exec(sel) || [])[1];
          if (!c) continue;
          if (c === "text-" + size[1]) util[size[1]] = at;
          else rule[c] = { step: size[1], at };
        }
      }
    }
    return { steps, rule, util };
  };
})();

// ---------- 줄 읽기 ----------
function readLine(line) {
  let m = /^화면 (\d+) · (.+)$/.exec(line);
  if (!m) return null;
  const sid = Number(m[1]), rest = m[2];
  if ((m = /^구역 순서: (.+)$/.exec(rest))) return { kind: "order", sid, keys: m[1].split(/\s*,\s*/).filter(Boolean) };
  const pm = /^(.*) \[([^\[\]]*)\]$/.exec(rest);
  if (!pm || /^toast:/.test(pm[2])) return null;   // 안내 문구 줄은 데이터(data-stay · cases)를 고치는 AI 몫
  const body = pm[1], p = pm[2];
  if ((m = /^구역 '(.+?)' 안 순서: '(.*)'$/.exec(body))) return { kind: "inner", sid, path: p, title: m[1], texts: m[2].split("', '") };
  if ((m = /^아이콘 '(.+?)' 바꿔: 아이콘 (\S+) → (\S+?)(?:, (.+))?$/.exec(body))) return { kind: "icon", sid, path: p, label: `아이콘 '${m[1]}'`, a: m[2], b: m[3], memo: m[4] };
  if ((m = /^(.+) 고쳐 쓰기: '(.*?)' → '(.*)'$/.exec(body))) return { kind: "text", sid, path: p, label: m[1], from: m[2], to: m[3] };
  if ((m = /^(.+) 크기 ([+-]\d+)단계$/.exec(body))) return { kind: "size", sid, path: p, label: m[1], step: Number(m[2]) };
  if ((m = /^(.+) 빼기$/.exec(body))) return { kind: "remove", sid, path: p, label: m[1] };
  return null;
}

// ---------- 보드 다음 판 '지난 의견을 반영했어요' 상자에 보일 말 — 보드 '화면에서 바로 고친 것' 목록(26-board-edit.js B.editSay)과 같은 말투 ----------
const cutSay = (t) => { t = String(t).replace(/\s+/g, " ").trim(); return t.length > 18 ? t.slice(0, 18) + "…" : t; };
function saidOf(c, L) {
  const name = (k) => { const b = blocksOf(c.s).find((x) => x.key === k); return b ? b.label : k === "action" && c.s.action ? c.s.action.label : k; };
  if (L.kind === "order") return "구역 순서: " + L.keys.map(name).join(" → ");
  if (L.kind === "inner") return `'${L.title}' 안 순서: ${L.texts.map((x) => `'${x.trim()}'`).join(" → ")}`;
  if (L.kind === "text") return `글자 '${cutSay(L.from)}' → '${cutSay(L.to)}'`;
  if (L.kind === "size") return `${L.label} ${Math.abs(L.step)}단계 ${L.step > 0 ? "크게" : "작게"}`;
  if (L.kind === "remove") return `${L.label} 뺌`;
  return `아이콘 ${L.a} → ${L.b}`;
}

// ---------- 줄 하나 반영 — ctx = { s, src, flow, P, css }. 고친 조각을 ctx.src에 두고 '한 일' 한 줄을 돌려준다. 못 하면 left(이유) ----------
const left = (why) => { throw Object.assign(new Error(why), { left: true }); };
const OPS = {
  order(c, L) {
    const root = parse(c.src), regs = all(root).filter((n) => n.attrs["data-region"] != null), have = regs.map((n) => n.attrs["data-region"]);
    if ([...have].sort().join() !== [...L.keys].sort().join() || new Set(L.keys).size !== L.keys.length) left(`구역 key가 조각과 다름 (조각: ${have.join(", ")})`);
    if (regs.some((a) => regs.some((b) => inside(a, b)))) left("구역 안에 구역이 있음");
    c.src = permute(c.src, regs, L.keys.map((k) => regs[have.indexOf(k)]));
    const now = all(parse(c.src)).filter((n) => n.attrs["data-region"] != null).map((n) => n.attrs["data-region"]);
    if (now.join() !== L.keys.join()) left("구역이 서로 다른 부모 아래에 있어 그 순서로 옮길 수 없음");
    const list = listOf(c.s);
    list.sort((a, b) => L.keys.indexOf(a.key) - L.keys.indexOf(b.key));
    // 펼칠 때 붙인 읽는 순서(data-pos, expand.js markLevels)도 새 순서로
    const pos = new Map((derive(c.s).regions || []).filter((r) => r.pos != null).map((r) => [r.key, r.pos]));
    for (const n of all(parse(c.src)).filter((x) => x.attrs["data-pos"] != null && pos.has(x.attrs["data-region"])).reverse()) c.src = setAttr(c.src, n, "data-pos", pos.get(n.attrs["data-region"]));
    return `구역 순서 ${L.keys.join(" → ")}${c.s.answer ? " (rest도 그 순서, 답 블록은 answer 그대로)" : ""}`;
  },
  inner(c, L) {
    const root = parse(c.src);
    // 부모 요소의 자식 중 적힌 글자로 시작하는 것을 하나씩 — 다 찾으면 그 자식들
    const kidsFor = (par) => {
      if (!par) return null;
      const used = new Set(), out = [];
      for (const t of L.texts) {
        const k = els(par).find((x) => !used.has(x) && bare(nameOf(c.src, x)).startsWith(bare(t)));
        if (!k) return null;
        used.add(k);
        out.push(k);
      }
      return out.length > 1 ? out : null;
    };
    let kids = kidsFor(resolve(root, L.path));
    if (!kids) {
      // 경로가 안 맞으면: 제목이 맞는 구역 안에서 그 자식들을 가진 가장 안쪽 요소
      const title = bare(L.title), b = blocksOf(c.s);
      const host = all(root).find((n) => n.attrs["data-region"] != null && (b.some((x) => x.key === n.attrs["data-region"] && bare(x.label).startsWith(title)) || bare(textOf(c.src, n)).startsWith(title)));
      const cand = host ? [host, ...all(host)].filter(kidsFor) : [];
      const inner = cand.filter((n) => !cand.some((x) => x !== n && inside(x, n)));
      if (inner.length === 1) kids = kidsFor(inner[0]);
    }
    if (!kids) left("경로 · 글자로 그 형제들을 찾지 못함");
    // 형제가 블록 items 줄과 하나씩 맞으면 items 순서도 (글자 위치가 바뀌기 전에 견준다)
    const reg = regionOf(kids[0]), b = reg && blocksOf(c.s).find((x) => x.key === reg.attrs["data-region"]);
    const idx = b ? kids.map((k) => itemOf(b, textOf(c.src, k))) : [];
    c.src = permute(c.src, [...kids].sort((x, y) => x.start - y.start), kids);
    const items = b && idx.every((i) => i >= 0) && new Set(idx).size === idx.length && idx.length === b.items.length;
    if (items) b.items = idx.map((i) => b.items[i]);
    return `'${L.title}' 안 ${kids.length}개 순서 바꿈${items ? " (items도)" : ""}`;
  },
  remove(c, L) {
    const root = parse(c.src), n = locate(c.src, root, L.label, L.path);
    if (!n) left("경로 · 이름표 글자로 요소를 찾지 못함");
    if (n.tag === "main" || cls(n).includes("app")) left("화면 바탕은 뺄 수 없음");
    const trig = new Set([...(c.flow.flows || []).flatMap((f) => f.steps || []), ...(c.flow.branches || [])].filter((st) => st.from === c.s.slug && st.trigger).map((st) => st.trigger));
    const t = [n, ...all(n)].map((x) => x.attrs["data-trigger"]).find((x) => trig.has(x));
    if (t) left(`흐름 버튼(data-trigger "${t}")이 들어 있음 — 흐름을 다시 이어야 함`);
    const key = n.attrs["data-region"];
    let data = "";
    if (key != null) {
      if (c.s.answer && key === c.s.answer.key) left("답 블록(answer) — 남은 것 중 답을 다시 정해야 함");
      if (key === "action") left("주 버튼(action) — 흐름 · 데이터를 같이 정해야 함");
      const list = listOf(c.s), i = list.findIndex((b) => b.key === key);
      if (i >= 0) { list.splice(i, 1); data = c.s.answer ? " (rest에서도)" : " (regions에서도)"; }
    } else {
      if (all(n).some((x) => x.attrs["data-region"] != null)) left("안에 구역이 들어 있음");
      const reg = regionOf(n), b = reg && blocksOf(c.s).find((x) => x.key === reg.attrs["data-region"]);
      const i = b ? itemOf(b, textOf(c.src, n)) : -1;
      if (i === -2) left(`'${b.key}' 블록 items 중 어느 줄인지 여럿이 맞음`);
      if (i >= 0) {
        if (b.items.length <= 1) left(`'${b.key}' 블록의 마지막 items 줄`);
        b.items.splice(i, 1);
        data = " (items에서도)";
      }
    }
    c.src = cut(c.src, n);
    return `${L.label} 뺌${data}`;
  },
  text(c, L) {
    const root = parse(c.src), n = locate(c.src, root, L.label, L.path);
    if (!n) left("경로 · 이름표 글자로 요소를 찾지 못함");
    const re = new RegExp(escRe(escHtml(L.from)).replace(/ +/g, "\\s+"));
    const t = textNodes(n).find((x) => re.test(c.src.slice(x.start, x.end)));
    if (!t) left(`'${L.from}'이 한 글자 덩어리 안에 없음`);
    c.src = c.src.slice(0, t.start) + c.src.slice(t.start, t.end).replace(re, () => escHtml(L.to)) + c.src.slice(t.end);
    // 같은 글이 그 구역 블록의 label · items(답 블록이면 say도) · 주 버튼 글에 있으면 그것도 — 길이는 줄마다 스키마 검사가 본다
    const reg = regionOf(n), key = reg && reg.attrs["data-region"], fixed = [];
    const swap = (o, k, what) => { if (typeof o[k] === "string" && o[k].includes(L.from)) { o[k] = o[k].split(L.from).join(L.to); fixed.push(what); } };
    if (key === "action" && c.s.action) swap(c.s.action, "label", "action.label");
    const b = key && blocksOf(c.s).find((x) => x.key === key);
    if (b) { swap(b, "label", "label"); if (b === c.s.answer) swap(b, "say", "say"); (b.items || []).forEach((it, i) => swap(b.items, i, "items")); }
    return `'${L.from}' → '${L.to}'${fixed.length ? ` (${[...new Set(fixed)].join(" · ")}도)` : ""}`;
  },
  size(c, L) {
    const root = parse(c.src), n = locate(c.src, root, L.label, L.path);
    if (!n) left("경로 · 이름표 글자로 요소를 찾지 못함");
    const { steps, rule, util } = c.css;
    const own = (x) => {
      const u = cls(x).map((k) => (/^text-(.+)$/.exec(k) || [])[1]).find((k) => k in util);
      const r = cls(x).filter((k) => rule[k]).map((k) => rule[k]).sort((a, b) => b.at - a.at)[0];
      return { u, r };
    };
    const stepOf = (x) => { for (; x && x.tag !== "#root"; x = x.parent) { const o = own(x); if (o.u || o.r) return o.u || o.r.step; } return "md"; };
    const leaves = ownText(c.src, n) ? [n] : all(n).filter((x) => !underSvg(x) && ownText(c.src, x));
    if (!leaves.length) left("안에 글자가 없음");
    const jobs = [], moved = new Set();
    for (const x of leaves) {
      const o = own(x), base = o.r ? o.r.step : stepOf(x.parent), cur = o.u || base;
      const to = steps[Math.max(0, Math.min(steps.length - 1, steps.indexOf(cur) + L.step))];
      if (to === cur) continue;
      let next;
      if (to === base) next = cls(x).filter((k) => k !== "text-" + o.u);
      else if (!(to in util)) left(`글자 단계 ${to}에 맞는 클래스(.text-${to})가 부품 CSS에 없음`);
      else if (o.r && o.r.at > util[to]) left(`부품 클래스가 .text-${to}보다 뒤에 있어 덮음`);
      else next = cls(x).filter((k) => k !== "text-" + o.u).concat("text-" + to);
      jobs.push([x, next.length ? next.join(" ") : null]);
      moved.add(`${cur}→${to}`);
    }
    if (!jobs.length) left(`이미 ${L.step > 0 ? "가장 큰" : "가장 작은"} 단계`);
    for (const [x, v] of jobs.sort((a, b) => b[0].start - a[0].start)) c.src = setAttr(c.src, x, "class", v);
    return `글자 ${jobs.length}곳 ${[...moved].join(" · ")}`;
  },
  icon(c, L) {
    if (L.memo) left("메모가 붙어 있음 — 아이콘 말고도 바꿀 것이 있음");
    if (!c.allow.has(L.b)) left(`아이콘 '${L.b}'가 허용 목록(packages/core/icons/allowlist.json)에 없음`);
    const root = parse(c.src);
    let n = resolve(root, L.path);
    if (!n || iconName(n) !== L.a) {
      const key = (/^@([^\s>]+)/.exec(L.path) || [])[1], host = key && all(root).find((x) => x.attrs["data-region"] === key);
      const hit = all(host || root).filter((x) => x.tag === "svg" && iconName(x) === L.a);
      n = hit.length === 1 ? hit[0] : null;
    }
    if (!n) left(`아이콘 '${L.a}'를 경로 · 이름으로 찾지 못함`);
    const u = useOf(n), attr = u.attrs.href != null ? "href" : "xlink:href";
    c.src = setAttr(c.src, u, attr, u.attrs[attr].replace(new RegExp(`-${escRe(L.a)}$`), "-" + L.b));
    return `아이콘 ${L.a} → ${L.b}`;
  },
};

// ---------- lint — 사본 폴더에 고친 파일을 얹어 돌린다. FAIL 줄 목록 ----------
function lintFails(dir) {
  const r = spawnSync(process.execPath, [path.join(__dirname, "lint.js"), dir], { encoding: "utf8", timeout: 120000 });
  return ((r.stdout || "") + (r.stderr || "")).split("\n").filter((l) => l.startsWith("[FAIL]"));
}

// 시험(53-concept-copy-edits.js)이 보드 경로를 같은 나무로 재 본다
module.exports = { parse, resolve };

// ---------- 실행 ----------
if (require.main === module) {
  const [runArg, textArg] = process.argv.slice(2);
  if (!runArg || !textArg) { console.error("usage: node scripts/edits.js runs/<project> <보내기 글 파일>"); process.exit(2); }
  const runDir = path.resolve(runArg), sFile = path.join(runDir, "screens.json"), fFile = path.join(runDir, "flow.json");
  const srcJson = read(sFile), P = JSON.parse(srcJson);
  const flow = fs.existsSync(fFile) ? JSON.parse(read(fFile)) : null;
  const allowJson = JSON.parse(read(path.join(ROOT, "packages/core/icons/allowlist.json")));
  const allow = new Set(Object.entries(allowJson).filter(([k]) => !k.startsWith("_")).map(([, v]) => v));
  const css = CSS(P.platform || "web");
  const baseErrs = new Set(checkData(P, flow));
  const frags = {};   // 조각 파일 경로 → 고친 글자(메모리)
  const done = [], kept = [], leftLines = [];
  const keep = (line, why) => { kept.push([line, why]); leftLines.push(line); };

  for (const line of read(path.resolve(textArg)).split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw) continue;
    if (raw === END) { leftLines.push(raw); continue; }   // 끝 표시 — 남긴 글도 보내기 글 모양 그대로
    const L = readLine(raw);
    if (!L) { keep(raw, "모르는 줄 — AI 몫"); continue; }
    const at = (P.screens || []).findIndex((s) => s.id === L.sid);
    if (at < 0) { keep(raw, `화면 ${L.sid} 없음 (screens.json id — 없으면 node scripts/ids.js 먼저)`); continue; }
    const file = path.join(runDir, P.screens[at].file || `screens/${P.screens[at].slug}.html`);
    if (!(file in frags) && !fs.existsSync(file)) { keep(raw, `조각 없음 (${path.relative(runDir, file)})`); continue; }
    const before = JSON.stringify(P.screens[at]);
    const c = { s: P.screens[at], src: frags[file] ?? read(file), flow: flow || {}, css, allow };
    try {
      const did = OPS[L.kind](c, L);
      const errs = checkData(P, flow).filter((e) => !baseErrs.has(e));
      if (errs.length) left(`스키마 FAIL ${errs[0]}`);
      frags[file] = c.src;
      ((P.board = P.board || {}).changes = P.board.changes || []).push({ slug: c.s.slug, said: saidOf(c, L), did });
      done.push([raw, did]);
    } catch (e) {
      if (!e.left) throw e;
      P.screens[at] = JSON.parse(before);
      keep(raw, e.message);
    }
  }

  for (const [l, d] of done) console.log(`반영  ${l}\n      → ${d}`);
  for (const [l, w] of kept) console.log(`남김  ${l}\n      → ${w}`);

  // 끝 검사 — 스키마는 메모리에서, lint는 사본에 고친 파일을 얹어서. 고치기 전보다 FAIL이 늘면 아무것도 쓰지 않는다
  const indent = (/^\{\n([ \t]+)"/.exec(srcJson) || [, "  "])[1];
  const outJson = JSON.stringify(P, null, indent) + (srcJson.endsWith("\n") ? "\n" : "");
  const newSchema = checkData(P, flow).filter((e) => !baseErrs.has(e));
  let newLint = [];
  if (done.length) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oss-edits-"));
    try {
      const copy = path.join(tmp, path.basename(runDir));
      fs.cpSync(runDir, copy, { recursive: true, filter: (f) => !/[\\/](out|_check)$/.test(f) });
      const was = new Set(lintFails(copy));
      fs.writeFileSync(path.join(copy, "screens.json"), outJson);
      for (const [f, t] of Object.entries(frags)) fs.writeFileSync(path.join(copy, path.relative(runDir, f)), t);
      newLint = lintFails(copy).filter((l) => !was.has(l));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  if (newSchema.length || newLint.length) {
    newSchema.forEach((e) => console.log(`FAIL 스키마 ${e}`));
    newLint.forEach((e) => console.log(`FAIL lint ${e.replace(/^\[FAIL\] /, "")}`));
    console.log(`edits: 되돌림 — 고친 뒤 검사 FAIL ${newSchema.length + newLint.length}개, 아무것도 쓰지 않음 (반영하려던 ${done.length} · 남김 ${kept.length})`);
    process.exit(1);
  }
  if (done.length) {
    for (const [f, t] of Object.entries(frags)) fs.writeFileSync(f, t);
    fs.writeFileSync(sFile, outJson);
  }
  const leftFile = path.join(runDir, "_check", "edits-left.txt");
  fs.mkdirSync(path.dirname(leftFile), { recursive: true });
  fs.writeFileSync(leftFile, leftLines.length ? leftLines.join("\n") + "\n" : "");
  const shown = path.relative(process.cwd(), leftFile);
  console.log(`edits: 반영 ${done.length} · 남김 ${kept.length} (남긴 줄: ${shown.startsWith("..") ? leftFile : shown})`);
}
