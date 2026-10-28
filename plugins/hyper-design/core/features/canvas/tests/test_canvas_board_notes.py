"""판 노트 · 사용자 선 (Playwright, 실제 브라우저) — 만들기·쓰기·저장, 변의 점 끌어 잇기, 기존 선·태그 그대로.

runs/gym-v2/out 를 임시 폴더로 복사하고 build_canvas.py 로 다시 만든 뒤 index.html 을 file:// 로 연다.
"""
import os, shutil, subprocess, sys, tempfile
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
REPO = SCRIPTS.parents[4]
FIXTURE = REPO / "runs" / "gym-v2" / "out"

sync_api = pytest.importorskip("playwright.sync_api")
if not FIXTURE.exists():
    pytest.skip(f"fixture 없음: {FIXTURE}", allow_module_level=True)

EMPTY_POINT = """() => {            // 빈 판(#rows · .flow · .cards 자체)이 보이는 화면 점 하나
  const pane = document.querySelector('#screens').getBoundingClientRect();
  for (let y = pane.top + 60; y < pane.bottom - 60; y += 23)
    for (let x = pane.left + 40; x < pane.right - 300; x += 37) {
      const el = document.elementFromPoint(x, y);
      if (el && (el.id === 'rows' || el.classList.contains('flow') || el.classList.contains('cards'))) return {x, y};
    }
  return null;
}"""


@pytest.fixture(scope="module")
def out_dir():
    tmp = Path(tempfile.mkdtemp(prefix="hd-board-notes-"))
    out = tmp / "out"
    shutil.copytree(FIXTURE, out)
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    r = subprocess.run([sys.executable, str(SCRIPTS / "build_canvas.py"), str(out)], capture_output=True, text=True, encoding="utf-8", env=env)
    assert r.returncode == 0, r.stderr
    yield out
    shutil.rmtree(tmp, ignore_errors=True)


@pytest.fixture(scope="module")
def page(out_dir):
    with sync_api.sync_playwright() as p:
        b = None
        for kw in ({"channel": "chrome"}, {}):
            try:
                b = p.chromium.launch(**kw)
                break
            except Exception:
                continue
        if b is None:
            pytest.skip("chromium 을 띄울 수 없음")
        c = b.new_context(viewport={"width": 1440, "height": 1000})
        pg = c.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto((out_dir / "index.html").resolve().as_uri())
        pg.wait_for_function("window.__hdReady !== undefined")
        pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('hd-')).forEach(k => localStorage.removeItem(k))")
        reload(pg)
        yield pg
        assert not errors, errors
        b.close()


def reload(pg):
    pg.reload()
    pg.wait_for_function("window.__hdReady !== undefined")
    pg.wait_for_timeout(200)


def counts(pg):
    return pg.evaluate("""() => ({ln: document.querySelectorAll('#rows path.ln').length, lk: document.querySelectorAll('#lks path.lk').length,
                                  notes: document.querySelectorAll('#bnotes .bnote').length, edges: document.querySelectorAll('#bnh g.be').length})""")


def make_note(pg, text):
    pt = pg.evaluate(EMPTY_POINT)
    assert pt, "빈 판 자리를 못 찾음"
    pg.mouse.dblclick(pt["x"], pt["y"])
    ta = pg.locator("#bnotes textarea.bta")
    ta.wait_for(state="visible")
    ta.type(text)
    pg.keyboard.press("Escape")
    return pt


def test_note_create_type_persist(page):
    before = counts(page)
    make_note(page, "온보딩 다음에 결제?")
    assert page.locator("#bnotes .bnote .bt").first.inner_text() == "온보딩 다음에 결제?"
    assert page.locator("#bncopy").is_visible()
    reload(page)
    assert page.locator("#bnotes .bnote .bt").first.inner_text() == "온보딩 다음에 결제?"   # 새로고침해도 남는다
    after = counts(page)
    assert after["notes"] == before["notes"] + 1 and after["ln"] == before["ln"]          # 회색 점선(주요 흐름)은 그대로


def test_empty_note_is_dropped(page):
    n = counts(page)["notes"]
    pt = page.evaluate(EMPTY_POINT)
    assert pt
    page.mouse.dblclick(pt["x"], pt["y"])                                                  # 첫 노트가 덮은 자리는 EMPTY_POINT 가 건너뛴다
    page.locator("#bnotes textarea.bta").wait_for(state="visible")
    page.keyboard.press("Escape")
    assert counts(page)["notes"] == n                                                      # 빈 채로 끝 = 버림


