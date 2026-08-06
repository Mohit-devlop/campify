'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from './providers';
import { motion, Variants } from 'framer-motion';
import { 
  Sparkles, Sun, Moon, ArrowRight, ShieldCheck, Code, 
  Lightbulb, Users, Award, Flame, Play, Terminal 
} from 'lucide-react';

// Scroll-triggered Auto-Counter Component for Statistics
function AnimatedCounter({ value, duration = 2000 }: { value: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  
  // Extract number and suffix (e.g., "45k+" -> 45, "k+")
  const matches = value.match(/^([\d,]+)(.*)$/);
  const numVal = matches ? parseInt(matches[1].replace(/,/g, ''), 10) : 0;
  const suffix = matches ? matches[2] : '';

  useEffect(() => {
    let observer: IntersectionObserver;
    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * numVal));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    if (elementRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            window.requestAnimationFrame(step);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(elementRef.current);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [numVal, duration]);

  return (
    <span ref={elementRef} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [terminalText, setTerminalText] = useState('');
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    // Generate floating particle metrics once on mount to prevent loop/hydration issues
    const generated = [...Array(15)].map((_, i) => ({
      width: (i % 3 === 0) ? 8 : (i % 2 === 0) ? 5 : 3,
      height: (i % 3 === 0) ? 8 : (i % 2 === 0) ? 5 : 3,
      background: i % 2 === 0 ? '#FF6B35' : '#00C2FF',
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      x: [0, Math.random() * 120 - 60, 0],
      y: [0, Math.random() * 120 - 60, 0],
      scale: [1, 1.4, 1],
      duration: Math.random() * 15 + 15,
    }));
    setParticles(generated);
  }, []);

  // Terminal text lines for dynamic typing effect
  const terminalLines = [
    '$ npx create-campify-app@latest',
    '✔ Connected to Campus Server',
    '✔ Hackathon Mode Enabled',
    '✔ Daily Streak: 12 Days (Level 5)',
    '✔ Active Team Recruitment matches found: 4'
  ];

  // Dynamic Terminal Typing Animation
  useEffect(() => {
    let currentLineIdx = 0;
    let currentCharIdx = 0;
    let output = '';
    let isDeleting = false;
    let timer: NodeJS.Timeout;

    const type = () => {
      if (currentLineIdx >= terminalLines.length) return;
      const currentFullLine = terminalLines[currentLineIdx];
      
      if (!isDeleting) {
        output += currentFullLine[currentCharIdx];
        setTerminalText(output);
        currentCharIdx++;

        if (currentCharIdx === currentFullLine.length) {
          timer = setTimeout(() => {
            if (currentLineIdx < terminalLines.length - 1) {
              output += '\n';
              currentLineIdx++;
              currentCharIdx = 0;
              type();
            } else {
              // Finished all text, wait 6 seconds and then delete
              timer = setTimeout(() => {
                isDeleting = true;
                type();
              }, 6000);
            }
          }, 800);
          return;
        }
        timer = setTimeout(type, currentLineIdx === 0 ? 55 : 30);
      } else {
        if (output.length > 0) {
          output = output.substring(0, output.length - 1);
          setTerminalText(output);
          timer = setTimeout(type, 15);
        } else {
          isDeleting = false;
          currentLineIdx = 0;
          currentCharIdx = 0;
          timer = setTimeout(type, 500);
        }
      }
    };

    timer = setTimeout(type, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Framer Motion Animation Variants
  const navVariants: Variants = {
    hidden: { y: -20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 25, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 16
      }
    }
  };

  const gridVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 35, scale: 0.97 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 80,
        damping: 14
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-bg text-brand-text transition-colors duration-300 relative overflow-hidden select-none font-sans pb-16">
      
      {/* Self-contained CSS Animations for Heading Gradient Flow */}
      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-text-animate {
          background-size: 200% auto;
          animation: gradient-flow 6s ease infinite;
        }
      `}</style>

      {/* Drifting Floating Neon Particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.width,
            height: p.height,
            background: p.background,
            top: p.top,
            left: p.left,
            opacity: 0.12,
            filter: 'blur(1px)',
          }}
          animate={{
            x: p.x,
            y: p.y,
            scale: p.scale,
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Background Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-orange/10 dark:bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-cyan/10 dark:bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none animate-blob-delayed" />
      <div className="absolute top-[30%] right-[30%] w-[350px] h-[350px] bg-brand-orange/5 dark:bg-brand-orange/2 rounded-full blur-[120px] pointer-events-none animate-blob-fast" />

      {/* HEADER / NAVBAR */}
      <motion.header 
        variants={navVariants}
        initial="hidden"
        animate="visible"
        className="sticky top-0 z-50 w-full border-b border-brand-cyan/15 bg-brand-bg/85 backdrop-blur-md transition-colors duration-300"
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.05 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-orange to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-orange/20 flex-shrink-0"
            >
              <Sparkles className="w-5 h-5 text-black animate-pulse" />
            </motion.div>
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-brand-cyan to-brand-orange bg-clip-text text-transparent">
              CAMPIFY
            </span>
          </Link>

          {/* Links & CTA */}
          <div className="flex items-center gap-6">
            
            {/* Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              type="button"
              className="w-10 h-10 rounded-xl bg-brand-card border border-brand-cyan/20 text-neutral-400 hover:text-brand-orange hover:border-brand-orange/40 flex items-center justify-center cursor-pointer transition-all shadow-sm shadow-brand-cyan/5"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-yellow-500" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-500" />
              )}
            </motion.button>

            {/* Login Link */}
            <Link 
              href="/auth?tab=login" 
              className="text-xs font-bold text-neutral-400 hover:text-brand-cyan no-underline transition-colors"
            >
              Sign In
            </Link>

            {/* Register CTA */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link 
                href="/auth?tab=register" 
                className="bg-brand-orange hover:bg-brand-orange/90 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all no-underline block shadow-md border border-brand-orange/20"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* HERO SECTION */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[1200px] mx-auto px-6 pt-16 md:pt-24 flex flex-col items-center text-center gap-8 relative z-10"
      >
        
        {/* Tagline Badge */}
        <motion.div 
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-orange/10 dark:bg-brand-orange/5 border border-brand-orange/20 text-brand-orange text-[10px] font-black uppercase tracking-widest font-outfit"
        >
          <Flame className="w-3.5 h-3.5 animate-pulse" /> Connect. Learn. Build.
        </motion.div>

        {/* Hero Title */}
        <motion.h1 
          variants={itemVariants}
          className="text-4xl sm:text-5xl md:text-6xl font-black font-outfit tracking-tight leading-tight max-w-4xl text-white"
        >
          India&apos;s Premium Campus <br />
          <span className="bg-gradient-to-r from-brand-orange via-yellow-500 to-brand-cyan bg-clip-text text-transparent gradient-text-animate">
            Social & Collaboration Hub
          </span>
        </motion.h1>

        {/* Hero Description */}
        <motion.p 
          variants={itemVariants}
          className="text-neutral-400 text-sm md:text-base leading-relaxed max-w-2xl"
        >
          Campify is the ultimate sandbox for college students. Network with peers, recruit teammates for hackathons, share technical reels with quizzes, build portfolio projects, and climb the campus leaderboard.
        </motion.p>

        {/* Hero Actions */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap gap-4 justify-center items-center mt-2"
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link 
              href="/auth?tab=register" 
              className="btn-primary-gradient px-8 py-3.5 rounded-[16px] flex items-center gap-2 border-0 cursor-pointer shadow-lg no-underline"
            >
              Create Your Account <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link 
              href="/auth?tab=login" 
              className="bg-brand-card hover:bg-brand-card/85 text-white border border-brand-cyan/20 font-bold text-sm px-8 py-3.5 rounded-[16px] transition-all shadow-sm shadow-brand-cyan/5 no-underline"
            >
              Sign In to Portal
            </Link>
          </motion.div>
        </motion.div>

        {/* Interactive Mock Dashboard Card with Float & Entry Animations */}
        <motion.div 
          variants={itemVariants}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
          className="w-full max-w-[850px] mt-8 p-4 md:p-6 rounded-[32px] bg-brand-card/50 border border-brand-cyan/15 backdrop-blur-xl shadow-2xl relative bg-futuristic-grid"
        >
          
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-cyan/5 rounded-full blur-2xl pointer-events-none" />

          {/* Card Mock Header */}
          <div className="flex items-center gap-2 border-b border-brand-cyan/15 pb-4 mb-4 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-neutral-500 font-mono ml-2">campify_web_shell.sh</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
            
            {/* Left Content Column */}
            <div className="md:col-span-8 flex flex-col gap-4">
              
              {/* Mock Post */}
              <div className="p-4 rounded-2xl bg-brand-bg/60 border border-brand-cyan/15 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-orange text-black font-bold text-xs flex items-center justify-center">
                    M
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      mohit_dev
                      <span title="Completed Learning Targets (Gold Medal)">
                        <Award className="w-3.5 h-3.5 text-brand-orange fill-brand-orange animate-pulse" />
                      </span>
                    </span>
                    <span className="text-[9px] text-neutral-500">30m ago &bull; Coding Lab</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 leading-normal font-medium">
                  Just uploaded the source code of Campify! Implemented Next.js 15, Tailwind v4, Express, and local DB integration. Let&apos;s hack!
                </p>
                <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-semibold mt-1 select-none">
                  <span className="flex items-center gap-1 text-red-500"><Flame className="w-3.5 h-3.5" /> 42 Likes</span>
                  <span>&bull;</span>
                  <span>12 Comments</span>
                </div>
              </div>

              {/* Console preview with auto-typing text effect */}
              <div className="p-4 rounded-2xl bg-black/40 border border-brand-cyan/15 font-mono min-h-[92px] select-text shadow-inner shadow-brand-cyan/5">
                <pre className="text-[10px] text-brand-cyan leading-relaxed font-bold font-mono whitespace-pre-wrap">
                  {terminalText}
                  <span className="animate-pulse bg-brand-cyan text-transparent w-1.5 h-3 inline-block ml-0.5">|</span>
                </pre>
              </div>

            </div>

            {/* Right Widget Column */}
            <div className="md:col-span-4 flex flex-col gap-4">
              
              {/* Gamify stats */}
              <div className="p-4 rounded-2xl bg-brand-bg/60 border border-brand-cyan/15 flex flex-col gap-3.5">
                <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Campus Gamification</span>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400">
                    <span>LEVEL 5</span>
                    <span className="text-brand-cyan">340 XP</span>
                  </div>
                  <div className="h-1.5 w-full bg-brand-bg/80 border border-brand-cyan/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-cyan w-[65%]" />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-brand-bg/50 border border-brand-cyan/10 text-white rounded-xl select-none">
                  <span className="text-sm">🔥</span>
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-neutral-500">Active Streak</span>
                    <span className="text-[10px] font-black">12 Days</span>
                  </div>
                </div>
              </div>

              {/* Mock Team Finder Widget */}
              <div className="p-4 rounded-2xl bg-brand-orange/5 border border-brand-orange/25 flex flex-col gap-2.5 glow-orange/5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md uppercase">Team Finder</span>
                  <span className="text-[8px] text-neutral-500">Active</span>
                </div>
                <p className="text-[10px] font-bold text-neutral-200 leading-normal">Need UI designer for College Hackathon!</p>
                <span className="text-[8px] text-neutral-400">Skills: Figma, TailwindCSS</span>
              </div>

            </div>

          </div>

        </motion.div>

      </motion.section>

      {/* CORE FEATURES SECTION (Scroll Animated) */}
      <section className="max-w-[1200px] mx-auto px-6 pt-24 md:pt-32 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center flex flex-col items-center gap-4 mb-16"
        >
          <h2 className="text-3xl font-black font-outfit text-white">
            Everything Students Need, In One Place
          </h2>
          <p className="text-neutral-400 text-sm max-w-lg leading-relaxed">
            Forget disjointed chat groups and messy forums. Collaborate and grow inside a unified tech portfolio ecosystem.
          </p>
        </motion.div>

        {/* Feature Cards Grid (Staggered Animation on Scroll) */}
        <motion.div 
          variants={gridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          
          {/* Card 1: Team Finder */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.015, boxShadow: '0 20px 30px -10px rgba(255, 122, 0, 0.15)' }}
            className="p-6 rounded-[24px] bg-brand-card/60 border border-brand-cyan/15 backdrop-blur-md shadow-lg shadow-brand-cyan/2 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
              <Code className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">Project Team Finder</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Find teammate matches for college projects and hackathons. Sort by specific roles, languages, and framework dependencies.
            </p>
          </motion.div>

          {/* Card 2: Learning Reels */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.015, boxShadow: '0 20px 30px -10px rgba(0, 194, 255, 0.15)' }}
            className="p-6 rounded-[24px] bg-brand-card/60 border border-brand-cyan/15 backdrop-blur-md shadow-lg shadow-brand-cyan/2 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
              <Play className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">Micro-Learning Reels</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Consume high-value tech knowledge via a vertical video feed. Test your recall with quick embedded quizzes for bonus XP points.
            </p>
          </motion.div>

          {/* Card 3: Communities */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.015, boxShadow: '0 20px 30px -10px rgba(255, 122, 0, 0.15)' }}
            className="p-6 rounded-[24px] bg-brand-card/60 border border-brand-cyan/15 backdrop-blur-md shadow-lg shadow-brand-cyan/2 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">College Communities</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Join or build academic hubs. Coordinate events, host live presentations, and design community polls in real-time.
            </p>
          </motion.div>

          {/* Card 4: Gamified Portfolio */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.015, boxShadow: '0 20px 30px -10px rgba(234, 179, 8, 0.15)' }}
            className="p-6 rounded-[24px] bg-brand-card/60 border border-brand-cyan/15 backdrop-blur-md shadow-lg shadow-brand-cyan/2 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">Developer Badge Portfolio</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Build your technical CV. Display certifications, achievements, coding projects, and earn special badges for streaks.
            </p>
          </motion.div>

          {/* Card 5: Real-time Chats */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.015, boxShadow: '0 20px 30px -10px rgba(0, 194, 255, 0.15)' }}
            className="p-6 rounded-[24px] bg-brand-card/60 border border-brand-cyan/15 backdrop-blur-md shadow-lg shadow-brand-cyan/2 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">Direct Real-Time Chat</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Chat instantly with teammate leads. Send multimedia logs, voice notes, and receive instant screenshot alerts.
            </p>
          </motion.div>

          {/* Card 6: Secure Screening */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.015, boxShadow: '0 20px 30px -10px rgba(244, 63, 94, 0.15)' }}
            className="p-6 rounded-[24px] bg-brand-card/60 border border-brand-cyan/15 backdrop-blur-md shadow-lg shadow-brand-cyan/2 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-450">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-white">Toxicity Moderation</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Participate safely. Campify has automated toxicity scanners that filter out abusive content and keep the environment secured.
            </p>
          </motion.div>

        </motion.div>

      </section>

      {/* STATS BANNER (With Scroll-Triggered Counter Animations) */}
      <section className="max-w-[1200px] mx-auto px-6 pt-24 md:pt-32 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="p-8 md:p-12 rounded-[32px] bg-brand-card/80 border border-brand-cyan/15 text-brand-text flex flex-wrap gap-8 items-center justify-around shadow-2xl relative overflow-hidden bg-futuristic-grid"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center">
            <span className="block text-3xl md:text-4xl font-black font-outfit tracking-tight">
              <AnimatedCounter value="45,000+" />
            </span>
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1 block">Active Students</span>
          </div>

          <div className="text-center">
            <span className="block text-3xl md:text-4xl font-black font-outfit tracking-tight">
              <AnimatedCounter value="250+" />
            </span>
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1 block">College Communities</span>
          </div>

          <div className="text-center">
            <span className="block text-3xl md:text-4xl font-black font-outfit tracking-tight">
              <AnimatedCounter value="1,800+" />
            </span>
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1 block">Projects Uploaded</span>
          </div>

          <div className="text-center">
            <span className="block text-3xl md:text-4xl font-black font-outfit tracking-tight">
              <AnimatedCounter value="80+" />
            </span>
            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mt-1 block">Hackathons Run</span>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-[1200px] mx-auto px-6 pt-24 mt-8 border-t border-brand-cyan/15 text-neutral-400 text-xs flex flex-wrap gap-6 items-center justify-between relative z-10 transition-colors duration-300"
      >
        <span className="flex items-center gap-1.5 font-semibold text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-brand-cyan" /> Secure College Sandbox
        </span>
        <span className="font-medium">&copy; {new Date().getFullYear()} Campify Inc. Made with Passion for Campus Hackers.</span>
      </motion.footer>

    </div>
  );
}
