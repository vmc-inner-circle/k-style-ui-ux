#!/usr/bin/env node
/**
 * schema.js — 메인 스키마(packages/core/schema/schema.json) 하나로 데이터 파일 셋을 검사한다: 형식 + 관계(x-ref).
 *
 *   node scripts/schema.js runs/<project> [--step intent|list|full]   screens.json(project) · flow.json(flowFile, 있으면)
 *   node scripts/schema.js --file <json> --def <이름>                  파일 하나를 $defs 하나로
 *
 * 걸음(--step, 기본 full): 그 걸음까지 채우는 칸만 본다 — 스키마의 x-steps(걸음 → x-stage 묶음)과 칸마다의 x-stage로 계산.
 *   아직 안 채운 칸은 필수 · 형식 · 관계 모두 보지 않는다(intent = 의도만 · list = + 화면 목록 · full = 전부).
 * 관계: facts 이름표 모양 · stories.id · states.key · roles.key는 목록 안에서 하나 · story.role → roles(유저스토리는 필수)
 *       · states.show → roles(못 보는 역할이 있으면 hidden 필수) · screen.role → roles · screen.story → stories · roles.nav → screens
 *       · keyword.from → roles · facts · why.keyword → keywords 번호
 *       · 블록 facts → facts · 블록 key는 화면 안에서 하나 · flow.role → roles · step.from/to → screens · step.region → from 화면의 블록 key 또는 action
 *       · concepts.id는 하나 · concept.layout/mix → layouts.json · concept.screens → screens
 *       · board.concept → concepts · board.hero/focus/changes.slug → screens
 *       · board.feedback.screen → screens · .region → 그 화면의 블록 key 또는 action · .entry → 의견 사전(packages/core/feedback/glossary.json) 줄 id
 * 보드(x-writer: harness)도 형식 · 관계만 본다. 최상위에 보드 칸(stage · theme …)을 쓰면 board 아래로 옮기라고 알린다.
 * exit 0 = 통과, 1 = 실패, 2 = 쓰는 법 오류.
 */
const fs = require("fs");
const path = require("path");
const { check } = require("./schema-check.js");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/core/schema/schema.json"), "utf8"));
const readRoot = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const LAYOUTS = new Set(readRoot("packages/core/layouts/layouts.json").layouts.map((l) => l.id));
const GLOSSARY = new Set(readRoot("packages/core/feedback/glossary.json").entries.map((e) => e.id));
const STEPS = SCHEMA["x-steps"];
const deref = (node) => (node.$ref ? node.$ref.split("/").slice(1).reduce((o, k) => o[k], SCHEMA) : node);

/** 걸음에 맞춘 스키마 — 걸음 밖 칸은 아무 값이나 받고 필수에서 뺀다 */
const forStep = (step) => {
  const stages = STEPS[step], copy = JSON.parse(JSON.stringify(SCHEMA));
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    for (const [k, p] of Object.entries(n.properties || {})) if (p["x-stage"] && !stages.includes(p["x-stage"])) {
      n.properties[k] = {};
      if (n.required) n.required = n.required.filter((r) => r !== k);
    }
    Object.values(n).forEach(walk);
  })(copy);
  return copy;
};
const ROOTS = Object.fromEntries(Object.keys(STEPS).map((s) => [s, forStep(s)]));

const shape = (value, name, at, step = "full") => { const errs = []; check(ROOTS[step].$defs[name], value, at, ROOTS[step], errs); return errs; };

/** 데이터에서 걸음 밖 칸을 뺀다 — 관계 검사가 아직 안 채운 칸을 보지 않게 */
function pick(node, v, stages) {
  const s = deref(node);
  if (Array.isArray(v)) return s.items ? v.map((x) => pick(s.items, x, stages)) : v;
  if (!v || typeof v !== "object" || !s.properties) return v;
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    const p = s.properties[k];
    if (!p) out[k] = x;
    else if (!p["x-stage"] || stages.includes(p["x-stage"])) out[k] = pick(p, x, stages);
  }
  return out;
}

