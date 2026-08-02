import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { analyzeContent } from '../services/moderation.service';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    failedTests++;
    console.log(`  ✗ [FAIL] ${message}`);
  }
}

async function testPasswordHashing() {
  console.log('\n--- Running Password Hashing Tests ---');
  const password = 'PasswordSecure123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  assert(hash !== password, 'Hash should not match original password plain text');
  
  const isMatch = await bcrypt.compare(password, hash);
  assert(isMatch === true, 'Matching password should match hash');

  const isMismatch = await bcrypt.compare('wrong-password', hash);
  assert(isMismatch === false, 'Wrong password should fail match checks');
}

function testJwtTokens() {
  console.log('\n--- Running JWT Session Tests ---');
  const secret = 'test-secret-key';
  const payload = { id: 'user-123', email: 'test@kilogram.com', role: 'USER' };

  const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });
  assert(!!accessToken, 'Access token string should be successfully generated');

  const decoded: any = jwt.verify(accessToken, secret);
  assert(decoded.id === payload.id, 'Decoded user ID should match payload');
  assert(decoded.role === payload.role, 'Decoded user role should match payload');
}

function testContentModeration() {
  console.log('\n--- Running Content Moderation Tests ---');
  
  const cleanResult = analyzeContent('Having a great morning coding on Next.js! #developer');
  assert(cleanResult.isToxic === false, 'Friendly caption should pass moderation scans');

  const toxicResult = analyzeContent('Go buy cheap followers now at http://win-iphone.com dm me to win!');
  assert(toxicResult.isToxic === true, 'Spam content and URLs should be flagged toxic');
  assert(toxicResult.score > 0.7, 'Toxicity score should be above threshold');

  const forbiddenResult = analyzeContent('I hate you so much go kill yourself right now');
  assert(forbiddenResult.isToxic === true, 'Hate speech and self-harm keywords should be flagged');
  assert(forbiddenResult.reason?.includes('forbidden') || false, 'Flag reason should cite forbidden terms');
}

async function runAllTests() {
  console.log('==========================================');
  console.log('  Kilogram Automated Test Runner     ');
  console.log('==========================================');

  try {
    await testPasswordHashing();
    testJwtTokens();
    testContentModeration();

    console.log('\n==========================================');
    console.log(`  Test Summary:`);
    console.log(`  Total Passed: ${passedTests}`);
    console.log(`  Total Failed: ${failedTests}`);
    console.log('==========================================\n');
  } catch (error) {
    console.error('Test runner encountered a critical error:', error);
  }
}

runAllTests();
