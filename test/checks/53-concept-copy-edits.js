// G2b — 시안 보드에서 고른 시안 메인 화면을 직접 고친 줄도 2턴에 AI 없이 반영 (사람 결정 2026-10-21: 1턴 시안 보드 → 2턴 바로 완성본).
// 예시(test/fixtures/sample)에 시안 a · b를 얹어 시안 단계로 build(39-concepts.js와 같은 방법) → 보드의 시안 a 화면(a~home)에서 경로를 잰다
// → 시안 보드 글(시안 · 테마 · 꾸밈 줄 + 고친 줄 3 + 시안 b 메모 + 끝 표시) → SKILL 2턴대로 복사 · board.concept 옮기기 → scripts/edits.js
// ① 보드 경로 = 복사한 screens/home.html 경로 (1턴 expand.js가 시안 조각에도 셸을 붙여 둔다) ② 반영 3, 남긴 글 = 시안 · 테마 · 꾸밈 · 메모 · 끝 표시
// ③ 블록 데이터(rest · items · label)가 없는 화면이라 조각만 고침 · board.changes 3 ④ build --mode final 성공, 완성본에 고친 3가지
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite } = require("../lib.js");
const { parse, resolve } = require(path.join(ROOT, "scripts/edits.js"));

const t = suite("53 시안 복사 뒤 고친 줄 반영");
const kids = (n) => n.kids.filter((k) => k.tag !== "#text");
const all = (n) => kids(n).flatMap((k) => [k, ...all(k)]);
const textOf = (src, n) => (n.tag === "#text" ? src.slice(n.start, n.end) : n.kids.map((k) => textOf(src, k)).join("")).replace(/\s+/g, " ").trim();
// 보드 pathOf(packages/core/canvas/24-board-screens.js)와 같은 걸음: 가장 가까운 data-region(@key)까지 태그:순번, 없으면 화면 맨 위부터
function boardPath(n) {
  const segs = [];
  for (; n && n.tag !== "#root"; n = n.parent) {
    if (n.attrs["data-region"] != null) { segs.unshift("@" + n.attrs["data-region"]); break; }
    const same = kids(n.parent).filter((c) => c.tag === n.tag);
    segs.unshift(n.tag + (same.length > 1 ? ":" + (same.indexOf(n) + 1) : ""));
  }
  return segs.join(" > ");
}