def test_link_note_to_screen_and_delete(page):
    before = counts(page)
    note = page.locator("#bnotes .bnote").first
    note.hover()
    h = note.locator(".bh[data-side=right]").bounding_box()
    card = page.evaluate("""() => { const p = document.querySelector('#rows .card .phone').getBoundingClientRect(); return {x: p.left + p.width / 2, y: p.top + 80}; }""")
    page.mouse.move(h["x"] + h["width"] / 2, h["y"] + h["height"] / 2)
    page.mouse.down()
    page.mouse.move(card["x"], card["y"], steps=8)
    page.mouse.up()
    assert counts(page)["edges"] == before["edges"] + 1
    reload(page)
    assert counts(page)["edges"] == before["edges"] + 1                                    # 선도 저장된다
    d = page.evaluate("""() => {                       // 선은 카드 아래 층 — 누르면 선이 잡히는(카드에 가리지 않은) 점
      const p = document.querySelector('#bnl path.bl:not(.tmp)'), l = p.getTotalLength(), s = p.getScreenCTM();
      for (let t = 0.05; t < 1; t += 0.05) {
        const m = p.getPointAtLength(l * t), x = m.x * s.a + s.e, y = m.y * s.d + s.f, el = document.elementFromPoint(x, y);
        if (el && el.closest && el.closest('#bnh g.be')) return {x, y};
      }
      return null; }""")
    assert d, "보이는 선 자리가 없음"
    page.mouse.click(d["x"], d["y"])
    assert page.locator("#bnh g.be.sel").count() == 1
    page.keyboard.press("Delete")
    assert counts(page)["edges"] == before["edges"]
    assert counts(page)["ln"] == before["ln"] and counts(page)["notes"] == before["notes"]   # 노트·기존 선은 그대로


def test_copy_text_and_send_untouched(page):
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    page.locator("#bncopy").click()
    page.wait_for_timeout(100)
    got = page.evaluate("() => navigator.clipboard.readText()")
    assert got.startswith("[hyper-design 판 노트] out=") and "온보딩 다음에 결제?" in got
    assert "수정 요청" not in got                                                          # '보내기' 요청문과 섞이지 않는다
    assert page.locator("#nsend").count() == 1                                             # 기존 '보내기' 단추는 그대로


def test_focus_view_dims_board_layer(page):
    before = counts(page)
    page.locator("#rows .card .cover").first.click(modifiers=["Shift"])                    # 기존 Shift+클릭 연결 보기
    page.wait_for_timeout(300)
    assert page.evaluate("document.querySelector('#rows').classList.contains('focusing')")
    assert float(page.evaluate("getComputedStyle(document.querySelector('#bnotes')).opacity")) < 0.5
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)
    assert counts(page)["ln"] == before["ln"]


def test_line_under_card_does_not_steal_card_clicks(page):
    """카드 밑을 지나는 선: 그 자리를 누르면 카드가 받는다(크게 보기 · Shift+클릭 그대로)."""
    page.mouse.move(700, 500)
    page.mouse.wheel(0, 640)                                                               # 카드 줄이 창 안에 들어오게
    page.wait_for_timeout(300)
    make_note(page, "멀리 있는 화면으로")
    note = page.locator("#bnotes .bnote").last
    note.hover()
    h = note.locator(".bh[data-side=right]").bounding_box()
    far = page.evaluate("""() => { const ps = [...document.querySelectorAll('#rows .card .phone')].map(p => p.getBoundingClientRect())
                                     .filter(r => r.top > 70 && r.top + 120 < innerHeight && r.left > 0 && r.right < innerWidth);
                                   const r = ps[ps.length - 1]; return r ? {x: r.left + r.width / 2, y: r.top + 60} : null; }""")
    assert far, "화면 안에 카드가 없음"
    page.mouse.move(h["x"] + h["width"] / 2, h["y"] + h["height"] / 2)
    page.mouse.down()
    page.mouse.move(far["x"], far["y"], steps=8)
    page.mouse.up()
    under = page.evaluate("""() => {                   // 선 위 점들 가운데 카드 상자 안에 든 점: 맨 위 요소가 카드여야 한다
      const ps = [...document.querySelectorAll('#bnl path.bl:not(.tmp)')], cards = [...document.querySelectorAll('#rows .card')].map(c => c.getBoundingClientRect());
      const p = ps[ps.length - 1], l = p.getTotalLength(), s = p.getScreenCTM(), got = [];
      for (let t = 0.02; t < 0.98; t += 0.02) {
        const m = p.getPointAtLength(l * t), x = m.x * s.a + s.e, y = m.y * s.d + s.f;
        if (!cards.some(r => x > r.left + 2 && x < r.right - 2 && y > r.top + 2 && y < r.bottom - 2)) continue;
        const el = document.elementFromPoint(x, y); got.push(el && el.closest('.card') ? true : (el ? el.tagName + '#' + el.id + '.' + (el.getAttribute('class')||'') + '@' + Math.round(x) + ',' + Math.round(y) : 'null'));
      }
      return got; }""")
    assert under and all(v is True for v in under), under
