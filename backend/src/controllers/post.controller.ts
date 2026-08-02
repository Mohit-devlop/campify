import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { sendRealtimeNotification } from '../services/socket.service';
import { analyzeContent } from '../services/moderation.service';

export async function createPost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { content, mediaUrls, type, location, isDraft, scheduledFor, songName, songArtist, songUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (content) {
      const moderation = analyzeContent(content);
      if (moderation.isToxic) {
        return res.status(400).json({ error: `Content flagged: ${moderation.reason}` });
      }
    }

    // Extract hashtags and mentions
    const hashtags: string[] = [];
    const mentions: string[] = [];
    if (content) {
      const hashRegex = /#(\w+)/g;
      let match;
      while ((match = hashRegex.exec(content)) !== null) {
        hashtags.push(match[1].toLowerCase());
      }

      const mentionRegex = /@(\w+)/g;
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1].toLowerCase());
      }
    }

    const post = await prisma.post.create({
      data: {
        userId,
        type: type || 'TEXT',
        content: content || null,
        mediaUrls: JSON.stringify(mediaUrls || []), // SQLite serialization
        hashtags: hashtags.join(','),              // SQLite serialization
        mentions: mentions.join(','),              // SQLite serialization
        location: location || null,
        isDraft: isDraft || false,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
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

    // Alert mentioned users
    if (mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: { username: { in: mentions } },
      });

      for (const targetUser of mentionedUsers) {
        if (targetUser.id !== userId) {
          const notification = await prisma.notification.create({
            data: {
              receiverId: targetUser.id,
              senderId: userId,
              type: 'MENTION',
              postId: post.id,
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
          sendRealtimeNotification(targetUser.id, notification);
        }
      }
    }

    // Parse back mediaUrls, hashtags, mentions for output
    const formattedPost = {
      ...post,
      mediaUrls: JSON.parse(post.mediaUrls || '[]'),
      hashtags: post.hashtags ? post.hashtags.split(',') : [],
      mentions: post.mentions ? post.mentions.split(',') : [],
    };

    return res.status(201).json({ message: 'Post created successfully', post: formattedPost });
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getFeed(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const filter = req.query.filter as string; // 'follow', 'trending', 'latest'
    const limit = parseInt(req.query.limit as string) || 10;
    const cursor = req.query.cursor as string; // Post ID for keyset pagination

    let whereClause: any = {
      isDraft: false,
      isArchived: false,
      OR: [
        { scheduledFor: null },
        { scheduledFor: { lte: new Date() } },
      ],
    };

    // If user blocks someone or is blocked, exclude those posts
    if (userId) {
      const blocks = await prisma.block.findMany({
        where: {
          OR: [{ blockerId: userId }, { blockeeId: userId }],
        },
      });
      const blockedUserIds = blocks.map((b) => (b.blockerId === userId ? b.blockeeId : b.blockerId));
      
      const mutes = await prisma.mute.findMany({
        where: { muterId: userId },
      });
      const mutedUserIds = mutes.map((m) => m.muteeId);

      const excludeUserIds = Array.from(new Set([...blockedUserIds, ...mutedUserIds]));

      whereClause.userId = { notIn: excludeUserIds };
    }

    if (filter === 'follow' && userId) {
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);
      // Include user's own posts too
      whereClause.userId = { in: [...followingIds, userId], notIn: whereClause.userId?.notIn || [] };
    }

    let orderByClause: any = { createdAt: 'desc' };

    if (filter === 'trending') {
      orderByClause = [
        { likes: { _count: 'desc' } },
        { comments: { _count: 'desc' } },
      ];
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
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
        repost: {
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
          select: {
            likes: true,
            comments: true,
            saves: true,
            repostedBy: true,
          },
        },
        likes: userId ? { where: { userId } } : false,
        saves: userId ? { where: { userId } } : false,
      },
      orderBy: orderByClause,
    });

    let nextCursor: string | undefined = undefined;
    if (posts.length > limit) {
      const nextPost = posts.pop();
      nextCursor = nextPost?.id;
    }

    // Format output
    const formatted = posts.map((p) => ({
      id: p.id,
      type: p.type,
      content: p.content,
      mediaUrls: JSON.parse(p.mediaUrls || '[]'),
      location: p.location,
      createdAt: p.createdAt,
      user: p.user,
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
      savesCount: p._count.saves,
      repostsCount: p._count.repostedBy || 0,
      isLiked: userId ? p.likes.length > 0 : false,
      isSaved: userId ? p.saves.length > 0 : false,
      songName: p.songName,
      songArtist: p.songArtist,
      songUrl: p.songUrl,
      repost: p.repost
        ? {
            ...p.repost,
            mediaUrls: JSON.parse(p.repost.mediaUrls || '[]'),
            songName: p.repost.songName,
            songArtist: p.repost.songArtist,
            songUrl: p.repost.songUrl,
          }
        : null,
    }));

    // Record reach/impressions analytics for loaded posts
    if (userId && formatted.length > 0) {
      await prisma.postAnalytics.createMany({
        data: formatted.map((p) => ({
          userId,
          postId: p.id,
          views: 1,
          reach: 1,
          impressions: 1,
        })),
      });
    }

    return res.status(200).json({ posts: formatted, nextCursor });
  } catch (error) {
    console.error('Get feed error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function likePost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        postId,
        commentId: null,
        reelId: null,
      },
    });

    if (!existingLike) {
      await prisma.like.create({
        data: {
          userId,
          postId,
        },
      });
    }

    if (post.userId !== userId) {
      const notification = await prisma.notification.create({
        data: {
          receiverId: post.userId,
          senderId: userId,
          type: 'LIKE',
          postId,
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

      sendRealtimeNotification(post.userId, notification);
    }

    return res.status(200).json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error('Like post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unlikePost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.like.deleteMany({
      where: {
        userId,
        postId,
      },
    });

    return res.status(200).json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Unlike post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function commentPost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const moderation = analyzeContent(content);
    if (moderation.isToxic) {
      return res.status(400).json({ error: `Comment flagged: ${moderation.reason}` });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        postId,
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

    if (post.userId !== userId) {
      const notification = await prisma.notification.create({
        data: {
          receiverId: post.userId,
          senderId: userId,
          type: 'COMMENT',
          postId,
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

      sendRealtimeNotification(post.userId, notification);
    }

    return res.status(201).json({ message: 'Comment posted successfully', comment });
  } catch (error) {
    console.error('Comment post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getComments(req: Request, res: Response) {
  try {
    const { postId } = req.params;

    const comments = await prisma.comment.findMany({
      where: {
        postId,
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
    console.error('Get comments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function savePost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;
    const { collectionId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.save.upsert({
      where: {
        userId_postId: { userId, postId },
      },
      create: {
        userId,
        postId,
        collectionId: collectionId || null,
      },
      update: {
        collectionId: collectionId || null,
      },
    });

    return res.status(200).json({ message: 'Post bookmarked successfully' });
  } catch (error) {
    console.error('Save post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unsavePost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.save.deleteMany({
      where: { userId, postId },
    });

    return res.status(200).json({ message: 'Post unsaved successfully' });
  } catch (error) {
    console.error('Unsave post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSavedPosts(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const saved = await prisma.save.findMany({
      where: { userId },
      include: {
        post: {
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
            repost: {
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = saved.map((s) => ({
      id: s.post.id,
      type: s.post.type,
      content: s.post.content,
      mediaUrls: JSON.parse(s.post.mediaUrls || '[]'),
      location: s.post.location,
      createdAt: s.post.createdAt,
      user: s.post.user,
      songName: s.post.songName,
      songArtist: s.post.songArtist,
      songUrl: s.post.songUrl,
      repost: s.post.repost
        ? {
            ...s.post.repost,
            mediaUrls: JSON.parse(s.post.repost.mediaUrls || '[]'),
            songName: s.post.repost.songName,
            songArtist: s.post.repost.songArtist,
            songUrl: s.post.repost.songUrl,
          }
        : null,
    }));
    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get saved posts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createCollection(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { name } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    const collection = await prisma.bookmarkCollection.create({
      data: { userId, name },
    });

    return res.status(201).json(collection);
  } catch (error) {
    console.error('Create collection error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCollections(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const collections = await prisma.bookmarkCollection.findMany({
      where: { userId },
      include: {
        saves: {
          include: {
            post: true,
          },
        },
      },
    });

    return res.status(200).json(collections);
  } catch (error) {
    console.error('Get collections error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function repostPost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const originalPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!originalPost) {
      return res.status(404).json({ error: 'Original post not found' });
    }

    const actualRepostId = originalPost.repostId || originalPost.id;

    const repost = await prisma.post.create({
      data: {
        userId,
        type: 'REPOST',
        content: content || null,
        repostId: actualRepostId,
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
        repost: {
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
      },
    });

    const formattedRepost = {
      ...repost,
      mediaUrls: [],
      hashtags: [],
      mentions: [],
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      isSaved: false,
      repost: repost.repost
        ? {
            ...repost.repost,
            mediaUrls: JSON.parse(repost.repost.mediaUrls || '[]'),
          }
        : null,
    };

    return res.status(201).json({ message: 'Reposted successfully', post: formattedRepost });
  } catch (error) {
    console.error('Repost error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function archivePost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this post' });
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { isArchived: true },
    });

    return res.status(200).json({ message: 'Post archived successfully', post: updatedPost });
  } catch (error) {
    console.error('Archive post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unarchivePost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this post' });
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { isArchived: false },
    });

    return res.status(200).json({ message: 'Post unarchived successfully', post: updatedPost });
  } catch (error) {
    console.error('Unarchive post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getArchivedPosts(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const posts = await prisma.post.findMany({
      where: {
        userId,
        isArchived: true,
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
        repost: {
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
          select: {
            likes: true,
            comments: true,
            saves: true,
            repostedBy: true,
          },
        },
        likes: { where: { userId } },
        saves: { where: { userId } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = posts.map((p) => ({
      id: p.id,
      type: p.type,
      content: p.content,
      mediaUrls: JSON.parse(p.mediaUrls || '[]'),
      location: p.location,
      createdAt: p.createdAt,
      user: p.user,
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
      savesCount: p._count.saves,
      repostsCount: p._count.repostedBy || 0,
      isLiked: p.likes.length > 0,
      isSaved: p.saves.length > 0,
      repost: p.repost
        ? {
            ...p.repost,
            mediaUrls: JSON.parse(p.repost.mediaUrls || '[]'),
          }
        : null,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get archived posts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deletePost(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this post' });
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
