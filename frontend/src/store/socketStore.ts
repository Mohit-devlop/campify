import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const SOCKET_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  connectSocket: (userId: string) => void;
  disconnectSocket: () => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  onlineUsers: [],
  connectSocket: (userId) => {
    if (get().socket) return;

    const socketInstance = io(SOCKET_BASE_URL, {
      query: { userId },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
    });

    // Receive list of online users or updates
    socketInstance.on('user_online', ({ userId: onlineId }) => {
      set((state) => ({
        onlineUsers: Array.from(new Set([...state.onlineUsers, onlineId])),
      }));
    });

    socketInstance.on('user_offline', ({ userId: offlineId }) => {
      set((state) => ({
        onlineUsers: state.onlineUsers.filter((id) => id !== offlineId),
      }));
    });

    set({ socket: socketInstance });
  },
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
  joinChat: (chatId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_chat', { chatId });
    }
  },
  leaveChat: (chatId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('leave_chat', { chatId });
    }
  },
}));
