/**
 * screens.js — runs/<p>/screens.json을 읽는 곳 하나. 화면이 '답 하나 · 나머지'(메인 스키마 $defs.screen)면
 * derive.js로 조립 · 빌드 · 검사가 쓰는 칸(focus · regions · emphasize · purpose · data · defer)을 계산해 붙인다.
 * 계산한 칸은 파일에 쓰지 않는다 — 같은 값을 두 곳에 두지 않기 위해(ids.js만 번호 · 파일 경로를 쓴다).
 */
const fs = require("fs");
const path = require("path");
const { derive } = require("./derive.js");
const LOOKS = require("./looks.js");
const DRESS = require("./dress.js");
// 프리셋 바탕 톤 → looks.js 바탕(packages/core/tokens/presets.json bases)
const BASE_OF = { white: "white", paper: "warm", tint: "tint", color: "tint", dark: "dark" };
/** 레퍼런스 프리셋(토스 느낌 …)이면 그 프리셋, 아니면 null — presets.json에 있고 PRD 맞춤(S.looks)에는 없는 id. build.js kind 판정도 이것을 쓴다 */
const refPreset = (S, id) => (id && !(S.looks || []).some((o) => o.id === id) && LOOKS.PRESETS.find((p) => p.id === id)) || null;

function loadScreens(runDir) {
  const S = JSON.parse(fs.readFileSync(path.join(runDir, "screens.json"), "utf8"));
  S.screens = (S.screens || []).map(derive);
  // 실행 상태는 board 아래에 산다(메인 스키마 $defs.board) — 조립 · 빌드 · 검사는 예전처럼 최상위에서 읽게 꺼내 준다. 예전 실행물은 최상위에 그대로 있다
  for (const k of ["round", "stage", "concept", "theme", "toggles", "custom", "dress"]) if (S.board && S.board[k] !== undefined) S[k] = S.board[k];
  // 레퍼런스 프리셋을 골랐으면(theme, 또는 그 위에 색만 바꾼 custom.from) 꾸밈의 판 모양 · 모서리 두 칸만 그 프리셋으로 덮는다(설계 E5)
  //   바탕 · 제목 · 간격은 시안 꾸밈 그대로 · 판 모양 잠금보다 프리셋이 이긴다(dress.js withPreset)
  const ref = refPreset(S, S.theme) || refPreset(S, S.custom && S.custom.from);
  if (ref && (S.dress == null || typeof S.dress === "object")) S.dress = DRESS.withPreset(S.dress, ref);
  // 프리셋이 있으면 색은 직접 고른 색(custom) 하나로 잇는다 — 계산은 looks.js customLook(색 바꾸기와 같은 함수). AI는 looks를 쓰지 않는다
  //   tone → custom.base · brand → custom.hex · 기준어 → custom.name · font → custom.font · size → toggles.type. 보드에서 고른 색(custom)이 있으면 그쪽이 이긴다
  if (S.preset && !(Array.isArray(S.looks) && S.looks.length)) {
    const P = S.preset;
    S.custom = Object.assign(S.custom ? { font: P.font } : { hex: P.brand, name: (P.keywords || []).map((k) => k.word).join(" · "), base: BASE_OF[P.tone] || "white", font: P.font }, S.custom);
    if (!S.theme) S.theme = "custom";
    S.toggles = Object.assign({ type: P.size }, S.toggles);
  }
  return S;
}
module.exports = { loadScreens, refPreset };
