'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, HelpCircle, Loader2, Sparkles, Trophy, Award, 
  Volume2, VolumeX, PlayCircle, Heart, CheckCircle2, ChevronRight, X
} from 'lucide-react';

const CATEGORIES = ['Programming', 'AI', 'Business', 'Marketing', 'Design', 'Productivity'];

export default function LearningReelsPage() {
  const { user } = useAuthStore();
  const [learningProgress, setLearningProgress] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Programming');
  const [reels, setReels] = useState<any[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Active quiz state
  const [activeQuizReelId, setActiveQuizReelId] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<any | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  useEffect(() => {
    loadLearningData();
  }, []);

  useEffect(() => {
    loadCategoryReels();
  }, [activeCategory]);

  async function loadLearningData() {
    setIsLoadingProgress(true);
    try {
      const res = await apiFetch('/learning/progress');
      if (res.ok) {
        const data = await res.json();
        setLearningProgress(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingProgress(false);
    }
  }

  async function loadCategoryReels() {
    setIsLoadingReels(true);
    try {
      // Mock fetch category reels (or fallback standard reels query)
      const res = await apiFetch('/reels?limit=5');
      if (res.ok) {
        const data = await res.json();
        
        // Add educational titles and categories
        const mapped = (data.reels || []).map((reel: any, index: number) => ({
          ...reel,
          category: activeCategory,
          caption: index === 0 
            ? `Deep dive into ${activeCategory} architectures. Let's inspect this structure!` 
            : index === 1
            ? `Unveiling core ${activeCategory} principles for professional workflows.`
            : `Pro tips to scale your ${activeCategory} projects in 2026.`
        }));
        setReels(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReels(false);
    }
  }

  const handleOpenQuiz = async (reelId: string) => {
    setActiveQuizReelId(reelId);
    setQuizDetails(null);
    setSelectedAnswer(null);
    setQuizResult(null);
    setIsLoadingQuiz(true);

    try {
      const res = await apiFetch(`/learning/quiz/${reelId}`);
      if (res.ok) {
        const data = await res.json();
        setQuizDetails(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleSubmitQuiz = async (answer: string) => {
    if (!activeQuizReelId) return;
    setSelectedAnswer(answer);

    try {
      const res = await apiFetch(`/learning/quiz/${activeQuizReelId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answer })
      });

      if (res.ok) {
        const data = await res.json();
        setQuizResult(data);
        // Refresh progress counters
        await loadLearningData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 flex flex-col lg:flex-row gap-6 select-none font-sans text-white min-h-[85vh]">
      
      {/* LEFT COLUMN: Progress dashboard and category selector */}
      <div className="w-full lg:w-[320px] flex flex-col gap-5 flex-shrink-0">
        <div>
          <h1 className="text-xl font-black font-outfit tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-400 animate-pulse" /> Learning Reels
          </h1>
          <p className="text-[10px] text-neutral-500 mt-0.5 leading-normal">
            Watch short vertical reels and solve quizzes to level up your technology stack!
          </p>
        </div>

        {/* Global XP/Scores widget */}
        <div className="p-4 bg-neutral-900/60 border border-white/5 rounded-2xl flex flex-col gap-3">
          <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" /> Learning Score Overview
          </span>
          
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-2xs text-neutral-400">Total Learning XP</span>
            <span className="font-extrabold text-lg font-outfit text-white">
              {learningProgress.reduce((acc, curr) => acc + curr.score, 0)} XP
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xs text-neutral-400">Completed Lessons</span>
            <span className="font-extrabold text-xs text-neutral-200">
              {learningProgress.reduce((acc, curr) => acc + curr.completedReelsCount, 0)} Reels
            </span>
          </div>
        </div>

        {/* Categories checklist */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider px-1">Curated Channels</span>
          
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const prog = learningProgress.find((p) => p.category === cat);
              const score = prog ? prog.score : 0;
              const isSelected = activeCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer active-shrink flex-shrink-0 lg:flex-shrink flex justify-between items-center gap-3 transition-all ${
                    isSelected 
                      ? 'bg-neutral-900 border-cyan-500/30' 
                      : 'bg-neutral-900/40 border-white/5 hover:border-white/10 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold ${isSelected ? 'text-cyan-400' : 'text-neutral-300'}`}>{cat}</span>
                    <span className="text-[9px] text-neutral-500 mt-1 font-semibold">{score} XP accumulated</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-neutral-600'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Fullscreen learning reel simulator */}
      <div className="flex-1 flex justify-center bg-black/60 border border-white/5 rounded-[28px] glass overflow-hidden relative min-h-[500px]">
        {isLoadingReels ? (
          <div className="flex justify-center items-center py-32 flex-1">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 gap-3 flex-1">
            <Sparkles className="w-12 h-12 text-cyan-500 animate-pulse" />
            <h3 className="font-extrabold text-sm text-neutral-300">No Learning Reels</h3>
            <p className="text-neutral-500 text-2xs max-w-xs leading-relaxed">
              We are indexing new micro-lessons for {activeCategory}. Please check back shortly!
            </p>
          </div>
        ) : (
          <div className="relative w-full max-w-[400px] h-[550px] bg-neutral-950 overflow-hidden flex items-center justify-center my-6 rounded-[24px] border border-white/5 group">
            {/* Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute top-4 right-4 z-30 p-2.5 rounded-xl bg-black/40 hover:bg-black/60 text-white border-0 cursor-pointer active-shrink"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Video element */}
            <video
              src={reels[0].videoUrl}
              loop
              muted={isMuted}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Translucent overlay */}
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none z-10" />

            {/* Top Badge Overlay */}
            <div className="absolute top-4 left-4 z-20 bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">{activeCategory} Tutorial</span>
            </div>

            {/* Bottom details */}
            <div className="absolute bottom-4 left-4 right-20 z-20 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-neutral-400">@{reels[0].user.username}</span>
              <p className="text-xs text-white leading-normal font-medium">{reels[0].caption}</p>
            </div>

            {/* Action Buttons overlay */}
            <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-4 text-white items-center">
              {/* Quiz Solve Trigger */}
              <button
                onClick={() => handleOpenQuiz(reels[0].id)}
                className="flex flex-col items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-black p-3 rounded-2xl border-0 cursor-pointer active-shrink hover-scale shadow-lg shadow-cyan-500/10"
                title="Solve Quiz"
              >
                <HelpCircle className="w-5 h-5 text-black" />
                <span className="text-[9px] font-extrabold uppercase tracking-wider">Solve</span>
              </button>
            </div>

            {/* Quiz overlay modal */}
            <AnimatePresence>
              {activeQuizReelId && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-neutral-950/95 z-30 flex flex-col justify-center p-5 text-white"
                >
                  <button
                    onClick={() => setActiveQuizReelId(null)}
                    className="absolute top-4 right-4 p-1.5 hover:bg-white/5 text-neutral-400 hover:text-white rounded-lg border-0 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {isLoadingQuiz ? (
                    <div className="flex justify-center items-center py-20">
                      <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                    </div>
                  ) : quizDetails ? (
                    <div className="flex flex-col gap-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4" /> Lesson Quiz
                      </span>
                      
                      <h4 className="font-extrabold text-sm text-neutral-100 leading-normal">{quizDetails.question}</h4>

                      <div className="flex flex-col gap-2 mt-2">
                        {['A', 'B', 'C', 'D'].map((option) => {
                          const optionText = quizDetails[`option${option}`];
                          const isSelected = selectedAnswer === option;
                          const isCorrectAns = option === quizDetails.correctAnswer;
                          
                          let optBg = 'bg-white/5 border border-white/5 hover:bg-white/10';
                          if (selectedAnswer) {
                            if (isSelected) {
                              optBg = isCorrectAns 
                                ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                                : 'bg-red-500/20 border border-red-500/30 text-red-400';
                            } else if (isCorrectAns) {
                              optBg = 'bg-green-500/20 border border-green-500/30 text-green-400';
                            } else {
                              optBg = 'bg-white/5 border border-transparent opacity-45';
                            }
                          }

                          return (
                            <button
                              key={option}
                              disabled={selectedAnswer !== null}
                              onClick={() => handleSubmitQuiz(option)}
                              className={`w-full text-left p-3 rounded-xl text-xs font-semibold cursor-pointer active-shrink transition-all ${optBg}`}
                            >
                              <span className="font-extrabold mr-2">{option}.</span>
                              {optionText}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation details and score status */}
                      <AnimatePresence>
                        {quizResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-neutral-900/60 border border-white/5 rounded-xl flex flex-col gap-2 mt-2"
                          >
                            <div className="flex items-center gap-2 text-xs">
                              {quizResult.correct ? (
                                <span className="font-bold text-green-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Correct Answer!</span>
                              ) : (
                                <span className="font-bold text-red-400">Incorrect Answer</span>
                              )}
                              <span className="text-[10px] text-cyan-400 font-bold ml-auto">+{quizResult.xpAwarded} XP awarded</span>
                            </div>
                            {quizDetails.explanation && (
                              <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">{quizDetails.explanation}</p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-500 italic text-center">Failed to load quiz questions.</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}
