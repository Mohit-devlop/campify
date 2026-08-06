'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Volume2, VolumeX, Sparkles, Loader2, PlayCircle, Award, X, Download } from 'lucide-react';

export default function ReelsFeed() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  
  const [reels, setReels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  
  // Comments drawer states
  const [activeCommentsReel, setActiveCommentsReel] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (!activeCommentsReel) {
      setComments([]);
      return;
    }

    async function fetchComments() {
      setIsCommentsLoading(true);
      try {
        const res = await apiFetch(`/reels/comment/${activeCommentsReel.id}`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch (err) {
        console.error('Failed to load reel comments:', err);
      } finally {
        setIsCommentsLoading(false);
      }
    }

    fetchComments();
  }, [activeCommentsReel]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeCommentsReel) return;
    setIsSubmittingComment(true);

    try {
      const res = await apiFetch(`/reels/comment/${activeCommentsReel.id}`, {
        method: 'POST',
        body: JSON.stringify({ content: newCommentText }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setNewCommentText('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isInitialized, router]);

  useEffect(() => {
    async function loadReels() {
      try {
        const res = await apiFetch('/reels?limit=10');
        if (res.ok) {
          const data = await res.json();
          setReels(data.reels || []);
        }
      } catch (err) {
        console.error('Failed to load reels:', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (isAuthenticated) loadReels();
  }, [isAuthenticated]);

  const handleLikeReel = async (reelId: string, isLiked: boolean) => {
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const endpoint = isLiked ? `/reels/unlike/${reelId}` : `/reels/like/${reelId}`;
      const res = await apiFetch(endpoint, { method });

      if (res.ok) {
        setReels((prev) =>
          prev.map((r) =>
            r.id === reelId
              ? {
                  ...r,
                  isLiked: !isLiked,
                  likesCount: isLiked ? r.likesCount - 1 : r.likesCount + 1,
                }
              : r
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex justify-center items-center bg-black">
        <Loader2 className="w-8 h-8 text-brand-cyan animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col justify-center items-center bg-neutral-950 text-white gap-4">
        <Sparkles className="w-10 h-10 text-brand-cyan animate-pulse" />
        <h2 className="font-bold text-xl font-outfit text-white">No Reels Available</h2>
        <p className="text-neutral-400 text-sm">Be the first to upload a video reel!</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black flex justify-center overflow-hidden relative select-none">
      {/* Sound Toggle Overlay */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="fixed top-6 right-6 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border-0 outline-none hover-scale active-shrink cursor-pointer"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Reels Fullscreen Container */}
      <div className="w-full max-w-[420px] h-screen reels-container no-scrollbar">
        {reels.map((reel) => (
          <ReelItem
            key={reel.id}
            reel={reel}
            isMuted={isMuted}
            onLikeToggle={handleLikeReel}
            onOpenComments={(r) => setActiveCommentsReel(r)}
          />
        ))}
      </div>

      {/* Reels Comments Drawer Overlay */}
      {activeCommentsReel && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 flex items-end justify-center backdrop-blur-xs"
          onClick={() => setActiveCommentsReel(null)}
        >
          {/* Slide up content container */}
          <div 
            className="w-full max-w-[420px] bg-neutral-950 border-t border-white/10 rounded-t-3xl p-5 flex flex-col h-[65vh] shadow-2xl animate-in slide-in-from-bottom duration-300 z-50 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3 flex-shrink-0">
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-sm font-outfit">Comments</span>
                <span className="text-[10px] text-neutral-400">on @{activeCommentsReel.user.username}&apos;s reel</span>
              </div>
              <button 
                onClick={() => setActiveCommentsReel(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 no-scrollbar">
              {isCommentsLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-xs text-neutral-500 py-16 italic">
                  No comments yet. Start the conversation!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 text-left">
                    {comment.user.profile?.avatarUrl ? (
                       <img 
                         src={comment.user.profile.avatarUrl} 
                         alt="avatar" 
                         className="w-8 h-8 rounded-lg object-cover border border-white/10 flex-shrink-0"
                       />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-brand-orange text-black font-black text-xs flex-shrink-0 flex items-center justify-center">
                        {comment.user.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 max-w-[85%]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white hover:underline cursor-pointer">
                          {comment.user.username}
                        </span>
                        {comment.user.verified && (
                          <Award className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        )}
                        <span className="text-[9px] text-neutral-500">
                          {new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-200 leading-relaxed font-medium whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handlePostComment} className="border-t border-white/5 pt-3.5 flex gap-2 flex-shrink-0">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={isSubmittingComment}
                className="flex-1 bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-transparent focus:border-white/10 outline-none text-xs rounded-xl py-2.5 px-3.5 text-white transition-all"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newCommentText.trim()}
                className="bg-brand-cyan hover:bg-brand-cyan/85 text-black text-xs font-bold px-4 rounded-xl active-shrink cursor-pointer border-0 flex items-center justify-center disabled:opacity-50 hover:shadow-md hover:shadow-brand-cyan/15"
              >
                {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Reel Single Video Component
function ReelItem({ reel, isMuted, onLikeToggle, onOpenComments }: { reel: any; isMuted: boolean; onLikeToggle: (id: string, liked: boolean) => void; onOpenComments: (reel: any) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(() => {});
              setIsPlaying(true);
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="relative w-full reel-card bg-neutral-950 overflow-hidden flex items-center justify-center border-b border-white/5">
      {/* Background video element */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        loop
        muted={isMuted}
        playsInline
        onClick={handleVideoClick}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Play status overlay */}
      {!isPlaying && (
        <div 
          onClick={handleVideoClick}
          className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 cursor-pointer"
        >
          <PlayCircle className="w-16 h-16 text-white/50 animate-ping duration-1000" />
        </div>
      )}

      {/* Translucent bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/45 to-transparent pointer-events-none z-10" />

      {/* Right Action Icons Overlay */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-6 z-20 text-white items-center">
        {/* Like Button */}
        <button
          onClick={() => onLikeToggle(reel.id, reel.isLiked)}
          className={`flex flex-col items-center gap-1 bg-transparent border-0 outline-none cursor-pointer hover-scale active-shrink ${
            reel.isLiked ? 'text-red-500' : 'text-white'
          }`}
        >
          <Heart className={`w-7 h-7 filter drop-shadow-md ${reel.isLiked ? 'fill-current' : ''}`} />
          <span className="text-2xs font-extrabold">{reel.likesCount}</span>
        </button>

        {/* Comment Button */}
        <button 
          onClick={() => onOpenComments(reel)}
          className="flex flex-col items-center gap-1 bg-transparent border-0 outline-none text-white cursor-pointer hover-scale active-shrink"
        >
          <MessageCircle className="w-7 h-7 filter drop-shadow-md" />
          <span className="text-2xs font-extrabold">Comments</span>
        </button>

        {/* Share Button */}
        <button 
          onClick={() => alert('Post link copied!')}
          className="flex flex-col items-center gap-1 bg-transparent border-0 outline-none text-white cursor-pointer hover-scale active-shrink"
        >
          <Send className="w-7 h-7 filter drop-shadow-md" />
          <span className="text-2xs font-extrabold">Share</span>
        </button>

        {/* Download Button */}
        <button 
          onClick={() => handleDownloadMedia(reel.videoUrl, `reel-${reel.id}.mp4`)}
          className="flex flex-col items-center gap-1 bg-transparent border-0 outline-none text-white cursor-pointer hover-scale active-shrink"
          title="Download Reel"
        >
          <Download className="w-7 h-7 filter drop-shadow-md" />
          <span className="text-2xs font-extrabold">Download</span>
        </button>
      </div>

      {/* Bottom Creator Details & Caption Overlay */}
      <div className="absolute bottom-6 left-4 right-16 flex flex-col gap-2.5 z-20 text-white select-none">
        <Link href={`/${reel.user.username}`} className="flex items-center gap-3 no-underline">
          {reel.user.profile?.avatarUrl ? (
            <img
              src={reel.user.profile.avatarUrl}
              alt="avatar"
              className="w-9 h-9 rounded-xl object-cover border border-white/20 shadow-md"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-brand-orange text-black font-black text-xs flex items-center justify-center">
              {reel.user.username[0].toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-xs flex items-center gap-1 filter drop-shadow-md hover:underline">
              {reel.user.username}
              {reel.user.verified && (
                <span title="Completed Learning Targets (Gold Medal)">
                  <Award className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
                </span>
              )}
            </span>
          </div>
        </Link>

        {/* Caption */}
        {reel.caption && (
          <p className="text-xs font-semibold leading-relaxed max-w-[90%] filter drop-shadow-md">
            {reel.caption}
          </p>
        )}
      </div>
    </div>
  );
}
