import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import * as authCtrl from '../controllers/auth.controller';
import * as userCtrl from '../controllers/user.controller';
import * as postCtrl from '../controllers/post.controller';
import * as reelCtrl from '../controllers/reel.controller';
import * as storyCtrl from '../controllers/story.controller';
import * as chatCtrl from '../controllers/chat.controller';
import * as notifyCtrl from '../controllers/notification.controller';
import * as modCtrl from '../controllers/moderation.controller';
import * as adminCtrl from '../controllers/admin.controller';

// New Feature Controllers
import * as aiCtrl from '../controllers/ai.controller';
import * as commCtrl from '../controllers/community.controller';
import * as skillsCtrl from '../controllers/skills.controller';
import * as teamCtrl from '../controllers/team.controller';
import * as learnCtrl from '../controllers/learning.controller';
import * as gamifyCtrl from '../controllers/gamification.controller';

const router = Router();
import * as uploadCtrl from '../controllers/upload.controller';
import * as noteCtrl from '../controllers/note.controller';
import * as instantCtrl from '../controllers/instant.controller';

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
router.post('/auth/register', authCtrl.register);
router.post('/auth/verify-otp', authCtrl.verifyOtp);
router.post('/auth/resend-otp', authCtrl.resendOtp);
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refreshToken);
router.post('/auth/google', authCtrl.googleLogin);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.post('/auth/reset-password', authCtrl.resetPassword);
router.post('/auth/change-password', authenticate, authCtrl.changePassword);

// ==========================================
// USER PROFILE ROUTES
// ==========================================
router.get('/users/suggested', authenticate, userCtrl.getSuggestedUsers);
router.get('/users/search', authenticate, userCtrl.searchUsers);
router.get('/users/profile/:username', userCtrl.getProfile);
router.put('/users/profile', authenticate, userCtrl.updateProfile);
router.get('/users/close-friends', authenticate, userCtrl.getCloseFriends);
router.post('/users/close-friends', authenticate, userCtrl.updateCloseFriends);
router.post('/users/follow/:followingId', authenticate, userCtrl.followUser);
router.delete('/users/unfollow/:followingId', authenticate, userCtrl.unfollowUser);
router.get('/users/followers/:userId', userCtrl.getFollowers);
router.get('/users/following/:userId', userCtrl.getFollowing);
router.post('/users/block', authenticate, userCtrl.blockUser);
router.post('/users/unblock', authenticate, userCtrl.unblockUser);
router.post('/users/mute', authenticate, userCtrl.muteUser);
router.post('/users/unmute', authenticate, userCtrl.unmuteUser);
router.get('/users/analytics', authenticate, userCtrl.getProfileAnalytics);

// ==========================================
// POST ROUTES
// ==========================================
router.post('/upload', authenticate, uploadCtrl.uploadFile);
router.get('/download', authenticate, uploadCtrl.downloadProxy);
router.post('/posts', authenticate, postCtrl.createPost);
router.post('/posts/repost/:postId', authenticate, postCtrl.repostPost);
router.get('/posts/feed', postCtrl.getFeed);
router.post('/posts/like/:postId', authenticate, postCtrl.likePost);
router.delete('/posts/unlike/:postId', authenticate, postCtrl.unlikePost);
router.post('/posts/comment/:postId', authenticate, postCtrl.commentPost);
router.get('/posts/comment/:postId', postCtrl.getComments);
router.post('/posts/save/:postId', authenticate, postCtrl.savePost);
router.delete('/posts/unsave/:postId', authenticate, postCtrl.unsavePost);
router.get('/posts/saved', authenticate, postCtrl.getSavedPosts);
router.delete('/posts/:postId', authenticate, postCtrl.deletePost);
router.patch('/posts/:postId/archive', authenticate, postCtrl.archivePost);
router.patch('/posts/:postId/unarchive', authenticate, postCtrl.unarchivePost);
router.get('/posts/archived', authenticate, postCtrl.getArchivedPosts);
router.post('/posts/collection', authenticate, postCtrl.createCollection);
router.get('/posts/collections', authenticate, postCtrl.getCollections);

// ==========================================
// REEL ROUTES
// ==========================================
router.post('/reels', authenticate, reelCtrl.createReel);
router.get('/reels', reelCtrl.getReels);
router.post('/reels/like/:reelId', authenticate, reelCtrl.likeReel);
router.delete('/reels/unlike/:reelId', authenticate, reelCtrl.unlikeReel);
router.post('/reels/comment/:reelId', authenticate, reelCtrl.commentReel);
router.get('/reels/comment/:reelId', reelCtrl.getReelComments);

// ==========================================
// STORY ROUTES
// ==========================================
router.post('/stories', authenticate, storyCtrl.uploadStory);
router.delete('/stories/:storyId', authenticate, storyCtrl.deleteStory);
router.get('/stories/feed', authenticate, storyCtrl.getStoriesFeed);
router.get('/stories/archive', authenticate, storyCtrl.getArchiveStories);
router.post('/stories/seen/:storyId', authenticate, storyCtrl.markStorySeen);
router.post('/stories/highlight', authenticate, storyCtrl.createHighlight);
router.get('/stories/highlights/:userId', authenticate, storyCtrl.getUserHighlights);
router.put('/stories/highlights/:highlightId', authenticate, storyCtrl.editHighlight);
router.delete('/stories/highlights/:highlightId', authenticate, storyCtrl.deleteHighlight);

