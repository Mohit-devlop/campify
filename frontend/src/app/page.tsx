'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { apiFetch } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './LandingPage';
import {
Heart, MessageCircle, Bookmark, Send, Sparkles, MapPin,
ChevronLeft, ChevronRight, Loader2, PlayCircle, Plus, X, Award,
Copy, Check, BarChart2, Hash, Flame, UserCheck, Image, Compass, Brain, Repeat,
MoreHorizontal, Archive, Trash, Music, Volume2, VolumeX, Pause, Play, Download,
Calendar, Users, UserPlus
} from 'lucide-react';

export default function HomeFeed() {
const router = useRouter();
const { user, isAuthenticated, isInitialized } = useAuthStore();
const { onlineUsers } = useSocketStore();

const [posts, setPosts] = useState<any[]>([]);
const [stories, setStories] = useState<any[]>([]);
const [suggestions, setSuggestions] = useState<any[]>([]);
const [isLoadingFeed, setIsLoadingFeed] = useState(true);

// Post Composer state
const [newPostContent, setNewPostContent] = useState('');
const [newPostMedia, setNewPostMedia] = useState('');
const [newPostLocation, setNewPostLocation] = useState('');
const [isPosting, setIsPosting] = useState(false);

// Post & Story music playing states
const [playingPostId, setPlayingPostId] = useState<string | null>(null);
const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
const [storyAudio, setStoryAudio] = useState<HTMLAudioElement | null>(null);
const [isStoryMuted, setIsStoryMuted] = useState(false);



const handleTogglePostMusic = (post: any) => {
if (playingPostId === post.id) {
if (activeAudio) {
activeAudio.pause();
}
setPlayingPostId(null);
} else {
if (activeAudio) {
activeAudio.pause();
}
const audio = new Audio(post.songUrl);
audio.play().catch(err => console.log('Audio playback error:', err));
setActiveAudio(audio);
setPlayingPostId(post.id);
audio.onended = () => {
setPlayingPostId(null);
};
}
};

const toggleStoryMute = () => {
const nextMute = !isStoryMuted;
setIsStoryMuted(nextMute);
if (storyAudio) {
storyAudio.muted = nextMute;
}
};

// Delete & options state
const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

const handleDeletePost = async (postId: string) => {
try {
const res = await apiFetch(`/posts/${postId}`, {
method: 'DELETE',
});
if (res.ok) {
setPosts((prev) => prev.filter((p) => p.id !== postId));
setActiveMenuPostId(null);
} else {
alert('Failed to delete post');
}
} catch (err) {
console.error('Failed to delete post:', err);
}
};

const handleDeleteStory = async (storyId: string) => {
try {
const res = await apiFetch(`/stories/${storyId}`, {
method: 'DELETE',
});
if (res.ok) {
const remainingStories = activeStoryGroup.stories.filter((s: any) => s.id !== storyId);
if (remainingStories.length === 0) {
setActiveStoryGroup(null);
} else {
const nextIdx = Math.max(0, activeStoryIndex - 1);
setActiveStoryGroup({
...activeStoryGroup,
stories: remainingStories,
});
setActiveStoryIndex(nextIdx);
}

const storiesRes = await apiFetch('/stories/feed');
if (storiesRes.ok) {
const storiesData = await storiesRes.json();
setStories(storiesData);
}
} else {
alert('Failed to delete story');
}
} catch (err) {
console.error('Delete story error:', err);
}
};

const handleDownloadMedia = async (url: string, filename: string) => {
try {
const response = await apiFetch(`/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`);
if (!response.ok) throw new Error('Proxy download failed');
const blob = await response.blob();
const blobUrl = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = blobUrl;
link.download = filename;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(blobUrl);
} catch (error) {
console.error('Download failed:', error);
window.open(url, '_blank');
}
};

// Stories Modal state
const [activeStoryGroup, setActiveStoryGroup] = useState<any | null>(null);
const [activeStoryIndex, setActiveStoryIndex] = useState(0);

// Pause feed music when starting a story
useEffect(() => {
if (activeStoryGroup && activeAudio) {
activeAudio.pause();
setPlayingPostId(null);
}
}, [activeStoryGroup, activeAudio]);

// Story background audio autoplay & loop
useEffect(() => {
if (!activeStoryGroup) {
if (storyAudio) {
storyAudio.pause();
setStoryAudio(null);
}
return;
}

const currentStory = activeStoryGroup.stories[activeStoryIndex];
if (storyAudio) {
storyAudio.pause();
setStoryAudio(null);
}

if (currentStory && currentStory.songUrl) {
const audio = new Audio(currentStory.songUrl);
audio.loop = true;
audio.muted = isStoryMuted;
audio.play().catch((err) => console.log('Story audio error:', err));
setStoryAudio(audio);
}

return () => {
if (storyAudio) {
storyAudio.pause();
}
};
}, [activeStoryGroup, activeStoryIndex]);

useEffect(() => {
return () => {
if (activeAudio) activeAudio.pause();
if (storyAudio) storyAudio.pause();
};
}, [activeAudio, storyAudio]);

// Share Modal state
const [sharingPost, setSharingPost] = useState<any | null>(null);
const [copiedLink, setCopiedLink] = useState(false);
const [shareChats, setShareChats] = useState<any[]>([]);

// Fetch chats for share modal
useEffect(() => {
if (sharingPost) {
apiFetch('/chats')
.then((res) => {
if (res.ok) return res.json();
throw new Error('Failed to fetch chats');
})
.then((data) => setShareChats(data || []))
.catch((err) => console.error('Error fetching chats for share:', err));
}
}, [sharingPost]);

const handleSendPostToChat = async (chatId: string) => {
if (!sharingPost) return;
try {
const serializedContent = `POST_SHARE_ID:${sharingPost.id}|${sharingPost.user.username}|${sharingPost.content || ''}|${sharingPost.mediaUrls?.[0] || ''}`;

const res = await apiFetch(`/chats/messages/${chatId}`, {
method: 'POST',
body: JSON.stringify({
content: serializedContent,
type: 'TEXT'
})
});

if (res.ok) {
alert('Post shared to chat successfully!');
setSharingPost(null);
} else {
alert('Failed to share post to chat');
}
} catch (err) {
console.error('Error sharing post to chat:', err);
alert('Error sharing post');
}
};

// Repost states
const [activeRepostPost, setActiveRepostPost] = useState<any | null>(null);
const [quotingPost, setQuotingPost] = useState<any | null>(null);
const [quoteContent, setQuoteContent] = useState('');
const [isReposting, setIsReposting] = useState(false);

// Comment drawers states
const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
const [commentsMap, setCommentsMap] = useState<{ [postId: string]: any[] }>({});
const [newCommentTexts, setNewCommentTexts] = useState<{ [postId: string]: string }>({});

// Feed Tab Filter
const [feedFilter, setFeedFilter] = useState<'for-you' | 'following'>('for-you');

// Gamification stats
const [gamification, setGamification] = useState<any>(null);
// Active team requests
const [activeTeams, setActiveTeams] = useState<any[]>([]);

// AI assistant state
const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
const [aiTopic, setAiTopic] = useState('');
const [aiTone, setAiTone] = useState('Professional');
const [aiOutput, setAiOutput] = useState('');
const [isAiLoading, setIsAiLoading] = useState(false);
const [aiTool, setAiTool] = useState<'caption' | 'hashtags' | 'reels'>('caption');

// Unauthenticated users are shown the Landing Page inline instead of redirecting

// Load Feed, Stories, and Recommendations
useEffect(() => {
if (!isAuthenticated) return;

async function loadData() {
try {
setIsLoadingFeed(true);
// Fetch feed posts
const feedRes = await apiFetch(`/posts/feed?filter=${feedFilter === 'following' ? 'follow' : 'explore'}&limit=20`);
if (feedRes.ok) {
const feedData = await feedRes.json();
setPosts(feedData.posts || []);
}

// Fetch stories
const storiesRes = await apiFetch('/stories/feed');
if (storiesRes.ok) {
const storiesData = await storiesRes.json();
setStories(storiesData);
}

// Fetch suggested creators
const suggestRes = await apiFetch('/users/suggested');
if (suggestRes.ok) {
const suggestData = await suggestRes.json();
setSuggestions(suggestData);
}

// Fetch gamification stats
const gamifyRes = await apiFetch('/gamification/stats');
if (gamifyRes.ok) {
const gamifyData = await gamifyRes.json();
setGamification(gamifyData);
}

// Fetch team finder teams
const teamsRes = await apiFetch('/teams');
if (teamsRes.ok) {
const teamsData = await teamsRes.json();
setActiveTeams(teamsData || []);
}
} catch (err) {
console.error('Failed to load feed:', err);
} finally {
setIsLoadingFeed(false);
}
}

loadData();
}, [isAuthenticated, feedFilter]);

const handleCreatePost = async (e: React.FormEvent) => {
e.preventDefault();
if (!newPostContent.trim() && !newPostMedia.trim()) return;

setIsPosting(true);
try {
const payload = {
type: newPostMedia ? 'IMAGE' : 'TEXT',
content: newPostContent,
mediaUrls: newPostMedia ? [newPostMedia] : [],
location: newPostLocation || undefined
};

const res = await apiFetch('/posts', {
method: 'POST',
body: JSON.stringify(payload)
});

if (res.ok) {
const data = await res.json();
const newPost = data.post;
// Add creator details inside post payload
newPost.user = {
id: user?.id,
username: user?.username,
name: user?.name,
verified: user?.verified,
profile: user?.profile
};
newPost.likesCount = 0;
newPost.commentsCount = 0;
newPost.isLiked = false;
newPost.isSaved = false;

setPosts((prev) => [newPost, ...prev]);
setNewPostContent('');
setNewPostMedia('');
setNewPostLocation('');
} else {
alert('Failed to publish post');
}
} catch (err) {
console.error(err);
} finally {
setIsPosting(false);
}
};

const handleLikePost = async (postId: string, isLiked: boolean) => {
try {
const method = isLiked ? 'DELETE' : 'POST';
const endpoint = isLiked ? `/posts/unlike/${postId}` : `/posts/like/${postId}`;
const res = await apiFetch(endpoint, { method });

if (res.ok) {
setPosts((prev) =>
prev.map((p) =>
p.id === postId
? {
...p,
isLiked: !isLiked,
likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1,
}
: p
)
);
}
} catch (err) {
console.error('Like toggle failed:', err);
}
};

const handleSavePost = async (postId: string, isSaved: boolean) => {
try {
const method = isSaved ? 'DELETE' : 'POST';
const endpoint = isSaved ? `/posts/unsave/${postId}` : `/posts/save/${postId}`;
const res = await apiFetch(endpoint, { method });

if (res.ok) {
setPosts((prev) =>
prev.map((p) => (p.id === postId ? { ...p, isSaved: !isSaved } : p))
);
}
} catch (err) {
console.error('Save toggle failed:', err);
}
};

// Comments Actions
const toggleCommentsSection = async (postId: string) => {
if (expandedCommentsPostId === postId) {
setExpandedCommentsPostId(null);
return;
}

setExpandedCommentsPostId(postId);
if (!commentsMap[postId]) {
try {
const res = await apiFetch(`/posts/comment/${postId}`);
if (res.ok) {
const data = await res.json();
setCommentsMap((prev) => ({ ...prev, [postId]: data.comments || [] }));
}
} catch (err) {
console.error(err);
}
}
};

const handleCommentSubmit = async (postId: string) => {
const text = newCommentTexts[postId];
if (!text || !text.trim()) return;

try {
const res = await apiFetch(`/posts/comment/${postId}`, {
method: 'POST',
body: JSON.stringify({ content: text }),
});
if (res.ok) {
const responseData = await res.json();
const newComment = responseData.comment;
// Append user profile to comments representation
newComment.user = {
username: user?.username,
profile: user?.profile
};

setCommentsMap((prev) => ({
...prev,
[postId]: [newComment, ...(prev[postId] || [])]
}));
setNewCommentTexts((prev) => ({ ...prev, [postId]: '' }));
setPosts((prev) =>
prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
);
}
} catch (err) {
console.error('Comment failed:', err);
}
};

const handleFollowUser = async (targetUserId: string) => {
try {
const res = await apiFetch(`/users/follow/${targetUserId}`, { method: 'POST' });
if (res.ok) {
setSuggestions((prev) => prev.filter((u) => u.id !== targetUserId));
// Refresh feed posts
const feedRes = await apiFetch(`/posts/feed?filter=${feedFilter === 'following' ? 'follow' : 'explore'}&limit=20`);
if (feedRes.ok) {
const feedData = await feedRes.json();
setPosts(feedData.posts || []);
}
}
} catch (err) {
console.error('Follow failed:', err);
}
};

const handleOpenStories = (group: any) => {
setActiveStoryGroup(group);
setActiveStoryIndex(0);
markStorySeen(group.stories[0].id);
};

const markStorySeen = async (storyId: string) => {
try {
await apiFetch(`/stories/seen/${storyId}`, { method: 'POST' });
} catch (err) {
console.error(err);
}
};

const handleNextStory = () => {
if (!activeStoryGroup) return;
if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
const nextIdx = activeStoryIndex + 1;
setActiveStoryIndex(nextIdx);
markStorySeen(activeStoryGroup.stories[nextIdx].id);
} else {
setActiveStoryGroup(null);
}
};

