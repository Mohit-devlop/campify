import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

function getSocketBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SOCKET_URL.includes('localhost')) {
      const host = window.location.hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.vercel.app')) {
        return `${window.location.protocol}//${host}:5001`;
      }
    }
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.vercel.app')) {
      return `${window.location.protocol}//${host}:5001`;
    }
  }
  return 'http://localhost:5001';
}

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

    const socketUrl = getSocketBaseUrl();
    const socketInstance = io(socketUrl, {
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
