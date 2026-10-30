#!/usr/bin/env bash
# build.sh — 원본 한 벌(src/)에서 에이전트별 플러그인 패키지를 다시 만든다.
#
#   src/skills/          원본 스킬(go·max) — 특정 에이전트에 묶이지 않은 문구
#   src/core/            원본 공용 폴더(원칙·부품·팔레트·스크립트) — 스킬이 <스킬 폴더>/../../core 로 찾는다
#   platform/claude/     Claude 전용: plugin.json · LICENSE
#   platform/codex/      Codex 전용: plugin.portable.json(Agent Plugins 1.0 루트 manifest)
#                        · plugin.json(.codex-plugin 호환) · skills/<스킬>/agents/openai.yaml · LICENSE
#   claude/              생성물(커밋한다 — Claude Code가 이 폴더를 설치한다)
#   codex/plugin/        생성물(커밋한다 — Codex가 이 폴더를 설치한다)
#
# 루트 마켓 파일(.claude-plugin/marketplace.json, .agents/plugins/marketplace.json)은 생성물이 아니라 직접 고치는 파일이다.
# claude/·codex/plugin/ 은 손으로 고치지 않는다 — src/·platform/ 을 고치고 이 스크립트를 다시 돌린다(CI가 어긋남을 잡는다).
#
# 검사:
#   ① 스킬 목록은 src/skills/*/ 에서 찾는다 — 새 스킬에 Codex openai.yaml 이 없으면 실패
#   ② manifest 6개(입력 3 + 생성 3) 버전이 같고 CHANGELOG 맨 위와 같아야 한다
#   ③ 원본 스킬 본문에 Claude 전용 frontmatter(allowed-tools 등)가 섞이면 실패
#   ④ 모든 검사가 통과한 뒤에만 기존 생성물을 바꿔 넣는다

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
PLAT="$ROOT/platform"
BUILD_TMP="$(mktemp -d "$ROOT/.build.XXXXXX")"
OUT="$BUILD_TMP/output"
mkdir -p "$OUT"
trap 'rm -rf "$BUILD_TMP"' EXIT

copy_src() {  # $1 = 패키지 루트 — skills/ 와 core/ 를 나란히 둔다(스킬의 ../../core 경로 규칙)
  mkdir -p "$1"
  cp -R "$SRC/skills" "$1/skills"
  cp -R "$SRC/core" "$1/core"
}

# ── 검사 ①·③: 스킬 목록과 원본 frontmatter ─────────────────────────────────
SKILLS=""
for d in "$SRC"/skills/*/; do [ -d "$d" ] && SKILLS="$SKILLS $(basename "$d")"; done
[ -n "$SKILLS" ] || { echo "FAILED: src/skills 가 비어 있다" >&2; exit 1; }
for s in $SKILLS; do
  f="$SRC/skills/$s/SKILL.md"
  [ -f "$f" ] || { echo "FAILED: SKILL.md 없음: $s" >&2; exit 1; }
  if perl -0777 -ne 'exit((/\A---\n(.*?)\n---\n/s && $1 =~ /^(allowed-tools|disable-model-invocation|model):/m) ? 0 : 1)' "$f"; then
    echo "FAILED: 원본 스킬에 Claude 전용 frontmatter: $s — platform/claude 쪽에서 넣어야 한다" >&2
    exit 1
  fi
done

# ── Claude → ./claude ───────────────────────────────────────────────────────
echo "=== build: claude ==="
copy_src "$OUT/claude"
mkdir -p "$OUT/claude/.claude-plugin"
cp "$PLAT/claude/plugin.json" "$OUT/claude/.claude-plugin/plugin.json"
cp "$PLAT/claude/LICENSE" "$OUT/claude/"

# ── Codex → ./codex/plugin ──────────────────────────────────────────────────
echo "=== build: codex ==="
copy_src "$OUT/codex/plugin"
cp -R "$PLAT/codex/skills/." "$OUT/codex/plugin/skills/"   # agents/openai.yaml 덧씌우기
for s in $SKILLS; do
  [ -f "$OUT/codex/plugin/skills/$s/agents/openai.yaml" ] \
    || { echo "FAILED: Codex openai.yaml 없음: platform/codex/skills/$s/agents/openai.yaml" >&2; exit 1; }
done
mkdir -p "$OUT/codex/plugin/.codex-plugin"
cp "$PLAT/codex/plugin.portable.json" "$OUT/codex/plugin/plugin.json"
cp "$PLAT/codex/plugin.json" "$OUT/codex/plugin/.codex-plugin/plugin.json"
cp "$PLAT/codex/LICENSE" "$OUT/codex/plugin/"

# 로컬 실행 찌꺼기는 패키지에 싣지 않는다
find "$OUT" \( -name "__pycache__" -o -name ".DS_Store" \) -prune -exec rm -rf {} +

# ── 검사 ②: 버전 ─────────────────────────────────────────────────────────────
pj_ver() { perl -ne 'if(/"version"\s*:\s*"([^"]+)"/){print $1; last}' "$1"; }
VERS=""
for pj in "$PLAT/claude/plugin.json" "$PLAT/codex/plugin.json" "$PLAT/codex/plugin.portable.json" \
          "$OUT/claude/.claude-plugin/plugin.json" "$OUT/codex/plugin/.codex-plugin/plugin.json" \
          "$OUT/codex/plugin/plugin.json"; do
  v="$(pj_ver "$pj")"
  [ -n "$v" ] || { echo "FAILED: 버전 없음: $pj" >&2; exit 1; }
  VERS="$VERS$v"$'\n'
done
UNIQ="$(printf '%s' "$VERS" | sort -u)"
if [ "$(printf '%s\n' "$UNIQ" | grep -c .)" -ne 1 ]; then
  echo "FAILED: plugin.json 버전이 서로 다르다:" >&2
  printf '%s' "$VERS" >&2
  exit 1
fi
CL_VER="$(perl -ne 'if(/^##\s+v([0-9][^\s(]*)/){print $1; last}' "$ROOT/CHANGELOG.md")"
if [ "$UNIQ" != "$CL_VER" ]; then
  echo "FAILED: plugin.json=v$UNIQ 인데 CHANGELOG 맨 위=v$CL_VER" >&2
  exit 1
fi
echo "✓ 버전 v$UNIQ (manifest 6개 + CHANGELOG)"

# ── 검사 ④: 다 통과한 뒤에만 바꿔 넣는다(중간 실패 시 되돌림) ─────────────
BACKUP="$BUILD_TMP/previous"
mkdir -p "$BACKUP/codex"
MOVED_OLD=""
for rel in claude codex/plugin; do
  if [ -e "$ROOT/$rel" ]; then
    mv "$ROOT/$rel" "$BACKUP/$rel"
    MOVED_OLD="$rel $MOVED_OLD"
  fi
done
for rel in claude codex/plugin; do
  mkdir -p "$(dirname "$ROOT/$rel")"
  if ! mv "$OUT/$rel" "$ROOT/$rel"; then
    for restore in $MOVED_OLD; do rm -rf "${ROOT:?}/$restore"; mv "$BACKUP/$restore" "$ROOT/$restore"; done
    echo "FAILED: 생성물을 옮기지 못했다: $rel" >&2
    exit 1
  fi
done

echo "=== done → ./claude  ./codex/plugin ==="
