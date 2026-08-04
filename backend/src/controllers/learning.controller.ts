import { Request, Response } from 'express';
import { prisma } from '../prisma/client';

export async function getReelQuiz(req: Request, res: Response) {
  try {
    const { reelId } = req.params;

    const quiz = await prisma.reelQuiz.findUnique({
      where: { reelId },
    });

    if (!quiz) {
      // Mock automatic seed generator for standard quiz questions if none exist
      // Since it is educational, dynamically generate a mock quiz based on the reel ID
      return res.status(200).json({
        id: 'mock-quiz-' + reelId,
        reelId,
        question: 'Which of the following is correct regarding CSS Flexbox vs Grid?',
        optionA: 'Flexbox is best for one-dimensional layouts, Grid for two-dimensional.',
        optionB: 'Flexbox is exclusively for vertical lines, Grid for horizontal.',
        optionC: 'Grid is older and less supported than Flexbox.',
        optionD: 'There is no difference between them.',
        correctAnswer: 'A',
        explanation: 'Flexbox was designed for layout in one dimension (either row or column) while Grid was designed for two dimensions.',
      });
    }

    return res.status(200).json(quiz);
  } catch (error) {
    console.error('Get quiz error:', error);
    return res.status(500).json({ error: 'Failed to fetch quiz for reel' });
  }
}

export async function submitQuizAnswer(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { reelId } = req.params;
    const { answer, category } = req.body; // 'A', 'B', 'C', 'D'

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!answer) {
      return res.status(400).json({ error: 'Option answer selection is required' });
    }

    // Validate category
    const categories = ['Programming', 'AI', 'Business', 'Marketing', 'Design', 'Productivity'];
    const targetCategory = categories.includes(category) ? category : 'Programming';

    // Retrieve quiz or fallback to mock details
    let correctAnswer = 'A';
    let explanation = '';
    const quiz = await prisma.reelQuiz.findUnique({ where: { reelId } });
    if (quiz) {
      correctAnswer = quiz.correctAnswer;
      explanation = quiz.explanation || '';
    }

    const isCorrect = answer.toUpperCase() === correctAnswer.toUpperCase();
    const quizPoints = isCorrect ? 25 : 5; // 25 XP for correct, 5 XP for attempt

    // Retrieve existing attempt to prevent infinite XP farming
    const existingAttempt = await prisma.quizAttempt.findUnique({
      where: {
        userId_reelId: { userId, reelId },
      },
    });

    let xpToAward = quizPoints;
    let completedIncrement = 1;

    if (existingAttempt) {
      completedIncrement = 0; // Already counted towards completed reels count
      if (existingAttempt.answeredCorrectly) {
        // If they already got it correct in the past, they shouldn't get more points
        xpToAward = 0;
      } else if (isCorrect) {
        // If they previously got it wrong (received 5 XP) and now got it correct (25 XP)
        // Award the difference
        xpToAward = 20;
      } else {
        // Previously incorrect and still incorrect, no new points
        xpToAward = 0;
      }
    }

    // Save attempt
    await prisma.quizAttempt.upsert({
      where: {
        userId_reelId: { userId, reelId },
      },
      create: {
        userId,
        reelId,
        answeredCorrectly: isCorrect,
        score: quizPoints,
      },
      update: {
        answeredCorrectly: isCorrect,
        score: quizPoints,
      },
    });

    if (isCorrect) {
      await prisma.user.update({
        where: { id: userId },
        data: { verified: true },
      });
    }

    // Update Category Progress
    if (xpToAward > 0 || completedIncrement > 0) {
      await prisma.learningProgress.upsert({
        where: {
          userId_category: { userId, category: targetCategory },
        },
        create: {
          userId,
          category: targetCategory,
          score: xpToAward,
          completedReelsCount: completedIncrement,
        },
        update: {
          score: { increment: xpToAward },
          completedReelsCount: { increment: completedIncrement },
        },
      });
    }

    // Update Gamification XP
    const gamification = await prisma.userGamification.upsert({
      where: { userId },
      create: {
        userId,
        xpPoints: xpToAward,
        level: 1,
        dailyStreak: 1,
        lastActiveDate: new Date(),
      },
      update: {
        xpPoints: { increment: xpToAward },
        lastActiveDate: new Date(),
      },
    });

    // Auto level-up checking (100 XP per level)
    const newLevel = Math.floor(gamification.xpPoints / 100) + 1;
    if (newLevel > gamification.level) {
      await prisma.userGamification.update({
        where: { userId },
        data: { level: newLevel },
      });
      // Award Level Badge
      await prisma.skillBadge.create({
        data: {
          userId,
          type: 'XP_LEVEL',
          name: `Level ${newLevel} Cadet`,
          description: `Achieved Level ${newLevel} in learning network`,
          icon: 'shield',
        },
      });
    }

    return res.status(200).json({
      correct: isCorrect,
      correctAnswer,
      explanation,
      xpAwarded: quizPoints,
      newTotalXp: gamification.xpPoints,
      currentLevel: newLevel,
    });
  } catch (error) {
    console.error('Submit quiz answer error:', error);
    return res.status(500).json({ error: 'Failed to submit quiz response' });
  }
}

export async function getLearningProgress(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const progress = await prisma.learningProgress.findMany({
      where: { userId },
    });

    // Compute standard learning scores
    const categories = ['Programming', 'AI', 'Business', 'Marketing', 'Design', 'Productivity'];
    const formatted = categories.map((cat) => {
      const prog = progress.find((p) => p.category === cat);
      return {
        category: cat,
        score: prog ? prog.score : 0,
        completedReelsCount: prog ? prog.completedReelsCount : 0,
      };
    });

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get learning progress error:', error);
    return res.status(500).json({ error: 'Failed to fetch learning statistics' });
  }
}
