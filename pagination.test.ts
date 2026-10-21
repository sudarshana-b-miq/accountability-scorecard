import assert from 'node:assert/strict';
import test from 'node:test';
import { clampPage, pageCount, paginate } from './src/utils/pagination.ts';

test('pagination shows ten resources at a time', () => {
  const rows = Array.from({ length: 23 }, (_, index) => index + 1);
  assert.deepEqual(paginate(rows, 1), rows.slice(0, 10));
  assert.deepEqual(paginate(rows, 2), rows.slice(10, 20));
  assert.deepEqual(paginate(rows, 3), rows.slice(20, 23));
});

test('pagination clamps invalid pages and always reports at least one page', () => {
  assert.equal(pageCount(0), 1);
  assert.equal(pageCount(21), 3);
  assert.equal(clampPage(9, 21), 3);
  assert.deepEqual(paginate([1, 2], 0), [1, 2]);
});
