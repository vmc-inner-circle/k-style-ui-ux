#!/usr/bin/env python3
"""저장소가 원본(src/·platform/)과 생성물(claude/·codex/plugin/)이 맞물려 있는지 확인한다.

python3 ci/verify.py
- build/build.sh 를 다시 돌려 커밋된 생성물과 한 바이트도 다르지 않은지(손으로 고친 생성물·빌드 안 한 원본 수정을 잡는다)
- manifest·마켓 파일이 JSON으로 읽히고, 마켓이 가리키는 폴더에 manifest가 있는지
"""
from __future__ import annotations
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GENERATED = ["claude", "codex/plugin"]
fails: list[str] = []

for f in ["platform/claude/plugin.json", "platform/codex/plugin.json", "platform/codex/plugin.portable.json",
          ".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"]:
    try: json.loads((ROOT / f).read_text(encoding="utf-8"))
    except Exception as e: fails.append(f"JSON 읽기 실패: {f}: {e}")

cm = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text(encoding="utf-8"))
for p in cm["plugins"]:
    if not (ROOT / p["source"] / ".claude-plugin/plugin.json").exists():
        fails.append(f"Claude 마켓이 가리키는 곳에 manifest 없음: {p['source']}")
xm = json.loads((ROOT / ".agents/plugins/marketplace.json").read_text(encoding="utf-8"))
for p in xm["plugins"]:
    d = ROOT / p["source"]["path"]
    if not (d / "plugin.json").exists() or not (d / ".codex-plugin/plugin.json").exists():
        fails.append(f"Codex 마켓이 가리키는 곳에 manifest 없음: {p['source']['path']}")

r = subprocess.run(["bash", str(ROOT / "build/build.sh")], cwd=ROOT, capture_output=True, text=True)
if r.returncode != 0:
    fails.append("build.sh 실패:\n" + r.stdout + r.stderr)
else:
    git = lambda *a: subprocess.run(["git", *a, "--", *GENERATED], cwd=ROOT, capture_output=True, text=True).stdout
    st = git("diff", "--name-status") + git("ls-files", "--others", "--exclude-standard")   # 커밋(또는 스테이징)한 것과 비교
    if st.strip():
        fails.append("생성물이 원본과 다르다 — src/·platform/ 을 고친 뒤 build/build.sh 를 돌려 커밋할 것:\n" + st)

if fails:
    print("\n".join("✗ " + f for f in fails)); sys.exit(1)
print("✓ verify OK — 생성물이 원본과 같고 manifest·마켓이 맞다")
