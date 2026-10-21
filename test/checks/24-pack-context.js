// 작업 묶음 — 화면을 쓰는 에이전트에게 사실 · 숨길 상태 · 그 역할의 사람 · policy가 간다(B1 · B9).
// 가족여행 예시로 부모님 화면 묶음을 만들어, 메인이 프롬프트에 손으로 쓰던 것이 묶음 안에 있는지 본다.
const fs = require("fs");
const path = require("path");
const { run, workCopy, suite } = require("../lib.js");

const t = suite("24 작업 묶음 — 사실 · 숨김 · 사람 · 규칙");
const w = workCopy(path.join("project", "family-trip"));
try {
  const file = path.join(w.run, "screens.json");
  const S = JSON.parse(fs.readFileSync(file, "utf8"));
  S.roles.find((r) => r.key === "parent").user = { name: "김정수", initials: "김정" };
  const parent = S.screens.find((s) => s.role === "parent");
  parent.policy = [{ title: "기본 정의", items: ["확정된 것만 보인다"] }];
  fs.writeFileSync(file, JSON.stringify(S, null, 2));
  fs.writeFileSync(path.join(w.run, "flow.json"), JSON.stringify({ flows: [], branches: [] }));

  const r = run("pack.js", w.run, "--screens", parent.slug);
  const pack = path.join(w.run, "packs", parent.slug + ".md");
  if (r.code !== 0 || !fs.existsSync(pack)) t.fail(`pack 실패: ${r.out.slice(0, 200)}`);
  else {
    const lines = fs.readFileSync(pack, "utf8").split("\n");
    const has = (re, msg) => (lines.some((l) => re.test(l)) ? t.ok(msg) : t.fail(`묶음에 없음: ${msg}`));
    has(/후보.*정하는 중이에요/, "숨길 상태 '후보' → '정하는 중이에요' 한 줄");
    has(/`meet-airport`: 18일\(금\) 오전 6:30/, "답이 가리키는 사실의 실제 값");
    has(/이 화면의 사람: \*\*김정수\*\*/, "역할의 사람");
    has(/이 화면의 규칙 — 기본 정의/, "화면의 policy");
    const planner = S.screens.find((s) => s.role === "planner");
    run("pack.js", w.run, "--screens", planner.slug);
    const other = fs.readFileSync(path.join(w.run, "packs", planner.slug + ".md"), "utf8");
    /숨길 상태/.test(other) ? t.fail("후보를 볼 수 있는 역할 묶음에 숨길 상태가 실림") : t.ok("후보를 보는 역할 묶음에는 숨길 상태 줄이 없다");
  }
} finally { w.done(); }
t.end();
