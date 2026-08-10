'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Users, Plus, Check, Clock, Search,
  Globe, Video, ExternalLink, Sparkles, Filter, AlertCircle, X, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface EventItem {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  isOnline: boolean;
  meetingLink?: string;
  bannerUrl: string;
  community?: {
    id: string;
    name: string;
    category: string;
  };
  creator: {
    id: string;
    username: string;
    name: string;
    profile?: {
      avatarUrl?: string;
    };
  };
  attendeesCount: number;
  isRegistered: boolean;
  createdAt: string;
}

export default function EventsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'HACKATHON' | 'FEST' | 'WORKSHOP' | 'TECH_TALK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  // New Event Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    isOnline: false,
    meetingLink: '',
    bannerUrl: '',
    category: 'Hackathon',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch(`/events${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [searchQuery]);

  const handleRegisterToggle = async (eventId: string, isRegistered: boolean) => {
    if (!isAuthenticated) {
      window.location.href = '/auth';
      return;
    }

    try {
      setRegisteringEventId(eventId);
      const method = isRegistered ? 'DELETE' : 'POST';
      const res = await apiFetch(`/events/${eventId}/register`, { method });

      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id === eventId) {
              return {
                ...e,
                isRegistered: !isRegistered,
                attendeesCount: isRegistered ? e.attendeesCount - 1 : e.attendeesCount + 1,
              };
            }
            return e;
          })
        );
      }
    } catch (err) {
      console.error('Registration toggle error:', err);
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.eventDate || !formData.location) {
      setFormError('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const res = await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setFormData({
          title: '',
          description: '',
          eventDate: '',
          location: '',
          isOnline: false,
          meetingLink: '',
          bannerUrl: '',
          category: 'Hackathon',
        });
        fetchEvents();
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to create event');
      }
    } catch (err) {
      setFormError('Network error while creating event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filterType === 'ALL') return true;
    const combinedText = `${ev.title} ${ev.description}`.toLowerCase();
    if (filterType === 'HACKATHON') return combinedText.includes('hack') || combinedText.includes('code');
    if (filterType === 'FEST') return combinedText.includes('fest') || combinedText.includes('cultur');
    if (filterType === 'WORKSHOP') return combinedText.includes('workshop') || combinedText.includes('bootcamp');
    if (filterType === 'TECH_TALK') return combinedText.includes('talk') || combinedText.includes('webinar') || ev.isOnline;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-6 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-10 mb-10 overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-black/60 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Campus Event Hub
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              College Fests, Hackathons & Tech Talks
            </h1>
            <p className="mt-3 text-zinc-300 text-sm sm:text-base leading-relaxed">
              Discover verified technical hackathons, cultural festivals, workshops, and inter-college competitions across Indian universities.
            </p>
          </div>

          <button
            onClick={() => {
              if (!isAuthenticated) window.location.href = '/auth';
              else setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Host an Event
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {(['ALL', 'HACKATHON', 'FEST', 'WORKSHOP', 'TECH_TALK'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  filterType === type
                    ? 'bg-white text-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                }`}
              >
                {type === 'ALL' && 'All Events'}
                {type === 'HACKATHON' && '⚡ Hackathons'}
                {type === 'FEST' && '🎭 Campus Fests'}
                {type === 'WORKSHOP' && '🛠️ Workshops'}
                {type === 'TECH_TALK' && '🎙️ Tech Talks'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events, colleges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-96 rounded-2xl bg-zinc-900/60 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 rounded-3xl bg-zinc-900/30 border border-white/5">
          <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No events found</h3>
          <p className="text-zinc-400 text-sm mt-1">Try clearing your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const formattedDate = new Date(event.eventDate).toLocaleDateString('en-IN', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col rounded-2xl overflow-hidden bg-zinc-900/70 border border-white/10 hover:border-indigo-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 backdrop-blur-md"
              >
                {/* Event Banner */}
                <div className="relative h-48 w-full overflow-hidden bg-zinc-800">
                  <img
                    src={event.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800'}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {event.isOnline ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/80 backdrop-blur-md text-white text-xs font-semibold shadow-lg">
                        <Video className="w-3 h-3" /> Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/80 backdrop-blur-md text-white text-xs font-semibold shadow-lg">
                        <MapPin className="w-3 h-3" /> On Campus
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium mb-2">
                      <Clock className="w-3.5 h-3.5" />
                      {formattedDate}
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {event.title}
                    </h3>

                    <p className="mt-2 text-zinc-400 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs text-zinc-300">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  </div>

                  {/* Footer & Registration */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>{event.attendeesCount} Registered</span>
                    </div>

                    <button
                      onClick={() => handleRegisterToggle(event.id, event.isRegistered)}
                      disabled={registeringEventId === event.id}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                        event.isRegistered
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      }`}
                    >
                      {event.isRegistered ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Registered
                        </>
                      ) : (
                        'Register Now'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Host Event Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-white/10 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Host a Campus Event</h2>
                  <p className="text-xs text-zinc-400 mt-1">Publish to college students and tech clubs</p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HackGujarat 2026 / TechFest"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Outline the schedule, prize pool, eligibility..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Location / Campus *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Auditorium 2 / Online"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Banner Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.bannerUrl}
                    onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isOnline"
                    checked={formData.isOnline}
                    onChange={(e) => setFormData({ ...formData, isOnline: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isOnline" className="text-xs text-zinc-300 font-medium cursor-pointer">
                    This is an Online Event (Google Meet / Zoom)
                  </label>
                </div>

                {formData.isOnline && (
                  <div>
                    <input
                      type="url"
                      placeholder="Meeting link (https://meet.google.com/...)"
                      value={formData.meetingLink}
                      onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-sm font-semibold text-white shadow-lg"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
