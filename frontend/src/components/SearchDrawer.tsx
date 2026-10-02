'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../lib/api';
import { Search, X, Loader2, Award } from 'lucide-react';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchDrawer({ isOpen, onClose }: SearchDrawerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await apiFetch(`/users/search?query=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <div
      className={`fixed top-0 left-0 h-screen w-80 bg-brand-card/95 backdrop-blur-xl border-r border-brand-cyan/20 z-40 p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 ease-in-out text-brand-text ${
        isOpen ? 'translate-x-0 md:translate-x-64' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-outfit text-brand-text">Search</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-brand-bg border border-transparent hover:border-brand-cyan/20 text-neutral-400 hover:text-brand-orange dark:hover:text-brand-cyan cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search creators by handle or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-bg/60 border border-brand-cyan/20 focus:border-brand-cyan outline-none text-sm transition-all text-brand-text placeholder:text-neutral-500"
        />
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3">
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="flex flex-col gap-1">
            {results.map((creator) => (
              <Link
                key={creator.id}
                href={`/${creator.username}`}
                onClick={onClose}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-bg/80 border border-transparent hover:border-brand-cyan/20 transition-all no-underline text-brand-text group"
              >
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.username}
                    className="w-10 h-10 rounded-full object-cover border border-brand-cyan/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-orange to-brand-cyan flex items-center justify-center text-black font-bold text-sm">
                    {creator.username[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="font-bold text-sm flex items-center gap-1 text-brand-text group-hover:text-brand-orange dark:group-hover:text-brand-cyan transition-colors truncate">
                    {creator.username}
                    {creator.verified && (
                      <span title="Completed Learning Targets (Gold Medal)">
                        <Award className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-400 truncate font-medium">
                    {creator.name ? `${creator.name} (@${creator.username})` : `@${creator.username}`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && query && results.length === 0 && (
          <div className="text-center text-sm text-neutral-400 py-8">
            No accounts found matching &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  );
}