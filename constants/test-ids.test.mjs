import assert from 'node:assert/strict';
import test from 'node:test';
import { TEST_IDS } from './test-ids.ts';

test('uses stable cross-platform IDs for core screens and tabs', () => {
  assert.deepEqual(Object.values(TEST_IDS.screens), [
    'screen-channels',
    'screen-channel-search',
    'screen-summaries',
    'screen-summary-detail',
    'screen-video-request',
    'screen-settings',
  ]);
  assert.deepEqual(Object.values(TEST_IDS.tabs), [
    'tab-channels',
    'tab-summaries',
    'tab-video-request',
    'tab-settings',
  ]);
});

test('builds deterministic domain IDs instead of list-index IDs', () => {
  assert.equal(TEST_IDS.channels.row('e2e-channel-existing'), 'channel-row-e2e-channel-existing');
  assert.equal(TEST_IDS.channels.add('e2e-channel-add-target'), 'channel-add-e2e-channel-add-target');
  assert.equal(TEST_IDS.channels.delete('e2e-channel-existing'), 'channel-delete-e2e-channel-existing');
  assert.equal(TEST_IDS.summaries.row('e2e-video-completed-latest'), 'summary-row-e2e-video-completed-latest');
  assert.equal(TEST_IDS.summaries.detail('e2e-video-completed-latest'), 'summary-detail-e2e-video-completed-latest');
  assert.equal(TEST_IDS.summaries.bulletText('section-4', 1), 'summary-bullet-section-4-1-text');
});