const handlePrevStory = () => {
if (activeStoryIndex > 0) {
setActiveStoryIndex(activeStoryIndex - 1);
}
};

const handleInstantRepost = async (postId: string) => {
setIsReposting(true);
try {
const res = await apiFetch(`/posts/repost/${postId}`, {
method: 'POST',
body: JSON.stringify({}),
});
if (res.ok) {
const data = await res.json();
setPosts((prev) => [data.post, ...prev]);
} else {
alert('Failed to repost');
}
} catch (err) {
console.error(err);
} finally {
setIsReposting(false);
}
};

const handleQuoteSubmit = async (e: React.FormEvent) => {
e.preventDefault();
if (!quotingPost) return;
setIsReposting(true);
try {
const res = await apiFetch(`/posts/repost/${quotingPost.id}`, {
method: 'POST',
body: JSON.stringify({ content: quoteContent }),
});
if (res.ok) {
const data = await res.json();
setPosts((prev) => [data.post, ...prev]);
setQuotingPost(null);
setQuoteContent('');
} else {
alert('Failed to submit quote post');
}
} catch (err) {
console.error(err);
} finally {
setIsReposting(false);
}
};

const copyPostLink = (postId: string) => {
const link = `${window.location.origin}/post/${postId}`;
navigator.clipboard.writeText(link);
setCopiedLink(true);
setTimeout(() => setCopiedLink(false), 2000);
};

