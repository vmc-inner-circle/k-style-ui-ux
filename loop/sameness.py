"""결과물 획일화 측정: 서로 다른 PRD의 결과가 얼마나 같은 모양인지 숫자로 본다.
사용: python3 loop/sameness.py loop/results/v15-family-trip loop/results/v15-wedding-meetup ...

- 첫 화면 골격: 홈(home, 없으면 screens.json의 첫 화면)에서 문서 순서대로 나온 부품 클래스 열의 유사도(difflib, 0~1)
- 화면 골격: 결과 A의 각 화면을 결과 B에서 가장 닮은 화면과 짝지어 평균(0~1)
- 부품 어휘: 전체 화면의 부품 클래스 빈도 코사인(0~1) — 같은 부품 세트를 쓰므로 원래 높다. 참고용
- 기본 팔레트: 같은 팔레트를 기본값으로 골랐는지
값이 1에 가까울수록 'PRD가 달라도 같은 화면'이다."""
import difflib, html.parser, itertools, json, math, pathlib, sys
from collections import Counter

SKIP = {"num", "text-large"}  # 모양과 무관한 글자 꾸밈

class Seq(html.parser.HTMLParser):
    def __init__(s):
        super().__init__(); s.out = []
    def handle_starttag(s, tag, attrs):
        cls = dict(attrs).get("class")
        if not cls: return
        first = cls.split()[0]  # 부품 이름. is-* 변형은 버린다
        if first not in SKIP and (not s.out or s.out[-1] != first):
            s.out.append(first)

def seq(path):
    p = Seq(); p.feed(path.read_text()); return p.out

def load(d):
    d = pathlib.Path(d)
    files = sorted(f for f in (d / "screens").glob("*.html") if "--" not in f.stem)
    screens = {f.stem: seq(f) for f in files}
    # 첫 화면: home이 있으면 home, 없으면 screens.json 순서의 첫 화면(보통 만들기 화면이라 차선)
    first = "home" if "home" in screens else None
    sj = d / "screens.json"
    if not first and sj.exists():
        ids = [x["id"] for x in json.loads(sj.read_text()).get("screens", []) if x.get("id") in screens]
        first = ids[0] if ids else None
    first = first or next(iter(screens))
    pal = None
    pj = d / "palettes.json"
    if pj.exists():
        pal = json.loads(pj.read_text()).get("default")
    return {"name": d.name, "screens": screens, "home": first, "palette": pal}

def ratio(a, b):
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()

def cosine(a, b):
    dot = sum(a[k] * b[k] for k in a)
    return dot / (math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values())) or 1)

def best_match(A, B):
    return sum(max(ratio(s, t) for t in B["screens"].values()) for s in A["screens"].values()) / len(A["screens"])

def main(dirs):
    runs = [load(d) for d in dirs]
    rows = []
    for A, B in itertools.combinations(runs, 2):
        vocab = cosine(Counter(c for s in A["screens"].values() for c in s),
                       Counter(c for s in B["screens"].values() for c in s))
        rows.append({
            "a": A["name"], "b": B["name"],
            "home": round(ratio(A["screens"][A["home"]], B["screens"][B["home"]]), 2),
            "screens": round((best_match(A, B) + best_match(B, A)) / 2, 2),
            "vocab": round(vocab, 2),
            "same_palette": A["palette"] == B["palette"],
        })
    print(f"{'A':28} {'B':28} 첫화면 화면 어휘 팔레트")
    for r in rows:
        print(f"{r['a']:28} {r['b']:28} {r['home']:6} {r['screens']:4} {r['vocab']:4} {'같음' if r['same_palette'] else '다름'}")
    for k in ("home", "screens", "vocab"):
        print(f"평균 {k}: {sum(r[k] for r in rows) / len(rows):.2f}")
    return rows

if __name__ == "__main__":
    main(sys.argv[1:])
