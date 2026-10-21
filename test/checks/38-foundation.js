// 파운데이션 토큰 — 모서리 · 그림자 단계(DS2, docs/design-system.md §1). 옛 이름은 새 단계를 가리키는 별칭이고,
// 꾸밈 모서리(dress.css)도 단계 이름을 쓴다. 값(px)은 base.css에만 있다 — 여기서는 이름이 맞게 이어졌는지만 본다.
const fs = require("fs");
const path = require("path");
const { ROOT, suite } = require("../lib.js");

const t = suite("38 파운데이션");
// CSS 읽기 — 규칙(선택자 · 선언)만. 주석은 지운다
const rulesOf = (f) => [...fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ sel: m[1].trim(), decl: Object.fromEntries(m[2].split(/;(?![^(]*\))/).map((d) => d.trim()).filter(Boolean).map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()])) }));
const ROOT_OF = (f) => rulesOf(f).find((r) => r.sel === ":root").decl;
const BASE = ROOT_OF("packages/core/tokens/base.css"), MOBILE = ROOT_OF("packages/mobile/components/00-mobile-tokens.css");
const DRESS = rulesOf("packages/core/tokens/dress.css");

// 이름 → 기대하는 단계
const check = (where, decl, want) => {
  const off = Object.entries(want).filter(([k, v]) => decl[k] !== `var(${v})`).map(([k, v]) => `${k} = ${decl[k] || "없음"} (기대 var(${v}))`);
  if (off.length) t.fail(`${where}: ${off.join(" · ")}`); else t.ok(`${where}: ${Object.entries(want).map(([k, v]) => `${k} → ${v}`).join(" · ")}`);
};
check("옛 모서리 별칭", BASE, { "--r-sm": "--r-3", "--r-md": "--r-5", "--r-lg": "--r-7", "--r-xl": "--r-9" });
check("옛 그림자 별칭", BASE, { "--shadow-sm": "--shadow-1", "--shadow-md": "--shadow-2", "--shadow-lg": "--shadow-3" });
check("모바일 모서리 별칭", MOBILE, { "--r-md": "--r-6", "--r-lg": "--r-8", "--r-xl": "--r-10" });
// 꾸밈 모서리: 판 모양이 정하는 sm · none, 각진 · 아주 둥근 모서리
for (const [v, step] of [["sm", "--r-2"], ["none", "--r-0"], ["sharp", "--r-1"]]) {
  const r = DRESS.find((x) => x.sel === `[data-radius="${v}"] .app`);
  check(`꾸밈 모서리 ${v}`, r ? r.decl : {}, { "--r-card": step, "--r-control": step });
}
{ const r = DRESS.find((x) => x.sel === `[data-radius="pill"] .app`); check("꾸밈 모서리 pill", r ? r.decl : {}, { "--r-card": "--r-11" }); }

// 단계 자체: 0 · 1 · 2 …가 빠짐없이 있고 작은 것부터 커진다
const steps = (prefix, n) => Array.from({ length: n + 1 }, (_, i) => `${prefix}${i}`);
const R = steps("--r-", 11).map((k) => [k, BASE[k]]);
const px = R.map(([, v]) => (v === "0" ? 0 : /^\d+px$/.test(v || "") ? parseInt(v, 10) : NaN));
if (px.some(Number.isNaN) || px.some((v, i) => i && v <= px[i - 1])) t.fail(`모서리 단계 --r-0~11이 px로 커지지 않음: ${R.map(([k, v]) => `${k} ${v}`).join(" · ")}`);
else t.ok(`모서리 단계 --r-0~11 (${px.join(" · ")}px) 작은 것부터`);
const S = steps("--shadow-", 3).filter((k) => !BASE[k]);
if (S.length) t.fail(`그림자 단계 없음: ${S.join(" · ")}`); else t.ok("그림자 단계 --shadow-0~3");

// 글자 단계: 이름마다 크기 · 줄간격 · 굵기, 크기는 --fs-*를 가리킨다
const T = rulesOf("packages/core/tokens/base.css").find((r) => r.sel.replace(/\s+/g, " ") === ":root, [data-type], .app");
const names = ["display", "title1", "title2", "title3", "body", "label", "caption", "micro"];
const tMiss = !T ? ["블록 없음"] : names.flatMap((n) => ["size", "lh", "weight"].filter((k) => !T.decl[`--t-${n}-${k}`]).map((k) => `--t-${n}-${k}`)
  .concat(T.decl[`--t-${n}-size`] && !/^var\(--fs-/.test(T.decl[`--t-${n}-size`]) ? [`--t-${n}-size가 --fs-*가 아님`] : []));
if (tMiss.length) t.fail(`글자 단계: ${tMiss.join(" · ")}`); else t.ok(`글자 단계 ${names.length}개 — 크기 · 줄간격 · 굵기, 크기는 --fs-*`);
t.end();
