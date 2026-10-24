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
    const QUIZ_CORRECT_XP = 25;
    const QUIZ_WRONG_PENALTY_XP = 15;

    // Fetch existing gamification record
    let gamification = await prisma.userGamification.findUnique({
      where: { userId },
    });
    const currentXp = gamification?.xpPoints || 0;

    let xpChange = 0;
    let actualDeducted = 0;
    let finalXp = currentXp;

    if (isCorrect) {
      xpChange = QUIZ_CORRECT_XP;
      finalXp = currentXp + QUIZ_CORRECT_XP;
    } else {
      // Wrong answer penalty: minus 15 XP (prevent dropping below 0)
      finalXp = Math.max(0, currentXp - QUIZ_WRONG_PENALTY_XP);
      actualDeducted = currentXp - finalXp;
      xpChange = -actualDeducted;
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
        score: isCorrect ? QUIZ_CORRECT_XP : -actualDeducted,
      },
      update: {
        answeredCorrectly: isCorrect,
        score: isCorrect ? QUIZ_CORRECT_XP : -actualDeducted,
      },
    });

    if (isCorrect) {
      await prisma.user.update({
        where: { id: userId },
        data: { verified: true },
      });
    }

    // Update Category Progress
    if (isCorrect) {
      await prisma.learningProgress.upsert({
        where: {
          userId_category: { userId, category: targetCategory },
        },
        create: {
          userId,
          category: targetCategory,
          score: QUIZ_CORRECT_XP,
          completedReelsCount: 1,
        },
        update: {
          score: { increment: QUIZ_CORRECT_XP },
          completedReelsCount: { increment: 1 },
        },
      });
    } else if (actualDeducted > 0) {
      const prog = await prisma.learningProgress.findUnique({
        where: { userId_category: { userId, category: targetCategory } },
      });
      if (prog) {
        await prisma.learningProgress.update({
          where: { userId_category: { userId, category: targetCategory } },
          data: {
            score: Math.max(0, prog.score - actualDeducted),
          },
        });
      }
    }

    // Update Gamification XP & Level
    const newLevel = Math.max(1, Math.floor(finalXp / 100) + 1);
    gamification = await prisma.userGamification.upsert({
      where: { userId },
      create: {
        userId,
        xpPoints: finalXp,
        level: newLevel,
        dailyStreak: 1,
        lastActiveDate: new Date(),
      },
      update: {
        xpPoints: finalXp,
        level: newLevel,
        lastActiveDate: new Date(),
      },
    });

    // Check for level badge if leveled up
    if (newLevel > (gamification?.level || 1)) {
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
      xpAwarded: isCorrect ? QUIZ_CORRECT_XP : -actualDeducted,
      penalty: isCorrect ? 0 : actualDeducted,
      newTotalXp: gamification.xpPoints,
      currentLevel: newLevel,
      message: isCorrect
        ? `Correct Answer! +${QUIZ_CORRECT_XP} XP earned!`
        : actualDeducted > 0
        ? `Wrong Answer! -${actualDeducted} XP deducted.`
        : `Wrong Answer! 0 XP deducted (XP balance cannot go below 0).`,
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
