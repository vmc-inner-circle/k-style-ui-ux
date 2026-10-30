#!/bin/bash
# 회귀 확인: 기존 PRD 4개를 main·이 브랜치로 2개씩만 동시에(시간 비교가 서로 느려지는 영향에 덜 휘둘리게) 돌리고,
# evaluate.py로 기계 채점·평가 에이전트·블라인드 비교(이 브랜치 vs main, 5판)
# bash loop/archetype_exp/regress.sh <폴더> <main 플러그인 폴더>
set -u; B=$1; MP=$2; ROOT=$(cd "$(dirname "$0")/../.." && pwd); mkdir -p "$B"
for p in family-trip pilates-booking wedding-meetup ai-saju; do
  PRD=$ROOT/loop/results/v21-$p/prd.md
  python3 "$ROOT/loop/run.py" "$PRD" "$B/branch-$p" > "$B/branch-$p.log" 2>&1 &
  python3 "$ROOT/loop/run.py" "$PRD" "$B/main-$p" --plugin "$MP" > "$B/main-$p.log" 2>&1 &
  wait
done
for p in family-trip pilates-booking wedding-meetup ai-saju; do
  python3 "$ROOT/loop/evaluate.py" "$B/branch-$p" "$ROOT/loop/results/v21-$p/prd.md" "$B/main-$p" > "$B/eval-$p.log" 2>&1 &
done; wait
for p in family-trip pilates-booking wedding-meetup ai-saju; do
  echo "== $p  main $(grep -o '[0-9.]*분' $B/main-$p/elapsed.txt | head -1) · 브랜치 $(grep -o '[0-9.]*분' $B/branch-$p/elapsed.txt | head -1) · 비교(브랜치 승) $(grep -l 'WINNER' $B/branch-$p/compare-*.txt 2>/dev/null | while read f; do h=$(head -1 $f); w=$(grep -o 'WINNER: [XY]' $f | tail -1 | cut -c9); case "$h$w" in "X=harness Y=vanilla"X|"X=vanilla Y=harness"Y) echo 1;; esac; done | wc -l)/5"
done
