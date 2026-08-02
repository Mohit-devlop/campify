import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function getPortfolio(req: Request, res: Response) {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        skills: { orderBy: { category: 'asc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        projects: { orderBy: { createdAt: 'desc' } },
        badges: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get portfolio error:', error);
    return res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
}

export async function addSkill(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { name, category } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    const skill = await prisma.skill.upsert({
      where: {
        userId_name: { userId, name },
      },
      create: {
        userId,
        name,
        category: category || 'Technical',
      },
      update: {
        category: category || 'Technical',
      },
    });

    // Check badge eligibility
    await checkAndAwardBadges(userId);

    return res.status(201).json(skill);
  } catch (error) {
    console.error('Add skill error:', error);
    return res.status(500).json({ error: 'Failed to add skill' });
  }
}

export async function removeSkill(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { skillId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.skill.deleteMany({
      where: {
        id: skillId,
        userId,
      },
    });

    return res.status(200).json({ message: 'Skill removed successfully' });
  } catch (error) {
    console.error('Remove skill error:', error);
    return res.status(500).json({ error: 'Failed to remove skill' });
  }
}

export async function addCertification(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { name, issuingOrg, issueDate, credentialUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !issuingOrg || !issueDate) {
      return res.status(400).json({ error: 'Name, issuingOrg, and issueDate are required' });
    }

    const cert = await prisma.certification.create({
      data: {
        userId,
        name,
        issuingOrg,
        issueDate: new Date(issueDate),
        credentialUrl: credentialUrl || null,
      },
    });

    return res.status(201).json(cert);
  } catch (error) {
    console.error('Add cert error:', error);
    return res.status(500).json({ error: 'Failed to add certification' });
  }
}

export async function removeCertification(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { certId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.certification.deleteMany({
      where: {
        id: certId,
        userId,
      },
    });

    return res.status(200).json({ message: 'Certification removed successfully' });
  } catch (error) {
    console.error('Remove cert error:', error);
    return res.status(500).json({ error: 'Failed to remove certification' });
  }
}

export async function addExperience(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { title, company, location, startDate, endDate, description } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || !company || !startDate) {
      return res.status(400).json({ error: 'Title, company, and startDate are required' });
    }

    const exp = await prisma.experience.create({
      data: {
        userId,
        title,
        company,
        location: location || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        description: description || null,
      },
    });

    return res.status(201).json(exp);
  } catch (error) {
    console.error('Add experience error:', error);
    return res.status(500).json({ error: 'Failed to add experience' });
  }
}

export async function removeExperience(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { expId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.experience.deleteMany({
      where: {
        id: expId,
        userId,
      },
    });

    return res.status(200).json({ message: 'Experience removed successfully' });
  } catch (error) {
    console.error('Remove experience error:', error);
    return res.status(500).json({ error: 'Failed to remove experience' });
  }
}

export async function addProject(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { title, description, role, link, technologies } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || !description || !role) {
      return res.status(400).json({ error: 'Title, description, and role are required' });
    }

    const project = await prisma.project.create({
      data: {
        userId,
        title,
        description,
        role,
        link: link || null,
        technologies: technologies || '',
      },
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error('Add project error:', error);
    return res.status(500).json({ error: 'Failed to add project' });
  }
}

export async function removeProject(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.project.deleteMany({
      where: {
        id: projectId,
        userId,
      },
    });

    return res.status(200).json({ message: 'Project removed successfully' });
  } catch (error) {
    console.error('Remove project error:', error);
    return res.status(500).json({ error: 'Failed to remove project' });
  }
}

// Internal logic to check metrics and award profile badge triggers
async function checkAndAwardBadges(userId: string) {
  try {
    const skillsCount = await prisma.skill.count({ where: { userId } });
    if (skillsCount >= 5) {
      const existing = await prisma.skillBadge.findFirst({
        where: { userId, type: 'TECHNICAL_EXPERT' },
      });
      if (!existing) {
        await prisma.skillBadge.create({
          data: {
            userId,
            type: 'TECHNICAL_EXPERT',
            name: 'Polymath Expert',
            description: 'Featured on profile for showcasing 5+ core skills',
            icon: 'award',
          },
        });
      }
    }
  } catch (err) {
    console.error('Award badge logic error:', err);
  }
}
