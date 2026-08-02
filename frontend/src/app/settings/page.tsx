'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { Sparkles, User, FileText, Globe, MapPin, Lock, Loader2, ArrowLeft, Camera, Star, Search, Award } from 'lucide-react';
import Link from 'next/link';

export default function Settings() {
  const router = useRouter();
  const { user, updateUser, isAuthenticated, isInitialized } = useAuthStore();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Close Friends states
  const [following, setFollowing] = useState<any[]>([]);
  const [closeFriendIds, setCloseFriendIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCloseFriends, setShowCloseFriends] = useState(false);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setBio(user.profile?.bio || '');
      setWebsite(user.profile?.website || '');
      setLocation(user.profile?.location || '');
      setAvatarUrl(user.profile?.avatarUrl || '');
      setCoverUrl(user.profile?.coverUrl || '');
      setIsPrivate(user.profile?.isPrivate || false);
    }
  }, [user, isAuthenticated, isInitialized, router]);

  // Fetch following and close friends when expanding the section
  useEffect(() => {
    if (showCloseFriends && user && following.length === 0) {
      loadFriendsData();
    }
  }, [showCloseFriends, user]);

  async function loadFriendsData() {
    if (!user) return;
    setIsFriendsLoading(true);
    try {
      const [followingRes, closeFriendsRes] = await Promise.all([
        apiFetch(`/users/following/${user.id}`),
        apiFetch('/users/close-friends'),
      ]);

      if (followingRes.ok && closeFriendsRes.ok) {
        const followingData = await followingRes.json();
        const closeFriendsData = await closeFriendsRes.json();
        setFollowing(followingData || []);
        setCloseFriendIds(closeFriendsData.map((f: any) => f.id) || []);
      }
    } catch (err) {
      console.error('Failed to load friends list:', err);
    } finally {
      setIsFriendsLoading(false);
    }
  }

  const handleToggleCloseFriend = async (friendId: string) => {
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

  const filteredFollowing = following.filter(
    (f) =>
      f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.name && f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          username,
          bio,
          website,
          location,
          avatarUrl,
          coverUrl,
          isPrivate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local Zustand user state
        updateUser(data.user);
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${data.user.username}`);
        }, 1000);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to update profile settings.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-900 pb-4">
        <Link href={`/${user.username}`}>
          <button className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 rounded-xl active-shrink border-0 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-extrabold font-outfit tracking-tight">Edit Profile</h1>
          <p className="text-neutral-500 text-[11px] font-medium">Configure display properties and account credentials.</p>
        </div>
      </div>

      {/* Notices */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3.5 rounded-xl font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs p-3.5 rounded-xl font-semibold">
          Profile updated successfully! Redirecting...
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Display Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-neutral-300 dark:focus:border-neutral-700"
            />
          </div>
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Username</label>
          <div className="relative">
            <span className="text-neutral-400 absolute left-3.5 top-2.5 text-sm font-semibold select-none">@</span>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-neutral-300 dark:focus:border-neutral-700"
            />
          </div>
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Biography</label>
          <div className="relative">
            <FileText className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <textarea
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full min-h-[90px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-neutral-300 dark:focus:border-neutral-700 resize-none"
            />
          </div>
        </div>

        {/* Website */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Website URL</label>
          <div className="relative">
            <Globe className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-neutral-300 dark:focus:border-neutral-700"
            />
          </div>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Location</label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="San Francisco, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-neutral-300 dark:focus:border-neutral-700"
            />
          </div>
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Profile Photo (Avatar)</label>
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400 font-bold text-lg bg-cyan-500 text-white">
                  {user.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                id="avatar-upload"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsLoading(true);
                  setError('');
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
                        setAvatarUrl(url);
                      } else {
                        const err = await uploadRes.json();
                        setError(err.error || 'Failed to upload avatar image');
                      }
                      setIsLoading(false);
                    };
                    reader.readAsDataURL(file);
                  } catch (err) {
                    console.error(err);
                    setError('Error uploading avatar');
                    setIsLoading(false);
                  }
                }}
              />
              <label
                htmlFor="avatar-upload"
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-100 rounded-xl cursor-pointer text-xs font-bold transition-all border border-neutral-200 dark:border-neutral-700 inline-flex items-center gap-2 select-none"
              >
                <Camera className="w-4 h-4 text-purple-500" />
                Upload New Photo
              </label>
              <span className="text-[9px] text-neutral-505">Supports JPG, PNG, GIF up to 10MB</span>
            </div>
          </div>
        </div>

        {/* Cover Image Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Cover Image</label>
          <div className="flex flex-col gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
            {coverUrl && (
              <div className="relative h-28 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                id="cover-upload"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsLoading(true);
                  setError('');
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
                        setCoverUrl(url);
                      } else {
                        const err = await uploadRes.json();
                        setError(err.error || 'Failed to upload cover image');
                      }
                      setIsLoading(false);
                    };
                    reader.readAsDataURL(file);
                  } catch (err) {
                    console.error(err);
                    setError('Error uploading cover image');
                    setIsLoading(false);
                  }
                }}
              />
              <label
                htmlFor="cover-upload"
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-100 rounded-xl cursor-pointer text-xs font-bold transition-all border border-neutral-200 dark:border-neutral-700 inline-flex items-center gap-2 select-none"
              >
                <Camera className="w-4 h-4 text-purple-500" />
                Upload Cover Photo
              </label>
              <span className="text-[9px] text-neutral-505">Supports banner format images</span>
            </div>
          </div>
        </div>

        {/* Account Privacy */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none py-1.5 px-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <Lock className="w-4 h-4 text-neutral-400 ml-2.5" />
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="rounded border-neutral-300 dark:border-neutral-700 text-purple-600 focus:ring-purple-500/20"
          />
          <span className="text-xs text-neutral-500 font-semibold">Make account Private (Follow requests required)</span>
        </label>

        {/* Close Friends Management section */}
        <div className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCloseFriends(!showCloseFriends)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-transparent border-0 text-left cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-green-500 fill-green-500" />
              <span className="text-xs text-neutral-800 dark:text-neutral-100 font-bold">Manage Close Friends List</span>
            </div>
            <span className="text-[10px] bg-green-500/10 text-green-500 font-bold px-2 py-0.5 rounded-full select-none">
              {closeFriendIds.length} friends
            </span>
          </button>

          {showCloseFriends && (
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-3 max-h-[300px] overflow-y-auto">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search people you follow..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-transparent focus:border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none text-white"
                />
              </div>

              {isFriendsLoading ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                </div>
              ) : filteredFollowing.length === 0 ? (
                <span className="text-center py-6 text-2xs text-neutral-500 italic">
                  {searchQuery ? 'No friends found matching search' : "You aren't following anyone yet."}
                </span>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredFollowing.map((friend) => {
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
                          onClick={() => handleToggleCloseFriend(friend.id)}
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
            </div>
          )}
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active-shrink hover-scale disabled:opacity-50 border-0 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Settings...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}
