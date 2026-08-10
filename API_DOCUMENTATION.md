# Campify REST API Documentation 🚀

Campify is a modern, production-ready college community platform backend built on Node.js, Express, TypeScript, PostgreSQL (Prisma ORM), and Socket.io.

---

## 🔐 Base URL & Headers

- **Local Base URL:** `http://localhost:5001/api`
- **Live Public URL:** `https://slimy-cobras-find.loca.lt/api`
- **Common Request Header:** `Content-Type: application/json`
- **Authenticated Request Header:** `Authorization: Bearer <access_token>`

---

## 1. Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user account & dispatch email OTP | No |
| `POST` | `/auth/verify-otp` | Verify 6-digit OTP to activate user account | No |
| `POST` | `/auth/resend-otp` | Resend verification OTP to email | No |
| `POST` | `/auth/login` | Authenticate with email/username + password | No |
| `POST` | `/auth/refresh` | Rotate expired JWT access token | No |
| `POST` | `/auth/forgot-password` | Request password reset email | No |
| `POST` | `/auth/reset-password` | Submit new password with reset token | No |
| `POST` | `/auth/change-password`| Change password for logged in user | Yes |

---

## 2. User & Profile Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/profile/:username` | Retrieve public creator profile, stats & posts | No |
| `PUT` | `/users/profile` | Update bio, location, website, avatar | Yes |
| `GET` | `/users/suggested` | Fetch suggested creators & classmates to follow | Yes |
| `GET` | `/users/search?q=:query` | Search users by name, username or college | Yes |
| `POST` | `/users/follow/:followingId` | Follow a creator | Yes |
| `DELETE` | `/users/unfollow/:followingId`| Unfollow a creator | Yes |

---

## 3. Feed & Posts Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/posts/feed` | Fetch paginated posts feed with author details | Optional |
| `POST` | `/posts` | Create new post with image/video & caption | Yes |
| `POST` | `/posts/like/:postId` | Like a post (sends real-time notification) | Yes |
| `DELETE` | `/posts/unlike/:postId` | Remove like from post | Yes |
| `POST` | `/posts/comment/:postId` | Add comment to post | Yes |
| `GET` | `/posts/comment/:postId` | Get all comments for a post | No |
| `POST` | `/posts/save/:postId` | Bookmark post to collection | Yes |
| `DELETE` | `/posts/:postId` | Delete post created by user | Yes |

---

## 4. Video Reels & Stories

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/reels` | Fetch vertical video reels feed | No |
| `POST` | `/reels` | Upload new vertical video reel | Yes |
| `POST` | `/reels/like/:reelId` | Like a reel | Yes |
| `GET` | `/stories/feed` | Fetch 24-hour stories from followed creators | Yes |
| `POST` | `/stories` | Post 24-hour disappearing story | Yes |
| `POST` | `/stories/seen/:storyId`| Mark story as viewed | Yes |

---

## 5. College Events & Hackathons

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/events` | List upcoming college fests & hackathons | No |
| `GET` | `/events/:eventId` | Get full event schedule & registered attendees | No |
| `POST` | `/events` | Create and host a new campus event | Yes |
| `POST` | `/events/:eventId/register` | Register attendee for event | Yes |
| `DELETE`| `/events/:eventId/register` | Cancel event registration | Yes |
| `GET` | `/events/registrations/my` | Get events current user registered for | Yes |

---

## 6. Project Team Finder

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/teams` | Explore open hackathon & project teams | Yes |
| `POST` | `/teams` | Post new project recruiting team members | Yes |
| `POST` | `/teams/:teamId/invite` | Send invitation to candidate | Yes |
| `POST` | `/teams/invitation/:id/respond`| Accept or decline team invite | Yes |

---

## 7. AI Social & Career Assistant

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/ai/caption` | Generate engaging captions with emojis | Yes |
| `POST` | `/ai/hashtags` | Generate top trending hashtags for post | Yes |
| `POST` | `/ai/reels-ideas` | Generate 3 vertical video concepts | Yes |
| `POST` | `/ai/team-match` | Smart match team candidates by required stack | Yes |
| `POST` | `/ai/skill-recommendation`| AI recommendations for tech career path | Yes |

---

## 8. Real-time Messaging (Socket.io)

- **Connection URL:** `http://localhost:5001` (or Live Backend URL)
- **Events:**
  - `join_chat`: Join private or group chat room
  - `send_message`: Send realtime direct message
  - `typing`: Send typing indicator
  - `new_notification`: Listen for realtime notifications
