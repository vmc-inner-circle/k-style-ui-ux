"""판 노트 · 사용자 선 Model(modules/board-notes.js) — node 단위 테스트. 브라우저 없음."""
import json, shutil, subprocess
from pathlib import Path

import pytest

MOD = Path(__file__).resolve().parent.parent / "modules"
NODE = shutil.which("node")
pytestmark = pytest.mark.skipif(not NODE, reason="node 없음")

HARNESS = r"""
const fs = require('fs'), vm = require('vm');
vm.runInThisContext(fs.readFileSync(process.argv[2], 'utf8'), {filename: 'board-notes.js'});
const M = globalThis.HD.boardNotes, out = {};
let b = M.create({}, 'a', {x: 10.4, y: 20.6}, 1);
out.unsavedEmpty = JSON.parse(JSON.stringify(b.notes.a));
let r = M.finish(b, 'a', '  ', 2); out.dropKind = r.kind; out.dropHas = 'a' in r.board.notes;
b = M.finish(M.create({}, 'a', {x: 0, y: 0}, 1), 'a', '첫 노트\r\n둘째 줄  ', 2).board;
out.text = b.notes.a.text;
out.same = M.finish(b, 'a', '첫 노트\n둘째 줄', 3).kind;
b = M.finish(M.create(b, 'b', {x: 400, y: 0}, 1), 'b', '나', 2).board;
let c = M.connect(b, 'e1', 'note:a', 'right', 'note:b', 'left', 5); out.ok = c.ok; b = c.board;
out.dup = M.connect(b, 'e2', 'note:a', 'right', 'note:b', 'top', 6).ok;
out.self = M.connect(b, 'e3', 'note:a', 'right', 'note:a', 'left', 6).ok;
out.fromScreen = M.connect(b, 'e4', 'screen:home', 'right', 'note:a', 'left', 6).ok;
out.missing = M.connect(b, 'e5', 'note:a', 'right', 'note:zz', 'left', 6).ok;
out.badSide = M.connect(b, 'e6', 'note:a', 'middle', 'screen:home', 'left', 6).ok;
c = M.connect(b, 'e7', 'note:a', 'bottom', 'screen:home', 'top', 7); out.toScreen = c.ok; b = c.board;
out.liveAll = M.live(b, id => id === 'home').map(e => e.id).sort();
out.liveGone = M.live(b, () => false).map(e => e.id);
out.storedAfterGone = Object.keys(b.edges).sort();
b = M.label(b, 'e1', '  다음  단계로 가는 길이 아주 긴 이름표 글자가 마흔 자를 넘어가면 잘린다 ', 8);
out.label = b.edges.e1.label;
out.labelCleared = 'label' in M.label(b, 'e1', '   ', 9).edges.e1;
const rm = M.removeNote(b, 'a'); out.rmNotes = Object.keys(rm.notes); out.rmEdges = Object.keys(rm.edges);
out.dropEdges = Object.keys(M.finish(b, 'b', '', 9).board.edges).sort();
out.moveSame = M.move(b, 'a', 0, 0, 10) === b;
out.moveNew = M.move(b, 'a', 5.6, -3.2, 10).notes.a;
out.unlink = Object.keys(M.unlink(b, 'e7').edges).sort();
const round = M.parse(JSON.stringify(b)); out.roundBad = round.bad; out.roundSame = JSON.stringify(round.board) === JSON.stringify(b);
out.broken = M.parse('{nope').bad;
const mixed = M.parse(JSON.stringify({notes: {a: {x: 1, y: 2, text: 'ok', extra: 7}, z: {x: 'no', y: 0, text: 'x'}, e: {x: 0, y: 0, text: ''}},
                                       edges: {k: {from: 'note:a', fromSide: 'top', to: 'screen:s', toSide: 'left'},
                                               orphan: {from: 'note:z', fromSide: 'top', to: 'screen:s', toSide: 'left'}}}));
out.mixed = {bad: mixed.bad, notes: Object.keys(mixed.board.notes), extra: mixed.board.notes.a.extra, edges: Object.keys(mixed.board.edges)};
out.spot = [M.spot([['div', '#rows']]), M.spot([['div', '.cards'], ['div', '.flow']]), M.spot([['p'], ['section', '.story'], ['div', '#intro']]),
            M.spot([['iframe'], ['div', '.phone'], ['div', '.card'], ['div', '.cards']]), M.spot([['div', '.bt'], ['div', '.bnote'], ['div', '#bnotes']]),
            M.spot([['path', '.bl'], ['svg', '#bnl']]), M.spot([])];
const boxes = [{x0: 300, y0: 0, x1: 675, y1: 900}];
out.roomIn = M.room({x: 320, y: 50}, boxes).free;
out.roomNarrow = M.room({x: 100, y: 50}, boxes);
out.roomWide = M.room({x: 100, y: 1200}, boxes).w;
const box = {x: 0, y: 0, w: 100, h: 50};
out.anchors = M.SIDES.map(s => M.anchor(box, s));
out.near = [M.nearSide(box, {x: 50, y: -40}), M.nearSide(box, {x: 300, y: 25}), M.nearSide(box, {x: 50, y: 400}), M.nearSide(box, {x: -90, y: 30})];
out.path = M.path({x: 0, y: 0}, 'right', {x: 400, y: 0}, 'left');
out.stamp = [M.stamp({title: 'A', rows: [{screens: [{id: 'x'}, {id: 'y'}]}]}), M.stamp({title: 'A', rows: [{screens: [{id: 'y'}, {id: 'x'}]}]}),
             M.stamp({title: 'B', rows: [{screens: [{id: 'x'}, {id: 'y'}]}]})];
out.copy = M.copyText(b, {out: 'C:/o/out', boxes: {home: {x: 0, y: 200, w: 375, h: 812}}, titles: {home: '홈'}});
console.log(JSON.stringify(out));
"""


