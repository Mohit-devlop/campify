import { prisma } from '../prisma/client';

// =========================================================================
// SECURITY POLICY CONFIGURATION & DEFAULTS
// =========================================================================
export const SECURITY_POLICY = {
  // Max allowed security failures before account lockout
  MAX_STRIKES: 3,
  // Rolling time window for counting strikes (in milliseconds: 24 hours)
  STRIKE_WINDOW_MS: 24 * 60 * 60 * 1000,
  // Facial verification Euclidean distance matching threshold (lower is more similar)
  // Distance <= 0.50 indicates verified match; > 0.50 indicates identity mismatch
  FACE_MATCH_DISTANCE_THRESHOLD: 0.50,
  // Minimum required liveness confidence score
  MIN_LIVENESS_SCORE: 0.75,
  // Grace period retries for continuous verification before qualifying failure
  CONTINUOUS_GRACE_RETRIES: 3,
};

// =========================================================================
// 1. BIOMETRIC FACIAL VERIFICATION ENGINE (EUCLIDEAN & COSINE)
// =========================================================================
export function computeEuclideanDistance(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length || vec1.length === 0) {
    return 1.0; // max distance / mismatch
  }
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function computeCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length || vec1.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    normA += vec1[i] * vec1[i];
    normB += vec2[i] * vec2[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compares incoming face descriptor against stored enrollment descriptor
 */
export function verifyFaceDescriptors(
  enrolledDescriptorJson: string,
  probeDescriptor: number[]
): { isMatch: boolean; distance: number; similarity: number } {
  try {
    const enrolledVec = JSON.parse(enrolledDescriptorJson) as number[];
    if (!Array.isArray(enrolledVec) || enrolledVec.length !== probeDescriptor.length) {
      return { isMatch: false, distance: 1.0, similarity: 0 };
    }

    const distance = computeEuclideanDistance(enrolledVec, probeDescriptor);
    const similarity = computeCosineSimilarity(enrolledVec, probeDescriptor);

    const isMatch = distance <= SECURITY_POLICY.FACE_MATCH_DISTANCE_THRESHOLD;
    return { isMatch, distance, similarity };
  } catch (err) {
    console.error('Face descriptor comparison error:', err);
    return { isMatch: false, distance: 1.0, similarity: 0 };
  }
}

// =========================================================================
// 2. COLLEGE ENROLLMENT ID VERIFICATION
// =========================================================================
export async function validateEnrollmentId(
  enrollmentId: string,
  email: string
): Promise<{ valid: boolean; reason?: string; student?: any }> {
  const cleanId = enrollmentId.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check if enrollment exists in the authoritative registry
  const student = await prisma.verifiedStudentRegistry.findUnique({
    where: { enrollmentId: cleanId },
  });

  if (!student) {
    return {
      valid: false,
      reason: `Enrollment ID '${cleanId}' is not found in the authoritative college student registry. Please provide a registered college enrollment ID.`,
    };
  }

  // 2. Check email correlation (if college registry records institutional email)
  if (student.collegeEmail && student.collegeEmail.toLowerCase() !== cleanEmail) {
    return {
      valid: false,
      reason: `The provided email does not match the college records for enrollment ID '${cleanId}'. Institutional email verification required.`,
    };
  }

  // 3. Check if this enrollment ID has already been claimed by another registered user
  const existingUser = await prisma.user.findFirst({
    where: { enrollmentId: cleanId },
  });

  if (existingUser || student.isClaimed) {
    return {
      valid: false,
      reason: `Enrollment ID '${cleanId}' has already been registered to an account. Only one verified account per student is permitted.`,
    };
  }

  return { valid: true, student };
}

// =========================================================================
// 3. THREE-STRIKE INCIDENT PROCESSING (ATOMIC TRANSACTIONS)
// =========================================================================

export interface RecordSecurityEventParams {
  userId: string;
  isQualifyingFailure: boolean; // true for confirmed mismatch / liveness fail; false for benign camera errors
  eventType: 'FACE_MISMATCH' | 'LIVENESS_FAILURE' | 'CAMERA_ERROR_BENIGN' | 'CONTINUOUS_CHECK_MISMATCH';
  reason: string;
  incidentId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export async function processSecurityEvent(params: RecordSecurityEventParams) {
  const { userId, isQualifyingFailure, eventType, reason, incidentId, ipAddress, userAgent, metadata } = params;

  // 1. Anti-replay & Idempotency check
  if (incidentId) {
    const existingIncident = await prisma.securityIncident.findUnique({
      where: { incidentId },
    });
    if (existingIncident) {
      // Already processed this exact incident, return current user state without double counting
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      return {
        alreadyProcessed: true,
        user: currentUser,
        strikeCount: currentUser?.strikeCount || 0,
        securityStatus: currentUser?.securityStatus || 'ACTIVE',
        isLocked: currentUser?.securityStatus === 'SECURITY_LOCKED',
        strikeAdded: false,
      };
    }

    // Save incident idempotency record
    await prisma.securityIncident.create({
      data: {
        incidentId,
        userId,
        eventType,
        processed: true,
      },
    });
  }

  // 2. Benign camera errors (lighting, frame drop, permission) NEVER count as strikes
  if (!isQualifyingFailure || eventType === 'CAMERA_ERROR_BENIGN') {
    await prisma.securityAuditLog.create({
      data: {
        userId,
        eventType: 'CAMERA_ERROR_BENIGN',
        reason: reason || 'Benign technical camera issue or frame drop (No strike recorded)',
        strikeNumber: 0,
        incidentId,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    return {
      strikeCount: user?.strikeCount || 0,
      securityStatus: user?.securityStatus || 'ACTIVE',
      strikeAdded: false,
      isLocked: user?.securityStatus === 'SECURITY_LOCKED',
      user,
    };
  }

  // 3. Atomic Strike Evaluation using Prisma Transaction with Row Locking
  return await prisma.$transaction(async (tx) => {
    // Acquire exclusive PostgreSQL row lock to strictly serialize concurrent requests
    await tx.$executeRaw`SELECT 1 FROM "User" WHERE id = ${userId} FOR UPDATE`;

    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // If already locked, do not increment further strikes, but log rejection event
    if (user.securityStatus === 'SECURITY_LOCKED') {
      await tx.securityAuditLog.create({
        data: {
          userId,
          eventType: 'LOGIN_REJECTED_LOCKED',
          reason: 'Verification attempted while account is locked',
          strikeNumber: 3,
          incidentId,
          ipAddress,
          userAgent,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      return {
        strikeCount: 3,
        securityStatus: 'SECURITY_LOCKED',
        strikeAdded: false,
        isLocked: true,
        user,
      };
    }

    // Check rolling time window
    const now = new Date();
    let currentStrikes = user.strikeCount;
    if (user.lastStrikeAt) {
      const msSinceLastStrike = now.getTime() - new Date(user.lastStrikeAt).getTime();
      if (msSinceLastStrike > SECURITY_POLICY.STRIKE_WINDOW_MS && currentStrikes < 3) {
        // Window expired, reset strike count
        currentStrikes = 0;
      }
    }

    const nextStrikeCount = Math.min(currentStrikes + 1, SECURITY_POLICY.MAX_STRIKES);
    let nextStatus = user.securityStatus;
    let eventName = `STRIKE_${nextStrikeCount}`;

    if (nextStrikeCount === 1) {
      nextStatus = 'ACTIVE';
    } else if (nextStrikeCount === 2) {
      nextStatus = 'SECURITY_REVIEW';
    } else if (nextStrikeCount >= SECURITY_POLICY.MAX_STRIKES) {
      nextStatus = 'SECURITY_LOCKED';
      eventName = 'STRIKE_3_LOCK';
    }

    // Update user record atomically
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        strikeCount: nextStrikeCount,
        lastStrikeAt: now,
        securityStatus: nextStatus,
        lockedAt: nextStrikeCount >= SECURITY_POLICY.MAX_STRIKES ? now : user.lockedAt,
        lockReason: nextStrikeCount >= SECURITY_POLICY.MAX_STRIKES ? reason : user.lockReason,
        // Invalidate all JWT tokens when locking account
        tokenVersion: nextStrikeCount >= SECURITY_POLICY.MAX_STRIKES ? user.tokenVersion + 1 : user.tokenVersion,
      },
    });

    // Record audit trail log
    await tx.securityAuditLog.create({
      data: {
        userId,
        eventType: eventName,
        reason,
        strikeNumber: nextStrikeCount,
        incidentId,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return {
      strikeCount: nextStrikeCount,
      securityStatus: nextStatus,
      strikeAdded: true,
      isLocked: nextStatus === 'SECURITY_LOCKED',
      user: updatedUser,
    };
  }, {
    timeout: 15000,
    maxWait: 10000,
  });
}

// =========================================================================
// 4. ADMIN UNLOCK & AUDIT RESTORATION
// =========================================================================
export async function adminUnlockAccount(
  adminId: string,
  targetUserId: string,
  reason: string,
  ipAddress?: string
) {
  if (!reason || reason.trim().length < 5) {
    throw new Error('Mandatory administrative reason is required to unlock an account.');
  }

  return await prisma.$transaction(async (tx) => {
    const targetUser = await tx.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    const previousStatus = targetUser.securityStatus;
    const previousStrikes = targetUser.strikeCount;

    // Restore user to ACTIVE with reset strikes and bumped tokenVersion (forces clean authentication)
    const restoredUser = await tx.user.update({
      where: { id: targetUserId },
      data: {
        securityStatus: 'ACTIVE',
        strikeCount: 0,
        lockedAt: null,
        lockReason: null,
        tokenVersion: targetUser.tokenVersion + 1,
      },
    });

    // Create immutable admin audit log record
    await tx.securityAuditLog.create({
      data: {
        userId: targetUserId,
        adminId,
        eventType: 'ADMIN_UNLOCK',
        reason: reason.trim(),
        strikeNumber: 0,
        ipAddress,
        metadata: JSON.stringify({
          previousStatus,
          previousStrikes,
          restoredAt: new Date().toISOString(),
        }),
      },
    });

    // Create student notification
    await tx.notification.create({
      data: {
        receiverId: targetUserId,
        senderId: adminId,
        type: 'SYSTEM',
      },
    });

    return restoredUser;
  });
}