// AI Assistant Call
const handleAiCall = async () => {
if (!aiTopic.trim()) return;
setIsAiLoading(true);
setAiOutput('');

try {
const endpoint = aiTool === 'caption'
? '/ai/caption'
: aiTool === 'hashtags'
? '/ai/hashtags'
: '/ai/reels-ideas';

const payload = aiTool === 'hashtags'
? { content: aiTopic }
: aiTool === 'caption'
? { topic: aiTopic, tone: aiTone }
: { category: aiTopic };

const res = await apiFetch(endpoint, {
method: 'POST',
body: JSON.stringify(payload),
});

if (res.ok) {
const data = await res.json();
if (aiTool === 'caption') {
setAiOutput(data.caption);
} else if (aiTool === 'hashtags') {
setAiOutput(data.hashtags.join(' '));
} else {
setAiOutput(data.ideas);
}
}
} catch (err) {
console.error(err);
} finally {
setIsAiLoading(false);
}
};

if (!isInitialized) {
return (
<div className="h-screen w-full flex justify-center items-center bg-brand-bg">
<Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
</div>
);
}

if (!isAuthenticated || !user) {
return <LandingPage />;
}

return (
<div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 flex gap-6 relative select-none bg-brand-bg text-brand-text">

{/* LEFT COLUMN: Feed & Composer */}
<div className="flex-1 max-w-[640px] flex flex-col gap-6">

{/* Sticky Top Header Filter */}
<div className="sticky top-0 bg-brand-bg/85 backdrop-blur-xl z-20 py-3 border-b border-brand-cyan/15 flex items-center justify-between px-1">
<div className="flex gap-4">
<button
onClick={() => setFeedFilter('for-you')}
className={`text-sm font-bold pb-1 transition-all bg-transparent border-0 cursor-pointer ${
feedFilter === 'for-you'
? 'text-brand-cyan border-b-2 border-brand-cyan'
: 'text-neutral-450 hover:text-white'
}`}
>
For You
</button>
<button
onClick={() => setFeedFilter('following')}
className={`text-sm font-bold pb-1 transition-all bg-transparent border-0 cursor-pointer ${
feedFilter === 'following'
? 'text-brand-cyan border-b-2 border-brand-cyan'
: 'text-neutral-450 hover:text-white'
}`}
>
Following
</button>
</div>

<button
onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
className="bg-transparent border-0 cursor-pointer p-1"
>
<Sparkles className="w-5 h-5 text-brand-cyan animate-pulse" />
</button>
</div>

{/* Dashboard Top Command Center Widget */}
<div className="p-5 bg-brand-card border border-brand-cyan/15 rounded-[24px] shadow-lg flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden bg-futuristic-grid glow-cyan/2">
<div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full blur-2xl pointer-events-none" />
<div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-cyan/5 rounded-full blur-2xl pointer-events-none" />

{/* Left Welcome */}
<div className="flex items-center gap-3 w-full md:w-auto">
{user.profile?.avatarUrl ? (
<img src={user.profile.avatarUrl} alt="avatar" className="w-12 h-12 rounded-xl object-cover border border-brand-cyan/15" />
) : (
<div className="w-12 h-12 rounded-xl bg-brand-orange text-black font-black text-lg flex items-center justify-center flex-shrink-0">
{user.username[0].toUpperCase()}
</div>
)}
    <div className="flex flex-col text-white">
      <h2 className="text-sm font-black leading-tight">Welcome, {user.name || user.username}!</h2>
      <p className="text-[10px] text-neutral-400 mt-0.5">Let&apos;s build some awesome projects today.</p>
    </div>
  </div>

  {/* Right Stats Widgets */}
  <div className="flex items-center gap-4 flex-wrap md:flex-nowrap w-full md:w-auto justify-between md:justify-end">
    {/* Level + XP Progress */}
    <div className="flex flex-col gap-1 p-2.5 bg-brand-bg/60 border border-brand-cyan/15 rounded-xl w-[105px] flex-shrink-0 shadow-inner">
      <div className="flex items-center justify-between text-[8px] uppercase font-bold text-neutral-400">
        <span>LVL {gamification?.stats?.level || 1}</span>
        <span className="text-brand-cyan">{gamification?.stats?.xpPoints || 0} XP</span>
      </div>
      <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-cyan transition-all"
          style={{ width: `${Math.min(100, ((gamification?.stats?.xpPoints || 0) % 100))}%` }}
        />
      </div>
    </div>

    {/* Streak count */}
    <div className="flex items-center gap-2 p-2.5 bg-brand-bg/60 border border-brand-cyan/15 rounded-xl w-[95px] flex-shrink-0 shadow-inner">
      <Flame className="w-4 h-4 text-brand-orange animate-pulse" />
      <div className="flex flex-col">
        <span className="text-[8px] uppercase font-bold text-neutral-500">Streak</span>
        <span className="text-[10px] font-black text-white">{gamification?.stats?.dailyStreak || 0} Days</span>
      </div>
    </div>

    {/* Communities stats */}
    <div className="flex items-center gap-2 p-2.5 bg-brand-bg/60 border border-brand-cyan/15 rounded-xl w-[95px] flex-shrink-0 shadow-inner">
      <Sparkles className="w-4 h-4 text-brand-cyan animate-pulse" />
      <div className="flex flex-col">
        <span className="text-[8px] uppercase font-bold text-neutral-550">Activity</span>
        <span className="text-[10px] font-black text-white">{gamification?.badges?.length || 0} Badges</span>
      </div>
    </div>
  </div>
</div>

{/* Stories Horizontal Container */}
<div className="w-full flex gap-4 overflow-x-auto py-4 px-4 bg-brand-card border border-brand-cyan/15 rounded-[24px] items-center no-scrollbar bg-futuristic-grid shadow-md shadow-brand-cyan/2">
{/* Add story trigger */}
<button
type="button"
onClick={() => {
window.dispatchEvent(new CustomEvent('open-create-modal', { detail: { tab: 'story' } }));
}}
className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer hover:scale-[1.02] active-shrink bg-transparent border-0 outline-none select-none"
>
<div className="w-[66px] h-[66px] rounded-2xl bg-brand-bg/60 flex items-center justify-center border border-dashed border-brand-cyan/20 relative animate-in fade-in">
<Plus className="w-5 h-5 text-neutral-450" />
</div>
<span className="text-[10px] font-bold text-neutral-450">Add Story</span>
</button>

{/* Stories List */}
{stories.map((group, i) => (
<button
key={i}
onClick={() => handleOpenStories(group)}
className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer hover:scale-[1.02] active-shrink bg-transparent border-0 outline-none"
>
<div className={`p-[2px] rounded-2xl transition-transform ${
group.hasUnseen
? (group.isCloseFriends ? 'animate-story-ring-green' : 'animate-story-ring')
: 'bg-white/10'
}`}>
<div className="p-[2px] bg-brand-card rounded-[14px]">
{group.user.profile?.avatarUrl ? (
<img
src={group.user.profile.avatarUrl}
alt={group.user.username}
className="w-[56px] h-[56px] rounded-[11px] object-cover"
/>
) : (
<div className="w-[56px] h-[56px] rounded-[11px] bg-brand-orange flex items-center justify-center text-black font-bold text-sm">
{group.user.username[0].toUpperCase()}
</div>
)}
</div>
</div>
<span className="text-[10px] font-bold text-neutral-500 max-w-[65px] truncate">
{group.user.username}
</span>
</button>
))}
</div>

{/* Create Post composer box */}
<form onSubmit={handleCreatePost} className="p-5 bg-brand-card border border-brand-cyan/15 rounded-[24px] flex flex-col gap-4 bg-futuristic-grid shadow-md shadow-brand-cyan/2">
<div className="flex gap-4 items-start">
{user.profile?.avatarUrl ? (
<img src={user.profile.avatarUrl} alt="avatar" className="w-10 h-10 rounded-xl object-cover border border-brand-cyan/15" />
) : (
<div className="w-10 h-10 rounded-xl bg-brand-orange text-black font-bold text-xs flex items-center justify-center flex-shrink-0">
{user.username[0].toUpperCase()}
</div>
)}
<div className="flex-1 flex flex-col gap-2">
<textarea
placeholder="What's happening in your sphere today?"
value={newPostContent}
onChange={(e) => setNewPostContent(e.target.value)}
rows={2}
className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-neutral-500 resize-none focus:ring-0 text-white font-medium"
/>

{/* Optional media/location inputs */}
<div className="flex flex-col md:flex-row gap-2 mt-1">
<input
type="file"
accept="image/*,video/*"
id="feed-file-upload"
className="hidden"
onChange={async (e) => {
const file = e.target.files?.[0];
if (!file) return;
setIsPosting(true);
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
setNewPostMedia(url);
} else {
alert('Failed to upload media file');
}
setIsPosting(false);
};
reader.readAsDataURL(file);
} catch (err) {
console.error(err);
alert('Error uploading file');
setIsPosting(false);
}
}}
/>

