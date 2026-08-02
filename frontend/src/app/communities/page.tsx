'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Calendar, BarChart2, MessageSquare, Compass, 
  Check, ArrowRight, Loader2, Globe, Search, Sparkles, MessageCircle, Send
} from 'lucide-react';

export default function CommunitiesPage() {
  const { user } = useAuthStore();
  const [communities, setCommunities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCommunity, setActiveCommunity] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'polls' | 'chat'>('feed');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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
    loadCommunities();
  }, [searchQuery]);

  async function loadCommunities() {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/communities?search=${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        setCommunities(data);
      }
    } catch (err) {
      console.error(err);
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
      console.error(err);
    }
  }

  const handleJoinLeave = async (comm: any) => {
    try {
      const method = comm.isJoined ? 'DELETE' : 'POST';
      const endpoint = comm.isJoined ? `/communities/leave/${comm.id}` : `/communities/join/${comm.id}`;
      const res = await apiFetch(endpoint, { method });

      if (res.ok) {
        // Reload list
        await loadCommunities();
        if (activeCommunity?.id === comm.id) {
          await loadCommunityDetails(comm.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesc.trim()) return;

    try {
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
        await loadCommunities();
        await loadCommunityDetails(data.id);
      }
    } catch (err) {
      console.error(err);
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
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
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row gap-6 select-none font-sans text-white min-h-[85vh]">
      
      {/* LEFT COLUMN: Discover & Communities list */}
      <div className="w-full md:w-[360px] flex flex-col gap-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black font-outfit tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" /> Communities Hub
          </h1>
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="p-2 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 rounded-xl cursor-pointer active-shrink flex items-center gap-1.5 text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900/60 border border-white/5 focus:border-cyan-500/30 rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all placeholder:text-neutral-500 text-white"
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
              className="p-4 bg-neutral-900/50 border border-white/5 rounded-2xl flex flex-col gap-3 overflow-hidden"
            >
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">New Community</h3>
              <input
                type="text"
                placeholder="Community Name (e.g. Next.js Builders)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white w-full"
                required
              />
              <textarea
                placeholder="Brief description..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white w-full resize-none"
                rows={2}
                required
              />
              <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsPrivate}
                  onChange={(e) => setNewIsPrivate(e.target.checked)}
                  className="rounded bg-white/5 border-transparent text-cyan-500 focus:ring-0 cursor-pointer"
                />
                Make Private Community
              </label>
              <button 
                type="submit" 
                className="w-full py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-black font-bold text-xs rounded-xl border-0 cursor-pointer active-shrink"
              >
                Create Hub
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Communities List */}
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
            </div>
          ) : communities.length === 0 ? (
            <div className="text-center py-12 text-xs text-neutral-500 italic bg-neutral-900/30 rounded-2xl border border-white/5">
              No communities found.
            </div>
          ) : (
            communities.map((comm) => (
              <div 
                key={comm.id}
                onClick={() => loadCommunityDetails(comm.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 ${
                  activeCommunity?.id === comm.id 
                    ? 'bg-neutral-900/80 border-cyan-500/30' 
                    : 'bg-neutral-900/40 border-white/5 hover:border-white/10 hover:bg-neutral-900/60'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-200">{comm.name}</h3>
                    <p className="text-[10px] text-neutral-500 leading-normal mt-1 max-w-[220px] truncate">{comm.description}</p>
                  </div>
                  {comm.avatarUrl ? (
                    <img src={comm.avatarUrl} alt="logo" className="w-9 h-9 rounded-xl object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/10">
                      {comm.name[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-white/5 pt-2.5">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">{comm.membersCount} members</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinLeave(comm);
                    }}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer active-shrink transition-colors ${
                      comm.isJoined 
                        ? 'bg-white/10 hover:bg-white/15 text-neutral-300' 
                        : 'bg-cyan-500 hover:bg-cyan-600 text-black'
                    }`}
                  >
                    {comm.isJoined ? 'Joined' : 'Join'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Community Dashboard details */}
      <div className="flex-1 bg-neutral-900/40 border border-white/5 rounded-[28px] glass overflow-hidden flex flex-col min-h-[500px]">
        {activeCommunity ? (
          <div className="flex flex-col flex-1">
            
            {/* Banner Header */}
            <div className="h-32 bg-neutral-800 relative">
              {activeCommunity.bannerUrl ? (
                <img src={activeCommunity.bannerUrl} alt="banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-teal-950/20 via-cyan-900/10 to-neutral-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
              
              <div className="absolute bottom-4 left-6 flex items-center gap-4">
                {activeCommunity.avatarUrl ? (
                  <img src={activeCommunity.avatarUrl} alt="logo" className="w-14 h-14 rounded-2xl object-cover border-2 border-neutral-950" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-black flex items-center justify-center font-extrabold text-lg border-2 border-neutral-950">
                    {activeCommunity.name[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col justify-end">
                  <h2 className="text-lg font-black font-outfit tracking-tight text-white flex items-center gap-1.5">
                    {activeCommunity.name}
                    {activeCommunity.isPrivate && <Globe className="w-3.5 h-3.5 text-neutral-400" />}
                  </h2>
                  <p className="text-[10px] text-neutral-400 font-medium">{activeCommunity.description}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 px-6">
              {(['feed', 'events', 'polls', 'chat'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-3 font-bold text-xs bg-transparent border-0 cursor-pointer transition-all relative capitalize ${
                    activeTab === tab ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="commActiveTabLine"
                      className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content panel */}
            <div className="p-6 flex-1 flex flex-col overflow-y-auto">
              
              {/* Tab 1: Feed (Standard Posts Filtered by tag or community mock posts) */}
              {activeTab === 'feed' && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-neutral-900/60 border border-white/5 rounded-2xl text-center italic text-xs text-neutral-500">
                    Welcome to the {activeCommunity.name} community feed! Post tech insights with #{activeCommunity.name.replace(/\s+/g, '')} to show them here.
                  </div>
                  
                  {/* Mock post card */}
                  <article className="p-5 bg-neutral-900/40 border border-white/5 rounded-2xl flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-cyan-400">@alex_dev</span>
                      <span className="text-neutral-500">3h ago</span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Just pushed a new Docker Compose setup incorporating our postgres server configurations. Runs super smooth and seeds the test tables automatically! Check the git repository guys.
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-500">
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
                    <form onSubmit={handleCreateEvent} className="p-4 bg-neutral-900/40 border border-white/5 rounded-2xl flex flex-col gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Schedule Community Event</span>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Event Title"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none text-white"
                          required
                        />
                        <input
                          type="datetime-local"
                          value={newEventDate}
                          onChange={(e) => setNewEventDate(e.target.value)}
                          className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none text-white"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Location (e.g. Discord, Room 402)"
                          value={newEventLoc}
                          onChange={(e) => setNewEventLoc(e.target.value)}
                          className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none text-white"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Short description (optional)"
                          value={newEventDesc}
                          onChange={(e) => setNewEventDesc(e.target.value)}
                          className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none text-white"
                        />
                      </div>
                      <button type="submit" className="self-end py-1.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-bold rounded-xl border-0 cursor-pointer active-shrink">
                        Add Event
                      </button>
                    </form>
                  )}

                  {/* List Events */}
                  <div className="flex flex-col gap-3">
                    {activeCommunity.events.length === 0 ? (
                      <span className="text-xs text-neutral-500 italic text-center py-6">No community events scheduled.</span>
                    ) : (
                      activeCommunity.events.map((evt: any) => {
                        const isAttending = evt.attendees.length > 0;
                        return (
                          <div key={evt.id} className="p-4 bg-neutral-900/60 border border-white/5 rounded-2xl flex justify-between items-center gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-xs text-neutral-200">{evt.title}</span>
                              <span className="text-[10px] text-neutral-400">{evt.description}</span>
                              <div className="flex items-center gap-3 text-[9px] text-neutral-500 mt-1">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-cyan-400" /> {new Date(evt.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <span>Location: {evt.location}</span>
                                <span className="text-cyan-400/80 font-semibold">{evt._count.attendees} Going</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAttendEvent(evt.id, isAttending ? 'DECLINED' : 'GOING')}
                              className={`text-[9px] font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer active-shrink ${
                                isAttending ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/25' : 'bg-white/5 hover:bg-white/10 text-white'
                              }`}
                            >
                              {isAttending ? 'Going' : 'Attend'}
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
                    <form onSubmit={handleCreatePoll} className="p-4 bg-neutral-900/40 border border-white/5 rounded-2xl flex flex-col gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Launch Community Poll</span>
                      <input
                        type="text"
                        placeholder="Ask a question..."
                        value={newPollQ}
                        onChange={(e) => setNewPollQ(e.target.value)}
                        className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none text-white w-full"
                        required
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Option A"
                          value={newPollOptA}
                          onChange={(e) => setNewPollOptA(e.target.value)}
                          className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none text-white"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Option B"
                          value={newPollOptB}
                          onChange={(e) => setNewPollOptB(e.target.value)}
                          className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none text-white"
                          required
                        />
                      </div>
                      <button type="submit" className="self-end py-1.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-bold rounded-xl border-0 cursor-pointer active-shrink">
                        Launch Poll
                      </button>
                    </form>
                  )}

                  {/* List Polls */}
                  <div className="flex flex-col gap-4">
                    {activeCommunity.polls.length === 0 ? (
                      <span className="text-xs text-neutral-500 italic text-center py-6">No community polls active.</span>
                    ) : (
                      activeCommunity.polls.map((poll: any) => {
                        const totalVotes = poll.options.reduce((acc: number, curr: any) => acc + curr._count.votes, 0);
                        const hasVoted = poll.votes.length > 0;
                        const votedOptionId = hasVoted ? poll.votes[0].pollOptionId : null;

                        return (
                          <div key={poll.id} className="p-4 bg-neutral-900/60 border border-white/5 rounded-2xl flex flex-col gap-3">
                            <span className="font-bold text-xs text-neutral-200">{poll.question}</span>
                            
                            <div className="flex flex-col gap-2">
                              {poll.options.map((opt: any) => {
                                const votesCount = opt._count.votes;
                                const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                                const isSelected = opt.id === votedOptionId;

                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => handleVotePoll(poll.id, opt.id)}
                                    className="w-full text-left bg-white/5 hover:bg-white/10 p-2.5 rounded-xl border border-transparent hover:border-white/5 cursor-pointer relative overflow-hidden transition-all flex justify-between items-center"
                                  >
                                    {/* Vote meter bar overlay */}
                                    <div 
                                      className="absolute left-0 top-0 bottom-0 bg-cyan-500/10 transition-all duration-500 -z-10" 
                                      style={{ width: `${percentage}%` }}
                                    />
                                    
                                    <span className="text-xs text-neutral-300 font-medium flex items-center gap-2">
                                      {opt.optionText}
                                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 font-bold">{percentage}% ({votesCount})</span>
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[9px] text-neutral-500 font-semibold">{totalVotes} total votes</span>
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
                        <div className="flex items-baseline gap-2 text-[10px] text-neutral-500 mb-0.5">
                          <span className="font-bold text-cyan-400">{msg.sender}</span>
                          <span>{msg.time}</span>
                        </div>
                        <div className="bg-neutral-900/60 border border-white/5 px-3 py-2 rounded-xl self-start max-w-[85%] text-neutral-200">
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Composer */}
                  <form onSubmit={handleSendChatMessage} className="flex gap-2 border-t border-white/5 pt-3">
                    <input
                      type="text"
                      placeholder="Type a message to the community..."
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                      className="flex-1 bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3.5 py-2 text-xs outline-none transition-all placeholder:text-neutral-500 text-white"
                    />
                    <button
                      type="submit"
                      disabled={!newChatMessage.trim()}
                      className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs p-2 px-3 rounded-xl border-0 cursor-pointer disabled:opacity-40"
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
            <Sparkles className="w-12 h-12 text-cyan-500 animate-pulse" />
            <h2 className="font-black text-lg font-outfit text-white">Select a Community</h2>
            <p className="text-neutral-500 text-xs max-w-xs leading-relaxed">
              Explore developers, designers, and creators spheres from the left dashboard, or create your own hub!
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
