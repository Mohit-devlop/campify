import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function createCommunity(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { name, description, avatarUrl, bannerUrl, isPrivate } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Check if name already exists
    const existing = await prisma.community.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({ error: 'Community name already taken' });
    }

    const community = await prisma.community.create({
      data: {
        name,
        description,
        avatarUrl: avatarUrl || null,
        bannerUrl: bannerUrl || null,
        isPrivate: isPrivate || false,
        creatorId: userId,
        members: {
          create: {
            userId,
            role: 'CREATOR',
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return res.status(201).json(community);
  } catch (error) {
    console.error('Create community error:', error);
    return res.status(500).json({ error: 'Failed to create community' });
  }
}

export async function getCommunities(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const query = req.query.search as string;

    const whereClause = query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' as any } },
            { description: { contains: query, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const communities = await prisma.community.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { members: true, events: true, polls: true },
        },
        members: userId ? { where: { userId } } : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format list to show if current user is member
    const formatted = communities.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      avatarUrl: c.avatarUrl,
      bannerUrl: c.bannerUrl,
      isPrivate: c.isPrivate,
      membersCount: c._count.members,
      eventsCount: c._count.events,
      pollsCount: c._count.polls,
      isJoined: userId ? c.members.length > 0 : false,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get communities error:', error);
    return res.status(500).json({ error: 'Failed to fetch communities' });
  }
}

export async function getCommunityDetails(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { communityId } = req.params;

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        _count: {
          select: { members: true, events: true, polls: true },
        },
        members: {
          include: {
            user: {
              select: {
                username: true,
                profile: { select: { avatarUrl: true } },
              },
            },
          },
        },
        events: {
          orderBy: { date: 'asc' },
          include: {
            creator: {
              select: { username: true },
            },
            _count: { select: { attendees: true } },
            attendees: userId ? { where: { userId } } : false,
          },
        },
        polls: {
          orderBy: { createdAt: 'desc' },
          include: {
            creator: { select: { username: true } },
            options: {
              include: {
                _count: { select: { votes: true } },
              },
            },
            votes: userId ? { where: { userId } } : false,
          },
        },
      },
    });

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const isJoined = userId ? community.members.some((m) => m.userId === userId) : false;

    return res.status(200).json({
      ...community,
      isJoined,
    });
  } catch (error) {
    console.error('Get community details error:', error);
    return res.status(500).json({ error: 'Failed to fetch community details' });
  }
}

export async function joinCommunity(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { communityId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.communityMember.upsert({
      where: {
        communityId_userId: { communityId, userId },
      },
      create: {
        communityId,
        userId,
        role: 'MEMBER',
      },
      update: {},
    });

    return res.status(200).json({ message: 'Successfully joined community' });
  } catch (error) {
    console.error('Join community error:', error);
    return res.status(500).json({ error: 'Failed to join community' });
  }
}

export async function leaveCommunity(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { communityId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.communityMember.deleteMany({
      where: {
        communityId,
        userId,
      },
    });

    return res.status(200).json({ message: 'Successfully left community' });
  } catch (error) {
    console.error('Leave community error:', error);
    return res.status(500).json({ error: 'Failed to leave community' });
  }
}

export async function createEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { communityId } = req.params;
    const { title, description, date, location } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || !date || !location) {
      return res.status(400).json({ error: 'Title, date, and location are required' });
    }

    // Check membership
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only community members can create events' });
    }

    const event = await prisma.communityEvent.create({
      data: {
        communityId,
        title,
        description: description || '',
        date: new Date(date),
        location,
        creatorId: userId,
      },
    });

    return res.status(201).json(event);
  } catch (error) {
    console.error('Create community event error:', error);
    return res.status(500).json({ error: 'Failed to create event' });
  }
}

export async function attendEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { eventId } = req.params;
    const { status } = req.body; // GOING, INTERESTED, DECLINED

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eventAttendee = await prisma.communityEventAttendee.upsert({
      where: {
        eventId_userId: { eventId, userId },
      },
      create: {
        eventId,
        userId,
        status: status || 'GOING',
      },
      update: {
        status: status || 'GOING',
      },
    });

    return res.status(200).json(eventAttendee);
  } catch (error) {
    console.error('Attend event error:', error);
    return res.status(500).json({ error: 'Failed to register attendance status' });
  }
}

export async function createPoll(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { communityId } = req.params;
    const { question, options } = req.body; // options: string[]

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options are required' });
    }

    const poll = await prisma.communityPoll.create({
      data: {
        communityId,
        question,
        creatorId: userId,
        options: {
          create: options.map((opt: string) => ({ optionText: opt })),
        },
      },
      include: {
        options: true,
      },
    });

    return res.status(201).json(poll);
  } catch (error) {
    console.error('Create community poll error:', error);
    return res.status(500).json({ error: 'Failed to create poll' });
  }
}

export async function votePoll(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { pollId } = req.params;
    const { optionId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!optionId) {
      return res.status(400).json({ error: 'Option ID is required' });
    }

    // Cast vote, enforce unique vote per user per poll
    const vote = await prisma.communityPollVote.upsert({
      where: {
        pollId_userId: { pollId, userId },
      },
      create: {
        pollId,
        pollOptionId: optionId,
        userId,
      },
      update: {
        pollOptionId: optionId,
      },
    });

    return res.status(200).json(vote);
  } catch (error) {
    console.error('Vote poll error:', error);
    return res.status(500).json({ error: 'Failed to record vote' });
  }
}
