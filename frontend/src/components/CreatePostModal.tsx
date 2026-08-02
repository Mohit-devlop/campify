'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiFetch } from '../lib/api';
import { X, Image as ImageIcon, Film, MapPin, Calendar, Sparkles, Loader2, Music, Play, Pause } from 'lucide-react';
import { PRESET_SONGS, Track } from '../lib/music';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'post' | 'reel' | 'story';
}

const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=800'
];

const PRESET_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
];

export default function CreatePostModal({ isOpen, onClose, defaultTab }: CreatePostModalProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'post' | 'reel' | 'story'>('post');
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCloseFriends, setIsCloseFriends] = useState(false);
  const [error, setError] = useState('');

  // Song selection states
  const [selectedSong, setSelectedSong] = useState<Track | null>(null);
  const [previewingSongId, setPreviewingSongId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Sync defaultTab when modal opens
  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (audioElement) {
      audioElement.pause();
    }
    setPreviewingSongId(null);
    setSelectedSong(null);
    setContent('');
    setMediaUrls([]);
    setLocation('');
    setScheduledFor('');
    setIsDraft(false);
    setIsCloseFriends(false);
    setError('');
    onClose();
  };

  const handleSelectPreset = (url: string) => {
    if (activeTab === 'reel' || activeTab === 'story') {
      setMediaUrls([url]);
    } else {
      if (mediaUrls.includes(url)) {
        setMediaUrls(mediaUrls.filter(u => u !== url));
      } else {
        setMediaUrls([...mediaUrls, url]);
      }
    }
  };

  const handleTogglePreviewSong = (song: Track, e: React.MouseEvent) => {
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
      
      // When audio finishes, reset state
      audio.onended = () => {
        setPreviewingSongId(null);
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError('');

    try {
      if (activeTab === 'post') {
        const payload = {
          content,
          mediaUrls,
          type: mediaUrls.length > 1 ? 'CAROUSEL' : mediaUrls.length === 1 ? 'IMAGE' : 'TEXT',
          location,
          isDraft,
          scheduledFor: scheduledFor || null,
          songName: selectedSong?.name || null,
          songArtist: selectedSong?.artist || null,
          songUrl: selectedSong?.url || null
        };
        const res = await apiFetch('/posts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          handleClose();
          window.location.reload();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to create post');
        }
      } else if (activeTab === 'story') {
        // Story upload
        const payload = {
          mediaUrl: mediaUrls[0] || PRESET_IMAGES[0],
          type: mediaUrls[0]?.includes('.mp4') || mediaUrls[0]?.includes('video') ? 'VIDEO' : 'IMAGE',
          songName: selectedSong?.name || null,
          songArtist: selectedSong?.artist || null,
          songUrl: selectedSong?.url || null,
          isCloseFriends
        };
        const res = await apiFetch('/stories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          handleClose();
          window.location.reload();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to create story');
        }
      } else {
        // Reel upload
        const payload = {
          videoUrl: mediaUrls[0] || PRESET_VIDEOS[0],
          caption: content
        };
        const res = await apiFetch('/reels', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          handleClose();
          window.location.reload();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to create reel');
        }
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl glass animate-in fade-in zoom-in duration-250">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('post'); setMediaUrls([]); }}
              className={`pb-1 font-bold text-sm transition-all bg-transparent border-0 cursor-pointer ${
                activeTab === 'post' 
                  ? 'text-black dark:text-white border-b-2 border-purple-500' 
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              Post
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('story'); setMediaUrls([]); }}
              className={`pb-1 font-bold text-sm transition-all bg-transparent border-0 cursor-pointer ${
                activeTab === 'story' 
                  ? 'text-black dark:text-white border-b-2 border-purple-500' 
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              Story
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('reel'); setMediaUrls([]); }}
              className={`pb-1 font-bold text-sm transition-all bg-transparent border-0 cursor-pointer ${
                activeTab === 'reel' 
                  ? 'text-black dark:text-white border-b-2 border-purple-500' 
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              Reel
            </button>
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white bg-transparent border-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {error && (
            <div className="bg-red-500/10 text-red-500 text-xs p-3.5 rounded-xl border border-red-500/20 font-medium">
              {error}
            </div>
          )}

          {/* User Display */}
          <div className="flex items-center gap-3">
            {user?.profile?.avatarUrl ? (
              <img src={user.profile.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xs">
                {user?.username[0].toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-sm">{user?.username}</span>
          </div>

          {/* Content Inputs (Only for Post and Reel) */}
          {activeTab !== 'story' && (
            <textarea
              placeholder={activeTab === 'post' ? "Write your post caption..." : "Write your reel caption..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[90px] outline-none border-0 bg-transparent text-sm resize-none focus:ring-0 placeholder:text-neutral-400"
            />
          )}

          {/* File Upload Selector */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs text-neutral-400 font-medium">
              Upload from your device:
            </span>
            <div className="flex gap-3 items-center">
              <input
                type="file"
                accept={activeTab === 'reel' ? "video/*" : activeTab === 'story' ? "image/*,video/*" : "image/*"}
                id="modal-file-upload"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setIsUploading(true);
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
                        if (activeTab === 'reel' || activeTab === 'story') {
                          setMediaUrls([url]);
                        } else {
                          setMediaUrls(prev => [...prev, url]);
                        }
                      } else {
                        const err = await uploadRes.json();
                        setError(err.error || 'Failed to upload file');
                      }
                      setIsUploading(false);
                    };
                    reader.readAsDataURL(file);
                  } catch (err) {
                    console.error(err);
                    setError('Error uploading file');
                    setIsUploading(false);
                  }
                }}
              />
              <label
                htmlFor="modal-file-upload"
                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl cursor-pointer text-xs font-bold transition-all text-neutral-800 dark:text-neutral-200 select-none border border-neutral-200 dark:border-neutral-700"
              >
                <ImageIcon className="w-4 h-4 text-purple-500" />
                Select {activeTab === 'post' ? 'Image' : activeTab === 'reel' ? 'Video' : 'Media'}
              </label>

              {mediaUrls.length > 0 && (
                <span className="text-[11px] text-green-500 font-semibold">
                  {mediaUrls.length} file(s) selected
                </span>
              )}
            </div>

            {mediaUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="relative w-14 h-14 rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700 flex-shrink-0 group">
                    {activeTab === 'reel' || url.includes('.mp4') ? (
                      <video src={url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={url} alt="upload preview" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setMediaUrls(prev => prev.filter((_, idx) => idx !== index))}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity border-0 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preset Picker */}
          {activeTab !== 'reel' && (
            <div>
              <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                Testing Presets (Choose media instantly):
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1.5">
                {PRESET_IMAGES.map((url, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleSelectPreset(url)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all bg-transparent ${
                      mediaUrls.includes(url) ? 'border-purple-500 scale-95' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reel' && (
            <div>
              <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                Testing Presets (Choose media instantly):
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1.5">
                {PRESET_VIDEOS.map((url, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleSelectPreset(url)}
                    className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all bg-neutral-800 flex items-center justify-center ${
                      mediaUrls.includes(url) ? 'border-purple-500 scale-95' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <Film className="w-6 h-6 text-white/70" />
                    <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 px-1 rounded text-white font-bold">Preset {i+1}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Music Picker (Only for Post and Story tabs) */}
          {(activeTab === 'post' || activeTab === 'story') && (
            <div className="flex flex-col gap-2 bg-neutral-100/50 dark:bg-neutral-800/30 p-4 rounded-2xl border border-neutral-200/40 dark:border-neutral-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-purple-500" />
                  Background Music
                </span>
                {selectedSong && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSong(null);
                      if (audioElement) {
                        audioElement.pause();
                        setPreviewingSongId(null);
                      }
                    }}
                    className="text-[10px] text-red-500 hover:text-red-400 font-bold border-0 bg-transparent cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>

              {selectedSong ? (
                <div className="flex items-center gap-3 bg-white dark:bg-neutral-950 p-2.5 rounded-xl border border-neutral-200/50 dark:border-neutral-800/80 shadow-sm mt-1.5">
                  <img src={selectedSong.coverUrl} className="w-9 h-9 rounded-lg object-cover" alt="cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-neutral-800 dark:text-neutral-100">{selectedSong.name}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{selectedSong.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleTogglePreviewSong(selectedSong, e)}
                    className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 border-0 bg-transparent text-neutral-600 dark:text-neutral-300 cursor-pointer flex items-center justify-center"
                  >
                    {previewingSongId === selectedSong.id ? (
                      <Pause className="w-4 h-4 text-purple-500" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {PRESET_SONGS.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => setSelectedSong(song)}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 cursor-pointer transition-colors min-w-0 group"
                    >
                      <img src={song.coverUrl} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate text-neutral-800 dark:text-neutral-200 group-hover:text-purple-500 transition-colors">{song.name}</p>
                        <p className="text-[9px] text-neutral-400 dark:text-neutral-500 truncate">{song.artist}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleTogglePreviewSong(song, e)}
                        className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 border-0 bg-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer flex-shrink-0 flex items-center justify-center"
                      >
                        {previewingSongId === song.id ? (
                          <Pause className="w-3.5 h-3.5 text-purple-500" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'story' && (
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Story Privacy</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloseFriends(false)}
                  className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    !isCloseFriends
                      ? 'bg-purple-500/10 border-purple-500 text-purple-500'
                      : 'bg-white/5 border-transparent text-neutral-405 hover:text-neutral-200'
                  }`}
                >
                  Share with Everyone
                </button>
                <button
                  type="button"
                  onClick={() => setIsCloseFriends(true)}
                  className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    isCloseFriends
                      ? 'bg-green-500/10 border-green-500 text-green-500 shadow-md shadow-green-500/5'
                      : 'bg-white/5 border-transparent text-neutral-405 hover:text-neutral-200'
                  }`}
                >
                  <span className="text-green-500 font-extrabold text-xs">★</span> Close Friends Only
                </button>
              </div>
            </div>
          )}

          {/* Additional details for standard Post */}
          {activeTab === 'post' && (
            <div className="flex flex-col gap-3">
              {/* Location */}
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl border border-transparent focus-within:border-neutral-200 dark:focus-within:border-neutral-700">
                <MapPin className="w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Add Geolocation"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs w-full focus:ring-0 placeholder:text-neutral-400"
                />
              </div>

              {/* Schedule */}
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl border border-transparent focus-within:border-neutral-200 dark:focus-within:border-neutral-700">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs w-full focus:ring-0 text-neutral-500"
                />
              </div>

              {/* Draft toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={isDraft}
                  onChange={(e) => setIsDraft(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-purple-600 focus:ring-purple-500/20"
                />
                <span className="text-xs text-neutral-500">Save as Draft (hidden from feeds)</span>
              </label>
            </div>
          )}

          {/* Footer Submit */}
          <button
            type="submit"
            disabled={isUploading}
            className="w-full mt-2 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-sm py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active-shrink hover-scale disabled:opacity-50 border-0 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {activeTab === 'post' ? 'Share Post' : activeTab === 'story' ? 'Share Story' : 'Share Reel'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
