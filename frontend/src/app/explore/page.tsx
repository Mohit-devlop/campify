'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { Heart, MessageCircle, Sparkles, Hash, Compass, Search, Loader2, Download } from 'lucide-react';

export default function ExploreFeed() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const trendingTags = [
    { tag: 'design', posts: 1420 },
    { tag: 'workspace', posts: 890 },
    { tag: 'apple', posts: 2450 },
    { tag: 'travel', posts: 1180 },
    { tag: 'glassmorphism', posts: 640 },
  ];

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isInitialized, router]);

  useEffect(() => {
    async function loadExploreData() {
      try {
        const res = await apiFetch('/posts/feed?filter=trending&limit=20');
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
        }
      } catch (err) {
        console.error('Failed to load explore feed:', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (isAuthenticated) loadExploreData();
  }, [isAuthenticated]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      {/* Header Search & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-outfit tracking-tight">Explore</h1>
            <p className="text-neutral-500 text-xs font-medium">Discover trending content and popular creators.</p>
          </div>
        </div>

        {/* Global Search shortcut */}
        <div className="relative w-full md:w-80">
          <Search className="w-4.5 h-4.5 text-neutral-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:border-neutral-300 dark:focus:border-neutral-700 outline-none text-xs transition-all"
          />
        </div>
      </div>

      {/* Grid Layout (Left: Masonry, Right: Trending Hashtags) */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Explore Masonry Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-10 text-center flex flex-col items-center gap-3 glass">
              <Sparkles className="w-10 h-10 text-purple-500 animate-bounce" />
              <h3 className="font-bold text-lg">No content found</h3>
              <p className="text-neutral-500 text-sm max-w-sm">
                Check back soon! Popular posts and trending imagery will populate here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/${post.user.username}`}
                  className="relative aspect-square rounded-2xl overflow-hidden group hover:scale-[1.01] hover:shadow-lg transition-all duration-300 bg-neutral-100 dark:bg-neutral-900"
                >
                  {post.mediaUrls.length > 0 ? (
                    <img
                      src={post.mediaUrls[0]}
                      alt="explore item"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full p-4 flex items-center justify-center bg-gradient-to-tr from-pink-500/10 via-purple-500/10 to-indigo-500/10 text-neutral-800 dark:text-neutral-200 text-xs font-semibold text-center italic">
                      &ldquo;{post.content?.substring(0, 80)}...&rdquo;
                    </div>
                  )}

                  {/* Hover Actions Panel */}
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6 text-white font-bold text-sm">
                    <span className="flex items-center gap-1.5 filter drop-shadow-md">
                      <Heart className="w-5 h-5 fill-current" />
                      {post.likesCount}
                    </span>
                    <span className="flex items-center gap-1.5 filter drop-shadow-md">
                      <MessageCircle className="w-5 h-5" />
                      {post.commentsCount}
                    </span>
                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownloadMedia(post.mediaUrls[0], `post-${post.id}.jpg`);
                        }}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white hover:text-cyan-400 cursor-pointer border-0 flex items-center justify-center transition-colors shadow"
                        title="Download Post"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Hot Topics widget */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 rounded-3xl p-5 glass flex flex-col gap-4">
            <h3 className="font-bold text-sm font-outfit text-neutral-500 flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-purple-600" />
              Hot Trending Topics
            </h3>

            <div className="flex flex-col gap-3.5">
              {trendingTags.map((tagObj, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs hover:underline cursor-pointer">
                      #{tagObj.tag}
                    </span>
                    <span className="text-[10px] text-neutral-500">{tagObj.posts} posts</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-neutral-300 dark:text-neutral-700">
                    #{(idx + 1).toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
