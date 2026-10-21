#!/usr/bin/env node
/**
 * feedback.js — 사용자 의견 한 줄을 의견 해석 사전(packages/core/feedback/glossary.json)에서 찾는다.
 *
 *   node scripts/feedback.js "다가오는 일정이 너무 길어요"
 *
 * 의견을 띄어쓰기 · 조사 · 말끝으로 떼어 낱말(어간)로 만들고, 사전 줄의 heard(듣는 말)와 겹치는 정도로 점수를 매긴다.
 * cause · measure · fix 와 겹치는 건 작게만 더한다(동점을 가르는 정도). 점수가 같으면 위의 줄이 먼저(문서 0절 ③).
 * 상위 3줄을 JSON으로 낸다 — id · group · 왜 맞았나 · fix · rule. 디자인 용어는 krds-glossary.json의 heard에서 찾아 KRDS 이름을 붙인다.
 * 겹치는 게 없으면 빈 결과(lines: []). 사전을 읽기만 하고 아무것도 쓰지 않는다.
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "packages", "core", "feedback");
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8"));

const STOP = new Set(["더", "좀", "잘", "것", "수", "이", "그", "안", "못", "할", "하", "한", "너무", "훨씬", "정말", "진짜", "많이", "조금", "약간", "아주"]);   // 세기만 더하는 말 — 뜻이 없는데 겹쳐서 엉뚱한 줄이 잡혔다('너무 길어요' → F10 '너무 넓어')
const ENDINGS = ["해요", "어요", "아요", "해", "어", "아", "요", "게", "지", "다"]; // 말끝 — 한 글자까지 남겨도 된다
const JOSA = ["에서", "으로", "에게", "이랑", "까지", "부터", "처럼", "보다", "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "도", "로", "만", "랑"]; // 조사 — 두 글자 이상 남을 때만 뗀다

const stem = (w) => {
  const e = ENDINGS.find((s) => w.length > s.length && w.endsWith(s));
  if (e) w = w.slice(0, -e.length);
  const j = JOSA.find((s) => w.length > s.length + 1 && w.endsWith(s));
  return j ? w.slice(0, -j.length) : w;
};
const words = (text) => [...new Set(text.replace(/○+/g, " ").split(/[^0-9A-Za-z가-힣]+/).filter(Boolean).map(stem).filter((w) => !STOP.has(w)))];
const weight = (w) => (w.length === 1 ? 0.5 : 1); // 한 글자 낱말은 우연히 겹치기 쉬워 반만
const WEAK = 0.1; // cause · measure · fix 와 겹친 낱말 하나의 점수

const find = (input, glossary) => {
  const mine = words(input);
  const scored = glossary.entries.map((e, order) => {
    const why = [];
    let score = 0;
    for (const h of e.heard) {
      const hit = words(h).filter((w) => mine.includes(w));
      if (!hit.length) continue;
      score += hit.reduce((s, w) => s + weight(w), 0);
      why.push(`"${h}"와 겹침(${hit.join(" · ")})`);
    }
    if (score > 0) {
      const body = [...e.cause, ...e.measure, e.fix].join(" ");
      score += mine.filter((w) => body.includes(w)).length * WEAK;
    }
    return { e, score, order, why };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 3)
    .map(({ e, score, why }) => ({ id: e.id, group: e.group, score: Math.round(score * 100) / 100, why, fix: e.fix, rule: e.rule }));
};

// 디자인 용어(간격 · 타이포 · 라운드 …) — 의견에 heard가 통째로 들어 있으면 KRDS 이름을 붙인다.
const findKrds = (input, krds) => {
  const flat = input.replace(/\s+/g, "");
  const out = [];
  const add = (kind, name, heard, feedback) => {
    const hit = (heard || []).filter((h) => h.replace(/\s+/g, "").length >= 2 && flat.includes(h.replace(/\s+/g, "")));
    if (hit.length) out.push({ kind, name, heard: hit, feedback: feedback || [] });
  };
  for (const k of ["components", "basic_patterns", "service_patterns"]) for (const c of krds[k]) add(k, c.krds.ko, c.heard, c.feedback);
  for (const s of krds.styles) for (const t of s.terms || []) add("styles", `${s.krds.ko} · ${t.ours}`, t.heard, t.feedback);
  for (const o of krds.ours_only) add("ours_only", `${o.ours} (가장 가까운 KRDS: ${o.nearest})`, o.heard, o.feedback);
  for (const m of krds.modifiers) add("modifiers", `${m.axis} (${m.krds.join(" · ")})`, m.heard, []);
  return out;
};

if (require.main === module) {
  const input = process.argv.slice(2).join(" ").trim();
  if (!input) { console.error('사용법: node scripts/feedback.js "<의견 한 줄>"'); process.exit(2); }
  const result = { input, lines: find(input, readJson("glossary.json")), krds: findKrds(input, readJson("krds-glossary.json")) };
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { find, findKrds };
