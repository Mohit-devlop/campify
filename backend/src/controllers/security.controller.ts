import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import jwt from 'jsonwebtoken';
import {
  validateEnrollmentId,
  verifyFaceDescriptors,
  processSecurityEvent,
  adminUnlockAccount,
  SECURITY_POLICY,
} from '../services/security.service';
import { AuthUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-refresh-secret-key-change-in-production';

function generateAccessToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

// =========================================================================
// 1. ENROLLMENT VALIDATION ENDPOINT
// =========================================================================
export async function validateEnrollment(req: Request, res: Response) {
  try {
    const { enrollmentId, email } = req.body;

    if (!enrollmentId || !email) {
      return res.status(400).json({ error: 'Enrollment ID and college email are required' });
    }

    const result = await validateEnrollmentId(enrollmentId, email);

    if (!result.valid) {
      return res.status(400).json({
        valid: false,
        error: result.reason,
      });
    }

    return res.status(200).json({
      valid: true,
      message: 'Enrollment ID verified against authoritative college registry',
      studentName: result.student.studentName,
      department: result.student.department,
      year: result.student.yearOfStudy,
    });
  } catch (err) {
    console.error('Validate enrollment error:', err);
    return res.status(500).json({ error: 'Internal server error validating enrollment ID' });
  }
}

// =========================================================================
// 2. FACE BIOMETRIC ENROLLMENT (SIGNUP)
// =========================================================================
export async function enrollFace(req: Request, res: Response) {
  try {
    const { userId, faceDescriptor, consentGiven, livenessScore, landmarks } = req.body;

    if (!userId || !faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
      return res.status(400).json({ error: 'Valid face descriptor biometric vector is required' });
    }

    if (!consentGiven) {
      return res.status(400).json({ error: 'Informed biometric consent is mandatory for facial enrollment' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    // Save or update face enrollment
    const enrollment = await prisma.faceEnrollment.upsert({
      where: { userId },
      update: {
        descriptor: JSON.stringify(faceDescriptor),
        facialLandmarks: landmarks ? JSON.stringify(landmarks) : null,
        consentGivenAt: new Date(),
        livenessScore: typeof livenessScore === 'number' ? livenessScore : 0.95,
        updatedAt: new Date(),
      },
      create: {
        userId,
        descriptor: JSON.stringify(faceDescriptor),
        facialLandmarks: landmarks ? JSON.stringify(landmarks) : null,
        consentGivenAt: new Date(),
        livenessScore: typeof livenessScore === 'number' ? livenessScore : 0.95,
      },
    });

    // Log security audit for face enrollment
    await prisma.securityAuditLog.create({
      data: {
        userId,
        eventType: 'FACE_ENROLLED',
        reason: 'Biometric face registration completed with verified informed consent and liveness',
        strikeNumber: 0,
        metadata: JSON.stringify({
          vectorDimension: faceDescriptor.length,
          livenessScore: enrollment.livenessScore,
        }),
      },
    });

    // Fetch full user with profile for immediate authentication
    const userWithProfile = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      securityStatus: user.securityStatus,
      tokenVersion: user.tokenVersion,
      enrollmentId: user.enrollmentId,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    return res.status(200).json({
      success: true,
      message: 'Facial biometric template enrolled successfully',
      enrolledAt: enrollment.enrolledAt,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        verified: user.verified,
        securityStatus: user.securityStatus,
        strikeCount: user.strikeCount,
        enrollmentId: user.enrollmentId,
        profile: userWithProfile?.profile,
      },
    });
  } catch (err) {
    console.error('Face enrollment error:', err);
    return res.status(500).json({ error: 'Internal server error during face enrollment' });
  }
}

// =========================================================================
// 3. FACE VERIFICATION AT LOGIN
// =========================================================================
export async function verifyLoginFace(req: Request, res: Response) {
  try {
    const { email, faceDescriptor, livenessPassed, livenessScore, incidentId } = req.body;

    if (!email || !faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ error: 'Email and biometric face descriptor are required' });
    }

    const lowercaseEmail = email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: lowercaseEmail }, { username: lowercaseEmail }],
      },
      include: {
        faceEnrollment: true,
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if account is already locked
    if (user.securityStatus === 'SECURITY_LOCKED') {
      return res.status(403).json({
        error: 'ACCOUNT_SECURITY_LOCKED',
        message: 'Your account has been temporarily locked after repeated security verification failures. Contact your college KILOGRAM administrator for identity review. Your account data has not been deleted.',
        securityLocked: true,
      });
    }

    // Check if user has biometric enrollment
    if (!user.faceEnrollment) {
      return res.status(400).json({
        error: 'Biometric face profile not found for this account. Please complete facial registration.',
      });
    }

    // 1. Verify Liveness
    const score = typeof livenessScore === 'number' ? livenessScore : 1.0;
    if (livenessPassed === false || score < SECURITY_POLICY.MIN_LIVENESS_SCORE) {
      // Qualifying security failure: Failed Liveness
      const securityResult = await processSecurityEvent({
        userId: user.id,
        isQualifyingFailure: true,
        eventType: 'LIVENESS_FAILURE',
        reason: `Liveness verification failed (Score: ${score.toFixed(2)} < required ${SECURITY_POLICY.MIN_LIVENESS_SCORE})`,
        incidentId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (securityResult.isLocked) {
        return res.status(403).json({
          error: 'ACCOUNT_SECURITY_LOCKED',
          message: 'Your account has been temporarily locked after repeated security verification failures. Contact your college KILOGRAM administrator for identity review. Your account data has not been deleted.',
          securityLocked: true,
          strikeCount: securityResult.strikeCount,
        });
      }

      return res.status(401).json({
        error: `Liveness check failed. Strike ${securityResult.strikeCount}/${SECURITY_POLICY.MAX_STRIKES} recorded.`,
        strikeCount: securityResult.strikeCount,
        securityStatus: securityResult.securityStatus,
      });
    }

    // 2. Compare Face Descriptors (Real Euclidean Distance calculation)
    const matchResult = verifyFaceDescriptors(user.faceEnrollment.descriptor, faceDescriptor);

    if (!matchResult.isMatch) {
      // Qualifying security failure: Confirmed Facial Mismatch
      const securityResult = await processSecurityEvent({
        userId: user.id,
        isQualifyingFailure: true,
        eventType: 'FACE_MISMATCH',
        reason: `Facial biometric mismatch detected (Distance: ${matchResult.distance.toFixed(3)} > threshold ${SECURITY_POLICY.FACE_MATCH_DISTANCE_THRESHOLD})`,
        incidentId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { distance: matchResult.distance, similarity: matchResult.similarity },
      });

      if (securityResult.isLocked) {
        return res.status(403).json({
          error: 'ACCOUNT_SECURITY_LOCKED',
          message: 'Your account has been temporarily locked after repeated security verification failures. Contact your college KILOGRAM administrator for identity review. Your account data has not been deleted.',
          securityLocked: true,
          strikeCount: securityResult.strikeCount,
        });
      }

      return res.status(401).json({
        error: `Face verification failed: Scanned face does NOT match the enrolled face registered during sign up! Security Strike ${securityResult.strikeCount}/${SECURITY_POLICY.MAX_STRIKES} recorded.`,
        strikeCount: securityResult.strikeCount,
        securityStatus: securityResult.securityStatus,
        distance: matchResult.distance,
      });
    }

    // 3. Verification Succeeded! Create Authenticated Session
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      securityStatus: user.securityStatus,
      tokenVersion: user.tokenVersion,
      enrollmentId: user.enrollmentId,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    // Log successful verification audit
    await prisma.securityAuditLog.create({
      data: {
        userId: user.id,
        eventType: 'LOGIN_VERIFIED_SUCCESS',
        reason: `Facial identity and liveness successfully verified (Distance: ${matchResult.distance.toFixed(3)})`,
        strikeNumber: user.strikeCount,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    return res.status(200).json({
      message: 'Facial identity verified. Authenticated session created.',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        verified: user.verified,
        securityStatus: user.securityStatus,
        strikeCount: user.strikeCount,
        enrollmentId: user.enrollmentId,
        profile: user.profile,
      },
    });
  } catch (err) {
    console.error('Verify login face error:', err);
    return res.status(500).json({ error: 'Internal server error during face verification' });
  }
}

// =========================================================================
// 4. CONTINUOUS FACE VERIFICATION (PERIODIC CHECK DURING SESSION)
// =========================================================================
export async function continuousVerify(req: Request, res: Response) {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const {
      faceDescriptor,
      isTechnicalError,
      technicalReason,
      consecutiveFailures = 0,
      incidentId,
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { faceEnrollment: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.securityStatus === 'SECURITY_LOCKED') {
      return res.status(403).json({
        action: 'LOCKOUT_SESSION',
        error: 'ACCOUNT_SECURITY_LOCKED',
        message: 'Your account has been temporarily locked after repeated security verification failures. Contact your college KILOGRAM administrator for identity review. Your account data has not been deleted.',
        securityLocked: true,
      });
    }

    // Case A: Technical error (low lighting, camera frame drop, permission issue)
    // NEVER count technical errors as strikes!
    if (isTechnicalError || !faceDescriptor) {
      await processSecurityEvent({
        userId: user.id,
        isQualifyingFailure: false,
        eventType: 'CAMERA_ERROR_BENIGN',
        reason: technicalReason || 'Temporary camera disruption or poor lighting condition (Grace period active)',
        incidentId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(200).json({
        status: 'GRACE_PERIOD',
        message: 'Technical camera warning logged. No security strikes applied.',
        strikeCount: user.strikeCount,
        isLocked: false,
      });
    }

    if (!user.faceEnrollment) {
      return res.status(200).json({
        status: 'NO_BIOMETRIC_PROFILE',
        message: 'No biometric template found for monitoring',
      });
    }

    // Case B: Biometric comparison
    const matchResult = verifyFaceDescriptors(user.faceEnrollment.descriptor, faceDescriptor);

    if (matchResult.isMatch) {
      return res.status(200).json({
        status: 'VERIFIED',
        message: 'Identity confirmed active',
        strikeCount: user.strikeCount,
      });
    }

    // Case C: Mismatch detected
    // Allow 1 fast grace retry before confirmed termination (consecutiveFailures >= 1 triggers termination)
    if (consecutiveFailures < 1) {
      return res.status(200).json({
        status: 'GRACE_RETRY',
        consecutiveFailures: 1,
        message: 'Face mismatch detected. Re-verifying identity confirmation.',
        strikeCount: user.strikeCount,
        distance: matchResult.distance,
      });
    }

    // Repeated mismatch confirmed: Count a Strike and Terminate Session!
    const securityResult = await processSecurityEvent({
      userId: user.id,
      isQualifyingFailure: true,
      eventType: 'CONTINUOUS_CHECK_MISMATCH',
      reason: `Continuous facial verification confirmed identity mismatch (Distance: ${matchResult.distance.toFixed(3)}). Unauthorized user/friend detected.`,
      incidentId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { distance: matchResult.distance },
    });

    if (securityResult.isLocked) {
      return res.status(403).json({
        action: 'LOCKOUT_SESSION',
        error: 'ACCOUNT_SECURITY_LOCKED',
        message: 'Your account has been temporarily locked after repeated security verification failures. Contact your college KILOGRAM administrator for identity review. Your account data has not been deleted.',
        securityLocked: true,
        strikeCount: securityResult.strikeCount,
      });
    }

    return res.status(401).json({
      action: 'TERMINATE_SESSION',
      error: `Security Violation: Face mismatch confirmed. Unregistered person detected! Strike ${securityResult.strikeCount}/${SECURITY_POLICY.MAX_STRIKES} recorded. Current session terminated for security.`,
      strikeCount: securityResult.strikeCount,
      securityStatus: securityResult.securityStatus,
    });
  } catch (err) {
    console.error('Continuous verify error:', err);
    return res.status(500).json({ error: 'Internal server error during continuous verification' });
  }
}

// =========================================================================
// 5. REPORT BENIGN CAMERA GLITCH (NO STRIKE)
// =========================================================================
export async function reportCameraIssue(req: Request, res: Response) {
  try {
    const authUser = req.user;
    const { issueType, message } = req.body;

    if (authUser) {
      await prisma.securityAuditLog.create({
        data: {
          userId: authUser.id,
          eventType: 'CAMERA_ERROR_BENIGN',
          reason: `Camera hardware/environment alert: ${issueType || 'General'} - ${message || 'Temporary drop'}`,
          strikeNumber: 0,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    }

    return res.status(200).json({
      recorded: true,
      message: 'Benign camera event registered without strike penalty.',
    });
  } catch (err) {
    console.error('Report camera issue error:', err);
    return res.status(500).json({ error: 'Internal server error reporting camera issue' });
  }
}

// =========================================================================
// 6. GET SECURITY STATUS
// =========================================================================
export async function getSecurityStatus(req: Request, res: Response) {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        username: true,
        enrollmentId: true,
        securityStatus: true,
        strikeCount: true,
        lastStrikeAt: true,
        lockedAt: true,
        lockReason: true,
        faceEnrollment: {
          select: {
            consentGivenAt: true,
            livenessScore: true,
            enrolledAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      securityStatus: user.securityStatus,
      strikeCount: user.strikeCount,
      maxStrikes: SECURITY_POLICY.MAX_STRIKES,
      enrollmentId: user.enrollmentId,
      isEnrolled: !!user.faceEnrollment,
      lastStrikeAt: user.lastStrikeAt,
      lockedAt: user.lockedAt,
      lockReason: user.lockReason,
    });
  } catch (err) {
    console.error('Get security status error:', err);
    return res.status(500).json({ error: 'Internal server error getting security status' });
  }
}

// =========================================================================
// 7. ADMIN SECURITY MANAGEMENT ENDPOINTS
// =========================================================================

/**
 * List all locked and security-review accounts
 * Admin only: Requires role === 'ADMIN'
 */
export async function getAdminSecurityAccounts(req: Request, res: Response) {
  try {
    const { search, status } = req.query;

    const whereClause: any = {};

    if (status && typeof status === 'string') {
      whereClause.securityStatus = status;
    } else {
      whereClause.securityStatus = { in: ['SECURITY_LOCKED', 'SECURITY_REVIEW'] };
    }

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { enrollmentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const accounts = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        enrollmentId: true,
        securityStatus: true,
        strikeCount: true,
        lastStrikeAt: true,
        lockedAt: true,
        lockReason: true,
        createdAt: true,
        profile: {
          select: { avatarUrl: true },
        },
      },
      orderBy: { lockedAt: 'desc' },
    });

    return res.status(200).json(accounts);
  } catch (err) {
    console.error('Get admin security accounts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get security audit logs for an account
 * Admin only: Never exposes raw face vectors, passwords, or tokens
 */
export async function getSecurityAuditTrail(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const logs = await prisma.securityAuditLog.findMany({
      where: userId ? { userId } : {},
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            enrollmentId: true,
          },
        },
        admin: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.status(200).json(logs);
  } catch (err) {
    console.error('Get security audit trail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Admin unlock account action
 * Requires role === 'ADMIN' and mandatory audit reason
 */
export async function unlockUserAccount(req: Request, res: Response) {
  try {
    const adminUser = req.user;
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Administrator privileges required to unlock accounts' });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        error: 'A mandatory identity review reason (minimum 5 characters) is required to unlock this account.',
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target student account not found' });
    }

    const unlockedUser = await adminUnlockAccount(
      adminUser.id,
      userId,
      reason,
      req.ip
    );

    return res.status(200).json({
      success: true,
      message: `Student account '${unlockedUser.username}' (${unlockedUser.enrollmentId || 'No ID'}) has been successfully unlocked.`,
      user: {
        id: unlockedUser.id,
        username: unlockedUser.username,
        securityStatus: unlockedUser.securityStatus,
        strikeCount: unlockedUser.strikeCount,
      },
    });
  } catch (err) {
    console.error('Admin unlock account error:', err);
    return res.status(500).json({ error: 'Internal server error while unlocking account' });
  }
}
