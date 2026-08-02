import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function createTeam(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { name, description, lookingFor, skillsNeeded } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !description || !lookingFor) {
      return res.status(400).json({ error: 'Name, description, and lookingFor role are required' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        lookingFor,
        skillsNeeded: skillsNeeded || '',
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

    return res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    return res.status(500).json({ error: 'Failed to create team' });
  }
}

export async function getTeams(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const search = req.query.search as string;

    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as any } },
            { description: { contains: search, mode: 'insensitive' as any } },
            { lookingFor: { contains: search, mode: 'insensitive' as any } },
            { skillsNeeded: { contains: search, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
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
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Match score based on user skills (mock helper)
    let userSkills: string[] = [];
    if (userId) {
      const skills = await prisma.skill.findMany({ where: { userId } });
      userSkills = skills.map((s) => s.name.toLowerCase());
    }

    const formatted = teams.map((team) => {
      const needed = team.skillsNeeded ? team.skillsNeeded.split(',').map((s) => s.trim().toLowerCase()) : [];
      let matchCount = 0;
      needed.forEach((ns) => {
        if (userSkills.includes(ns)) {
          matchCount++;
        }
      });
      const matchScore = needed.length > 0 ? Math.round((matchCount / needed.length) * 100) : 50;

      const isMember = team.members.some((m) => m.userId === userId);

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        lookingFor: team.lookingFor,
        skillsNeeded: team.skillsNeeded,
        creatorId: team.creatorId,
        createdAt: team.createdAt,
        membersCount: team._count.members,
        members: team.members,
        matchScore,
        isMember,
      };
    });

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get teams error:', error);
    return res.status(500).json({ error: 'Failed to fetch teams' });
  }
}

export async function getTeamDetails(req: Request, res: Response) {
  try {
    const { teamId } = req.params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
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
        invitations: {
          include: {
            receiver: { select: { username: true } },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    return res.status(200).json(team);
  } catch (error) {
    console.error('Get team details error:', error);
    return res.status(500).json({ error: 'Failed to fetch team details' });
  }
}

export async function inviteMember(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { teamId } = req.params;
    const { receiverUsername, message, role } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!receiverUsername) {
      return res.status(400).json({ error: 'Username of candidate is required' });
    }

    // Verify sender is creator/admin in team
    const membership = await prisma.teamMember.findFirst({
      where: { teamId, userId, role: { in: ['CREATOR', 'ADMIN'] } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only team creators or admins can invite members' });
    }

    // Find receiver user
    const receiver = await prisma.user.findUnique({
      where: { username: receiverUsername },
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Candidate username not found' });
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: receiver.id } },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        senderId: userId,
        receiverId: receiver.id,
        role: role || 'MEMBER',
        message: message || '',
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        receiverId: receiver.id,
        senderId: userId,
        type: 'TEAM_INVITE',
      },
    });

    return res.status(201).json(invitation);
  } catch (error) {
    console.error('Invite member error:', error);
    return res.status(500).json({ error: 'Failed to send invitation' });
  }
}

export async function respondToInvitation(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { invitationId } = req.params;
    const { accept } = req.body; // boolean

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.receiverId !== userId) {
      return res.status(404).json({ error: 'Invitation not found or unauthorized' });
    }

    if (accept) {
      // Add to team
      await prisma.$transaction([
        prisma.teamMember.create({
          data: {
            teamId: invitation.teamId,
            userId,
            role: invitation.role,
          },
        }),
        prisma.teamInvitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED' },
        }),
      ]);

      return res.status(200).json({ message: 'Invitation accepted, joined team successfully' });
    } else {
      await prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { status: 'DECLINED' },
      });

      return res.status(200).json({ message: 'Invitation declined' });
    }
  } catch (error) {
    console.error('Respond to invitation error:', error);
    return res.status(500).json({ error: 'Failed to process invitation response' });
  }
}

export async function getInvitations(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const invitations = await prisma.teamInvitation.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        team: true,
        sender: {
          select: {
            username: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    });

    return res.status(200).json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    return res.status(500).json({ error: 'Failed to fetch invitations' });
  }
}
