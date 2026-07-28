import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getIOSMeasuredTextMinHeight,
  IOS_TEXT_LAYOUT_SAFETY_SLACK,
} from './ios-wrapped-text-fix.ts';

test('adds a one-point minHeight guard to measured iOS text', () => {
  assert.equal(IOS_TEXT_LAYOUT_SAFETY_SLACK, 1);
  assert.equal(getIOSMeasuredTextMinHeight('ios', 48), 49);
});

test('does not alter Android or invalid text measurements', () => {
  assert.equal(getIOSMeasuredTextMinHeight('android', 48), undefined);
  assert.equal(getIOSMeasuredTextMinHeight('ios', 0), undefined);
  assert.equal(getIOSMeasuredTextMinHeight('ios', Number.NaN), undefined);
});
