// 스타일 — 색 대비는 looks.js(실제로 칠하는 계산) 하나로 본다: 바탕 3 × 버튼 색 5 × (고른 색 그대로 · 채도 낮춤)에서
// 글자/판 7 · 흐린 글자/판·바탕 4.5 · 버튼 글자/버튼 4.5 · 강조 글자/판·바탕 4.5 이상.
// 꾸밈 판 모양(견본을 흡수한 값까지)은 dress.css를 읽어 판 색을 계산하고, 판 위 글자 4.5 이상인지 본다(비치는 판은 가장 나쁜 바탕 위에서).
const path = require("path");
const { ROOT, suite } = require("../lib.js");
const LK = require(path.join(ROOT, "scripts", "looks.js"));

const t = suite("36 스타일");

// 바탕: 따뜻한 종이(시험 입력의 PRD 맞춤) · 흰 · 어두운(고정 바탕). 버튼 색: 남색 · 머스타드 · 파랑 · 노랑 · 청록(밝기가 고루 퍼지게)
const own = require(path.join(__dirname, "..", "fixtures", "sample", "screens.json")).looks;
const bases = [{ from: own[0].id }, { base: "white" }, { base: "dark" }];
const ct = (a, b) => +LK.contrast(a, b).toFixed(2);
let n = 0, bad = 0;
for (const b of bases) for (const hex of ["#23317A", "#D4A017", "#2F6FD6", "#F2C94C", "#1F8A84"]) for (const exact of [true, false]) {
  n++;
  const L = Object.assign(LK.customLook(Object.assign({ hex }, b), own), { exact });
  const V = Object.assign(LK.lookTokens(L), LK.swatchTokens(L, L.swatches[0]));
  const bg = V["--c-bg"], sf = V["--c-surface"];
  const c = { 글자: ct(V["--c-text"], sf), 흐린: Math.min(ct(V["--c-text-muted"], sf), ct(V["--c-text-muted"], bg)), 흐린2: Math.min(ct(V["--c-text-2"], sf), ct(V["--c-text-2"], bg)),
    버튼글자: ct(V["--c-primary-fg"], V["--c-primary"]), 강조글자: Math.min(ct(V["--c-primary-text"], sf), ct(V["--c-primary-text"], bg)) };
  if (c.글자 < 7 || c.흐린 < 4.5 || c.흐린2 < 4.5 || c.버튼글자 < 4.5 || c.강조글자 < 4.5 || V["--c-text-2"] === V["--c-text-muted"]) {
    bad++; t.fail(`${L.base} · ${hex}${exact ? " (그대로)" : ""}: ${Object.entries(c).map(([k, v]) => k + " " + v).join(" · ")}${V["--c-text-2"] === V["--c-text-muted"] ? " · 흐린 글자 두 단계가 같은 색" : ""}`);
  }
}
if (!bad) t.ok(`looks.js 대비 ${n}조합 모두 기준 이상`);

// 프리셋 → 직접 고른 색(custom) · 글자 크기 — 계산은 looks.js customLook 하나 (scripts/screens.js)
{
  const fam = path.join(ROOT, "test", "fixtures", "project", "family-trip"), P = require(path.join(fam, "screens.json")).preset;
  const S = require(path.join(ROOT, "scripts", "screens.js")).loadScreens(fam), C = LK.getLooks(S).find((l) => l.id === "custom");
  const want = { "custom.hex": [S.custom && S.custom.hex, P.brand], "custom.base(paper → warm)": [C && C.base, "warm"], "글꼴": [C && C.font, P.font],
    "theme": [S.theme, "custom"], "toggles.type": [S.toggles && S.toggles.type, P.size], "custom.name = 기준어": [S.custom && S.custom.name, P.keywords.map((k) => k.word).join(" · ")] };
  const off = Object.entries(want).filter(([, [a, b]]) => a !== b).map(([k, [a, b]]) => `${k} ${a} (기대 ${b})`);
  if (off.length) t.fail(`프리셋 → custom: ${off.join(" · ")}`); else t.ok("프리셋 → custom(바탕 · 대표색 · 기준어 · 글꼴) + 글자 크기 — looks.js customLook으로 계산");
}

