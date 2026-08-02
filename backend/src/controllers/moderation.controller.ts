import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function reportContent(req: Request, res: Response) {
  try {
    const reporterId = req.user?.id;
    const { targetUserId, targetPostId, targetCommentId, targetReelId, reason } = req.body;

    if (!reporterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Reason for report is required' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        targetUserId: targetUserId || null,
        targetPostId: targetPostId || null,
        targetCommentId: targetCommentId || null,
        targetReelId: targetReelId || null,
        reason,
      },
    });

    return res.status(201).json({
      message: 'Report submitted successfully. Administrators will review it.',
      report,
    });
  } catch (error) {
    console.error('Report content error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
