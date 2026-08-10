import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function getEvents(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { search } = req.query;

    const whereClause: any = {};

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const events = await prisma.communityEvent.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        attendees: {
          select: {
            userId: true,
            status: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    const formattedEvents = events.map((ev) => {
      const isRegistered = userId ? ev.attendees.some((a) => a.userId === userId) : false;
      return {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        eventDate: ev.date,
        location: ev.location,
        isOnline: ev.location.toLowerCase().includes('online'),
        bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800',
        community: ev.community,
        creator: ev.creator,
        attendeesCount: ev.attendees.length,
        isRegistered,
        createdAt: ev.createdAt,
      };
    });

    return res.status(200).json({ events: formattedEvents });
  } catch (error) {
    console.error('Get events error:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}

export async function getEventById(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { eventId } = req.params;

    const event = await prisma.communityEvent.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        attendees: {
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
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isRegistered = userId ? event.attendees.some((a) => a.userId === userId) : false;

    return res.status(200).json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        eventDate: event.date,
        location: event.location,
        isOnline: event.location.toLowerCase().includes('online'),
        bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800',
        community: event.community,
        creator: event.creator,
        attendees: event.attendees,
        attendeesCount: event.attendees.length,
        isRegistered,
      },
    });
  } catch (error) {
    console.error('Get event details error:', error);
    return res.status(500).json({ error: 'Failed to fetch event details' });
  }
}

export async function createEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { communityId, title, description, eventDate, location } = req.body;

    if (!title || !description || !eventDate || !location) {
      return res.status(400).json({ error: 'Title, description, date, and location are required' });
    }

    let resolvedCommunityId = communityId;
    if (!resolvedCommunityId) {
      const userComm = await prisma.communityMember.findFirst({
        where: { userId },
      });
      if (userComm) {
        resolvedCommunityId = userComm.communityId;
      } else {
        const anyComm = await prisma.community.findFirst();
        resolvedCommunityId = anyComm ? anyComm.id : null;
      }
    }

    if (!resolvedCommunityId) {
      const defaultComm = await prisma.community.create({
        data: {
          name: 'General Campus Events',
          description: 'Official hub for campus-wide festivals, hackathons, and tech talks',
          creatorId: userId,
        },
      });
      resolvedCommunityId = defaultComm.id;
    }

    const newEvent = await prisma.communityEvent.create({
      data: {
        communityId: resolvedCommunityId,
        creatorId: userId,
        title,
        description,
        date: new Date(eventDate),
        location,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Auto-register creator as attendee
    await prisma.communityEventAttendee.create({
      data: {
        eventId: newEvent.id,
        userId,
        status: 'GOING',
      },
    });

    return res.status(201).json({
      message: 'Event created successfully',
      event: {
        ...newEvent,
        eventDate: newEvent.date,
        isOnline: newEvent.location.toLowerCase().includes('online'),
        bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800',
        attendeesCount: 1,
        isRegistered: true,
      },
    });
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ error: 'Failed to create event' });
  }
}

export async function registerEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { eventId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = await prisma.communityEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const existing = await prisma.communityEventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    await prisma.communityEventAttendee.create({
      data: {
        eventId,
        userId,
        status: 'GOING',
      },
    });

    return res.status(200).json({ message: 'Registered for event successfully!' });
  } catch (error) {
    console.error('Register event error:', error);
    return res.status(500).json({ error: 'Failed to register for event' });
  }
}

export async function unregisterEvent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { eventId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.communityEventAttendee.deleteMany({
      where: {
        eventId,
        userId,
      },
    });

    return res.status(200).json({ message: 'Unregistered from event' });
  } catch (error) {
    console.error('Unregister event error:', error);
    return res.status(500).json({ error: 'Failed to unregister from event' });
  }
}

export async function getMyRegistrations(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const attendees = await prisma.communityEventAttendee.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            community: { select: { name: true } },
            creator: { select: { username: true, name: true } },
          },
        },
      },
    });

    const registeredEvents = attendees.map((a) => ({
      ...a.event,
      eventDate: a.event.date,
      isOnline: a.event.location.toLowerCase().includes('online'),
      isRegistered: true,
    }));

    return res.status(200).json({
      registrations: registeredEvents,
    });
  } catch (error) {
    console.error('Get my registrations error:', error);
    return res.status(500).json({ error: 'Failed to fetch registered events' });
  }
}
