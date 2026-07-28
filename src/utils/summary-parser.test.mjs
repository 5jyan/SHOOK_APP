import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSummary } from './summary-parser.ts';

const wrappedTextRegressionSummary = [
  '핵심 내용',
  '1. 지정학 완화와 유가 하락, 그러나 증시 불안 지속 [00:10]',
  '- 미국과 이란은 3일 연속 공격을 자제하며 긴장이 다소 완화됐고, 유가도 소폭 내려옴',
  '- 다만 전체 증시 분위기를 바꿀 만큼 강한 개선은 아니라는 평가',
  '- 한국 증시는 야간선물 **6.58% 하락**으로 내일도 큰 변동성과 **사이드카** 가능성이 언급됨',
].join('\n');

test('preserves the complete wrapped-text regression bullet without blank items', () => {
  const parsed = parseSummary(wrappedTextRegressionSummary);

  assert.equal(parsed.sections.length, 1);
  assert.deepEqual(parsed.sections[0]?.bullets, [
    '미국과 이란은 3일 연속 공격을 자제하며 긴장이 다소 완화됐고, 유가도 소폭 내려옴',
    '다만 전체 증시 분위기를 바꿀 만큼 강한 개선은 아니라는 평가',
    '한국 증시는 야간선물 **6.58% 하락**으로 내일도 큰 변동성과 **사이드카** 가능성이 언급됨',
  ]);
  assert.equal(parsed.sections[0]?.bullets.some((bullet) => bullet.length === 0), false);
});
