'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Search, Plus, Loader2, Code, Shield, Check, X, MailOpen, Compass
} from 'lucide-react';

export default function TeamFinderPage() {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Invite modal states
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // New Team Form
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamRole, setNewTeamRole] = useState('Developer');
  const [newTeamSkills, setNewTeamSkills] = useState('');

  useEffect(() => {
    loadTeamsAndInvites();
  }, [searchQuery]);

  async function loadTeamsAndInvites() {
    setIsLoading(true);
    try {
      // Load teams
      const teamsRes = await apiFetch(`/teams?search=${searchQuery}`);
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }

      // Load pending invitations
      const invRes = await apiFetch('/teams/invitations/pending');
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvitations(invData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamDesc.trim()) return;

    try {
      const res = await apiFetch('/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDesc,
          lookingFor: newTeamRole,
          skillsNeeded: newTeamSkills
        })
      });

      if (res.ok) {
        setNewTeamName('');
        setNewTeamDesc('');
        setNewTeamSkills('');
        setIsCreating(false);
        await loadTeamsAndInvites();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !inviteTeamId) return;

    setIsInviting(true);
    try {
      const res = await apiFetch(`/teams/${inviteTeamId}/invite`, {
        method: 'POST',
        body: JSON.stringify({
          receiverUsername: inviteUsername,
          message: inviteMessage
        })
      });

      if (res.ok) {
        alert('Invitation sent successfully!');
        setInviteTeamId(null);
        setInviteUsername('');
        setInviteMessage('');
        await loadTeamsAndInvites();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send invitation');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRespondInvitation = async (invitationId: string, accept: boolean) => {
    try {
      const res = await apiFetch(`/teams/invitation/${invitationId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept })
      });

      if (res.ok) {
        await loadTeamsAndInvites();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6 select-none font-sans text-white min-h-[85vh]">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-outfit tracking-tight flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-cyan-400" /> Project Team Finder
          </h1>
          <p className="text-xs text-neutral-400 mt-1">Connect with developers, designers, and creators to build the next big thing.</p>
        </div>

        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs px-4 py-2.5 rounded-xl border-0 cursor-pointer active-shrink hover-scale flex items-center gap-1.5 self-start md:self-center"
        >
          <Plus className="w-4 h-4" /> Recruit Members
        </button>
      </div>

      {/* Grid: Main content and Side column */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Teams lists */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search by role or required skills (e.g. Next.js, Figma, Copywriting)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900/60 border border-white/5 focus:border-cyan-500/30 rounded-2xl pl-11 pr-4 py-3 text-xs outline-none transition-all placeholder:text-neutral-500 text-white"
            />
          </div>

          {/* Create Team Form Drawer */}
          <AnimatePresence>
            {isCreating && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleCreateTeam}
                className="p-5 bg-neutral-900/50 border border-white/5 rounded-2xl flex flex-col gap-4 overflow-hidden"
              >
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Launch Team Recruit</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Project Name (e.g. Decentralized Portfolio)"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white w-full"
                    required
                  />
                  <select
                    value={newTeamRole}
                    onChange={(e) => setNewTeamRole(e.target.value)}
                    className="bg-neutral-800 border border-transparent rounded-xl px-3 py-2 text-xs outline-none text-white w-full cursor-pointer"
                  >
                    <option value="Developer">Looking for: Developer</option>
                    <option value="Designer">Looking for: Designer</option>
                    <option value="Creator">Looking for: Content Creator</option>
                    <option value="Co-founder">Looking for: Business Co-founder</option>
                  </select>
                </div>
                <textarea
                  placeholder="Provide a description of your project scope..."
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white w-full resize-none"
                  rows={2}
                  required
                />
                <input
                  type="text"
                  placeholder="Skills required (comma separated, e.g. React, Docker, Python)"
                  value={newTeamSkills}
                  onChange={(e) => setNewTeamSkills(e.target.value)}
                  className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white w-full"
                />
                <button type="submit" className="self-end py-2 px-6 bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-bold rounded-xl border-0 cursor-pointer active-shrink">
                  Publish Request
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Recruits list */}
          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : teams.length === 0 ? (
            <div className="bg-neutral-900/40 border border-white/5 rounded-[28px] p-12 text-center flex flex-col items-center gap-3 glass">
              <Compass className="w-10 h-10 text-cyan-400 animate-pulse" />
              <h3 className="font-extrabold text-sm text-neutral-300">No projects active</h3>
              <p className="text-neutral-500 text-2xs max-w-xs leading-relaxed">
                Be the first to publish a project finding request, or adjust your tags to match open teams!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <div key={team.id} className="p-5 bg-neutral-900/40 border border-white/5 rounded-[24px] glass flex flex-col gap-4 justify-between transition-all duration-300 hover:shadow-lg">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-neutral-200">{team.name}</h3>
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mt-1 block">Looking for: {team.lookingFor}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                        <span className="font-extrabold text-[10px] text-cyan-400">{team.matchScore}% Match</span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 leading-normal mt-1">{team.description}</p>
                    
                    {team.skillsNeeded && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {team.skillsNeeded.split(',').map((skill: string, i: number) => (
                          <span key={i} className="text-[9px] font-bold bg-neutral-900 border border-white/5 px-2 py-0.5 rounded-md text-neutral-400">{skill.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                    <span className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wider">{team.membersCount} members</span>
                    
                    {team.isMember ? (
                      <span className="text-[10px] font-bold text-neutral-500 flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-500" /> Joined Team</span>
                    ) : team.creatorId === user?.id ? (
                      <button
                        onClick={() => setInviteTeamId(team.id)}
                        className="bg-cyan-500 hover:bg-cyan-600 text-black text-[10px] font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer active-shrink"
                      >
                        Invite Member
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-neutral-500">Contact Creator</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Invitations column */}
        <div className="w-full lg:w-[320px] flex flex-col gap-4 flex-shrink-0">
          <div className="bg-neutral-900/40 border border-white/5 rounded-[24px] p-5 glass flex flex-col gap-4">
            <span className="font-bold text-xs uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 font-outfit">
              <MailOpen className="w-4 h-4 text-cyan-500" /> Team Invitations
            </span>

            <div className="flex flex-col gap-3">
              {invitations.length === 0 ? (
                <span className="text-[10px] text-neutral-500 italic text-center py-6">No pending invitations.</span>
              ) : (
                invitations.map((inv) => (
                  <div key={inv.id} className="p-3 bg-neutral-900/60 border border-white/5 rounded-xl flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-xs text-neutral-200">@{inv.sender.username}</span>
                      <span className="text-[10px] text-cyan-400">Invited you to: {inv.team.name}</span>
                      {inv.message && <p className="text-[9px] text-neutral-500 mt-1 leading-normal italic">&ldquo;{inv.message}&rdquo;</p>}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleRespondInvitation(inv.id, true)}
                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black text-[9px] font-bold py-1 rounded-lg border-0 cursor-pointer active-shrink text-center"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondInvitation(inv.id, false)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold py-1 rounded-lg border border-white/5 cursor-pointer active-shrink text-center"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Invite Member Modal */}
      {inviteTeamId && (
        <div className="fixed inset-0 bg-neutral-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <form 
            onSubmit={handleInviteSubmit}
            className="w-full max-w-[400px] p-6 bg-neutral-900 border border-white/5 rounded-3xl flex flex-col gap-4 relative shadow-2xl"
          >
            <button 
              type="button"
              onClick={() => setInviteTeamId(null)}
              className="absolute right-4 top-4 p-1 hover:bg-white/5 text-neutral-400 hover:text-white rounded-lg border-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-sm text-cyan-400 flex items-center gap-1.5 font-outfit">Invite Candidate</h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Candidate Username</label>
              <input
                type="text"
                placeholder="e.g. coder_bob"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3.5 py-2 text-xs outline-none text-white w-full"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Personal Message</label>
              <textarea
                placeholder="Hey, saw your skills profile and thought you'd be perfect to build this portfolio widget!"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="bg-white/5 border border-transparent focus:border-white/10 rounded-xl px-3.5 py-2 text-xs outline-none text-white w-full resize-none"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={isInviting || !inviteUsername.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-black font-bold text-xs rounded-xl border-0 cursor-pointer disabled:opacity-40"
            >
              {isInviting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