// ---------- 꾸밈 판 모양(scripts/dress.js · packages/core/tokens/dress.css) — 견본을 흡수한 값까지 ----------
const fs = require("fs");
const DR = require(path.join(ROOT, "scripts", "dress.js"));
const CARDS = Object.keys(DR.CATS.cards.values), BGS = Object.keys(DR.CATS.bg.values), GRADS = Object.keys(DR.CATS.grad.values);

// 설명표: 견본에서 옮긴 값마다 근거가 있고, 함께 정하는 모서리 · 바탕이 실제 값이다
let noteBad = 0;
for (const [v, nt] of Object.entries(DR.NOTE.cards)) {
  const miss = ["from", "when", "dont", "rank1"].filter((k) => !nt[k]).concat(Array.isArray(nt.refs) && nt.refs.length && nt.refs.every((u) => /^https:\/\//.test(u)) ? [] : ["refs"]);
  if (!DR.CATS.cards.values[v]) miss.push("판 모양 값 없음");
  if (nt.radius && !DR.CATS.radius.values[nt.radius]) miss.push(`모서리 '${nt.radius}' 없음`);
  if (nt.bg && !DR.CATS.bg.values[nt.bg]) miss.push(`바탕 '${nt.bg}' 없음`);
  if (miss.length) { noteBad++; t.fail(`판 모양 설명표 ${v}: ${miss.join(" · ")}`); }
}
if (!noteBad) t.ok(`판 모양 설명표 ${Object.keys(DR.NOTE.cards).length}줄 — 근거 · 함께 정하는 모서리 · 바탕이 맞음`);

// 모서리 잠금: 판 모양이 정하는 모서리는 배정에서 그 값으로 맞춰지고, 다르게 쓰면 잡힌다
const locks = Object.entries(DR.NOTE.cards).filter(([, nt]) => nt.radius);
const picked = Array.from({ length: 10 }, (_, i) => DR.pick(i + 1, [], (i + 1) * 7919));
const lockBad = picked.filter((d) => DR.check(d).length).map((d) => DR.check(d).join(" / "))
  .concat(locks.filter(([v, nt]) => !/data-radius="([^"]*)"/.test(DR.attrs({ cards: v })) || DR.attrs({ cards: v }).match(/data-radius="([^"]*)"/)[1] !== nt.radius).map(([v]) => `${v}: data-radius가 안 붙음`))
  .concat(locks.filter(([v, nt]) => !DR.check({ cards: v, radius: nt.radius === "sm" ? "pill" : "sm" }).length).map(([v]) => `${v}: 다른 모서리를 잡지 못함`))
  .concat(DR.check({ cards: "float", radius: [...new Set(locks.map(([, nt]) => nt.radius))][0] }).length ? [] : ["잠금 전용 모서리를 아무 판에 써도 통과함"]);
lockBad.forEach((e) => t.fail(`모서리 잠금: ${e}`));
if (!lockBad.length) t.ok(`모서리 잠금 ${locks.map(([v, nt]) => v + "→" + nt.radius).join(" · ")} — 배정 · data-* · 검사가 같은 값`);

// CSS 읽기 — 규칙(선택자 · 선언)만. 주석은 지운다
const rulesOf = (f) => [...fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ sel: m[1].trim(), decl: Object.fromEntries(m[2].split(/;(?![^(]*\))/).map((d) => d.trim()).filter(Boolean).map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()])) }));
const DRESS_CSS = rulesOf("packages/core/tokens/dress.css"), MOBILE_CSS = rulesOf("packages/mobile/components/00-mobile-tokens.css");
// 그 값이 켜졌을 때 걸리는 규칙인가 — [data-k="v"] 또는 :not()으로 빼지 않은 [data-k] (기본값은 data-*를 붙이지 않는다)
const has = (r, k, v) => { const nots = (r.sel.match(/:not\([^)]*\)/g) || []).join(" "), rest = r.sel.replace(/:not\([^)]*\)/g, "");
  return rest.includes(`[data-${k}="${v}"]`) || (v !== DR.BASE[k] && rest.includes(`[data-${k}]`) && !nots.includes(`[data-${k}="${v}"]`)); };
