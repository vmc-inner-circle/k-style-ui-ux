// 스키마 — 예시 프로젝트(test/fixtures/project/*)가 메인 스키마 하나로 형식 · 관계(이야기 · 상태 → 역할 · 화면 → 이야기 · 기준어 → 역할 · 사실 · 블록 → 사실 · 흐름 → 화면)를 지킨다.
// 걸음(--step)마다 그 걸음까지 채우는 칸만 본다 — 아직 안 채운 칸으로 FAIL을 내지 않고, 일부러 틀린 관계는 잡는다.
const fs = require("fs");
const path = require("path");
const { ROOT, run, suite } = require("../lib.js");
const { SCHEMA, STEPS, checkData, checkRun } = require(path.join(ROOT, "scripts", "schema.js"));

const t = suite("20 메인 스키마");
const DIR = path.join(ROOT, "test", "fixtures", "project");
for (const p of fs.readdirSync(DIR)) for (const step of Object.keys(STEPS)) {
  const errs = checkRun(path.join(DIR, p), step);
  errs.forEach((e) => t.fail(`${p} (${step}): ${e}`));
  if (!errs.length) t.ok(`${p} (${step}): 형식 · 관계 통과`);
}

// 일부러 틀린 예 — 가족여행을 고쳐서 그 오류가 잡히는지
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const BASE = read(path.join(DIR, "family-trip", "screens.json"));
const caught = (what, step, change, expect) => {
  const P = JSON.parse(JSON.stringify(BASE));
  change(P);
  const errs = checkData(P, null, step);
  if (errs.some((e) => e.includes(expect))) t.ok(`${what} (${step}) → 잡힘`);
  else t.fail(`${what} (${step}): '${expect}' 오류가 나와야 함 (지금 ${errs.length ? errs.join(" / ") : "통과"})`);
};
caught("화면 story가 없는 이야기", "list", (P) => { P.screens[0].story = "no-such-story"; }, "stories에 없음");
caught("상태 show가 없는 역할", "intent", (P) => { P.states[0].show.push("no-such-role"); }, "roles에 없음");
caught("못 보는 역할이 있는데 hidden 없음", "intent", (P) => { delete P.states.find((s) => s.show.length === 1).hidden; }, "hidden");
caught("유저스토리에 role 없음", "intent", (P) => { delete P.stories.find((s) => s.kind === "story").role; }, "role");
caught("프리셋에 없어진 칸 style(판 모양은 시안 꾸밈이 맡음)", "full", (P) => { P.preset.style = "flat"; }, "preset.style: 스키마에 없는 항목");
caught("의도 걸음은 화면 목록 · 프리셋 없이 통과하지만 full은 막는다", "full", (P) => { delete P.screens; delete P.preset; }, "screens: 필수 항목 없음");

// 걸음 나누기 — 아직 안 채운 칸은 그 걸음에서 FAIL이 아니다
const L = Object.entries(SCHEMA.$defs.screen.properties).filter(([, p]) => p["x-stage"] === "L").map(([k]) => k);
const stepOk = (what, step, change) => {
  const P = JSON.parse(JSON.stringify(BASE));
  change(P);
  const errs = checkData(P, null, step);
  errs.forEach((e) => t.fail(`${what} (${step}): ${e}`));
  if (!errs.length) t.ok(`${what} (${step}) → 통과`);
};
stepOk("의도만 채움", "intent", (P) => { delete P.screens; delete P.preset; });
stepOk("화면은 뼈대(L 칸)만 채움", "list", (P) => {
  delete P.preset;
  P.screens = P.screens.map((s) => Object.fromEntries(Object.entries(s).filter(([k]) => L.includes(k))));
});

// 명령줄 — --step 읽기
const fam = path.join(DIR, "family-trip");
const r1 = run("schema.js", fam, "--step", "intent"), r2 = run("schema.js", "--step", "list", fam), r3 = run("schema.js", fam, "--step", "nope");
if (r1.code === 0 && r2.code === 0) t.ok("명령줄 --step (앞 · 뒤 어디에 와도) 통과");
else t.fail(`명령줄 --step: ${r1.out}${r2.out}`);
if (r3.code === 2) t.ok("없는 걸음 → 쓰는 법 오류(2)");
else t.fail(`없는 걸음: exit ${r3.code}`);
t.end();