/** 관계 검사 — 형식이 맞은 뒤에 */
function relations(P, F) {
  const errs = [], err = (m) => errs.push(m);
  const once = (list, key, what) => {
    const seen = new Set();
    for (const x of list || []) { if (seen.has(x[key])) err(`${what} '${x[key]}' 겹침`); seen.add(x[key]); }
    return seen;
  };
  const roles = once(P.roles, "key", "roles.key"), stories = once(P.stories, "id", "stories.id"), facts = new Set(Object.keys(P.facts || {}));
  once(P.states, "key", "states.key");
  for (const k of facts) if (!/^[a-z][a-z0-9-]*$/.test(k)) err(`facts '${k}' — 이름표는 영문 소문자 · 숫자 · - (블록이 이 이름으로 가리킨다)`);
  for (const st of P.stories || []) {
    if (st.role && !roles.has(st.role)) err(`stories.${st.id}.role '${st.role}' — roles에 없음`);
    if (st.kind === "story" && !st.role) err(`stories.${st.id}: 유저스토리는 role(누구의 이야기인지)이 필요함`);
  }
  for (const st of P.states || []) {
    for (const r of st.show) if (!roles.has(r)) err(`states.${st.key}.show '${r}' — roles에 없음`);
    if (!st.hidden && [...roles].some((r) => !st.show.includes(r))) err(`states.${st.key}: 못 보는 역할이 있으면 hidden(대신 보일 문구)이 필요함`);
  }
  const pr = P.preset || {};
  (pr.keywords || []).forEach((k, i) => { if (!roles.has(k.from) && !facts.has(k.from)) err(`preset.keywords[${i}].from '${k.from}' — roles · facts에 없음`); });
  (pr.why || []).forEach((w, i) => { if (!(pr.keywords || [])[w.keyword]) err(`preset.why[${i}].keyword ${w.keyword} — 기준어 번호 없음`); });
  const screens = new Map();
  for (const s of P.screens || []) {
    const at = `screens.${s.slug}`;
    if (screens.has(s.slug)) err(`${at}: slug 겹침`);
    if (!roles.has(s.role)) err(`${at}.role '${s.role}' — roles에 없음`);
    if (s.story && !stories.has(s.story)) err(`${at}.story '${s.story}' — stories에 없음`);
    const blocks = [s.answer, ...(s.rest || [])].filter(Boolean);
    const keys = blocks.map((b) => b.key);
    if (new Set(keys).size !== keys.length) err(`${at}: 블록 key 겹침 (${keys.join(",")})`);
    blocks.forEach((b) => (b.facts || []).forEach((f) => { if (!facts.has(f)) err(`${at}.${b.key}.facts '${f}' — facts에 없음`); }));
    screens.set(s.slug, new Set([...keys, ...(s.action ? ["action"] : [])]));
  }
  for (const r of P.roles || []) for (const n of r.nav || []) if (!screens.has(n.slug)) err(`roles.${r.key}.nav '${n.slug}' — 화면 없음`);
  const concepts = once(P.concepts, "id", "concepts.id");
  for (const c of P.concepts || []) {
    for (const k of ["layout", "mix"]) if (c[k] && !LAYOUTS.has(c[k])) err(`concepts.${c.id}.${k} '${c[k]}' — layouts.json에 없음`);
    for (const sl of c.screens || []) if (!screens.has(sl)) err(`concepts.${c.id}.screens '${sl}' — 화면 없음`);
  }
  const B = P.board || {};
  if (B.concept && !concepts.has(B.concept)) err(`board.concept '${B.concept}' — concepts에 없음`);
  if (B.hero && !screens.has(B.hero)) err(`board.hero '${B.hero}' — 화면 없음`);
  for (const sl of B.focus || []) if (!screens.has(sl)) err(`board.focus '${sl}' — 화면 없음`);
  (B.changes || []).forEach((c, i) => { if (!screens.has(c.slug)) err(`board.changes[${i}].slug '${c.slug}' — 화면 없음`); });
  (B.feedback || []).forEach((fb, i) => {
    const at = `board.feedback[${i}]`;
    if (fb.entry && !GLOSSARY.has(fb.entry)) err(`${at}.entry '${fb.entry}' — 의견 사전(glossary.json)에 없는 줄`);
    if (fb.screen && !screens.has(fb.screen)) err(`${at}.screen '${fb.screen}' — 화면 없음`);
    else if (fb.screen && fb.region && !screens.get(fb.screen).has(fb.region)) err(`${at}.region '${fb.region}' — '${fb.screen}' 화면의 블록 key · action이 아님`);
  });
  for (const fl of (F && F.flows) || []) {
    if (!roles.has(fl.role)) err(`flow.${fl.key}.role '${fl.role}' — roles에 없음`);
    (fl.steps || []).forEach((st, i) => {
      const at = `flow.${fl.key}.steps[${i}]`;
      if (!screens.has(st.from)) err(`${at}.from '${st.from}' — 화면 없음`);
      else if (!screens.get(st.from).has(st.region)) err(`${at}.region '${st.region}' — '${st.from}' 화면의 블록 key · action이 아님`);
      if (st.to && !screens.has(st.to)) err(`${at}.to '${st.to}' — 화면 없음`);
    });
  }
  return errs;
}

/** 읽어 둔 데이터 셋을 한 걸음으로 — 형식이 맞아야 관계를 본다 */
function checkData(P, F, step = "full") {
  if (!STEPS[step]) return [`걸음 '${step}' 없음 — ${Object.keys(STEPS).join(" | ")}`];
  const errs = [...shape(P, "project", "screens.json", step), ...(F ? shape(F, "flowFile", "flow.json", step) : [])]
    .map((e) => e.replace(/^screens\.json\.(\w+): 스키마에 없는 항목$/, (m, k) => (k in SCHEMA.$defs.board.properties ? `${m} — 실행 상태는 board.${k}로` : m)));
  const stages = STEPS[step], at = (name, v) => pick(SCHEMA.$defs[name], v, stages);
  if (!errs.length) errs.push(...relations(at("project", P), F && at("flowFile", F)));
  return errs;
}

function checkRun(dir, step = "full") {
  const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
  const F = fs.existsSync(path.join(dir, "flow.json")) ? read(path.join(dir, "flow.json")) : null;
  return checkData(read(path.join(dir, "screens.json")), F, step);
}

module.exports = { SCHEMA, STEPS, shape, relations, checkData, checkRun };

if (require.main === module) {
  const a = process.argv.slice(2), stepAt = a.indexOf("--step"), step = stepAt >= 0 ? a[stepAt + 1] : "full";
  const dir = a.find((x, i) => !x.startsWith("--") && !(stepAt >= 0 && i === stepAt + 1));
  let errs;
  if (a[0] === "--file") errs = shape(JSON.parse(fs.readFileSync(a[1], "utf8")), a[a.indexOf("--def") + 1], path.basename(a[1]));
  else if (dir && STEPS[step]) errs = checkRun(path.resolve(dir), step);
  else { console.error(`usage: node scripts/schema.js runs/<project> [--step ${Object.keys(STEPS).join("|")}] | --file <json> --def <이름>`); process.exit(2); }
  errs.forEach((e) => console.log(`FAIL ${e}`));
  console.log(errs.length ? `실패 ${errs.length}` : `통과 — 형식 · 관계 (걸음 ${step}: ${STEPS[step].join(" · ")})`);
  process.exit(errs.length ? 1 : 0);
}
