import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getWrappedTextHeightEpsilon,
  shouldCompensateWrappedText,
} from './ios-wrapped-text-fix.ts';

test('compensates only wrapped iOS text', () => {
  assert.equal(shouldCompensateWrappedText('ios', 2), true);
  assert.equal(shouldCompensateWrappedText('ios', 1), false);
  assert.equal(shouldCompensateWrappedText('android', 3), false);
});

test('adds exactly one physical pixel of logical height', () => {
  assert.equal(getWrappedTextHeightEpsilon(3), 1 / 3);
  assert.equal(getWrappedTextHeightEpsilon(2), 0.5);
});
