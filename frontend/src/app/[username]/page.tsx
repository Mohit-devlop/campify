'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, Bookmark, Eye, TrendingUp, Sparkles, MapPin, 
  Globe, Calendar, Loader2, Heart, MessageCircle, Play, Film, Award, BarChart2, Repeat,
  Briefcase, GraduationCap, ShieldCheck, Plus, Trash, Archive, X, Music, ChevronLeft, ChevronRight, Star, Search, Download
} from 'lucide-react';

type Tab = 'posts' | 'reels' | 'portfolio' | 'saved' | 'analytics';

export default function UserProfile() {
  const params = useParams();
  const router = useRouter();
  const usernameParam = params.username as string;
  const { user: currentUser, isAuthenticated, isInitialized } = useAuthStore();

  const [profileUser, setProfileUser] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [portfolio, setPortfolio] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // Gamification stats state
  const [gamifyStats, setGamifyStats] = useState<any | null>(null);

  // Profile Close Friends management states
  const [closeFriendsList, setCloseFriendsList] = useState<any[]>([]);
  const [closeFriendIds, setCloseFriendIds] = useState<string[]>([]);
  const [searchCFQuery, setSearchCFQuery] = useState('');
  const [showCloseFriendsModal, setShowCloseFriendsModal] = useState(false);
  const [isCFModalLoading, setIsCFModalLoading] = useState(false);

  const openCloseFriendsModal = async () => {
    if (!currentUser) return;
    setShowCloseFriendsModal(true);
    setIsCFModalLoading(true);
    try {
      const [followingRes, closeFriendsRes] = await Promise.all([
        apiFetch(`/users/following/${currentUser.id}`),
        apiFetch('/users/close-friends'),
      ]);

      if (followingRes.ok && closeFriendsRes.ok) {
        const followingData = await followingRes.json();
        const closeFriendsData = await closeFriendsRes.json();
        setCloseFriendsList(followingData || []);
        setCloseFriendIds(closeFriendsData.map((f: any) => f.id) || []);
      }
    } catch (err) {
      console.error('Failed to load friends list:', err);
    } finally {
      setIsCFModalLoading(false);
    }
  };

  const handleToggleProfileCloseFriend = async (friendId: string) => {
    let newIds = [...closeFriendIds];
    if (newIds.includes(friendId)) {
      newIds = newIds.filter((id) => id !== friendId);
    } else {
      newIds.push(friendId);
    }
    setCloseFriendIds(newIds);

    try {
      await apiFetch('/users/close-friends', {
        method: 'POST',
        body: JSON.stringify({ friendIds: newIds }),
      });
    } catch (err) {
      console.error('Failed to update close friend:', err);
    }
  };

  const filteredCFList = closeFriendsList.filter(
    (f) =>
      f.username.toLowerCase().includes(searchCFQuery.toLowerCase()) ||
      (f.name && f.name.toLowerCase().includes(searchCFQuery.toLowerCase()))
  );

  // Highlights states
  const [highlights, setHighlights] = useState<any[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<any | null>(null);
  const [activeHighlightStoryIndex, setActiveHighlightStoryIndex] = useState(0);
  const [highlightAudio, setHighlightAudio] = useState<HTMLAudioElement | null>(null);
  const [isHighlightMuted, setIsHighlightMuted] = useState(false);

  // Archive & Edit highlight states
  const [archiveStories, setArchiveStories] = useState<any[]>([]);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<any | null>(null);
  const [highlightTitle, setHighlightTitle] = useState('');
  const [selectedArchiveStoryIds, setSelectedArchiveStoryIds] = useState<string[]>([]);
  const [isSubmittingHighlight, setIsSubmittingHighlight] = useState(false);

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

  // Story background audio autoplay & loop
  useEffect(() => {
    if (!activeHighlight) {
      if (highlightAudio) {
        highlightAudio.pause();
        setHighlightAudio(null);
      }
      return;
    }

    const currentStory = activeHighlight.stories[activeHighlightStoryIndex];
    if (highlightAudio) {
      highlightAudio.pause();
      setHighlightAudio(null);
    }

    if (currentStory && currentStory.songUrl) {
      const audio = new Audio(currentStory.songUrl);
      audio.loop = true;
      audio.muted = isHighlightMuted;
      audio.play().catch((err) => console.log('Highlight audio error:', err));
      setHighlightAudio(audio);
    }

    return () => {
      if (highlightAudio) {
        highlightAudio.pause();
      }
    };
  }, [activeHighlight, activeHighlightStoryIndex]);

  useEffect(() => {
    return () => {
      if (highlightAudio) highlightAudio.pause();
    };
  }, [highlightAudio]);

  const handleNextHighlightStory = () => {
    if (!activeHighlight) return;
    if (activeHighlightStoryIndex < activeHighlight.stories.length - 1) {
      setActiveHighlightStoryIndex(activeHighlightStoryIndex + 1);
    } else {
      setActiveHighlight(null);
    }
  };

  const handlePrevHighlightStory = () => {
    if (activeHighlightStoryIndex > 0) {
      setActiveHighlightStoryIndex(activeHighlightStoryIndex - 1);
    }
  };

  const toggleHighlightMute = () => {
    const nextMute = !isHighlightMuted;
    setIsHighlightMuted(nextMute);
    if (highlightAudio) {
      highlightAudio.muted = nextMute;
    }
  };

  const openHighlightModal = async (hl: any = null) => {
    setEditingHighlight(hl);
    setHighlightTitle(hl ? hl.title : '');
    setSelectedArchiveStoryIds(hl ? hl.stories.map((s: any) => s.id) : []);
    setShowHighlightModal(true);

    try {
      const res = await apiFetch('/stories/archive');
      if (res.ok) {
        const archiveData = await res.json();
        setArchiveStories(archiveData || []);
      }
    } catch (err) {
      console.error('Failed to fetch archive stories:', err);
    }
  };

  const handleSaveHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightTitle.trim() || selectedArchiveStoryIds.length === 0) return;
    setIsSubmittingHighlight(true);

    try {
      const payload = {
        title: highlightTitle,
        storyIds: selectedArchiveStoryIds,
      };

      let res;
      if (editingHighlight) {
        res = await apiFetch(`/stories/highlights/${editingHighlight.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/stories/highlight', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setShowHighlightModal(false);
        setEditingHighlight(null);
        setHighlightTitle('');
        setSelectedArchiveStoryIds([]);
        // Reload highlights
        const hlRes = await apiFetch(`/stories/highlights/${profileUser.id}`);
        if (hlRes.ok) {
          const hlData = await hlRes.json();
          setHighlights(hlData || []);
        }
      } else {
        alert('Failed to save highlight');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingHighlight(false);
    }
  };

  const handleDeleteHighlight = async (e: React.MouseEvent, highlightId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this highlight?')) return;

    try {
      const res = await apiFetch(`/stories/highlights/${highlightId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setHighlights((prev) => prev.filter((hl) => hl.id !== highlightId));
      } else {
        alert('Failed to delete highlight');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Form states for adding items (only if own profile)
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCat, setNewSkillCat] = useState('Technical');

  const [showProjForm, setShowProjForm] = useState(false);
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjRole, setNewProjRole] = useState('');
  const [newProjLink, setNewProjLink] = useState('');
  const [newProjTech, setNewProjTech] = useState('');

  const [showExpForm, setShowExpForm] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpStart, setNewExpStart] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  const isOwnProfile = currentUser?.username === usernameParam;

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isInitialized, router]);

  useEffect(() => {
    loadProfileData();
  }, [usernameParam, isAuthenticated, currentUser]);

  async function loadProfileData() {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      // Fetch profile user
      const res = await apiFetch(`/users/profile/${usernameParam}`);
      if (res.ok) {
        const data = await res.json();
        setProfileUser(data.user);
        setIsFollowing(data.isFollowing);

        // Load posts
        const postsRes = await apiFetch(`/posts/feed?limit=25`);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const filteredPosts = (postsData.posts || []).filter((p: any) => p.user.id === data.user.id);
          setPosts(filteredPosts);
        }

        // Load user reels
        const reelsRes = await apiFetch('/reels?limit=15');
        if (reelsRes.ok) {
          const reelsData = await reelsRes.json();
          const filteredReels = (reelsData.reels || []).filter((r: any) => r.user.id === data.user.id);
          setReels(filteredReels);
        }

        // Fetch skills/portfolio details
        const portRes = await apiFetch(`/skills/portfolio/${usernameParam}`);
        if (portRes.ok) {
          const portData = await portRes.json();
          setPortfolio(portData);
        }

        // Load saved bookmarks & analytics if own profile
        if (currentUser?.username === usernameParam) {
          const savedRes = await apiFetch('/posts/saved');
          if (savedRes.ok) {
            const savedData = await savedRes.json();
            setSavedPosts(savedData || []);
          }

          const analyticsRes = await apiFetch('/users/analytics');
          if (analyticsRes.ok) {
            const analyticsData = await analyticsRes.json();
            setAnalytics(analyticsData);
          }

          // Fetch gamification stats
          const gamifyRes = await apiFetch('/gamification/stats');
          if (gamifyRes.ok) {
            const gamifyData = await gamifyRes.json();
            setGamifyStats(gamifyData);
          }
        }

        // Fetch highlights
        const highlightsRes = await apiFetch(`/stories/highlights/${data.user.id}`);
        if (highlightsRes.ok) {
          const highlightsData = await highlightsRes.json();
          setHighlights(highlightsData || []);
        }
      } else {
        setProfileUser(null);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleFollowToggle = async () => {
    if (!profileUser) return;
    try {
      const endpoint = isFollowing ? `/users/unfollow/${profileUser.id}` : `/users/follow/${profileUser.id}`;
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await apiFetch(endpoint, { method });

      if (res.ok) {
        setIsFollowing(!isFollowing);
        setProfileUser((prev: any) => ({
          ...prev,
          stats: {
            ...prev.stats,
            followersCount: isFollowing ? prev.stats.followersCount - 1 : prev.stats.followersCount + 1,
          },
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Form Submit Handlers
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      const res = await apiFetch('/skills', {
        method: 'POST',
        body: JSON.stringify({ name: newSkillName, category: newSkillCat }),
      });
      if (res.ok) {
        setNewSkillName('');
        setShowSkillForm(false);
        await loadProfileData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      const res = await apiFetch(`/skills/${skillId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadProfileData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim() || !newProjDesc.trim() || !newProjRole.trim()) return;

    try {
      const res = await apiFetch('/skills/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: newProjTitle,
          description: newProjDesc,
          role: newProjRole,
          link: newProjLink,
          technologies: newProjTech,
        }),
      });
      if (res.ok) {
        setNewProjTitle('');
        setNewProjDesc('');
        setNewProjRole('');
        setNewProjLink('');
        setNewProjTech('');
        setShowProjForm(false);
        await loadProfileData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveProject = async (projId: string) => {
    try {
      const res = await apiFetch(`/skills/projects/${projId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadProfileData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim() || !newExpCompany.trim() || !newExpStart) return;

    try {
      const res = await apiFetch('/skills/experience', {
        method: 'POST',
        body: JSON.stringify({
          title: newExpTitle,
          company: newExpCompany,
          startDate: newExpStart,
          description: newExpDesc,
        }),
      });
      if (res.ok) {
        setNewExpTitle('');
        setNewExpCompany('');
        setNewExpStart('');
        setNewExpDesc('');
        setShowExpForm(false);
        await loadProfileData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveExperience = async (expId: string) => {
    try {
      const res = await apiFetch(`/skills/experience/${expId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadProfileData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await apiFetch(`/posts/${postId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        alert('Failed to delete post');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 flex flex-col items-center gap-4 text-white">
        <Sparkles className="w-12 h-12 text-cyan-500 animate-pulse" />
        <h2 className="text-xl font-bold font-outfit">User Profile Not Found</h2>
        <p className="text-neutral-500 text-sm">
          The link you followed may be broken or the account may have been banned by moderators.
        </p>
      </div>
    );
  }

  const engagementScore = profileUser.stats.followersCount > 0 
    ? ((profileUser.stats.postsCount * 3.4) / (profileUser.stats.followersCount * 0.05)).toFixed(1) 
    : '4.8';

  const userXpStats = gamifyStats?.stats || { xpPoints: 0, level: 1, dailyStreak: 0 };

  return (
    <div className="max-w-4xl mx-auto pb-16 flex flex-col gap-6 select-none font-sans text-white">
      
      {/* cover photo header */}
      <div className="relative h-48 md:h-64 w-full bg-neutral-900 overflow-hidden rounded-b-[32px] shadow-sm">
        {profileUser.profile?.coverUrl ? (
          <img src={profileUser.profile.coverUrl} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-teal-950/20 via-cyan-900/10 to-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/45 to-transparent pointer-events-none" />
      </div>

      {/* Profile Info Details overlay */}
      <div className="px-6 md:px-8 flex flex-col gap-6 relative mt-[-70px] z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          
          {/* Large Avatar container */}
          <div className="relative">
            <div className="p-1.5 rounded-3xl bg-gradient-to-tr from-teal-500 via-cyan-600 to-blue-500">
              {profileUser.profile?.avatarUrl ? (
                <img
                  src={profileUser.profile.avatarUrl}
                  alt={profileUser.username}
                  className="w-28 h-28 rounded-[20px] object-cover border-4 border-neutral-950 bg-black"
                />
              ) : (
                <div className="w-28 h-28 rounded-[20px] bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-white font-extrabold text-3xl border-4 border-neutral-950">
                  {profileUser.username[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 self-start md:self-end mt-2 md:mt-0">
            {isOwnProfile ? (
              <>
                <button
                  onClick={openCloseFriendsModal}
                  className="bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 text-green-400 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer active-shrink hover-scale flex items-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5 fill-green-500" /> Close Friends
                </button>
                <Link href="/settings" className="no-underline">
                  <button className="bg-white/10 hover:bg-white/15 text-neutral-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-white/5 cursor-pointer active-shrink hover-scale">
                    Edit Profile
                  </button>
                </Link>
              </>
            ) : (
              <button
                onClick={handleFollowToggle}
                className={`text-xs font-bold px-6 py-2.5 rounded-xl border-0 cursor-pointer active-shrink hover-scale ${
                  isFollowing
                    ? 'bg-white/10 hover:bg-white/15 text-neutral-200 border border-white/5'
                    : 'bg-cyan-500 text-black hover:bg-cyan-600 shadow-lg shadow-cyan-500/25'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Text descriptions */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-outfit tracking-tight flex items-center gap-1.5 text-white">
              {profileUser.name || profileUser.username}
              {profileUser.verified && (
                <span title="Completed Learning Targets (Gold Medal)">
                  <Award className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500 animate-pulse" />
                </span>
              )}
            </h1>
            <span className="text-sm text-neutral-400 font-semibold">@{profileUser.username}</span>
          </div>

          {/* User Bio */}
          {profileUser.profile?.bio && (
            <p className="text-sm text-neutral-300 leading-relaxed max-w-xl whitespace-pre-line">
              {profileUser.profile.bio}
            </p>
          )}

          {/* Metadata flex */}
          <div className="flex flex-wrap gap-4 text-xs text-neutral-400 font-medium">
            {profileUser.profile?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {profileUser.profile.location}
              </span>
            )}
            {profileUser.profile?.website && (
              <a
                href={profileUser.profile.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:underline no-underline"
              >
                <Globe className="w-3.5 h-3.5" />
                {profileUser.profile.website.replace(/(^\w+:|^)\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined {new Date(profileUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </span>
          </div>

          {/* Counter statistics banner */}
          <div className="flex items-center gap-6 mt-2 py-4 border-y border-white/5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-sm text-white">{profileUser.stats.postsCount}</span>
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">posts</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-sm text-white">{profileUser.stats.followersCount}</span>
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">followers</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-sm text-white">{profileUser.stats.followingCount}</span>
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">following</span>
            </div>
            <div className="flex items-baseline gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
              <Award className="w-3 h-3 text-cyan-400 self-center mr-1" />
              <span className="font-extrabold text-2xs text-cyan-400">{engagementScore}% engagement</span>
            </div>
            <div className="flex items-baseline gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3 text-cyan-400 self-center mr-1" />
              <span className="font-extrabold text-2xs text-cyan-400">Level {userXpStats.level} ({userXpStats.xpPoints} XP)</span>
            </div>
          </div>
        </div>

        {/* STORY HIGHLIGHTS ROW */}
        <div className="px-6 md:px-8 mt-2 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">Story Highlights</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar items-center">
            {/* Add highlight trigger */}
            {isOwnProfile && (
              <button
                onClick={() => openHighlightModal()}
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer hover:scale-[1.02] active-shrink bg-transparent border-0 outline-none select-none group"
              >
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 hover:border-neutral-705 flex items-center justify-center relative transition-colors shadow shadow-black/20">
                  <Plus className="w-5 h-5 text-neutral-450 group-hover:text-cyan-400 transition-colors" />
                </div>
                <span className="text-[10px] font-bold text-neutral-450">New</span>
              </button>
            )}

            {/* Highlights List */}
            {highlights.map((hl) => (
              <div
                key={hl.id}
                onClick={() => {
                  setActiveHighlight(hl);
                  setActiveHighlightStoryIndex(0);
                }}
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer hover:scale-[1.02] active-shrink relative group select-none"
              >
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-neutral-800 to-neutral-700 hover:from-cyan-500 hover:to-teal-500 transition-all duration-300 shadow shadow-black/20">
                  <div className="w-full h-full bg-black rounded-full p-[2px]">
                    {hl.coverUrl || (hl.stories[0] && hl.stories[0].mediaUrl) ? (
                      <img
                        src={hl.coverUrl || hl.stories[0].mediaUrl}
                        alt={hl.title}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-900 to-teal-950 flex items-center justify-center text-white font-extrabold text-lg uppercase">
                        {hl.title[0]}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-neutral-300 max-w-[68px] truncate">{hl.title}</span>

                {/* Edit / Delete actions on hover */}
                {isOwnProfile && (
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 flex gap-1 bg-black/80 p-1 rounded-full border border-white/5 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openHighlightModal(hl);
                      }}
                      className="p-1 text-cyan-400 hover:text-cyan-300 bg-transparent border-0 cursor-pointer flex items-center justify-center"
                      title="Edit Highlight"
                    >
                      <Grid className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteHighlight(e, hl.id)}
                      className="p-1 text-red-400 hover:text-red-300 bg-transparent border-0 cursor-pointer flex items-center justify-center"
                      title="Delete Highlight"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {highlights.length === 0 && !isOwnProfile && (
              <span className="text-2xs text-neutral-505 italic px-1 py-3">No highlights shared yet.</span>
            )}
          </div>
        </div>

        {/* Tab Selector buttons */}
        <div className="flex gap-6 border-b border-white/5 mt-4 relative">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-3.5 font-bold text-xs flex items-center gap-1.5 transition-all bg-transparent border-0 cursor-pointer relative ${
              activeTab === 'posts' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Grid className="w-4 h-4" />
            Posts ({posts.length})
            {activeTab === 'posts' && (
              <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('reels')}
            className={`pb-3.5 font-bold text-xs flex items-center gap-1.5 transition-all bg-transparent border-0 cursor-pointer relative ${
              activeTab === 'reels' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Film className="w-4 h-4" />
            Reels ({reels.length})
            {activeTab === 'reels' && (
              <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`pb-3.5 font-bold text-xs flex items-center gap-1.5 transition-all bg-transparent border-0 cursor-pointer relative ${
              activeTab === 'portfolio' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Portfolio Showcase
            {activeTab === 'portfolio' && (
              <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500" />
            )}
          </button>

          {isOwnProfile && (
            <>
              <button
                onClick={() => setActiveTab('saved')}
                className={`pb-3.5 font-bold text-xs flex items-center gap-1.5 transition-all bg-transparent border-0 cursor-pointer relative ${
                  activeTab === 'saved' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Bookmarks ({savedPosts.length})
                {activeTab === 'saved' && (
                  <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500" />
                )}
              </button>

              {/* Archived tab removed */}

              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-3.5 font-bold text-xs flex items-center gap-1.5 transition-all bg-transparent border-0 cursor-pointer relative ${
                  activeTab === 'analytics' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Analytics
                {activeTab === 'analytics' && (
                  <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Tab grids */}
        <div className="mt-4">
          
          {/* Posts Grid Layout */}
          {activeTab === 'posts' && (
            posts.length === 0 ? (
              <div className="text-center py-16 text-xs text-neutral-500 italic">
                No publications posted yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {posts.map((post) => (
                  <div key={post.id} className="relative aspect-square rounded-[20px] overflow-hidden group hover:scale-[1.01] transition-all bg-neutral-900 border border-white/5">
                    {post.mediaUrls && post.mediaUrls.length > 0 ? (
                      <img src={post.mediaUrls[0]} alt="post" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full p-4 flex items-center justify-center text-center text-xs bg-neutral-900 text-neutral-400 italic">
                        &ldquo;{post.content?.substring(0, 50)}...&rdquo;
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-5 text-white text-xs font-bold">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4.5 h-4.5 fill-current text-red-500" />
                        {post.likesCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4.5 h-4.5" />
                        {post.commentsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat className="w-4.5 h-4.5 text-green-500" />
                        {post.repostsCount || 0}
                      </span>
                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownloadMedia(post.mediaUrls[0], `post-${post.id}.jpg`);
                          }}
                          className="p-1 hover:scale-110 active-shrink bg-transparent border-0 outline-none text-white hover:text-cyan-400 cursor-pointer flex items-center justify-center transition-colors"
                          title="Download Post"
                        >
                          <Download className="w-4.5 h-4.5" />
                        </button>
                      )}

                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeletePost(post.id);
                          }}
                          className="p-1 hover:scale-110 active-shrink bg-transparent border-0 outline-none text-white hover:text-red-400 cursor-pointer flex items-center justify-center transition-colors"
                          title="Delete Post"
                        >
                          <Trash className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Archived tab layout removed */}

          {/* Reels Tab Grid */}
          {activeTab === 'reels' && (
            reels.length === 0 ? (
              <div className="text-center py-16 text-xs text-neutral-500 italic">
                No video reels shared.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {reels.map((reel) => (
                  <div key={reel.id} className="relative aspect-[9/16] rounded-[20px] overflow-hidden group hover:scale-[1.01] transition-all bg-neutral-900 border border-white/5">
                    <video src={reel.videoUrl} className="w-full h-full object-cover" muted playsInline />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/55 transition-colors">
                      <Play className="w-8 h-8 text-white/80 filter drop-shadow-md group-hover:scale-90 transition-transform pointer-events-none" />
                      
                      {/* Hover Actions */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownloadMedia(reel.videoUrl, `reel-${reel.id}.mp4`);
                          }}
                          className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white hover:text-cyan-400 cursor-pointer border-0 flex items-center justify-center transition-colors shadow"
                          title="Download Reel"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* PORTFOLIO & SKILLS TAB */}
          {activeTab === 'portfolio' && (
            <div className="flex flex-col gap-6 text-white">
              
              {/* SKILLS SECTION */}
              <div className="p-5 bg-neutral-900/40 border border-white/5 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <GraduationCap className="w-4.5 h-4.5" /> Featured Skills
                  </h3>
                  {isOwnProfile && (
                    <button 
                      onClick={() => setShowSkillForm(!showSkillForm)}
                      className="p-1 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 rounded-lg cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>

                {/* Add Skill Form inline */}
                {showSkillForm && (
                  <form onSubmit={handleAddSkill} className="flex gap-2 bg-neutral-900 p-3 rounded-xl border border-white/5">
                    <input
                      type="text"
                      placeholder="e.g. Next.js"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none text-white flex-1"
                      required
                    />
                    <select
                      value={newSkillCat}
                      onChange={(e) => setNewSkillCat(e.target.value)}
                      className="bg-neutral-800 border border-transparent rounded-xl px-3 py-1.5 text-xs outline-none text-white cursor-pointer"
                    >
                      <option value="Technical">Technical</option>
                      <option value="Design">Design</option>
                      <option value="Creative">Creative</option>
                      <option value="Business">Business</option>
                    </select>
                    <button type="submit" className="py-1 px-4 bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs rounded-lg border-0 cursor-pointer">
                      Save
                    </button>
                  </form>
                )}

                {/* List skills */}
                <div className="flex flex-wrap gap-2">
                  {!portfolio?.skills || portfolio.skills.length === 0 ? (
                    <span className="text-2xs text-neutral-500 italic">No skills listed yet.</span>
                  ) : (
                    portfolio.skills.map((skill: any) => (
                      <span 
                        key={skill.id} 
                        className="text-xs bg-neutral-900 border border-white/5 px-3.5 py-1.5 rounded-xl flex items-center gap-2 font-medium"
                      >
                        {skill.name}
                        <span className="text-[8px] bg-cyan-500/10 text-cyan-400 font-bold px-1.5 py-0.5 rounded-full uppercase">{skill.category}</span>
                        {isOwnProfile && (
                          <button 
                            onClick={() => handleRemoveSkill(skill.id)}
                            className="bg-transparent border-0 p-0 text-red-400 hover:text-red-500 cursor-pointer ml-1"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* PROJECTS SECTION */}
              <div className="p-5 bg-neutral-900/40 border border-white/5 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Briefcase className="w-4.5 h-4.5" /> Projects Portfolio
                  </h3>
                  {isOwnProfile && (
                    <button 
                      onClick={() => setShowProjForm(!showProjForm)}
                      className="p-1 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 rounded-lg cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>

                {/* Add Project Form */}
                {showProjForm && (
                  <form onSubmit={handleAddProject} className="flex flex-col gap-3 bg-neutral-900 p-4 rounded-xl border border-white/5">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Project Title"
                        value={newProjTitle}
                        onChange={(e) => setNewProjTitle(e.target.value)}
                        className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs w-full"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Your Role (e.g. Lead Frontend)"
                        value={newProjRole}
                        onChange={(e) => setNewProjRole(e.target.value)}
                        className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs w-full"
                        required
                      />
                    </div>
                    <textarea
                      placeholder="Scope & technologies used description..."
                      value={newProjDesc}
                      onChange={(e) => setNewProjDesc(e.target.value)}
                      className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs w-full resize-none"
                      rows={2}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Link URL (optional)"
                        value={newProjLink}
                        onChange={(e) => setNewProjLink(e.target.value)}
                        className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs w-full"
                      />
                      <input
                        type="text"
                        placeholder="Technologies (comma separated e.g. React, Redis)"
                        value={newProjTech}
                        onChange={(e) => setNewProjTech(e.target.value)}
                        className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs w-full"
                      />
                    </div>
                    <button type="submit" className="self-end py-1.5 px-5 bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs rounded-xl border-0 cursor-pointer">
                      Save Project
                    </button>
                  </form>
                )}

                {/* List Projects */}
                <div className="flex flex-col gap-3">
                  {!portfolio?.projects || portfolio.projects.length === 0 ? (
                    <span className="text-2xs text-neutral-500 italic text-center py-4">No projects listed.</span>
                  ) : (
                    portfolio.projects.map((proj: any) => (
                      <div key={proj.id} className="p-4 bg-neutral-900/60 border border-white/5 rounded-xl flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-neutral-200">{proj.title}</span>
                            <span className="text-[9px] bg-cyan-500/10 text-cyan-400 font-bold px-2 py-0.5 rounded-full">{proj.role}</span>
                          </div>
                          <p className="text-xs text-neutral-400 leading-normal">{proj.description}</p>
                          {proj.link && (
                            <a href={proj.link} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline">
                              View Project Link
                            </a>
                          )}
                        </div>
                        {isOwnProfile && (
                          <button 
                            onClick={() => handleRemoveProject(proj.id)}
                            className="bg-transparent border-0 p-1 text-red-400 hover:text-red-500 cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* EXPERIENCES SECTION */}
              <div className="p-5 bg-neutral-900/40 border border-white/5 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Briefcase className="w-4.5 h-4.5" /> Professional Experience
                  </h3>
                  {isOwnProfile && (
                    <button 
                      onClick={() => setShowExpForm(!showExpForm)}
                      className="p-1 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 rounded-lg cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>

                {/* Add Experience Form */}
                {showExpForm && (
                  <form onSubmit={handleAddExperience} className="flex flex-col gap-3 bg-neutral-900 p-4 rounded-xl border border-white/5">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Job Title"
                        value={newExpTitle}
                        onChange={(e) => setNewExpTitle(e.target.value)}
                        className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs w-full"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Company Name"
                        value={newExpCompany}
                        onChange={(e) => setNewExpCompany(e.target.value)}
                        className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs w-full"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={newExpStart}
                        onChange={(e) => setNewExpStart(e.target.value)}
                        className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs w-full text-neutral-400"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Key achievements/responsibilities..."
                        value={newExpDesc}
                        onChange={(e) => setNewExpDesc(e.target.value)}
                        className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs w-full"
                      />
                    </div>
                    <button type="submit" className="self-end py-1.5 px-5 bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs rounded-xl border-0 cursor-pointer">
                      Save Experience
                    </button>
                  </form>
                )}

                {/* List Experience */}
                <div className="flex flex-col gap-3">
                  {!portfolio?.experiences || portfolio.experiences.length === 0 ? (
                    <span className="text-2xs text-neutral-500 italic text-center py-4">No experience listed.</span>
                  ) : (
                    portfolio.experiences.map((exp: any) => (
                      <div key={exp.id} className="p-4 bg-neutral-900/60 border border-white/5 rounded-xl flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold text-sm text-neutral-200">{exp.title} at {exp.company}</span>
                          <span className="text-[10px] text-neutral-500">
                            Started {new Date(exp.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                          </span>
                          {exp.description && <p className="text-xs text-neutral-450 mt-1">{exp.description}</p>}
                        </div>
                        {isOwnProfile && (
                          <button 
                            onClick={() => handleRemoveExperience(exp.id)}
                            className="bg-transparent border-0 p-1 text-red-400 hover:text-red-500 cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Saved bookmarks */}
          {activeTab === 'saved' && (
            savedPosts.length === 0 ? (
              <div className="text-center py-16 text-xs text-neutral-500 italic">
                Bookmarks collection is empty.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {savedPosts.map((post) => (
                  <div key={post.id} className="relative aspect-square rounded-[20px] overflow-hidden group hover:scale-[1.01] transition-all bg-neutral-900 border border-white/5">
                    {post.mediaUrls && post.mediaUrls.length > 0 ? (
                      <img src={post.mediaUrls[0]} alt="saved" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full p-4 flex items-center justify-center text-center text-xs bg-neutral-900 text-neutral-400 italic">
                        &ldquo;{post.content?.substring(0, 50)}...&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* Analytics graphs */}
          {activeTab === 'analytics' && analytics && (
            <div className="flex flex-col gap-6">
              
              {/* analytics totals cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-neutral-900/60 p-4 border border-white/5 rounded-2xl flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Profile Views</span>
                  <span className="font-extrabold text-xl font-outfit text-white">{analytics.totals.profileViews}</span>
                  <span className="text-[9px] text-green-500 font-bold">+{analytics.totals.growthRate}% Views growth</span>
                </div>

                <div className="bg-neutral-900/60 p-4 border border-white/5 rounded-2xl flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Reach</span>
                  <span className="font-extrabold text-xl font-outfit text-white">{analytics.totals.reach}</span>
                  <span className="text-[9px] text-neutral-500">Unique Users Reach</span>
                </div>

                <div className="bg-neutral-900/60 p-4 border border-white/5 rounded-2xl flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Impressions</span>
                  <span className="font-extrabold text-xl font-outfit text-white">{analytics.totals.impressions}</span>
                  <span className="text-[9px] text-neutral-500 font-medium">Post Feed views</span>
                </div>

                <div className="bg-neutral-900/60 p-4 border border-white/5 rounded-2xl flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Followers Growth</span>
                  <span className="font-extrabold text-xl font-outfit text-white">+{profileUser.stats.followersCount}</span>
                  <span className="text-[9px] text-cyan-400 font-bold">Steady growth rate</span>
                </div>

              </div>

              {/* simulated traffic chart */}
              <div className="bg-neutral-900/40 border border-white/5 p-5 rounded-2xl flex flex-col gap-3">
                <span className="font-bold text-xs text-neutral-400 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-cyan-500 animate-pulse" />
                  Weekly Traffic Insights chart
                </span>
                
                <div className="h-32 flex items-end justify-between gap-1.5 mt-2">
                  <div className="w-full bg-cyan-500/20 rounded-t h-[40%]" />
                  <div className="w-full bg-cyan-500/25 rounded-t h-[60%]" />
                  <div className="w-full bg-cyan-500/20 rounded-t h-[30%]" />
                  <div className="w-full bg-cyan-500/30 rounded-t h-[80%]" />
                  <div className="w-full bg-cyan-500 h-[95%]" />
                  <div className="w-full bg-cyan-500/25 rounded-t h-[50%]" />
                  <div className="w-full bg-cyan-500/20 rounded-t h-[70%]" />
                  <div className="w-full bg-cyan-500/30 rounded-t h-[45%]" />
                </div>
              </div>

            </div>
          )}
          {/* Highlight Stories Player Modal */}
          {activeHighlight && (
            <div className="fixed inset-0 bg-neutral-955/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="relative w-full max-w-[420px] aspect-[9/16] bg-neutral-900 rounded-[28px] overflow-hidden shadow-2xl flex flex-col">
                
                {/* Story Header */}
                <div className="absolute top-4 left-4 right-4 flex flex-col gap-3 z-10">
                  {/* Progress bars */}
                  <div className="flex gap-1.5">
                    {activeHighlight.stories.map((story: any, idx: number) => (
                      <div key={story.id} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-white transition-all duration-300 ${
                            idx < activeHighlightStoryIndex
                              ? 'w-full'
                              : idx === activeHighlightStoryIndex
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
                      {profileUser.profile?.avatarUrl ? (
                        <img
                          src={profileUser.profile.avatarUrl}
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover border border-white/20"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs">
                          {profileUser.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-xs font-bold">{profileUser.username}</span>
                          {activeHighlight.stories[activeHighlightStoryIndex]?.isCloseFriends && (
                            <span className="bg-green-500 text-neutral-950 text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 select-none shadow shadow-green-500/10">
                              ★ Close Friends
                            </span>
                          )}
                        </div>
                        {activeHighlight.stories[activeHighlightStoryIndex]?.songName && (
                          <span className="text-[9px] text-purple-300 flex items-center gap-1 font-semibold select-none">
                            <span className="animate-pulse">♪</span>
                            {activeHighlight.stories[activeHighlightStoryIndex].songName} &bull; {activeHighlight.stories[activeHighlightStoryIndex].songArtist}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mute/Unmute story audio */}
                      {activeHighlight.stories[activeHighlightStoryIndex]?.songUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHighlightMute();
                          }}
                          className="p-1 rounded-lg bg-black/40 text-white/80 hover:text-white border-0 outline-none cursor-pointer flex items-center justify-center transition-colors"
                          title={isHighlightMuted ? "Unmute" : "Mute"}
                        >
                          {isHighlightMuted ? (
                            <span className="text-red-400">🔇</span>
                          ) : (
                            <span className="text-purple-400">🔊</span>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const story = activeHighlight.stories[activeHighlightStoryIndex];
                          handleDownloadMedia(story.mediaUrl, `highlight-${story.id}.${story.type === 'VIDEO' ? 'mp4' : 'jpg'}`);
                        }}
                        className="p-1 rounded-lg bg-black/40 text-white hover:text-cyan-400 border-0 outline-none cursor-pointer flex items-center justify-center transition-colors"
                        title="Download Highlight Story"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHighlight(null);
                        }} 
                        className="p-1 rounded-lg bg-black/40 text-white/80 hover:text-white border-0 outline-none cursor-pointer flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
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
                      handlePrevHighlightStory();
                    } else {
                      handleNextHighlightStory();
                    }
                  }}
                  className="flex-1 w-full flex items-center justify-center relative bg-neutral-955 cursor-pointer select-none"
                >
                  {activeHighlight.stories[activeHighlightStoryIndex] ? (
                    activeHighlight.stories[activeHighlightStoryIndex].type === 'VIDEO' ? (
                      <video
                        src={activeHighlight.stories[activeHighlightStoryIndex].mediaUrl}
                        autoPlay
                        controls={false}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <img
                        src={activeHighlight.stories[activeHighlightStoryIndex].mediaUrl}
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
                      handlePrevHighlightStory();
                    }}
                    disabled={activeHighlightStoryIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 disabled:opacity-0 cursor-pointer border-0 z-20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextHighlightStory();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 cursor-pointer border-0 z-20"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create / Edit Highlight Modal */}
          {showHighlightModal && (
            <div className="fixed inset-0 bg-neutral-955/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 glass shadow-2xl text-white animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="font-bold text-sm">{editingHighlight ? 'Edit Story Highlight' : 'New Story Highlight'}</span>
                  <button 
                    onClick={() => { setShowHighlightModal(false); setEditingHighlight(null); }}
                    className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveHighlight} className="flex flex-col gap-4">
                  {/* Highlight Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Highlight Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Summer 2026"
                      maxLength={15}
                      value={highlightTitle}
                      onChange={(e) => setHighlightTitle(e.target.value)}
                      className="w-full bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:ring-0"
                      required
                    />
                  </div>

                  {/* Story Selector Grid */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Select Stories</label>
                    
                    {archiveStories.length === 0 ? (
                      <span className="text-center py-8 text-2xs text-neutral-500 italic bg-white/5 border border-white/5 rounded-2xl">
                        No past stories in archive to create highlights.
                      </span>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {archiveStories.map((story) => {
                          const isSelected = selectedArchiveStoryIds.includes(story.id);
                          return (
                            <div
                              key={story.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedArchiveStoryIds(prev => prev.filter(id => id !== story.id));
                                } else {
                                  setSelectedArchiveStoryIds(prev => [...prev, story.id]);
                                }
                              }}
                              className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                                isSelected ? 'border-cyan-500 scale-95' : 'border-transparent opacity-75 hover:opacity-100'
                              }`}
                            >
                              {story.type === 'VIDEO' ? (
                                <video src={story.mediaUrl} className="w-full h-full object-cover pointer-events-none" />
                              ) : (
                                <img src={story.mediaUrl} className="w-full h-full object-cover pointer-events-none" alt="story thumbnail" />
                              )}
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full border border-white flex items-center justify-center text-[9px] bg-black/60 font-bold select-none text-white animate-in fade-in">
                                {isSelected ? '✓' : ''}
                              </div>
                              {story.isCloseFriends && (
                                <div className="absolute bottom-1 left-1 bg-green-500 text-neutral-950 text-[7px] font-black px-1 rounded">
                                  CF
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmittingHighlight || !highlightTitle.trim() || selectedArchiveStoryIds.length === 0}
                    className="w-full mt-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 border-0 cursor-pointer"
                  >
                    {isSubmittingHighlight ? <Loader2 className="w-4 h-4 animate-spin" /> : editingHighlight ? 'Save Changes' : 'Create Highlight'}
                  </button>
                </form>
              </div>
            </div>
          )}
          {/* Close Friends Direct Manager Modal */}
          {showCloseFriendsModal && (
            <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-3xl p-6 flex flex-col gap-4 glass shadow-2xl text-white animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-green-500 fill-green-500" /> Manage Close Friends
                  </span>
                  <button 
                    onClick={() => { setShowCloseFriendsModal(false); setSearchCFQuery(''); }}
                    className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search people you follow..."
                    value={searchCFQuery}
                    onChange={(e) => setSearchCFQuery(e.target.value)}
                    className="w-full bg-white/5 border border-transparent focus:border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none text-white focus:ring-0"
                  />
                </div>

                {isCFModalLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                  </div>
                ) : filteredCFList.length === 0 ? (
                  <span className="text-center py-10 text-2xs text-neutral-500 italic">
                    {searchCFQuery ? 'No friends found matching search' : "You aren't following anyone yet."}
                  </span>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                    {filteredCFList.map((friend) => {
                      const isCF = closeFriendIds.includes(friend.id);
                      return (
                        <div key={friend.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-2.5">
                            {friend.profile?.avatarUrl ? (
                              <img src={friend.profile.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="avatar" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-white text-[10px] font-bold">
                                {friend.username[0].toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-2xs text-white font-bold flex items-center gap-0.5">
                                {friend.name || friend.username}
                                {friend.verified && <Award className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />}
                              </span>
                              <span className="text-[9px] text-neutral-500">@{friend.username}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleProfileCloseFriend(friend.id)}
                            className={`p-1.5 rounded-lg border-0 cursor-pointer flex items-center justify-center hover:scale-105 active-shrink transition-colors ${
                              isCF 
                                ? 'bg-green-500/20 text-green-500' 
                                : 'bg-white/5 text-neutral-500 hover:text-white'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${isCF ? 'fill-green-500' : ''}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setShowCloseFriendsModal(false); setSearchCFQuery(''); }}
                  className="w-full mt-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold text-xs py-2.5 rounded-xl border-0 cursor-pointer text-center active-shrink transition-all shadow"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
