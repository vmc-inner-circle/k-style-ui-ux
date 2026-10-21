/**
 * looks.js — 분위기(look)와 버튼 색(swatch)을 CSS 토큰으로 바꾼다. build.js·lint.js가 함께 쓰고, 시안 보드에서도 그대로 돈다(직접 고른 색을 바로 칠하려고).
 *
 * 고를 수 있는 분위기 = screens.json looks(PRD 맞춤 1개) + 고정 스타일(packages/core/tokens/presets.json presets — 토스 느낌·당근 느낌…)
 *   + 직접 고른 색(screens.json "custom": { "hex": "#C8553D", "name": "테라코타", "base": "white|warm|dark", "font"?: "<FONTS id>" } → id "custom")
 *     (프리셋이 있으면 scripts/screens.js가 preset → custom으로 잇는다)
 * screens.json:
 *   "looks": [
 *     { "id": "cream", "name": "따뜻한 크림", "why": "가족이 함께 보는 화면이라 포근한 톤",
 *       "mode": "light", "bg": "#FBF8F3", "ink": "#1F1B16", "shape": "round",
 *       "swatches": [ { "id": "terracotta", "name": "테라코타", "hex": "#D9562B" }, … 5개 ] }
 *   ]   ← PRD 맞춤 1개 (references/prd-to-screens.md §6)
 *   "theme": "<look id>", "toggles": { "type": "large", "swatch": "<swatch id>" }
 *   look에 "font": "<FONTS id>" — 분위기마다 글꼴 세트 하나(없으면 pretendard)
 *   look에 "exact": true — 버튼 색 채도를 낮추지 않는다(고정 스타일·직접 고른 색: 고른 색 그대로)
 *
 * 메인은 배경(bg)·글자(ink)·모양(shape)·버튼 색(hex)·글꼴(font)만 정한다. 표면·테두리·흐린 글자·눌림색·연한 강조는 여기서 계산한다.
 * 디자이너 기준으로 자동 보정한다(사용자 선택지를 늘리지 않는다):
 *   - 본문 글자는 순수 검정·순수 흰색이 아니게: 바탕과의 대비가 글꼴 세트의 inkMax를 넘으면 바탕 쪽으로 섞어 눌러 준다(#000 → #2E2E2E 수준)
 *   - 버튼 색은 형광처럼 쨍하지 않게: OKLCH 채도(chroma)를 상한까지 낮춘다(밝기·색상은 그대로) — exact면 그대로
 *   - 흐린 글자(--c-text-muted)는 판과 바탕 둘 다에 대비 4.5, 보조 글자(--c-text-2)는 6이 될 때까지 본문 글자 쪽으로 진하게
 *   - 버튼 색 하나를 세 역할로 나눈다(DS3, docs/design-system.md §2):
 *     --c-brand 고른 색 그대로(꾸밈 · 표시선) · --c-primary 버튼 채움(흰 글자가 바닥선 — 레퍼런스 3 · 맞춤 4.5 — 이 될 만큼만 밝기를 내림)
 *     · --c-primary-text 강조 글자(큰 숫자 · 링크 · 고른 탭 — 밝기만 바꿔 판 · 바탕 둘 다에 4.5)
 *   - 상태색(완료·주의·오류·안내)도 원색 대신 차분한 색(흙빛 빨강 등)을 바탕에 맞춰 섞는다
 */
