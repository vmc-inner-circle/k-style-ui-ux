#!/usr/bin/env node
/**
 * dress.js — 꾸밈 카테고리 9개(배경 · 판 모양 · 제목 · 모서리 · 간격 · 글꼴 · 아이콘 · 색 쓰는 방식 · 그라데이션)의 값·과감함 점수·이름.
 * 사용자 결정(2026-10-14): "너무 다 비슷함", "1~10단계 다른 형태를 다 보여주자" → 시안 10개 = 과감함 1~10단계, 카테고리를 섞어 다르게.
 *
 *   node scripts/dress.js runs/<p>   → screens.json concepts[]마다 dress가 없으면 level(1~10)로 채우고 표를 찍는다
 *                                       (level 1 = 모두 기본값, 10 = 가장 과감. 시안끼리 4개 이상 카테고리가 다르게)
 * 화면에는 packages/core/tokens/dress.css가 data-* 로 입힌다(시안 보드 = 시안 화면 상자, 초안·최종본 = <html>, screens.json dress).
 * build.js · lint.js · 시안 보드가 CATS를 같이 쓴다.
 * 판 모양에는 스타일 견본 9개(플랫 · 머티리얼 · 글래스 …)를 흡수했다(설계 D2) — 견본의 근거(언제 · 하지 말 것 · 참고처 · 1순위 강조)는 NOTE에.
 */
const CATS = {
  bg: { name: "배경", values: { plain: [0, "단색 바탕"], tint: [1, "연한 색 바탕"], glow: [1, "은은한 번짐"], texture: [1, "질감 바탕"], dots: [2, "점무늬"], band: [3, "위쪽 색 띠"], mesh: [3, "색 번짐"], dark: [4, "어두운 머리"] } },
  cards: { name: "판 모양", values: { base: [0, "기본 판"], boxed: [1, "테두리 판"], flat: [1, "테두리 없는 판"], layered: [1, "겹 그림자 판"], line: [2, "선으로 나눔"], float: [2, "떠 있는 판"],
    glass: [2, "유리 판"], neumorph: [2, "도드라진 판"], clay: [2, "말랑한 판"], outline: [3, "굵은 선 판"], aurora: [3, "빛나는 판"], skeuo: [3, "실물 같은 판"], brutal: [3, "어긋난 그림자 판"] } },
  // 가운데 제목은 뺐다 — 왼쪽 정렬 판 위에 가운데 제목이 오면 정렬이 어긋나 보인다(사용자: "실제 앱처럼 정렬")
  head: { name: "제목", values: { normal: [0, "보통 제목"], big: [1, "큰 제목"], huge: [3, "아주 큰 제목"] } },
  // sm · none은 판 모양이 정하는 모서리(NOTE radius) — 따로 배정하지 않는다
  radius: { name: "모서리", values: { base: [0, "기본 모서리"], soft: [1, "살짝 둥글게"], round: [1, "둥글게"], sharp: [2, "각지게"], pill: [3, "아주 둥글게"], sm: [2, "작은 모서리"], none: [2, "모서리 없음"] } },
  space: { name: "간격", values: { normal: [0, "보통 간격"], airy: [1, "넉넉하게"], tight: [2, "촘촘하게"], extra: [3, "아주 넉넉하게"] } },
  font: { name: "글꼴", values: { base: [0, "분위기 글꼴"], pretendard: [1, "프리텐다드"], suit: [1, "수트"], "ibm-plex": [1, "IBM 플렉스"], "nanum-square-round": [1, "나눔스퀘어라운드"], "serif-title": [2, "명조 제목"] } },
  icons: { name: "아이콘", values: { line: [0, "선 아이콘"], fluent: [2, "입체 아이콘"] } },
  tone: { name: "색 쓰는 방식", values: { neutral: [0, "무채색 판"], soft: [1, "연한 색 판"], bold: [3, "진한 색 판"] } },
  // 그라데이션 — 배경 · 주 버튼과 큰 색 머리 · 큰 제목 글자에 한꺼번에 (사용자 결정 2026-10-14)
  grad: { name: "그라데이션", values: { none: [0, "단색"], fade: [1, "은은한 그라데이션"], sunset: [2, "노을 그라데이션"], aurora: [3, "오로라 그라데이션"] } },
};
/** 판 모양 값 설명표 — 스타일 견본(지운 styles.json — 25057dd까지 있음)에서 옮겼다. from 견본 · when 언제 · dont 하지 말 것 · refs 근거 · rank1 1순위 강조 방식
 *  radius = 판 모양이 함께 정하는 모서리(모양이 정체성이라 꾸밈의 모서리 칸을 덮는다) · bg = 견본이 함께 쓰던 바탕 무늬(dress bg 값) */
