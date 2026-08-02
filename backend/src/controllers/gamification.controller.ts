import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function getGamificationStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await prisma.userGamification.findUnique({
      where: { userId },
    });

    const achievements = await prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });

    const badges = await prisma.skillBadge.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Compute mock stats if not exists
    const currentStats = stats || {
      xpPoints: 0,
      level: 1,
      dailyStreak: 0,
      streakFrozen: false,
    };

    return res.status(200).json({
      stats: currentStats,
      achievements,
      badges,
    });
  } catch (error) {
    console.error('Get gamification stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch gamification stats' });
  }
}

export async function getLeaderboard(req: Request, res: Response) {
  try {
    const leaderboard = await prisma.userGamification.findMany({
      take: 10,
      orderBy: [
        { level: 'desc' },
        { xpPoints: 'desc' },
      ],
      include: {
        user: {
          select: {
            username: true,
            name: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    });

    const formatted = leaderboard.map((l, index) => ({
      rank: index + 1,
      username: l.user.username,
      name: l.user.name,
      avatarUrl: l.user.profile?.avatarUrl,
      level: l.level,
      xpPoints: l.xpPoints,
      dailyStreak: l.dailyStreak,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
}

export async function updateDailyStreak(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const stats = await prisma.userGamification.findUnique({
      where: { userId },
    });

    if (!stats) {
      // First time setting stats
      const newStats = await prisma.userGamification.create({
        data: {
          userId,
          xpPoints: 10,
          level: 1,
          dailyStreak: 1,
          lastActiveDate: now,
        },
      });
      return res.status(200).json({ message: 'Daily streak initialized!', stats: newStats });
    }

    const lastActive = new Date(stats.lastActiveDate);
    const startOfLastActive = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

    const diffTime = startOfToday.getTime() - startOfLastActive.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let updatedStats;

    if (diffDays === 1) {
      // Increment streak
      updatedStats = await prisma.userGamification.update({
        where: { userId },
        data: {
          dailyStreak: { increment: 1 },
          xpPoints: { increment: 15 }, // 15 XP streak reward
          lastActiveDate: now,
        },
      });

      // Log streak history
      await prisma.streakHistory.create({
        data: { userId, date: now },
      });

      // Check streak badges
      if (updatedStats.dailyStreak === 7) {
        await prisma.achievement.create({
          data: {
            userId,
            type: 'QUIZ_MASTER',
            title: 'Seven-Day Spark',
            description: 'Maintained a active login streak for 7 consecutive days',
          },
        });
      }
    } else if (diffDays > 1) {
      // Streak lost
      updatedStats = await prisma.userGamification.update({
        where: { userId },
        data: {
          dailyStreak: 1,
          lastActiveDate: now,
        },
      });
    } else {
      // Already claimed today
      updatedStats = stats;
    }

    return res.status(200).json({ message: 'Streak status computed', stats: updatedStats });
  } catch (error) {
    console.error('Update daily streak error:', error);
    return res.status(500).json({ error: 'Failed to update daily streak' });
  }
}
