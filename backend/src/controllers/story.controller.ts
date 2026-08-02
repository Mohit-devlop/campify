import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function uploadStory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { mediaUrl, type, songName, songArtist, songUrl, isCloseFriends } = req.body;

    if (!userId || !mediaUrl) {
      return res.status(400).json({ error: 'Media URL is required' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const story = await prisma.story.create({
      data: {
        userId,
        mediaUrl,
        type: type || 'IMAGE',
        isCloseFriends: !!isCloseFriends,
        expiresAt,
        songName: songName || null,
        songArtist: songArtist || null,
        songUrl: songUrl || null,
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

    return res.status(201).json({ message: 'Story uploaded successfully', story });
  } catch (error) {
    console.error('Upload story error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStoriesFeed(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get following user IDs
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // Fetch active stories (expiry is in the future)
    const activeStories = await prisma.story.findMany({
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
        seen: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group stories by user
    const groupedStories = activeStories.reduce((acc: any[], story) => {
      let userGroup = acc.find((g) => g.user.id === story.userId);
      
      const storyFormatted = {
        id: story.id,
        mediaUrl: story.mediaUrl,
        type: story.type,
        isCloseFriends: story.isCloseFriends,
        createdAt: story.createdAt,
        isSeen: story.seen.length > 0,
        songName: story.songName,
        songArtist: story.songArtist,
        songUrl: story.songUrl,
      };

      if (userGroup) {
        userGroup.stories.push(storyFormatted);
        if (storyFormatted.isCloseFriends) {
          userGroup.isCloseFriends = true;
        }
        // If any story is unseen, the whole user is highlighted as unseen
        if (!storyFormatted.isSeen) {
          userGroup.hasUnseen = true;
        }
      } else {
        acc.push({
          user: story.user,
          hasUnseen: !storyFormatted.isSeen,
          isCloseFriends: storyFormatted.isCloseFriends,
          stories: [storyFormatted],
        });
      }
      return acc;
    }, []);

    return res.status(200).json(groupedStories);
  } catch (error) {
    console.error('Get stories feed error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markStorySeen(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { storyId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.storySeen.upsert({
      where: {
        userId_storyId: { userId, storyId },
      },
      create: { userId, storyId },
      update: {},
    });

    return res.status(200).json({ message: 'Story marked as seen' });
  } catch (error) {
    console.error('Mark story seen error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createHighlight(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { title, coverUrl, storyIds } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: 'Highlight title is required' });
    }

    const highlight = await prisma.storyHighlight.create({
      data: {
        userId,
        title,
        coverUrl: coverUrl || null,
        stories: {
          connect: storyIds?.map((id: string) => ({ id })) || [],
        },
      },
    });

    return res.status(201).json(highlight);
  } catch (error) {
    console.error('Create highlight error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUserHighlights(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const viewerId = req.user?.id;

    const highlights = await prisma.storyHighlight.findMany({
      where: { userId },
      include: {
        stories: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check if viewer is owner or close friend
    let isCloseFriend = false;
    if (viewerId === userId) {
      isCloseFriend = true;
    } else if (viewerId) {
      const check = await prisma.closeFriend.findUnique({
        where: {
          userId_friendId: { userId, friendId: viewerId }
        }
      });
      isCloseFriend = !!check;
    }

    const filtered = highlights.map((h) => {
      const visibleStories = h.stories.filter((s) => !s.isCloseFriends || isCloseFriend);
      return {
        ...h,
        stories: visibleStories,
      };
    }).filter((h) => h.stories.length > 0);

    return res.status(200).json(filtered);
  } catch (error) {
    console.error('Get highlights error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteStory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { storyId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this story' });
    }

    await prisma.story.delete({
      where: { id: storyId },
    });

    return res.status(200).json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getArchiveStories(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stories = await prisma.story.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(stories);
  } catch (error) {
    console.error('Get archive stories error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function editHighlight(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { highlightId } = req.params;
    const { title, coverUrl, storyIds } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const highlight = await prisma.storyHighlight.findUnique({
      where: { id: highlightId }
    });

    if (!highlight) {
      return res.status(404).json({ error: 'Highlight not found' });
    }

    if (highlight.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this highlight' });
    }

    const updated = await prisma.storyHighlight.update({
      where: { id: highlightId },
      data: {
        title: title !== undefined ? title : undefined,
        coverUrl: coverUrl !== undefined ? coverUrl : undefined,
        stories: storyIds ? {
          set: storyIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        stories: true
      }
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Edit highlight error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteHighlight(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { highlightId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const highlight = await prisma.storyHighlight.findUnique({
      where: { id: highlightId }
    });

    if (!highlight) {
      return res.status(404).json({ error: 'Highlight not found' });
    }

    if (highlight.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this highlight' });
    }

    await prisma.storyHighlight.delete({
      where: { id: highlightId }
    });

    return res.status(200).json({ message: 'Highlight deleted successfully' });
  } catch (error) {
    console.error('Delete highlight error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
