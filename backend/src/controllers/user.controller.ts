import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { sendRealtimeNotification } from '../services/socket.service';

export async function getProfile(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        profile: true,
        _count: {
          select: {
            posts: { where: { isDraft: false } },
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user || user.status === 'BANNED') {
      return res.status(404).json({ error: 'User profile not found' });
    }

    let isUserVerified = user.verified;
    if (!isUserVerified) {
      const correctAttempts = await prisma.quizAttempt.count({
        where: { userId: user.id, answeredCorrectly: true },
      });
      if (correctAttempts > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { verified: true },
        });
        isUserVerified = true;
      }
    }

    // Check if current user is blocking target, or target is blocking current user
    if (currentUserId) {
      const isBlocked = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: currentUserId, blockeeId: user.id },
            { blockerId: user.id, blockeeId: currentUserId },
          ],
        },
      });

      if (isBlocked) {
        return res.status(403).json({ error: 'You do not have permission to view this profile' });
      }
    }

    // Check if currently following
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const followRelation = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!followRelation;
    }

    // Track profile view analytics (exclude viewing own profile)
    if (currentUserId && currentUserId !== user.id) {
      await prisma.userAnalytics.create({
        data: {
          userId: user.id,
          profileViews: 1,
          reach: 1,
          impressions: 1,
        },
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        verified: isUserVerified,
        createdAt: user.createdAt,
        profile: user.profile,
        stats: {
          postsCount: user._count.posts,
          followersCount: user._count.followers,
          followingCount: user._count.following,
        },
        isFollowing,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { name, username, bio, website, avatarUrl, coverUrl, location, isPrivate } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate and update username if provided
    if (username !== undefined) {
      const cleanUsername = username.toLowerCase().trim();
      if (!cleanUsername) {
        return res.status(400).json({ error: 'Username cannot be empty' });
      }

      const usernameRegex = /^[a-zA-Z0-9_.]+$/;
      if (!usernameRegex.test(cleanUsername)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and periods' });
      }

      // Check if username is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return res.status(409).json({ error: 'Username is already taken' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          name: name !== undefined ? name : undefined,
          username: cleanUsername,
        },
      });
    } else if (name !== undefined) {
      // Update user display name if provided (when username is not modified)
      await prisma.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    // Update profile
    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        bio: bio !== undefined ? bio : undefined,
        website: website !== undefined ? website : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        coverUrl: coverUrl !== undefined ? coverUrl : undefined,
        location: location !== undefined ? location : undefined,
        isPrivate: isPrivate !== undefined ? isPrivate : undefined,
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser?.id,
        username: updatedUser?.username,
        name: updatedUser?.name,
        verified: updatedUser?.verified,
        profile: updatedUser?.profile,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function followUser(req: Request, res: Response) {
  try {
    const followerId = req.user?.id;
    const { followingId } = req.params;

    if (!followerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (followerId === followingId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Create follow relationship (upsert to prevent duplicate key errors)
    await prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId, followingId },
      },
      create: { followerId, followingId },
      update: {},
    });

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        receiverId: followingId,
        senderId: followerId,
        type: 'FOLLOW',
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

    sendRealtimeNotification(followingId, notification);

    return res.status(200).json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Follow user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unfollowUser(req: Request, res: Response) {
  try {
    const followerId = req.user?.id;
    const { followingId } = req.params;

    if (!followerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.follow.deleteMany({
      where: { followerId, followingId },
    });

    return res.status(200).json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getFollowers(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            name: true,
            verified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const list = await Promise.all(
      followers.map(async (f) => {
        let isFollowing = false;
        if (currentUserId) {
          const check = await prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentUserId,
                followingId: f.followerId,
              },
            },
          });
          isFollowing = !!check;
        }
        return { ...f.follower, isFollowing };
      })
    );

    return res.status(200).json(list);
  } catch (error) {
    console.error('Get followers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getFollowing(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            name: true,
            verified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const list = await Promise.all(
      following.map(async (f) => {
        let isFollowing = false;
        if (currentUserId) {
          const check = await prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentUserId,
                followingId: f.followingId,
              },
            },
          });
          isFollowing = !!check;
        }
        return { ...f.following, isFollowing };
      })
    );

    return res.status(200).json(list);
  } catch (error) {
    console.error('Get following error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function blockUser(req: Request, res: Response) {
  try {
    const blockerId = req.user?.id;
    const { targetUserId } = req.body;

    if (!blockerId || !targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    if (blockerId === targetUserId) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    await prisma.block.upsert({
      where: {
        blockerId_blockeeId: { blockerId, blockeeId: targetUserId },
      },
      create: { blockerId, blockeeId: targetUserId },
      update: {},
    });

    // Unfollow automatically if following
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: targetUserId },
          { followerId: targetUserId, followingId: blockerId },
        ],
      },
    });

    return res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unblockUser(req: Request, res: Response) {
  try {
    const blockerId = req.user?.id;
    const { targetUserId } = req.body;

    if (!blockerId || !targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    await prisma.block.deleteMany({
      where: { blockerId, blockeeId: targetUserId },
    });

    return res.status(200).json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function muteUser(req: Request, res: Response) {
  try {
    const muterId = req.user?.id;
    const { targetUserId } = req.body;

    if (!muterId || !targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    await prisma.mute.upsert({
      where: {
        muterId_muteeId: { muterId, muteeId: targetUserId },
      },
      create: { muterId, muteeId: targetUserId },
      update: {},
    });

    return res.status(200).json({ message: 'User muted successfully' });
  } catch (error) {
    console.error('Mute user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unmuteUser(req: Request, res: Response) {
  try {
    const muterId = req.user?.id;
    const { targetUserId } = req.body;

    if (!muterId || !targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    await prisma.mute.deleteMany({
      where: { muterId, muteeId: targetUserId },
    });

    return res.status(200).json({ message: 'User unmuted successfully' });
  } catch (error) {
    console.error('Unmute user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProfileAnalytics(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const analytics = await prisma.userAnalytics.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    // Group analytics by day or return series
    const viewsTotal = analytics.reduce((acc, curr) => acc + curr.profileViews, 0);
    const reachTotal = analytics.reduce((acc, curr) => acc + curr.reach, 0);
    const impressionsTotal = analytics.reduce((acc, curr) => acc + curr.impressions, 0);

    const followerCount = await prisma.follow.count({ where: { followingId: userId } });
    const followingCount = await prisma.follow.count({ where: { followerId: userId } });

    // Growth simulation
    const growthRate = followerCount > 0 ? ((followerCount - followingCount) / followerCount) * 100 : 0;

    return res.status(200).json({
      totals: {
        profileViews: viewsTotal,
        reach: reachTotal,
        impressions: impressionsTotal,
        followers: followerCount,
        growthRate: growthRate.toFixed(1),
      },
      timeSeries: analytics,
    });
  } catch (error) {
    console.error('Get profile analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSuggestedUsers(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    // Fetch popular users that the current user isn't already following
    const followingIds = userId
      ? (await prisma.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        })).map((f) => f.followingId)
      : [];

    const excludeIds = [userId, ...followingIds].filter(Boolean) as string[];

    const suggestions = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        status: 'ACTIVE',
      },
      take: 5,
      include: {
        profile: { select: { avatarUrl: true, bio: true } },
        _count: { select: { followers: true } },
      },
      orderBy: {
        followers: { _count: 'desc' },
      },
    });

    const formatted = suggestions.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      verified: u.verified,
      avatarUrl: u.profile?.avatarUrl,
      bio: u.profile?.bio,
      followersCount: u._count.followers,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get suggested users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function searchUsers(req: Request, res: Response) {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.status(200).json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query.toLowerCase() } },
          { name: { contains: query } },
        ],
        status: 'ACTIVE',
      },
      take: 10,
      include: {
        profile: true,
      },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      verified: u.verified,
      avatarUrl: u.profile?.avatarUrl || null,
      bio: u.profile?.bio || null,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCloseFriends(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const closeFriends = await prisma.closeFriend.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            name: true,
            verified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const list = closeFriends.map((cf) => cf.friend);
    return res.status(200).json(list);
  } catch (error) {
    console.error('Get close friends error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateCloseFriends(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { friendIds } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(friendIds)) {
      return res.status(400).json({ error: 'friendIds must be an array of strings' });
    }

    await prisma.$transaction([
      prisma.closeFriend.deleteMany({
        where: { userId },
      }),
      prisma.closeFriend.createMany({
        data: friendIds.map((friendId: string) => ({
          userId,
          friendId,
        })),
      }),
    ]);

    return res.status(200).json({ message: 'Close friends list updated successfully' });
  } catch (error) {
    console.error('Update close friends error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


