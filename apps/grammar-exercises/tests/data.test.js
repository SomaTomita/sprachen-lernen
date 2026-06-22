import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { isCorrect, matchAllCorrect } from "../js/grade.js";

// データ駆動：data/NN.json を全て検証対象にする（新レッスン追加時にこのテストは無改変でよい）。
const lessons = readdirSync(new URL("../data/", import.meta.url))
  .filter((f) => /^\d+\.json$/.test(f))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

for (const id of lessons) {
  const data = JSON.parse(
    readFileSync(new URL(`../data/${id}.json`, import.meta.url)),
  );

  test(`${id}: トップ構造`, () => {
    assert.equal(data.lesson, id);
    assert.ok(typeof data.title === "string" && data.title.length > 0);
    assert.ok(Array.isArray(data.exercises) && data.exercises.length >= 20);
  });

  test(`${id}: テンポ ── match と instant choice を含み、序盤6問は“サクサク”系`, () => {
    const isQuick = (ex) =>
      ex.type === "match" || (ex.type === "choice" && ex.instant === true);

    // 少なくとも1つの match
    assert.ok(
      data.exercises.some((e) => e.type === "match"),
      "match が無い",
    );
    // 少なくとも1つの instant choice
    assert.ok(
      data.exercises.some((e) => e.type === "choice" && e.instant === true),
      "instant な choice が無い",
    );
    // 序盤6問はすべて match か instant choice
    for (const ex of data.exercises.slice(0, 6)) {
      assert.ok(
        isQuick(ex),
        `序盤6問はサクサク系(match / instant choice)であること: ${ex.type}`,
      );
    }
  });

  test(`${id}: 各問題が型ごとの必須項目と explain を持つ`, () => {
    for (const ex of data.exercises) {
      assert.ok(ex.prompt, "prompt 必須");
      assert.ok(ex.explain, "explain 必須");
      if (ex.type === "fill") {
        assert.ok(ex.blanks.every((b) => b.accept && b.accept.length));
      } else if (ex.type === "table") {
        const cells = ex.rows.flatMap((r) => r.cells);
        const blanks = cells.filter((c) => typeof c === "object");
        assert.ok(blanks.length >= 1);
        assert.ok(blanks.every((c) => c.accept && c.accept.length));
      } else if (ex.type === "choice") {
        assert.ok(Array.isArray(ex.options) && ex.options.length >= 2);
        assert.ok(ex.answer >= 0 && ex.answer < ex.options.length);
        // instant は任意。あるなら boolean。
        if ("instant" in ex) assert.equal(typeof ex.instant, "boolean");
      } else if (ex.type === "transform") {
        assert.ok(ex.accept && ex.accept.length);
      } else if (ex.type === "match") {
        assert.ok(Array.isArray(ex.pairs) && ex.pairs.length >= 1, "pairs は非空配列");
        assert.ok(
          ex.pairs.every(
            (p) =>
              typeof p.left === "string" &&
              p.left.length > 0 &&
              typeof p.right === "string" &&
              p.right.length > 0,
          ),
          "各 pair は非空文字列の left / right を持つ",
        );
      } else if (ex.type === "free") {
        assert.ok(typeof ex.answer === "string" && ex.answer.length > 0);
      } else {
        assert.fail(`未知の type: ${ex.type}`);
      }
    }
  });

  test(`${id}: 自動採点タイプは「想定正解」が自身の採点を通る`, () => {
    for (const ex of data.exercises) {
      if (ex.type === "fill") {
        for (const b of ex.blanks) {
          assert.ok(isCorrect(b.accept[0], b.accept));
        }
      } else if (ex.type === "table") {
        for (const r of ex.rows)
          for (const c of r.cells)
            if (typeof c === "object") assert.ok(isCorrect(c.accept[0], c.accept));
      } else if (ex.type === "transform") {
        assert.ok(isCorrect(ex.accept[0], ex.accept));
      } else if (ex.type === "match") {
        assert.ok(
          matchAllCorrect(
            ex.pairs,
            Object.fromEntries(ex.pairs.map((p) => [p.left, p.right])),
          ),
        );
      }
    }
  });

  test(`${id}: 全タイプを少なくとも1つ含む`, () => {
    const types = new Set(data.exercises.map((e) => e.type));
    for (const t of ["fill", "table", "choice", "transform", "free"]) {
      assert.ok(types.has(t), `${t} が無い`);
    }
  });
}
