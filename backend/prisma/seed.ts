import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Kilogram PostgreSQL database...');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);
  const adminPasswordHash = await bcrypt.hash('AdminSecurePass123!', salt);

  // 1. Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kilogram.com' },
    update: {},
    create: {
      email: 'admin@kilogram.com',
      username: 'admin',
      name: 'System Admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      emailVerified: true,
      verified: true,
      profile: {
        create: {
          bio: 'Official Admin Account for Kilogram.',
          location: 'San Jose, CA',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
        },
      },
    },
  });

  const john = await prisma.user.upsert({
    where: { email: 'john@gmail.com' },
    update: {},
    create: {
      email: 'john@gmail.com',
      username: 'john_doe',
      name: 'John Doe',
      passwordHash,
      emailVerified: true,
      verified: true,
      profile: {
        create: {
          bio: 'Frontend Engineer | Apple Fanatic | Photographer',
          location: 'San Francisco, CA',
          website: 'https://johndoe.dev',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
          coverUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
        },
      },
    },
  });

  const jane = await prisma.user.upsert({
    where: { email: 'jane@gmail.com' },
    update: {},
    create: {
      email: 'jane@gmail.com',
      username: 'jane_smith',
      name: 'Jane Smith',
      passwordHash,
      emailVerified: true,
      verified: true,
      profile: {
        create: {
          bio: 'Travel Blogger & Coffee Enthusiast. Exploring the world one cup at a time!',
          location: 'New York, NY',
          website: 'https://janesmithtravels.com',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
          coverUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800',
        },
      },
    },
  });

  const alex = await prisma.user.upsert({
    where: { email: 'alex@gmail.com' },
    update: {},
    create: {
      email: 'alex@gmail.com',
      username: 'alex_creative',
      name: 'Alex Rivera',
      passwordHash,
      emailVerified: true,
      verified: false,
      profile: {
        create: {
          bio: '3D Artist & Motion Designer. Open to projects.',
          location: 'London, UK',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
          coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800',
        },
      },
    },
  });

  console.log('Seeded core users successfully.');

  // 2. Seed Followers
  const followData = [
    { followerId: john.id, followingId: jane.id },
    { followerId: jane.id, followingId: john.id },
    { followerId: john.id, followingId: alex.id },
    { followerId: alex.id, followingId: jane.id },
    { followerId: admin.id, followingId: john.id },
    { followerId: admin.id, followingId: jane.id },
  ];

  for (const follow of followData) {
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: follow.followerId,
          followingId: follow.followingId,
        },
      },
      create: follow,
      update: {},
    });
  }

  // 3. Seed Posts
  const post1 = await prisma.post.create({
    data: {
      userId: john.id,
      type: 'IMAGE',
      content: 'Fresh morning views from my workspace. Pure zen. #productivity #workspace #apple',
      mediaUrls: JSON.stringify(['https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&q=80&w=800']),
      hashtags: 'productivity,workspace,apple',
      location: 'San Francisco, CA',
    },
  });

  const post2 = await prisma.post.create({
    data: {
      userId: jane.id,
      type: 'CAROUSEL',
      content: 'Three days in Tokyo. Absolutely magical place! Which view is your favorite? 🇯🇵 #travel #tokyo #japan',
      mediaUrls: JSON.stringify([
        'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
      ]),
      hashtags: 'travel,tokyo,japan',
      location: 'Shibuya, Tokyo',
    },
  });

  await prisma.post.create({
    data: {
      userId: alex.id,
      type: 'TEXT',
      content: 'Just dropped a new 3D design collection. Exploring glassmorphism aesthetics. Thoughts? #3d #design #glassmorphism',
      hashtags: '3d,design,glassmorphism',
    },
  });

  console.log('Seeded sample posts successfully.');

  // 4. Seed Comments & Likes
  await prisma.like.create({
    data: { userId: jane.id, postId: post1.id }
  });
  await prisma.like.create({
    data: { userId: alex.id, postId: post1.id }
  });
  await prisma.like.create({
    data: { userId: john.id, postId: post2.id }
  });

  await prisma.comment.create({
    data: {
      userId: jane.id,
      postId: post1.id,
      content: 'Wow, love the clean aesthetic! What monitor is that?',
    },
  });

  const parentComment = await prisma.comment.create({
    data: {
      userId: john.id,
      postId: post2.id,
      content: 'Amazing photos! Shibuya looks unreal.',
    },
  });

  await prisma.comment.create({
    data: {
      userId: jane.id,
      postId: post2.id,
      parentId: parentComment.id,
      content: 'Thanks John! You should definitely visit soon.',
    },
  });

  // 5. Seed Reels
  const reel1 = await prisma.reel.create({
    data: {
      userId: alex.id,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      caption: 'Satisfying 3D Loop Animation. Made with Blender. 🌀 #animation #blender3d #reels',
      hashtags: 'animation,blender3d,reels',
    },
  });

  const reel2 = await prisma.reel.create({
    data: {
      userId: jane.id,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      caption: 'Chasing sunsets in Bali. Nature is the best artist. 🌅 #sunset #travel #reels #bali',
      hashtags: 'sunset,travel,reels,bali',
    },
  });

  await prisma.like.create({
    data: { userId: john.id, reelId: reel1.id }
  });
  await prisma.like.create({
    data: { userId: john.id, reelId: reel2.id }
  });

  // 6. Seed Stories
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);

  await prisma.story.create({
    data: {
      userId: jane.id,
      mediaUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
      expiresAt: tomorrow,
    },
  });

  await prisma.story.create({
    data: {
      userId: john.id,
      mediaUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=600',
      expiresAt: tomorrow,
    },
  });

  // 7. Seed Direct Message Chat
  const chat = await prisma.chat.create({
    data: {
      isGroup: false,
      members: {
        create: [
          { userId: john.id, role: 'ADMIN' },
          { userId: jane.id, role: 'MEMBER' },
        ],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        chatId: chat.id,
        senderId: john.id,
        content: 'Hey Jane! Loved your Tokyo photos. What camera did you use?',
        readBy: JSON.stringify([john.id]),
      },
      {
        chatId: chat.id,
        senderId: jane.id,
        content: 'Hey John! Thanks! I shot those with a Fujifilm X-T5. Highly recommend it!',
        readBy: JSON.stringify([jane.id, john.id]),
      },
      {
        chatId: chat.id,
        senderId: john.id,
        content: 'Awesome, the colors look beautiful. Thanks for sharing!',
        readBy: JSON.stringify([john.id]),
      },
    ],
  });

  console.log('\nDatabase PostgreSQL seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
