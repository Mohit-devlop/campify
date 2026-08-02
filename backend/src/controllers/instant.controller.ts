import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function createInstant(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { mediaUrl, caption, isPublic, recipientIds } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!mediaUrl) {
      return res.status(400).json({ error: 'Media URL is required for an Instant' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const instant = await prisma.instant.create({
      data: {
        userId,
        mediaUrl,
        caption: caption || null,
        isPublic: isPublic !== undefined ? !!isPublic : true,
        expiresAt,
        recipients:
          isPublic === false && Array.isArray(recipientIds) && recipientIds.length > 0
            ? {
                create: recipientIds.map((rId: string) => ({
                  recipientId: rId,
                })),
              }
            : undefined,
      },
      include: {
        user: {
          select: {
            username: true,
            name: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        recipients: true,
      },
    });

    return res.status(201).json(instant);
  } catch (error) {
    console.error('Create instant error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteInstant(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const instant = await prisma.instant.findUnique({
      where: { id },
    });

    if (!instant) {
      return res.status(404).json({ error: 'Instant not found' });
    }

    if (instant.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.instant.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Instant deleted successfully' });
  } catch (error) {
    console.error('Delete instant error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getInstantsFeed(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get followed users
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // Fetch active instants
    // Visible if:
    // 1. It belongs to the current user (own instant).
    // 2. OR it is public AND the author is followed by the current user.
    // 3. OR it is private AND the author is followed AND the current user is a recipient.
    const instants = await prisma.instant.findMany({
      where: {
        expiresAt: { gt: new Date() },
        OR: [
          { userId: userId }, // Own instants
          {
            userId: { in: followingIds },
            OR: [
              { isPublic: true },
              {
                recipients: {
                  some: { recipientId: userId }
                }
              }
            ]
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        recipients: {
          select: {
            recipientId: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(instants);
  } catch (error) {
    console.error('Get instants feed error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
