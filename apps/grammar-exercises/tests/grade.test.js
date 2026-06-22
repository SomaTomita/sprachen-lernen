import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, isCorrect, matchAllCorrect } from "../js/grade.js";

test("normalize: trim/小文字/空白圧縮", () => {
  assert.equal(normalize("  Ich   BIN  "), "ich bin");
});

test("normalize: ß を ss に、末尾ピリオド除去", () => {
  assert.equal(normalize("Ich heiße."), "ich heisse");
});

test("normalize: ? は保持、母音ウムラウトは保持", () => {
  assert.equal(normalize("Wie alt bist du?"), "wie alt bist du?");
  assert.equal(normalize("fährst"), "fährst");
});

test("isCorrect: 受理リストのいずれかに一致", () => {
  assert.equal(isCorrect("bist", ["bist"]), true);
  assert.equal(isCorrect("BIST", ["bist"]), true);
  assert.equal(isCorrect("ist", ["bist"]), false);
});

test("isCorrect: ß/ss と末尾ピリオドの揺れを吸収", () => {
  assert.equal(isCorrect("Ich heisse Anna", ["Ich heiße Anna."]), true);
});

test("isCorrect: 文全体（書き換え）", () => {
  assert.equal(isCorrect("bist du student?", ["Bist du Student?"]), true);
});

test("isCorrect: 空入力は不正解", () => {
  assert.equal(isCorrect("   ", ["bin"]), false);
});

test("matchAllCorrect: 全て正しい割り当ては true", () => {
  const pairs = [
    { left: "ich", right: "bin" },
    { left: "du", right: "bist" },
    { left: "wir", right: "sind" },
  ];
  const assignment = { ich: "bin", du: "bist", wir: "sind" };
  assert.equal(matchAllCorrect(pairs, assignment), true);
});

test("matchAllCorrect: 1つでも誤りなら false", () => {
  const pairs = [
    { left: "ich", right: "bin" },
    { left: "du", right: "bist" },
  ];
  const assignment = { ich: "bin", du: "sind" };
  assert.equal(matchAllCorrect(pairs, assignment), false);
});

test("matchAllCorrect: 空（未割り当て / pairs なし）は false", () => {
  const pairs = [
    { left: "ich", right: "bin" },
    { left: "du", right: "bist" },
  ];
  assert.equal(matchAllCorrect(pairs, {}), false);
  assert.equal(matchAllCorrect([], {}), false);
});
