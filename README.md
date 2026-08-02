# KILOGRAM - Premium Social Network Platform

Kilogram is a complete, production-ready, premium social network inspired by Instagram, Threads, TikTok, and Snapchat. It features a stunning Apple-style glassmorphism interface, dark mode by default, real-time messaging, vertical reels swipe, 24-hour stories, user moderation tools, comprehensive metrics, and automated toxicity screening.

---

## Technical Architecture

### Frontend Stack
- **Next.js 15 (App Router)** - React 19 server-side and client-side page rendering.
- **Tailwind CSS v4** - Fast and flexible styling.
- **Zustand** - Client credentials and socket sessions management.
- **React Query** - Client caching layer.
- **Framer Motion** - Sleek hover states and transition animations.

### Backend Stack
- **Node.js & Express.js (TypeScript)** - Lightweight controller routers.
- **PostgreSQL & Prisma ORM** - Database relation schemas and models.
- **Socket.io** - Multi-user bidirectional real-time communication.
- **Cloudinary** - Direct media storage.
- **Nodemailer** - Verification OTP and account recovery mails.

---

## Folder Structure

```
kilogram/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── admin.controller.ts       # Ban control and abuse audits
│   │   │   ├── auth.controller.ts        # Register, login, otp, google
│   │   │   ├── chat.controller.ts        # Chat session & message logs
│   │   │   ├── notification.controller.ts# Notification histories
│   │   │   ├── post.controller.ts        # CRUD posts, comments, likes
│   │   │   ├── reel.controller.ts        # Swipe video reels
│   │   │   └── story.controller.ts       # Seen logs & 24h stories
│   │   ├── middlewares/
│   │   │   └── auth.middleware.ts        # JWT and RBAC guards
│   │   ├── routes/
│   │   │   └── api.routes.ts             # Express path bindings
│   │   ├── services/
│   │   │   ├── cloudinary.service.ts     # Media uploader (with mocks)
│   │   │   ├── email.service.ts          # SMTP transport (with mocks)
│   │   │   ├── moderation.service.ts     # Automated toxicity scanners
│   │   │   └── socket.service.ts         # Socket.io connections map
│   │   ├── prisma/
│   │   │   └── client.ts                 # Prisma Client instantiation
│   │   ├── index.ts                      # Server entry listener
│   │   └── types.ts                      # Custom TS types
│   ├── prisma/
│   │   ├── schema.prisma                 # DB Schema
│   │   └── seed.ts                       # Demo content seeder
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── admin/                    # Admin controls grid
    │   │   ├── auth/                     # Forms panel tabs
    │   │   ├── explore/                  # Trending grid
    │   │   ├── messages/                 # Chat workspace
    │   │   ├── notifications/            # Real-time alert list
    │   │   ├── reels/                    # swipe video screen
    │   │   ├── settings/                 # Profile edit form
    │   │   ├── [username]/               # Dynamic creator view
    │   │   ├── layout.tsx                # App shell, drawers
    │   │   ├── page.tsx                  # Home feed and stories Swiper
    │   │   └── providers.tsx             # Theme and query context
    │   ├── components/
    │   │   ├── CreatePostModal.tsx       # Media upload modal
    │   │   ├── SearchDrawer.tsx          # Real-time search panel
    │   │   └── Sidebar.tsx               # Navigation bar (desktop/mobile)
    │   ├── lib/
    │   │   └── api.ts                    # Fetch client with auto refresh
    │   ├── store/
    │   │   ├── authStore.ts              # Session Zustand store
    │   │   └── socketStore.ts            # WebSocket Zustand store
    │   └── tailwind.config.ts
    ├── package.json
    └── Dockerfile
```

---

## Local Installation

### Prerequisites
- Node.js (v20 or higher)
- Docker & Docker Compose (optional for container setup)
- PostgreSQL (if running locally without Docker)

### Option A: Running with Docker (Recommended)
This runs the backend, Next.js frontend, and a PostgreSQL database instantly.

1. Navigate to the root directory `C:/Users/sadhu/.gemini/antigravity/scratch/kilogram`.
2. Build and start containers:
   ```bash
   docker-compose up --build
   ```
3. Run migrations and database seeding:
   ```bash
   docker-compose exec backend npx prisma migrate dev --name init
   docker-compose exec backend npx prisma db seed
   ```
4. Access applications:
   - **Frontend**: http://localhost:3000
   - **Backend**: http://localhost:5000/api

---

### Option B: Running Locally without Docker

#### 1. Setup Database
Ensure you have a PostgreSQL server running locally and create a database called `kilogram`.

#### 2. Configure Backend env
Copy `backend/.env.example` to `backend/.env` and configure:
```
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/kilogram?schema=public"
```

#### 3. Run Backend Server
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

#### 4. Run Frontend App
Copy `frontend/.env.example` to `frontend/.env.local`:
```bash
cd ../frontend
npm install
npm run dev
```
Open http://localhost:3000 in your browser.

---

## Seed Accounts & Credentials

Running `npx prisma db seed` loads the following testing credentials:

### 1. System Administrator
- **Email**: `admin@kilogram.com`
- **Username**: `admin`
- **Password**: `AdminSecurePass123!`
- *Grants access to the Admin Panel in sidebar navigation.*

### 2. Standard Test User 1
- **Email**: `john@gmail.com`
- **Username**: `john_doe`
- **Password**: `Password123!`

### 3. Standard Test User 2
- **Email**: `jane@gmail.com`
- **Username**: `jane_smith`
- **Password**: `Password123!`

---

## Production Deployment & Hosting Guide

### 1. Database Setup (Neon PostgreSQL)
1. Register at [Neon.tech](https://neon.tech/).
2. Create a new PostgreSQL Project.
3. Copy the Connection String and set it as `DATABASE_URL` in your production environments.

### 2. Media Uploads (Cloudinary)
1. Register at [Cloudinary](https://cloudinary.com/).
2. Retrieve your **Cloud Name**, **API Key**, and **API Secret** from the dashboard.
3. Supply them as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to enable remote storage uploads.

### 3. Backend Deployment (Railway)
1. Register at [Railway.app](https://railway.app/).
2. Click **New Project** -> **GitHub Repository** -> select your backend code branch.
3. Under variables tab, add:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `FRONTEND_URL` (Your production frontend Vercel URL)
   - Cloudinary keys
4. Click deploy. Copy the generated API service URL.

### 4. Frontend Deployment (Vercel)
1. Register at [Vercel](https://vercel.com/).
2. Import project -> select the `frontend/` subdirectory.
3. Under Environment Variables, add:
   - `NEXT_PUBLIC_API_URL` (Points to `<your-railway-app-url>/api`)
   - `NEXT_PUBLIC_SOCKET_URL` (Points to `<your-railway-app-url>`)
4. Click deploy.
