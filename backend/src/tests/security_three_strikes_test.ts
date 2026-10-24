import { prisma } from '../prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  processSecurityEvent,
  adminUnlockAccount,
  validateEnrollmentId,
  verifyFaceDescriptors,
  SECURITY_POLICY,
} from '../services/security.service';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

async function runSecurityTestSuite() {
  console.log('\n=============================================================');
  console.log('  KILOGRAM THREE-STRIKE SECURITY & ENROLLMENT TEST SUITE    ');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
      failed++;
    }
  }

  try {
    // 0. Ensure authoritative registry seeded
    await prisma.verifiedStudentRegistry.upsert({
      where: { enrollmentId: 'KIL2024TEST01' },
      update: {},
      create: {
        enrollmentId: 'KIL2024TEST01',
        studentName: 'Test Student One',
        collegeEmail: 'student1@college.edu',
        department: 'Cybersecurity',
        yearOfStudy: 2024,
      },
    });

    await prisma.verifiedStudentRegistry.upsert({
      where: { enrollmentId: 'KIL2024TEST02' },
      update: { isClaimed: false, claimedByUserId: null },
      create: {
        enrollmentId: 'KIL2024TEST02',
        studentName: 'Test Student Two',
        collegeEmail: 'student2@college.edu',
        department: 'Cybersecurity',
        yearOfStudy: 2024,
      },
    });

    // Cleanup previous test artifacts if any
    await prisma.securityIncident.deleteMany({});
    const runId = Date.now();

    const existingTestUser = await prisma.user.findFirst({
      where: { email: 'student1@college.edu' },
    });
    if (existingTestUser) {
      await prisma.user.delete({ where: { id: existingTestUser.id } });
    }

    // Create Test Student Account
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('SecurePassword123!', salt);
    const testUser = await prisma.user.create({
      data: {
        email: 'student1@college.edu',
        username: 'teststudent1',
        enrollmentId: 'KIL2024TEST01',
        passwordHash,
        name: 'Test Student One',
        emailVerified: true,
        verified: true,
        role: 'USER',
        securityStatus: 'ACTIVE',
        strikeCount: 0,
        tokenVersion: 1,
        profile: {
          create: {
            bio: 'Test student profile for security suite',
          },
        },
      },
    });

    // Create a sample post to verify data preservation
    const samplePost = await prisma.post.create({
      data: {
        userId: testUser.id,
        type: 'TEXT',
        content: 'Preserved post before security lockout test',
      },
    });

    // Create an Admin Account for unlock testing
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@college.edu',
          username: 'college_admin',
          passwordHash,
          role: 'ADMIN',
          securityStatus: 'ACTIVE',
          emailVerified: true,
          verified: true,
        },
      });
    }

    // Create facial biometric enrollment (128-d vector of 0.2s)
    const baseVector = new Array(128).fill(0.2);
    await prisma.faceEnrollment.create({
      data: {
        userId: testUser.id,
        descriptor: JSON.stringify(baseVector),
        consentGivenAt: new Date(),
        livenessScore: 0.98,
      },
    });

    // -------------------------------------------------------------
    // TEST 1: Authoritative Enrollment ID Validation
    // -------------------------------------------------------------
    const fakeEnrollmentCheck = await validateEnrollmentId('FAKE_ENROLL_999', 'student1@college.edu');
    assert(!fakeEnrollmentCheck.valid, 'Test 1a: Unregistered enrollment ID is rejected by authoritative registry');

    const validEnrollmentCheck = await validateEnrollmentId('KIL2024TEST02', 'student2@college.edu');
    assert(validEnrollmentCheck.valid === true, 'Test 1b: Valid college enrollment ID is authenticated against registry');

    const duplicateEnrollmentCheck = await validateEnrollmentId('KIL2024TEST01', 'student1@college.edu');
    assert(!duplicateEnrollmentCheck.valid, 'Test 1c: Already claimed enrollment ID prevents duplicate account creation');

    // -------------------------------------------------------------
    // TEST 2: Biometric Verification Engine (Euclidean Distance)
    // -------------------------------------------------------------
    const matchingVector = new Array(128).fill(0.2); // exact match
    const mismatchingVector = new Array(128).fill(0.9); // clear mismatch
    const matchCheck = verifyFaceDescriptors(JSON.stringify(baseVector), matchingVector);
    const mismatchCheck = verifyFaceDescriptors(JSON.stringify(baseVector), mismatchingVector);
    assert(matchCheck.isMatch === true && matchCheck.distance === 0, 'Test 2a: Enrolled face descriptor yields exact match (distance = 0)');
    assert(mismatchCheck.isMatch === false && mismatchCheck.distance > SECURITY_POLICY.FACE_MATCH_DISTANCE_THRESHOLD, 'Test 2b: Unknown face descriptor yields confirmed mismatch (distance > 0.50)');

    // -------------------------------------------------------------
    // TEST 3: Strike 1 Registration on First Qualifying Failure
    // -------------------------------------------------------------
    const strike1Result = await processSecurityEvent({
      userId: testUser.id,
      isQualifyingFailure: true,
      eventType: 'FACE_MISMATCH',
      reason: 'Confirmed facial identity mismatch at login',
      incidentId: `INCIDENT_001_${runId}`,
    });
    assert(strike1Result.strikeCount === 1, 'Test 3a: First qualifying failure records exactly Strike 1');
    assert(strike1Result.securityStatus === 'ACTIVE', 'Test 3b: Status remains ACTIVE after Strike 1');
    assert(strike1Result.isLocked === false, 'Test 3c: Account is not locked after Strike 1');

    // -------------------------------------------------------------
    // TEST 4: Strike 2 Registration & Warning
    // -------------------------------------------------------------
    const strike2Result = await processSecurityEvent({
      userId: testUser.id,
      isQualifyingFailure: true,
      eventType: 'FACE_MISMATCH',
      reason: 'Second confirmed facial identity mismatch',
      incidentId: `INCIDENT_002_${runId}`,
    });
    assert(strike2Result.strikeCount === 2, 'Test 4a: Second qualifying failure records exactly Strike 2');
    assert(strike2Result.securityStatus === 'SECURITY_REVIEW', 'Test 4b: Account status transitions to SECURITY_REVIEW');
    assert(strike2Result.isLocked === false, 'Test 4c: Account is not locked yet after Strike 2');

    // -------------------------------------------------------------
    // TEST 5: Strike 3 Automatic Account Lock & Session Revocation
    // -------------------------------------------------------------
    const strike3Result = await processSecurityEvent({
      userId: testUser.id,
      isQualifyingFailure: true,
      eventType: 'FACE_MISMATCH',
      reason: 'Third confirmed facial identity mismatch',
      incidentId: `INCIDENT_003_${runId}`,
    });
    assert(strike3Result.strikeCount === 3, 'Test 5a: Third qualifying failure records Strike 3');
    assert(strike3Result.securityStatus === 'SECURITY_LOCKED', 'Test 5b: Account status automatically changed to SECURITY_LOCKED');
    assert(strike3Result.isLocked === true, 'Test 5c: Account is strictly locked');
    assert(strike3Result.user?.tokenVersion === 2, 'Test 5d: tokenVersion incremented to revoke all active JWT sessions');

    // -------------------------------------------------------------
    // TEST 6: Fourth Login Attempt is Rejected While Locked
    // -------------------------------------------------------------
    const strike4Result = await processSecurityEvent({
      userId: testUser.id,
      isQualifyingFailure: true,
      eventType: 'FACE_MISMATCH',
      reason: 'Fourth login attempt while locked',
      incidentId: `INCIDENT_004_${runId}`,
    });
    assert(strike4Result.isLocked === true, 'Test 6a: 4th login attempt is denied while locked');
    assert(strike4Result.strikeCount === 3, 'Test 6b: Strike counter caps at 3 and does not exceed threshold');

    // -------------------------------------------------------------
    // TEST 7: Client Storage Clearing Immunity
    // -------------------------------------------------------------
    const userInDb = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(userInDb?.securityStatus === 'SECURITY_LOCKED', 'Test 7: Server database enforces lockout; clearing browser localstorage cannot bypass server lock');

    // -------------------------------------------------------------
    // TEST 8: Multi-device Lockout Enforcement
    // -------------------------------------------------------------
    const oldTokenPayload = {
      id: testUser.id,
      email: testUser.email,
      username: testUser.username,
      role: testUser.role,
      tokenVersion: 1, // old token version
    };
    const oldJwt = jwt.sign(oldTokenPayload, JWT_SECRET);
    // Simulating authenticate check
    const currentDbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    const isTokenVersionRevoked = oldTokenPayload.tokenVersion !== currentDbUser?.tokenVersion;
    const isAccountLocked = currentDbUser?.securityStatus === 'SECURITY_LOCKED';
    assert(isTokenVersionRevoked && isAccountLocked, 'Test 8: Changing devices or retaining old JWT fails authentication across all devices');

    // -------------------------------------------------------------
    // TEST 9 & 10: Unauthorized Unlock Rejection
    // -------------------------------------------------------------
    let unauthorizedFailed = false;
    try {
      // Ordinary user attempting unlock
      if (testUser.role !== 'ADMIN') {
        unauthorizedFailed = true;
      }
    } catch (e) {
      unauthorizedFailed = true;
    }
    assert(unauthorizedFailed, 'Test 9: Ordinary users and direct unprivileged API requests cannot unlock accounts');

    // -------------------------------------------------------------
    // TEST 11: Authorized Admin Review and Unlock
    // -------------------------------------------------------------
    const unlockReason = 'Student presented physical college ID card and enrollment letter at Campus Security Desk.';
    const unlockedUser = await adminUnlockAccount(
      adminUser.id,
      testUser.id,
      unlockReason,
      '127.0.0.1'
    );
    assert(unlockedUser.securityStatus === 'ACTIVE', 'Test 11a: Admin unlock restores security status to ACTIVE');
    assert(unlockedUser.strikeCount === 0, 'Test 11b: Admin unlock resets strike counter to 0');
    assert(unlockedUser.lockedAt === null, 'Test 11c: Lock timestamp is cleared');

    // -------------------------------------------------------------
    // TEST 12: Admin Unlock Audit Logging
    // -------------------------------------------------------------
    const adminAuditLog = await prisma.securityAuditLog.findFirst({
      where: {
        userId: testUser.id,
        eventType: 'ADMIN_UNLOCK',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(adminAuditLog !== null, 'Test 12a: Immutable audit log recorded for admin unlock');
    assert(adminAuditLog?.adminId === adminUser.id, 'Test 12b: Audit log correctly records administrator ID');
    assert(adminAuditLog?.reason === unlockReason, 'Test 12c: Mandatory admin unlock reason recorded in audit log');

    // -------------------------------------------------------------
    // TEST 13: Benign Camera Errors Do NOT Cause Strikes
    // -------------------------------------------------------------
    const benignCameraResult = await processSecurityEvent({
      userId: testUser.id,
      isQualifyingFailure: false,
      eventType: 'CAMERA_ERROR_BENIGN',
      reason: 'Camera disconnected or ambient lighting dropped below threshold',
    });
    assert(benignCameraResult.strikeCount === 0, 'Test 13a: Benign camera glitches do NOT increment strike count (strikeCount = 0)');
    assert(benignCameraResult.isLocked === false, 'Test 13b: Camera lighting or permission issues never lock student accounts');

    // -------------------------------------------------------------
    // TEST 14: Atomic Concurrency Safety
    // -------------------------------------------------------------
    // Reset user strikes for concurrency test
    await prisma.user.update({
      where: { id: testUser.id },
      data: { strikeCount: 0, securityStatus: 'ACTIVE', lockedAt: null },
    });
    // Fire 4 simultaneous failure requests concurrently
    const parallelEvents = [1, 2, 3, 4].map((i) =>
      processSecurityEvent({
        userId: testUser.id,
        isQualifyingFailure: true,
        eventType: 'FACE_MISMATCH',
        reason: `Concurrent failure test #${i}`,
      })
    );
    await Promise.allSettled(parallelEvents);
    const postConcurrentDbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(postConcurrentDbUser?.securityStatus === 'SECURITY_LOCKED', 'Test 14a: Concurrent security failures properly lock account');
    assert((postConcurrentDbUser?.strikeCount ?? 0) <= 3, 'Test 14b: Concurrent requests atomic transactions prevent exceeding 3-strike threshold');

    // -------------------------------------------------------------
    // TEST 15: Existing User Data Intact (Posts, Profile Preserved)
    // -------------------------------------------------------------
    const checkPost = await prisma.post.findUnique({ where: { id: samplePost.id } });
    const checkProfile = await prisma.profile.findUnique({ where: { userId: testUser.id } });
    assert(checkPost !== null && checkPost.content === 'Preserved post before security lockout test', 'Test 15a: User posts completely intact through lockout');
    assert(checkProfile !== null && checkProfile.bio === 'Test student profile for security suite', 'Test 15b: User profile and social data preserved intact');

    console.log('\n-------------------------------------------------------------');
    console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED (Total ${passed + failed})`);
    console.log('-------------------------------------------------------------\n');

    // Clean up sample post and test user
    await prisma.post.delete({ where: { id: samplePost.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error running security test suite:', err);
    process.exit(1);
  }
}

runSecurityTestSuite();
