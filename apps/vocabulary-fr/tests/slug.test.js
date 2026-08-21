import test from 'node:test';
import assert from 'node:assert/strict';
import { slugId } from '../tools/slug.mjs';

test('strips diacritics + lowercases', () => {
  assert.equal(slugId('café', 'A1'), 'a1-cafe');
  assert.equal(slugId('één', 'A1'), 'a1-een');
  assert.equal(slugId('coördinatie', 'A2'), 'a2-coordinatie');
});
test('spaces/apostrophes → single hyphen, trimmed', () => {
  assert.equal(slugId("'s morgens", 'A1'), 'a1-s-morgens');
  assert.equal(slugId('twee--eiig', 'A1'), 'a1-twee-eiig');
});
