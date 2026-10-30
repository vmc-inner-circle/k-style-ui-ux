"""쇼케이스 썸네일 만들기: 사례마다 화면 4개를 휴대폰 크기로 찍어 한 줄로 붙인다.
사용: python3 showcase/make_thumbs.py  (레포 루트에서, Google Chrome 필요)"""
import json, pathlib, subprocess, tempfile
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CASES = json.loads((ROOT / "showcase/cases.json").read_text())
W, H, GAP, PAD = 375, 812, 28, 36

def shot(html, out):
    # 헤드리스 크롬은 창이 좁아도 레이아웃 폭을 500px 안팎으로 잡는다 → 375px iframe에 담아 찍는다
    wrap = out.with_suffix(".wrap.html")
    wrap.write_text(f'<body style="margin:0"><iframe src="{html.as_uri()}" '
                    f'style="width:{W}px;height:{H}px;border:0;display:block"></iframe>')
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--window-size={W},{H}", "--force-device-scale-factor=2",
                    "--virtual-time-budget=4000", "--allow-file-access-from-files",
                    f"--screenshot={out}", wrap.as_uri()],
                   check=True, capture_output=True)

for c in CASES:
    tmp = pathlib.Path(tempfile.mkdtemp())
    tiles = []
    for sid in c["screens"]:
        p = tmp / f"{sid}.png"
        shot(ROOT / c["dir"] / "screens" / f"{sid}.html", p)
        tiles.append(Image.open(p).convert("RGB"))
    tw, th = tiles[0].size
    strip = Image.new("RGB", (PAD * 2 + tw * 4 + GAP * 3 * 2, PAD * 2 + th), "#ffffff")
    for i, t in enumerate(tiles):
        strip.paste(t, (PAD + i * (tw + GAP * 2), PAD))
    strip.thumbnail((1600, 1600))
    out = ROOT / "showcase/thumbs" / f"{c['key']}.jpg"
    out.parent.mkdir(exist_ok=True)
    strip.save(out, quality=85)
    print(out.relative_to(ROOT))
