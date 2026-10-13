import assert from 'node:assert/strict';
import {
  createUser,
  findUserByUsername,
  findUserById,
  verifyUserCredentials,
  getUserTasks,
  createUserTask,
  updateUserTask,
  deleteUserTask,
  getUserHabits,
  createUserHabit,
  getUserGoals,
  createUserGoal,
  getUserFocusSessions,
  createUserFocusSession,
  getUserDailyLogs,
  upsertUserDailyLog,
} from '../src/lib/server-db.ts';

import {
  signSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from '../src/lib/session.ts';

async function runTests() {
  console.log('====================================================');
  console.log('  FLOWSTATE MULTI-USER AUTH & ISOLATION TEST SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // TEST 1: Registration using the 4 specified fields
  const suffix = Date.now().toString(36);
  const u1Name = 'Elena Rostova';
  const u1Username = `elena_${suffix}`;
  const u1Password = 'StrongPass2026!';

  test('1. User 1 registration with 4 required fields succeeds', () => {
    const user = createUser({
      name: u1Name,
      username: u1Username,
      password: u1Password,
    });
    assert.ok(user.id, 'User ID must be generated');
    assert.equal(user.full_name, u1Name);
    assert.equal(user.username, u1Username);
    assert.equal(typeof user.password_hash, 'undefined', 'password_hash must never be in public profile');
  });

  // TEST 2: Passwords stored strictly as secure hash, never plaintext
  test('2. Stored user has bcrypt password hash, plaintext never stored', () => {
    const stored = findUserByUsername(u1Username);
    assert.ok(stored, 'Stored user must be found');
    assert.notEqual(stored.password_hash, u1Password, 'Password must not be stored in plaintext');
    assert.ok(stored.password_hash.startsWith('$2'), 'Password hash must be valid bcrypt');
  });

  // TEST 3: Duplicate username rejected case-insensitively
  test('3. Duplicate username rejected case-insensitively', () => {
    const upperUsername = u1Username.toUpperCase();
    assert.throws(
      () => {
        createUser({
          name: 'Imposter Elena',
          username: upperUsername,
          password: 'AnotherPassword123!',
        });
      },
      /Username already taken/,
      'Must reject case-insensitive duplicate username'
    );
  });

  // TEST 4: Login with valid credentials succeeds
  test('4. Login with valid credentials succeeds (case-insensitive username)', () => {
    const loginResult = verifyUserCredentials(u1Username.toUpperCase(), u1Password);
    assert.ok(loginResult, 'Login must succeed with uppercase username');
    assert.equal(loginResult.username, u1Username);
  });

  // TEST 5: Login with invalid password rejected
  test('5. Login with invalid password fails with null/generic error', () => {
    const failedResult = verifyUserCredentials(u1Username, 'WrongPassword999!');
    assert.equal(failedResult, null, 'Must return null on incorrect password');
  });

  // TEST 6: Non-existent user login fails
  test('6. Login with non-existent user returns null', () => {
    const nonExistent = verifyUserCredentials('ghost_user_999999', 'AnyPassword123!');
    assert.equal(nonExistent, null, 'Must return null for unknown user');
  });

  // TEST 7: Session Token generation and cryptographic verification
  await asyncTest('7. Session Token creates tamper-proof HMAC-SHA256 JWT', async () => {
    const user1 = findUserByUsername(u1Username);
    const token = await signSessionToken({
      userId: user1.id,
      username: user1.username,
      name: user1.name,
    });
    assert.ok(token && token.split('.').length === 3, 'Must be valid 3-part JWT');

    const verified = await verifySessionToken(token);
    assert.ok(verified, 'Verification must succeed');
    assert.equal(verified.userId, user1.id);
    assert.equal(verified.username, user1.username);

    // Tampered token must fail verification
    const tampered = token.slice(0, -5) + 'XXXXX';
    const tamperedResult = await verifySessionToken(tampered);
    assert.equal(tamperedResult, null, 'Tampered token must be rejected');
  });

  // TEST 8: Multi-User Data Isolation - Creating User 2
  const u2Name = 'Marcus Vance';
  const u2Username = `marcus_${suffix}`;
  const u2Password = 'VanceMastery2026!';

  let u1;
  let u2;

  test('8. Register distinct User 2 with clean empty workspace', () => {
    u1 = findUserByUsername(u1Username);
    u2 = createUser({
      name: u2Name,
      username: u2Username,
      password: u2Password,
    });
    assert.notEqual(u1.id, u2.id, 'User IDs must be distinct');

    const u2Tasks = getUserTasks(u2.id);
    const u2Habits = getUserHabits(u2.id);
    const u2Goals = getUserGoals(u2.id);
    const u2Sessions = getUserFocusSessions(u2.id);

    assert.equal(u2Tasks.length, 0, 'New user tasks must be empty');
    assert.equal(u2Habits.length, 0, 'New user habits must be empty');
    assert.equal(u2Goals.length, 0, 'New user goals must be empty');
    assert.equal(u2Sessions.length, 0, 'New user focus sessions must be empty');
  });

  // TEST 9: User 1 creates private data in all domains
  test('9. User 1 creates private tasks, habits, goals, focus sessions, daily logs', () => {
    // Tasks
    const t1 = createUserTask(u1.id, { title: 'Elena Private Strategic Task', priority: 'urgent' });
    assert.equal(t1.user_id, u1.id);

    // Habits
    const h1 = createUserHabit(u1.id, { title: 'Elena Morning Meditation' });
    assert.equal(h1.user_id, u1.id);

    // Goals
    const g1 = createUserGoal(u1.id, { title: 'Elena Complete Q4 Roadmap' });
    assert.equal(g1.user_id, u1.id);

    // Focus Session
    const s1 = createUserFocusSession(u1.id, { planned_duration: 50 });
    assert.equal(s1.user_id, u1.id);

    // Daily Log
    const l1 = upsertUserDailyLog(u1.id, '2026-10-13', { productivity_score: 95, focus_hours: 4.5 });
    assert.equal(l1.user_id, u1.id);
  });

  // TEST 10: Strict isolation verification: User 2 CANNOT see or access User 1's data
  test('10. User 2 queries yield ZERO data from User 1 across all domains', () => {
    const u2Tasks = getUserTasks(u2.id);
    const u2Habits = getUserHabits(u2.id);
    const u2Goals = getUserGoals(u2.id);
    const u2Sessions = getUserFocusSessions(u2.id);
    const u2Logs = getUserDailyLogs(u2.id);

    assert.equal(u2Tasks.length, 0, 'User 2 must have 0 tasks');
    assert.equal(u2Habits.length, 0, 'User 2 must have 0 habits');
    assert.equal(u2Goals.length, 0, 'User 2 must have 0 goals');
    assert.equal(u2Sessions.length, 0, 'User 2 must have 0 focus sessions');
    assert.equal(u2Logs.length, 0, 'User 2 must have 0 daily logs');

    // User 1 sees their records
    const u1Tasks = getUserTasks(u1.id);
    assert.equal(u1Tasks.some((t) => t.title === 'Elena Private Strategic Task'), true);
  });

  // TEST 11: Cross-user mutation spoofing protection
  test('11. User 2 cannot modify or delete User 1 tasks by forging IDs', () => {
    const u1Tasks = getUserTasks(u1.id);
    const targetTaskId = u1Tasks[0].id;

    // User 2 attempts to update User 1's task
    const illegalUpdate = updateUserTask(u2.id, targetTaskId, { title: 'Hacked Title' });
    assert.equal(illegalUpdate, null, 'Cross-user update must return null');

    // Verify task unchanged
    const unchangedTask = getUserTasks(u1.id).find((t) => t.id === targetTaskId);
    assert.equal(unchangedTask.title, 'Elena Private Strategic Task', 'Task title must remain intact');

    // User 2 attempts to delete User 1's task
    const illegalDelete = deleteUserTask(u2.id, targetTaskId);
    assert.equal(illegalDelete, false, 'Cross-user deletion must return false');

    // Verify task still exists
    assert.equal(getUserTasks(u1.id).length, u1Tasks.length, 'Task count must not change');
  });

  console.log(`\n====================================================`);
  console.log(`  RESULTS: ${passed} / ${total} TESTS PASSED SUCCESSFULLY `);
  console.log(`====================================================\n`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
