// 시안 4개 · 다름 검사 — 시안은 과감함 단계(스키마 concept.level 목록 = 1 · 4 · 7 · 10)마다 하나, 서로 다른지는 lint가 FAIL로 본다(2026-10-21).
// 예시(test/fixtures/sample)에 시안 4개를 얹어 시안 단계(board.stage concept)로 lint를 돌린다: 고른 4개는 FAIL 0, 일부러 비슷하게 만든 4개는 그 FAIL이 난다.
// 꾸밈은 scripts/dress.js가 단계로 채운다 — 네 단계의 과감함이 벌어지고 두 시안씩 4칸 이상 다른지도 본다.
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite } = require("../lib.js");
const DR = require(path.join(ROOT, "scripts", "dress.js"));
const { checkData } = require(path.join(ROOT, "scripts", "schema.js"));

const t = suite("39 시안 4개 · 다름 검사");

// ---------- 꾸밈: 단계가 4개여도 과감함이 벌어진다 ----------
{
  const taken = [];
  const ds = DR.LEVELS.map((lv, i) => { const d = DR.pick(lv, taken, lv * 7919 + 97 + i); taken.push(d); return d; });
  const sc = ds.map(DR.score);
  sc.every((s, i) => !i || s > sc[i - 1]) ? t.ok(`단계 ${DR.LEVELS.join(" · ")} → 과감함 ${sc.join(" · ")} / ${DR.MAX} (올라감)`) : t.fail(`과감함이 단계 따라 오르지 않음: ${sc.join(" · ")}`);
  const near = [];
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) if (DR.diff(ds[i], ds[j]) < 4) near.push(`${DR.LEVELS[i]}·${DR.LEVELS[j]} ${DR.diff(ds[i], ds[j])}칸`);
  near.length ? t.fail(`꾸밈이 4칸보다 덜 다른 단계: ${near.join(" / ")}`) : t.ok("네 단계의 꾸밈이 두 시안씩 모두 4칸 이상 다름");
  const loud = ds.filter((d) => DR.clash(d));
  loud.length ? t.fail(`함께 두면 안 되는 조합이 나옴: ${loud.map((d) => DR.words(d).join("·")).join(" / ")}`) : t.ok("부딪히는 조합 0");
}

// ---------- 스키마: 단계 목록 밖 · 개수 초과 ----------
{
  const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  const { $comment, ...RUN } = read("test/fixtures/board/family-trip.json");
  const base = { ...read("test/fixtures/project/family-trip/screens.json"), ...RUN };
  const caught = (what, change, expect) => {
    const P = JSON.parse(JSON.stringify(base)); change(P);
    const errs = checkData(P, null, "full");
    errs.some((e) => e.includes(expect)) ? t.ok(`스키마: ${what} → 잡힘`) : t.fail(`스키마: ${what} — '${expect}'가 나와야 함 (지금 ${errs.join(" / ") || "통과"})`);
  };
  caught("level 5(목록 밖)", (P) => { P.concepts[1].level = 5; }, "중 하나여야 함");
  caught(`시안 ${DR.LEVELS.length + 1}개`, (P) => { P.concepts.push(Object.assign({}, P.concepts[0], { id: "e" })); }, `항목 ${DR.LEVELS.length}개 이하`);
}

// ---------- lint: 고른 4개는 통과, 비슷한 4개는 FAIL ----------
const w = workCopy();
try {
  run("ids.js", w.run); run("expand.js", w.run);
  const file = path.join(w.run, "screens.json"), S0 = JSON.parse(fs.readFileSync(file, "utf8"));
  const slugs = S0.screens.map((s) => s.slug);
  // web 메뉴 구조 셋 · 레이아웃 계열 bold 1 → 2 → 3 → 3 · 4단계부터 섞은 패턴
  const GOOD = [
    { id: "a", level: 1, name: "오늘 할 일부터 보기", why: "처음 쓰는 사람이 무엇부터 할지 바로 알아요", layout: "today-todo", shell: "sidebar", screens: slugs },
    { id: "b", level: 4, name: "카드 모음으로 보기", why: "한눈에 여러 가지를 비교해요", layout: "card-grid", mix: "timeline", shell: "top", screens: slugs },
    { id: "c", level: 7, name: "크기가 다른 칸으로 보기", why: "중요한 것이 크게 보여요", layout: "bento", mix: "feed", shell: "rail", screens: slugs },
    { id: "d", level: 10, name: "큰 글자 한 장으로 말하기", why: "지금 할 일 하나만 크게 말해요", layout: "poster", mix: "carousel-cards", shell: "top", screens: slugs },
  ];
  for (const c of GOOD) for (const s of slugs) {
    fs.mkdirSync(path.join(w.run, "concepts", c.id), { recursive: true });
    fs.copyFileSync(path.join(w.run, "screens", s + ".html"), path.join(w.run, "concepts", c.id, s + ".html"));
  }
  const write = (C) => fs.writeFileSync(file, JSON.stringify(Object.assign({}, S0, { concepts: C, board: Object.assign({}, S0.board, { stage: "concept", concept: "a" }) }), null, 2));
  write(GOOD);
  const dr = run("dress.js", w.run);
  dr.code === 0 ? t.ok(`dress.js가 시안 4개의 꾸밈을 채움`) : t.fail(`dress.js — exit ${dr.code}\n${dr.out}`);
  const filled = JSON.parse(fs.readFileSync(file, "utf8")).concepts;
  const fails = () => run("lint.js", w.run).out.split("\n").filter((l) => l.startsWith("[FAIL]"));

  {
    const f = fails();
    f.length ? t.fail(`고른 4개인데 lint FAIL ${f.length}\n${f.join("\n")}`) : t.ok("고른 4개(레이아웃 · 계열 · 꾸밈 · 메뉴 구조가 다름) → lint FAIL 0");
  }
  const caught = (what, change, expect) => {
    const C = JSON.parse(JSON.stringify(filled)); change(C); write(C);
    const f = fails();
    f.some((l) => l.includes(expect)) ? t.ok(`${what} → FAIL`) : t.fail(`${what}: '${expect}' FAIL이 나와야 함 (지금 ${f.join(" / ") || "FAIL 0"})`);
  };
  caught("두 시안이 같은 레이아웃", (C) => { C[2].layout = C[1].layout; }, "같은 레이아웃");
  caught("레이아웃이 모두 bold 1 계열", (C) => { ["today-todo", "timeline", "table", "list-detail"].forEach((id, i) => { C[i].layout = id; delete C[i].mix; }); }, "계열");
  caught("꾸밈이 3칸 이하로 다른 두 시안", (C) => { C[3].dress = Object.assign({}, C[2].dress, { head: "normal", space: "normal", font: "base" }); }, "개만 다름");
  caught("메뉴 구조가 모두 같음", (C) => { C.forEach((c) => { c.shell = "top"; }); }, "같은 메뉴 구조");
  caught("단계가 1 · 2 · 3 · 4", (C) => { C.forEach((c, i) => { c.level = i + 1; }); }, "level은");
  caught("시안 3개", (C) => { C.pop(); }, `시안은 ${DR.LEVELS.length}개`);
} finally {
  w.done();
}
t.end();
