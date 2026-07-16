import assert from 'node:assert/strict';
import test from 'node:test';
import { bootstrapAuth } from './auth-bootstrap.ts';

const sessionUser = {
  id: 1,
  username: 'guest_shook-e2e-device',
  email: null,
  role: 'tester',
  isGuest: true,
};

test('reuses a valid server session without guest login', async () => {
  let guestLoginCalls = 0;
  const result = await bootstrapAuth({
    hasCachedAuth: true,
    getCurrentUser: async () => ({ success: true, data: sessionUser, status: 200 }),
    getDeviceId: async () => 'unused',
    createGuestAccount: async () => {
      guestLoginCalls += 1;
      return sessionUser;
    },
  });

  assert.equal(result.source, 'session');
  assert.equal(guestLoginCalls, 0);
});

test('creates the deterministic guest session after a 401', async () => {
  const result = await bootstrapAuth({
    hasCachedAuth: true,
    getCurrentUser: async () => ({ success: false, status: 401 }),
    getDeviceId: async () => 'shook-e2e-device',
    createGuestAccount: async (deviceId) => {
      assert.equal(deviceId, 'shook-e2e-device');
      return sessionUser;
    },
  });

  assert.equal(result.source, 'guest');
});

test('keeps cached auth during an offline relaunch without attempting guest login', async () => {
  let guestLoginCalls = 0;
  const result = await bootstrapAuth({
    hasCachedAuth: true,
    getCurrentUser: async () => ({ success: false }),
    getDeviceId: async () => 'unused',
    createGuestAccount: async () => {
      guestLoginCalls += 1;
      return sessionUser;
    },
  });

  assert.equal(result.source, 'cache');
  assert.equal(guestLoginCalls, 0);
});

test('keeps cached auth on a server error instead of switching accounts', async () => {
  let guestLoginCalls = 0;
  const result = await bootstrapAuth({
    hasCachedAuth: true,
    getCurrentUser: async () => ({ success: false, status: 500 }),
    getDeviceId: async () => 'unused',
    createGuestAccount: async () => {
      guestLoginCalls += 1;
      return sessionUser;
    },
  });

  assert.equal(result.source, 'cache');
  assert.equal(guestLoginCalls, 0);
});

test('attempts guest login when there is no cached auth', async () => {
  const result = await bootstrapAuth({
    hasCachedAuth: false,
    getCurrentUser: async () => ({ success: false }),
    getDeviceId: async () => 'shook-e2e-device',
    createGuestAccount: async () => sessionUser,
  });

  assert.equal(result.source, 'guest');
});