const NOTE = {
  cards: {
    flat: { from: "flat", bg: "plain", rank1: "tint", when: "정보가 많고 오래 보는 도구 · 공공 서비스 — 무엇이든 무난", dont: "누를 곳을 글자처럼 두지 않기 — 버튼은 채움", refs: ["https://www.nngroup.com/articles/flat-design/"] },
    layered: { from: "material", bg: "tint", rank1: "lift", when: "카드가 많은 목록 · 피드 — 판이 바탕 위에 떠 있는 위계", dont: "그림자만으로 판을 가르지 않기 — 어두운 바탕에선 톤 차이도", refs: ["https://m3.material.io/styles/elevation/overview"] },
    glass: { from: "glass", bg: "glow", rank1: "more-opaque", when: "사진 · 색 배경 위에 정보를 얹는 감성 서비스 · 첫 화면", dont: "글이 긴 화면 · 표에 쓰지 않기 — 글자 뒤 판을 충분히 불투명하게", refs: ["https://fluent2.microsoft.design/material", "https://www.nngroup.com/articles/glassmorphism/"] },
    neumorph: { from: "neumorph", bg: "plain", rank1: "raise", when: "기능이 적은 기기 조작 · 위젯 — 만지는 느낌이 중요할 때", dont: "누를 곳을 그림자만으로 말하지 않기 — 주 버튼은 색으로 채움", refs: ["https://uxdesign.cc/neumorphism-visual-accessibility-and-empathy-d1c5ed2a1f03"] },
    clay: { from: "clay", bg: "tint", rank1: "tint", when: "아이 · 가족 · 놀이 서비스 — 친근하고 장난스러울 때", dont: "작은 글자를 판 가장자리에 두지 않기 — 그림자에 묻힘", refs: ["https://trends.daisyui.com/ui-design-prompts/"] },
    skeuo: { from: "skeuo", bg: "texture", radius: "sm", rank1: "outline", when: "기록 · 수첩 · 악기처럼 실물을 떠올리게 할 때", dont: "질감 위에 글자를 바로 얹지 않기 — 글자 뒤는 단색 판", refs: ["https://www.nngroup.com/articles/skeuomorphism/"] },
    aurora: { from: "aurora", bg: "mesh", rank1: "glow", when: "새 서비스 첫인상 · 이벤트 — 화려함이 메시지일 때", dont: "움직이는 배경은 움직임 줄이기 설정을 따르기 · 본문 화면엔 쓰지 않기", refs: ["https://trends.daisyui.com/ui-design-prompts/"] },
    brutal: { from: "brutal", bg: "tint", radius: "sm", rank1: "bold-shadow", when: "젊은 층 · 커뮤니티 · 개성이 앞서는 서비스", dont: "원색을 본문 판에 쓰지 않기 — 본문은 흑백, 원색은 큰 면만", refs: ["https://trends.daisyui.com/ui-design-prompts/"] },
    line: { from: "line", bg: "plain", radius: "none", rank1: "outline", when: "콘텐츠 · 읽을거리 · 고급스러운 차분함", dont: "선과 글자를 너무 연하게 두지 않기 — 선 3:1, 글자 굵기 400 이상", refs: ["https://www.nngroup.com/articles/flat-design/"] },
  },
};
/** 판 모양이 정하는 모서리 (없으면 null) */
const lockedRadius = (d) => (d && NOTE.cards[d.cards] && NOTE.cards[d.cards].radius) || null;
const LOCKED = new Set(Object.values(NOTE.cards).map((n) => n.radius).filter(Boolean));
// 판이 비치는 판 모양 — 위쪽 색 띠 · 어두운 머리 위에 오면 글자가 바탕색에 묻힌다. 판이 아예 없는 것(line)은 무늬 바탕 · 그라데이션 위에도 두지 않는다
const SEE = ["glass", "aurora", "line"], BARE = ["line"], PATTERN = ["glow", "dots", "mesh"];
const KEYS = Object.keys(CATS);
const BASE = { bg: "plain", cards: "base", head: "normal", radius: "base", space: "normal", font: "base", icons: "line", tone: "neutral", grad: "none" };
const MAX = KEYS.reduce((n, k) => n + Math.max(...Object.values(CATS[k].values).map((v) => v[0])), 0);
/** 판 모양이 모서리를 정하면 radius 칸을 그 값으로 맞춘다 */
const fit = (d) => (lockedRadius(d) ? Object.assign({}, d, { radius: lockedRadius(d) }) : d);
/** 모든 카테고리를 채운 꾸밈 (시안 보드가 화면 상자에 입힌다) */
const full = (d) => fit(Object.assign({}, BASE, d || {}));
const score = (d) => KEYS.reduce((n, k) => n + ((CATS[k].values[d[k]] || [0])[0]), 0);
const diff = (a, b) => KEYS.filter((k) => (a[k] || BASE[k]) !== (b[k] || BASE[k])).length;
/** 사람이 읽는 이름 — 기본값은 빼고 */
const words = (d) => { d = d && fit(d); return KEYS.filter((k) => d && d[k] && d[k] !== BASE[k] && CATS[k].values[d[k]]).map((k) => CATS[k].values[d[k]][1]); };
/** html/상자에 붙일 data-* (아이콘은 build.js가 조각을 바꾸므로 빼고, 기본값도 뺀다) */
const attrs = (d) => { d = d && fit(d); return KEYS.filter((k) => k !== "icons" && d && d[k] && d[k] !== BASE[k]).map((k) => ` data-${k}="${d[k]}"`).join(""); };
function check(d) {
  const bad = [];
  for (const [k, v] of Object.entries(d || {})) if (!CATS[k]) bad.push(`카테고리 '${k}' 없음`); else if (!CATS[k].values[v]) bad.push(`${CATS[k].name} '${v}' 없음 (${Object.keys(CATS[k].values).join("|")})`);
  const r = lockedRadius(d);
  if (r && d.radius && d.radius !== r) bad.push(`판 모양 '${d.cards}'은 모서리 '${r}'를 함께 정한다 — radius는 비우거나 '${r}'`);
  if (!r && d && LOCKED.has(d.radius)) bad.push(`모서리 '${d.radius}'는 판 모양이 정하는 값 (${Object.keys(NOTE.cards).filter((c) => NOTE.cards[c].radius === d.radius).join("|")})`);
  return bad;
}
/** 함께 두면 안 되는 조합의 벌점 — 0이면 괜찮다 (pick이 피하고, 시험은 0인 조합만 본다) */
function clash(d) {
  // 강조색을 크게 쓰는 꾸밈은 한 안에 두 개까지(색 띠·색 번짐·연한 색 바탕 / 진한 색 판 / 그라데이션) — 버튼 색과 겹쳐 시끄러워지지 않게
  const loud = [["band", "mesh", "tint"].includes(d.bg), d.tone === "bold", d.grad !== "none"].filter(Boolean).length;
  return (loud > 2 ? 300 : 0) + (d.bg === "band" && d.tone === "bold" ? 300 : 0) + (d.bg === "dark" && d.grad === "aurora" ? 150 : 0)
    + (["band", "dark"].includes(d.bg) && SEE.includes(d.cards) ? 300 : 0) + (BARE.includes(d.cards) && (PATTERN.includes(d.bg) || (d.grad && d.grad !== "none")) ? 300 : 0);
}
// 같은 입력이면 같은 결과 (mulberry32)
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** level(1~10)에 맞는 꾸밈 — 과감함 합이 목표에 가깝고, 이미 정한 시안들과 4개 이상 다르게 */
function pick(level, taken, seed) {
  if (level <= 1) return Object.assign({}, BASE);
  const target = Math.round(((level - 1) / 9) * MAX), r = rng(seed || level * 7919);
  let best = null, bestCost = Infinity;
  for (let i = 0; i < 6000; i++) {
    const d = {};
    for (const k of KEYS) { const vs = Object.keys(CATS[k].values).filter((v) => k !== "radius" || !LOCKED.has(v)); d[k] = vs[Math.floor(r() * vs.length)]; }
    if (lockedRadius(d)) d.radius = lockedRadius(d);
    const near = taken.length ? Math.min(...taken.map((t) => diff(t, d))) : 8;
    // 같은 값이 여러 시안에 몰리지 않게(사용자: "배경도 더 다이나믹하게 다양하게") — 이미 쓴 값일수록 비싸다, 배경은 더
    const reuse = KEYS.reduce((n, k) => n + taken.filter((t) => t[k] === d[k] && d[k] !== BASE[k]).length * (k === "bg" ? 12 : 4), 0);
    const cost = Math.abs(score(d) - target) * 10 + Math.max(0, 4 - near) * 100 + reuse + clash(d);
    if (cost < bestCost) { best = d; bestCost = cost; if (cost === 0) break; }
  }
  return best;
}
module.exports = { CATS, NOTE, KEYS, BASE, MAX, SEE, score, diff, words, attrs, check, clash, fit, full, pick };

if (require.main === module) {
  const fs = require("fs"), path = require("path");
  const runDir = process.argv[2];
  if (!runDir) { console.error("usage: node scripts/dress.js runs/<project>"); process.exit(2); }
  const p = path.join(runDir, "screens.json"), S = JSON.parse(fs.readFileSync(p, "utf8"));
  const C = Array.isArray(S.concepts) ? S.concepts : [];
  const taken = C.filter((c) => c.dress).map((c) => c.dress);
  let n = 0;
  C.slice().sort((a, b) => (a.level || 0) - (b.level || 0)).forEach((c, i) => {
    if (c.dress) return;
    c.dress = pick(c.level || i + 1, taken, (c.level || i + 1) * 7919 + c.id.charCodeAt(0)); taken.push(c.dress); n++;
  });
  fs.writeFileSync(p, JSON.stringify(S, null, 2) + "\n");
  for (const c of C) console.log(`시안 ${c.id} · ${c.level || "?"}단계 · 과감함 ${score(c.dress)}/${MAX} · ${words(c.dress).join(" · ") || "기본 그대로"}`);
  console.log(`[dress] ${n}개 채움`);
}
