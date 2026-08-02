const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true
      }
    });
    console.log('--- Users ---');
    console.log(users);

    const stories = await prisma.story.findMany({
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    });
    console.log('\n--- Stories ---');
    console.log(stories.map(s => ({
      id: s.id,
      userId: s.userId,
      username: s.user.username,
      mediaUrl: s.mediaUrl,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt
    })));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
