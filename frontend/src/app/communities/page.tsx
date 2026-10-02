'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Calendar, BarChart2, MessageSquare, Compass, 
  Check, ArrowRight, Loader2, Globe, Search, Sparkles, MessageCircle, Send, AlertCircle
} from 'lucide-react';

export default function CommunitiesPage() {
  const { user } = useAuthStore();
  const [communities, setCommunities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCommunity, setActiveCommunity] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'polls' | 'chat'>('feed');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Community creation form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIsPrivate, setNewIsPrivate] = useState(false);

  // Community interaction states
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLoc, setNewEventLoc] = useState('');
  
  const [newPollQ, setNewPollQ] = useState('');
  const [newPollOptA, setNewPollOptA] = useState('');
  const [newPollOptB, setNewPollOptB] = useState('');

  // Chat message states
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');

  // Load all communities
  useEffect(() => {
    loadCommunities(true);
  }, [searchQuery]);

  async function loadCommunities(autoSelectFirst = false) {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/communities?search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setCommunities(data);
        if (autoSelectFirst && data.length > 0 && !activeCommunity) {
          loadCommunityDetails(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch communities:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCommunityDetails(communityId: string) {
    try {
      const res = await apiFetch(`/communities/${communityId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveCommunity(data);
        setActiveTab('feed');
        // Reset chat messages with mock details for the community
        setChatMessages([
          { id: '1', sender: 'system', content: `Welcome to the ${data.name} Community Chat!`, time: 'System' },
          { id: '2', sender: 'alex_dev', content: 'Hey everyone, excited to be here! Anyone working on Next.js 15?', time: '2h ago' },
          { id: '3', sender: 'sara_design', content: 'Yes! Working on a sleek glassmorphic dashboard design system.', time: '1h ago' }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch community details:', err);
    }
  }

  const handleJoinLeave = async (comm: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const nextIsJoined = !comm.isJoined;
    const nextCount = nextIsJoined ? comm.membersCount + 1 : Math.max(0, comm.membersCount - 1);

    // Optimistically update list
    setCommunities((prev) =>
      prev.map((c) => (c.id === comm.id ? { ...c, isJoined: nextIsJoined, membersCount: nextCount } : c))
    );

    // Optimistically update active community if selected
    if (activeCommunity?.id === comm.id) {
      setActiveCommunity((prev: any) =>
        prev
          ? {
              ...prev,
              isJoined: nextIsJoined,
              _count: { ...prev._count, members: nextCount },
            }
          : prev
      );
    } else {
      // Auto-select when joining a non-selected community
      loadCommunityDetails(comm.id);
    }

    try {
      const method = comm.isJoined ? 'DELETE' : 'POST';
      const endpoint = comm.isJoined ? `/communities/leave/${comm.id}` : `/communities/join/${comm.id}`;
      const res = await apiFetch(endpoint, { method });

      if (res.ok) {
        await loadCommunities(false);
        loadCommunityDetails(comm.id);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to update community membership');
        await loadCommunities(false);
      }
    } catch (err) {
      console.error('Join/Leave error:', err);
      await loadCommunities(false);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesc.trim()) return;

    try {
      setIsSubmittingCreate(true);
      setCreateError('');
      const res = await apiFetch('/communities', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          isPrivate: newIsPrivate
        })
      });

      if (res.ok) {
        const data = await res.json();
        setNewName('');
        setNewDesc('');
        setIsCreating(false);
        await loadCommunities(false);
        await loadCommunityDetails(data.id);
      } else {
        const errData = await res.json();
        setCreateError(errData.error || 'Failed to create community');
      }
    } catch (err) {
      console.error('Create community error:', err);
      setCreateError('Error creating community. Please try again.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate || !newEventLoc.trim() || !activeCommunity) return;

    try {
      const res = await apiFetch(`/communities/${activeCommunity.id}/events`, {
        method: 'POST',
        body: JSON.stringify({
          title: newEventTitle,
          description: newEventDesc,
          date: newEventDate,
          location: newEventLoc
        })
      });

      if (res.ok) {
        setNewEventTitle('');
        setNewEventDesc('');
        setNewEventDate('');
        setNewEventLoc('');
        await loadCommunityDetails(activeCommunity.id);
      }
    } catch (err) {
      console.error('Create event error:', err);
    }
  };

  const handleAttendEvent = async (eventId: string, status: string) => {
    try {
      const res = await apiFetch(`/communities/events/${eventId}/attend`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      if (res.ok && activeCommunity) {
        await loadCommunityDetails(activeCommunity.id);
      }
    } catch (err) {
      console.error('Attend event error:', err);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollQ.trim() || !newPollOptA.trim() || !newPollOptB.trim() || !activeCommunity) return;

    try {
      const res = await apiFetch(`/communities/${activeCommunity.id}/polls`, {
        method: 'POST',
        body: JSON.stringify({
          question: newPollQ,
          options: [newPollOptA, newPollOptB]
        })
      });

      if (res.ok) {
        setNewPollQ('');
        setNewPollOptA('');
        setNewPollOptB('');
        await loadCommunityDetails(activeCommunity.id);
      }
    } catch (err) {
      console.error('Create poll error:', err);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    try {
      const res = await apiFetch(`/communities/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionId })
      });
      if (res.ok && activeCommunity) {
        await loadCommunityDetails(activeCommunity.id);
      }
    } catch (err) {
      console.error('Vote poll error:', err);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: user?.username || 'me',
        content: newChatMessage,
        time: 'Just now'
      }
    ]);
    setNewChatMessage('');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row gap-6 select-none font-sans text-brand-text min-h-[85vh]">
      
      {/* LEFT COLUMN: Discover & Communities list */}
      <div className="w-full md:w-[360px] flex flex-col gap-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black font-outfit tracking-tight flex items-center gap-2 text-brand-text">
            <Users className="w-6 h-6 text-brand-cyan" /> Communities Hub
          </h1>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="p-2 bg-brand-cyan/15 hover:bg-brand-cyan/25 border border-brand-cyan/30 text-brand-orange dark:text-brand-cyan rounded-xl cursor-pointer active-shrink flex items-center gap-1.5 text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-bg/60 border border-brand-cyan/20 focus:border-brand-cyan rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all placeholder:text-neutral-500 text-brand-text"
          />
        </div>

        {/* Create Community Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleCreateCommunity}
              className="p-4 bg-brand-card/90 border border-brand-cyan/25 rounded-2xl flex flex-col gap-3 overflow-hidden shadow-lg"
            >
              <h3 className="text-xs font-bold text-brand-orange dark:text-brand-cyan uppercase tracking-wider">New Community</h3>
              
              {createError && (
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}

              <input
                type="text"
                placeholder="Community Name (e.g. Next.js Builders)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-brand-bg/80 border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3 py-2 text-xs outline-none text-brand-text w-full placeholder:text-neutral-500"
                required
              />
              <textarea
                placeholder="Brief description..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bg-brand-bg/80 border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3 py-2 text-xs outline-none text-brand-text w-full resize-none placeholder:text-neutral-500"
                rows={2}
                required
              />
              <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsPrivate}
                  onChange={(e) => setNewIsPrivate(e.target.checked)}
                  className="rounded bg-brand-bg border-brand-cyan/30 text-brand-orange focus:ring-0 cursor-pointer"
                />
                Make Private Community
              </label>
              <button 
                type="submit"
                disabled={isSubmittingCreate}
                className="w-full py-2 bg-gradient-to-r from-brand-orange to-brand-cyan hover:opacity-90 text-black font-bold text-xs rounded-xl border-0 cursor-pointer active-shrink transition-all shadow-md disabled:opacity-50"
              >
                {isSubmittingCreate ? 'Creating Hub...' : 'Create Hub'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Communities List */}
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
            </div>
          ) : communities.length === 0 ? (
            <div className="text-center py-12 text-xs text-neutral-400 italic bg-brand-card/40 rounded-2xl border border-brand-cyan/15">
              No communities found.
            </div>
          ) : (
            communities.map((comm) => (
              <div 
                key={comm.id}
                onClick={() => loadCommunityDetails(comm.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 ${
                  activeCommunity?.id === comm.id 
                    ? 'bg-brand-card border-brand-cyan/40 shadow-lg' 
                    : 'bg-brand-card/50 border-brand-cyan/15 hover:border-brand-cyan/30 hover:bg-brand-card'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-brand-text">{comm.name}</h3>
                    <p className="text-[11px] text-neutral-400 leading-normal mt-1 max-w-[220px] truncate">{comm.description}</p>
                  </div>
                  {comm.avatarUrl ? (
                    <img src={comm.avatarUrl} alt="logo" className="w-9 h-9 rounded-xl object-cover border border-brand-cyan/20" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-orange to-brand-cyan text-black flex items-center justify-center font-bold text-xs shadow-sm">
                      {comm.name[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-brand-cyan/10 pt-2.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{comm.membersCount} members</span>
                  <button
                    onClick={(e) => handleJoinLeave(comm, e)}
                    className={`text-[11px] font-bold px-3.5 py-1.5 rounded-lg border-0 cursor-pointer active-shrink transition-all ${
                      comm.isJoined 
                        ? 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-brand-text' 
                        : 'bg-gradient-to-r from-brand-orange to-brand-cyan hover:opacity-90 text-black shadow-sm'
                    }`}
                  >
                    {comm.isJoined ? 'Joined ✓' : '+ Join'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Community Dashboard details */}
      <div className="flex-1 bg-brand-card/80 border border-brand-cyan/20 rounded-[28px] glass overflow-hidden flex flex-col min-h-[500px]">
        {activeCommunity ? (
          <div className="flex flex-col flex-1">
            
            {/* Banner Header */}
            <div className="h-32 bg-brand-bg relative">
              {activeCommunity.bannerUrl ? (
                <img src={activeCommunity.bannerUrl} alt="banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-brand-orange/30 via-brand-cyan/15 to-transparent" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-card to-transparent" />
              
              <div className="absolute bottom-4 left-6 flex items-center gap-4">
                {activeCommunity.avatarUrl ? (
                  <img src={activeCommunity.avatarUrl} alt="logo" className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-card shadow-md" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-orange to-brand-cyan text-black flex items-center justify-center font-extrabold text-lg border-2 border-brand-card shadow-md">
                    {activeCommunity.name[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col justify-end">
                  <h2 className="text-lg font-black font-outfit tracking-tight text-brand-text flex items-center gap-1.5">
                    {activeCommunity.name}
                    {activeCommunity.isPrivate && <Globe className="w-3.5 h-3.5 text-neutral-400" />}
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-medium">{activeCommunity.description}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-brand-cyan/15 px-6">
              {(['feed', 'events', 'polls', 'chat'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 font-bold text-xs bg-transparent border-0 cursor-pointer transition-all relative capitalize ${
                    activeTab === tab ? 'text-brand-orange dark:text-brand-cyan' : 'text-neutral-400 hover:text-brand-text'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="commActiveTabLine"
                      className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-cyan"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content panel */}
            <div className="p-6 flex-1 flex flex-col overflow-y-auto">
              
              {/* Tab 1: Feed */}
              {activeTab === 'feed' && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-brand-bg/60 border border-brand-cyan/15 rounded-2xl text-center italic text-xs text-neutral-400">
                    Welcome to the {activeCommunity.name} community feed! Post tech insights with #{activeCommunity.name.replace(/\s+/g, '')} to show them here.
                  </div>
                  
                  {/* Mock post card */}
                  <article className="p-5 bg-brand-bg/40 border border-brand-cyan/15 rounded-2xl flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-brand-orange dark:text-brand-cyan">@alex_dev</span>
                      <span className="text-neutral-400">3h ago</span>
                    </div>
                    <p className="text-xs text-brand-text leading-relaxed">
                      Just pushed a new Docker Compose setup incorporating our postgres server configurations. Runs super smooth and seeds the test tables automatically! Check the git repository guys.
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-brand-cyan font-semibold">
                      <span>#Docker</span> <span>#Postgres</span>
                    </div>
                  </article>
                </div>
              )}

              {/* Tab 2: Events Panel */}
              {activeTab === 'events' && (
                <div className="flex flex-col gap-6">
                  
                  {/* Joiner Event Form */}
                  {activeCommunity.isJoined && (
                    <form onSubmit={handleCreateEvent} className="p-4 bg-brand-bg/60 border border-brand-cyan/15 rounded-2xl flex flex-col gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange dark:text-brand-cyan">Schedule Community Event</span>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Event Title"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="bg-brand-bg border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3 py-1.5 text-xs outline-none text-brand-text placeholder:text-neutral-500"
                          required
                        />
                        <input
                          type="datetime-local"
                          value={newEventDate}
                          onChange={(e) => setNewEventDate(e.target.value)}
                          className="bg-brand-bg border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3 py-1.5 text-xs outline-none text-brand-text"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Location (e.g. Discord, Room 402)"
                          value={newEventLoc}
                          onChange={(e) => setNewEventLoc(e.target.value)}
                          className="bg-brand-bg border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3 py-1.5 text-xs outline-none text-brand-text placeholder:text-neutral-500"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Short description (optional)"
                          value={newEventDesc}
                          onChange={(e) => setNewEventDesc(e.target.value)}
                          className="bg-brand-bg border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3 py-1.5 text-xs outline-none text-brand-text placeholder:text-neutral-500"
                        />
                      </div>
                      <button type="submit" className="self-end py-1.5 px-4 bg-brand-cyan hover:opacity-90 text-black text-xs font-bold rounded-xl border-0 cursor-pointer active-shrink transition-all shadow-sm">
                        Add Event
                      </button>
                    </form>
                  )}

                  {/* List Events */}
                  <div className="flex flex-col gap-3">
                    {activeCommunity.events.length === 0 ? (
                      <span className="text-xs text-neutral-400 italic text-center py-6">No community events scheduled.</span>
                    ) : (
                      activeCommunity.events.map((evt: any) => {
                        const isAttending = evt.attendees.length > 0;
                        return (
                          <div key={evt.id} className="p-4 bg-brand-bg/50 border border-brand-cyan/15 rounded-2xl flex justify-between items-center gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-xs text-brand-text">{evt.title}</span>
                              <span className="text-[11px] text-neutral-400">{evt.description}</span>
                              <div className="flex items-center gap-3 text-[10px] text-neutral-400 mt-1">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-brand-cyan" /> {new Date(evt.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <span>Location: {evt.location}</span>
                                <span className="text-brand-cyan font-semibold">{evt._count.attendees} Going</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAttendEvent(evt.id, isAttending ? 'DECLINED' : 'GOING')}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer active-shrink ${
                                isAttending ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30' : 'bg-brand-bg hover:bg-brand-bg/80 text-brand-text'
                              }`}
                            >
                              {isAttending ? 'Going ✓' : 'Attend'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Polls Panel */}
              {activeTab === 'polls' && (
                <div className="flex flex-col gap-6">
                  
                  {/* Create Poll Form */}
                  {activeCommunity.isJoined && (
                    <form onSubmit={handleCreatePoll} className="p-4 bg-brand-bg/60 border border-brand-cyan/15 rounded-2xl flex flex-col gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange dark:text-brand-cyan">Launch Community Poll</span>
                      <input
                        type="text"
                        placeholder="Ask a question..."
                        value={newPollQ}
                        onChange={(e) => setNewPollQ(e.target.value)}
                        className="bg-brand-bg border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3 py-1.5 text-xs outline-none text-brand-text placeholder:text-neutral-500 w-full"
                        required
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Option A"
                          value={newPollOptA}
                          onChange={(e) => setNewPollOptA(e.target.value)}
                          className="bg-brand-bg border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3 py-1.5 text-xs outline-none text-brand-text placeholder:text-neutral-500"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Option B"
                          value={newPollOptB}
                          onChange={(e) => setNewPollOptB(e.target.value)}
                          className="bg-brand-bg border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3 py-1.5 text-xs outline-none text-brand-text placeholder:text-neutral-500"
                          required
                        />
                      </div>
                      <button type="submit" className="self-end py-1.5 px-4 bg-brand-cyan hover:opacity-90 text-black text-xs font-bold rounded-xl border-0 cursor-pointer active-shrink transition-all shadow-sm">
                        Launch Poll
                      </button>
                    </form>
                  )}

                  {/* List Polls */}
                  <div className="flex flex-col gap-4">
                    {activeCommunity.polls.length === 0 ? (
                      <span className="text-xs text-neutral-400 italic text-center py-6">No community polls active.</span>
                    ) : (
                      activeCommunity.polls.map((poll: any) => {
                        const totalVotes = poll.options.reduce((acc: number, curr: any) => acc + curr._count.votes, 0);
                        const hasVoted = poll.votes.length > 0;
                        const votedOptionId = hasVoted ? poll.votes[0].pollOptionId : null;

                        return (
                          <div key={poll.id} className="p-4 bg-brand-bg/50 border border-brand-cyan/15 rounded-2xl flex flex-col gap-3">
                            <span className="font-bold text-xs text-brand-text">{poll.question}</span>
                            
                            <div className="flex flex-col gap-2">
                              {poll.options.map((opt: any) => {
                                const votesCount = opt._count.votes;
                                const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                                const isSelected = opt.id === votedOptionId;

                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => handleVotePoll(poll.id, opt.id)}
                                    className="w-full text-left bg-brand-bg hover:bg-brand-bg/80 p-2.5 rounded-xl border border-transparent hover:border-brand-cyan/20 cursor-pointer relative overflow-hidden transition-all flex justify-between items-center"
                                  >
                                    {/* Vote meter bar overlay */}
                                    <div 
                                      className="absolute left-0 top-0 bottom-0 bg-brand-cyan/20 transition-all duration-500 -z-10" 
                                      style={{ width: `${percentage}%` }}
                                    />
                                    
                                    <span className="text-xs text-brand-text font-medium flex items-center gap-2">
                                      {opt.optionText}
                                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-cyan" />}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 font-bold">{percentage}% ({votesCount})</span>
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[10px] text-neutral-400 font-semibold">{totalVotes} total votes</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              )}

              {/* Tab 4: Chat Panel */}
              {activeTab === 'chat' && (
                <div className="flex flex-col flex-1 min-h-[300px]">
                  
                  {/* Messages container */}
                  <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto max-h-[260px] mb-4 pr-1">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="flex flex-col text-xs">
                        <div className="flex items-baseline gap-2 text-[10px] text-neutral-400 mb-0.5">
                          <span className="font-bold text-brand-orange dark:text-brand-cyan">{msg.sender}</span>
                          <span>{msg.time}</span>
                        </div>
                        <div className="bg-brand-bg/60 border border-brand-cyan/15 px-3 py-2 rounded-xl self-start max-w-[85%] text-brand-text">
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Composer */}
                  <form onSubmit={handleSendChatMessage} className="flex gap-2 border-t border-brand-cyan/15 pt-3">
                    <input
                      type="text"
                      placeholder="Type a message to the community..."
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                      className="flex-1 bg-brand-bg/80 border border-brand-cyan/20 focus:border-brand-cyan rounded-xl px-3.5 py-2 text-xs outline-none transition-all placeholder:text-neutral-500 text-brand-text"
                    />
                    <button
                      type="submit"
                      disabled={!newChatMessage.trim()}
                      className="bg-brand-cyan hover:opacity-90 text-black font-bold text-xs p-2 px-3.5 rounded-xl border-0 cursor-pointer disabled:opacity-40 transition-all shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                </div>
              )}

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 gap-3">
            <Sparkles className="w-12 h-12 text-brand-cyan animate-pulse" />
            <h2 className="font-black text-lg font-outfit text-brand-text">Select a Community</h2>
            <p className="text-neutral-400 text-xs max-w-xs leading-relaxed">
              Explore developers, designers, and creators spheres from the left dashboard, or create your own hub!
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
