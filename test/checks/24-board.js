// 보드 · 시안 · 의견 — 하네스 실행 상태(board)와 시안(concepts)도 메인 스키마 안에 있다. 형식 · 관계(시안 id · 화면 slug · 사전 줄 id)만 본다.
// 예시: test/fixtures/board/family-trip.json(실제 실행의 실행 상태)을 test/fixtures/project/family-trip 위에 얹는다.
// 의견 두 줄을 scripts/feedback.js에 넣고, 나온 사전 줄 id로 board.feedback 기록을 만들어 스키마를 통과하는지 본다.
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite } = require("../lib.js");
const { SCHEMA, STEPS, checkData } = require(path.join(ROOT, "scripts", "schema.js"));
const { loadScreens } = require(path.join(ROOT, "scripts", "screens.js"));

const t = suite("24 보드 · 의견");
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const { $comment, ...RUN } = read("test/fixtures/board/family-trip.json");
const BASE = { ...read("test/fixtures/project/family-trip/screens.json"), ...RUN };
const copy = () => JSON.parse(JSON.stringify(BASE));

// 실행 상태를 얹은 예시가 걸음마다 통과
for (const step of Object.keys(STEPS)) {
  const errs = checkData(copy(), null, step);
  errs.forEach((e) => t.fail(`보드 예시 (${step}): ${e}`));
  if (!errs.length) t.ok(`보드 예시 (${step}): 형식 · 관계 통과`);
}

// 스키마 밖 칸 0 — 최상위 칸이 모두 스키마에 있다
const outside = Object.keys(BASE).filter((k) => !(k in SCHEMA.$defs.project.properties));
outside.length ? t.fail(`스키마 밖 최상위 칸: ${outside.join(" ")}`) : t.ok(`최상위 칸 ${Object.keys(BASE).length}개 모두 스키마 안`);

// 일부러 틀린 예
const caught = (what, change, expect) => {
  const P = copy();
  change(P);
  const errs = checkData(P, null, "full");
  if (errs.some((e) => e.includes(expect))) t.ok(`${what} → 잡힘`);
  else t.fail(`${what}: '${expect}' 오류가 나와야 함 (지금 ${errs.length ? errs.join(" / ") : "통과"})`);
};
caught("최상위에 실행 상태(stage)", (P) => { P.stage = "concept"; }, "board.stage로");
caught("스키마에 없는 최상위 칸", (P) => { P.whatever = 1; }, "스키마에 없는 항목");
caught("board.concept가 없는 시안", (P) => { P.board.concept = "z"; }, "concepts에 없음");
caught("board.focus가 없는 화면", (P) => { P.board.focus.push("no-such"); }, "화면 없음");
caught("board.changes가 없는 화면", (P) => { P.board.changes[0].slug = "no-such"; }, "화면 없음");
caught("board.locked에 모르는 값", (P) => { P.board.locked.push("everything"); }, "중 하나여야 함");
caught("시안 layout이 목록에 없음", (P) => { P.concepts[0].layout = "no-such"; }, "layouts.json에 없음");
caught("시안 화면이 없는 화면", (P) => { P.concepts[0].screens.push("no-such"); }, "화면 없음");
caught("시안 id 겹침", (P) => { P.concepts[1].id = P.concepts[0].id; }, "concepts.id");
caught("의견 entry가 사전에 없는 줄", (P) => { P.board.feedback[0].entry = "F99"; }, "glossary.json");
caught("의견 entry 모양", (P) => { P.board.feedback[0].entry = "크게"; }, "허용 형식");
caught("의견 region이 그 화면 블록이 아님", (P) => { P.board.feedback[0].region = "unsent"; }, "블록 key");
caught("요소 범위인데 path 없음", (P) => { P.board.feedback[0].scope = "element"; }, "path: 필수");
caught("영역 범위인데 screen 없음", (P) => { delete P.board.feedback[0].screen; }, "screen: 필수");
caught("고치는 의견인데 고친 것 없음", (P) => { delete P.board.feedback[1].fix; }, "fix: 필수");

// 좋다는 의견(keep)은 잰 것 · 고친 것 없이 통과
{
  const P = copy();
  P.board.feedback.push({ said: "간격이 깔끔하고 좋아요", scope: "all", entry: null, keep: true });
  const errs = checkData(P, null, "full");
  errs.length ? t.fail(`좋다는 의견: ${errs.join(" / ")}`) : t.ok("좋다는 의견(keep) → 고친 것 없이 통과");
}

// 의견 두 줄 → feedback.js → 사전 줄 id → board.feedback 기록
{
  const P = copy();
  P.board.feedback.forEach((fb) => {
    const r = run("feedback.js", fb.said);
    const top = r.code === 0 ? JSON.parse(r.out).lines[0] : null;
    fb.entry = top ? top.id : null;
    t.ok(`'${fb.said}' → ${fb.entry || "사전 줄 없음(null)"}`);
  });
  const [big] = P.board.feedback;
  ["F02", "F03"].includes(big.entry) ? t.ok("'훨씬 크게' 의견에 위계 줄(F02 · F03)") : t.fail(`'훨씬 크게' 의견 줄이 F02 · F03이 아니다: ${big.entry}`);
  const errs = checkData(P, null, "full");
  errs.length ? t.fail(`찾은 줄로 쓴 기록: ${errs.join(" / ")}`) : t.ok("찾은 줄 id로 쓴 기록이 스키마 통과");
}

// 읽는 곳 하나(screens.js)가 board의 실행 상태를 최상위로 꺼낸다 — build · lint가 그대로 돈다
const w = workCopy();
try {
  const file = path.join(w.run, "screens.json"), S = JSON.parse(fs.readFileSync(file, "utf8"));
  const before = { round: S.round, theme: S.theme, toggles: S.toggles };
  for (const k of Object.keys(before)) { S.board[k] = S[k]; delete S[k]; }
  fs.writeFileSync(file, JSON.stringify(S, null, 2));
  const L = loadScreens(w.run);
  const same = Object.keys(before).every((k) => JSON.stringify(L[k]) === JSON.stringify(before[k]));
  same ? t.ok("board.round · theme · toggles → 최상위로 읽힘") : t.fail(`board에서 꺼낸 값이 다르다: ${JSON.stringify(Object.keys(before).map((k) => L[k]))}`);
  run("ids.js", w.run); run("expand.js", w.run);
  const lint = run("lint.js", w.run);
  lint.code === 0 ? t.ok("실행 상태를 board로 옮긴 실행물 → lint 통과") : t.fail(`실행 상태를 board로 옮긴 실행물 lint 실패\n${lint.out.split("\n").filter((l) => /FAIL/.test(l)).join("\n")}`);
} finally { w.done(); }
t.end();
