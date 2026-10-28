"""SVG 일러스트(out/.images/svg/<slot>.svg)를 사진 자리(assets/photos/<slot>.jpg)로 굽는다 — imggen의 svg 모드 마무리.

  python3 svgfill.py <out> [--final]

① image_slots.json 의 photo 자리마다 .images/svg/<slot>.svg 가 있으면 슬롯 비율·긴 변 1200 JPG로 렌더해 자리표시를 덮어쓴다
② 렌더한 칸만 credits.json 에 병합 ③ .images/status.json 에 timeline(SVG 파일이 쓰인 시각 - imggen t0)을 기록
--final 이 없으면 state는 running 으로 둔다(중간 반영). --final 이면 모두 채워졌을 때 done, 아니면 fallback(빠진 slot을 notes에).
렌더 실패·SVG 깨짐은 그 칸만 자리표시로 남긴다. 처리된 경우는 모두 종료 코드 0.
"""
import argparse
import base64
import io
import json
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from imggen import parse_ratio, size_for, write_json  # noqa: E402

AUTHOR = "AI 일러스트 (Claude SVG)"


def merge_credits(out, photos, rendered):
    p = out / "credits.json"
    try:
        cur = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(cur, list):
            cur = []
    except Exception:
        cur = []
    mine = {f"assets/photos/{s['slot']}.jpg" for s in photos if s["slot"] in rendered}
    keep = [c for c in cur if not (isinstance(c, dict) and c.get("file") in mine)]
    for s in photos:
        if s["slot"] in rendered:
            keep.append({"slot": s["slot"], "file": f"assets/photos/{s['slot']}.jpg", "author": AUTHOR,
                         "license": "generated", "url": "", "title": s.get("what", "")})
    write_json(p, keep)


def render(jobs):
    """jobs: [(svg_path, (w, h), jpg_path)] → {svg_path: error or None}"""
    from playwright.sync_api import sync_playwright
    errs = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1200, "height": 1200})
        for svg, (w, h), jpg in jobs:
            try:
                uri = "data:image/svg+xml;base64," + base64.b64encode(svg.read_bytes()).decode()
                pg.set_viewport_size({"width": w, "height": h})
                pg.set_content(f'<body style="margin:0;background:#fff"><img id="i" src="{uri}" '
                               f'style="display:block;width:{w}px;height:{h}px;object-fit:cover"></body>')
                ok = pg.evaluate("() => document.getElementById('i').decode().then(() => true, () => false)")
                if not ok:
                    errs[svg] = "decode failed"
                    continue
                png = pg.screenshot(clip={"x": 0, "y": 0, "width": w, "height": h})
                Image.open(io.BytesIO(png)).convert("RGB").save(jpg, quality=90)
                errs[svg] = None
            except Exception as e:
                errs[svg] = str(e)[:200]
        b.close()
    return errs


def main(argv=None):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description="SVG 일러스트를 사진 자리 JPG로 굽는다.")
    ap.add_argument("out")
    ap.add_argument("--final", action="store_true", help="마지막 호출 — done/fallback 으로 끝낸다")
    a = ap.parse_args(argv)

    out = Path(a.out).resolve()
    svg_dir, photos_dir = out / ".images/svg", out / "assets/photos"
    photos_dir.mkdir(parents=True, exist_ok=True)
    status_p = out / ".images/status.json"
    try:
        st = json.loads(status_p.read_text(encoding="utf-8"))
    except Exception:
        st = {}
    t0 = st.get("t0") or time.time()
    slots = json.loads((out / "image_slots.json").read_text(encoding="utf-8"))
    photos = [s for s in slots if isinstance(s, dict) and s.get("slot") and s.get("kind", "photo") == "photo"]

    notes = [n for n in st.get("notes", []) if not n.startswith("svg ")]
    jobs, timeline = [], []
    for s in photos:
        f = svg_dir / f"{s['slot']}.svg"
        if not f.is_file():
            continue
        try:
            ET.fromstring(f.read_text(encoding="utf-8"))
        except Exception as e:
            notes.append(f"svg {s['slot']}: invalid ({str(e)[:80]})")
            continue
        jobs.append((f, size_for(parse_ratio(s.get("ratio", "3:4"))), photos_dir / f"{s['slot']}.jpg"))
        timeline.append({"slot": s["slot"], "t": round(f.stat().st_mtime - t0, 1)})
    errs = render(jobs) if jobs else {}
    rendered = {f.stem for f, e in errs.items() if e is None}
    notes += [f"svg {f.stem}: render failed ({e})" for f, e in errs.items() if e]
    merge_credits(out, photos, rendered)

    missing = [s["slot"] for s in photos if s["slot"] not in rendered]
    if a.final:
        notes += [f"svg {k}: missing" for k in missing]
        state = "done" if not missing else "fallback"
    else:
        state = "running"
    timeline.sort(key=lambda r: r["t"])
    st.update({"state": state, "mode": "svg", "generated": len(rendered), "placeholders": len(missing),
               "elapsed_s": round(time.time() - t0, 1), "notes": notes, "timeline": timeline,
               "first_svg_s": timeline[0]["t"] if timeline else None, "last_svg_s": timeline[-1]["t"] if timeline else None})
    if state == "fallback":
        st["reason"] = "svg missing or failed"
    write_json(status_p, st)
    print(f"svgfill {state}: rendered {len(rendered)} · placeholders {len(missing)} · {st['elapsed_s']}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
