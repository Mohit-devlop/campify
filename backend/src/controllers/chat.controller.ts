import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { sendRealtimeMessage, sendRealtimeNotification, sendRealtimeMessageDelete } from '../services/socket.service';
import { analyzeContent } from '../services/moderation.service';

export async function createChat(req: Request, res: Response) {
  try {
    const creatorId = req.user?.id;
    const { isGroup, name, avatarUrl, memberIds } = req.body;

    if (!creatorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isGroup) {
      // 1-on-1 Chat
      const targetUserId = memberIds[0];
      if (!targetUserId) {
        return res.status(400).json({ error: 'Recipient member ID is required' });
      }

      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          members: { every: { userId: { in: [creatorId, targetUserId] } } },
        },
        include: {
          members: {
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

      if (existingChat) {
        return res.status(200).json(existingChat);
      }

      const chat = await prisma.chat.create({
        data: {
          isGroup: false,
          members: {
            create: [
              { userId: creatorId, role: 'ADMIN' },
              { userId: targetUserId, role: 'MEMBER' },
            ],
          },
        },
        include: {
          members: {
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

      return res.status(201).json(chat);
    } else {
      // Group Chat
      if (!name) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      const chat = await prisma.chat.create({
        data: {
          isGroup: true,
          name,
          avatarUrl: avatarUrl || null,
          creatorId,
          members: {
            create: [
              { userId: creatorId, role: 'ADMIN' },
              ...memberIds.map((id: string) => ({ userId: id, role: 'MEMBER' })),
            ],
          },
        },
        include: {
          members: {
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

      return res.status(201).json(chat);
    }
  } catch (error) {
    console.error('Create chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getChats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const chats = await prisma.chat.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
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
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { name: true, username: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedChats = chats.map((c) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        readBy: JSON.parse(m.readBy || '[]'),
      })),
    }));

    return res.status(200).json(formattedChats);
  } catch (error) {
    console.error('Get chats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMessages(req: Request, res: Response) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 30;
    const cursor = req.query.cursor as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this chat' });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined,
      include: {
        sender: {
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

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextMessage = messages.pop();
      nextCursor = nextMessage?.id;
    }

    const formattedMessages = messages.map((m) => ({
      ...m,
      readBy: JSON.parse(m.readBy || '[]'),
    })).reverse();

    return res.status(200).json({
      messages: formattedMessages,
      nextCursor,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const senderId = req.user?.id;
    const { chatId } = req.params;
    const { content, mediaUrl, type, duration } = req.body;

    if (!senderId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (content) {
      const moderation = analyzeContent(content);
      if (moderation.isToxic) {
        return res.status(400).json({ error: `Message blocked: ${moderation.reason}` });
      }
    }

    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: senderId } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        content: content || null,
        mediaUrl: mediaUrl || null,
        type: type || 'TEXT',
        duration: duration ? parseFloat(duration) : null,
        readBy: JSON.stringify([senderId]), // SQLite serialization
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    const formattedMessage = {
      ...message,
      readBy: JSON.parse(message.readBy || '[]'),
    };

    sendRealtimeMessage(chatId, formattedMessage);

    // If this is a screenshot warning, notify other chat participants
    if (type === 'SCREENSHOT') {
      const otherMembers = await prisma.chatMember.findMany({
        where: {
          chatId,
          userId: { not: senderId },
        },
      });

      for (const member of otherMembers) {
        try {
          const notification = await prisma.notification.create({
            data: {
              receiverId: member.userId,
              senderId,
              type: 'SCREENSHOT',
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
          sendRealtimeNotification(member.userId, notification);
        } catch (notifErr) {
          console.error('Error creating screenshot notification:', notifErr);
        }
      }
    }

    return res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markChatRead(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { chatId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const msg of messages) {
      const readList = JSON.parse(msg.readBy || '[]') as string[];
      if (!readList.includes(userId)) {
        readList.push(userId);
        await prisma.message.update({
          where: { id: msg.id },
          data: { readBy: JSON.stringify(readList) }, // SQLite serialization
        });
      }
    }

    return res.status(200).json({ message: 'Chat marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteMessage(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own messages' });
    }

    // Delete message
    await prisma.message.delete({
      where: { id: messageId },
    });

    // Notify other users in the chat room
    sendRealtimeMessageDelete(message.chatId, messageId);

    return res.status(200).json({ message: 'Message unsent successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
