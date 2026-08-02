import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { sendRealtimeNotification } from '../services/socket.service';
import { analyzeContent } from '../services/moderation.service';

export async function createReel(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { videoUrl, caption } = req.body;

    if (!userId || !videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const hashtags: string[] = [];
    if (caption) {
      const hashRegex = /#(\w+)/g;
      let match;
      while ((match = hashRegex.exec(caption)) !== null) {
        hashtags.push(match[1].toLowerCase());
      }
    }

    const reel = await prisma.reel.create({
      data: {
        userId,
        videoUrl,
        caption: caption || null,
        hashtags: hashtags.join(','), // SQLite serialization
      },
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

    const formattedReel = {
      ...reel,
      hashtags: reel.hashtags ? reel.hashtags.split(',') : [],
    };

    return res.status(201).json({ message: 'Reel created successfully', reel: formattedReel });
  } catch (error) {
    console.error('Create reel error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReels(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 5;
    const cursor = req.query.cursor as string;

    const reels = await prisma.reel.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            verified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        _count: {
          select: { likes: true },
        },
        likes: userId ? { where: { userId } } : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | undefined = undefined;
    if (reels.length > limit) {
      const nextReel = reels.pop();
      nextCursor = nextReel?.id;
    }

    const formatted = reels.map((r) => ({
      id: r.id,
      videoUrl: r.videoUrl,
      caption: r.caption,
      createdAt: r.createdAt,
      user: r.user,
      likesCount: r._count.likes,
      isLiked: userId ? r.likes.length > 0 : false,
      hashtags: r.hashtags ? r.hashtags.split(',') : [],
    }));

    return res.status(200).json({ reels: formatted, nextCursor });
  } catch (error) {
    console.error('Get reels error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function likeReel(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { reelId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const reel = await prisma.reel.findUnique({
      where: { id: reelId },
    });

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        reelId,
        postId: null,
        commentId: null,
      },
    });

    if (!existingLike) {
      await prisma.like.create({
        data: {
          userId,
          reelId,
        },
      });
    }

    if (reel.userId !== userId) {
      const notification = await prisma.notification.create({
        data: {
          receiverId: reel.userId,
          senderId: userId,
          type: 'LIKE',
          reelId,
        },
        include: {
          sender: {
            select: {
              username: true,
              name: true,
              profile: { select: { avatarUrl: true } },
            },
          },
        },
      });

      sendRealtimeNotification(reel.userId, notification);
    }

    return res.status(200).json({ message: 'Reel liked successfully' });
  } catch (error) {
    console.error('Like reel error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unlikeReel(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { reelId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.like.deleteMany({
      where: { userId, reelId },
    });

    return res.status(200).json({ message: 'Reel unliked successfully' });
  } catch (error) {
    console.error('Unlike reel error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function commentReel(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { reelId } = req.params;
    const { content, parentId } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const moderation = analyzeContent(content);
    if (moderation.isToxic) {
      return res.status(400).json({ error: `Comment flagged: ${moderation.reason}` });
    }

    const reel = await prisma.reel.findUnique({
      where: { id: reelId },
    });

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        reelId,
        content,
        parentId: parentId || null,
      },
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

    if (reel.userId !== userId) {
      const notification = await prisma.notification.create({
        data: {
          receiverId: reel.userId,
          senderId: userId,
          type: 'COMMENT',
          reelId,
          commentId: comment.id,
        },
        include: {
          sender: {
            select: {
              username: true,
              name: true,
              profile: { select: { avatarUrl: true } },
            },
          },
        },
      });

      sendRealtimeNotification(reel.userId, notification);
    }

    return res.status(201).json({ message: 'Comment posted successfully', comment });
  } catch (error) {
    console.error('Comment reel error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReelComments(req: Request, res: Response) {
  try {
    const { reelId } = req.params;

    const comments = await prisma.comment.findMany({
      where: {
        reelId,
        parentId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            verified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                verified: true,
                profile: { select: { avatarUrl: true } },
              },
            },
          },
        },
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ comments });
  } catch (error) {
    console.error('Get reel comments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