// bare = 시안 단계라 화면에 데이터 칸(answer · rest · regions)이 아직 하나도 없는 경우. 옛 형식 예시라 bare가 아니면 regions만 있다
function once(bare) {
  const w = workCopy(), tag = bare ? "[데이터 칸 없음] " : "[regions만 있음] ";
  const ok = (m) => t.ok(tag + m), no = (m) => t.fail(tag + m);
  try {
    run("ids.js", w.run); run("expand.js", w.run);
    const file = path.join(w.run, "screens.json"), S0 = JSON.parse(fs.readFileSync(file, "utf8"));
    const home = S0.screens.find((s) => s.slug === "home");
    // 시안 a의 홈은 지금 screens/home.html과 다른 글(설명 줄)이라, 복사가 됐는지 완성본에서 보인다
    const raw = fs.readFileSync(path.join(ROOT, "test/fixtures/sample/screens/home.html"), "utf8");
    const C = [
      { id: "a", level: 1, name: "오늘 할 일부터 보기", why: "처음 쓰는 사람이 무엇부터 할지 바로 알아요", layout: "today-todo", shell: "sidebar", screens: ["home"], body: raw.replace("오늘 할 일과 최근 변경이에요", "시안 A의 홈 설명이에요") },
      { id: "b", level: 4, name: "카드 모음으로 보기", why: "한눈에 여러 가지를 비교해요", layout: "card-grid", mix: "timeline", shell: "top", screens: ["home"], body: raw },
    ];
    for (const { body, ...c } of C) { fs.mkdirSync(path.join(w.run, "concepts", c.id), { recursive: true }); fs.writeFileSync(path.join(w.run, "concepts", c.id, "home.html"), body); }
    fs.writeFileSync(file, JSON.stringify(Object.assign({}, S0, { concepts: C.map(({ body, ...c }) => c), board: Object.assign({}, S0.board, { stage: "concept", concept: "a" }) }), null, 2));
    for (const s of ["dress.js", "expand.js"]) { const r = run(s, w.run); if (r.code !== 0) no(`${s} 실패\n${r.out}`); }
    const b1 = run("build.js", w.run, "--mode", "board");
    if (b1.code !== 0) return no(`시안 보드 build 실패\n${b1.out}`);

    // ---------- ① 보드의 시안 a 홈에서 잰 경로가 복사한 조각에서도 같은 요소 ----------
    const board = fs.readFileSync(path.join(w.run, "out", "board.html"), "utf8");
    const sec = (/<section class="hx-screen" data-screen="a~home"[^>]*>\n([\s\S]*?)\n<\/section>/.exec(board) || [])[1];
    if (!sec) return no("시안 보드에 a~home 화면이 없음");
    const B = parse(sec), at = (el, txt) => all(B).find((n) => n.tag === el && textOf(sec, n).includes(txt));
    const P_TITLE = boardPath(at("h2", "최근 변경")), P_LI = boardPath(at("li", "새 구성원 초대"));
    P_TITLE === "@recent > h2" && P_LI === "@recent > ul > li:3" ? ok(`보드 경로: 제목 [${P_TITLE}] · 줄 [${P_LI}]`) : no(`보드 경로가 예상과 다름: ${P_TITLE} · ${P_LI}`);
    const keys = [...sec.matchAll(/data-region="([^"]+)"/g)].map((m) => m[1]);

    // ---------- SKILL 2턴: 고른 시안 메인 화면 복사 · board.concept = a · stage 지움 ----------
    const frag = path.join(w.run, "screens", "home.html");
    fs.copyFileSync(path.join(w.run, "concepts", "a", "home.html"), frag);
    const S1 = JSON.parse(fs.readFileSync(file, "utf8"));
    S1.board = Object.assign({}, S1.board, { concept: "a", dress: S1.concepts[0].dress, locked: ["concept", "dress"], round: 1 });
    delete S1.board.stage;
    if (bare) delete S1.screens.find((s) => s.slug === "home").regions;
    fs.writeFileSync(file, JSON.stringify(S1, null, 2) + "\n");
    const copied = fs.readFileSync(frag, "utf8"), F = parse(copied);
    copied.trim() === sec.trim() ? ok("복사한 screens/home.html = 보드가 그린 시안 a 홈 (build가 더 펼치지 않음)") : no("복사한 조각과 보드의 시안 화면 글이 다름");
    const same = [[P_TITLE, "최근 변경"], [P_LI, "새 구성원 초대"]].every(([p, txt]) => { const n = resolve(F, p); return n && textOf(copied, n).includes(txt); });
    same ? ok("보드 경로가 복사한 조각에서도 같은 요소를 가리킴") : no("보드 경로가 복사한 조각에서 다른 요소를 가리킴");

    // ---------- ② 시안 보드 글 → edits.js ----------
    const id = home.id, order = [...keys].reverse();
    const SENT = [
      "시안 a(오늘 할 일부터 보기)",
      "테마 custom(#23317A 남색 · 스타일 daangn) · 글자 크게 · 판 모양 · 모서리: 프리셋 따라감",
      "꾸밈 font=suit(수트)",
      `화면 ${id} · 구역 순서: ${order.join(", ")}`,
      `화면 ${id} · 제목 '최근 변경' 고쳐 쓰기: '최근 변경' → '바뀐 소식' [${P_TITLE}]`,
      `화면 ${id} · 목록 한 줄 '새 구성원 초대 · 5일 전' 빼기 [${P_LI}]`,
      "시안 b 메모: 요약은 카드 모음처럼 크게",
      "(나머지는 추천대로)",
    ];
    const sent = path.join(w.dir, "sent.txt");
    fs.writeFileSync(sent, SENT.join("\n") + "\n");
    const r = run("edits.js", w.run, sent), last = r.out.trim().split("\n").pop();
    r.code === 0 && /반영 3 · 남김 4/.test(last) ? ok(`edits.js: ${last}`) : no(`edits.js 종료 ${r.code} — '반영 3 · 남김 4'여야 함\n${r.out}`);
    const leftTxt = fs.readFileSync(path.join(w.run, "_check", "edits-left.txt"), "utf8").trim();
    leftTxt === [...SENT.slice(0, 3), SENT[6], SENT[7]].join("\n") ? ok("edits-left.txt = 시안 · 테마 · 꾸밈 줄 + 시안 b 메모 + 끝 표시 (AI 몫)") : no(`edits-left.txt가 다름\n${leftTxt}`);

    // ---------- ③ 조각 · 데이터 ----------
    const now = fs.readFileSync(frag, "utf8"), P = JSON.parse(fs.readFileSync(file, "utf8")), h = P.screens.find((s) => s.slug === "home");
    const fOrder = [...now.matchAll(/data-region="([^"]+)"/g)].map((m) => m[1]).join();
    fOrder === order.join() && now.includes(">바뀐 소식</h2>") && !now.includes("새 구성원 초대") ? ok(`조각: 구역 ${order.join(" → ")} · 제목 '바뀐 소식' · 줄 하나 빠짐`) : no(`조각이 기대와 다름 (구역 ${fOrder})\n${now}`);
    const data = !h.answer && !h.rest && (bare ? !("regions" in h) : h.regions.map((x) => x.key).join() === order.join());
    data ? ok(bare ? "데이터 칸 없는 화면 — 조각만 고치고 칸을 새로 만들지 않음" : "블록 데이터(answer · rest) 없는 화면 — 조각만 고치고 regions는 새 순서") : no(`데이터: ${JSON.stringify({ answer: h.answer, rest: h.rest, regions: h.regions })}`);
    const ch = P.board.changes || [];
    ch.length === 3 && ch.every((c) => c.slug === "home" && c.said && c.did) && P.board.concept === "a" && !P.board.stage ? ok("board.changes 3개 · board.concept a · stage 없음 그대로") : no(`board ${JSON.stringify(P.board)}`);

    // ---------- ④ 완성본 ----------
    const f = run("build.js", w.run, "--mode", "final");
    f.code === 0 ? ok("build --mode final 성공") : no(`build --mode final 실패\n${f.out}`);
    const outDir = path.join(w.run, "out", "screens"), page = fs.existsSync(outDir) ? fs.readdirSync(outDir).find((x) => x.endsWith("-home.html")) : null;
    const html = page ? fs.readFileSync(path.join(outDir, page), "utf8") : "";
    const pos = order.map((k) => html.indexOf(`data-region="${k}"`));
    html.includes("시안 A의 홈 설명이에요") && html.includes("바뀐 소식") && !html.includes("새 구성원 초대") && pos.every((p, i) => p > 0 && (!i || p > pos[i - 1]))
      ? ok(`완성본 out/screens/${page}: 시안 a 홈 · 구역 새 순서 · '바뀐 소식' · 뺀 줄 없음`) : no(`완성본 홈에 고친 것이 안 보임 (${page || "파일 없음"})`);
  } finally {
    w.done();
  }
}
once(false);
once(true);
t.end();
