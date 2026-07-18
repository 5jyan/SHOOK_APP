import assert from 'node:assert/strict';
import test from 'node:test';

import { PushRegistrationCoordinator } from './push-registration-coordinator.ts';

test('joins concurrent registration requests for the same token', async () => {
  const coordinator = new PushRegistrationCoordinator();
  let calls = 0;
  let finishRegistration;
  const registration = new Promise((resolve) => {
    finishRegistration = resolve;
  });
  const register = () => {
    calls += 1;
    return registration;
  };

  const first = coordinator.run('user:device:token', register);
  const second = coordinator.run('user:device:token', register);
  assert.equal(calls, 1);

  finishRegistration(true);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
});

test('skips a repeated successful registration but honors force', async () => {
  const coordinator = new PushRegistrationCoordinator();
  let calls = 0;
  const register = async () => {
    calls += 1;
    return true;
  };

  await coordinator.run('user:device:token', register);
  await coordinator.run('user:device:token', register);
  await coordinator.run('user:device:token', register, true);

  assert.equal(calls, 2);
});

test('allows retry after a failed registration and reset after logout', async () => {
  const coordinator = new PushRegistrationCoordinator();
  let calls = 0;
  const register = async () => {
    calls += 1;
    return calls > 1;
  };

  assert.equal(await coordinator.run('user:device:token', register), false);
  assert.equal(await coordinator.run('user:device:token', register), true);
  coordinator.reset();
  assert.equal(await coordinator.run('user:device:token', register), true);
  assert.equal(calls, 3);
});