const named = (r, k, v) => r.sel.includes(`[data-${k}="${v}"]`);
const cssMiss = [...CARDS.filter((v) => v !== DR.BASE.cards && !DRESS_CSS.some((r) => named(r, "cards", v))).map((v) => "cards " + v),
  ...BGS.filter((v) => v !== DR.BASE.bg && !DRESS_CSS.some((r) => named(r, "bg", v))).map((v) => "bg " + v),
  ...[...new Set(locks.map(([, nt]) => nt.radius))].filter((v) => !DRESS_CSS.some((r) => named(r, "radius", v))).map((v) => "radius " + v)];
if (cssMiss.length) t.fail(`dress.css에 규칙 없는 값: ${cssMiss.join(", ")}`); else t.ok("판 모양 · 바탕 값과 판 모양이 정하는 모서리마다 dress.css 규칙이 있음");

// 색 식 계산 — #hex · transparent · rgba() · var() · color-mix(in srgb) · oklch(from … h ± n) · 그라데이션(색 멈춤마다). 색 = [r, g, b, 알파]
const splitTop = (s) => { const out = []; let d = 0, cur = ""; for (const ch of s) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && !d) { out.push(cur.trim()); cur = ""; } else cur += ch; } return out.concat(cur.trim() ? [cur.trim()] : []); };
const inner = (s) => s.slice(s.indexOf("(") + 1, s.lastIndexOf(")"));
const lead = (s) => { const m = /^(#[0-9a-f]{6}\b|transparent\b|[a-z-]+\()/i.exec(s); if (!m) return null; if (!m[1].endsWith("(")) return m[1]; let d = 0; for (let i = 0; i < s.length; i++) { if (s[i] === "(") d++; if (s[i] === ")" && !--d) return s.slice(0, i + 1); } return null; };
function colors(expr, V) {
  expr = expr.trim();
  if (/gradient\(/.test(expr)) return splitTop(inner(expr)).map(lead).filter((x) => x && !/^(to|at)\b/.test(x)).flatMap((x) => colors(x, V));
  if (/^#[0-9a-f]{6}$/i.test(expr)) return [[...LK.hex2rgb(expr), 1]];
  if (expr === "transparent") return [[0, 0, 0, 0]];
  if (/^rgba?\(/.test(expr)) { const n = inner(expr).split(",").map(Number); return [[n[0], n[1], n[2], n.length > 3 ? n[3] : 1]]; }
  if (/^var\(/.test(expr)) { const [name, fb] = splitTop(inner(expr)); return V[name] !== undefined ? colors(V[name], V) : fb ? colors(fb, V) : (() => { throw new Error(`변수 ${name} 없음`); })(); }
  if (/^oklch\(from /.test(expr)) {
    const [, base, dh] = /^from (.+) l c calc\(h ([+-] \d+)\)$/.exec(inner(expr));
    const [r, g, b, a] = colors(base, V)[0], [L, C, H] = LK.hex2oklch(hex([r, g, b])); return [[...LK.hex2rgb(LK.oklch2hex([L, C, H + (Number(dh.replace(" ", "")) * Math.PI) / 180])), a]];
  }
  if (/^color-mix\(/.test(expr)) {
    const [, x, y] = splitTop(inner(expr)), part = (s) => { const m = /^(.*?)(?:\s+(\d+(?:\.\d+)?)%)?$/.exec(s); return { c: colors(m[1], V)[0], p: m[2] === undefined ? null : +m[2] / 100 }; };
    const A = part(x), B = part(y), p = A.p !== null ? A.p : B.p !== null ? 1 - B.p : 0.5, a = A.c[3] * p + B.c[3] * (1 - p);
    return [[0, 1, 2].map((i) => (a ? (A.c[i] * A.c[3] * p + B.c[i] * B.c[3] * (1 - p)) / a : 0)).concat(a)];
  }
  throw new Error(`색 식을 읽지 못함: ${expr}`);
}
const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
// 그 꾸밈에서 .app에 걸리는 변수 (규칙 순서대로 덮는다)
const on = (r, d) => Object.entries(d).some(([k, v]) => has(r, k, v));
const varsFor = (V, d) => DRESS_CSS.filter((r) => /(^|\s)\.app$/.test(r.sel) && (r.sel === ".app" || on(r, d)))
  .reduce((o, r) => Object.assign(o, Object.fromEntries(Object.entries(r.decl).filter(([k]) => k.startsWith("--")))), Object.assign({}, V));
// 판 색: 판에 바로 칠한 background — 없으면 웹은 --c-surface, 휴대폰은 --m-card-bg
const cardExprs = (v, platform) => { const e = DRESS_CSS.filter((r) => has(r, "cards", v) && /\.(card|section)\b/.test(r.sel) && r.decl.background).map((r) => r.decl.background);
  return e.length ? e : [platform === "mobile" ? "var(--m-card-bg)" : "var(--c-surface)"]; };
// 화면 바탕 무늬: .content의 background-image는 한 규칙만 이긴다(그라데이션이 바탕 무늬를 덮는다) — 선택자 무게가 크고 뒤에 오는 쪽
const weight = (sel) => (sel.replace(/:is\(([^,)]*)[^)]*\)/g, "$1").match(/[.[]/g) || []).length;
const layerOf = (d) => DRESS_CSS.filter((r) => on(r, d) && /\.content$/.test(r.sel) && r.decl["background-image"]).reduce((w, r) => (!w || weight(r.sel) >= weight(w.sel) ? r : w), null);
const MOBILE = MOBILE_CSS.find((r) => r.sel === ".app-mobile").decl;

let dn = 0, dbad = 0;
for (const b of bases) for (const hx of ["#23317A", "#D4A017", "#2F6FD6", "#F2C94C", "#1F8A84"]) {
  const L = LK.customLook(Object.assign({ hex: hx }, b), own), V0 = Object.assign(LK.lookTokens(L), LK.swatchTokens(L, L.swatches[0]));
  for (const v of CARDS) {
    const worst = {};
    for (const platform of ["web", "mobile"]) for (const bg of BGS) for (const grad of GRADS) {
      const d = { cards: v, bg, grad, tone: DR.BASE.tone };
      if (DR.clash(d)) continue;   // 배정이 피하는 조합은 화면에 나오지 않는다
      let V = varsFor(platform === "mobile" ? Object.assign({}, V0, { "--m-page-bg": MOBILE["--m-page-bg"], "--m-card-bg": MOBILE["--m-card-bg"] }) : V0, d);
      const page = colors(V["--m-page-bg"] && platform === "mobile" ? "var(--m-page-bg)" : "var(--c-bg)", V)[0];
      const layer = layerOf(d), unders = [page, ...(layer ? colors(layer.decl["background-image"], V).map((m) => over(m, page)) : [])];   // 무늬는 가장 진한 곳에서
      // 판 위에서만 바꾸는 변수(흐린 글자 당기기 등)는 .app 값으로 먼저 계산해 둔다 — 같은 이름을 스스로 읽는 식이 있어서
      const cardVars = DRESS_CSS.filter((r) => has(r, "cards", v) && /\.(card|section)\b/.test(r.sel)).flatMap((r) => Object.entries(r.decl).filter(([k]) => k.startsWith("--")));
      const VA = V; V = Object.assign({}, VA, Object.fromEntries(cardVars.map(([k, e]) => { const c = colors(e, VA)[0]; return [k, `rgba(${c.slice(0, 3).join(",")},${c[3]})`]; })));
      const own = cardExprs(v, platform).flatMap((e) => colors(e, V)), cards = own.flatMap((c) => unders.map((u) => over(c, u)));
      for (const [name, tok] of [["글자", "--c-text"], ["흐린 글자", "--c-text-muted"], ["흐린 글자 2", "--c-text-2"], ["강조 글자", "--c-primary-text"]]) {
        const ink = hex(colors(`var(${tok})`, V)[0]);
        for (const c of cards) { const r = +LK.contrast(ink, hex(c)).toFixed(2); if (!(name in worst) || r < worst[name][0]) worst[name] = [r, `${platform} · 바탕 ${bg} · 그라데이션 ${grad}`]; }
      }
    }
    dn++;
    const low = Object.entries(worst).filter(([, [r]]) => r < 4.5);
    if (low.length) { dbad++; t.fail(`판 모양 ${v} · ${L.base} · ${hx}: ${low.map(([k, [r, at]]) => `${k} ${r} (${at})`).join(" · ")}`); }
  }
}
if (!dbad) t.ok(`판 모양 ${CARDS.length}개 × 바탕 ${bases.length} × 버튼 색 5 = ${dn}조합 — 판 위 글자 4.5 이상 (비치는 판은 가장 나쁜 바탕 · 무늬 위에서, 배정이 피하는 조합은 빼고)`);
t.end();
