// 새 형식(preset 있고 looks 없음) 실행물에서도 lint가 끝까지 돈다 — 예전엔 S.looks.length에서 TypeError로 통째로 멈췄다.
// 화면 조각이 아직 없는 예시라 FAIL은 나오지만, 마지막 요약 줄까지 찍히고 오류로 멈추지 않아야 한다.
const fs = require("fs");
const path = require("path");
const { run, workCopy, suite } = require("../lib.js");

const t = suite("41 lint · 새 형식");
const w = workCopy("project");
try {
  const dir = path.join(w.run, "family-trip");
  const file = path.join(dir, "screens.json");
  const S = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!S.preset || S.looks) t.fail("예시가 새 형식이 아님 (preset 있고 looks 없어야 함)");
  S.toggles = { type: "normal" };
  fs.writeFileSync(file, JSON.stringify(S, null, 2));
  fs.writeFileSync(path.join(dir, "flow.json"), JSON.stringify({ flows: [] }));

  const r = run("lint.js", dir);
  if (/TypeError|at .*lint\.js/.test(r.out)) t.fail(`lint가 오류로 멈춤\n${r.out.split("\n").slice(0, 6).join("\n")}`);
  else if (/\[lint\] .*FAIL \d+ · WARN \d+/.test(r.out)) t.ok("새 형식에서 lint가 끝까지 돎 (요약 줄까지 나옴)");
  else t.fail(`lint 요약 줄이 없음 — exit ${r.code}\n${r.out.split("\n").slice(-4).join("\n")}`);
} finally {
  w.done();
}
t.end();