{newPostMedia && (
<div className="relative w-20 h-20 rounded-xl overflow-hidden border border-brand-cyan/15 mt-2">
<img src={newPostMedia} alt="composer preview" className="w-full h-full object-cover" />
<button
type="button"
onClick={() => setNewPostMedia('')}
className="absolute top-0.5 right-0.5 p-0.5 bg-black/80 rounded-full text-white border-0 cursor-pointer flex items-center justify-center"
>
<X className="w-3 h-3" />
</button>
</div>
)}

<input
type="text"
placeholder="Location (optional)"
value={newPostLocation}
onChange={(e) => setNewPostLocation(e.target.value)}
className="bg-black/40 border border-brand-cyan/15 focus:border-brand-cyan/45 rounded-xl px-3 py-1.5 text-xs outline-none transition-all w-full md:w-[150px] text-white mt-1 shadow-inner"
/>
</div>
</div>
</div>

<div className="flex items-center justify-between border-t border-brand-cyan/15 pt-3">
<div className="flex gap-2 text-neutral-400">
<label htmlFor="feed-file-upload" className="p-2 hover:bg-white/5 rounded-lg text-brand-cyan bg-transparent border-0 cursor-pointer flex items-center justify-center animate-pulse" title="Attach Media">
<Image className="w-4 h-4" />
</label>
<button type="button" className="p-2 hover:bg-white/5 rounded-lg text-brand-cyan bg-transparent border-0 cursor-pointer" title="Attach Location">
<MapPin className="w-4 h-4" />
</button>
</div>

