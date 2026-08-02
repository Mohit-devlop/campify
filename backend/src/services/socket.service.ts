import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;
const userSocketMap = new Map<string, string>(); // userId -> socketId
const typingUsers = new Map<string, Set<string>>(); // chatId -> set of userIds

export function initSocketServer(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;

    if (userId && userId !== 'undefined') {
      userSocketMap.set(userId, socket.id);
      socket.broadcast.emit('user_online', { userId });
      console.log(`User connected: ${userId} (${socket.id})`);
    }

    // Joining room for specific chats (especially for group chats)
    socket.on('join_chat', ({ chatId }) => {
      socket.join(chatId);
      console.log(`Socket ${socket.id} joined chat room: ${chatId}`);
    });

    socket.on('leave_chat', ({ chatId }) => {
      socket.leave(chatId);
      console.log(`Socket ${socket.id} left chat room: ${chatId}`);
    });

    // Real-time typing indicators
    socket.on('typing_start', ({ chatId, userId: typistId }) => {
      if (!typingUsers.has(chatId)) {
        typingUsers.set(chatId, new Set());
      }
      typingUsers.get(chatId)?.add(typistId);
      
      socket.to(chatId).emit('typing_status', {
        chatId,
        typingUserIds: Array.from(typingUsers.get(chatId) || []),
      });
    });

    socket.on('typing_stop', ({ chatId, userId: typistId }) => {
      typingUsers.get(chatId)?.delete(typistId);
      socket.to(chatId).emit('typing_status', {
        chatId,
        typingUserIds: Array.from(typingUsers.get(chatId) || []),
      });
    });

    socket.on('disconnect', () => {
      if (userId) {
        userSocketMap.delete(userId);
        socket.broadcast.emit('user_offline', { userId });
        console.log(`User disconnected: ${userId} (${socket.id})`);

        // Clean up typing lists
        for (const [chatId, users] of typingUsers.entries()) {
          if (users.has(userId)) {
            users.delete(userId);
            io?.to(chatId).emit('typing_status', {
              chatId,
              typingUserIds: Array.from(users),
            });
          }
        }
      }
    });
  });

  return io;
}

export function getSocketServer(): Server | null {
  return io;
}

export function isUserOnline(userId: string): boolean {
  return userSocketMap.has(userId);
}

export function getOnlineUsers(): string[] {
  return Array.from(userSocketMap.keys());
}

export function sendRealtimeMessage(chatId: string, message: any): void {
  if (io) {
    io.to(chatId).emit('new_message', message);
  }
}

export function sendRealtimeNotification(receiverId: string, notification: any): void {
  const socketId = userSocketMap.get(receiverId);
  if (io && socketId) {
    io.to(socketId).emit('new_notification', notification);
  }
}

export function broadcastUserStatus(userId: string, status: 'online' | 'offline'): void {
  if (io) {
    io.emit(status === 'online' ? 'user_online' : 'user_offline', { userId });
  }
}

export function sendRealtimeMessageDelete(chatId: string, messageId: string): void {
  if (io) {
    io.to(chatId).emit('message_deleted', { chatId, messageId });
  }
}
