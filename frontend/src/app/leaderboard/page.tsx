'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion } from 'framer-motion';
import { 
  Trophy, Flame, Award, Shield, Loader2, Sparkles, Medal, Clock
} from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [gamifyStats, setGamifyStats] = useState<any | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGamifyData();
  }, []);

  async function loadGamifyData() {
    setIsLoading(true);
    try {
      // Claim/Update login daily streak first
      await apiFetch('/gamification/streak', { method: 'POST' });

      // Fetch stats
      const statsRes = await apiFetch('/gamification/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setGamifyStats(statsData);
      }

      // Fetch global ranking
      const leaderRes = await apiFetch('/gamification/leaderboard');
      if (leaderRes.ok) {
        const leaderData = await leaderRes.json();
        setLeaderboard(leaderData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex justify-center items-center text-white">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const userStats = gamifyStats?.stats || { xpPoints: 0, level: 1, dailyStreak: 1 };
  const achievements = gamifyStats?.achievements || [];
  const badges = gamifyStats?.badges || [];

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 flex flex-col lg:flex-row gap-6 select-none font-sans text-white min-h-[85vh]">
      
      {/* LEFT COLUMN: Leaderboard list */}
      <div className="flex-1 bg-neutral-900/40 border border-white/5 rounded-[28px] glass p-6 flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-black font-outfit tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" /> Global Leaderboard
          </h1>
          <p className="text-[10px] text-neutral-500 mt-0.5 leading-normal">
            Compete with top creators, students, and developers based on accumulated XP levels.
          </p>
        </div>

        {/* Global ranking table list */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-neutral-500 tracking-wider px-4 pb-2 border-b border-white/5">
            <span className="col-span-2">Rank</span>
            <span className="col-span-5">User</span>
            <span className="col-span-2 text-center">Streak</span>
            <span className="col-span-3 text-right">XP Levels</span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
            {leaderboard.map((item) => {
              const isCurrentUser = item.username === user?.username;
              const rankIcon = item.rank === 1 
                ? <Medal className="w-4.5 h-4.5 text-yellow-500" />
                : item.rank === 2
                ? <Medal className="w-4.5 h-4.5 text-slate-300" />
                : item.rank === 3
                ? <Medal className="w-4.5 h-4.5 text-amber-600" />
                : <span className="text-xs font-bold text-neutral-500">#{item.rank}</span>;

              return (
                <div 
                  key={item.username}
                  className={`grid grid-cols-12 items-center p-3.5 rounded-xl border text-xs font-semibold ${
                    isCurrentUser 
                      ? 'bg-cyan-500/10 border-cyan-500/30' 
                      : 'bg-neutral-900/40 border-white/5 hover:border-white/10 hover:bg-neutral-900/60'
                  }`}
                >
                  <span className="col-span-2 flex items-center pl-1">{rankIcon}</span>
                  
                  <div className="col-span-5 flex items-center gap-2.5">
                    {item.avatarUrl ? (
                      <img src={item.avatarUrl} alt="avatar" className="w-7 h-7 rounded-lg object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] border border-cyan-500/10">
                        {item.username[0].toUpperCase()}
                      </div>
                    )}
                    <span className={`truncate ${isCurrentUser ? 'text-cyan-400 font-extrabold' : 'text-neutral-300'}`}>@{item.username}</span>
                  </div>

                  <span className="col-span-2 text-center text-orange-400 font-bold flex items-center justify-center gap-0.5">
                    <Flame className="w-3.5 h-3.5" />
                    {item.dailyStreak}d
                  </span>

                  <span className="col-span-3 text-right text-neutral-400 flex flex-col justify-end">
                    <span className="font-extrabold text-xs text-neutral-200">Lvl {item.level}</span>
                    <span className="text-[9px] text-neutral-500 leading-none mt-0.5">{item.xpPoints} XP</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: User streak dashboard, badges and achievements */}
      <div className="w-full lg:w-[380px] flex flex-col gap-6 flex-shrink-0">
        
        {/* Active Streak counter */}
        <div className="bg-neutral-900/40 border border-white/5 rounded-[24px] p-5 glass flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <span className="font-bold text-xs uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 font-outfit">
              <Flame className="w-4.5 h-4.5 text-orange-500 animate-bounce" /> Daily Streaks
            </span>
            <span className="text-[9px] bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              Streak active
            </span>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Flame className="w-8 h-8" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black font-outfit text-white">{userStats.dailyStreak} Days Active</span>
              <span className="text-[10px] text-neutral-400 leading-normal mt-0.5">Claim daily to maintain streak fire! Earn 15 XP reward tomorrow.</span>
            </div>
          </div>
        </div>

        {/* User Badges */}
        <div className="bg-neutral-900/40 border border-white/5 rounded-[24px] p-5 glass flex flex-col gap-4">
          <span className="font-bold text-xs uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 font-outfit">
            <Award className="w-4.5 h-4.5 text-cyan-500" /> Showcase Badges
          </span>

          <div className="grid grid-cols-4 gap-3">
            {badges.length === 0 ? (
              <span className="col-span-4 text-[10px] text-neutral-500 italic text-center py-4">No badges unlocked yet. Complete lessons to earn badges!</span>
            ) : (
              badges.map((badge: any) => (
                <div 
                  key={badge.id} 
                  className="flex flex-col items-center justify-center p-2.5 bg-neutral-900/60 border border-white/5 rounded-xl text-center group relative cursor-pointer"
                  title={badge.description}
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-neutral-400 mt-2 truncate w-full max-w-[65px]">{badge.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Achievements checklist */}
        <div className="bg-neutral-900/40 border border-white/5 rounded-[24px] p-5 glass flex flex-col gap-4">
          <span className="font-bold text-xs uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 font-outfit">
            <Sparkles className="w-4.5 h-4.5 text-cyan-500" /> Unlocked Achievements
          </span>

          <div className="flex flex-col gap-3">
            {achievements.length === 0 ? (
              <span className="text-[10px] text-neutral-505 italic text-center py-6">No achievements unlocked yet.</span>
            ) : (
              achievements.map((ach: any) => (
                <div key={ach.id} className="flex gap-3 items-start text-xs border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="p-2 rounded-lg bg-neutral-900 border border-white/5 text-cyan-400 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="font-bold text-neutral-200">{ach.title}</span>
                    <span className="text-[10px] text-neutral-500 mt-0.5 leading-normal">{ach.description}</span>
                    <span className="text-[8px] text-neutral-600 font-semibold mt-1 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {new Date(ach.unlockedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
