// 프리셋 ↔ 꾸밈(설계 E5) — 레퍼런스 프리셋을 고르면 그 프리셋의 card · radius가 꾸밈의 판 모양 · 모서리 두 칸만 덮는다.
// 바탕 · 제목 · 간격은 시안 꾸밈 그대로, 판 모양 잠금(line → none …)보다 프리셋이 이긴다. 덮는 곳은 scripts/screens.js 한 곳(파일에는 안 씀).
// 예시(test/fixtures/sample) 복사본에 board.theme · custom.from · dress를 바꿔 넣고 lint와 완성본 build를 돌린다.
const fs = require("fs");
const path = require("path");
const { ROOT, run, workCopy, suite } = require("../lib.js");
const DR = require(path.join(ROOT, "scripts", "dress.js"));
const LK = require(path.join(ROOT, "scripts", "looks.js"));

const t = suite("40 프리셋 ↔ 꾸밈");
const preset = (id) => LK.PRESETS.find((p) => p.id === id);

// ---------- 대응표: radius.card에 가장 가까운 모서리 단계 ----------
{
  const st = DR.radiusSteps(), far = [], table = {};
  for (const p of LK.PRESETS) {
    const d = DR.presetDress(p, st), pxOf = (r) => (r === "base" ? st.px(LK.lookTokens(p)["--r-card"]) : st.steps[r]);
    const gap = Math.abs(pxOf(d.radius) - p.radius.card);
    if (Object.keys(st.steps).some((r) => Math.abs(st.steps[r] - p.radius.card) < gap)) far.push(`${p.id} ${p.radius.card} → ${d.radius}`);
    table[`${p.radius.card} → ${d.radius}`] = true;
  }
  far.length ? t.fail(`가장 가까운 단계가 아님: ${far.join(" / ")}`) : t.ok(`프리셋 ${LK.PRESETS.length}개 모서리 대응: ${Object.keys(table).join(" · ")}`);
  const cards = { toss: "flat", daangn: "line", kakao: "float" }, wrong = Object.keys(cards).filter((id) => DR.presetDress(preset(id), st).cards !== cards[id]);
  wrong.length ? t.fail(`판 모양 대응이 틀림: ${wrong.join(", ")}`) : t.ok("판 모양 fill → flat · line → line · shadow → float");
}

const w = workCopy();
try {
  run("ids.js", w.run); run("expand.js", w.run);
  const file = path.join(w.run, "screens.json"), S0 = JSON.parse(fs.readFileSync(file, "utf8"));
  // board에 실행 상태를 넣고 lint · 완성본 build → <html>의 data-* 를 돌려준다
  const go = (what, board) => {
    const S = Object.assign({}, S0, { board: Object.assign({}, S0.board, board), toggles: Object.assign({}, S0.toggles) });
    delete S.theme; delete S.toggles.swatch;   // 예시의 버튼 색(terracotta)은 warm에만 있다
    const text = JSON.stringify(S, null, 2);
    fs.writeFileSync(file, text);
    const f = run("lint.js", w.run).out.split("\n").filter((l) => l.startsWith("[FAIL]"));
    f.length ? t.fail(`${what}: lint FAIL ${f.length}\n${f.join("\n")}`) : t.ok(`${what}: lint FAIL 0`);
    const b = run("build.js", w.run, "--mode", "final");
    if (b.code !== 0) { t.fail(`${what}: build 실패\n${b.out}`); return null; }
    if (fs.readFileSync(file, "utf8") !== text) t.fail(`${what}: screens.json이 바뀜 — 덮은 꾸밈은 파일에 쓰지 않는다`);
    const out = path.join(w.run, "out"), page = fs.readdirSync(path.join(out, "screens"))[0];
    const html = fs.readFileSync(path.join(out, "index.html"), "utf8"), one = fs.readFileSync(path.join(out, "screens", page), "utf8");
    const tag = (h) => { const a = {}; for (const m of /<html\b[^>]*>/.exec(h)[0].matchAll(/data-([a-z-]+)="([^"]*)"/g)) a[m[1]] = m[2]; return a; };
    const A = tag(html), dressOf = (a) => DR.KEYS.map((k) => a[k] || "").join("|");
    if (dressOf(tag(one)) !== dressOf(A)) t.fail(`${what}: 화면별 페이지 ${page}의 꾸밈이 완성본과 다름`);
    [html, one].every((h) => h.includes("window.HX_PRESET_DRESS = {")) ? t.ok(`${what}: 완성본 · 화면별 페이지에 HX_PRESET_DRESS`) : t.fail(`${what}: HX_PRESET_DRESS가 페이지에 없음`);
    return A;
  };
  const same = (what, A, want) => {
    const bad = Object.entries(want).filter(([k, v]) => A[k] !== v);
    bad.length ? t.fail(`${what}: ${bad.map(([k, v]) => `data-${k} ${A[k] || "없음"} (기대 ${v || "없음"})`).join(" · ")}`) : t.ok(`${what}: ${Object.entries(want).map(([k, v]) => `${k}=${v || "없음"}`).join(" · ")}`);
  };
  const keep = { bg: "tint", head: "big", space: "airy" };
  const radiusOf = (id) => { const r = DR.presetDress(preset(id)).radius; return r === "base" ? undefined : r; };

  // 레퍼런스를 직접 고름 — 시안 꾸밈의 유리 판 · 둥글게를 토스(fill · 20)가 덮는다
  const A1 = go("theme toss", { theme: "toss", dress: Object.assign({ cards: "glass", radius: "round" }, keep) });
  if (A1) same("theme toss", A1, Object.assign({ cards: "flat", radius: radiusOf("toss") }, keep));

  // 그 위에 색만 바꿈 — 시안 꾸밈이 line(모서리 none으로 잠김)이어도 당근(line · 14)이 잠금을 푼다
  const A2 = go("custom.from daangn", { theme: "custom", custom: { hex: "#2F6FDB", from: "daangn" }, dress: Object.assign({ cards: "line", radius: "none" }, keep) });
  if (A2) {
    same("custom.from daangn", A2, Object.assign({ cards: "line", radius: radiusOf("daangn") }, keep));
    A2.radius === "none" ? t.fail("custom.from daangn: 모서리가 잠긴 none 그대로") : t.ok("custom.from daangn: 잠긴 모서리 none이 풀림");
  }

  // PRD 맞춤 분위기(S.looks의 warm) — 덮지 않는다
  const A3 = go("theme warm(맞춤)", { theme: "warm", dress: Object.assign({ cards: "glass", radius: "round" }, keep) });
  if (A3) same("theme warm(맞춤)", A3, Object.assign({ cards: "glass", radius: "round" }, keep));
} finally {
  w.done();
}
t.end();