@pytest.fixture(scope="module")
def res(tmp_path_factory):
    h = tmp_path_factory.mktemp("bn") / "h.js"
    h.write_text(HARNESS, encoding="utf-8")
    r = subprocess.run([NODE, str(h), str(MOD / "board-notes.js")], capture_output=True, text=True, encoding="utf-8")
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_create_and_finish(res):
    assert res["unsavedEmpty"] == {"x": 10, "y": 21, "w": 240, "text": "", "at": 1}
    assert res["dropKind"] == "drop" and res["dropHas"] is False            # 빈 채로 끝 = 버림
    assert res["text"] == "첫 노트\n둘째 줄" and res["same"] == "same"       # 줄바꿈 정리 · 그대로면 저장 없음


def test_connect_rules(res):
    assert res["ok"] is True and res["toScreen"] is True
    assert res["dup"] is False and res["self"] is False                    # 같은 쌍 · 자기 자신
    assert res["fromScreen"] is False                                       # 화면에서는 출발하지 않는다(카드 클릭을 지킨다)
    assert res["missing"] is False and res["badSide"] is False


def test_live_keeps_stored_edges(res):
    assert res["liveAll"] == ["e1", "e7"]
    assert res["liveGone"] == ["e1"]                                        # 없는 화면으로 가는 선은 그리지 않지만
    assert res["storedAfterGone"] == ["e1", "e7"]                           # 저장값에서 지우지 않는다


def test_label(res):
    assert res["label"] == '다음 단계로 가는 길이 아주 긴 이름표 글자가 마흔 자를 넘어가면 잘린다'                 # 빈칸 하나로 · 앞뒤 빈칸 뺌 · 40자
    assert res["labelCleared"] is False


def test_remove_note_removes_its_edges(res):
    assert res["rmNotes"] == ["b"] and res["rmEdges"] == []
    assert res["dropEdges"] == ["e7"]                                       # 노트 b 를 비우면 b 에 닿은 e1 도 빠진다


def test_move_and_unlink(res):
    assert res["moveSame"] is True
    assert res["moveNew"]["x"] == 6 and res["moveNew"]["y"] == -3 and res["moveNew"]["at"] == 10
    assert res["unlink"] == ["e1"]


def test_parse(res):
    assert res["roundBad"] is None and res["roundSame"] is True
    assert res["broken"] == "broken"
    m = res["mixed"]
    assert m["bad"] == "dropped" and m["notes"] == ["a"] and m["extra"] == 7 and m["edges"] == ["k"]


def test_spot(res):
    assert res["spot"] == ["empty", "empty", "busy", "busy", "note", "busy", "busy"]


def test_room(res):
    assert res["roomIn"] is False
    n = res["roomNarrow"]
    assert n["free"] and n["x"] == 86 and n["y"] == 24 and n["w"] == 202        # 오른쪽 카드 앞 12px 까지
    assert res["roomWide"] == 240


def test_geometry(res):
    assert res["anchors"] == [{"x": 50, "y": 0}, {"x": 100, "y": 25}, {"x": 50, "y": 50}, {"x": 0, "y": 25}]
    assert res["near"] == ["top", "right", "bottom", "left"]
    assert res["path"] == "M0,0 C80,0 320,0 400,0"


def test_stamp(res):
    a, b, c = res["stamp"]
    assert a == b and a != c                                                # 화면 순서와 무관 · 제목이 다르면 다른 프로젝트


def test_copy_text(res):
    lines = res["copy"].split("\n")
    assert lines[0] == "[hyper-design 판 노트] out=C:/o/out · 노트 2개 · 선 2개"
    assert lines[1] == '1. 가까운 화면=home · "첫 노트 / 둘째 줄"'
    assert lines[3] == "선:"
    assert "- 노트 1 → 노트 2 · 다음 단계로" in lines[4]
    assert lines[5] == "- 노트 1 → 화면 home(홈)"
    assert not res["copy"].startswith("[hyper-design 수정 요청]")          # '보내기' 요청문과 섞이지 않는다