<button
type="submit"
disabled={isPosting || (!newPostContent.trim() && !newPostMedia.trim())}
className="btn-primary-gradient text-black font-extrabold text-xs px-5 py-2.5 rounded-[12px] active-shrink hover-scale disabled:opacity-50 border-0 cursor-pointer shadow-md shadow-brand-cyan/10"
>
{isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Publish Log'}
</button>
</div>
</form>

{/* Home Feed Posts */}
{isLoadingFeed ? (
<div className="flex justify-center items-center py-24">
<Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
</div>
) : posts.length === 0 ? (
<div className="bg-brand-card border border-brand-cyan/15 rounded-[28px] p-12 text-center flex flex-col items-center gap-3">
<Sparkles className="w-10 h-10 text-brand-cyan animate-pulse" />
<h3 className="font-extrabold text-lg font-outfit text-white">Feed is empty</h3>
<p className="text-neutral-400 text-xs max-w-xs leading-relaxed">
No recent updates matching this tab. Follow creators or post updates to watch them appear here!
</p>
</div>
) : (
<div className="flex flex-col gap-6">
{posts.map((post) => {
const isMediaPost = post.mediaUrls && post.mediaUrls.length > 0;
return (
<article
key={post.id}
className={`bg-brand-card border border-brand-cyan/15 rounded-[24px] overflow-hidden shadow-sm flex flex-col transition-all duration-300 hover:shadow-xl hover:border-brand-cyan/35 border-l-4 glow-cyan/2 ${
isMediaPost ? 'border-l-brand-cyan' : 'border-l-brand-orange'
}`}
>
{/* Repost Header Indicator */}
{post.type === 'REPOST' && !post.content && (
<div className="px-4 pt-3 pb-0 text-[10px] font-bold text-neutral-450 flex items-center gap-1.5 select-none">
<Repeat className="w-3.5 h-3.5 text-brand-cyan" />
<span>@{post.user.username} reposted</span>
</div>
)}
{/* Creator Header */}
<div className="flex items-center justify-between p-4 border-b border-brand-cyan/15">
<Link href={`/${post.user.username}`} className="flex items-center gap-3 no-underline">
{post.user.profile?.avatarUrl ? (
<img
src={post.user.profile.avatarUrl}
alt="avatar"
className="w-10 h-10 rounded-xl object-cover border border-brand-cyan/15"
/>
) : (
<div className="w-10 h-10 rounded-xl bg-brand-orange text-black font-black text-sm flex items-center justify-center">
{post.user.username[0].toUpperCase()}
</div>
)}
<div className="flex flex-col">
<span className="font-bold text-sm text-white flex items-center gap-1 hover:underline">
{post.user.username}
{post.user.verified && (
<span title="Completed Learning Targets (Gold Medal)">
<Award className="w-3.5 h-3.5 text-brand-orange fill-brand-orange animate-pulse" />
</span>
)}
</span>
{post.location && (
<span className="text-[10px] text-neutral-500 flex items-center gap-0.5 mt-0.5">
<MapPin className="w-3 h-3 text-brand-cyan" />
{post.location}
</span>
)}
</div>
</Link>

{/* Options Dropdown Menu */}
<div className="relative">
<button
type="button"
onClick={(e) => {
e.preventDefault();
e.stopPropagation();
setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
}}
className="p-1 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer flex items-center justify-center transition-colors"
>
<MoreHorizontal className="w-5 h-5" />
</button>

<AnimatePresence>
{activeMenuPostId === post.id && (
<>
<div
className="fixed inset-0 z-30"
onClick={(e) => {
e.stopPropagation();
setActiveMenuPostId(null);
}}
/>
<motion.div
initial={{ opacity: 0, scale: 0.95, y: -10 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.95, y: -10 }}
transition={{ duration: 0.15 }}
className="absolute right-0 mt-2 w-48 bg-brand-card border border-white/10 rounded-2xl shadow-xl z-40 py-1 overflow-hidden"
>
{post.user.id === user.id && (
<button
type="button"
onClick={(e) => {
e.stopPropagation();
handleDeletePost(post.id);
}}
className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-white/5 flex items-center gap-2 transition-colors border-0 bg-transparent cursor-pointer"
>
<Trash className="w-4 h-4" />
Delete Post
</button>
)}
<button
type="button"
onClick={(e) => {
e.stopPropagation();
copyPostLink(post.id);
setActiveMenuPostId(null);
}}
className="w-full text-left px-4 py-2.5 text-xs font-bold text-neutral-200 hover:bg-white/5 flex items-center gap-2 transition-colors border-0 bg-transparent cursor-pointer"
>
<Copy className="w-4 h-4" />
Copy Post Link
</button>
</motion.div>
</>
)}
</AnimatePresence>
</div>
</div>

{/* Media Content */}
{post.type !== 'REPOST' && post.mediaUrls && post.mediaUrls.length > 0 && (
<div className="relative aspect-square w-full bg-black/60 overflow-hidden group">
<img
src={post.mediaUrls[0]}
alt="post media"
className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
/>

{/* Song Overlay Player */}
{post.songName && post.songUrl && (
<button
type="button"
onClick={(e) => {
e.preventDefault();
e.stopPropagation();
handleTogglePostMusic(post);
}}
className="absolute bottom-3 left-3 right-3 py-2 px-3 bg-black/80 backdrop-blur-md rounded-xl border border-white/5 hover:bg-black/90 transition-all flex items-center justify-between text-white font-bold select-none cursor-pointer group shadow-lg"
>
<span className="text-[10px] flex items-center gap-1.5 min-w-0">
<Music className={`w-3.5 h-3.5 text-brand-orange ${playingPostId === post.id ? 'animate-bounce' : ''}`} />
<span className="truncate">{post.songName} &bull; {post.songArtist}</span>
</span>
<div className="flex items-center gap-1.5 flex-shrink-0">
{playingPostId === post.id ? (
<Pause className="w-3.5 h-3.5 text-brand-orange group-hover:scale-110 transition-transform" />
) : (
<Play className="w-3.5 h-3.5 text-white/95 group-hover:scale-110 transition-transform" />
)}
</div>
</button>
)}
</div>
)}

{/* Nested Repost Content */}
{post.repost && (
<div className="mx-5 mt-2 mb-4 p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col gap-2.5 shadow-sm select-none">
<div className="flex items-center gap-2">
{post.repost.user.profile?.avatarUrl ? (
<img
src={post.repost.user.profile.avatarUrl}
alt="nested avatar"
className="w-6 h-6 rounded-lg object-cover border border-white/10"
/>
) : (
<div className="w-6 h-6 rounded-lg bg-brand-orange text-black font-bold text-[10px] flex items-center justify-center">
{post.repost.user.username[0].toUpperCase()}
</div>
)}
<span className="font-bold text-xs text-slate-700 dark:text-neutral-200">
@{post.repost.user.username}
</span>
{post.repost.user.verified && (
<span title="Completed Learning Targets (Gold Medal)">
<Award className="w-3 h-3 text-brand-orange fill-brand-orange animate-pulse" />
</span>
)}
<span className="text-[9px] text-neutral-500 ml-auto">
{new Date(post.repost.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
</span>
</div>

{post.repost.content && (
<p className="text-xs text-slate-655 dark:text-neutral-300 leading-relaxed font-medium">
{post.repost.content}
</p>
)}

{post.repost.mediaUrls && post.repost.mediaUrls.length > 0 && (
<div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-950">
<img
src={post.repost.mediaUrls[0]}
alt="nested media"
className="w-full h-full object-cover"
/>
</div>
)}
</div>
)}

{/* Card details body */}
<div className="p-5 flex flex-col gap-3 text-slate-800 dark:text-white">

{/* Inline Audio Player for Text-Only Posts */}
{post.songName && post.songUrl && (!post.mediaUrls || post.mediaUrls.length === 0) && (
<button
type="button"
onClick={(e) => {
e.preventDefault();
e.stopPropagation();
handleTogglePostMusic(post);
}}
className="py-2 px-3 bg-black/40 border border-white/5 rounded-xl hover:bg-black/60 transition-all flex items-center justify-between text-neutral-200 font-bold select-none cursor-pointer group shadow-sm mb-1"
>
<span className="text-[10px] flex items-center gap-1.5 min-w-0">
<Music className={`w-3.5 h-3.5 text-brand-orange ${playingPostId === post.id ? 'animate-bounce' : ''}`} />
<span className="truncate">{post.songName} &bull; {post.songArtist}</span>
</span>
<div className="flex items-center gap-1.5 flex-shrink-0">
{playingPostId === post.id ? (
<Pause className="w-3.5 h-3.5 text-brand-orange group-hover:scale-110 transition-transform" />
) : (
<Play className="w-3.5 h-3.5 text-neutral-300 group-hover:scale-110 transition-transform" />
)}
</div>
</button>
)}

{/* Actions */}
<div className="flex items-center justify-between">
<div className="flex items-center gap-5">
<button
onClick={() => handleLikePost(post.id, post.isLiked)}
className={`p-0.5 hover:scale-110 active-shrink bg-transparent border-0 outline-none cursor-pointer transition-colors ${
post.isLiked ? 'text-brand-orange' : 'text-neutral-500 hover:text-brand-orange'
}`}
>
<Heart className={`w-[22px] h-[22px] ${post.isLiked ? 'fill-current' : ''}`} />
</button>
<button
onClick={() => toggleCommentsSection(post.id)}
className="p-0.5 hover:scale-110 active-shrink bg-transparent border-0 outline-none text-neutral-500 hover:text-brand-cyan cursor-pointer"
>
<MessageCircle className="w-[22px] h-[22px]" />
</button>
<button
onClick={() => setSharingPost(post)}
className="p-0.5 hover:scale-110 active-shrink bg-transparent border-0 outline-none text-neutral-500 hover:text-brand-cyan cursor-pointer"
>
<Send className="w-[22px] h-[22px]" />
</button>
<button
onClick={() => setActiveRepostPost(post)}
className="p-0.5 hover:scale-110 active-shrink bg-transparent border-0 outline-none text-neutral-500 hover:text-brand-orange cursor-pointer flex items-center gap-1"
title="Repost / Quote"
>
<Repeat className="w-[22px] h-[22px]" />
{(post.repostsCount || 0) > 0 && (
<span className="text-[11px] font-extrabold">{post.repostsCount}</span>
)}
</button>

{post.mediaUrls && post.mediaUrls.length > 0 && (
<button
onClick={() => handleDownloadMedia(post.mediaUrls[0], `post-${post.id}.jpg`)}
className="p-0.5 hover:scale-110 active-shrink bg-transparent border-0 outline-none text-neutral-500 hover:text-brand-cyan cursor-pointer"
title="Download Media"
>
<Download className="w-[22px] h-[22px]" />
</button>
)}
</div>

<button
onClick={() => handleSavePost(post.id, post.isSaved)}
className={`p-0.5 hover:scale-110 active-shrink bg-transparent border-0 outline-none cursor-pointer transition-colors ${
post.isSaved ? 'text-brand-orange' : 'text-neutral-500 hover:text-brand-orange'
}`}
>
<Bookmark className={`w-[22px] h-[22px] ${post.isSaved ? 'fill-current' : ''}`} />
</button>
</div>

{/* Likes Count */}
<span className="font-bold text-xs text-slate-500 dark:text-neutral-400">
{post.likesCount.toLocaleString()} likes
</span>

{/* Caption content */}
{post.content && (
<p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
<Link href={`/${post.user.username}`} className="font-bold mr-2 text-slate-800 dark:text-white hover:underline no-underline">
{post.user.username}
</Link>
{post.content}
</p>
)}

{/* Expand Comments Triggers */}
<button
onClick={() => toggleCommentsSection(post.id)}
className="text-[11px] font-bold text-brand-cyan hover:text-brand-cyan/80 text-left bg-transparent border-0 py-0.5 cursor-pointer mt-1"
>
{expandedCommentsPostId === post.id
? 'Collapse comment section'
: post.commentsCount > 0
? `View all ${post.commentsCount} comments`
: 'Be the first to comment'}
</button>

{/* Comments section block */}
<AnimatePresence>
{expandedCommentsPostId === post.id && (
<motion.div
initial={{ opacity: 0, height: 0 }}
animate={{ opacity: 1, height: 'auto' }}
exit={{ opacity: 0, height: 0 }}
className="overflow-hidden flex flex-col gap-4 mt-2 border-t border-white/5 pt-4"
>
{/* Comments List */}
<div className="flex flex-col gap-3.5 max-h-[220px] overflow-y-auto pr-1">
{(commentsMap[post.id] || []).length === 0 ? (
<span className="text-[10px] text-neutral-500 italic">No comments yet. Leave a note!</span>
) : (
commentsMap[post.id].map((comment: any) => (
<div key={comment.id} className="flex gap-3 items-start text-xs">
{comment.user.profile?.avatarUrl ? (
<img src={comment.user.profile.avatarUrl} alt="avatar" className="w-7 h-7 rounded-lg object-cover" />
) : (
<div className="w-7 h-7 rounded-lg bg-brand-orange text-black font-bold text-[10px] flex items-center justify-center flex-shrink-0">
{comment.user.username[0].toUpperCase()}
</div>
)}
<div className="flex flex-col flex-1">
<div className="flex items-baseline gap-2">
<span className="font-bold text-slate-850 dark:text-white">@{comment.user.username}</span>
<span className="text-[9px] text-slate-500">
{new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
</span>
</div>
<span className="text-slate-700 dark:text-neutral-300 mt-0.5 leading-relaxed">{comment.content}</span>
</div>
</div>
))
)}
</div>

{/* Composer comment inputs */}
<div className="flex gap-2 border-t border-brand-cyan/15 pt-3">
<input
type="text"
placeholder="Add a comment on this post..."
value={newCommentTexts[post.id] || ''}
onChange={(e) => setNewCommentTexts({ ...newCommentTexts, [post.id]: e.target.value })}
onKeyDown={(e) => {
if (e.key === 'Enter') {
handleCommentSubmit(post.id);
}
}}
className="flex-1 bg-black/40 border border-brand-cyan/15 focus:border-brand-cyan/45 rounded-xl px-3.5 py-2 text-xs outline-none transition-all placeholder:text-neutral-500 text-white shadow-inner"
/>
<button
onClick={() => handleCommentSubmit(post.id)}
disabled={!(newCommentTexts[post.id] || '').trim()}
className="bg-brand-cyan hover:bg-brand-cyan/85 text-black font-extrabold text-xs px-4 py-2 rounded-xl border-0 cursor-pointer disabled:opacity-40 hover:shadow-md hover:shadow-brand-cyan/10"
>
Post
</button>
</div>
</motion.div>
)}
</AnimatePresence>
</div>
</article>
);
})}
</div>
)}
</div>

{/* RIGHT COLUMN: Redesigned widgets for Communities, Events, Active students, Opportunities */}
<div className="hidden lg:flex flex-col w-[340px] gap-6 sticky top-6 self-start h-[calc(100vh-48px)] overflow-y-auto pr-1 pb-8 no-scrollbar">

{/* User Quick Info Header */}
<div className="flex items-center justify-between p-4 bg-brand-card border border-brand-cyan/15 rounded-[24px]">
<Link href={`/${user.username}`} className="flex items-center gap-3 no-underline">
{user.profile?.avatarUrl ? (
<img src={user.profile.avatarUrl} alt="avatar" className="w-11 h-11 rounded-xl object-cover border border-brand-cyan/15" />
) : (
<div className="w-11 h-11 rounded-xl bg-brand-orange text-black font-black text-sm flex items-center justify-center flex-shrink-0">
{user.username[0].toUpperCase()}
</div>
)}
<div className="flex flex-col text-white">
<span className="font-bold text-xs flex items-center gap-1 hover:underline">
{user.username}
{user.verified && (
<span title="Completed Learning Targets (Gold Medal)">
<Award className="w-3.5 h-3.5 text-brand-orange fill-brand-orange animate-pulse" />
</span>
)}
</span>
<span className="text-[10px] text-neutral-450 font-medium">{user.name || `@${user.username}`}</span>
</div>
</Link>
</div>

{/* Active Students List (Online / Suggestions) */}
<div className="bg-brand-card border border-brand-cyan/15 rounded-[24px] p-5 flex flex-col gap-4 text-white">
<span className="font-bold text-xs uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 font-outfit">
<Flame className="w-4 h-4 text-brand-orange animate-pulse" /> Active Students
</span>
<div className="flex flex-col gap-3 max-h-[160px] overflow-y-auto pr-1">
{suggestions.slice(0, 3).map((creator) => {
const isOnline = onlineUsers.includes(creator.id);
return (
<div key={creator.id} className="flex items-center justify-between text-xs">
<div className="flex items-center gap-2.5">
<div className="relative">
{creator.avatarUrl ? (
<img src={creator.avatarUrl} alt="avatar" className="w-8 h-8 rounded-lg object-cover border border-brand-cyan/15" />
) : (
<div className="w-8 h-8 rounded-lg bg-brand-orange text-black font-bold text-[10px] flex items-center justify-center flex-shrink-0">
{creator.username[0].toUpperCase()}
</div>
)}
<span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-brand-card ${isOnline ? 'bg-green-500' : 'bg-neutral-500'}`} />
</div>
<span className="font-bold text-neutral-200">@{creator.username}</span>
</div>
<span className="text-[9px] font-semibold text-neutral-450">{isOnline ? 'Active Now' : 'Offline'}</span>
</div>
);
})}
</div>
</div>

{/* Trending Communities Widget */}
<div className="bg-brand-card border border-brand-cyan/15 rounded-[24px] p-5 flex flex-col gap-4 text-white">
<span className="font-bold text-xs uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 font-outfit">
<Users className="w-4 h-4 text-brand-orange" /> Trending Communities
</span>
<div className="flex flex-col gap-3 text-xs">
<div className="flex justify-between items-center">
<div className="flex items-center gap-2">
<span className="text-base">🌐</span>
<div className="flex flex-col">
<span className="font-bold text-white">NextJS Hackers</span>
<span className="text-[9px] text-neutral-450">142 members</span>
</div>
</div>
<button className="text-[9px] font-bold text-brand-cyan bg-brand-cyan/5 border border-brand-cyan/20 px-2.5 py-1 rounded-lg hover:bg-brand-cyan hover:text-black transition-colors cursor-pointer">Join</button>
</div>
<div className="flex justify-between items-center">
<div className="flex items-center gap-2">
<span className="text-base">🤖</span>
<div className="flex flex-col">
<span className="font-bold text-white">AI Innovators Circle</span>
<span className="text-[9px] text-neutral-450 font-medium">96 members</span>
</div>
</div>
<button className="text-[9px] font-bold text-brand-cyan bg-brand-cyan/5 border border-brand-cyan/20 px-2.5 py-1 rounded-lg hover:bg-brand-cyan hover:text-black transition-colors cursor-pointer">Join</button>
</div>
</div>
</div>

{/* Upcoming Events & Hackathons Widget */}
<div className="bg-brand-card border border-brand-cyan/15 rounded-[24px] p-5 flex flex-col gap-4 text-white">
<span className="font-bold text-xs uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 font-outfit">
<Calendar className="w-4 h-4 text-brand-cyan" /> Upcoming Events
</span>
<div className="flex flex-col gap-3.5 text-xs">
<div className="flex gap-3 items-start">
<div className="p-2 bg-brand-orange/10 rounded-lg flex flex-col items-center justify-center text-brand-orange font-bold font-outfit w-10">
<span className="text-[10px] uppercase font-bold leading-none">Jul</span>
<span className="text-sm font-black leading-none mt-1">28</span>
</div>
<div className="flex flex-col">
<span className="font-bold text-white">Campus Smart Hackathon</span>
<span className="text-[10px] text-neutral-450 mt-0.5">24h innovation build sprint</span>
</div>
</div>
<div className="flex gap-3 items-start">
<div className="p-2 bg-brand-cyan/10 rounded-lg flex flex-col items-center justify-center text-brand-cyan font-bold font-outfit w-10">
<span className="text-[10px] uppercase font-bold leading-none">Aug</span>
<span className="text-sm font-black leading-none mt-1">05</span>
</div>
<div className="flex flex-col">
<span className="font-bold text-white">AI Pitch Fest 2026</span>
<span className="text-[10px] text-neutral-450 mt-0.5">Incubator pitch day</span>
</div>
</div>
</div>
</div>

{/* Teammate / Project Requests Widget */}
<div className="bg-brand-card border border-brand-cyan/15 rounded-[24px] p-5 flex flex-col gap-4 text-white">
<span className="font-bold text-xs uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 font-outfit">
<UserPlus className="w-4 h-4 text-brand-orange" /> Hackathon Team Requests
</span>
<div className="flex flex-col gap-3">
{activeTeams.length === 0 ? (
<span className="text-[10px] text-neutral-500 italic">No team requests active. Create one in Team Finder!</span>
) : (
activeTeams.slice(0, 2).map((team) => (
<div key={team.id} className="p-3 bg-black/30 border border-brand-cyan/15 rounded-xl flex flex-col gap-1.5">
<div className="flex justify-between items-center">
<span className="font-bold text-xs text-white truncate max-w-[150px]">{team.name}</span>
<span className="text-[8px] bg-brand-cyan/10 text-brand-cyan px-1.5 py-0.5 rounded-md font-bold uppercase">{team.lookingFor}</span>
</div>
<p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">{team.description}</p>
</div>
))
)}
</div>
</div>

</div>

{/* Global Stories Viewer Modal */}
{activeStoryGroup && (
<div className="fixed inset-0 bg-neutral-950/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
<div className="relative w-full max-w-[420px] aspect-[9/16] bg-neutral-900 rounded-[28px] overflow-hidden shadow-2xl flex flex-col">

{/* Story Header */}
<div className="absolute top-4 left-4 right-4 flex flex-col gap-3 z-10">
{/* Progress bars */}
<div className="flex gap-1.5">
{activeStoryGroup.stories.map((story: any, idx: number) => (
<div key={story.id} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
<div
className={`h-full bg-white transition-all duration-300 ${
idx < activeStoryIndex
? 'w-full'
: idx === activeStoryIndex
? 'w-[40%] animate-pulse'
: 'w-0'
}`}
/>
</div>
))}
</div>

{/* Creator details */}
<div className="flex items-center justify-between text-white">
<div className="flex items-center gap-3">
<img
src={activeStoryGroup.user.profile?.avatarUrl || 'https://picsum.photos/100'}
alt="avatar"
className="w-8 h-8 rounded-full object-cover border border-white/20"
/>
<div className="flex flex-col">
<div className="flex items-center gap-1.5">
<span className="text-white text-xs font-bold">{activeStoryGroup.user.username}</span>
{activeStoryGroup.stories[activeStoryIndex]?.isCloseFriends && (
<span className="bg-green-500 text-neutral-950 text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 select-none shadow shadow-green-500/10">
★ Close Friends
</span>
)}
</div>
{activeStoryGroup.stories[activeStoryIndex]?.songName && (
<span className="text-[9px] text-purple-300 flex items-center gap-1 font-semibold select-none">
<Music className="w-2.5 h-2.5 animate-pulse" />
{activeStoryGroup.stories[activeStoryIndex].songName} &bull; {activeStoryGroup.stories[activeStoryIndex].songArtist}
</span>
)}
</div>
</div>
<div className="flex items-center gap-2">
{/* Mute/Unmute story audio */}
{activeStoryGroup.stories[activeStoryIndex]?.songUrl && (
<button
type="button"
onClick={(e) => {
e.stopPropagation();
e.preventDefault();
toggleStoryMute();
}}
className="p-1 rounded-lg bg-black/40 text-white/80 hover:text-white border-0 outline-none cursor-pointer flex items-center justify-center transition-colors"
title={isStoryMuted ? "Unmute" : "Mute"}
>
{isStoryMuted ? (
<VolumeX className="w-5 h-5 text-red-400" />
) : (
<Volume2 className="w-5 h-5 text-purple-400" />
)}
</button>
)}

<button
type="button"
onClick={(e) => {
e.stopPropagation();
e.preventDefault();
const story = activeStoryGroup.stories[activeStoryIndex];
handleDownloadMedia(story.mediaUrl, `story-${story.id}.${story.type === 'VIDEO' ? 'mp4' : 'jpg'}`);
}}
className="p-1 rounded-lg bg-black/40 text-white hover:text-cyan-400 border-0 outline-none cursor-pointer flex items-center justify-center transition-colors"
title="Download Story"
>
<Download className="w-5 h-5" />
</button>

{activeStoryGroup.stories[activeStoryIndex] && activeStoryGroup.user.username === user.username && (
<button
type="button"
onClick={(e) => {
e.stopPropagation();
e.preventDefault();
handleDeleteStory(activeStoryGroup.stories[activeStoryIndex].id);
}}
className="p-1 rounded-lg bg-black/40 text-red-400 hover:text-red-550 border-0 outline-none cursor-pointer flex items-center justify-center transition-colors"
title="Delete Story"
>
<Trash className="w-5 h-5" />
</button>
)}
<button
type="button"
onClick={(e) => {
e.stopPropagation();
setActiveStoryGroup(null);
}}
className="p-1 rounded-lg bg-black/40 text-white/80 hover:text-white border-0 outline-none cursor-pointer flex items-center justify-center transition-colors"
>
<X className="w-5 h-5" />
</button>
</div>
</div>
</div>

{/* Story Content */}
<div
onClick={(e) => {
e.preventDefault();
e.stopPropagation();
const rect = e.currentTarget.getBoundingClientRect();
const clickX = e.clientX - rect.left;
const halfWidth = rect.width / 2;
if (clickX < halfWidth) {
handlePrevStory();
} else {
handleNextStory();
}
}}
className="flex-1 w-full flex items-center justify-center relative bg-neutral-950 cursor-pointer select-none"
>
{activeStoryGroup.stories[activeStoryIndex] ? (
activeStoryGroup.stories[activeStoryIndex].type === 'VIDEO' ? (
<video
src={activeStoryGroup.stories[activeStoryIndex].mediaUrl}
autoPlay
controls={false}
className="w-full h-full object-cover pointer-events-none"
/>
) : (
<img
src={activeStoryGroup.stories[activeStoryIndex].mediaUrl}
alt="story"
className="w-full h-full object-cover pointer-events-none"
/>
)
) : (
<div className="text-white text-xs">Loading...</div>
)}

{/* Navigation overlays */}
<button
type="button"
onClick={(e) => {
e.stopPropagation();
handlePrevStory();
}}
disabled={activeStoryIndex === 0}
className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 disabled:opacity-0 cursor-pointer border-0 z-20"
>
<ChevronLeft className="w-5 h-5" />
</button>

<button
type="button"
onClick={(e) => {
e.stopPropagation();
handleNextStory();
}}
className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 cursor-pointer border-0 z-20"
>
<ChevronRight className="w-5 h-5" />
</button>
</div>
</div>
</div>
)}

{/* Global Share Modal */}
<AnimatePresence>
{sharingPost && (
<div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
<motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-3xl p-6 flex flex-col gap-5 glass shadow-2xl text-white"
>
<div className="flex justify-between items-center">
<span className="font-bold text-sm">Share Post</span>
<button
onClick={() => setSharingPost(null)}
className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
>
<X className="w-5 h-5" />
</button>
</div>

{/* Share copy box */}
<div className="flex flex-col gap-2">
<span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Post Link</span>
<div className="flex gap-2">
<input
type="text"
readOnly
value={`${window.location.origin}/post/${sharingPost.id}`}
className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-2xs text-neutral-300 outline-none"
/>
<button
onClick={() => copyPostLink(sharingPost.id)}
className="p-2.5 bg-cyan-600 hover:bg-cyan-700 text-black rounded-xl active-shrink border-0 cursor-pointer"
>
{copiedLink ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
</button>
</div>
</div>

{/* Direct share to Chats */}
<div className="flex flex-col gap-2.5">
<span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Send directly in chat</span>
<div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
{shareChats.length === 0 ? (
<span className="text-[10px] text-neutral-500 italic">No active conversations found. Open Messages tab to start one!</span>
) : (
shareChats.map((chat) => {
const partner = chat.members.find((m: any) => m.userId !== user?.id);
const displayName = chat.isGroup ? chat.name : (partner ? `@${partner.user.username}` : 'Campify Member');
return (
<div key={chat.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
<span className="text-xs text-neutral-200 font-bold truncate max-w-[180px]">{displayName}</span>
<button
onClick={() => handleSendPostToChat(chat.id)}
className="bg-cyan-500 hover:bg-cyan-600 text-black font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg border-0 cursor-pointer active-shrink transition-colors"
>
Send
</button>
</div>
);
})
)}
</div>
</div>
</motion.div>
</div>
)}
</AnimatePresence>

{/* Repost Options Choice Modal */}
<AnimatePresence>
{activeRepostPost && (
<div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
<motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
className="w-full max-w-xs bg-neutral-900 border border-white/10 rounded-3xl p-5 flex flex-col gap-4 glass shadow-2xl text-white text-center"
>
<div className="flex justify-between items-center">
<span className="font-bold text-xs uppercase text-neutral-400 tracking-wider">Repost Options</span>
<button
onClick={() => setActiveRepostPost(null)}
className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
>
<X className="w-4 h-4" />
</button>
</div>

<div className="flex flex-col gap-2.5 my-2">
<button
onClick={() => {
handleInstantRepost(activeRepostPost.id);
setActiveRepostPost(null);
}}
className="w-full bg-white/5 hover:bg-white/10 border border-white/5 py-3 rounded-xl text-xs font-bold text-white cursor-pointer active-shrink transition-all flex items-center justify-center gap-2"
>
<Repeat className="w-4 h-4 text-green-500" />
Repost Instantly
</button>
<button
onClick={() => {
setQuotingPost(activeRepostPost);
setActiveRepostPost(null);
}}
className="w-full bg-white/5 hover:bg-white/10 border border-white/5 py-3 rounded-xl text-xs font-bold text-white cursor-pointer active-shrink transition-all flex items-center justify-center gap-2"
>
<MessageCircle className="w-4 h-4 text-cyan-500" />
Quote Post
</button>
</div>
</motion.div>
</div>
)}
</AnimatePresence>

{/* Quote Post Modal */}
<AnimatePresence>
{quotingPost && (
<div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
<motion.div
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 glass shadow-2xl text-white"
>
<div className="flex justify-between items-center">
<span className="font-bold text-sm">Quote Post</span>
<button
onClick={() => { setQuotingPost(null); setQuoteContent(''); }}
className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
>
<X className="w-5 h-5" />
</button>
</div>

<form onSubmit={handleQuoteSubmit} className="flex flex-col gap-4">
<textarea
placeholder="Add a comment to this quote..."
value={quoteContent}
onChange={(e) => setQuoteContent(e.target.value)}
rows={3}
className="w-full bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none focus:ring-0"
/>

{/* Nested preview of original post inside quote modal */}
<div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
<div className="flex items-center gap-2">
{quotingPost.user.profile?.avatarUrl ? (
<img src={quotingPost.user.profile.avatarUrl} className="w-5 h-5 rounded-full object-cover" />
) : (
<div className="w-5 h-5 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-[9px]">
{quotingPost.user.username[0].toUpperCase()}
</div>
)}
<span className="font-bold text-[10px] text-neutral-300">@{quotingPost.user.username}</span>
</div>
{quotingPost.content && (
<p className="text-[11px] text-neutral-400 truncate">{quotingPost.content}</p>
)}
</div>

<button
type="submit"
disabled={isReposting || !quoteContent.trim()}
className="w-full mt-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 border-0 cursor-pointer"
>
{isReposting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Quote'}
</button>
</form>
</motion.div>
</div>
)}
</AnimatePresence>

{/* Floating AI Social Assistant Slide-out Drawer */}
<AnimatePresence>
{isAiDrawerOpen && (
<div className="fixed inset-y-0 right-0 w-80 bg-neutral-900 border-l border-white/10 z-40 p-6 flex flex-col gap-5 shadow-2xl glass text-white select-none">

{/* Header */}
<div className="flex justify-between items-center">
<span className="font-extrabold text-sm text-cyan-400 flex items-center gap-1.5 font-outfit">
<Brain className="w-5 h-5" /> AI Social Assistant
</span>
<button
onClick={() => setIsAiDrawerOpen(false)}
className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
>
<X className="w-5 h-5" />
</button>
</div>

{/* Tool Selector */}
<div className="flex gap-2 bg-neutral-950 p-1 rounded-xl">
{(['caption', 'hashtags', 'reels'] as const).map((tool) => (
<button
key={tool}
onClick={() => { setAiTool(tool); setAiOutput(''); }}
className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg border-0 cursor-pointer transition-colors ${
aiTool === tool ? 'bg-cyan-500 text-black' : 'bg-transparent text-neutral-400 hover:text-white'
}`}
>
{tool === 'reels' ? 'ideas' : tool}
</button>
))}
</div>

{/* Input fields */}
<div className="flex flex-col gap-3">
<div className="flex flex-col gap-1.5">
<label className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">
{aiTool === 'caption'
? 'What is your post about?'
: aiTool === 'hashtags'
? 'Paste post text here'
: 'Select video category (e.g. AI, Programming)'}
</label>
<textarea
placeholder={aiTool === 'caption'
? 'e.g. launching campify platforms'
: aiTool === 'hashtags'
? 'Code, collaborate, scale...'
: 'Programming'}
value={aiTopic}
onChange={(e) => setAiTopic(e.target.value)}
className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white w-full resize-none"
rows={3}
/>
</div>

{aiTool === 'caption' && (
<div className="flex flex-col gap-1.5">
<label className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Caption Tone</label>
<select
value={aiTone}
onChange={(e) => setAiTone(e.target.value)}
className="bg-neutral-800 border border-transparent rounded-xl px-3 py-2 text-xs outline-none text-white cursor-pointer"
>
<option value="Professional">Professional</option>
<option value="Witty">Witty</option>
<option value="Inspiring">Inspiring</option>
<option value="Minimal">Minimalist</option>
</select>
</div>
)}

<button
onClick={handleAiCall}
disabled={isAiLoading || !aiTopic.trim()}
className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs rounded-xl border-0 cursor-pointer active-shrink disabled:opacity-40"
>
{isAiLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Generate Content'}
</button>
</div>

{/* Output Display */}
{aiOutput && (
<div className="flex-1 flex flex-col gap-2 mt-2">
<label className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Suggested Output</label>
<div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-3.5 text-xs text-neutral-300 overflow-y-auto leading-relaxed relative select-text">
{aiOutput}
</div>
<button
onClick={() => {
navigator.clipboard.writeText(aiOutput);
alert('Copied to clipboard!');
}}
className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-white font-bold text-[10px] rounded-xl cursor-pointer active-shrink"
>
Copy Output
</button>
</div>
)}

</div>
)}
</AnimatePresence>

</div>
);
}