// ==========================================
// STATUS NOTES ROUTES
// ==========================================
router.post('/notes', authenticate, noteCtrl.createNote);
router.delete('/notes', authenticate, noteCtrl.deleteNote);
router.get('/notes/feed', authenticate, noteCtrl.getNotesFeed);

// ==========================================
// INSTANTS ROUTES
// ==========================================
router.post('/instants', authenticate, instantCtrl.createInstant);
router.get('/instants/feed', authenticate, instantCtrl.getInstantsFeed);
router.delete('/instants/:id', authenticate, instantCtrl.deleteInstant);

// ==========================================
// REAL-TIME MESSAGING ROUTES
// ==========================================
router.post('/chats', authenticate, chatCtrl.createChat);
router.get('/chats', authenticate, chatCtrl.getChats);
router.get('/chats/messages/:chatId', authenticate, chatCtrl.getMessages);
router.post('/chats/messages/:chatId', authenticate, chatCtrl.sendMessage);
router.delete('/chats/messages/:messageId', authenticate, chatCtrl.deleteMessage);
router.post('/chats/read/:chatId', authenticate, chatCtrl.markChatRead);

// ==========================================
// NOTIFICATIONS ROUTES
// ==========================================
router.get('/notifications', authenticate, notifyCtrl.getNotifications);
router.post('/notifications/read', authenticate, notifyCtrl.markNotificationsRead);

// ==========================================
// CONTENT MODERATION ROUTES
// ==========================================
router.post('/moderation/report', authenticate, modCtrl.reportContent);

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================
router.get('/admin/stats', authenticate, authorize(['ADMIN']), adminCtrl.getAdminStats);
router.get('/admin/users', authenticate, authorize(['ADMIN']), adminCtrl.getUsers);
router.put('/admin/users/:userId/status', authenticate, authorize(['ADMIN']), adminCtrl.updateUserStatus);
router.get('/admin/reports', authenticate, authorize(['ADMIN', 'MODERATOR']), adminCtrl.getReports);
router.post('/admin/reports/:reportId/action', authenticate, authorize(['ADMIN', 'MODERATOR']), adminCtrl.actionReport);

// ==========================================
// AI SOCIAL ASSISTANT ROUTES
// ==========================================
router.post('/ai/caption', authenticate, aiCtrl.generateCaption);
router.post('/ai/hashtags', authenticate, aiCtrl.generateHashtags);
router.post('/ai/reels-ideas', authenticate, aiCtrl.getReelIdeas);
router.post('/ai/predict-engagement', authenticate, aiCtrl.predictEngagement);
router.get('/ai/best-time', authenticate, aiCtrl.getBestPostingTime);

// ==========================================
// COMMUNITY HUB ROUTES
// ==========================================
router.post('/communities', authenticate, commCtrl.createCommunity);
router.get('/communities', authenticate, commCtrl.getCommunities);
router.get('/communities/:communityId', authenticate, commCtrl.getCommunityDetails);
router.post('/communities/join/:communityId', authenticate, commCtrl.joinCommunity);
router.delete('/communities/leave/:communityId', authenticate, commCtrl.leaveCommunity);
router.post('/communities/:communityId/events', authenticate, commCtrl.createEvent);
router.post('/communities/events/:eventId/attend', authenticate, commCtrl.attendEvent);
router.post('/communities/:communityId/polls', authenticate, commCtrl.createPoll);
router.post('/communities/polls/:pollId/vote', authenticate, commCtrl.votePoll);

// ==========================================
// SKILLS PORTFOLIO ROUTES
// ==========================================
router.get('/skills/portfolio/:username', skillsCtrl.getPortfolio);
router.post('/skills', authenticate, skillsCtrl.addSkill);
router.delete('/skills/:skillId', authenticate, skillsCtrl.removeSkill);
router.post('/skills/certifications', authenticate, skillsCtrl.addCertification);
router.delete('/skills/certifications/:certId', authenticate, skillsCtrl.removeCertification);
router.post('/skills/experience', authenticate, skillsCtrl.addExperience);
router.delete('/skills/experience/:expId', authenticate, skillsCtrl.removeExperience);
router.post('/skills/projects', authenticate, skillsCtrl.addProject);
router.delete('/skills/projects/:projectId', authenticate, skillsCtrl.removeProject);

// ==========================================
// PROJECT TEAM FINDER ROUTES
// ==========================================
router.post('/teams', authenticate, teamCtrl.createTeam);
router.get('/teams', authenticate, teamCtrl.getTeams);
router.get('/teams/:teamId', authenticate, teamCtrl.getTeamDetails);
router.post('/teams/:teamId/invite', authenticate, teamCtrl.inviteMember);
router.post('/teams/invitation/:invitationId/respond', authenticate, teamCtrl.respondToInvitation);
router.get('/teams/invitations/pending', authenticate, teamCtrl.getInvitations);

// ==========================================
// LEARNING REELS ROUTES
// ==========================================
router.get('/learning/quiz/:reelId', authenticate, learnCtrl.getReelQuiz);
router.post('/learning/quiz/:reelId/submit', authenticate, learnCtrl.submitQuizAnswer);
router.get('/learning/progress', authenticate, learnCtrl.getLearningProgress);

// ==========================================
// XP & GAMIFICATION ROUTES
// ==========================================
router.get('/gamification/stats', authenticate, gamifyCtrl.getGamificationStats);
router.get('/gamification/leaderboard', gamifyCtrl.getLeaderboard);
router.post('/gamification/streak', authenticate, gamifyCtrl.updateDailyStreak);

export default router;
