'use client';

import Link from 'next/link';
import { useTheme } from './providers';
import { motion } from 'framer-motion';
import { 
  Sparkles, Sun, Moon, ArrowRight, ShieldCheck, Code, 
  Lightbulb, Users, Award, Flame, Play, Terminal, HelpCircle 
} from 'lucide-react';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 transition-colors duration-300 relative overflow-hidden select-none font-sans pb-16">
      
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-orange/10 dark:bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-cyan/10 dark:bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none animate-blob-delayed" />
      <div className="absolute top-[30%] right-[30%] w-[350px] h-[350px] bg-brand-orange/5 dark:bg-brand-orange/2 rounded-full blur-[120px] pointer-events-none animate-blob-fast" />

      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200/50 dark:border-white/5 bg-slate-50/80 dark:bg-neutral-950/80 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-orange to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-orange/20 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-black animate-pulse" />
            </div>
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-neutral-850 to-neutral-600 dark:from-white dark:via-neutral-100 dark:to-neutral-450 bg-clip-text text-transparent">
              CAMPIFY
            </span>
          </Link>

          {/* Links & CTA */}
          <div className="flex items-center gap-6">
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              type="button"
              className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 text-neutral-600 dark:text-neutral-450 hover:text-brand-orange hover:border-brand-orange/20 dark:hover:text-brand-orange flex items-center justify-center cursor-pointer active-shrink transition-all shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-yellow-500" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-500" />
              )}
            </button>

            {/* Login Link */}
            <Link 
              href="/auth?tab=login" 
              className="text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-brand-cyan dark:hover:text-brand-cyan no-underline transition-colors"
            >
              Sign In
            </Link>

            {/* Register CTA */}
            <Link 
              href="/auth?tab=register" 
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-extrabold text-xs px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity no-underline active-shrink shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-[1200px] mx-auto px-6 pt-16 md:pt-24 flex flex-col items-center text-center gap-8 relative z-10">
        
        {/* Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-orange/10 dark:bg-brand-orange/5 border border-brand-orange/20 text-brand-orange text-[10px] font-black uppercase tracking-widest font-outfit">
          <Flame className="w-3.5 h-3.5 animate-pulse" /> Connect. Learn. Build.
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-outfit tracking-tight leading-tight max-w-4xl text-neutral-900 dark:text-white">
          India&apos;s Premium Campus <br />
          <span className="bg-gradient-to-r from-brand-orange via-purple-500 to-brand-cyan bg-clip-text text-transparent">
            Social & Collaboration Hub
          </span>
        </h1>

        {/* Hero Description */}
        <p className="text-neutral-600 dark:text-neutral-450 text-sm md:text-base leading-relaxed max-w-2xl">
          Campify is the ultimate sandbox for college students. Network with peers, recruit teammates for hackathons, share technical reels with quizzes, build portfolio projects, and climb the campus leaderboard.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-wrap gap-4 justify-center items-center mt-2">
          <Link 
            href="/auth?tab=register" 
            className="bg-gradient-to-r from-brand-orange to-brand-cyan hover:opacity-95 text-black font-black text-sm px-8 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-brand-orange/10 active-shrink transition-all hover:scale-101 border-0"
          >
            Create Your Account <ArrowRight className="w-4 h-4" />
          </Link>
          
          <Link 
            href="/auth?tab=login" 
            className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850/80 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-white/5 font-bold text-sm px-8 py-3.5 rounded-2xl active-shrink transition-all shadow-sm"
          >
            Sign In to Portal
          </Link>
        </div>

        {/* Interactive Mock Dashboard Card */}
        <div className="w-full max-w-[850px] mt-8 p-4 md:p-6 rounded-[32px] bg-white/70 dark:bg-brand-card/50 border border-neutral-200/50 dark:border-white/5 backdrop-blur-xl shadow-2xl relative">
          
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-cyan/5 rounded-full blur-2xl pointer-events-none" />

          {/* Card Mock Header */}
          <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-white/5 pb-4 mb-4 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono ml-2">campify_web_shell.sh</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
            
            {/* Left Content Column */}
            <div className="md:col-span-8 flex flex-col gap-4">
              
              {/* Mock Post */}
              <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-black/30 border border-neutral-200/40 dark:border-white/5 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-orange text-black font-bold text-xs flex items-center justify-center">
                    M
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                      mohit_dev
                      <span title="Completed Learning Targets (Gold Medal)">
                        <Award className="w-3.5 h-3.5 text-brand-orange fill-brand-orange animate-pulse" />
                      </span>
                    </span>
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500">30m ago &bull; Coding Lab</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-normal font-medium">
                  Just uploaded the source code of Campify! Implemented Next.js 15, Tailwind v4, Express, and local DB integration. Let&apos;s hack! 🚀
                </p>
                <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-semibold mt-1 select-none">
                  <span className="flex items-center gap-1 text-red-500"><Flame className="w-3.5 h-3.5" /> 42 Likes</span>
                  <span>&bull;</span>
                  <span>12 Comments</span>
                </div>
              </div>

              {/* Console preview */}
              <div className="p-4 rounded-2xl bg-neutral-900 dark:bg-black/60 border border-white/5 font-mono">
                <pre className="text-[10px] text-brand-cyan leading-relaxed font-bold">
{`$ npx create-campify-app@latest
✔ Connected to Campus Server
✔ Hackathon Mode Enabled
🔥 Daily Streak: 12 Days (Level 5)
🚀 Active Team Recruitment matches found: 4`}
                </pre>
              </div>

            </div>

            {/* Right Widget Column */}
            <div className="md:col-span-4 flex flex-col gap-4">
              
              {/* Gamify stats */}
              <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-black/30 border border-neutral-200/40 dark:border-white/5 flex flex-col gap-3.5">
                <span className="text-[9px] uppercase font-bold text-neutral-400 dark:text-neutral-500 tracking-wider">Campus Gamification</span>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                    <span>LEVEL 5</span>
                    <span className="text-brand-cyan">340 XP</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-cyan w-[65%]" />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-neutral-900 text-white rounded-xl select-none">
                  <span className="text-sm">🔥</span>
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-neutral-500">Active Streak</span>
                    <span className="text-[10px] font-black">12 Days</span>
                  </div>
                </div>
              </div>

              {/* Mock Team Finder Widget */}
              <div className="p-4 rounded-2xl bg-brand-orange/5 dark:bg-brand-orange/2 border border-brand-orange/15 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md uppercase">Team Finder</span>
                  <span className="text-[8px] text-neutral-400 dark:text-neutral-500">Active</span>
                </div>
                <p className="text-[10px] font-bold text-neutral-900 dark:text-neutral-200 leading-normal">Need UI designer for College Hackathon!</p>
                <span className="text-[8px] text-neutral-500 dark:text-neutral-400">Skills: Figma, TailwindCSS</span>
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* CORE FEATURES SECTION */}
      <section className="max-w-[1200px] mx-auto px-6 pt-24 md:pt-32 relative z-10">
        
        <div className="text-center flex flex-col items-center gap-4 mb-16">
          <h2 className="text-3xl font-black font-outfit text-neutral-900 dark:text-white">
            Everything Students Need, In One Place
          </h2>
          <p className="text-neutral-600 dark:text-neutral-450 text-sm max-w-lg leading-relaxed">
            Forget disjointed chat groups and messy forums. Collaborate and grow inside a unified tech portfolio ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Team Finder */}
          <div className="p-6 rounded-[24px] bg-white dark:bg-brand-card border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
              <Code className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Project Team Finder</h3>
            <p className="text-neutral-600 dark:text-neutral-450 text-xs leading-relaxed">
              Find teammate matches for college projects and hackathons. Sort by specific roles, languages, and framework dependencies.
            </p>
          </div>

          {/* Card 2: Learning Reels */}
          <div className="p-6 rounded-[24px] bg-white dark:bg-brand-card border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
              <Play className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Micro-Learning Reels</h3>
            <p className="text-neutral-600 dark:text-neutral-450 text-xs leading-relaxed">
              Consume high-value tech knowledge via a vertical video feed. Test your recall with quick embedded quizzes for bonus XP points.
            </p>
          </div>

          {/* Card 3: Communities */}
          <div className="p-6 rounded-[24px] bg-white dark:bg-brand-card border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">College Communities</h3>
            <p className="text-neutral-600 dark:text-neutral-450 text-xs leading-relaxed">
              Join or build academic hubs. Coordinate events, host live presentations, and design community polls in real-time.
            </p>
          </div>

          {/* Card 4: Gamified Portfolio */}
          <div className="p-6 rounded-[24px] bg-white dark:bg-brand-card border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Developer Badge Portfolio</h3>
            <p className="text-neutral-600 dark:text-neutral-450 text-xs leading-relaxed">
              Build your technical CV. Display certifications, achievements, coding projects, and earn special badges for streaks.
            </p>
          </div>

          {/* Card 5: Real-time Chats */}
          <div className="p-6 rounded-[24px] bg-white dark:bg-brand-card border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Direct Real-Time Chat</h3>
            <p className="text-neutral-600 dark:text-neutral-450 text-xs leading-relaxed">
              Chat instantly with teammate leads. Send multimedia logs, voice notes, and receive instant screenshot alerts.
            </p>
          </div>

          {/* Card 6: Secure Screening */}
          <div className="p-6 rounded-[24px] bg-white dark:bg-brand-card border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-450">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-white">Toxicity Moderation</h3>
            <p className="text-neutral-600 dark:text-neutral-450 text-xs leading-relaxed">
              Participate safely. Campify has automated toxicity scanners that filter out abusive content and keep the environment secured.
            </p>
          </div>

        </div>

      </section>

      {/* STATS BANNER */}
      <section className="max-w-[1200px] mx-auto px-6 pt-24 md:pt-32 relative z-10">
        <div className="p-8 md:p-12 rounded-[32px] bg-neutral-900 text-white flex flex-wrap gap-8 items-center justify-around shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center">
            <span className="block text-3xl md:text-4xl font-black font-outfit tracking-tight">45k+</span>
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1 block">Active Students</span>
          </div>

          <div className="text-center">
            <span className="block text-3xl md:text-4xl font-black font-outfit tracking-tight">250+</span>
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1 block">College Communities</span>
          </div>

          <div className="text-center">
            <span className="block text-3xl md:text-4xl font-black font-outfit tracking-tight">1,800+</span>
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1 block">Projects Uploaded</span>
          </div>

          <div className="text-center">
            <span className="block text-3xl md:text-4xl font-black font-outfit tracking-tight">80+</span>
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1 block">Hackathons Run</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-[1200px] mx-auto px-6 pt-24 mt-8 border-t border-neutral-200/50 dark:border-white/5 text-neutral-400 dark:text-neutral-500 text-xs flex flex-wrap gap-6 items-center justify-between relative z-10 transition-colors duration-300">
        <span className="flex items-center gap-1.5 font-semibold text-neutral-600 dark:text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-brand-cyan" /> Secure College Sandbox
        </span>
        <span className="font-medium">&copy; {new Date().getFullYear()} Campify Inc. Made with Passion for Campus Hackers.</span>
      </footer>

    </div>
  );
}
