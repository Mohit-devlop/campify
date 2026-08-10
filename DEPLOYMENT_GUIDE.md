# Campify Production Deployment Guide 🚀

This guide provides end-to-end production deployment instructions for **Campify** across modern cloud platforms.

---

## 🏗️ Architecture Overview

| Component | Recommended Platform | Alternative |
| :--- | :--- | :--- |
| **Frontend (Next.js 15)** | [Vercel](https://vercel.com) | Netlify / AWS Amplify |
| **Backend (Node/Express)** | [Railway.app](https://railway.app) | Render / Fly.io |
| **Database** | [Neon.tech PostgreSQL](https://neon.tech) | Supabase / Render Postgres |
| **Media & CDN** | [Cloudinary](https://cloudinary.com) | AWS S3 / Cloudflare R2 |

---

## 1. Database Setup (Neon PostgreSQL)

1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the pooled connection string:
   ```env
   DATABASE_URL="postgresql://username:password@ep-host.region.aws.neon.tech/campify?sslmode=require"
   ```
3. In `backend/prisma/schema.prisma`, update provider if deploying to PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Run migrations:
   ```bash
   cd backend
   npx prisma migrate deploy
   npx prisma db seed
   ```

---

## 2. Backend Deployment (Railway.app)

1. Sign in to [Railway.app](https://railway.app) with GitHub.
2. Click **New Project** > **Deploy from GitHub repo** > select `campify`.
3. Set **Root Directory** to `backend`.
4. Configure **Build & Start Commands**:
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm run start`
5. Add **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL="postgresql://username:password@ep-host.region.aws.neon.tech/campify?sslmode=require"
   FRONTEND_URL="https://campify.vercel.app"
   JWT_SECRET="your-high-entropy-jwt-secret-min-32-chars"
   JWT_REFRESH_SECRET="your-high-entropy-refresh-secret-min-32-chars"
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   GEMINI_API_KEY="your-google-gemini-api-key"
   ```
6. Click **Deploy** and copy your generated Railway URL:
   👉 `https://campify-backend-production.up.railway.app`

---

## 3. Frontend Deployment (Vercel)

1. Sign in to [Vercel](https://vercel.com) with GitHub.
2. Click **Add New Project** > Import `campify`.
3. Set **Root Directory** to `frontend`.
4. Framework Preset: **Next.js**
5. Add **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL="https://campify-backend-production.up.railway.app/api"
   NEXT_PUBLIC_SOCKET_URL="https://campify-backend-production.up.railway.app"
   ```
6. Click **Deploy**. Vercel will build and assign your production domain:
   👉 `https://campify.vercel.app`

---

## 4. Cloudinary Setup (Direct Media Uploads)

1. Sign up on [Cloudinary](https://cloudinary.com).
2. Grab your **Cloud Name**, **API Key**, and **API Secret** from Dashboard.
3. Paste these in backend environment variables to enable high-speed cloud image and video uploads.
