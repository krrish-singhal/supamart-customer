import test from 'node:test';
import assert from 'node:assert/strict';
import { getDynamicScheduleDays, MASTER_STORE_SLOTS } from '../src/utils/redeliverySchedule.js';

test('getDynamicScheduleDays: Night time (8:00 PM) offers only valid future slots without past slots for Today', () => {
  // Simulate 8:00 PM (20:00)
  const nightTime = new Date('2026-11-02T20:00:00');
  const days = getDynamicScheduleDays(nightTime);

  assert.ok(days.length >= 3, 'Should provide at least 3 days');
  // At 8:00 PM, slots like 9-11 AM, 11-1 PM, 2-4 PM, 4-6 PM, 6-8 PM must NOT appear for Today
  const today = days.find((d) => d.id === 'Today');
  if (today) {
    assert.ok(!today.slots.includes('9:00 AM – 11:00 AM'));
    assert.ok(!today.slots.includes('11:00 AM – 1:00 PM'));
    assert.ok(!today.slots.includes('2:00 PM – 4:00 PM'));
    assert.ok(!today.slots.includes('4:00 PM – 6:00 PM'));
    assert.ok(!today.slots.includes('6:00 PM – 8:00 PM'));
  } else {
    // If today is past, the first available day is Tomorrow
    assert.equal(days[0].id, 'Tomorrow');
  }

  // Tomorrow must have all operating slots
  const tomorrow = days.find((d) => d.id === 'Tomorrow');
  assert.ok(tomorrow, 'Tomorrow should be available');
  assert.equal(tomorrow.slots.length, MASTER_STORE_SLOTS.length);
  assert.ok(tomorrow.slots.includes('9:00 AM – 11:00 AM'));
});

test('getDynamicScheduleDays: Late night (8:30 PM) auto-switches to Tomorrow with all daytime slots', () => {
  const lateNight = new Date('2026-11-02T20:30:00');
  const days = getDynamicScheduleDays(lateNight);

  const today = days.find((d) => d.id === 'Today');
  assert.equal(today, undefined, 'Today must not be offered when all store slots are over');
  assert.equal(days[0].id, 'Tomorrow');
  assert.equal(days[0].slots[0], '9:00 AM – 11:00 AM');
});

test('getDynamicScheduleDays: Morning time (8:00 AM) offers all upcoming slots for Today', () => {
  const morningTime = new Date('2026-11-02T08:00:00');
  const days = getDynamicScheduleDays(morningTime);

  const today = days.find((d) => d.id === 'Today');
  assert.ok(today, 'Today must be offered in the morning');
  assert.equal(today.slots.length, MASTER_STORE_SLOTS.length, 'All slots should be open in the early morning');
  assert.ok(today.slots.includes('9:00 AM – 11:00 AM'));
  assert.ok(today.slots.includes('4:00 PM – 6:00 PM'));
  assert.ok(today.slots.includes('8:00 PM – 10:00 PM'));
});
