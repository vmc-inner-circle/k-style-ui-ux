// 같이 고친 고장 셋 — 일부러 틀린 예를 하나씩 넣어 본다.
//  B25 두 역할에 같은 탭 글자 → 각자 자기 역할 화면으로  /  B7 흐름 단계와 같은 버튼의 when 갈래 → lint 허용
//  B29 x-btn의 data-out → 펼친 button에 그대로 남음
const fs = require("fs");
const path = require("path");
const { run, workCopy, suite } = require("../lib.js");

const t = suite("16 같이 고친 고장 (B25 · B7 · B29)");
const w = workCopy();
try {
  const rd = (f) => JSON.parse(fs.readFileSync(path.join(w.run, f), "utf8"));
  const wr = (f, o) => fs.writeFileSync(path.join(w.run, f), JSON.stringify(o, null, 2));
  const S = rd("screens.json"), F = rd("flow.json");

  // 두 번째 역할 + 화면 둘: 두 역할의 탭 글자가 모두 '홈'
  S.roles.push({ key: "viewer", label: "보는 사람", nav: [{ slug: "v-home", label: "홈", icon: "house" }] });
  S.screens.push({ ...S.screens[0], slug: "v-home", name: "보는 사람 홈", role: "viewer", file: "screens/v-home.html" });
  S.screens.push({ ...S.screens[1], slug: "v-err", name: "오류", role: "viewer", file: "screens/v-err.html" });
  wr("screens.json", S);
  const home = fs.readFileSync(path.join(w.run, "screens/home.html"), "utf8");
  fs.writeFileSync(path.join(w.run, "screens/v-home.html"), home.replace('data-trigger="create"', 'data-trigger="create" data-out="휴대폰 설정 › 알림"'));
  fs.copyFileSync(path.join(w.run, "screens/done.html"), path.join(w.run, "screens/v-err.html"));

  // B25 — 보는 사람 화면의 '홈' 탭은 보는 사람 홈(v-home)으로
  run("ids.js", w.run); run("expand.js", w.run);
  const b = run("build.js", w.run, "--mode", "final");
  const pages = path.join(w.run, "out", "screens");
  const pick = (slug) => fs.readdirSync(pages).find((f) => f.endsWith(`-${slug}.html`));
  const navOf = (slug) => { const h = fs.readFileSync(path.join(pages, pick(slug)), "utf8"); return JSON.parse(h.match(/var nav = (\{.*?\});/)[1]); };
  if (b.code !== 0 || !fs.existsSync(pages)) t.fail(`build final 실패\n${b.out}`);
  else {
    const a = navOf("done"), v = navOf("v-err");
    if (a["홈"] === pick("home") && v["홈"] === pick("v-home")) t.ok("B25 같은 탭 글자 '홈'이 역할마다 자기 홈으로");
    else t.fail(`B25 탭 링크가 섞임 — owner:${a["홈"]} (기대 ${pick("home")}) · viewer:${v["홈"]} (기대 ${pick("v-home")})`);
  }

  // B29 — x-btn data-out이 button 태그에 남는다
  const ex = fs.readFileSync(path.join(w.run, "screens/v-home.html"), "utf8");
  fs.writeFileSync(path.join(w.run, "screens/v-home.html"), ex.replace(/<button class="btn btn-primary"[^>]*>/, '<x-btn variant="primary" data-trigger="create" data-out="휴대폰 설정 › 알림 › 허용">').replace("새로 만들기</button>", "새로 만들기</x-btn>"));
  run("expand.js", w.run);
  const outHtml = fs.readFileSync(path.join(w.run, "screens/v-home.html"), "utf8");
  if (/<button [^>]*\bdata-out="휴대폰 설정 › 알림 › 허용"/.test(outHtml)) t.ok("B29 x-btn data-out이 button에 남음");
  else t.fail("B29 x-btn의 data-out이 펼친 button에 없음");

  // B7 — 흐름 단계(home.create → done)와 같은 버튼을 when 갈래로 오류 화면에
  S.screens = S.screens.filter((s) => s.slug !== "v-home" && s.slug !== "v-err");
  S.roles = S.roles.filter((r) => r.key !== "viewer");
  S.screens.push({ ...S.screens[1], slug: "err", name: "오류", file: "screens/err.html" });
  wr("screens.json", S);
  fs.copyFileSync(path.join(w.run, "screens/done.html"), path.join(w.run, "screens/err.html"));
  const branch = { from: "home", region: "new", trigger: "create", action: "'새로 만들기'를 눌렀는데 실패하면", to: "err" };
  const lintWith = (br) => { F.branches = [br]; wr("flow.json", F); run("ids.js", w.run); return run("lint.js", w.run).out; };
  const dup = (out) => /이미 흐름 단계에 있음/.test(out);
  if (!dup(lintWith({ ...branch, when: "실패하면" }))) t.ok("B7 when 갈래는 같은 버튼이어도 허용");
  else t.fail("B7 when이 있는데도 '이미 흐름 단계에 있음' FAIL");
  if (dup(lintWith(branch))) t.ok("B7 when 없는 같은 버튼 갈래는 여전히 FAIL");
  else t.fail("B7 when 없는 중복 갈래를 못 잡음");
} finally {
  w.done();
}
t.end();
