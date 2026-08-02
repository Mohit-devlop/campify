import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function getAdminStats(req: Request, res: Response) {
  try {
    const totalUsers = await prisma.user.count();
    const bannedUsers = await prisma.user.count({ where: { status: 'BANNED' } });
    const totalPosts = await prisma.post.count({ where: { isDraft: false } });
    const pendingReports = await prisma.report.count({ where: { status: 'PENDING' } });
    const totalReels = await prisma.reel.count();

    return res.status(200).json({
      totalUsers,
      bannedUsers,
      totalPosts,
      pendingReports,
      totalReels,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: { select: { avatarUrl: true } },
        _count: { select: { posts: true, followers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      role: u.role,
      status: u.status,
      verified: u.verified,
      createdAt: u.createdAt,
      avatarUrl: u.profile?.avatarUrl,
      postsCount: u._count.posts,
      followersCount: u._count.followers,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get admin users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateUserStatus(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { status } = req.body; // 'ACTIVE' or 'BANNED'

    if (status !== 'ACTIVE' && status !== 'BANNED') {
      return res.status(400).json({ error: 'Invalid status value. Must be ACTIVE or BANNED' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    return res.status(200).json({
      message: `User status updated to ${status} successfully.`,
      user: { id: updatedUser.id, username: updatedUser.username, status: updatedUser.status },
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReports(req: Request, res: Response) {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { username: true, email: true } },
        targetUser: { select: { username: true, status: true } },
        targetPost: { select: { id: true, content: true, mediaUrls: true } },
        targetComment: { select: { id: true, content: true } },
        targetReel: { select: { id: true, caption: true, videoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(reports);
  } catch (error) {
    console.error('Get admin reports error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function actionReport(req: Request, res: Response) {
  try {
    const { reportId } = req.params;
    const { action, status } = req.body; // action: 'DELETE_POST' | 'BAN_USER' | 'DISMISS'; status: 'RESOLVED' | 'DISMISSED'

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (action === 'BAN_USER' && report.targetUserId) {
      await prisma.user.update({
        where: { id: report.targetUserId },
        data: { status: 'BANNED' },
      });
    }

    if (action === 'DELETE_POST' && report.targetPostId) {
      await prisma.post.delete({
        where: { id: report.targetPostId },
      });
    }

    if (action === 'DELETE_POST' && report.targetCommentId) {
      await prisma.comment.delete({
        where: { id: report.targetCommentId },
      });
    }

    if (action === 'DELETE_POST' && report.targetReelId) {
      await prisma.reel.delete({
        where: { id: report.targetReelId },
      });
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: status || 'RESOLVED',
        actionTaken: action || 'RESOLVED',
      },
    });

    return res.status(200).json({
      message: 'Administrative action taken and report updated.',
      report: updatedReport,
    });
  } catch (error) {
    console.error('Action report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
