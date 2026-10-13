import assert from 'node:assert/strict';

async function testApiEndpoints() {
  console.log('Testing Next.js App Router API Route Handlers...');

  const { POST: signupHandler } = await import('../src/app/api/auth/signup/route.ts');
  const { POST: loginHandler } = await import('../src/app/api/auth/login/route.ts');
  const { POST: logoutHandler } = await import('../src/app/api/auth/logout/route.ts');

  const suffix = Date.now().toString(36);
  const testUser = {
    name: 'Sarah Connor',
    username: `sarah_${suffix}`,
    password: 'Terminator2026!',
    confirmPassword: 'Terminator2026!',
  };

  // 1. Test Signup with invalid password (mismatch)
  const reqMismatch = new Request('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...testUser, confirmPassword: 'DifferentPassword123!' }),
  });
  const resMismatch = await signupHandler(reqMismatch);
  assert.equal(resMismatch.status, 400, 'Password mismatch must return 400');
  const jsonMismatch = await resMismatch.json();
  assert.ok(jsonMismatch.fieldErrors?.confirmPassword, 'Must include confirmPassword field error');
  console.log('[PASS] API Signup rejects password mismatch with 400');

  // 2. Test Successful Signup
  const reqSignup = new Request('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const resSignup = await signupHandler(reqSignup);
  assert.equal(resSignup.status, 201, 'Valid signup must return 201 Created');
  const jsonSignup = await resSignup.json();
  assert.equal(jsonSignup.success, true);
  assert.equal(jsonSignup.user.username, testUser.username);
  console.log('[PASS] API Signup succeeds with 201 Created');

  // 3. Test Duplicate Username Rejection
  const reqDuplicate = new Request('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...testUser,
      username: testUser.username.toUpperCase(), // Case insensitive duplicate
    }),
  });
  const resDuplicate = await signupHandler(reqDuplicate);
  assert.equal(resDuplicate.status, 409, 'Duplicate username must return 409 Conflict');
  console.log('[PASS] API Signup rejects duplicate username with 409 Conflict');

  // 4. Test Login with wrong password
  const reqBadLogin = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUser.username,
      password: 'WrongPassword!',
    }),
  });
  const resBadLogin = await loginHandler(reqBadLogin);
  assert.equal(resBadLogin.status, 401, 'Bad credentials must return 401 Unauthorized');
  const jsonBadLogin = await resBadLogin.json();
  assert.equal(jsonBadLogin.error, 'Invalid username or password');
  console.log('[PASS] API Login rejects bad credentials with generic error');

  // 5. Test Login with valid credentials
  const reqGoodLogin = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUser.username,
      password: testUser.password,
    }),
  });
  const resGoodLogin = await loginHandler(reqGoodLogin);
  assert.equal(resGoodLogin.status, 200, 'Valid credentials must return 200 OK');
  const jsonGoodLogin = await resGoodLogin.json();
  assert.equal(jsonGoodLogin.success, true);
  assert.equal(jsonGoodLogin.user.username, testUser.username);
  console.log('[PASS] API Login succeeds with 200 OK');

  // 6. Test Logout
  const resLogout = await logoutHandler();
  assert.equal(resLogout.status, 200, 'Logout must return 200 OK');
  const jsonLogout = await resLogout.json();
  assert.equal(jsonLogout.success, true);
  console.log('[PASS] API Logout succeeds with 200 OK');

  console.log('\nAll API route handler tests passed successfully!\n');
}

testApiEndpoints().catch((err) => {
  console.error('API Test Suite Failed:', err);
  process.exit(1);
});
