import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function createNote(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { content, songName, songArtist, songUrl, mediaUrl, mediaType, isCloseFriends } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content cannot be empty' });
    }

    if (content.length > 60) {
      return res.status(400).json({ error: 'Note content cannot exceed 60 characters' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const note = await prisma.note.upsert({
      where: { userId },
      create: {
        userId,
        content: content.trim(),
        expiresAt,
        isCloseFriends: !!isCloseFriends,
        songName,
        songArtist,
        songUrl,
        mediaUrl,
        mediaType,
      },
      update: {
        content: content.trim(),
        expiresAt,
        isCloseFriends: !!isCloseFriends,
        createdAt: new Date(), // Reset creation time on edit
        songName,
        songArtist,
        songUrl,
        mediaUrl,
        mediaType,
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

    return res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteNote(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.note.deleteMany({
      where: { userId },
    });

    return res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getNotesFeed(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get users that current user follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // Fetch active notes of the current user AND followed users
    const notes = await prisma.note.findMany({
      where: {
        userId: { in: [...followingIds, userId] },
        expiresAt: { gt: new Date() },
        OR: [
          { isCloseFriends: false },
          { userId: userId },
          {
            user: {
              closeFriends: {
                some: { friendId: userId }
              }
            }
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(notes);
  } catch (error) {
    console.error('Get notes feed error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