(function () {
"use strict";
// Node(build·lint)에서는 presets.json을 읽고, 보드에서는 build.js가 넣은 window.HX_LOOKS_DATA를 쓴다
const DATA = typeof require === "function" ? require("../packages/core/tokens/presets.json") : (window.HX_LOOKS_DATA || {});
const PRESETS = DATA.presets || [], PALETTE = DATA.palette || [], BASES = DATA.bases || [];

// ---------- 글꼴 세트 — 글꼴마다 어울리는 굵기·자간·줄간격·글자 진하기가 다르다 ----------
// css: 불러올 웹 글꼴. sans: 본문 글꼴, head: 제목 글꼴(없으면 sans). w*: 굵기, ls*: 자간, lh*: 줄간격,
// inkMax: 본문 글자와 바탕의 최대 대비(가는 글꼴일수록 조금 더 진하게 둔다)
const PRETENDARD_CSS = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css";
const FALLBACK = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const FONTS = {
  pretendard: { name: "프리텐다드", why: "반듯하고 중립적이라 어떤 서비스에도 무난해요", css: [PRETENDARD_CSS],
    sans: `Pretendard, ${FALLBACK}`, wBody: 400, wStrong: 600, wHead: 700, lsHead: "-0.02em", lsBody: "-0.01em", lhHead: 1.35, lhBody: 1.55, inkMax: 14 },
  suit: { name: "수트", why: "글자 폭이 고르고 또렷해 숫자·정보가 많은 화면에 좋아요", css: ["https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT.css"],
    sans: `SUIT, Pretendard, ${FALLBACK}`, wBody: 400, wStrong: 600, wHead: 800, lsHead: "-0.015em", lsBody: "0em", lhHead: 1.35, lhBody: 1.6, inkMax: 13.5 },
  "nanum-square-round": { name: "나눔스퀘어라운드", why: "둥글고 친근해 생활·가족·아이 서비스에 어울려요", css: ["https://cdn.jsdelivr.net/gh/innks/NanumSquareRound@master/nanumsquareround.min.css"],
    sans: `NanumSquareRound, Pretendard, ${FALLBACK}`, wBody: 400, wStrong: 700, wHead: 800, lsHead: "-0.01em", lsBody: "0em", lhHead: 1.4, lhBody: 1.65, inkMax: 15 },
  "ibm-plex": { name: "IBM 플렉스", why: "곧고 단정해 업무 도구·관리 화면에 어울려요", css: ["https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap"],
    sans: `"IBM Plex Sans KR", Pretendard, ${FALLBACK}`, wBody: 400, wStrong: 500, wHead: 600, lsHead: "-0.01em", lsBody: "-0.005em", lhHead: 1.4, lhBody: 1.6, inkMax: 14 },
  "serif-title": { name: "명조 제목", why: "제목만 명조라 기록·읽을거리·감성 서비스에 어울려요",
    css: ["https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700&display=swap", PRETENDARD_CSS],
    sans: `Pretendard, ${FALLBACK}`, head: `"Noto Serif KR", "Nanum Myeongjo", serif`, wBody: 400, wStrong: 600, wHead: 700, lsHead: "-0.01em", lsBody: "-0.01em", lhHead: 1.4, lhBody: 1.6, inkMax: 13.5 },
};
const fontOf = (L) => FONTS[L && L.font] || FONTS.pretendard;
/** 분위기들이 쓰는 웹 글꼴 CSS 주소 (중복 없이) */
function fontLinks(looks) { return [...new Set(looks.flatMap((L) => fontOf(L).css))]; }

// ---------- 색 계산 ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hex2rgb(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h || "").trim());
  if (!m) throw new Error(`색 형식 오류: ${h} (#RRGGBB)`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgb2hex = (c) => "#" + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
/** a와 b를 섞는다. t = b의 비율(0~1) */
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
function lum(h) {
  return hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// ---------- OKLCH (채도만 낮추고 밝기·색상은 지킨다) ----------
const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const fromLin = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
function hex2oklch(h) {
  const [r, g, b] = hex2rgb(h).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}
function oklch2hex([L, C, H]) {
  const A = C * Math.cos(H), B = C * Math.sin(H);
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return rgb2hex([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(fromLin));
}
const CHROMA_MAX = { light: 0.165, dark: 0.14 };
/** 이 분위기에서 실제로 칠할 버튼 색 (exact면 고른 색 그대로) */
const primaryHex = (L, sw) => (L && L.exact ? String(sw.hex).toUpperCase() : calmHex(sw.hex, L && L.mode === "dark"));
/** 버튼 색이 형광처럼 쨍하면 채도만 상한까지 낮춘다 */
function calmHex(h, dark) {
  const c = hex2oklch(h), max = CHROMA_MAX[dark ? "dark" : "light"];
  return c[1] <= max ? String(h).toUpperCase() : oklch2hex([c[0], max, c[2]]);
}
/** 본문 글자색: 바탕과 대비가 max를 넘으면(순수 검정·순수 흰색) 바탕 쪽으로 섞어 눌러 준다 */
function softInk(ink, bg, max) {
  if (contrast(ink, bg) <= max) return String(ink).toUpperCase();
  let lo = 0, hi = 0.6;
  for (let i = 0; i < 24; i++) { const t = (lo + hi) / 2; if (contrast(mix(ink, bg, t), bg) > max) lo = t; else hi = t; }
  return mix(ink, bg, hi);
}
// ---------- 대비 바닥선 (docs/design-system.md §2) ----------
// 글자는 바탕 · 판 위에서 4.5 이상(KRDS · WCAG AA). 보조 글자(text-2)는 흐린 글자보다 한 단계 진하게 6 이상.
// 레퍼런스 스타일(exact)의 흰 버튼 글자만 3 이상 허용 — 그 앱이 실제로 쓰는 조합(당근 주황 · 토스 파랑 …), WCAG 큰 굵은 글자 기준. 검사는 경고로 드러낸다
const TEXT_MIN = 4.5, TEXT2_MIN = 6, BRAND_BUTTON_MIN = 3;
/** fg가 bgs(여러 바탕) 모두 위에서 min을 넘을 때까지 toward 쪽으로 섞는다. toward로도 안 되면 toward */
function atLeast(fg, bgs, min, toward) {
  const worst = (c) => Math.min(...[].concat(bgs).map((b) => contrast(c, b)));
  if (worst(fg) >= min) return String(fg).toUpperCase();
  if (worst(toward) < min) return String(toward).toUpperCase();
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const t = (lo + hi) / 2; if (worst(mix(fg, toward, t)) >= min) hi = t; else lo = t; }
  return mix(fg, toward, hi);
}
/** 판(카드) 색 — 흐린 글자 · 강조 글자가 이 위에서도 읽혀야 한다 */
const surfaceOf = (L) => (L.mode === "dark" ? mix(L.bg, "#FFFFFF", 0.04) : mix(L.bg, "#FFFFFF", 0.75));

// 상태색 — 원색 대신 차분한 색. 연한 바탕은 그 분위기의 바탕에 섞어 만든다
const STATUS_HEX = {
  light: { success: "#2F7D4F", warning: "#B7791F", danger: "#C2412B", info: "#3A6EA5" },
  dark: { success: "#5CC08A", warning: "#E3B341", danger: "#F08A74", info: "#7FAEE0" },
};
function statusTokens(bg, dark) {
  const t = {}, P = STATUS_HEX[dark ? "dark" : "light"];
  for (const [k, c] of Object.entries(P)) {
    t[`--c-${k}`] = c;
    t[`--c-${k}-soft`] = mix(bg, c, dark ? 0.16 : 0.12);
    t[`--c-${k}-soft-fg`] = atLeast(dark ? mix(c, "#FFFFFF", 0.4) : mix(c, "#000000", 0.32), t[`--c-${k}-soft`], TEXT_MIN, dark ? "#FFFFFF" : "#000000");
  }
  t["--c-danger-hover"] = dark ? mix(P.danger, "#FFFFFF", 0.16) : mix(P.danger, "#000000", 0.12);
  t["--c-danger-active"] = dark ? P.danger : mix(P.danger, "#000000", 0.24);
  return t;
}
const SHAPE = {
  // flat: 회색 바탕 위 흰 카드 — 테두리·그림자 없이 크게 둥글게(토스 느낌)
  flat: { "--r-card": "var(--r-xl)", "--r-control": "var(--r-lg)", "--shadow-card": "none", "--border-card": "1px solid transparent" },
  soft: { "--r-card": "var(--r-lg)", "--r-control": "var(--r-md)", "--shadow-card": "var(--shadow-sm)", "--border-card": "1px solid var(--c-border)" },
  round: { "--r-card": "var(--r-xl)", "--r-control": "var(--r-pill)", "--shadow-card": "var(--shadow-md)", "--border-card": "1px solid transparent" },
  sharp: { "--r-card": "var(--r-sm)", "--r-control": "var(--r-sm)", "--shadow-card": "none", "--border-card": "1px solid var(--c-border)" },
};

/** 글꼴 세트 → 글꼴·굵기·자간·줄간격 토큰 */
function fontTokens(L) {
  const f = fontOf(L);
  return { "--font-sans": f.sans, "--font-head": f.head || "var(--font-sans)",
    "--fw-body": String(f.wBody), "--fw-semibold": String(f.wStrong), "--fw-head": String(f.wHead), "--fw-bold": String(Math.max(700, f.wHead)),
    "--ls-head": f.lsHead, "--ls-body": f.lsBody, "--lh-tight": String(f.lhHead), "--lh-normal": String(f.lhBody) };
}
/** 본문 글자색 — 글꼴 세트의 inkMax로 보정한 값 */
function inkOf(L) { return softInk(L.ink, L.bg, L.mode === "dark" ? Math.min(fontOf(L).inkMax, 14) : fontOf(L).inkMax); }

/** 배경·글자·모양·글꼴 → 바탕 토큰 */
function lookTokens(L) {
  const dark = L.mode === "dark", bg = L.bg, ink = inkOf(L), surface = surfaceOf(L);
  const t = dark ? {
    "--c-bg": bg, "--c-surface": surface, "--c-surface-2": mix(bg, "#FFFFFF", 0.08), "--c-surface-3": mix(bg, "#FFFFFF", 0.12),
    "--c-border": mix(bg, "#FFFFFF", 0.14), "--c-border-strong": mix(bg, "#FFFFFF", 0.22),
    "--c-text": ink, "--c-text-2": mix(ink, bg, 0.3), "--c-text-muted": mix(ink, bg, 0.52), "--c-text-inverse": bg,
    "--c-overlay": "rgba(0, 0, 0, .6)", "--c-skeleton": mix(bg, "#FFFFFF", 0.12),
  } : {
    "--c-bg": bg, "--c-surface": surface, "--c-surface-2": mix(bg, ink, 0.035), "--c-surface-3": mix(bg, ink, 0.07),
    "--c-border": mix(bg, ink, 0.11), "--c-border-strong": mix(bg, ink, 0.2),
    "--c-text": ink, "--c-text-2": mix(ink, bg, 0.36), "--c-text-muted": mix(ink, bg, 0.54), "--c-text-inverse": "#FFFFFF",
    "--c-overlay": "rgba(17, 24, 39, .45)", "--c-skeleton": mix(bg, ink, 0.07),
  };
  // 대비 바닥선: 보조 · 흐린 글자를 바탕과 판 둘 다에서 기준 이상으로(모자라면 본문 글자 쪽으로 진하게)
  const on = [bg, surface];
  t["--c-text-2"] = atLeast(t["--c-text-2"], on, TEXT2_MIN, ink);
  t["--c-text-muted"] = atLeast(t["--c-text-muted"], on, TEXT_MIN, ink);
  return Object.assign(t, statusTokens(bg, dark), SHAPE[L.shape] || SHAPE.soft, fontTokens(L));
}
/** 버튼 채움(DS3): 흰 글자가 min이 될 때까지 OKLCH 밝기만 내린다 — 색감 · 채도는 그대로. 최대 maxDL. 안 되면 null */
const FILL_MAX_DL = 0.08;   // 레퍼런스 버튼 채움을 깊게 하는 한도(design-system §2) — 더 내리면 주황이 갈색이 된다
function deepenFill(hex, min, maxDL) {
  if (contrast(hex, "#FFFFFF") >= min) return { hex: String(hex).toUpperCase(), dl: 0 };
  const [L, C, H] = hex2oklch(hex);
  for (let d = 0.005; d <= maxDL + 1e-9; d += 0.005) { const h = oklch2hex([L - d, C, H]); if (contrast(h, "#FFFFFF") >= min) return { hex: h, dl: +d.toFixed(3) }; }
  return null;
}
/** 강조 글자(DS3): bgs 모두 위에서 min이 될 때까지 OKLCH 밝기만 바꾼다(밝은 분위기는 어둡게, 어두운 분위기는 밝게). 안 되면 글자색 쪽으로 섞기 */
function textTone(hex, bgs, min, dark) {
  const worst = (c) => Math.min(...[].concat(bgs).map((b) => contrast(c, b)));
  if (worst(hex) >= min) return String(hex).toUpperCase();
  const [L, C, H] = hex2oklch(hex);
  for (let d = 0.01; d <= 0.7; d += 0.01) { const h = oklch2hex([clamp(L + (dark ? d : -d), 0, 1), C, H]); if (worst(h) >= min) return h; }
  return atLeast(hex, bgs, min, dark ? "#FFFFFF" : "#000000");
}
/** 버튼 색 하나 → 색 역할(DS3, design-system §2)
 *  --c-brand: 고른 색 그대로(강조선 · 표시 · 꾸밈) · --c-primary: 버튼 채움(흰 글자가 바닥선이 될 만큼만 깊게)
 *  --c-primary-fg: 버튼 위 글자 · --c-primary-text: 강조 글자(링크 · 고른 탭 · 숫자 강조, 바탕 · 판 위 4.5) */
function swatchTokens(L, sw) {
  const dark = L.mode === "dark", W = "#FFFFFF", D = dark ? L.bg : "#111827";
  const brand = primaryHex(L, sw);                   // 레퍼런스는 그 색 그대로, 맞춤 분위기는 채도만 차분하게
  const T = L.exact ? BRAND_BUTTON_MIN : TEXT_MIN;   // 흰 버튼 글자의 바닥선 — 레퍼런스 3 · 맞춤 4.5
  let p = brand, fg = W;
  if (contrast(brand, W) < T) {
    // 1) 밝은 분위기: 흰 글자가 되도록 채움만 깊게(레퍼런스는 한도 0.08, 맞춤은 넉넉히)  2) 안 되면 진한 글자  3) 그래도 안 되면 끝까지 깊게
    const d = !dark && deepenFill(brand, T, L.exact ? FILL_MAX_DL : 0.3);
    if (d) p = d.hex;
    else if (contrast(brand, D) >= TEXT_MIN) fg = D;
    else { const d2 = deepenFill(brand, T, 0.6); if (d2) p = d2.hex; else fg = contrast(brand, D) > contrast(brand, W) ? D : W; }
  }
  const text = textTone(brand, [L.bg, surfaceOf(L)], TEXT_MIN, dark);
  const soft = dark ? mix(L.bg, brand, 0.18) : mix(L.bg, brand, 0.12);
  return {
    "--c-brand": brand,
    "--c-primary": p,
    "--c-primary-hover": dark ? mix(p, "#FFFFFF", 0.16) : mix(p, "#000000", 0.12),
    "--c-primary-active": dark ? mix(p, "#000000", 0.12) : mix(p, "#000000", 0.24),
    "--c-primary-fg": fg,
    "--c-primary-text": text,
    "--c-primary-soft": soft,
    "--c-primary-soft-fg": textTone(text, soft, TEXT_MIN, dark),
    "--c-accent": "var(--c-primary)", "--c-accent-soft": "var(--c-primary-soft)", "--c-accent-soft-fg": "var(--c-primary-soft-fg)",
    "--c-focus": brand,
  };
}
/** 대비 검사 — 분위기 하나 × 버튼 색 하나의 글자 짝들. lint · 시험이 쓴다.
 *  돌려줌: [{ pair, ratio, min, level: "ok" | "warn" | "fail", note }] */
const dark0 = (L) => L.mode === "dark";
function audit(L, sw) {
  const t = Object.assign(lookTokens(L), swatchTokens(L, sw)), out = [];
  const add = (pair, a, b, min, note) => { const r = contrast(t[a] || a, t[b] || b); out.push({ pair, ratio: +r.toFixed(2), min, level: r >= min ? "ok" : "fail", note: note || "" }); };
  for (const bgk of ["--c-bg", "--c-surface"]) {
    add(`본문/${bgk.slice(4)}`, "--c-text", bgk, TEXT_MIN);
    add(`보조 글자/${bgk.slice(4)}`, "--c-text-2", bgk, TEXT2_MIN);
    add(`흐린 글자/${bgk.slice(4)}`, "--c-text-muted", bgk, TEXT_MIN);
  }
  const cw = contrast(t["--c-primary"], t["--c-primary-fg"]);
  const brand = L.exact && t["--c-primary-fg"] === "#FFFFFF" && cw < TEXT_MIN && cw >= BRAND_BUTTON_MIN;
  out.push({ pair: "버튼 글자/버튼", ratio: +cw.toFixed(2), min: brand ? BRAND_BUTTON_MIN : TEXT_MIN, level: brand ? "warn" : cw >= TEXT_MIN ? "ok" : "fail", note: brand ? "레퍼런스의 흰 글자 그대로(3 이상)" : "" });
  add("연한 강조 글자/연한 강조", "--c-primary-soft-fg", "--c-primary-soft", TEXT_MIN);
  for (const k of ["success", "warning", "danger", "info"]) add(`${k} 글자/${k} 연한 바탕`, `--c-${k}-soft-fg`, `--c-${k}-soft`, TEXT_MIN);
  // 강조 글자(링크 · 고른 탭) — --c-primary-text, 바탕 · 판 위 4.5
  add("강조 글자/bg", "--c-primary-text", "--c-bg", TEXT_MIN);
  add("강조 글자/surface", "--c-primary-text", "--c-surface", TEXT_MIN);
  // 레퍼런스 버튼: 채움을 깊게 했는지 · 한도를 넘어 진한 글자로 바꿨는지(사람이 알아야 하는 변화라 경고로)
  if (L.exact && t["--c-primary"] !== t["--c-brand"]) out.push({ pair: "버튼 채움 깊게", ratio: +cw.toFixed(2), min: BRAND_BUTTON_MIN, level: "warn", note: `${t["--c-brand"]} → ${t["--c-primary"]}` });
  if (L.exact && !dark0(L) && t["--c-primary-fg"] !== "#FFFFFF") out.push({ pair: "버튼 진한 글자", ratio: +cw.toFixed(2), min: TEXT_MIN, level: "warn", note: "깊게 하는 한도 안에서 흰 글자가 안 돼 진한 글자" });
  return out;
}
const block = (sel, vars) => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
function looksCss(looks) {
  const out = ["/* looks — scripts/looks.js가 screens.json의 looks에서 계산한 토큰 */"];
  for (const L of looks) {
    out.push(block(`[data-theme="${L.id}"]`, Object.assign(lookTokens(L), swatchTokens(L, L.swatches[0]))));
    for (const sw of L.swatches) out.push(block(`[data-theme="${L.id}"][data-swatch="${sw.id}"]`, swatchTokens(L, sw)));
  }
  return out.join("\n");
}
/** 직접 고른 색 → 분위기 하나 (id "custom"). c = { hex, name, from?, base?, bgHex?, font? }
 *  from = 고르기 전의 스타일(고정 스타일·PRD 맞춤) — 그 스타일의 바탕·모양·글꼴은 그대로 두고 버튼 색만 바꾼다
 *  (사용자: "직접 고르기를 하면 스타일이 사라지니까"). base·bgHex를 고르면 바탕만 바꾼다. font = 프리셋 글꼴(없으면 바탕 · 스타일 글꼴). own = PRD 맞춤 looks */
function customLook(c, own) {
  if (!c || !c.hex) return null;
  const pool = (own || []).concat(PRESETS), F = c.from ? pool.find((l) => l.id === c.from) : null;
  const FB = F ? { id: F.id, name: F.name, mode: F.mode, bg: F.bg, ink: F.ink, shape: F.shape, font: F.font } : null;
  let B = (c.base && BASES.find((b) => b.id === c.base)) || FB || BASES[0] || { id: "white", mode: "light", bg: "#FAFAFB", ink: "#1B1D22", shape: "soft", font: "pretendard", name: "흰 바탕" };
  if (FB && c.base) B = Object.assign({}, B, { shape: FB.shape, font: FB.font });   // 바탕만 바꾸고 모양·글꼴은 스타일 그대로
  // 버튼 색으로 살짝 물들인 바탕 · 그 밖의 바탕(bgHex — 밝기로 밝은/어두운 분위기를 정한다)
  if (B.id === "tint") B = Object.assign({}, B, { bg: mix(c.hex, "#FFFFFF", 0.93) });
  if (c.bgHex && /^#[0-9a-f]{6}$/i.test(c.bgHex)) {
    const dark = lum(c.bgHex) < 0.2;
    B = { id: "other", name: "고른 바탕 " + String(c.bgHex).toUpperCase(), mode: dark ? "dark" : "light", bg: String(c.bgHex).toUpperCase(), ink: dark ? "#ECEDEF" : "#1B1D22", shape: (FB || B).shape || "soft", font: (FB || B).font || "pretendard" };
  }
  return { id: "custom", name: F ? F.name + " + 고른 색" : "직접 고른 색", why: (c.name || String(c.hex).toUpperCase()) + " · " + (B.name || "바탕"), mode: B.mode, bg: B.bg, ink: B.ink, shape: B.shape, font: FONTS[c.font] ? c.font : B.font,
    exact: true, custom: true, base: B.id, swatches: [{ id: "custom", name: c.name || "고른 색", hex: String(c.hex).toUpperCase() }] };
}
/** 고를 수 있는 분위기 전부: PRD 맞춤(S.looks) → 고정 스타일 → 직접 고른 색(S.custom) */
function getLooks(S) {
  const own = Array.isArray(S.looks) ? S.looks : [];
  const out = own.concat(PRESETS.filter((p) => !own.some((l) => l.id === p.id)));
  const cu = customLook(S.custom, own);
  if (cu) out.push(cu);
  return out;
}
/** 예전 값(calm/vivid)도 받아서 그 분위기의 버튼 색 id로 */
function resolveSwatch(L, v) {
  if (!L || !L.swatches || !L.swatches.length) return null;
  if (L.swatches.some((s) => s.id === v)) return v;
  if (v === "vivid" && L.swatches[1]) return L.swatches[1].id;
  return L.swatches[0].id;
}

/** 어울리는 배색 5가지 — 색 하나에서 바탕·버튼 조합 (보드 '색 바꾸기'의 배색 추천) */
function harmonies(hex) {
  const [L, C, H] = hex2oklch(hex), deg = (d) => H + (d * Math.PI) / 180, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const mk = (l, c, h) => oklch2hex([cl(l, 0, 1), cl(c, 0, 0.32), h]);
  return [
    { id: "near", name: "비슷한 색", hex: mk(cl(L, 0.45, 0.62), Math.max(C, 0.12), H), bgHex: mk(0.975, 0.018, deg(30)) },
    { id: "opposite", name: "반대 색", hex: mk(cl(L, 0.45, 0.62), Math.max(C, 0.12), H), bgHex: mk(0.97, 0.025, deg(180)) },
    { id: "tone", name: "톤온톤", hex: mk(0.42, Math.max(C, 0.1), H), bgHex: mk(0.955, 0.035, H) },
    { id: "pastel", name: "파스텔", hex: mk(0.7, 0.1, H), bgHex: mk(0.985, 0.012, deg(-20)) },
    { id: "calm", name: "차분하게", hex: mk(0.4, Math.min(C, 0.07), H), bgHex: mk(0.965, 0.008, deg(60)) },
  ];
}
/** 색 바둑판 — 색상 12가지 × 밝기 5단계 + 회색 줄 */
function swatchGrid() {
  const hues = [25, 50, 75, 100, 130, 150, 180, 210, 240, 265, 300, 340], ls = [0.86, 0.74, 0.62, 0.5, 0.38];
  const rows = ls.map((l) => hues.map((h) => oklch2hex([l, Math.min(0.17, 0.06 + (1 - Math.abs(l - 0.6) * 1.6) * 0.11), (h * Math.PI) / 180])));
  rows.push([0.97, 0.9, 0.82, 0.72, 0.62, 0.52, 0.44, 0.36, 0.3, 0.24, 0.18, 0.13].map((l) => oklch2hex([l, 0.004, 4.5])));
  return rows;
}

const API = { audit, TEXT_MIN, PRESETS, PALETTE, BASES, FONTS, harmonies, swatchGrid, hex2oklch, oklch2hex, fontOf, fontLinks, fontTokens, inkOf, calmHex, primaryHex, customLook, getLooks, looksCss, lookTokens, swatchTokens, resolveSwatch, contrast, mix, hex2rgb };
if (typeof module !== "undefined" && module.exports) module.exports = API; else window.HXLooks = API;
})();
