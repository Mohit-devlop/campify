'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Send, ImageIcon, Mic, Sparkles, Plus, 
  Circle, CheckCircle2, User, Loader2, Phone, Video, Info, Camera,
  Compass, Grid, ShieldAlert, X, Hash, Volume2, Search, Star, Pause, Play, Music,
  Users, Check, Zap, Trash2, Edit2
} from 'lucide-react';
import { PRESET_SONGS } from '../../lib/music';

export default function Messages() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated, isInitialized } = useAuthStore();
  const { socket, onlineUsers, joinChat, leaveChat } = useSocketStore();

  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTypingList, setIsTypingList] = useState<string[]>([]);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [potentialMembers, setPotentialMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Status Notes states
  const [notes, setNotes] = useState<any[]>([]);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [activeNoteAction, setActiveNoteAction] = useState<any | null>(null); // For own note actions (edit/delete)
  const [activeReplyNote, setActiveReplyNote] = useState<any | null>(null); // For replying to someone else's note
  const [replyText, setReplyText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteIsCloseFriends, setNoteIsCloseFriends] = useState(false);

  // Instants states
  const [instants, setInstants] = useState<any[]>([]);
  const [showCreateInstantModal, setShowCreateInstantModal] = useState(false);
  const [showOwnStatusMenu, setShowOwnStatusMenu] = useState(false);

  // Message delete state
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [selectedInstant, setSelectedInstant] = useState<any | null>(null);
  const [instantCaption, setInstantCaption] = useState('');
  const [instantIsPublic, setInstantIsPublic] = useState(true);
  const [selectedInstantRecipients, setSelectedInstantRecipients] = useState<string[]>([]);
  const [isSubmittingInstant, setIsSubmittingInstant] = useState(false);
  const [selectedInstantMediaUrl, setSelectedInstantMediaUrl] = useState<string | null>(null);
  const [isUploadingInstantMedia, setIsUploadingInstantMedia] = useState(false);
  const [instantMediaError, setInstantMediaError] = useState('');
  const [instantReplyText, setInstantReplyText] = useState('');
  const [isSendingInstantReply, setIsSendingInstantReply] = useState(false);

  const PRESET_INSTANT_PHOTOS = [
    { id: 'coffee', name: 'Morning Brew ☕', url: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=500&auto=format&fit=crop&q=60' },
    { id: 'study', name: 'Coding late 💻', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60' },
    { id: 'sunset', name: 'Sunset walk 🌅', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=60' },
    { id: 'pizza', name: 'Dinner time 🍕', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60' }
  ];

  // Status Notes multimedia states
  const [composerTab, setComposerTab] = useState<'text' | 'music' | 'media'>('text');
  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null);
  const [previewingSongId, setPreviewingSongId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState('');

  // GIF list
  const PRESET_GIFS = [
    { id: 'happy', name: 'Happy', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2o0aDRmcnd5ZHB1djFzOW8zbndhZ2Z2d2Fod2JrcDFnMHptOW4ydSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/1gXJ0M4PiFAlF2otqW/giphy.gif' },
    { id: 'thumbs_up', name: 'Thumbs Up', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3phOHQyaGR2c2U5bzVpZXBiaTBzYnBmaG16M3pvazZkMXBiaHNtNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/WvHQK5U983M1E2U6uP/giphy.gif' },
    { id: 'fire', name: 'Fire', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3hveGJrdzBpNjNreDZvdGxhbnduazB5djd5dW42NGF6dXBmOTdyYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Y8GpvAgy2o57V212tU/giphy.gif' },
    { id: 'lol', name: 'Laughing', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzhqMXZsc3ZyeTVsOHhpdmZ1eW9udTRrYng1YmhqOHZzYnQycTJ6ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/TGW5L511Q2c5S18vXj/giphy.gif' },
    { id: 'cry', name: 'Crying', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzFmMDMyeHY4ZmE2ZXJodThocXl5MG04N2lzaDV0N3E2MDR2OG03YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/f0tZcOCe8ZviA9O6Vb/giphy.gif' },
    { id: 'mind_blown', name: 'Mind Blown', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHgzcXB5Y29rczFvdmh0MDd4Nms1YWx1NXZ2NDh1c2VmaThhZXc4MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l2SpY6eYq3F6y7aGk/giphy.gif' },
    { id: 'love', name: 'Heart', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDNydjNmZmdsM2N2aG8zYnZqZXQ1ZmdveXo4MXptNm5vNDlzNXo5YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/8g54S3TpvxIysO5Oex/giphy.gif' },
    { id: 'wink', name: 'Wink', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3pxYXB4MHZ0azg5cDh5ZXpxYmdxbzBiaW12OHJmOGxveHpxazQ0ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Vf4P2g6w10e6Xf43kH/giphy.gif' }
  ];

  const handleTogglePreviewSong = (song: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (previewingSongId === song.id) {
      if (audioElement) {
        audioElement.pause();
      }
      setPreviewingSongId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(song.url);
      audio.play().catch(err => console.log('Audio playback error:', err));
      setAudioElement(audio);
      setPreviewingSongId(song.id);
      
      audio.onended = () => {
        setPreviewingSongId(null);
      };
    }
  };

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const handleCloseCreateModal = () => {
    setShowCreateNoteModal(false);
    setNewNoteText('');
    setSelectedSong(null);
    setSelectedMediaUrl(null);
    setSelectedMediaType(null);
    setComposerTab('text');
    setMediaError('');
    setNoteIsCloseFriends(false);
    if (audioElement) {
      audioElement.pause();
      setPreviewingSongId(null);
    }
  };

  const loadInstants = async () => {
    try {
      const res = await apiFetch('/instants/feed');
      if (res.ok) {
        const data = await res.json();
        setInstants(data || []);
      }
    } catch (err) {
      console.error('Failed to load instants:', err);
    }
  };

  const loadNotes = async () => {
    try {
      const res = await apiFetch('/notes/feed');
      if (res.ok) {
        const data = await res.json();
        setNotes(data || []);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadNotes();
      loadInstants();
    }
  }, [isAuthenticated]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || newNoteText.length > 60) return;
    setIsSubmittingNote(true);

    try {
      const payload = {
        content: newNoteText,
        songName: selectedSong?.name || null,
        songArtist: selectedSong?.artist || null,
        songUrl: selectedSong?.url || null,
        mediaUrl: selectedMediaUrl,
        mediaType: selectedMediaType,
        isCloseFriends: noteIsCloseFriends,
      };

      const res = await apiFetch('/notes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        handleCloseCreateModal();
        loadNotes();
      } else {
        alert('Failed to save status note');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteOwnNote = async () => {
    try {
      const res = await apiFetch('/notes', {
        method: 'DELETE',
      });

      if (res.ok) {
        setActiveNoteAction(null);
        loadNotes();
      } else {
        alert('Failed to delete status note');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseInstantModal = () => {
    setShowCreateInstantModal(false);
    setSelectedInstantMediaUrl(null);
    setInstantCaption('');
    setInstantIsPublic(true);
    setSelectedInstantRecipients([]);
    setInstantMediaError('');
  };

  const handleSaveInstant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstantMediaUrl) return;
    setIsSubmittingInstant(true);

    try {
      const payload = {
        mediaUrl: selectedInstantMediaUrl,
        caption: instantCaption,
        isPublic: instantIsPublic,
        recipientIds: !instantIsPublic ? selectedInstantRecipients : [],
      };

      const res = await apiFetch('/instants', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        handleCloseInstantModal();
        loadInstants();
      } else {
        alert('Failed to share Instant');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingInstant(false);
    }
  };

  const handleSendInstantReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instantReplyText.trim() || !selectedInstant) return;
    setIsSendingInstantReply(true);

    try {
      const targetUserId = selectedInstant.userId;

      const chatRes = await apiFetch('/chats', {
        method: 'POST',
        body: JSON.stringify({
          isGroup: false,
          memberIds: [targetUserId],
        }),
      });

      if (chatRes.ok) {
        const chat = await chatRes.json();
        const messageContent = `Replied to your Instant: "${instantReplyText}"\n\n[View Instant Photo](${selectedInstant.mediaUrl})`;

        const msgRes = await apiFetch(`/chats/messages/${chat.id}`, {
          method: 'POST',
          body: JSON.stringify({
            content: messageContent,
            type: 'TEXT',
          }),
        });

        if (msgRes.ok) {
          setInstantReplyText('');
          setSelectedInstant(null);
          setSelectedChat(chat);
          
          const msgListRes = await apiFetch(`/chats/messages/${chat.id}`);
          if (msgListRes.ok) {
            const msgData = await msgListRes.json();
            setMessages(msgData || []);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingInstantReply(false);
    }
  };

  const handleDeleteOwnInstant = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this Instant?')) return;

    try {
      const res = await apiFetch(`/instants/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSelectedInstant(null);
        loadInstants();
      } else {
        alert('Failed to delete Instant');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId);
  };

  const handleSendNoteReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeReplyNote) return;
    setIsSubmittingNote(true);

    try {
      const targetUserId = activeReplyNote.userId;

      // 1. Create/find chat room with this user
      const chatRes = await apiFetch('/chats', {
        method: 'POST',
        body: JSON.stringify({
          isGroup: false,
          memberIds: [targetUserId],
        }),
      });

      if (chatRes.ok) {
        const chat = await chatRes.json();

        // 2. Send the reply text as a message in that chat room
        const msgRes = await apiFetch(`/chats/messages/${chat.id}`, {
          method: 'POST',
          body: JSON.stringify({ content: `Replying to status note "${activeReplyNote.content}":\n${replyText}` }),
        });

        if (msgRes.ok) {
          // Add/select chat room instantly
          setChats((prev) => {
            if (prev.some((c) => c.id === chat.id)) {
              return prev;
            }
            return [chat, ...prev];
          });
          setSelectedChat(chat);
          setReplyText('');
          setActiveReplyNote(null);
        } else {
          alert('Failed to send reply message');
        }
      } else {
        alert('Failed to start chat session');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const ownNote = notes.find((n) => n.userId === currentUser?.id);
  const ownInstant = instants.find((i) => i.userId === currentUser?.id);

  const otherUsersWithStatus = Array.from(new Set([
    ...notes.map(n => n.userId),
    ...instants.map(i => i.userId)
  ])).filter(userId => userId !== currentUser?.id);

  const combinedStatuses = otherUsersWithStatus.map(uId => {
    const note = notes.find(n => n.userId === uId);
    const instant = instants.find(i => i.userId === uId);
    const user = note?.user || instant?.user;
    return {
      userId: uId,
      user,
      note,
      instant
    };
  });

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isInitialized, router]);

  // Load chats lists on start
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadChats() {
      try {
        const res = await apiFetch('/chats');
        if (res.ok) {
          const data = await res.json();
          setChats(data || []);
        }
      } catch (err) {
        console.error('Failed to load chats:', err);
      }
    }
    loadChats();
  }, [isAuthenticated]);

  // Load message logs when chat changes
  useEffect(() => {
    if (!selectedChat) return;

    async function loadMessages() {
      try {
        const res = await apiFetch(`/chats/messages/${selectedChat.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }

    loadMessages();
    joinChat(selectedChat.id);

    return () => {
      leaveChat(selectedChat.id);
    };
  }, [selectedChat, joinChat, leaveChat]);

  // Listen to Socket.io events
  useEffect(() => {
    if (!socket || !currentUser) return;

    socket.on('new_message', (msg: any) => {
      if (selectedChat && msg.chatId === selectedChat.id) {
        setMessages((prev) => [...prev, msg]);
        apiFetch(`/chats/read/${selectedChat.id}`, { method: 'POST' }); // Mark read
      }

      setChats((prev) =>
        prev.map((c) =>
          c.id === msg.chatId
            ? {
                ...c,
                messages: [msg],
                updatedAt: msg.createdAt,
              }
            : c
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
    });

    socket.on('typing_status', ({ chatId, typingUserIds }) => {
      if (selectedChat && chatId === selectedChat.id) {
        const otherTypists = typingUserIds.filter((id: string) => id !== currentUser.id);
        setIsTypingList(otherTypists);
      }
    });

    socket.on('message_deleted', ({ chatId, messageId }: { chatId: string, messageId: string }) => {
      if (selectedChat && chatId === selectedChat.id) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }

      setChats((prev) =>
        prev.map((c) => {
          if (c.id === chatId) {
            const isLastDeleted = c.messages?.[0]?.id === messageId;
            if (isLastDeleted) {
              return {
                ...c,
                messages: [{ id: messageId, content: "Message unsent", sender: { name: "", username: "" } }],
              };
            }
          }
          return c;
        })
      );
    });

    return () => {
      socket.off('new_message');
      socket.off('typing_status');
      socket.off('message_deleted');
    };
  }, [socket, selectedChat, currentUser]);

  // Autoscroll message window
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTypingList]);

  // Trigger screenshot notification
  const handleScreenshotNotification = async () => {
    if (!selectedChat) return;
    try {
      const res = await apiFetch(`/chats/messages/${selectedChat.id}`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'SCREENSHOT',
          content: 'took a screenshot of the chat',
        }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      } else {
        console.error('Failed to trigger screenshot warning');
      }
    } catch (err) {
      console.error('Error triggering screenshot warning:', err);
    }
  };

  // Keyboard screenshot detection listener with blur heuristic
  useEffect(() => {
    if (!selectedChat) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;

      const isPrtScn = e.key === 'PrintScreen';
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');

      if (isPrtScn || isMacScreenshot) {
        handleScreenshotNotification();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;

      // Catch PrintScreen keyup just in case keydown event was intercepted/skipped
      if (e.key === 'PrintScreen') {
        handleScreenshotNotification();
      }
    };

    const handleBlur = () => {
      // Heuristic: If window loses focus while Meta (Win/Cmd) + Shift are held down, 
      // it means the user triggered an OS-level snipping tool (Win+Shift+S or Cmd+Shift+4)
      const hasMeta = keysPressed.current['Meta'] || keysPressed.current['OS'] || keysPressed.current['Control'];
      const hasShift = keysPressed.current['Shift'];

      if ((hasMeta && hasShift) || keysPressed.current['PrintScreen']) {
        handleScreenshotNotification();
      }

      // Reset pressed keys on focus loss
      keysPressed.current = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedChat]);

  // Handle typing input triggers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (socket && selectedChat && currentUser) {
      if (e.target.value.trim().length > 0) {
        socket.emit('typing_start', { chatId: selectedChat.id, userId: currentUser.id });
      } else {
        socket.emit('typing_stop', { chatId: selectedChat.id, userId: currentUser.id });
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChat) return;

    try {
      if (socket && currentUser) {
        socket.emit('typing_stop', { chatId: selectedChat.id, userId: currentUser.id });
      }

      const res = await apiFetch(`/chats/messages/${selectedChat.id}`, {
        method: 'POST',
        body: JSON.stringify({ content: inputText }),
      });

      if (res.ok) {
        setInputText('');
      } else {
        const errData = await res.json();
        alert(errData.error || 'Message failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open conversation creator modal
  const openCreateModal = async () => {
    setIsCreatingChat(true);
    try {
      const res = await apiFetch('/users/suggested');
      if (res.ok) {
        const data = await res.json();
        setPotentialMembers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChat = async () => {
    if (selectedMembers.length === 0) return;
    try {
      const payload = {
        isGroup,
        name: isGroup ? groupName || 'New Group Chat' : undefined,
        memberIds: selectedMembers,
      };

      const res = await apiFetch('/chats', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const chat = await res.json();
        setChats((prev) => [chat, ...prev]);
        setSelectedChat(chat);
        setIsCreatingChat(false);
        setSelectedMembers([]);
        setGroupName('');
        setIsGroup(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getChatPartnerName = (chat: any) => {
    if (chat.isGroup) return chat.name;
    const partner = chat.members.find((m: any) => m.userId !== currentUser?.id);
    return partner ? partner.user.username : 'Campify Member';
  };

  const getChatPartnerAvatar = (chat: any) => {
    if (chat.isGroup) return chat.avatarUrl;
    const partner = chat.members.find((m: any) => m.userId !== currentUser?.id);
    return partner ? partner.user.profile?.avatarUrl : null;
  };

  const isPartnerOnline = (chat: any) => {
    if (chat.isGroup) return false;
    const partner = chat.members.find((m: any) => m.userId !== currentUser?.id);
    return partner ? onlineUsers.includes(partner.userId) : false;
  };

  return (
    <div className="h-screen w-full flex bg-neutral-950 overflow-hidden relative select-none font-sans">
      
      {/* DISCORD-STYLE COLUMN 1: Server Shortcuts Icons (Desktop Only) */}
      <div className="hidden sm:flex w-[72px] flex-col items-center py-4 bg-neutral-950/80 border-r border-white/5 gap-3 relative z-10 flex-shrink-0">
        
        {/* Sphere branding circular icon */}
        <div className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-500 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        
        <div className="w-8 border-t border-white/10 my-1" />

        {/* Dynamic circular DM icons list */}
        <div className="flex flex-col gap-2.5 overflow-y-auto flex-grow pr-0.5 no-scrollbar">
          {chats.map((c) => {
            const name = getChatPartnerName(c);
            const avatar = getChatPartnerAvatar(c);
            const isActive = selectedChat?.id === c.id;

            return (
              <div 
                key={c.id}
                onClick={() => setSelectedChat(c)}
                className="relative group cursor-pointer"
              >
                {/* Side white hover notch */}
                <div className={`absolute left-0 top-3.5 w-[3px] bg-white rounded-r-md transition-all duration-300 ${
                  isActive ? 'h-5' : 'h-0 group-hover:h-3'
                }`} />

                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className={`w-12 h-12 object-cover transition-all duration-300 ${
                      isActive ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]'
                    }`}
                  />
                ) : (
                  <div className={`w-12 h-12 bg-neutral-900 border border-white/5 flex items-center justify-center font-bold text-sm text-neutral-300 transition-all duration-300 ${
                    isActive ? 'rounded-[16px] bg-purple-600 text-white' : 'rounded-[24px] hover:rounded-[16px]'
                  }`}>
                    {name[0].toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Plus toggle modal */}
        <button
          onClick={openCreateModal}
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-300 text-purple-400 border-dashed"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* INSTAGRAM-STYLE COLUMN 2: Messages listing sidebar */}
      <div className="w-80 border-r border-white/5 flex flex-col h-full bg-neutral-900/35 relative z-10 flex-shrink-0">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-md font-black tracking-tight font-outfit text-white">Direct Messages</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowCreateInstantModal(true)}
              className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl active-shrink cursor-pointer border-0 flex items-center justify-center gap-1 shadow-md shadow-purple-500/10"
              title="Post Instant Photo"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
              <span className="text-[10px] font-bold px-0.5">Instant</span>
            </button>
            <button
              onClick={openCreateModal}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white rounded-xl active-shrink cursor-pointer"
              title="New Message"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Notes Row */}
        <div className="flex gap-4 overflow-x-auto p-4 border-b border-white/5 items-center no-scrollbar bg-neutral-900/10">
          {/* Own Status Note Bubble */}
          <div className="flex flex-col items-center flex-shrink-0 relative group">
            <div className="relative select-none pt-4 flex flex-col items-center">
              {/* Note Speech Bubble overlay */}
              {ownNote && (
                <div 
                  onClick={() => setShowOwnStatusMenu(true)}
                  className={`absolute bottom-[44px] left-1/2 -translate-x-1/2 border text-[8px] font-medium p-2 rounded-2xl shadow-lg flex flex-col items-center gap-1 max-w-[90px] z-15 min-w-[50px] cursor-pointer hover:scale-[1.05] transition-transform select-none animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                    ownNote.isCloseFriends 
                      ? 'bg-neutral-900 border-green-500/30 text-green-400' 
                      : 'bg-neutral-800 border-white/10 text-white'
                  }`}
                >
                  {ownNote.isCloseFriends && (
                    <span className="text-[6px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-0.5 select-none scale-90 mb-0.5">
                      <Star className="w-2 h-2 text-green-500 fill-green-500" /> Close Friends
                    </span>
                  )}
                  {ownNote.mediaUrl && (
                    <img src={ownNote.mediaUrl} className="w-7 h-7 rounded object-cover flex-shrink-0" alt="media badge" />
                  )}
                  <span className="truncate max-w-[76px] font-bold leading-normal">{ownNote.content}</span>
                  {ownNote.songName && (
                    <span className="text-[7px] text-purple-305 truncate max-w-[76px] flex items-center gap-0.5 mt-0.5 select-none font-bold">
                      <Music className="w-2 h-2 text-purple-400" /> {ownNote.songName}
                    </span>
                  )}
                </div>
              )}

              {/* Avatar circle */}
              <div 
                onClick={() => setShowOwnStatusMenu(true)}
                className={`relative cursor-pointer hover:scale-[1.05] transition-all duration-300 p-0.5 rounded-full ${
                  ownInstant 
                    ? 'bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 animate-pulse border-0' 
                    : 'border-0'
                }`}
              >
                {ownInstant && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white font-extrabold text-[7px] border border-neutral-900 shadow z-15">
                    <Zap className="w-2 h-2 text-yellow-500 fill-yellow-500" />
                  </div>
                )}
                {!ownNote && !ownInstant && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-neutral-950 font-extrabold text-[10px] select-none border border-neutral-900 shadow z-15">
                    +
                  </div>
                )}
                {currentUser?.profile?.avatarUrl ? (
                  <img 
                    src={currentUser.profile.avatarUrl} 
                    alt="My Note" 
                    className={`w-12 h-12 rounded-full object-cover border border-white/10 ${
                      ownInstant ? 'border-neutral-900 border-2' : ownNote?.isCloseFriends ? 'border-green-500 border-2' : ''
                    }`} 
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold text-sm ${
                    ownInstant ? 'border-neutral-900 border-2' : ownNote?.isCloseFriends ? 'border-green-500 border-2' : ''
                  }`}>
                    {currentUser?.username[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] text-neutral-455 mt-1 max-w-[56px] truncate">Your Note</span>
          </div>

          {/* Other Active Statuses (Notes and Instants) */}
          {combinedStatuses.map(({ userId, user, note, instant }) => (
            <div key={userId} className="flex flex-col items-center flex-shrink-0 relative">
              <div className="relative select-none pt-4 flex flex-col items-center">
                {/* Status Note bubble above avatar */}
                {note && (
                  <div 
                    onClick={() => setActiveReplyNote(note)}
                    className={`absolute bottom-[44px] left-1/2 -translate-x-1/2 border text-[8px] font-medium p-2 rounded-2xl shadow-lg flex flex-col items-center gap-1 max-w-[90px] z-15 min-w-[50px] cursor-pointer hover:scale-[1.05] transition-transform select-none animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                      note.isCloseFriends 
                        ? 'bg-neutral-900 border-green-500/30 text-green-400 font-bold' 
                        : 'bg-white/95 dark:bg-neutral-800 border-white/10 text-neutral-900 dark:text-white'
                    }`}
                  >
                    {note.isCloseFriends && (
                      <span className="text-[6px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-0.5 select-none scale-90 mb-0.5">
                        <Star className="w-2 h-2 text-green-500 fill-green-500" /> Close Friends
                      </span>
                    )}
                    {note.mediaUrl && (
                      <img src={note.mediaUrl} className="w-7 h-7 rounded object-cover flex-shrink-0" alt="media badge" />
                    )}
                    <span className="truncate max-w-[76px] font-semibold leading-normal">{note.content}</span>
                    {note.songName && (
                      <span className="text-[7px] text-purple-400 dark:text-purple-305 truncate max-w-[76px] flex items-center gap-0.5 mt-0.5 select-none font-bold">
                        <Music className="w-2 h-2 text-purple-455" /> {note.songName}
                      </span>
                    )}
                  </div>
                )}

                {/* Avatar circle */}
                <div
                  onClick={() => {
                    if (instant) {
                      setSelectedInstant(instant);
                    } else if (note) {
                      setActiveReplyNote(note);
                    }
                  }}
                  className={`relative cursor-pointer hover:scale-[1.05] transition-all duration-300 p-0.5 rounded-full ${
                    instant 
                      ? 'bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 border-0' 
                      : 'border-0'
                  }`}
                >
                  {instant && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white font-extrabold text-[7px] border border-neutral-900 shadow z-15">
                      <Zap className="w-2 h-2 text-yellow-500 fill-yellow-500" />
                    </div>
                  )}
                  {user?.profile?.avatarUrl ? (
                    <img 
                      src={user.profile.avatarUrl} 
                      alt="avatar" 
                      className={`w-12 h-12 rounded-full object-cover border border-white/10 ${
                        instant ? 'border-neutral-900 border-2' : note?.isCloseFriends ? 'border-green-500 border-2' : 'border-purple-500/30'
                      }`} 
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full bg-cyan-700 flex items-center justify-center text-white font-bold text-sm ${
                      instant ? 'border-neutral-900 border-2' : note?.isCloseFriends ? 'border-green-500 border-2' : ''
                    }`}>
                      {user?.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-neutral-450 mt-1 max-w-[56px] truncate">
                {user?.username}
              </span>
            </div>
          ))}

          {combinedStatuses.length === 0 && (
            <span className="text-[9px] text-neutral-550 italic px-2">No active updates.</span>
          )}
        </div>

        {/* List of chat items */}
        <div className="flex-1 overflow-y-auto flex flex-col p-2.5 gap-1.5 no-scrollbar">
          {chats.length === 0 ? (
            <div className="text-center py-16 text-xs text-neutral-500 italic">
              No conversations. Click + to begin.
            </div>
          ) : (
            chats.map((chat) => {
              const name = getChatPartnerName(chat);
              const avatar = getChatPartnerAvatar(chat);
              const isOnline = isPartnerOnline(chat);
              const lastMsg = chat.messages?.[0];
              const isSelected = selectedChat?.id === chat.id;

              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`flex items-center gap-3 p-3 rounded-2xl text-left bg-transparent border-0 outline-none cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-600/10 border border-purple-500/20 shadow-sm'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="avatar" className="w-11 h-11 rounded-[14px] object-cover border border-white/5" />
                    ) : (
                      <div className="w-11 h-11 rounded-[14px] bg-purple-500/80 flex items-center justify-center text-white font-bold text-sm">
                        {name[0].toUpperCase()}
                      </div>
                    )}
                    {isOnline && (
                      <Circle className="w-3.5 h-3.5 fill-green-500 text-neutral-950 absolute bottom-[-1px] right-[-1px]" />
                    )}
                  </div>
<div className="flex flex-col flex-1 overflow-hidden gap-0.5">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-xs text-white truncate max-w-[120px]">
                        {name}
                      </span>
                      {lastMsg && (
                        <span className="text-[9px] text-neutral-500">
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-450 truncate">
                      {lastMsg 
                        ? (lastMsg.type === 'SCREENSHOT' 
                          ? (lastMsg.senderId === currentUser?.id ? 'You took a screenshot' : 'Screenshot taken') 
                          : `${lastMsg.senderId === currentUser?.id ? 'You' : lastMsg.sender.username}: ${lastMsg.content}`)
                        : 'No messages yet.'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* HYBRID COLUMN 3: Central conversation window */}
      <div className="flex-grow flex flex-col h-full bg-radial from-neutral-950/20 via-neutral-950 to-neutral-950 relative z-10">
        
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4.5 border-b border-white/5 flex items-center justify-between bg-neutral-900/15 backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  {getChatPartnerAvatar(selectedChat) ? (
                    <img
                      src={getChatPartnerAvatar(selectedChat)}
                      alt="chat partner avatar"
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {getChatPartnerName(selectedChat)[0].toUpperCase()}
                    </div>
                  )}
                  {isPartnerOnline(selectedChat) && (
                    <Circle className="w-3 h-3 fill-green-500 text-neutral-950 absolute bottom-[-1px] right-[-1px]" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-white flex items-center gap-1">
                    {getChatPartnerName(selectedChat)}
                  </span>
                  {isPartnerOnline(selectedChat) ? (
                    <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider">Active Now</span>
                  ) : (
                    <span className="text-[9px] text-neutral-500">Offline</span>
                  )}
                </div>
              </div>

              {/* Call widgets / Action bars */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleScreenshotNotification} 
                  title="Simulate Screenshot Warning"
                  className="p-2 hover:bg-white/5 text-pink-500 hover:text-pink-400 rounded-xl bg-transparent border-0 cursor-pointer active-shrink"
                >
                  <Camera className="w-4.5 h-4.5" />
                </button>
                <button onClick={() => alert('Call feature simulation')} className="p-2 hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl bg-transparent border-0 cursor-pointer">
                  <Phone className="w-4.5 h-4.5" />
                </button>
                <button onClick={() => alert('Video call feature simulation')} className="p-2 hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl bg-transparent border-0 cursor-pointer">
                  <Video className="w-4.5 h-4.5" />
                </button>
                <button onClick={() => alert('Details panel')} className="p-2 hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl bg-transparent border-0 cursor-pointer">
                  <Info className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Messages body history */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 no-scrollbar">
              {messages.map((msg) => {
                const isOwn = msg.senderId === currentUser?.id;

                if (msg.type === 'SCREENSHOT') {
                  return (
                    <div 
                      key={msg.id} 
                      className="self-center my-2 flex items-center gap-2 px-4 py-2 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-[11px] font-bold text-pink-400 select-none shadow-sm shadow-pink-950/5 animate-in fade-in zoom-in-95 duration-200"
                    >
                      <ShieldAlert className="w-4 h-4 text-pink-500" />
                      <span>
                        {isOwn 
                          ? 'You took a screenshot of the chat' 
                          : `@${msg.sender?.username || 'user'} took a screenshot of the chat`}
                      </span>
                    </div>
                  );
                }

                const isPostShare = msg.content?.startsWith('POST_SHARE_ID:');
                let postData: any = null;
                if (isPostShare) {
                  try {
                    const parts = msg.content.substring('POST_SHARE_ID:'.length).split('|');
                    postData = {
                      id: parts[0],
                      username: parts[1],
                      content: parts[2],
                      mediaUrl: parts[3]
                    };
                  } catch (e) {
                    console.error('Failed to parse post share data:', e);
                  }
                }

                if (isPostShare && postData) {
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[70%] ${isOwn ? 'self-end items-end' : 'self-start items-start'} group`}
                    >
                      <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div
                          className={`p-3.5 rounded-3xl text-xs leading-relaxed flex flex-col gap-2 border border-white/10 ${
                            isOwn
                              ? 'bg-neutral-900/90 text-white rounded-tr-none shadow-md shadow-purple-950/15'
                              : 'bg-neutral-900 text-neutral-200 rounded-tl-none'
                          }`}
                          style={{ minWidth: '220px' }}
                        >
                          <div className="flex items-center gap-1.5 text-neutral-400 border-b border-white/5 pb-2 mb-0.5 select-none font-outfit">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider">Shared Post</span>
                          </div>
                          <span className="text-[11px] font-extrabold text-cyan-400">@{postData.username}</span>
                          {postData.mediaUrl && (
                            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-950 border border-white/5">
                              <img src={postData.mediaUrl} alt="shared post preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                          {postData.content && (
                            <p className="text-[11px] text-neutral-300 italic leading-snug line-clamp-2 mt-0.5 font-medium">
                              &ldquo;{postData.content}&rdquo;
                            </p>
                          )}
                          <Link
                            href={`/${postData.username}`}
                            className="mt-1.5 w-full py-2 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/35 hover:to-cyan-500/35 text-cyan-400 font-extrabold text-[10px] rounded-xl text-center no-underline border border-cyan-500/20 active-shrink transition-all uppercase tracking-wider"
                          >
                            View Creator Profile
                          </Link>
                        </div>

                        {isOwn && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/5 hover:bg-red-500/10 text-neutral-450 hover:text-red-400 rounded-xl cursor-pointer border-0 active-shrink flex items-center justify-center"
                            title="Unsend Message"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-1 font-semibold flex items-center gap-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isOwn && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[70%] ${isOwn ? 'self-end items-end' : 'self-start items-start'} group`}
                  >
                    <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                          isOwn
                            ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-purple-950/15'
                            : 'bg-neutral-900 text-neutral-200 border border-white/5 rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {isOwn && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/5 hover:bg-red-500/10 text-neutral-450 hover:text-red-400 rounded-xl cursor-pointer border-0 active-shrink flex items-center justify-center"
                          title="Unsend Message"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <span className="text-[9px] text-neutral-500 mt-1 font-semibold flex items-center gap-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isOwn && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                    </span>
                  </div>
                );
              })}

              {/* Typing indications */}
              {isTypingList.length > 0 && (
                <div className="self-start flex items-center gap-2">
                  <div className="px-4 py-2 bg-neutral-900 border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message composer input bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-neutral-900/10 backdrop-blur-md flex items-center gap-3.5">
              <button type="button" className="p-2.5 text-neutral-500 hover:text-white hover-scale active-shrink bg-transparent border-0 outline-none">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button type="button" className="p-2.5 text-neutral-500 hover:text-white hover-scale active-shrink bg-transparent border-0 outline-none">
                <Mic className="w-5 h-5" />
              </button>

              <input
                type="text"
                placeholder="Message @partner..."
                value={inputText}
                onChange={handleInputChange}
                className="w-full px-4.5 py-3 bg-white/5 border border-transparent focus:border-white/10 outline-none rounded-2xl text-xs transition-all placeholder:text-neutral-500 text-white"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-2xl active-shrink hover-scale disabled:opacity-40 border-0 outline-none cursor-pointer shadow-md shadow-purple-500/10"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-grow flex flex-col justify-center items-center gap-4 p-8">
            <div className="w-16 h-16 rounded-[20px] bg-white/5 border border-white/5 flex items-center justify-center animate-pulse">
              <MessageCircle className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="font-extrabold text-sm text-neutral-400 font-outfit">Chat Room Selector</h3>
            <p className="text-neutral-500 text-xs text-center max-w-xs leading-relaxed">
              Select a conversation channel from your shortcuts sidebar, or click the + indicator to search creators.
            </p>
          </div>
        )}
      </div>

      {/* Creation Modal for Chats */}
      {isCreatingChat && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col glass shadow-2xl text-white">
            
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <span className="font-bold text-sm font-outfit">New Conversation</span>
              <button 
                onClick={() => setIsCreatingChat(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4 max-h-96 overflow-y-auto">
              {/* Group Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGroup}
                  onChange={(e) => { setIsGroup(e.target.checked); setSelectedMembers([]); }}
                  className="rounded border-white/15 bg-transparent text-purple-600 focus:ring-purple-500/20"
                />
                <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Create Group Chat</span>
              </label>

              {/* Group Name input */}
              {isGroup && (
                <input
                  type="text"
                  placeholder="Group Name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs outline-none text-white focus:border-white/10"
                />
              )}

              {/* User Selection List */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Select Creators</span>
                <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {potentialMembers.map((member) => {
                    const isChecked = selectedMembers.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <User className="w-4.5 h-4.5 text-neutral-400" />
                          <span className="text-xs font-semibold text-neutral-200">@{member.username}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedMembers(selectedMembers.filter((id) => id !== member.id));
                            } else {
                              if (isGroup) {
                                setSelectedMembers([...selectedMembers, member.id]);
                              } else {
                                setSelectedMembers([member.id]);
                              }
                            }
                          }}
                          className="rounded border-white/15 bg-transparent text-purple-600 focus:ring-purple-500/20"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleCreateChat}
                disabled={selectedMembers.length === 0}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-xl active-shrink hover-scale text-xs mt-2 disabled:opacity-50 border-0 cursor-pointer shadow-md shadow-purple-500/10"
              >
                Create Conversation
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Own Status Menu Modal */}
      {showOwnStatusMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowOwnStatusMenu(false)}>
          <div 
            className="w-full max-w-xs bg-neutral-900/90 border border-white/10 rounded-3xl p-5 flex flex-col gap-3 shadow-2xl text-white animate-in fade-in zoom-in duration-200 glass"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <span className="font-bold text-sm font-outfit">Your Status</span>
              <button 
                onClick={() => setShowOwnStatusMenu(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {/* Note actions */}
              {ownNote ? (
                <>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-0.5">Status Note</div>
                  <button
                    onClick={() => {
                      setShowOwnStatusMenu(false);
                      setActiveNoteAction(ownNote);
                    }}
                    className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-left text-xs font-bold transition-all border-0 text-white cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-cyan-400 mr-2 inline-block align-middle" />
                    <span className="align-middle">Edit Status Note</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowOwnStatusMenu(false);
                      handleDeleteOwnNote();
                    }}
                    className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-left text-xs font-bold transition-all border-0 text-red-450 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 mr-2 inline-block align-middle" />
                    <span className="align-middle">Delete Status Note</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowOwnStatusMenu(false);
                    setShowCreateNoteModal(true);
                  }}
                  className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-left text-xs font-bold transition-all border-0 text-white cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 text-cyan-400 mr-2 inline-block align-middle" />
                  <span className="align-middle">Share a Status Note</span>
                </button>
              )}

              <div className="w-full border-t border-white/5 my-1" />

              {/* Instant actions */}
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-0.5">Instant Photo</div>
              {ownInstant && (
                <button
                  onClick={() => {
                    setShowOwnStatusMenu(false);
                    setSelectedInstant(ownInstant);
                  }}
                  className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-left text-xs font-bold transition-all border-0 text-white cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-2 inline-block align-middle" />
                  <span className="align-middle">View Your Instant</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowOwnStatusMenu(false);
                  setShowCreateInstantModal(true);
                }}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-purple-650 hover:opacity-90 rounded-xl text-left text-xs font-bold transition-all border-0 text-white cursor-pointer flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><Camera className="w-4 h-4" /> Post Spontaneous Instant</span>
                <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full">New</span>
              </button>

              {ownInstant && (
                <button
                  onClick={(e) => {
                    setShowOwnStatusMenu(false);
                    handleDeleteOwnInstant(ownInstant.id, e);
                  }}
                  className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-left text-xs font-bold transition-all border-0 text-red-450 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-500 mr-2 inline-block align-middle" />
                  <span className="align-middle">Delete Your Instant</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share / Create Status Note Modal */}
      {showCreateNoteModal && (
        <div className="fixed inset-0 bg-neutral-955/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-905 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 glass shadow-2xl text-white animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="font-bold text-sm font-outfit">Share a thought</span>
              <button 
                onClick={handleCloseCreateModal}
                className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Composer Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-2">
              <button
                type="button"
                onClick={() => setComposerTab('text')}
                className={`pb-1 px-2 font-bold text-[10px] uppercase tracking-wider transition-all bg-transparent border-0 cursor-pointer ${
                  composerTab === 'text' 
                    ? 'text-white border-b-2 border-purple-500' 
                    : 'text-neutral-450 hover:text-neutral-200'
                }`}
              >
                Thought
              </button>
              <button
                type="button"
                onClick={() => setComposerTab('music')}
                className={`pb-1 px-2 font-bold text-[10px] uppercase tracking-wider transition-all bg-transparent border-0 cursor-pointer ${
                  composerTab === 'music' 
                    ? 'text-white border-b-2 border-purple-500' 
                    : 'text-neutral-450 hover:text-neutral-200'
                }`}
              >
                Music
              </button>
              <button
                type="button"
                onClick={() => setComposerTab('media')}
                className={`pb-1 px-2 font-bold text-[10px] uppercase tracking-wider transition-all bg-transparent border-0 cursor-pointer ${
                  composerTab === 'media' 
                    ? 'text-white border-b-2 border-purple-500' 
                    : 'text-neutral-450 hover:text-neutral-200'
                }`}
              >
                GIFs & Images
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="flex flex-col gap-4">
              {/* Tab 1: Text Input */}
              {composerTab === 'text' && (
                <div className="flex flex-col gap-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={60}
                      placeholder="What's on your mind? (up to 60 characters)..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 focus:border-white/10 rounded-xl px-3.5 py-3 text-xs text-white outline-none focus:ring-0"
                      required
                      autoFocus
                    />
                    <span className="absolute right-3.5 bottom-2.5 text-[9px] text-neutral-500 font-bold">
                      {60 - newNoteText.length} chars left
                    </span>
                  </div>
                  <span className="text-2xs text-neutral-500 leading-normal px-1">
                    Your status note will be visible to your followed friends for 24 hours. They can reply directly to chat!
                  </span>
                </div>
              )}

              {/* Tab 2: Music Picker */}
              {composerTab === 'music' && (
                <div className="flex flex-col gap-3">
                  {selectedSong ? (
                    <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5 shadow-sm">
                      <img src={selectedSong.coverUrl} className="w-9 h-9 rounded-lg object-cover" alt="cover" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold truncate text-white">{selectedSong.name}</p>
                        <p className="text-[10px] text-neutral-400 truncate">{selectedSong.artist}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePreviewSong(selectedSong, e)}
                          className="p-1.5 rounded-full hover:bg-white/10 border-0 bg-transparent text-white cursor-pointer flex items-center justify-center"
                        >
                          {previewingSongId === selectedSong.id ? (
                            <Pause className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Play className="w-4 h-4 text-white" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSong(null);
                            if (audioElement) {
                              audioElement.pause();
                              setPreviewingSongId(null);
                            }
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold border-0 bg-transparent cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Select Preset Song</span>
                      <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {PRESET_SONGS.map((song) => (
                          <div
                            key={song.id}
                            onClick={() => setSelectedSong(song)}
                            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors min-w-0"
                          >
                            <img src={song.coverUrl} className="w-7 h-7 rounded-md object-cover flex-shrink-0" alt="cover" />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-[9px] font-bold truncate text-white">{song.name}</p>
                              <p className="text-[8px] text-neutral-500 truncate">{song.artist}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleTogglePreviewSong(song, e)}
                              className="p-1 rounded-full hover:bg-white/5 border-0 bg-transparent text-neutral-400 cursor-pointer flex-shrink-0"
                            >
                              {previewingSongId === song.id ? (
                                <Pause className="w-3.5 h-3.5 text-purple-400" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-white" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: GIFs & Images */}
              {composerTab === 'media' && (
                <div className="flex flex-col gap-3">
                  {selectedMediaUrl ? (
                    <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5 shadow-sm">
                      <img src={selectedMediaUrl} className="w-9 h-9 rounded-lg object-cover" alt="media preview" />
                      <div className="flex-1 text-left">
                        <span className="text-2xs font-bold text-white capitalize">{selectedMediaType || 'Media'} Attached</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedMediaUrl(null); setSelectedMediaType(null); }}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold border-0 bg-transparent cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Upload local image */}
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          id="note-media-upload"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingMedia(true);
                            setMediaError('');
                            try {
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const base64Data = reader.result as string;
                                const uploadRes = await apiFetch('/upload', {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    file: base64Data,
                                    filename: file.name
                                  })
                                });
                                
                                if (uploadRes.ok) {
                                  const { url } = await uploadRes.json();
                                  setSelectedMediaUrl(url);
                                  setSelectedMediaType('IMAGE');
                                } else {
                                  const err = await uploadRes.json();
                                  setMediaError(err.error || 'Upload failed');
                                }
                                setIsUploadingMedia(false);
                              };
                              reader.readAsDataURL(file);
                            } catch (err) {
                              console.error(err);
                              setMediaError('Error uploading file');
                              setIsUploadingMedia(false);
                            }
                          }}
                        />
                        <label
                          htmlFor="note-media-upload"
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer text-xs font-bold transition-all text-neutral-300 border border-white/5 select-none"
                        >
                          {isUploadingMedia ? <Loader2 className="w-4.5 h-4.5 animate-spin text-purple-400" /> : <ImageIcon className="w-4.5 h-4.5 text-purple-400" />}
                          Upload Local Image
                        </label>
                      </div>
                      
                      {mediaError && <span className="text-[10px] text-red-500 font-bold px-1">{mediaError}</span>}

                      {/* GIF Preset Grid */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Select Reaction GIF</span>
                        <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto pr-1">
                          {PRESET_GIFS.map((gif) => (
                            <div
                              key={gif.id}
                              onClick={() => { setSelectedMediaUrl(gif.url); setSelectedMediaType('GIF'); }}
                              className="aspect-square bg-white/5 border border-white/5 hover:border-purple-500 rounded-xl p-1 overflow-hidden cursor-pointer flex items-center justify-center transition-all hover:scale-95"
                            >
                              <img src={gif.url} className="w-full h-full object-contain" alt={gif.name} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status input always editable if songs or media are loaded (serves as caption) */}
              {composerTab !== 'text' && (
                <div className="relative">
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Add text status..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 focus:border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:ring-0"
                    required
                  />
                  <span className="absolute right-3.5 bottom-2 text-[8px] text-neutral-500 font-bold">
                    {60 - newNoteText.length} left
                  </span>
                </div>
              )}

              {/* Audience Selection */}
              <div className="flex flex-col gap-2 bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-neutral-455 uppercase tracking-wider text-left">Share with</span>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNoteIsCloseFriends(false)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all border-0 cursor-pointer ${
                      !noteIsCloseFriends 
                        ? 'bg-purple-500/10 text-purple-400 font-semibold' 
                        : 'bg-transparent text-neutral-455 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-full ${!noteIsCloseFriends ? 'bg-purple-500/20' : 'bg-neutral-800'}`}>
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <p className="text-2xs font-bold leading-none m-0">Followers you follow back</p>
                      </div>
                    </div>
                    {!noteIsCloseFriends && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setNoteIsCloseFriends(true)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all border-0 cursor-pointer ${
                      noteIsCloseFriends 
                        ? 'bg-green-500/10 text-green-400 font-semibold' 
                        : 'bg-transparent text-neutral-455 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-full ${noteIsCloseFriends ? 'bg-green-500/20' : 'bg-neutral-800'}`}>
                        <Star className="w-3.5 h-3.5 text-green-400 fill-green-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-2xs font-bold leading-none m-0">Close Friends</p>
                      </div>
                    </div>
                    {noteIsCloseFriends && <Check className="w-3.5 h-3.5 text-green-400" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingNote || isUploadingMedia || !newNoteText.trim() || newNoteText.length > 60}
                className="w-full mt-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl border-0 cursor-pointer flex items-center justify-center shadow-lg disabled:opacity-50"
              >
                {isSubmittingNote ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Share Status'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Own Active Note Action Modal */}
      {activeNoteAction && (
        <div className="fixed inset-0 bg-neutral-955/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-neutral-900 border border-white/10 rounded-3xl p-5 flex flex-col gap-4 glass shadow-2xl text-white animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-bold text-xs font-outfit">My Status Note</span>
              <button 
                onClick={() => setActiveNoteAction(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl text-center text-xs italic text-neutral-300 border border-white/5">
              &ldquo;{activeNoteAction.content}&rdquo;
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewNoteText(activeNoteAction.content);
                  setShowCreateNoteModal(true);
                  setActiveNoteAction(null);
                }}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-2 rounded-xl border-0 cursor-pointer active-shrink"
              >
                Leave a new status note
              </button>
              <button
                type="button"
                onClick={handleDeleteOwnNote}
                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs py-2 rounded-xl border-0 cursor-pointer active-shrink"
              >
                Delete note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply to User's Status Note Modal */}
      {activeReplyNote && (
        <div className="fixed inset-0 bg-neutral-955/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 glass shadow-2xl text-white animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="font-bold text-sm font-outfit">Reply to status note</span>
              <button 
                onClick={() => { setActiveReplyNote(null); setReplyText(''); }}
                className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl p-3.5 relative">
              {/* Note Speech Bubble overlay in modal */}
              <div className="absolute top-[-10px] right-4 bg-purple-600 border border-white/10 text-white text-[9.5px] font-bold px-2.5 py-1.5 rounded-2xl rounded-bl-none shadow">
                {activeReplyNote.content}
              </div>

              {activeReplyNote.user.profile?.avatarUrl ? (
                <img src={activeReplyNote.user.profile.avatarUrl} className="w-9 h-9 rounded-full object-cover" alt="avatar" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-cyan-700 flex items-center justify-center text-white text-xs font-bold">
                  {activeReplyNote.user.username[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-2xs text-white font-bold">@{activeReplyNote.user.username}</span>
                <span className="text-[10px] text-neutral-400">Active status note</span>
              </div>
            </div>

            <form onSubmit={handleSendNoteReply} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder={`Send a message reply to @${activeReplyNote.user.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-white/10 rounded-xl px-3.5 py-3 text-xs text-white outline-none focus:ring-0"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingNote || !replyText.trim()}
                className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl border-0 cursor-pointer flex items-center justify-center shadow-lg disabled:opacity-50"
              >
                {isSubmittingNote ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Instant Modal */}
      {showCreateInstantModal && (
        <div className="fixed inset-0 bg-neutral-955/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-905 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 glass shadow-2xl text-white animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm font-outfit">Share an Instant</span>
              </div>
              <button 
                onClick={handleCloseInstantModal}
                className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveInstant} className="flex flex-col gap-4">
              {selectedInstantMediaUrl ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-neutral-950 flex items-center justify-center">
                  <img src={selectedInstantMediaUrl} className="w-full h-full object-cover" alt="Instant preview" />
                  <button
                    type="button"
                    onClick={() => { setSelectedInstantMediaUrl(null); }}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 hover:bg-black/80 border-0 text-white cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      id="instant-media-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingInstantMedia(true);
                        setInstantMediaError('');
                        try {
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const base64Data = reader.result as string;
                            const uploadRes = await apiFetch('/upload', {
                              method: 'POST',
                              body: JSON.stringify({
                                file: base64Data,
                                filename: file.name
                              })
                            });
                            if (uploadRes.ok) {
                              const { url } = await uploadRes.json();
                              setSelectedInstantMediaUrl(url);
                            } else {
                              const err = await uploadRes.json();
                              setInstantMediaError(err.error || 'Upload failed');
                            }
                            setIsUploadingInstantMedia(false);
                          };
                          reader.readAsDataURL(file);
                        } catch (err) {
                          console.error(err);
                          setInstantMediaError('Error uploading file');
                          setIsUploadingInstantMedia(false);
                        }
                      }}
                    />
                    <label
                      htmlFor="instant-media-upload"
                      className="flex flex-col items-center justify-center gap-2.5 w-full py-8 border-2 border-dashed border-white/10 hover:border-purple-500/55 hover:bg-white/5 rounded-2xl cursor-pointer text-xs font-bold transition-all text-neutral-350"
                    >
                      {isUploadingInstantMedia ? (
                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                      ) : (
                        <Camera className="w-6 h-6 text-purple-400" />
                      )}
                      <span>Capture or Upload Spontaneous Photo</span>
                    </label>
                  </div>
                  {instantMediaError && <span className="text-[10px] text-red-500 font-bold px-1">{instantMediaError}</span>}

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider text-left">Select Spontaneous Preset</span>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_INSTANT_PHOTOS.map((photo) => (
                        <div
                          key={photo.id}
                          onClick={() => setSelectedInstantMediaUrl(photo.url)}
                          className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-purple-500 transition-all"
                        >
                          <img src={photo.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Preset" />
                          <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                            <span className="text-[8px] font-bold text-white">{photo.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Add a caption..."
                  value={instantCaption}
                  onChange={(e) => setInstantCaption(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 focus:border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:ring-0"
                />
              </div>

              <div className="flex flex-col gap-2 bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-neutral-455 uppercase tracking-wider text-left">Share with</span>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInstantIsPublic(true)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all border-0 cursor-pointer ${
                      instantIsPublic 
                        ? 'bg-purple-500/10 text-purple-400 font-semibold' 
                        : 'bg-transparent text-neutral-455 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-full ${instantIsPublic ? 'bg-purple-500/20' : 'bg-neutral-800'}`}>
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <p className="text-2xs font-bold leading-none m-0">All Mutual Followers</p>
                      </div>
                    </div>
                    {instantIsPublic && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setInstantIsPublic(false)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all border-0 cursor-pointer ${
                      !instantIsPublic 
                        ? 'bg-green-500/10 text-green-400 font-semibold' 
                        : 'bg-transparent text-neutral-455 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-full ${!instantIsPublic ? 'bg-green-500/20' : 'bg-neutral-800'}`}>
                        <User className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-2xs font-bold leading-none m-0">Selected Friends</p>
                      </div>
                    </div>
                    {!instantIsPublic && <Check className="w-3.5 h-3.5 text-green-400" />}
                  </button>
                </div>
              </div>

              {!instantIsPublic && (
                <div className="flex flex-col gap-2 bg-white/5 p-3 rounded-2xl border border-white/5 max-h-40 overflow-y-auto">
                  <span className="text-[10px] font-bold text-neutral-455 uppercase tracking-wider text-left">Select Recipients</span>
                  <div className="flex flex-col gap-1.5">
                    {potentialMembers.map((friend) => {
                      const isChecked = selectedInstantRecipients.includes(friend.id);
                      return (
                        <label key={friend.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                          <span className="text-2xs text-neutral-350">@{friend.username}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedInstantRecipients(selectedInstantRecipients.filter(id => id !== friend.id));
                              } else {
                                setSelectedInstantRecipients([...selectedInstantRecipients, friend.id]);
                              }
                            }}
                            className="rounded border-white/15 bg-transparent text-purple-600 focus:ring-purple-500/20"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingInstant || isUploadingInstantMedia || !selectedInstantMediaUrl}
                className="w-full mt-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl border-0 cursor-pointer flex items-center justify-center shadow-lg disabled:opacity-50"
              >
                {isSubmittingInstant ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Send Instant'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Full-screen Instants Viewer Modal */}
      {selectedInstant && (
        <div className="fixed inset-0 bg-black/95 z-55 flex items-center justify-center p-4">
          <div className="w-full max-w-sm flex flex-col gap-4 relative text-white animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-3">
                {selectedInstant.user.profile?.avatarUrl ? (
                  <img src={selectedInstant.user.profile.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs">
                    {selectedInstant.user.username[0].toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-xs font-bold leading-none m-0">@{selectedInstant.user.username}</p>
                  <span className="text-[9px] text-neutral-400">
                    Instant • {new Date(selectedInstant.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedInstant.userId === currentUser?.id && (
                  <button
                    onClick={(e) => handleDeleteOwnInstant(selectedInstant.id, e)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2.5 py-1 text-[9px] font-bold rounded-lg border-0 cursor-pointer"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setSelectedInstant(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl flex items-center justify-center">
              <img src={selectedInstant.mediaUrl} className="w-full h-full object-cover" alt="Instant" />
              
              <div className="absolute top-3 left-3 bg-indigo-600/90 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" /> Instant
              </div>
              
              {selectedInstant.caption && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/5 text-left text-xs text-neutral-200">
                  <p className="m-0 leading-normal">{selectedInstant.caption}</p>
                </div>
              )}
            </div>

            {selectedInstant.userId !== currentUser?.id ? (
              <form onSubmit={handleSendInstantReply} className="flex gap-2 w-full px-2">
                <input
                  type="text"
                  placeholder="Send a direct reply..."
                  value={instantReplyText}
                  onChange={(e) => setInstantReplyText(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/5 focus:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:ring-0"
                  required
                />
                <button
                  type="submit"
                  disabled={isSendingInstantReply || !instantReplyText.trim()}
                  className="p-2.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl text-white font-bold border-0 cursor-pointer flex items-center justify-center disabled:opacity-50 hover:scale-95 active-shrink"
                >
                  {isSendingInstantReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              <div className="w-full text-center text-[10px] text-neutral-450 italic pb-2">
                This is your active Instant. Other users can view and reply directly to your DM!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unsend Message Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-neutral-955/60 backdrop-blur-md z-55 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-neutral-905 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 glass shadow-2xl text-white text-center">
            <h3 className="font-bold text-sm font-outfit m-0">Unsend Message?</h3>
            <p className="text-[10px] text-neutral-400 leading-normal m-0">
              Unsending will remove this message for everyone in the chat. Members will no longer see it.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={async () => {
                  const id = messageToDelete;
                  setMessageToDelete(null);
                  try {
                    const res = await apiFetch(`/chats/messages/${id}`, {
                      method: 'DELETE',
                    });
                    if (res.ok) {
                      setMessages((prev) => prev.filter((m) => m.id !== id));
                      setChats((prev) =>
                        prev.map((c) => {
                          if (c.messages?.[0]?.id === id) {
                            return {
                              ...c,
                              messages: [{ id, content: "Message unsent", sender: { name: "", username: "" } }],
                            };
                          }
                          return c;
                        })
                      );
                    } else {
                      alert('Failed to unsend message');
                    }
                  } catch (err) {
                    console.error('Delete message error:', err);
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl border-0 cursor-pointer transition-all"
              >
                Unsend
              </button>
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="w-full bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs py-2.5 rounded-xl border-0 cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
